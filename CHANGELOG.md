# Changelog

All notable changes to VDX are documented here. VDX is distributed by
vendoring — check the banner comment at the top of your `dist/*.js` bundles
(or `import { VERSION } from './vdx/lib/framework.js'`) to see which version
you have.

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
