# Step 6: the attribute sink in three phases

Branch `registry-answerer`, after step 5 (`SLOT-CLASSIFIER-2026-09.md`). The
last step of the batch planned in `ATTR-CONTRACT-CYCLE-4.md`.

`applyAttributeDirect` was one if/else ladder. The six host-applied names -
`class`, `style`, `aria-*`, `data-*`, the global booleans, the enumerated
names - sat at six different heights, interleaved with value-shape rungs
(the nullish rung in the middle handled every name at once), and "no rung
claimed it" was a silent default. Cycle 3 declined to restructure it with no
finding behind it and named the shape to adopt when there was one:
`isHostApplied()` in the matrix harness. This is that.

## The three phases

1. **Refuse, then normalise.** `isRefusedAttr` (shared with the compiler's
   static path since `ea47883`), then `sanitizeUrlAttr`.
2. **Host-applied.** `hostAppliedRule(el, name)` returns one rule from a
   table or null - `applyAriaAttr`, `applyEnumeratedAttr`, `applyClassAttr`,
   `applyStyleAttr`, `applyGlobalBooleanAttr`, `applyDataAttr`. Each handles
   nullish itself, so no value-shape rung sits between them. Consulted once.
3. **Ownership.** `applyComponentAttr` for a hyphenated tag (own prop,
   else side channel plus inherited property or mirror), `applyNativeAttr`
   for everything else (HTML semantics, property where the DOM has one).

Two commits. `2fe9429` is the restructure alone: 3138 cells and every
relation unchanged, and `sink-coverage.js` lists every phase and rule so the
split could not quietly narrow what the instrument measures (it had: the
old list named only `applyAttributeDirect`, whose branches had moved).

## The item the restructure unblocked

Cycle 3 declined "the enumerated branch bypasses a declared prop of the same
name": `ui/form/code-editor.js` declares `spellcheck` to forward it to its
textarea, and the host-applied rule pre-empted ownership entirely, so the
prop never heard the value and the component forced the textarea
imperatively. With phase 2 a single step, the fix is one clause: a class
that OWNS a host-applied name gets the value too, with its type intact, and
the host keeps its DOM semantics.

Two things bit on the way and are both pinned in
`component-attr-contract.test.js` "reaches the host AND the prop":

- Order. The prop's mirror clears the attribute for a non-string, so the host
  write must land last; but a host write on a connected element fires
  `attributeChangedCallback`, which re-derives the prop from the attribute's
  string form (`hidden` would come back as `""`) and notifies a second time.
  The host write is made under `_suppressAttributeChange`, the same flag the
  prop's own mirror uses.
- The global-boolean rule wrote the property through the class's own
  accessor, so `hidden="${null}"` arrived at the prop as `false`. It skips an
  owned accessor now; the prop was delivered with the real value already.

The matrix declares no host-applied prop on purpose (a prop accessor shadows
the DOM one and the probe would read itself), so this is covered by the
contract test and the two branches are named in the coverage instrument. The
code editor binds its textarea's `spellcheck` to the prop and drops the
workaround.

## Answerers, end of batch

| question | start of arc | now |
|---|---|---|
| "Is this a component?" in the render path | 3 (compile, instantiate, dispatch) | 2, the instantiate one deciding only how children are delivered |
| "How does a prop value land?" | 5 | 1 (`commitProp`) |
| "How is a change heard?" | 3 | 1 (`notifyProps`) |
| "What kind of slot value is this?" | 4 | 1 (`slotKind`) |
| "How does a when() resolve?" | 3 | 1 (`resolveWhen`) |
| "Which names are refused?" | 2 sinks, 2 answers | 1 (`isRefusedAttr`) |
| "Which names are the host's?" | 6 rungs | 1 table |
| "What does the attribute mirror hold?" | 4 writers | 1 (`mirrorAttribute`) |

## Verified

| | |
|---|---|
| framework | 774/774 |
| componentlib e2e | 18/18 |
| matrix + relations | 3138 cells, 0 rows, 0 unexplained, baseline empty |
| lint / computed | clean / 14/14 |
| `dist/` | regenerated, idempotent |
| mrepo-web / codemap | once, for the whole batch - see the verification note |

## What is left, for someone deciding what to do next

- `whenMounted` and the mount microtask are the last two pieces of
  `connectedCallback` that are not a named step; both read fine as they are.
- `memoEach` inside a `contain()` boundary renders correctly now but
  re-renders whole on change; keyed reconciliation inside a boundary is an
  optimisation nobody has asked for.
- The slot's script/style refusals and the sink's `isRefusedAttr` are two
  tables by kind of sink. Merging them would be a rename, not a collapse.
- The options-object runtime under the class surface stays, by decision.
