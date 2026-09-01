# Keyed `each()` items snapshot their node list, so a root-level slot desyncs on move

Found while fixing `BUG-REPORT-each-drops-lazy-directives.md`. **Separate,
pre-existing bug** — not caused by that fix. Reproduced against
`lib/core/template-renderer.js` at `91b95e1` + the lazy-directive fix.
**Fixed** — see "Fix (landed)" below.

## Symptom

In a **keyed** `each()`, an item whose template has a **slot at its DOM root**
(not nested inside an element) desyncs when the slot's content changes node
count and the item is later **moved**. Old nodes are stranded at the previous
position and detached nodes get re-inserted.

```js
// item root is <h4> + a slot -> the slot's nodes are siblings of <h4>, not children
${each(this.state.items, i =>
    html`<h4>${i.id}</h4>${each(i.kids, k => html`<p>${k}</p>`, k => k)}`,
    i => i.id)}
```

```
initial : h4:a h4:b h4:c
grow a  : h4:a p:x p:y h4:b h4:c          # a.kids = ['x','y']
move a  : p:x p:y h4:b h4:c h4:a          # items = [b,c,a]
          ^^^^^^^^^ expected: h4:b h4:c h4:a p:x p:y
```

Same shape, same result, with a directive as the whole item — the form the
lazy-directive report recommends as a workaround:

```js
${each(this.state.items, i =>
    html`${when(i.big, () => html`<b>${i.id}</b><em>${i.id}</em>`,
                      () => html`<span>${i.id}</span>`)}`,
    i => i.id)}
```

```
initial : span:a span:b span:c span:d
flip a  : b:a em:a span:b span:c span:d   # a.big = true
move a  : b:a em:a span:b span:c span:d span:   # items = [b,c,d,a]
                                          ^^^^^ resurrected detached <span>
```

## Diagnosis

`updateKeyedList` and `instantiateSlot`'s initial each() pass both record an
item's DOM as a **snapshot**:

```js
const { fragment, effects } = instantiateTemplate(child, wrappedValues, component, slotInSvg);
const nodes = [...fragment.childNodes];        // template-renderer.js:387, :511, :1358
currentItemMap.set(key, { nodes, effects, compiled: child, valuesRef, slotInSvg });
```

A slot at the item's root keeps its own `currentNodes` and swaps DOM in place
inside its effect. The item entry never hears about it, so `item.nodes` still
lists nodes that are detached, and omits the ones that are live. Every consumer
of `item.nodes` is then wrong:

- the move loop re-inserts detached nodes and leaves live ones behind
- the removal loop leaves orphans
- `insertPoint` advances to a detached node
- `allNodes` → the slot's `currentNodes`, so the full-replacement cleanup misses nodes

The same snapshot pattern is used at every level (`currentNodes = [...fragment.childNodes]`
in the html / raw / deferred / contain branches), so it recurses.

## Not affected

- Item root is a **single element** (`item => html`<li>…</li>``) — the overwhelmingly
  common shape. Slots live inside the element and move with it.
- Keyless `each()` — a key-list change forces full re-instantiation, and moves
  never happen (`hasExplicitKeys` false → `updateKeyedList` returns null).
- Items whose root-level slot never changes node count (a text value, a `contain()`
  whose branches have the same root count).

## Fix (landed)

Item node lists are now **live** for the items that need it.
`makeItemRecord()` (`lib/core/template-renderer.js`) builds every keyed item's
record:

- `hasVariableRoot(compiled)` walks the item's compiled root - through
  fragments, never into elements - looking for an `OP.SLOT`. An item rooted at a
  single element (`item => html`<li>...</li>``, the overwhelmingly common shape)
  is fixed-size and keeps a plain array. Nothing changes for it.
- An item that does contain a root-level slot gets a **trailing comment anchor**
  appended to its fragment, and its `nodes` becomes a getter that walks the DOM
  from its first node to that anchor. The first node is always stable (a static
  node, an element, or the slot's own placeholder), so the walk is always the
  truth - including for slots nested any number of levels deep, which is why
  this shape was chosen over threading live handles up from each slot.

Every consumer in `updateKeyedList` reads through that getter. Two ordering
rules the fix depends on, both commented at the call sites:

- **Read the range before disposing effects.** A slot-rooted item starts at its
  slot's placeholder, and the slot's `dispose()` removes that placeholder - walk
  first, then dispose.
- **Reuse the record object, do not copy it.** `{...oldItem}` and
  `{nodes: oldItem.nodes, ...}` both flatten the getter back into a snapshot,
  which is the original bug. Reused items now mutate `record.compiled` in place.

Regression cover: `tests/framework/keyed-list-ranges.test.js` - the three shapes
above, the memoEach path, an anchor-accumulation check, and a seeded fuzz
(shuffle + resize + delete, DOM compared against an independent model each
step). Four of its six cases fail against the pre-fix renderer.

## Related guidance

Give list items an element root where you can - it is the cheapest shape, and
the only one that costs no anchor. `docs/templates.md` (`each()` - "What an item
template may return") and the `contain()`/`memoEach()` guard message both point
at `item => html`<li>${...}</li>``.
