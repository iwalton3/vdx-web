# Handoff: the review rounds ran, and the metric turned out to be answerers

Branch `attr-contract-matrix`, merge base `main` at **`fd2d4c3`** (the earlier
handoffs say `469065c`; that is wrong — `git merge-base main HEAD`). **Still not
merged.** Read `ATTR-CONTRACT-CYCLE-2.md` first, then this.

Cycle 2's one open item was "run the review rounds." They ran: `/code-review
high`, a codex round, and a Fable strategy consult. Thirteen findings, seven
real, all fixed. More importantly, Fable refuted the diagnosis this branch was
operating under, and the replacement is the useful part of this document.

## Verified

| | |
|---|---|
| framework | 746/746 |
| componentlib e2e | 18/18 |
| attribute matrix | **3138** cells, 0 disagreements, empty baseline, **exit 0** |
| sink branch coverage | 0 unexplained blocks, and it can now fail the run |
| computed cells | 14/14 |
| template lint | clean, 198 files; fixtures 106 assertions / 20 files |
| `dist/` | idempotent, and the real bundle checked in a browser |
| **mrepo-web / codemap** | **NOT re-run since cycle 2** — the remaining pre-merge step |

Every fix below is pinned by a test confirmed to fail first, and every one was
falsified by mutating `lib/` until the run went red, then restoring
byte-identical.

## The diagnosis, replaced

The framing going in was that these are **ordering/overlap defects in the
`applyAttributeDirect` ladder** — that the component contract was inserted near
the bottom of a long if/else chain, so earlier predicates silently pre-empt it.
That framing is *partly* true and mostly a distraction. Fable refuted it and the
refutation checks out:

- The `on*` guard is **byte-identical to `main`** (`git show
  fd2d4c3:lib/core/template-renderer.js | grep -n 'on\[a-z\]'`). Nothing was
  reordered. What the branch added was a *contract* and a doc example promising
  behaviour the guard never provided.
- `setProps` is outside the ladder entirely, so an ordering story cannot contain
  it.

**The real shape: one question answered in more than one place, and the places
disagree.** That signature fits every defect in this arc, cycle 0 included. It
is also the only complexity metric here worth tracking — not lines, not
branches, not matrix cells.

Questions and their answerer counts, now:

| question | was | now |
|---|---|---|
| "Is this a component?" | 3 | **3** — `template-compiler.js:237`, `template-renderer.js:1695`, `:2242` |
| "Is this element-kind X?" | 3 notions | **2** — `isCustomTag` (tag shape), `notHtmlElement` (shape ∪ SVG); `isCustomElement` is out of the attribute sink |
| "What name does the class own?" | 2 | **1** — `propNameFor()` |
| "What does `undefined` mean?" | 2 | **1** — `resolveIncoming()` |
| "How does a value become an attribute?" | ~4 | ~4 — setter mirror, `setProps` mirror, sink writes, compiler static path |

Cycle 0 deleted an axis (compile timing) and called it the highest-leverage move
of the whole arc. It was an answerer deletion. So was every good move since.

## What landed

`554de2d` `1a45bdc` `6c57bd0` `5236ce9` `5ce4d80`.

Seven defects, each a second answerer or a wrong one:

- **`on*` props were dropped on a component whose class had not loaded yet.**
  The guard keyed on registry membership at render time, so a lazily-registered
  component was treated as native and its handler prop refused with a security
  warning — contradicting the example this branch added at
  `docs/templates.md`. Now keyed on tag shape. `isCustomElement` left the sink's
  signature; its other use there was redundant, because `appliedFormValues` is
  only ever set under the `INPUT/TEXTAREA/SELECT` check and none of those can be
  a custom element. The adversarial half is pinned: a string assigned to
  `el.onclick` on a hyphenated tag is nulled by WebIDL, not compiled.
- **A kebab-spelled attribute for a camelCase prop delivered once and never
  again.** Ownership was tested under the template's spelling, so the value took
  the side channel — drained by `_parseAttributes`, once per connect. A stale
  object that looks like it works is worse than one that never arrives.
- **`undefined` meant two things** — the setter resolved it, `setProps` (which
  the router uses) did not.
- **An object written to `data-*` reached the DOM as `"[object Object]"`** and
  was handed to the component as its prop, replacing the declared default.
  Measured against a real `fd2d4c3` worktree: main gave `attr=null, prop="DEF"`.
  Native `<div>` was and is unchanged, which is the part that made this look
  like a non-finding.
- **`allowfullscreen`/`nomodule`/`playsinline` were not in `BOOLEAN_ATTRS`**, so
  `allowfullscreen="${0}"` *wrote* the attribute.
- **The enumerated lookup was case-sensitive** — `<div SPELLCHECK="${false}">`
  missed the branch, removed the attribute, and inherited spellcheck-**on**.
- **A refused style value warned without clearing**, leaving the previous
  render's style on screen.

Instrument fixes: `sink-coverage` counted an unmeasured sink as clean and
`run-attr-matrix` discarded the count — the same defect the branch had just
fixed in its own lint (`bd02166`), reproduced inside the instrument built to
catch it. Both fixed; the count now gates the exit code. `same()` is
channel-aware: its `String(a) === String(b)` fallback is the DOM's coercion and
belongs on the `idl` channel, not on `prop`, where it accepted `1` as `"1"` and
`null` as `undefined`.

New matrix axes: **name shapes**, `onpick` and `from-unit`. The three axes cycle
2 added were all *value* axes; the implementation also branches on `/^on[a-z]/`
and `name.includes('-')`, and neither shape existed. Adding them immediately
caught an incompleteness in this cycle's own fix — the nullish/false path
resolved the prop name in only one of its two branches.

## Declined, deliberately

Filtered on the metric above: a fix that adds an answerer is not worth a finding.

- **Pending props beat a later pre-upgrade `setAttribute`.** Real, and the fix
  needs *ordering* information — when the attribute was set versus when the prop
  was recorded. That is new state and a new decider, for a sequence (imperative
  `setAttribute` on an unregistered element, between render and registration)
  that nothing does. Leave it.
- **The enumerated branch bypasses a declared prop of the same name**
  (`ui/form/code-editor.js:34` declares `spellcheck`; its comment at `:45-48`
  still describes the *old* collision). Fixing it means testing ownership
  *before* the enumerated carve-out — which is the restructure below, not a
  patch. Doing it for enumerated alone adds another ordering interaction. Defer.

## What I would do next, in order

**1. Not a restructure of `applyAttributeDirect`.** Fable checked and it would
not have prevented any of the seven; their causes are outside the ladder or in
its *inputs*. The side-effect ordering in there is load-bearing (attribute
removed *then* setter notified; attribute written *before* property so the
lossless value lands last). Risk with no finding behind it.

**2. Collapse the remaining answerers.** Greppable, and it is the stopping rule:

```sh
grep -n "componentDefinitions.has" lib/core/*.js   # 3 today; 1 in the render path
grep -n "notHtmlElement\|isCustomTag" lib/core/*.js
```

**3. Make the carve-outs a table consulted once, not rungs competing on
ordering.** The six host-applied names (`class`, `style`, `aria-*`, `data-*`,
the global booleans, the enumerated names) sit at six different *heights* in one
chain, interleaved with value-shape rungs. "No rung claimed it" is a silent
default, and that is what let `data-` pre-empt components.

The harness already has the abstraction `lib/` lacks: `isHostApplied()` in
`tests/attr-matrix/matrix.js`, and `ruleFor` is a more legible statement of the
contract than `applyAttributeDirect` is. **When the oracle reads better than the
implementation, the implementation can usually adopt the oracle's shape.**
Refusals first, then host-applied, then ownership — three phases. Acceptance bar
is **zero matrix cell changes**, which is the one job that instrument is
genuinely good at. This also unblocks the declined `spellcheck` item.

**4. Build the metamorphic relations.** Fable's point, and it stands: review
rounds keep finding instances of one class, so a fourth round finds the fifth
instance. A relation needs no `ruleFor` opinion, and the `${}` half of the
matrix — assertions against a rule we wrote — is where every mistake in this arc
happened.
- `render(eager) ≡ render(lazy, then defineComponent)` (~60-80 lines; needs a
  fresh tag per cell, `customElements.define` is once-only)
- `state after update-to-X ≡ fresh render of X` (~20 lines; catches the kebab
  class)
- `el.v = x ≡ el.setProps({v: x})` (~20 lines)

**5. Then re-vendor and run mrepo + codemap, once.**

## The thing that actually worries me

**The audit has been deep but narrow.** Four cycles on the attribute sink, a
cell file for `computed()`. The attribute contract is now the best-tested
surface in the framework — and the risk has moved to three paths that key on the
same confused notions with none of the instrumentation:

- **event dispatch** — `resolveEventValue`, `isCustomElement` at `:2250`
- **children capture** — `:1779`, `:1819`. Fable predicts lazy vs eager children
  differ here for the same reason `on*` props did. **UNVERIFIED — I did not test
  it.** Worth answering before merge, because `docs/templates.md` now *promises*
  registration-timing equivalence. The eager≡lazy relation above answers it.
- **the compiler's static path** — `isFullyStatic` at `template-compiler.js:237`
  still reads the registry at compile time, in a tree whose commit `5e0d4a3`
  says the compiler no longer records registry membership at all.

Next cycle should point the existing instrument at those, not add cells to the
one that is done.

## On the opinionated contract itself

Worth separating two things that get blamed together. Lossless `${}` to
components while native attributes keep HTML semantics **requires** a dispatch
decision per (element, name, value); you cannot make that not-a-decision, and
edge cases there are the price of the feature. That is a fixed cost, not a
defect generator.

What generated defects is that the decision was **emergent** — a fall-through
order — rather than explicit. Those are separable, and only the second one
compounds.

## Rules that keep earning their keep

- **When the mechanism reports something you are about to explain away, write
  the check instead of the explanation.** Held again: two of my own hypotheses
  this cycle (a non-string `PROP_DEFAULT`; a string prop equal to its default
  losing its mirror) were refuted by five-minute probes.
- **A reviewer finding is a hypothesis, not a verdict.** Fable called the
  `data-*` regression a "no-opinion cell" — it had checked the *native* case and
  generalised. A real `fd2d4c3` worktree settled it in one run. In the other
  direction, both reviewers called the valueless-flag change a break; it is a
  *convergence* (main: template `"disabled"` vs static `""`; now both `""`), and
  `boolProp('')` is `true`. **Severities were wrong in both directions.**
- **Two of my expectations were wrong, not the code.** I asserted a kebab mirror
  for a *number* prop (non-strings never mirror), and wrote a matrix clause
  expecting literal `on*` text to be refused — it is not, by design; the static
  form is caught by the `t10-inline-events` lint and only *interpolated* values
  reach the guard.

## Traps that cost time here

- **Never restore a mutation with `git checkout --` on a dirty tree.** It
  discards uncommitted work, not just the mutation. It ate a full set of
  renderer fixes mid-falsification. Use a file backup and `diff -q` after.
- **A tool timeout can leave a mutation in place.** Check with `diff -q` before
  believing a suite result.
- **`run-framework-tests.js` does not show failing test names.** It forwards
  `console.error`, but exits on seeing the summary and races the remaining
  console messages. Cause identified, **not fixed**. To see failures, drive
  `/tests/framework/` with puppeteer and collect `console` events of type
  `error`. This directly undermines "confirm a test fails before its fix", so
  budget for it.
- **`grep` here is `ugrep`**, which treats a stream containing the suites' ✅ as
  binary and silently prints nothing. Use `sed -n` to extract counts.
