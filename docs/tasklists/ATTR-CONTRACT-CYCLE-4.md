# Handoff: the relations ran, and they found what the cells could not

Branch `attr-contract-matrix`, merge base `main` at **`fd2d4c3`**. Read
`ATTR-CONTRACT-CYCLE-3.md` first; this is the cycle it asked for, items 1, 2
and 4 of its "what I would do next", plus the test-runner trap it listed.

## Verified

| | |
|---|---|
| framework | **768/768** (746 + 21 slot relations + 1 style pin) |
| componentlib e2e | 18/18 |
| attribute matrix | 3138 cells, 0 rule disagreements |
| relations | 17217 update, 4894 ingress, 1146 timing, 10 children |
| baseline | **15 rows, all `relation:children`, parked** (see below) |
| sink branch coverage | 0 unexplained, and `literalAttrValue` is now measured |
| computed cells | 14/14 |
| template lint | clean, 198 files; fixtures 106 assertions / 20 files |
| `dist/` | regenerated, idempotent |
| mrepo-web / codemap | re-run is the next step, after this doc |

Every lib change fails first through the relation that found it, and the
ingress relation - the only one that had never been red - was falsified by
deleting `resolveIncoming` from `setProps`: 429 rows, restored byte-identical.

## What landed

**The test runner reports from page state.** `test-runner.js` records every
failure structurally, the page sets `window.__VDX_TEST_RESULTS__` when the
run ends, and `run-framework-tests.js` prints the failing tests from that
object after the summary. The console stream is still printed for reading
along, but nothing depends on its ordering any more. A module that 404s or
throws on import ends the run at once instead of at the 90s timeout, and only
until the runner starts - the security tests deliberately load URLs that must
fail. Falsified with an injected failure at the very end of the last file and
with a broken import.

**Four metamorphic relations** (`tests/attr-matrix/relations.js`, and
`tests/framework/slot-relations.test.js` for the slot one). A relation needs no
`ruleFor` opinion: two ways of reaching one state must land in one state, read
through one snapshot. They walk every value pair, not one prior per value,
because the branches that misbehave are the ones that look at what is already
there.

Three things they found, none reachable from a cell:

- **`style` withdrawn on update left `style=""`.** Blink serialises a
  CSSOM-written inline style back into the attribute lazily, and
  `removeAttribute` on an unsynchronised one leaves an empty attribute. Any
  read in between makes the removal stick - which is why the matrix's
  transition walk, which reads `before` on every step, never saw it. One
  `getAttribute('style')` before the removal. This is instrument interference
  in its purest form: the cell's own observation changed the answer.
- **The attribute mirror had four writers and two rules.** The setter and
  `setProps` mirrored strings and removed anything else; the pre-construction
  `_pendingProps` path mirrored strings only; the template values taken at
  upgrade (`_parseAttributes`) did not mirror at all. So a lazily registered
  component kept the text mirror the renderer had written while the element
  was unregistered - `disabled="0"` on a host whose class owns `disabled`
  and whose eager twin has no attribute. Now one `mirrorAttribute()` for all
  four. This is the "~4 answerers" row from cycle 3's table, and it was the
  cheapest collapse on the list.
- **`contain()` stringifies a bare Node and swallows a nested `contain()`.**
  Both are missing rungs in the containment dispatcher, which handles a Node
  inside an array but not on its own. Listed as known-divergent in the slot
  relation, with the reason, so the value-classifier unification (structural
  review item 6) is told to delete the entries. The structural review's `raw()`
  divergence is gone - the relation confirms the two sides agree.

Three harness defects found by running the relations, all mine:

- The cell host re-read the module-level template factory on every render, so
  with two hosts alive the eager host re-rendered with the lazy host's
  template. Pinned per host now (`tpl = CURRENT`), which is what the existing
  matrix already assumed with one host at a time.
- The `style` canonicaliser was being applied to a presence boolean, turning
  `true` and `false` into the same empty string and hiding half of every style
  finding. Only `attr` and `idl` get the per-attribute normalisation now.
- `literalAttrValue` reported "one-liner, inlined" because nothing called it;
  the children relation does, and its literal-boolean branch is explained by
  the boolean-attrs test rather than by an inlining excuse.

## Parked, with the destination named

**15 rows, `relation:children`.** Registered after render, a component captures
its light DOM through an `innerHTML` round trip in `connectedCallback`. That
drops every `on-*` listener and every binding the parent put on those nodes -
the click never reaches its handler, and the text never updates. Registered
first, the same children arrive as deferred descriptors and keep both. This is
the registry-at-instantiate-time answerer (`isCustomElement` at
`template-renderer.js:1695`), and the fix is to adopt the live child nodes
instead of serialising them. It was the unverified worry in cycle 3; it is
verified now, and it is pre-existing on `main`. Deferred to after the merge by
decision, not by difficulty: the change touches the static-HTML children path
too and wants the downstream suites run on it alone.

**`${undefined}` mirrors differently by registration order.** Eager reaches the
setter, which mirrors the RESOLVED default (a ratified `ruleFor` clause); lazy
records nothing and takes the default unmirrored, exactly as an omitted
attribute does. The prop agrees. The timing relation compares that value on the
prop channel only, with the reason at the call site. If the mirror-the-default
rule is ever revisited, that exclusion goes with it.

## What to do next, in order

1. Re-vendor and run mrepo-web and codemap against `dist/` (the memory notes
   have the procedure). Then merge.
2. **The registry answerer.** Make the compiler stop reading
   `componentDefinitions` (`isFullyStatic`: a hyphenated tag is never static),
   and make lazy children adopt live nodes. The children rows in the baseline
   are the acceptance test; when they resolve, the file is empty again.
3. Split `defineComponent` by extraction. Prop ingress now has one mirror rule
   and one resolution rule; make it one code path with a source tag, then pull
   children capture, style injection and render scheduling out of the closure.
4. One value classifier for `instantiateSlot`. The slot relation's
   known-divergent list is the acceptance test.
5. Then the three-phase attribute table, under the matrix's zero-cell-change
   bar.

## Rules that earned their keep this cycle

- **A relation finds what a cell cannot, and the cell's own reads can hide
  it.** The style finding was invisible to the transition walk because the
  walk observed before every step. Reading is not free of side effects in a
  browser.
- **Two hosts alive at once is a different harness.** Every helper written for
  "one cell at a time" had an assumption to check; two of three were wrong.
- **Falsify the relation that never went red.** The ones that found a defect
  have their evidence in the pre-fix run; the ingress relation had none until
  the mutation.
- **The runner trap in cycle 3 did not reproduce**, in three runs with the
  failure placed at the very end. It may have been the ugrep binary-detection
  trap wearing the runner's clothes. The fix is right anyway: a verdict that
  depends on console ordering is a verdict that can be lost.
