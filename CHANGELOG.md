# Changelog

All notable changes to VDX are documented here. VDX is distributed by
vendoring — check the banner comment at the top of your `dist/*.js` bundles
(or `import { VERSION } from './vdx/lib/framework.js'`) to see which version
you have.

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
