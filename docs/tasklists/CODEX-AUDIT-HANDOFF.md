# Handoff: stop patching, restate the invariants

Branch `codex-audit`. All suites green. The sections below record why three
review rounds did not converge; the **Fable consult** section near the end
records what was done about it and what is left. Everything above that section
is the diagnosis as it stood before that consult - read it as the reasoning, not
as the current plan.

## Why this handoff exists

| round | reviewer | findings | notable |
|-------|----------|----------|---------|
| 1 | codex | 7 | all real |
| 2 | `/code-review high` | 7 | **high**: a regression in round 1's own fix |
| 3 | codex (same thread) | 8 | **high**: a regression in round 2's own fix |

22 findings, and *every round found a defect in the previous round's fix*. That
is not a queue of bugs draining. It is symptom-patching: each fix was correct
about the case the reviewer probed and blind to the adjacent one.

The clearest example. `computed()` heal-after-throw was "fixed" three times:

1. The lazy `get()` never set `failed` → stranded on the first throw.
2. Round 2 set `failed` but never cleared it → stranded when it healed and threw again.
3. Round 3 cleared `failed` but never called `trigger()` → stranded when healed by a manual read.

Nobody ever wrote down what the flag machine is supposed to guarantee. Three
fixes, three blind spots, one missing invariant.

**What this branch needs next is not a fourth review round.** It needs someone
to state each invariant below and check every path against it - including the
paths no reviewer happened to probe.

## The three areas that keep producing defects

### 1. The `computed()` flag machine — `lib/core/reactivity.js`

State is `dirty`, `failed`, `firstRun`, mutated in two places: the invalidation
effect body and the lazy `get()`. Every defect so far has been one path setting
a flag the other path relies on, without the matching notification.

Write down, then verify: for each of the 3x2 reachable flag combinations, which
branch runs on the next dependency write, and does every transition that makes a
value observable also reach `trigger(depTarget, 'value')`? A truth table would
have caught all three defects at once.

### 2. Custom-element flag threading — `template-compiler.js`, `template-renderer.js`

There are now **three** notions and they are not interchangeable:

- `isCustomElement` — registry-based (`componentDefinitions.has`), frozen at compile time
- `isCustomTag` — spec-based (hyphen rule), and correctly false inside SVG
- `notHtmlElement` — `isCustomTag || namespaceURI === SVG`, used for boolean-attribute decisions

Round 2 introduced `isCustomTag` and threaded it through "every sink". Round 3
found the nullish branch still on `isCustomElement` — the precise gap the change
existed to close. The parameter defaults (`isCustomTag = isCustomElement`) make a
missed call site silent.

Write down which notion each decision needs and check every use of all three.
Consider whether the default parameter should be removed so a missed site fails
loudly.

### 3. Node/fragment handling in slots — `template-renderer.js`

A `DocumentFragment` empties on insert, so it can be neither an insertion point
nor a cleanup record. Fixed in the `contain()` array path, then the ordinary
array path, then (round 3) the scalar slot path. Three sites, found one at a time.

Find every place a `Node` is inserted and recorded, and check each against the
same rule. There may be a fourth.

## Also worth a fresh eye

- The stable function wrapper (`component.js`) has been revised twice. It now
  exempts values by source text (`class`/`[native code]`), which tracks
  `.apply()` exactly across class, bound class, proxied class, generator, arrow,
  ordinary and frozen-prototype functions - verified. But it is a heuristic on
  source text, and it is the second heuristic tried.
- `GLOBAL_BOOLEAN_ATTRS` is `hidden`, `itemscope`, `autofocus`, `inert`. That
  list was arrived at by two reviewers naming omissions. Check it against the
  spec rather than against what someone noticed.

## The e2e silence is structural, and it is the real lesson

Both downstream suites passed identically before and after every round -
mrepo-web 427/0, codemap 133/133 - including the rounds that fixed two
high-severity bugs. That is not reassurance. Those apps **cannot reach** the
cells the highs lived in:

- mrepo has **zero** module-scope `html\`\`` templates, so the
  compiled-before-registration bug was structurally unreachable there.
- Its 53 `value="${...}"` bindings are all on initialized state, so the
  undefined-binding input wipe was unreachable too.

A downstream suite is a regression gate for *the shapes that app uses*. It is
not evidence about the contract. Treating 427 green tests as a merge signal for
framework-contract changes was a mistake in this session's reasoning.

## Why this keeps happening: the bugs are combinatorial

Every one of the 22 findings sat at an intersection of independent axes, not in
a single function. For the attribute contract alone:

| axis | values |
|------|--------|
| element kind | native HTML, registered component, unregistered custom tag, SVG, hyphenated-in-SVG |
| attribute class | HTML boolean, global boolean, enumerated, ordinary, `aria-`, `data-`, `class`, `style`, form-control `value` |
| value source | bare literal, `""`, `"true"`, `"false"`, other literal, `${true}`, `${false}`, `${null}`, `${undefined}`, `${string}`, `${number}`, `${object}`, `${function}`, `${class}` |
| compile timing | after registration, before registration |
| transition | initial, update-same, update-different, update-to-nullish |

**5040 reachable cells. 73 hand-written assertions across the three new test
files — about 1.4%.** Every finding was a cell a reviewer happened to poke, and
every fix addressed that cell. Reviewers sample; they do not enumerate. That is
why three rounds did not converge and a fourth would not either.

### The risk reduction that actually fits this shape

1. **Generate the matrix; stop writing cells by hand.** One rule function that
   encodes the contract, then a table-driven test over the cross product. 5040
   cases run in seconds. Where rule and implementation disagree it is either a
   bug or a deliberate exception - and the exceptions become one explicit list
   instead of special cases scattered across two sinks. This would have caught
   essentially all 22 findings in one pass.
2. **Collapse the representation.** Three custom-element notions
   (`isCustomElement`, `isCustomTag`, `notHtmlElement`) multiply the space for
   no benefit. Derive one value, once, at a single place.
3. **Fail loudly.** `isCustomTag = isCustomElement` as a default parameter is
   what made a missed call site silent for a whole round. Remove the default.
4. **Keep the e2e suites for what they are** - a downstream regression gate -
   and stop reading them as contract evidence.

The same framing applies to the other two areas: the `computed()` flag machine
is 3 flags x 2 entry paths x 2 outcomes, small enough to enumerate exhaustively,
and node insertion is node-type x insertion-path. Both are matrices that were
being sampled one cell at a time.

### A different reader for the next pass

Izzie's suggestion, and it fits: consult **Claude Fable** on the next round. The
work needed is not another defect hunt - three of those are already recorded
here. It is holding a five-axis contract in view at once and noticing which
combinations nobody has reasoned about. That is a different task from the one
this session kept performing, and plausibly wants a different reader.

## Fable consult, and what it changed

Consulted on the plan above rather than for another defect hunt. It refuted the
central move: **two of the five axes are not dimensions of HTML**, they are
artifacts of the implementation, and generating them would have encoded the bug
into the expected values.

- **Compile timing was deleted, not tested** - this commit. `isCustomElement` was
  registry-based and frozen at compile, and nothing invalidates the cache on
  `defineComponent()`. It is now derived at instantiation (the element is already
  upgraded by then) and re-read at dispatch for events, which is the only
  decision that must survive a registration made *after* render.
- **The `name in el && !name.includes('-')` heuristic is the real cell generator**
  and should be replaced by the exception list Vue and Preact independently
  converged on - not enumerated.

It also found three further defects, all verified here before acting, and all on
the axes it argued should be removed rather than sampled:

| cell | produced | HTML parser says |
|------|----------|------------------|
| `spellcheck="${'false'}"` | attr `"true"`, IDL `true` | `false` |
| `draggable="${'false'}"` | attr `"true"`, IDL `true` | `false` |
| `translate="${'no'}"` | attr `"yes"`, IDL `true` | `false` |
| `spellcheck="${false}"` | attribute removed, so spellcheck turns **on** | - |

And the oracle question is answered: for literal cells there is an independent
one - build the same markup with `ref.innerHTML` and compare. The browser is the
spec table, so nothing is transcribed. For `${}` cells the rule is ~15 lines,
applied to a reference element through plain DOM calls; that is a paragraph a
reader can hold, not the implementation checking itself.

One finding from round 3 was **not a defect**: the `computed()` heal-after-throw
test heals via an untracked variable, and under the reactive contract a tracked
write always reaches the sync-invalidation effect first. Writing the invariant
down would have rejected it. Separately, and pre-existing on `main`: a failed
computed switches from lazy to eager, re-running the getter on every tracked
write with no reader. Acceptable, but it belongs in the invariant statement.

### Follow-up branch, in order

1. Rule + generator against the current sink, parser oracle for literals.
2. Adopt the exception list and the `false`-removal rule (`false` should remove
   an attribute *except* for `aria-`/`data-` and non-boolean names - the existing
   `aria-` special case then disappears into the general rule).
3. Collapse `computed()` to a three-state enum (`CLEAN`/`STALE`/`RETRY`) with a
   six-cell test; it runs in node, no browser needed.

### Residual left open by this commit

`isCustomElement` is derived once per element at instantiation and captured in
the attribute effect closure. An element **rendered before** its tag registers
and upgraded afterwards therefore keeps a stale "native" answer for later
attribute updates. The event path is immune (it re-reads at dispatch). The real
fix is to derive both flags from `el` inside `applyAttributeDirect`, which
removes the parameters entirely - that is step 2's representation collapse, and
it is deliberately not done here.

## Deliberately open, not forgotten

Pure refactors the structural audit itself ranked low: a `resolveWhen()`
normalizer (three copies), a shared trusted-list-result factory, cleanup and
insertion helpers, and the bundler/optimizer minifier fork (deferred past v1 -
release tooling, medium-to-high risk, no wrong runtime behaviour).

## Verified state

Framework 718/718 - componentlib e2e 18/18 - template lint clean - 106 lint
fixtures - `dist/` regenerated and import-checked.

The framework count was recorded as 719 above before it was ever measured here;
the actual pre-commit baseline is **715**, plus the three registration-timing
tests this commit adds. The two 404s in the run are `favicon.ico` and a
deliberate `test.png` fixture - no suite is being silently skipped.

Downstream, both re-vendored from this build with a clean unresolved-import
check first: **mrepo-web 427/0** (35 suites, real backend, auth, playback,
drag-reorder against server state) and **codemap 133/133** (browser UI suite
plus its own vdx-lint run against `/working/vdx-web/tools`). Read the section
below before treating either number as a merge signal.

`docs/tasklists/CODEX-AUDIT-WORKLIST.md` has the full record of what was fixed
and why, including the boolean-attribute contract and the reasoning for
rejecting runtime coercion.

## Process traps hit in this session

- **`dist/` breaks invisibly.** `lib/utils.js` and `lib/router.js` are minified
  in place, not bundled, so their imports must resolve inside `dist/`. An
  `export ... from './core/constants.js'` shipped a bundle that could not load,
  and every suite stayed green because they import `lib/`. `bundler-esm.js` now
  fails the build on it, but only for that class.
- **`/code-review` writes into the repo.** It checks `main` out into `_mainwt/`
  and leaves scratch files; a `git add -A` swept both into a commit. `_mainwt/`
  is gitignored now, but check `git status` before staging.
- **Re-vendoring needs an unresolved-import check first.** mrepo was missing
  `dist/overlay.js` entirely (its componentlib predates `e1ed8b3`), which
  presented as 17 failing suites and cost a wasted diagnosis round.
- `pgrep -f` matches its own shell. Kill by captured PID.
