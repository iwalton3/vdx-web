# Handoff: stop patching, restate the invariants

Branch `codex-audit`, 12 commits, unpushed. All suites green. **Not ready to
merge**, and the reason is not a known open bug — it is the shape of the last
three review rounds.

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

## Deliberately open, not forgotten

Pure refactors the structural audit itself ranked low: a `resolveWhen()`
normalizer (three copies), a shared trusted-list-result factory, cleanup and
insertion helpers, and the bundler/optimizer minifier fork (deferred past v1 -
release tooling, medium-to-high risk, no wrong runtime behaviour).

## Verified state

Framework 719/719 - componentlib e2e 18/18 - template lint clean - 106 lint
fixtures - `dist/` regenerated and import-checked.

Downstream, both re-vendored from this build with a clean unresolved-import
check first: **mrepo-web 427/0** (35 suites, real backend, auth, playback,
drag-reorder against server state) and **codemap 133/133** (browser UI suite
plus its own vdx-lint run against `/working/vdx-web/tools`).

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
