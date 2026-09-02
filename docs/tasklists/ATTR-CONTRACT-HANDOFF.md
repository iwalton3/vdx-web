# Handoff: the attribute contract, and why this branch is not merged

Branch `attr-contract-matrix`, 7 commits, off `main` at `469065c`. All local
suites green. **Not merged**, and — as with the handoff that preceded it — the
reason is not a known open bug. It is that this branch has produced a regression
in *every* round, including the two rounds that ended with me saying it was
clean.

Read `CODEX-AUDIT-HANDOFF.md` first for the origin. This continues it.

## Verified, and not

| | |
|---|---|
| framework | 734/734 |
| componentlib e2e | 18/18 |
| template lint | clean |
| matrix baseline | 37, no drift |
| `dist/` | regenerated, imports resolve |
| **mrepo-web / codemap** | **stale — last run at `da28d12`, two renderer commits ago** |

Downstream was deliberately not re-run: the next cycle changes the renderer
again, so run it once at the end. Re-vendor is a *canary* action — revert both
consumer trees afterwards, they must never carry an unmerged framework.

## What landed

Six user-visible defects, each with a test that fails without its fix:

- enumerated attributes (`spellcheck`, `draggable`, `translate`,
  `contenteditable`) inverted their own vocabulary. `${false}` removed the
  attribute, which means *inherit*, so `spellcheck="${false}"` turned spellcheck
  ON; any non-empty string coerced to `"true"` through a boolean IDL setter.
- a valueless attribute took its own NAME as its value, so `<div class>`
  rendered `class="class"` and `<div contenteditable>` was not editable.
- nullish was stringified into the DOM (`id="${undefined}"` → `id="undefined"`).
- a lazily-registered component lost every non-string prop.
- an undeclared name on a component lost its attribute — `tabindex="${0}"` left
  the element unfocusable.
- a string→non-string prop change fired `propsChanged` twice, with a spurious
  `null` in between.

The last three were regressions introduced *by this branch* and caught later in
it. That is the pattern below.

## The ratified contract

Ratified by the repo owner. Conformance with other frameworks is explicitly not
the goal; the test is "what would a VDX component do, given what this DOM node
means?" **This exists only in `tests/attr-matrix/matrix.js` comments and in
commit messages. Nothing under `docs/` or `FRAMEWORK.md` was updated. Landing it
there is part of the next cycle.**

Native elements:

- **pure boolean** (presence: `disabled`, `hidden`) — plain JS `Boolean`
  coercion. A non-empty string is truthy, so `disabled="${'false'}"` *is*
  disabled; `${0}` and `${''}` are off.
- **enumerated** (`ENUMERATED_ATTRS` in `constants.js`) — nullish means "do not
  set the attribute" and the node keeps its inherited default. A string is that
  attribute's own vocabulary and passes through verbatim, `''` included (a
  valueless attribute parses to `''`, and for `contenteditable` that means ON;
  coercing it also splits the renderer from the compiler's static path). Any
  other value coerces onto the attribute's own on/off words.
- **plain** — nullish removes. `null`/`undefined` are never stringified.

Components: `${}` reaches the prop losslessly. The attribute is a devtools
mirror and can only hold strings, so a non-string shows no attribute — the place
to inspect a non-string is the node (`$0.propName`), not the DOM. Literal `=""`
is always a string. Absence **in source** means undefined, hence prop default —
that is a statement about the template, not about the rendered DOM.

Carve-outs, because they act on the host rather than informing the component:
`class`, `style`, `aria-*`, `data-*`, the global booleans (a component must stay
hideable before it registers) and the enumerated attributes (a contenteditable
custom element really is editable).

Ownership decides the rest, in `applyAttributeDirect`: a name the element's own
class declares goes straight to the property, and `component.js`'s prop setter
maintains the mirror itself under `_suppressAttributeChange`. An inherited
`HTMLElement` name keeps native semantics. A name owned by nothing goes to the
attribute, which for an unregistered tag is the only transport there is.

## What went wrong here, which is the useful part

Every failure in this session had one shape: **I produced a plausible
explanation where a check was needed.** The mechanisms worked; the prose around
them did not.

1. **A true signal, dismissed in prose.** The lazy-registration regression sat
   in the matrix output for two rounds as the `unregistered ... ${0}/${1}` rows.
   I wrote them off as "the rule treats unregistered as native". The rule was
   right; my implementation was wrong.
2. **A confident comment invented to justify a fix I had not understood.** I
   claimed prop accessors "are not necessarily installed during the first
   render". They are, on the prototype, at `defineComponent` time
   (`component.js:1792`). The real cause of the test failure I was chasing was a
   third-party web component — not a VDX component at all. That false comment is
   what produced the `tabindex` regression.
3. **Logic duplicated that already existed.** `component.js:1556-1568` already
   implements the string/non-string mirror, correctly, under a suppression flag.
   I wrote a second copy in the renderer without the flag and in the wrong
   order. The fix deleted code.
4. **A README that pointed the next reader away.** I explained two baselined
   rows as cssText normalisation. They were the inherited-setter write. The file
   whose job is to say "these are fine" was wrong about which ones.
5. **Four lines of confident comment over a branch that never runs.** The
   `GLOBAL_BOOLEAN_ATTRS` branch was unreachable — all four names are in
   `BOOLEAN_ATTRS`, so `isBooleanAttr` catches them earlier. Found by measuring
   branch coverage, not by reading.
6. **A test that could not fail.** The first `registration-timing` draft
   compiled its templates at module scope. The template cache is a 500-entry
   LRU, so those entries were evicted mid-suite and silently recompiled *after*
   registration — the exact state the test existed to exclude. Compile,
   `defineComponent` and render must be adjacent in the test body. **Always
   confirm a new test fails before its fix.**
7. **`git add -A` swept a scratch probe into a commit** (amended). Twice-warned
   hazard; check `git status` before staging.
8. **An `rm` that silently did nothing** because the shell's cwd resets between
   commands and the relative path did not exist there. That is how the probe
   survived to be swept.

If the next session takes one thing from this list: when the mechanism reports
something you are about to explain away, write the check instead of the
explanation. Every item above cost a round; every one would have cost minutes.

## Fable's verdict on the original risk

Asked whether the combinatorial risk was addressed: **throughput, not solution.**
The loop got faster — days to minutes — but it cannot find a blind spot it
shares. It demonstrated this by measuring V8 branch coverage of
`applyAttributeDirect` under the matrix: the 1080 cells never execute the
global-boolean branch (dead), the form-value-clearing branch (update-only), or
object-form `style`. The matrix is HTML-taxonomy-shaped; the regressions live on
axes the *implementation* branches on and the matrix does not.

The remedy is fewer deciders, not more cells.

## Next cycle, in order

1. **Add the axes the implementation has and the matrix does not**: transition
   (initial → update-different → update-nullish), declared-vs-undeclared props
   (`PROBE_PROPS` in `matrix.js` currently declares everything, which is what
   hid the `tabindex` regression), and `${object}`/`${function}` values. Print
   sink branch coverage with the run — ~40 lines with puppeteer, and it finds
   dead branches mechanically.
2. **Restructure the baseline instead of clearing it row by row.** The 37 are
   four different things wearing one label: deliberate rule exceptions
   (itemscope, SVG `hidden`) belong in `ruleFor` as clauses with a reason each;
   comparator normalisation (`style` trailing `;`) belongs in `same()`; probe
   artifacts belong in the harness. Then the baseline is ~0 and every nonzero
   row forces a decision instead of a table entry. A 37-row accepted-exceptions
   list is exactly the instrument that let the lazy regression hide in plain
   sight — it looked like the other 36.
3. **Decide two open contract questions**, then write them into `ruleFor`:
   - `${undefined}` currently means "prop default" on initial render and
     `undefined` on update. Pick one. "undefined = not provided → default; null
     = explicit null; initial and update agree" is coherent.
   - On a lazily-registered component, `${false}` is indistinguishable from
     omission (the attribute is removed, upgrade reads the prop default). If the
     attribute is the sole transport, `${false}` should write `"false"` —
     `boolProp` already reads that as off. Trade-off: a non-VDX element that
     later registers and reads presence as truth would see `disabled="false"` as
     on, the same class already documented at `FRAMEWORK.md:222-227`.
   - Also print the `noOpinion` count. It is ~88 cells — 8% of the space with no
     oracle at all, and currently computed and never shown.
4. **Land the contract in `docs/`** (`docs/templates.md` or `FRAMEWORK.md`). It
   is ratified and undocumented.
5. **Add the `computed()` cell file** as a node test. Fable wrote and ran it: 12
   cells, ~0.1s, no browser. The machine is correct in 11. The twelfth is a
   double-run when a healing read happens inside a dependent effect's own run —
   one spurious render. Either exclude `activeEffect` from that trigger or pin
   the double run as accepted.
6. **Then** re-vendor and run mrepo + codemap, once.

## Do not

- **Do not extend the matrix along HTML axes.** 23 attributes already saturate
  that taxonomy. Extend toward uncovered *implementation* predicates; branch
  coverage gives that a stopping condition.
- **Do not refactor `computed()` to a state enum.** Fable retracted that advice
  after enumerating it: the machine is correct, so it is risk with no finding
  behind it. Land the cell file and leave the code.
- **Do not make lazy components lossless by setting expandos** for
  `_parseAttributes` to read. An own property shadows the prototype accessor
  installed at `component.js:1792` forever, so every later `el.count = x` writes
  the expando and the prop never updates. Classic upgrade trap; nothing deletes
  the own property.
- **Do not run another review round before the duplication is gone.** Reviewers
  will keep finding cells of the same duplicated mirror, one per round.
- **Do not reintroduce a compile-time registry flag or runtime boolean
  coercion.** Both were removed or rejected with recorded reasons (`5e0d4a3`,
  and the boolean-attribute contract in `CODEX-AUDIT-WORKLIST.md`).
- **Do not read green suites as contract evidence.** mrepo returned an identical
  427/0 before and after two high-severity fixes, again with the lazy regression
  live, and again with `tabindex` broken. It exercises the shapes that app uses;
  a production app is a *biased* sample, concentrated by construction on the
  cells that already work.

## Candidates for deletion, not just fixing

The single highest-leverage move in this whole arc was deleting an axis
(registration timing) so its cells stopped existing. Two more candidates, both
recorded with their tension rather than resolved:

- `isBooleanAttr(name, isCustomElement)` in `constants.js` — the parameter is
  named `isCustomElement` but every caller passes `notHtmlElement`. That is the
  three-notions problem from the previous handoff, now living in a signature.
  Renaming is free and has no behavioural tension.
- The `GLOBAL_BOOLEAN_ATTRS` early return in the same function ignores that
  parameter entirely, which is what makes "global boolean × element kind" a cell
  family at all — 14 of the 37 baselined rows. Deleting the special case
  collapses them, but `hidden` on a component goes with it. Genuine tension;
  decide it deliberately.

## Reference

- `tests/attr-matrix/README.md` — the matrix, its two oracles, the baseline.
  Its table is derived from the JSON; if they disagree, the JSON wins.
- `tests/attr-matrix/matrix.js` — the rule, and the DOM-derived classifier
  (vocabulary probed as PAIRS; probing on/off independently is ambiguous because
  an invalid value falls back to the default).
- The literal half of the matrix has a real oracle — the HTML parser, via
  `ref.innerHTML`. Nothing is transcribed, so it cannot encode our own
  misconceptions. The `${}` half is assertions against a rule I wrote, and that
  is the half where every mistake happened.
