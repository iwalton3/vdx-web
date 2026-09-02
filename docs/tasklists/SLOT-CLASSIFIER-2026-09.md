# Step 5: one classifier for slot values

Branch `registry-answerer`, after step 4 (`DEFINE-COMPONENT-SPLIT-2026-09.md`).

`instantiateSlot` answered "what kind of value is this, and how does it
become DOM" in four places: the ordinary scalar path, the ordinary array
path, the contain() scalar path, and the contain() array path. Each had its
own list of kinds, and the lists differed. The slot relation
(`tests/framework/slot-relations.test.js`, `contain(() => v) == v`) held the
differences as a known-divergent list: a bare Node stringified inside
contain(), and a nested contain() rendered nothing.

## What changed

- **`resolveWhen()`** in `template.js` - the one when()-branch loop, for the
  slot, the contain() boundary, and the keyed list item (structural review
  item 5). Thunks run inline, so the caller's effect tracks them.
- **`slotKind(value)`** - the one classifier: `empty | contain | memoEach |
  html | raw | deferred | node | array | text`. Order matters and is stated:
  a contain() marker is also an html marker; a marker with nothing to render
  is `empty`, not text.
- **`materialize(value, kind, ...)`** - one value into `{ insert, nodes,
  effects, valuesRef?, compiled? }`. The html case takes `reuse` to build the
  reactive values container both paths use for in-place updates. The
  deferred case is the ordinary path's version (owned by the parent's compute
  effect); the contain() array path had its own that skipped ownership.
- **`materializeArray(items, ..., allowHtml)`** - one array walker. The one
  stated difference between the paths survives as the flag: an ordinary slot
  refuses a bare array of html`` (no keyed placeholders, `each()` exists),
  a contain() boundary renders it because the boundary is replaced whole.
- A nested contain() inside a contain() boundary now runs its render
  function inside the outer one - it has no slot of its own to own a boundary.

The two state machines - the slot's `currentNodes`/`currentItemMap`/
`currentValuesRef` and the boundary's `containNodes`/`containValuesRef`/
`containPreviousCompiled` - are untouched, as the structural review said they
should be. `template-renderer.js`: 2472 → 2332 lines.

## Acceptance

`KNOWN_DIVERGENT` in the slot relation is empty; the four entries flipped to
agreement in one run. Structural review items closed by this: 3 (`resolveWhen`),
6 (shared value classification), the unreachable ordinary-array html branch,
and the differing deferred-child trust checks.

| | |
|---|---|
| framework | 771/771, slot relation with no exemptions |
| componentlib e2e | 18/18 |
| matrix + relations | 3138 cells, 0 rows, 0 unexplained |
| lint / computed | clean / 14/14 |
| `dist/` | regenerated, idempotent |

## Follow-up, same day

Izzie: "we're rendering elements as text? that sounds bad" - it was. Two
places still stringified a marker object:

- **memoEach() inside a contain() boundary** rendered "[memoEach]". It is
  the each() fragment its cache says it is; `memoEachToFragment()` is the one
  conversion for slot and boundary, and `materializeKeyed()` the one way a
  keyed list is first put on the page for both. The boundary re-renders the
  list whole on change (a boundary has no keyed reconciliation of its own);
  the slot reconciles by key as before.
- **A contain(), memoEach() or array as an item of a slot array** rendered
  "[object Object]". Refused now, by name, before anything is inserted - an
  item has no slot of its own to hold their state (`guards.test.js`).

The slot relation carries `memoEach` as a kind now, so a boundary and a slot
must agree on it. The one remaining stringification of a non-primitive is a
plain object (`${{a: 1}}` renders "[object Object]"), which is JavaScript's
own answer and the same in both paths.

The slot's script/style refusals and the attribute sink's `isRefusedAttr`
remain two tables, by kind of sink.

## Next

6. The three-phase attribute table under the matrix's zero-cell-change bar.
