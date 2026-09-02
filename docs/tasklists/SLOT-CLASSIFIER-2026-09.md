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

## Still two answers, noted

- `memoEach()` inside a contain() boundary renders as text ("[object
  Object]"), as it always did: its cache lives at the slot, and a boundary is
  not a slot. `toKeyedChild` throws for the same case with a message; the
  boundary could too.
- The security refusals at the top of `instantiateSlot` (script and style
  parents) are the slot's own; the attribute sink's are `isRefusedAttr`. Two
  sinks, two refusal tables, by kind of sink.

## Next

6. The three-phase attribute table under the matrix's zero-cell-change bar.
