# Changelog

All notable changes to VDX are documented here. VDX is distributed by
vendoring — check the banner comment at the top of your `dist/*.js` bundles
(or `import { VERSION } from './vdx/lib/framework.js'`) to see which version
you have.

## 1.2.0 — 2026-09-23

A large correctness release. The headline feature is top-layer overlay
anchoring; the bulk of the work is the **attribute contract** — one stated rule
for what a template's literal text and its `${}` values mean on a native
element and on a component — arrived at by generating the cross product of that
space (3528 cells) instead of hand-writing assertions, and fixing everything it
disagreed with. Most entries below are cases that previously rendered silently
wrong DOM or delivered a silently wrong prop.

**Read [Upgrading](#upgrading) first** if you have an app on 1.1.0: a handful of
these fixes change behaviour that existing code may have been written around.

### Overlays escape clipping (top-layer anchoring)

- **New framework primitive: `createAnchoredOverlay`** (`lib/overlay.js`,
  imported directly like `createWindowing` / `createRowGestures`). Positions a
  floating panel against an anchor — a DOM element, anything with
  `getBoundingClientRect()`, or a `{ x, y }` point — and promotes it to the
  browser **top layer** via the native Popover API. That escapes ancestor
  `overflow` clipping, `transform`/`contain` containing blocks, and z-index
  stacking all at once, with **no DOM move** — so template diffing, refs,
  reactivity, and any enclosing focus trap (e.g. `cl-dialog`'s) keep working.
  Handles flip on all four sides, viewport clamp, `matchAnchorWidth`, max-height
  with internal scroll, and outside-pointerdown / Escape / scroll dismissal.
  Feature-degrades to plain `position: fixed` where the Popover API is absent.
- **Every popover-style `cl-*` component now uses it** — `cl-dropdown`,
  `cl-multiselect`, `cl-autocomplete`, `cl-calendar`, `cl-popover`, `cl-tooltip`,
  `cl-action-menu`, and `cl-context-menu`. Opening one inside a `cl-dialog` (or
  any `overflow:auto` / transformed ancestor) no longer clips the panel — the
  reported `cl-dropdown`-in-`cl-dialog` clipping bug. This retires the
  per-component backdrop divs, global Escape listeners, and the duplicated
  fixed-position/flip math in the two menu components.
- **No API changes.** Props, events, and documented public methods are
  unchanged. `cl-popover.show()`, `cl-tooltip.show()`, and
  `cl-context-menu.open()` are now `async` (they return a promise; the open
  state is still set synchronously, so callers observe no difference).
- **Dark mode fix**: overlay panels no longer render black text. Promoting a
  panel to a popover makes the UA `[popover]` rule force `color: CanvasText`,
  overriding the inherited theme color; panels now set `color: inherit`.

### The attribute contract

The rule, now stated in [docs/templates.md](docs/templates.md) and
[FRAMEWORK.md](FRAMEWORK.md): **literal template text is HTML and follows HTML
rules; an interpolated `${}` value is JavaScript and reaches the component with
its type intact.** The two attribute sinks (the compiler's static path and the
renderer's dynamic one) disagreed about this in a dozen ways, and neither
implemented the component half at all.

- **`${}` values reach a component's prop losslessly.** Numbers stay numbers,
  objects stay objects, functions stay functions. Roughly half of
  `HTMLElement`'s surface collides with ordinary prop names (`id`, `title`,
  `lang`, `dir`, `slot`, `translate`, `spellcheck`, `tabindex`…), and those props
  used to be routed through the inherited DOM property, where `'false'` became
  `true` and an object became `"[object Object]"`. Ownership — does this
  element's own class declare the name? — now decides, so a name a component
  declares goes to the prop and an inherited DOM name keeps native semantics.
- **The attribute is a devtools mirror, not the transport.** A string prop still
  shows up as an attribute; a non-string one no longer stringifies into the DOM
  (`title="${obj}"` used to produce that object's text as a real tooltip, and a
  function wrote its whole body into an attribute).
- **Registration timing no longer changes what a prop is.** A lazily
  `import()`ed component that registers after its call site rendered now
  receives the same values as one registered up front — previously it got the
  *string form* of everything (`${5}` → `"5"`, `${obj}` → `"[object Object]"`,
  `${false}` → the declared default). Values are held in a side channel and
  drained when the element upgrades. The template compiler no longer freezes
  "is this a component?" into its cache at compile time, which also fixes an
  `on-*` handler and an `on*`-named prop being refused on a not-yet-registered
  component, and `on-change` handing the handler `e.target.value` instead of
  `e.detail.value`.
- **Enumerated attributes speak their own vocabulary.** `spellcheck`,
  `draggable`, `contenteditable` and `translate` are not boolean attributes:
  removing one means *inherit*, and `spellcheck`/`translate` default to **on**.
  `spellcheck="${false}"` therefore used to turn spellcheck **on** — the exact
  inversion. They now write the word each attribute actually speaks (`translate`
  spells off as `"no"`), and nullish still removes the attribute, which is what
  "unspecified, inherit" means.
- **Boolean-attribute names on a component are just prop names.**
  `<cl-toggle checked="false">` used to arrive as boolean `true`, because a set
  of *native HTML* attribute names was being applied to custom elements. Strings
  now arrive as authored — read them with **`boolProp()`**, exported from
  `lib/framework.js` and `lib/utils.js`, which is also what the `cl-*` library
  now uses at 109 read sites across 31 components (including forwards into real
  `<button disabled=…>` attributes, the half that gets missed). Four different
  hand-rolled coercions are gone.
- **`undefined` means "not provided" on updates too**, resolving to the prop's
  declared default, so `${maybeMissing}` can no longer blow past the default the
  second time it evaluates. `null` stays an explicit `null`, and neither is ever
  stringified into the DOM (`id="${null}"` used to produce `id="null"`).
- **A valueless attribute parses to `""`, not to its own name.** `<div class>`
  rendered `class="class"`, and `<div contenteditable>` was not editable.
- **A host-applied name that a class also declares now reaches both.**
  `class`, `style`, `aria-*`, `data-*`, the global booleans (`hidden`,
  `itemscope`, `autofocus`, `inert`) and the enumerated names act on the host
  element whatever the tag — but if the component declares one as a prop, it now
  hears the value with its type intact as well. `el.hidden = true` on such a
  component hides it exactly as a template would.
- **`allowfullscreen`, `nomodule`, `playsinline` and `inert`** are recognised as
  boolean attributes. They took the plain-attribute path before, so a falsy
  `${}` *wrote* them — an `<iframe allowfullscreen="${0}">` was permitted
  fullscreen. `inert`'s absence also let a component declaring an `inert` prop
  shadow the native property so host inertness never activated.
- **Attribute names are matched case-insensitively.**
  `<div SPELLCHECK="${false}">` missed the enumerated branch entirely.
- **A native form control's nullish binding clears the live value**, not just
  the attribute — a control's `value` property does not track its attribute, so
  the old text stayed on screen and stayed reachable through `el.value`. Only a
  value this renderer actually set is cleared, so uncontrolled inputs and
  `x-model` on an unset key keep what the user typed.
- **`data-*` no longer stringifies an object** into the DOM and hands it to the
  component in place of the declared default.
- **SVG**: a hyphenated tag inside `<svg>` is an SVG element, not a component
  (it was losing its attributes and stranding its children); SVG has no boolean
  attributes, so those are presence-only there rather than expando properties.
- **`propsChanged` fires once per change.** `count="${'5'}"` → `${6}` fired
  twice — `('count', null, '5')` then `('count', 6, null)` — and the documented
  `propsChanged(prop, newValue)` pattern processed the `null`.
- **A kebab-spelled attribute for a camelCase prop updates.** It delivered on
  the first render and never again, so a stale object looked like it worked.

### Templates, slots and lists

- **`each()` no longer silently discards `when()` / `contain()` / `memoEach()`
  items.** A lazy directive kept its payload on a marker that `each()` flattened
  away, so the item vanished with no error. `when()` now resolves to its branch;
  `contain()`/`memoEach()` and non-template item values (string, number, array,
  `raw()`, function) throw a describing error, and the new **`t9-list-item`**
  lint catches them at the source line. `null`/`undefined`/`false` still skip.
- **A `when()` branch that returns an array is its items**, in a slot, as an
  array item, and in attribute position (where a function-form `when()` used to
  stringify to `"[when]"`). Arrays are now flattened *after* each item resolves,
  so the array-of-templates and marker refusals cannot be escaped one `when()`
  deep.
- **`contain()` renders array items in order.** `['A','B','C']` came out `CBA` —
  every item was inserted directly after the same placeholder.
- **`contain()` parses `raw()`** instead of stringifying the marker, for a
  contained single value and a contained array item alike.
- **`memoEach()` inside a `contain()` boundary renders** instead of printing
  `[memoEach]`; a `contain()`, `memoEach()` or array used as an *item* of a slot
  array is refused by name rather than rendering `[object Object]`.
- **A `contain()` boundary's DOM is disposed with the slot that owns it.**
  Hiding a `when()` branch containing a boundary that had replaced its content
  left orphaned nodes on the page, and re-showing the branch rendered a second
  copy beside them. (Pre-existing since 2025-12-26.)
- **Keyed list items track their DOM live.** An item whose root contains a slot
  can change node count later, so a move re-inserted detached nodes and stranded
  live ones. Also, an all-empty keyed list no longer trips the "created 0 nodes"
  sanity check, which was discarding all DOM reuse on every update.
- **Object-form `style` clears keys the new object omits**, and a preceding
  `cssText` string no longer leaks its declarations into the next object. A
  refused (dangerous) style value now clears rather than leaving the previous
  render's style on screen.
- **A function passed into a slot no longer freezes at first render.** It gets a
  stable-identity wrapper that dispatches to the latest closure, created lazily
  so a value that stops being a function still propagates. **Classes are handed
  over unwrapped** — the wrapper called through `.apply()`, which a constructor
  refuses, and it hid `.name`, `.prototype`, statics and `instanceof`.
- **A `DocumentFragment` returned into a slot or an array** is cleaned up
  correctly (it empties on insert and has neither `.after()` nor `.remove()`).
- **Dynamic SVG children render in the SVG namespace.** Static SVG already
  worked, but `raw('<circle …/>')` inside an `<svg>` parsed in the HTML
  namespace and inserted non-painting `HTMLUnknownElement`s, and a multi-root
  static `html\`\`` fragment interpolated into an `<svg>` skipped the
  namespace-correction guard, which only handled single-element roots.
  `each(items, item => html\`<circle …/>\`)` is the supported way to render
  data-driven SVG children.
- **A literal attribute is written the same way from both sinks.** A literal
  `<input value="x">` set the live *property* on the renderer's path and the
  *attribute* (the form's default) on the compiler's static path, so which one
  you got depended on an unrelated `${}` elsewhere in the template.
- **Deferred DOM writes are dropped if the effect that queued them was
  disposed**, so a custom element's property setter can no longer run against a
  torn-down binding.
- **A bare array in non-attribute markup is documented as an anti-pattern.** It
  is `String(array)` — comma-joined, with no keyed placeholders — so a stable
  array mutated in place and interpolated bare goes stale. Use `each()` for a
  list, `join()` for joined text. `each()`, `memoEach()`, arrays in attribute
  position, `props.children`, named slots and an inline `${[a, b]}` are all
  unaffected.

### Components and lifecycle

- **Light-DOM children are adopted live** instead of being serialised through
  `innerHTML` and re-parsed. A listener attached to a child survives, a nested
  component stays the same instance, and the comment anchors a parent's bindings
  need are kept — a slot written straight between a not-yet-registered
  component's tags used to go blank on the first update.
- **A `connectedCallback` on a detached element is not a connect.** Adopting an
  already-upgraded nested child rendered it once in limbo, building a ghost
  grandchild that never got `mounted()`/`unmounted()`, then again on the real
  connect.
- **`cl-code-editor`** binds its textarea's `spellcheck` to the prop instead of
  forcing it imperatively.
- **`cl-*` flags honour `="false"`.** `cl-code-block` declares `copyable: true`
  and read it with plain truthiness, so `copyable="false"` was showing a copy
  button on 15 tutorial pages — one of 18 live call sites the new type-aware
  lint found.

### Reactivity

- **`computed()` no longer strands its dependents after a getter throws.** A
  getter that threw and later healed left dependents holding the error forever:
  the lazy `get()` path never set `failed`, then never cleared it, then cleared
  it without waking anyone. Fixed across three rounds, and the flag machine is
  now enumerated cell by cell in `tests/node/computed-cells.mjs` (14 cells, in
  node, ~0.1s) so the next change to it is visible rather than silent.
- **`setEffectErrorHandler()` returns the previous handler**, so save/restore
  works.

### Router

- **A `:param*` wildcard following a named param no longer swaps values.**
  Patterns like `/u/:universe/tree/:path*/` collected param names in two passes
  (all wildcards, then all single segments), desyncing the name order from the
  regex capture-group order — `#/u/demo/tree/file.js/` bound
  `{ universe: 'file.js', path: 'demo' }`. Compilation now scans left-to-right
  in a single pass (`{ universe: 'demo', path: 'file.js' }`).
- `setProps()` — the path the router uses to hand route params to a component —
  resolves `undefined` to the declared default, the same as the property setter.

### Security

- **A literal inline handler is refused in fully static markup too.** A static
  `onclick="fn()"` in a subtree with no `${}` anywhere reached the DOM and ran,
  while the same text next to a dynamic binding was refused — the compiler's
  static path had no guard. Both sinks now share one refusal rule, and the
  **`t10-inline-events`** lint reports both forms at the source line.
- **A blocked URL renders as `about:blank`** rather than `''`. An empty `href`
  resolves to the current document, so a blocked link silently reloaded the page
  (and inside a frame, re-entered the frame's own document); an empty `src`
  re-requests the current page in some browsers. *Absent* bindings still produce
  `''` so the attribute is dropped. Tradeoff: a blocked `<img>`/`<audio>`/
  `<video>` src now also logs one `net::ERR_UNKNOWN_URL_SCHEME` in Chrome
  alongside the existing `[VDX Security]` warning.
- `sanitizeUrl()` no longer decodes HTML entities — sanitized URLs are set as
  attributes or properties and never re-parsed as HTML, so the decode was
  defending against a parser that is not in the path (and was incomplete anyway:
  `&#058;` and `&#x003a;` never matched its fixed list). Its documented scope is
  now explicit: it answers "can this URL execute code", not "where does this URL
  point" — it is not, and cannot be, an origin check.

### Tooling

- **Template lint gains six checks** — `t9-list-item`, `t10-inline-events`,
  `t11-attr-stringify`, `t12-manual-bind`, `t13-bool-false` (error) and
  `t14-bool-string` (warn) — for patterns the docs already banned but nothing
  enforced. `t13`/`t14` are **type-aware**: they read the component's declared
  prop default, so `flag: false` makes `flag="false"` an error while a prop
  declared `text: ''` is left alone. Static `.html` pages are exempt from `t14`;
  that case is exactly what `boolProp()` exists for.
- **A lint run that checked nothing now fails.** An existing directory with no
  lintable files printed "✓ No template binding issues found" and exited 0 —
  indistinguishable from a clean run over a thousand files. The runner reports
  the file count and exits 1 on zero.
- **The scanner reads code, not prose.** Both scanners misread `n++ / 2` as the
  start of a regex and blanked the rest of the line, silently suppressing
  `t3`/`t9`/`t12` — whether a violation was reported depended on where the line
  break fell. The regex-vs-division rule now lives once, in `tools/js-scan.js`,
  shared by the linter, the optimizer and `convert-to-class`.
- **The bundler refuses to ship a broken bundle.** It now runs `node --check` on
  what it is about to write (a duplicate top-level `const` across two `lib/core/`
  modules is a `SyntaxError` in `dist/` that no suite running `lib/` can see),
  verifies every relative import left in `dist/` resolves *inside* `dist/`, and
  masks comments before scanning imports — a JSDoc `@example` line naming a real
  sibling module was creating a dependency edge and could reorder the bundle.
- **New checks you can run:** `node tests/node/dist-check.mjs` (dist/ parses and
  is not stale — the framework runner runs it first), `node
  tests/node/computed-cells.mjs`, `node tools/scripts/test-bundler-scan.mjs`,
  and `cd tests/e2e && node run-attr-matrix.js` for the attribute-contract
  matrix. The in-browser test runner now takes its verdict from page state
  rather than console ordering, and reports a module that 404s or throws on
  import as a failure instead of a short run.
- Test counts at this point: 785 framework tests, 18 component E2E suites, 3528
  matrix cells with 0 disagreements, 202 files linted clean.

### Docs

- **The attribute contract** is written up in
  [docs/templates.md](docs/templates.md), with the two new guarantees
  (lossless props, registration-timing independence) linked from FRAMEWORK.md's
  "Passing Props".
- **A Banned Patterns section** in [docs/tutorial.md](docs/tutorial.md) names
  what each banned pattern does at runtime and which lint check catches it, with
  callouts in the interactive tutorial where each feature is introduced.
- `boolProp()` is documented as a footgun preventer in FRAMEWORK.md,
  [docs/api-reference.md](docs/api-reference.md) (with the full input table) and
  [docs/componentlib.md](docs/componentlib.md) (the rule for `cl-*` authors).
- `class`, `style`, `aria-*`, `data-*` and the global booleans are consumed by
  the host element before reaching props, so `${}` does not preserve their type
  there; ARIA in particular is defined in terms of literal strings.

### Upgrading

Everything here was previously wrong in a way that produced silently incorrect
DOM or a silently mistyped prop, so no correct code should need changing. The
cases worth checking:

1. **`<el boolattr="false">` written as literal text is ON.** Literal text is
   HTML, and presence wins. This was inconsistent before (a fully static
   element disagreed with one that had a dynamic sibling). Write
   `disabled="${false}"`, or omit the attribute — `t13-bool-false` flags every
   occurrence for you.
2. **A flag prop on a component arrives as the string you wrote.** If you read
   one with `props.x === true` or bare truthiness, switch to `boolProp(props.x)`.
   Bare truthiness makes the string `"false"` true.
3. **`spellcheck` / `draggable` / `contenteditable` / `translate` with `${}`
   now do what you wrote.** If you compensated for the old inversion (e.g. wrote
   `spellcheck="${true}"` to get it off), remove the workaround.
4. **A lazily registered component now receives real values.** Code that
   defensively parsed a stringified prop (`Number(props.count)`,
   `props.flag === 'true'`) will now see a number or a boolean. `boolProp()`
   handles both spellings; `Number()` on a number is a no-op.
5. **`undefined` on an update resolves to the declared default.** If you used
   `${undefined}` to mean "clear this prop", use `${null}`.
6. **`contain()` array order changed** from reversed to source order. Any layout
   that looked right because of the reversal will now be reversed.
7. **A static `onclick="…"` no longer runs.** It is refused with a console
   warning, like the interpolated form. Use `on-click`.
8. **`each()` items that are `contain()` / `memoEach()` / plain values now
   throw** instead of rendering nothing. Wrap them in a template:
   `html\`<li>${…}</li>\``.
9. If you vendor `dist/`, **regenerate it** (`node tools/bundler-esm.js`) —
   several fixes are in the compiler and the renderer.

## 1.1.0 — 2026-07-13

### Safeguards (fail fast on common footguns)

- **Lit/Vue attribute syntax now throws.** The template parser rejects binding
  sigils — `?attr`, `@event`, `.prop`, `:attr` — pointing at the VDX equivalent
  (`disabled="${cond}"`, `on-*`, plain attributes). Previously they became
  silent dead attributes.
- **DOM-method name collisions now throw.** `defineComponent` rejects a method
  or computed named after a structural/attribute/event DOM method (`remove`,
  `append`, `closest`, `getAttribute`, `addEventListener`, …) — these are bound
  onto the element and would shadow the native method, breaking rendering and
  teardown. Behavioral names (`focus`, `click`, `scrollIntoView`, …) are still
  allowed. A method whose name collides with a prop is rejected too.
- **A raw array / `.map()` of templates in a slot now throws** with an `each()`
  hint, instead of silently rendering unkeyed nodes that desync when the list
  changes.
- **Template lint T8** flags `.map()` / ternary returning `html\`\`` in a slot;
  T7 now also covers `:attr`.

### Fixes

- `cl-toast`: `remove()` → `dismiss()`. As `remove` it shadowed
  `Element.remove()`, so a toast placed inside `when()`/`each()` could fail to
  unmount.
- `cl-input-password`: strength-feedback list switched from `.map()` to `each()`
  (it would otherwise trip the new slot guard when feedback is shown).

### Tooling

- New `vdx-tools.zip` release asset — the bundler, the `opt()` optimizer +
  template linter, the dependency spider, and the generic PWA service worker.

## 1.0.0 — 2026-07-12

First stable release. Everything below is the v1 baseline.

### The framework

- **Zero dependencies, no build step** — ES6 modules served straight to the
  browser. Vendor `lib/` (readable source) or `dist/` (minified bundles with
  source maps); both are first-class.
- **Components are web components** — `class X extends Component` +
  `defineComponent('tag-name', X)`. Class fields, getters as cached computeds,
  auto-bound methods, `constructor(props)` running at first connect with real
  prop values. The options-object format remains supported for existing code.
- **Fine-grained reactivity** — Vue-3-style proxies with per-binding effects;
  no virtual DOM. Enumeration (`Object.keys`, `for..in`, spread) and `in`
  checks are tracked. Effects drop stale dependencies per run.
- **Compile-once templates** — `html\`\``, `when()`, `each()`/`memoEach()`,
  `contain()` reactive boundaries, `x-model` two-way binding, `on-*` events
  with `-prevent`/`-stop`/`-passive`/`-delegate` modifiers.
- **Router** — hash or HTML5 mode, nested routes, params/wildcards, redirects
  with param substitution, lazy loading, fail-closed `require` capability
  checks, and address-bar consistency (a cancelled navigation rolls the URL
  back).
- **Windowed lists and gestures** — `createWindowing`, `createRowGestures`,
  and the `cl-virtual-list` component for large lists.
- **UI library** — 63 `cl-*` components in `ui/` (forms, overlays, data
  tables, virtual lists, context menus), scoped styles, no shadow DOM.

### v1 additions

- `VERSION` export from `framework.js`; dist bundles carry a version banner.
- `nextRender()` / `this.nextRender()` — resolves after effects flush AND the
  DOM commit, including newly mounted branches and `mounted()` cascades.
- `whenMounted(selectorOrElement)` — resolves when a child exists, is defined,
  and has completed first render + `mounted()`; resolves `null` if the waiter
  unmounts.
- `createTask(fn)` / `this.createTask(fn)` — latest-wins async with
  AbortSignal supersession; reactive `pending`/`error`; component-bound tasks
  cancel on unmount and survive reconnects.
- `versionedList(array)` — structural reactivity for huge lists (one version
  cell, raw items) replacing the hand-rolled untracked-plus-counter pattern.
- `class Store` — class-authored stores: `super(); this.state = {...}`,
  promoted state fields, getters as cached computeds, auto-bound methods.
- `localStore` key prefix default is now `vdx` (was `swapi`). Deployments
  with existing persisted data must set `window.__VDX_LS_PREFIX` in a plain
  script before module load.

### Security posture (enforced, not opt-in)

- Context-aware escaping in templates; trusted HTML only via `raw()`.
- Trust markers are private Symbols — external data (JSON, postMessage) can
  never forge a template vnode.
- URL scheme allowlisting on `href`/`src`/`action`/`formaction`/`object data`/
  `xlink:href`; `javascript:`/`data:text/html` blocked.
- Dangerous sinks refused from templates: `innerHTML`/`srcdoc`/inline `on*`
  handlers; dangerous CSS constructs in style values; interpolation into
  `<script>`; `<script>` elements are dropped from templates entirely.
- Prototype-pollution filtering on stores, props, and `x-model` paths.

### Notable pre-release hardening (July 2026)

An adversarial review pass (five specialized reviewers: XSS, reactivity,
memory, lifecycle/router, windowing/gestures) plus two full core
read-throughs preceded this release; all findings fixed with regression
tests (635 framework tests, 15 component e2e suites at cut). Highlights: statics-anchored template identity
(cache eviction can no longer re-instantiate live components), per-connect
generation counters for every queued lifecycle continuation, raw-text parsing
for `script`/`style`/`textarea`/`title`, React-like `when()` semantics
(`0`/`''` render; `null`/`undefined`/`false` hide), single-pass list keying,
and router URL rollback on cancelled navigations.
