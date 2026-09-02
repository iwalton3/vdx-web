# Step 4: `defineComponent` split by extraction

Branch `registry-answerer`, after step 3 (`REGISTRY-ANSWERER-2026-09.md`) and
the two sink fixes (`ea47883`). Three commits, each a pure move gated by the
full suite and a zero-change matrix run: `4d68113`, `f7b4a26`, `fc5bede`.

## Why extraction, not redesign

`defineComponent` was one 1459-line closure with a 510-line
`connectedCallback`. Nothing in it could be tested without a custom element,
and every review round landed in it. The class surface is what everyone
writes (140 class files, 2 options files), but the runtime underneath is the
options format, and that is deliberate (class-component-authoring memory).
So: keep the runtime, make its steps nameable.

## What moved where

| was | now | lines |
|---|---|---|
| setter, `setProps`, `attributeChangedCallback`, pre-construction pending, `_parseAttributes` - five copies of how a prop lands | `component-props.js`: `createPropSpec()` → `resolveIncoming`, `mirrorAttribute`, `commitProp`, `notifyProps`, `isDeclared`; `parseAttributes()` | 246 |
| the template block in `connectedCallback` (compute effect, value getters, error fallback, recovery) | `component-render.js`: `mountTemplate(component, options, name, gen)`, `scheduleRender` | 331 |
| inline guards and steps | `validateDefinition`, `validComputedNames`, `captureLightDom`, `runClassConstructor`, `createComputeds`, `injectStyles` at module level in `component.js` | - |
| four identical `children`/`slots`/`_vdxChildren`/`_vdxSlots` accessors | one `contentAccessor(accessor, key)` | - |

`defineComponent`: 1459 → 655 lines. `component.js`: 1863 → 1264.
`connectedCallback` reads as: generation, parse attributes, ready promise,
capture light DOM, class constructor, computeds, mount template, mount hook.

## The answerer count, which is the point

| question | before step 4 | after |
|---|---|---|
| "How does a prop value land?" | 5 code paths | **1** (`commitProp`) |
| "How is a change heard?" | 3 (setter, `setProps`, attribute callback, each its own propsChanged + version bump) | **1** (`notifyProps`) |
| "What does the attribute mirror hold?" | 1 since cycle 4 | 1 |
| "What does `undefined` mean?" | 1 since cycle 3 | 1 |

`notifyProps` speaks only to a live component and bumps the version once per
batch, which is exactly the `setProps` contract the router relies on; the
setter and the attribute callback now get the same two calls with a
one-element batch. The ingress relation (`el.p = x == setProps({p: x})`) and
the update relation are the proof that nothing moved: 0 rows before, 0 after.

## Not done, deliberately

- **`whenMounted`** (110 lines) stays a method. It is one readable unit.
- **The debug hook** (`debugPropSetHook`) is still called at the setter and
  `setProps` only, not inside `commitProp`. Moving it would make the attribute
  callback start reporting, which changes what `lib/debug.js` shows; not a
  pure move, so not this commit.
- **The options-object runtime** stays under the class surface, as agreed.

## Verified

| | |
|---|---|
| framework | 771/771, after each of the three moves |
| componentlib e2e | 18/18, after each |
| matrix | 3138 cells, 0 rows, baseline empty, 0 unexplained, after each |
| relations | 0 rows, after each |
| lint / computed | clean 198 files / 14/14 |
| `dist/` | regenerated, idempotent |
| mrepo-web / codemap | run once for the batch, see the verification note |

## Next

5. One value classifier for `instantiateSlot` (757 lines, two dispatchers).
   `tests/framework/slot-relations.test.js` carries the acceptance list: bare
   Node and nested `contain()` are asserted-divergent today and must flip.
6. The three-phase attribute table under the matrix's zero-cell-change bar.
