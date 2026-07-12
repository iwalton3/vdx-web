# API Reference

Complete API reference for the framework.

## Table of Contents

- [Component API](#component-api)
- [Template API](#template-api)
- [Reactivity API](#reactivity-api)
- [Store API](#store-api)
- [Router API](#router-api)
- [Utilities API](#utilities-api)

## Component API

### defineComponent(name, componentClass)

The default way to define a component: a class extending `Component` (see below), translated
into the internal options format at registration.

```javascript
import { defineComponent, Component, html } from './lib/framework.js';

export class MyCounter extends Component {
    static props = { title: 'Counter' };
    state = { count: 0 };
    increment() { this.state.count++; }
    template() { return html`<button on-click="increment">${this.state.count}</button>`; }
}
export default defineComponent('my-counter', MyCounter);
```

Registration is idempotent for the same class/options; a *different* definition under an
already-registered name logs a warning and keeps the first definition (the registered class is
returned either way).

### Component

Base class for class-authored components. Mapping to the options format:

| Class member | Equivalent option |
|--------------|-------------------|
| `static props = {...}` | `props` (merged parent-first across inheritance) |
| `static stores = {...}` | `stores` (merged) |
| `static styles = '...'` | `styles` (concatenated) |
| `constructor(props)` | `data()` - but runs at **first connect** with real prop values |
| `get x() {...}` | `computed: { x() {...} }` |
| class methods | `methods` (auto-bound) |
| `template/mounted/unmounted/afterRender/propsChanged/renderError` | same-named options |

Constraints: never declare props as class fields (shadowing - removed at mount with a warning);
getters must be pure derivations (dependency-free getters fall back to per-read evaluation);
the constructor runs once per element (not re-run on reconnect); `el instanceof MyClass` is
false (the element class is a framework internal); direct `new MyClass()` throws.

### defineComponent(name, options) - legacy format

The original object-based format; fully supported, and what classes are translated into
internally. Prefer the class format for new components.

Define a custom element component.

**Parameters:**
- `name` (string) - Component tag name (must include hyphen)
- `options` (object) - Component configuration

**Options:**
```javascript
{
    // Props (reactive attributes)
    props: {
        propName: defaultValue
    },

    // Reactive state
    data() {
        return { ... };
    },

    // Component methods
    methods: {
        methodName() { ... }
    },

    // Store auto-wiring: exposes store state as this.stores.name
    stores: {
        name: someStore
    },

    // Computed properties - lazy, cached, auto-disposed on unmount.
    // Read as plain properties: this.total (no call)
    computed: {
        total() { return this.state.items.reduce((s, i) => s + i.price, 0); }
    },

    // Template function
    template() {
        return html`...`;
    },

    // Lifecycle hooks
    mounted() { },       // Called after component added to DOM
    unmounted() { },     // Called before component removed
    afterRender() { },   // Called after each render (use sparingly)
    propsChanged(prop, newValue, oldValue) { },  // Called when a prop changes

    // Error boundary (optional)
    renderError(error) { // Called if template() throws
        return html`<div>Error</div>`;  // Return fallback UI
    },

    // Scoped styles
    styles: /*css*/`...`
}
```

**Example:**
```javascript
import { defineComponent, html } from './lib/framework.js';

export default defineComponent('my-component', {
    props: {
        title: 'Default Title'
    },

    data() {
        return {
            count: 0
        };
    },

    methods: {
        increment() {
            this.state.count++;
        }
    },

    template() {
        return html`
            <div>
                <h1>${this.props.title}</h1>
                <p>Count: ${this.state.count}</p>
                <button on-click="increment">+1</button>
            </div>
        `;
    },

    styles: /*css*/`
        div {
            padding: 20px;
        }
    `
});
```

### Component Instance Properties

#### this.props
Reactive props object (read-only from component perspective).

```javascript
console.log(this.props.title);
```

#### this.state
Reactive state object.

```javascript
this.state.count = 10;
```

#### this.refs
Object mapping `ref="name"` template attributes to DOM elements.

```javascript
template() { return html`<input ref="nameInput">`; }
focus() { this.refs.nameInput.focus(); }
```

#### this.stores
Direct references to the reactive state of stores declared via the `stores:` component option. Template reads like `this.stores.user.name` are tracked fine-grained.

```javascript
static stores = { user: userStore };
template() { return html`<p>${this.stores.user.name}</p>`; }
```

#### Computed properties (`get` accessors)
Each `get` accessor becomes a read-only computed instance property (read `this.total`, not `this.total()`). Values are lazy and cached: the getter re-runs only when a reactive dependency (state, stores, or props) changes and the property is read again. Reading one inside a template or effect subscribes it to updates. Disposed automatically on unmount.

```javascript
get total() { return this.state.items.reduce((s, i) => s + i.price, 0); }

template() {
    return html`<p>Total: ${this.total}</p>`;  // re-renders when items change
}
```

**Note:** Getters must be pure derivations of state/stores/props. Names that collide with props or methods are skipped with a warning. (In the legacy options format, the equivalent is the `computed: { total() {...} }` option, which uses plain functions rather than `get` accessors.)

#### this.emitChange(event, value, [propName])
Helper to emit change events for x-model compatibility. Stops propagation of the original event and dispatches a `change` CustomEvent with `detail: { value }`. `propName` defaults to `'value'`.

```javascript
handleInput(e) {
    this.emitChange(e, e.target.value);
}
```

#### this.nextRender()
Resolve after the next effect flush AND DOM commit complete, including newly mounted conditional branches. Delegates to the global [`nextRender()`](#nextrender) (rendering is globally batched - there is no per-component variant).

**Returns:** `Promise<void>`

```javascript
async startEdit() {
    this.state.editing = true;
    await this.nextRender();   // DOM committed, new branches mounted
    this.querySelector('input').focus();
}
```

#### this.whenMounted(selectorOrElement)
Resolve when a matched child exists in this component's subtree, its custom element is defined (covers lazy `import()`ed definitions), and its first render + `mounted()` have completed. Never rejects: resolves `null` if THIS component unmounts while waiting. Never resolves a detached element - if the awaited element unmounts mid-wait, the wait continues until it re-mounts. A defined non-VDX custom element (no VDX lifecycle) resolves after one render lap - "defined + present" is the strongest guarantee it can offer.

**Parameters:**
- `selectorOrElement` (string | Element) - CSS selector queried within this component's subtree, or a specific element to wait on

**Returns:** `Promise<Element|null>`

```javascript
const list = await this.whenMounted('cl-virtual-list');
if (!list) return;   // waiter unmounted
list.scrollToIndex(0);
```

#### this.createTask(fn)
Create a latest-wins async task bound to this component's lifetime - in-flight runs are auto-cancelled at unmount, and the task stays usable across DOM moves (reconnection). See [`createTask()`](#createtaskfn) for full semantics.

**Parameters:**
- `fn` (function) - `(signal, ...args) => Promise` task body; `signal` aborts when the run is superseded

**Returns:** Task object `{ run, cancel, pending, error, dispose }`

```javascript
search = this.createTask(async (signal, query) => {
    const r = await fetch('/api/search?q=' + encodeURIComponent(query), { signal });
    this.state.hits = (await r.json()).hits;   // reached only if still current
});
```

## Template API

### html`` tagged template

Creates XSS-safe templates with automatic escaping.

```javascript
html`<div>${userInput}</div>`
```

**Features:**
- Auto-escapes HTML content
- Sanitizes URLs in href/src attributes
- Compiles template once, applies values on re-render
- Returns compiled template structure for efficient rendering

### when(condition, thenTemplate, elseTemplate)

Conditional rendering helper.

**Parameters:**
- `condition` (boolean) - Condition to evaluate
- `thenTemplate` (template/function) - Template or function returning template to render if true
- `elseTemplate` (template/function) - Template or function returning template to render if false (optional)

**Example:**
```javascript
${when(this.state.isLoggedIn,
    html`<p>Welcome!</p>`,
    html`<p>Please log in</p>`
)}

${when(this.state.isLoggedIn,
    () => html`<p>Welcome!</p>`,
    () => html`<p>Please log in</p>`
)}
```

### each(array, mapFn)

List rendering helper.

**Parameters:**
- `array` (Array) - Array to iterate over
- `mapFn` (function) - Function that returns template for each item

**Example:**
```javascript
${each(this.state.items, item => html`
    <li>${item.name}</li>
`)}

// With index
${each(this.state.items, (item, index) => html`
    <li>${index + 1}. ${item.name}</li>
`)}

// With key function (for reorderable lists)
${each(this.state.items, item => html`
    <li>${item.name}</li>
`, item => item.id)}
```

### memoEach(array, mapFn, keyFn, [options])

Memoized list rendering - caches rendered templates per item key.

**Parameters:**
- `array` (Array) - Array to iterate over
- `mapFn` (function) - Function that returns template for each item
- `keyFn` (function) - **Required** - Function to extract unique key from item
- `options` (object, optional) - `{ cache, trustKey, deps }`. A bare `Map` is also accepted as an explicit cache for backward compatibility.
  - `cache` (Map) - Explicit cache (only needed when same array rendered with different templates)
  - `trustKey` (boolean) - Compare by key alone instead of item reference (virtual scroll)
  - `deps` (Array) - External dependencies; all item caches are busted when any value changes

**Example:**
```javascript
${memoEach(this.state.songs, song => html`
    <div class="song">${song.title}</div>
`, song => song.uuid)}
```

**Caching behavior:**
- The cache lives at the slot level (the DOM location of the `${memoEach(...)}` expression) - safe to use conditionally
- Each slot automatically gets its own cache; stale entries are pruned as items leave the array
- Only need explicit `cache` param when rendering the same array differently in multiple places

**When to use:** Virtual scroll, large lists (100+ items), expensive item templates.

### contain(renderFn)

Creates an isolated reactive boundary. State accessed inside the boundary only triggers re-renders inside the boundary, not the parent template.

**Parameters:**
- `renderFn` (function) - Function that returns an html template

**Returns:** Template result that renders in its own reactive context

**Example:**
```javascript
import { html, contain, memoEach } from './lib/framework.js';

template() {
    return html`
        <div class="player">
            <!-- Queue list only re-renders when queue changes -->
            ${memoEach(this.state.queue, song => html`
                <div class="song">${song.title}</div>
            `, song => song.uuid)}

            <!-- High-frequency updates isolated from siblings -->
            ${contain(() => html`
                <div class="time">${this.stores.player.currentTime}</div>
            `)}
        </div>
    `;
}
```

**When to use:**
- High-frequency updates (timers, progress bars, currentTime)
- Small UI sections that update independently from siblings
- Avoiding expensive sibling re-renders

**Note:** Use sparingly - adds overhead. Prefer when the isolation benefit outweighs the cost (e.g., preventing large list re-renders).

### raw(htmlString)

Renders trusted HTML without escaping.

**⚠️ Use only for trusted, server-generated content!**

```javascript
${raw(this.state.trustedHtmlFromBackend)}
```

### awaitThen(promiseOrValue, thenFn, pendingContent, catchFn)

Renders async content with loading and error states. Handles both Promises and immediate values.

**Parameters:**
- `promiseOrValue` - Promise to await, OR an immediate value (non-promise)
- `thenFn` (function) - Render function when resolved: `(data) => html\`...\``
- `pendingContent` - Content to show while loading
- `catchFn` (function, optional) - Render function for errors: `(error) => html\`...\``

**Returns:** html template containing async rendering component

**Example with Promise:**
```javascript
state = { userPromise: null };

mounted() {
    this.state.userPromise = fetchUser(123);
}

template() {
    return html`
        ${awaitThen(
            this.state.userPromise,
            user => html`<div>${user.name}</div>`,
            html`<loading-spinner></loading-spinner>`,
            error => html`<div class="error">${error.message}</div>`
        )}
    `;
}
```

**Important: Immediate values are handled as already-resolved:**
```javascript
// Non-promise values skip the loading state entirely
${awaitThen(
    { name: 'Alice' },  // Not a promise - treated as immediate
    user => html`<div>${user.name}</div>`,
    html`<loading-spinner></loading-spinner>`  // Never shown
)}

// null/undefined are also treated as immediate values
${awaitThen(
    this.state.optionalData,  // May be null
    data => html`<div>${data?.name || 'No data'}</div>`,
    html`<loading-spinner></loading-spinner>`
)}
```

This behavior allows `awaitThen` to handle both async and sync data sources uniformly.

### lazy(importFn)

Lazy load a component module. Returns a cached promise that resolves when the component is registered. Works seamlessly with `awaitThen()` for loading states.

**Import:** `import { lazy } from './lib/utils.js';`

**Parameters:**
- `importFn` (function) - Dynamic import function, e.g., `() => import('./my-component.js')`

**Returns:** `Promise<true>` - Promise that resolves to `true` when component is ready

**Example - Basic usage:**
```javascript
import { awaitThen, Component, html } from './lib/framework.js';
import { lazy } from './lib/utils.js';

// Define lazy component at module level (cached)
const LazyChart = lazy(() => import('./chart-component.js'));

class Dashboard extends Component {
    template() {
        return html`
            <h1>Dashboard</h1>
            ${awaitThen(LazyChart,
                () => html`<chart-component data="${this.state.chartData}"></chart-component>`,
                html`<cl-spinner></cl-spinner>`
            )}
        `;
    }
}
defineComponent('dashboard', Dashboard);
```

**Example - Multiple lazy components:**
```javascript
const LazyEditor = lazy(() => import('./editor.js'));
const LazyPreview = lazy(() => import('./preview.js'));

// Load both, show when ready
const BothLoaded = Promise.all([LazyEditor, LazyPreview]);

template() {
    return html`
        ${awaitThen(BothLoaded,
            () => html`
                <code-editor></code-editor>
                <preview-panel></preview-panel>
            `,
            html`<p>Loading editor...</p>`
        )}
    `;
}
```

**Example - Conditional lazy loading:**
```javascript
state = { showAdvanced: false };

template() {
    return html`
        <button on-click="${() => this.state.showAdvanced = true}">
            Show Advanced Options
        </button>
        ${when(this.state.showAdvanced,
            () => awaitThen(
                lazy(() => import('./advanced-panel.js')),
                () => html`<advanced-panel></advanced-panel>`,
                html`<cl-spinner size="small"></cl-spinner>`
            )
        )}
    `;
}
```

**Note:** The promise is cached by import function reference, so defining `lazy()` at module level is recommended for optimal caching.

### preloadLazy(importFn)

Preload a lazy component without rendering it. Useful for preloading components the user is likely to need (e.g., on hover).

**Import:** `import { preloadLazy } from './lib/utils.js';`

**Parameters:**
- `importFn` (function) - Dynamic import function

**Returns:** `Promise<true>` - Promise that resolves when loaded

**Example:**
```javascript
import { preloadLazy } from './lib/utils.js';

// Preload on hover for instant display when clicked
template() {
    return html`
        <button
            on-mouseenter="${() => preloadLazy(() => import('./heavy-dialog.js'))}"
            on-click="${() => this.state.showDialog = true}">
            Open Dialog
        </button>
    `;
}
```

### clearLazyCache()

Clears the lazy loading cache. Rarely needed - mainly for testing or memory optimization.

**Import:** `import { clearLazyCache } from './lib/utils.js';`

**Parameters:** None

**Returns:** `void`

### pruneTemplateCache()

Conditionally prunes the template compilation cache: least-recently-used entries are evicted only once the cache has grown past half its cap (500 entries). Usually a no-op; the router calls it on navigation. Eviction is harmless - a live component whose template is evicted recompiles to an identical tree and keeps its DOM (statics-anchored identity).

**Parameters:** None

**Returns:** `void`

### clearTemplateCache()

Unconditionally clears the whole template compilation cache. Use in tests that need a clean slate; applications never need it.

**Parameters:** None

**Returns:** `void`

```javascript
import { clearTemplateCache } from './lib/framework.js';
clearTemplateCache();
```

### isHtml(v) / isRaw(v) / isContain(v) / isMemoEach(v) / isWhen(v)

Type predicates for framework template values (vnodes), for authors of custom template helpers. Each returns `true` only for values built by the corresponding framework function (the `html` tagged template, `raw()`, `contain()`, `memoEach()`, function-form `when()`) - the underlying trust markers are unforgeable Symbols, so data from JSON can never pass these checks.

```javascript
import { isHtml } from './lib/framework.js';

function myHelper(value) {
    return isHtml(value) ? value : html`<span>${value}</span>`;
}
```

## Reactivity API

### reactive(obj)

Creates a reactive proxy from an object.

**Parameters:**
- `obj` (object) - Object to make reactive

**Returns:** Reactive proxy

**Example:**
```javascript
import { reactive } from './lib/framework.js';

const state = reactive({ count: 0 });
state.count++; // Triggers reactivity
```

### createEffect(fn, options?)

Runs a function when its reactive dependencies change. Supports cleanup callbacks and error handling.

**Parameters:**
- `fn` (function) - Function to run. May return a cleanup function.
- `options` (object, optional) - Configuration options
  - `onError` (function) - Per-effect error handler `(error, context) => void`

**Returns:** Object with:
- `effect` (function) - The effect function
- `dispose` (function) - Cleanup function to stop tracking

**Example:**
```javascript
import { createEffect, reactive } from './lib/framework.js';

const state = reactive({ count: 0 });

// Basic usage
const { dispose } = createEffect(() => {
    console.log('Count:', state.count);
});

state.count++; // Logs: Count: 1
dispose();     // Stop tracking

// With cleanup callback
const { dispose: disposeTimer } = createEffect(() => {
    const timer = setInterval(() => console.log('tick'), 1000);
    // Return cleanup function - called on re-run or dispose
    return () => clearInterval(timer);
});

// With error handling
createEffect(() => {
    riskyOperation();
}, {
    onError: (error, context) => {
        console.warn(`Effect ${context} failed:`, error);
    }
});
```

### createRoot(fn)

Creates a scope for effects. All effects created inside the callback become children of the root and are disposed together.

**Parameters:**
- `fn` (function) - Function to run within the scope

**Returns:** Dispose function that disposes all child effects

**Example:**
```javascript
import { createRoot, createEffect, reactive } from './lib/framework.js';

const state = reactive({ count: 0 });

const disposeAll = createRoot(() => {
    createEffect(() => console.log('Effect 1:', state.count));
    createEffect(() => console.log('Effect 2:', state.count * 2));
});

state.count = 5;  // Both effects run

disposeAll();     // Both effects disposed
```

### setEffectErrorHandler(handler)

Sets a global error handler for all effects.

**Parameters:**
- `handler` (function) - Error handler `(error, context) => void`
  - `error` - The error that occurred
  - `context` - Either `'effect'` or `'cleanup'`

**Example:**
```javascript
import { setEffectErrorHandler } from './lib/framework.js';

setEffectErrorHandler((error, context) => {
    console.error(`Effect ${context} failed:`, error);
    errorReportingService.report(error);
});
```

### computed(fn)

Creates a reactive computed value that automatically tracks dependencies.

**Parameters:**
- `fn` (function) - Function that computes value by accessing reactive state

**Returns:** Object with `get()` method to retrieve current value and `dispose()` to stop tracking

**Example:**
```javascript
import { computed, reactive } from './lib/framework.js';

const state = reactive({ a: 1, b: 2 });

// Create a computed value - dependencies are auto-tracked
const sum = computed(() => state.a + state.b);

console.log(sum.get()); // 3

state.a = 5;
console.log(sum.get()); // 7 (automatically recomputed)

// Clean up when done
sum.dispose();
```

**Note:** For argument-based memoization (caching based on function arguments), use `memoize()` from `utils.js` instead.

### watch(fn, callback)

Watches reactive dependencies and calls callback when they change.

**Parameters:**
- `fn` (function) - Function that accesses reactive values
- `callback` (function) - Callback with (newValue, oldValue)

**Example:**
```javascript
import { watch } from './lib/framework.js';

const state = reactive({ count: 0 });

watch(
    () => state.count,
    (newValue, oldValue) => {
        console.log(`Count changed from ${oldValue} to ${newValue}`);
    }
);
```

### isReactive(value)

Checks if a value is reactive.

**Parameters:**
- `value` (any) - Value to check

**Returns:** boolean

**Example:**
```javascript
import { isReactive } from './lib/framework.js';

const state = reactive({ count: 0 });
console.log(isReactive(state)); // true
console.log(isReactive({})); // false
```

### memo(fn, deps)

Memoizes a function result, recomputing only when its dependencies change.

**Parameters:**
- `fn` (function) - Function to memoize
- `deps` (Array | function) - Dependencies. **Prefer the function form** `() => [...]`: it is re-evaluated on every call, so it always sees current values. A plain array is snapshotted once at `memo()` time and never re-read, so it will not detect later changes.

**Example:**
```javascript
import { memo } from './lib/framework.js';

// ✅ Function form - deps are re-read each call
const render = memo(
    () => html`<ul>${each(this.state.items, ...)}</ul>`,
    () => [this.state.items]
);
```

### untracked(value)

Wraps a value to opt out of deep reactivity tracking. Use for large arrays/objects where you only need to track when the whole value is replaced.

**Parameters:**
- `value` (any) - Initial value to mark as untracked

**Returns:** The value (unchanged)

**Example:**
```javascript
import { defineComponent, Component, untracked } from './lib/framework.js';

class SongList extends Component {
    state = {
        // Large array - only track replacement, not individual items
        songs: untracked([]),
        // Normal reactive values
        currentIndex: 0
    };

    loadSongs(newSongs) {
        // Reassign to trigger update (auto-applies untracked)
        this.state.songs = newSongs;
    }
}
defineComponent('song-list', SongList);
```

**When to use:** Arrays with 100+ items, deeply nested objects, API response data.

### versionedList(initialArray)

Creates a versioned list: a thin reactive proxy over a raw array. Structural edits - mutating methods (`push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`, `copyWithin`), index/length writes, and `delete` - bump a single reactive version; reads of `length`, numeric indices, and iteration subscribe to it. Items are returned **raw** (no per-item proxying - the same performance contract as `untracked()`), so in-place item-field edits are NOT tracked.

**Parameters:**
- `initialArray` (Array, optional) - The backing array (used directly, not copied; defaults to `[]`)

**Returns:** A proxy that behaves like the array, plus:
- `touch()` - Manually bump the version (for in-place item-field edits)
- `replace(next)` - Replace all contents in one operation with a single bump (safe at 100k+ items, where spreading `push(...next)` would overflow the call stack)
- `version` (number, read-only) - Reactive version integer; reading it subscribes to structural changes

**Example:**
```javascript
import { defineComponent, Component, versionedList } from './lib/framework.js';

class SongList extends Component {
    state = { songs: versionedList([]) };

    add(track) {
        this.state.songs.push(track);       // structural edit -> auto version bump
    }

    rename(i, title) {
        this.state.songs[i].title = title;  // item fields NOT tracked
        this.state.songs.touch();           // manual bump
    }

    load(next) {
        this.state.songs.replace(next);     // wholesale swap, single bump
    }
}
defineComponent('song-list', SongList);
```

**When to use:** Large lists mutated in place (push/splice/drag-reorder). Replaces the hand-rolled untracked-array-plus-version-counter pattern; `createWindowing`'s `count: () => list.length` becomes a reactive read (no manual `refresh()`). See [performance.md](performance.md#choosing-a-memoeach-invalidation-strategy) for `memoEach` keying (`item.id + ':' + list.version`).

### flushSync(fn)

Execute a function and immediately flush any pending renders. Use when you need synchronous DOM updates after state changes.

**Parameters:**
- `fn` (function) - Function to execute (typically contains state updates)

**Returns:** Return value of the function

**Example:**
```javascript
import { defineComponent, Component, html, flushSync } from './lib/framework.js';

class MyForm extends Component {
    state = { showInput: false };

    showAndFocus() {
        flushSync(() => {
            this.state.showInput = true;
        });
        // DOM is now updated, safe to focus
        this.refs.input.focus();
    }

    addAndScroll() {
        flushSync(() => {
            this.state.items.push(newItem);
        });
        // Scroll to bottom
        this.refs.list.scrollTop = this.refs.list.scrollHeight;
    }
}
defineComponent('my-form', MyForm);
```

**When to use:** Genuinely synchronous needs - rAF-driven code that must commit in the current frame (virtual-scroll range commits), measure-after-write, tests.

**Note:** Use sparingly - bypasses automatic batching and can hurt performance if overused. `flushSync()` does **NOT** mount new conditional branches - a node shown by `when()` this tick can still be missing afterwards. Use `await nextRender()` for that (see below).

### nextRender()

Returns a promise that resolves after the next effect flush AND DOM commit complete - **including newly mounted conditional branches**. If no flush is pending, one is scheduled, so `mutate; await nextRender()` always works. This is the recommended default for "update state, then touch the resulting DOM"; `flushSync()` covers the genuinely synchronous cases.

**Parameters:** None

**Returns:** `Promise<void>`

**Example:**
```javascript
import { defineComponent, Component, html, when, nextRender } from './lib/framework.js';

class MyForm extends Component {
    state = { showInput: false };

    async showAndFocus() {
        this.state.showInput = true;
        await nextRender();               // DOM committed, new branches mounted
        this.querySelector('input').focus();
    }

    template() {
        return html`
            <button on-click="showAndFocus">Show</button>
            ${when(this.state.showInput, html`<input type="text">`)}
        `;
    }
}
defineComponent('my-form', MyForm);
```

**Note:** Also available as `this.nextRender()` on components (delegates to this global - rendering is globally batched).

### flushRenders()

Flush any pending renders synchronously. Primarily for testing.

**Example:**
```javascript
import { flushRenders } from './lib/framework.js';

// In a test:
component.state.count = 5;
flushRenders();  // Force render to happen now
expect(component.textContent).toBe('5');
```

**Note:** In normal application code, use `await nextRender()` (or `flushSync()` for synchronous needs) instead.

### createMemoCache()

Creates a memoization cache for use with `memoEach()`.

**Returns:** Map for caching

**Note:** Usually not needed - `memoEach()` automatically manages caches when used inside component templates.

### createTask(fn)

Creates a latest-wins async task - the imperative replacement-flow primitive (search-as-you-type, re-fetch on navigation). **A task carries status, never data**: there is no `value` property; the body commits results to real state (component state / a store). `run()` aborts the previous in-flight run via the `AbortSignal` passed to `fn` - abort throws through abort-aware awaits (e.g. `fetch(url, { signal })` rejects with `AbortError`), so a superseded body never reaches its commit lines. After a non-abort-aware await, call `signal.throwIfAborted()`.

**Parameters:**
- `fn` (function) - Task body `(signal, ...args) => Promise<T> | T`; `signal` aborts when the run is superseded

**Returns:** Task object:
- `run(...args)` - Abort the previous run and start a new one. **Never rejects**: resolves the body's return value when the run completed and is still current, `undefined` when superseded, aborted, or failed
- `cancel()` - Abort the in-flight run (clears `pending`)
- `pending` (boolean, reactive) - `true` while the latest run is in flight
- `error` (reactive) - The latest current run's failure, cleared when a new run starts; `AbortError` never lands here (it is the supersession mechanism, not a failure)
- `dispose()` - Cancel and permanently deactivate the task

**Example:**
```javascript
import { createTask } from './lib/framework.js';

const search = createTask(async (signal, query) => {
    const r = await fetch('/api/search?q=' + encodeURIComponent(query), { signal });
    searchStore.state.hits = (await r.json()).hits;   // reached only if still current
});

search.run('hello');   // supersedes any in-flight run
```

**Notes:**
- On components, prefer `this.createTask(fn)` - it auto-cancels at unmount and survives reconnection. The standalone export (for stores/tests) needs a manual `dispose()`
- **Not for appends**: if aborting the previous run would lose data (overlapping `loadMore()` pages), it's not a createTask - use a busy-guard plus re-check instead. See [components.md](components.md#async-tasks-createtask)
- For declarative async rendering, use [`awaitThen()`](#awaitthenpromiseorvalue-thenfn-pendingcontent-catchfn)

### Other reactivity exports

Documented in detail in [reactivity.md](reactivity.md):

- `flushEffects()` - Run all pending reactive effects synchronously (lower-level than `flushSync()`, does not commit batched DOM updates)
- `withoutTracking(fn)` - Run `fn` without registering dependencies on the current effect
- `reactiveSet(initial)` / `reactiveMap(initial)` - Explicit reactive Set/Map wrappers (plain `Set`/`Map` in reactive state are auto-wrapped); support batch `addAll`/`setAll`/`deleteAll`
- `isReactiveCollection(value)` - Check for a reactive Set/Map wrapper
- `isUntracked(obj)` - Check whether an object was marked with `untracked()`
- `trackMutations(obj)` - O(1) dependency on "anything in this object changed" (mutation counter)
- `trackAllDependencies(obj)` - Recursively access all properties to register dependencies (prefer `trackMutations()` for large objects)

## Store API

### Store (class)

Base class for class-authored stores - the primary store authoring form. Seed reactive state in the constructor, exactly like a component; methods live on the instance, getters become cached computeds, and ordinary fields stay non-reactive.

**Example:**
```javascript
import { Store } from './lib/framework.js';

class CartStore extends Store {
    constructor() {
        super();
        this.state = { items: [], coupon: null };   // reactive
    }

    _audio = new AudioController(this);   // plain field: NOT reactive

    add(item) { this.state.items.push(item); }

    get total() {                          // getter -> cached computed
        return this.state.items.reduce((s, i) => s + i.price, 0);
    }
}
export const cartStore = new CartStore();
```

**Behavior:**
- **State promotion** - the first `this.state = {...}` assignment wraps the object reactively and promotes each top-level key onto the instance as a forwarding accessor (`store.items` reads/writes `store.state.items`), so `this.stores.cart.items` template syntax is unchanged while methods and computed getters hang off the same object. Keys added later are reactive but not promoted (reach them via `store.state.x`) - declare top-level keys up front. Subsequent `this.state = {...}` assignments merge into the existing reactive state (like `set()`)
- **Getters are cached computeds** - lazy, synchronously invalidated, never stale. A getter with no reactive dependency is re-evaluated per read instead of cached; a paired setter is ignored with a warning
- **Methods are auto-bound** to the instance
- **Collisions throw at construction** - a state key that would shadow a method, getter, or reserved name (`state`, `subscribe`, `set`, `update`, `dispose`) throws immediately
- **⚠️ `state = {...}` as a CLASS FIELD throws at first use** - class fields use `[[Define]]` semantics and bypass the reactive setter. Assign in the constructor: `constructor() { super(); this.state = {...}; }`
- Instances carry the `Symbol.for('vdx.store')` brand (survives across bundle copies, unlike `instanceof`)

**Instance methods:** `subscribe(fn)` (fine-grained; returns unsubscribe), `set(newState)`, `update(fn)`, `dispose()` (disposes computed getters - rarely needed, stores are usually singletons). See [reactivity.md](reactivity.md#class-stores-store).

### createStore(initialState)

The older factory form (coexists with class stores; methods defined in the initial state live on `.state` and are called as `store.state.method()`). Creates a reactive store with pub/sub pattern.

**Parameters:**
- `initialState` (object) - Initial state

**Returns:** Store object

**Example:**
```javascript
import { createStore } from './lib/framework.js';

const counterStore = createStore({
    count: 0
});

// Subscribe to changes
const unsubscribe = counterStore.subscribe(state => {
    console.log('State:', state);
});

// Update state
counterStore.set({ count: 5 });
counterStore.update(s => ({ ...s, count: s.count + 1 }));

// Cleanup
unsubscribe();
```

### Store Methods

#### store.subscribe(callback)

Subscribe to store changes. The callback runs once immediately at subscription time (with the current state), then again whenever tracked state changes.

**Parameters:**
- `callback` (function) - Called with current state immediately, then on changes

**Returns:** Unsubscribe function

```javascript
const unsubscribe = store.subscribe(state => {
    console.log('State changed:', state);
});

// Later
unsubscribe();
```

#### store.set(newState)

Merge new values into state (keys not in `newState` are kept; dangerous keys are filtered).

**Parameters:**
- `newState` (object) - Values to merge into state

```javascript
store.set({ count: 10 });
```

#### store.update(fn)

Update state via function.

**Parameters:**
- `fn` (function) - Function that takes current state and returns new state

```javascript
store.update(state => ({
    ...state,
    count: state.count + 1
}));
```

#### store.state

Access store state. Methods on **factory stores** (`createStore`) live on `.state` and should be called there (class store methods live on the instance instead):

```javascript
// ✅ CORRECT (factory store)
await login.state.logoff();

// ❌ WRONG (factory store)
await login.logoff();
```

### localStore(key, initialState)

Creates a store that persists to localStorage under the key `vdx_<name>`.

**Parameters:**
- `key` (string) - store name (persisted as `vdx_<name>`)
- `initialState` (object) - Initial state if not in localStorage

**Returns:** Store object

**Example:**
```javascript
import { localStore } from './lib/utils.js';

const prefs = localStore('user-prefs', { theme: 'light' });

prefs.state.theme = 'dark'; // Automatically saves to localStorage
```

**Key prefix.** Apps sharing an origin should claim their own prefix so their stores can't collide. Two hooks:
- `setLocalStorePrefix('myapp')` at startup, **before creating your stores**
- `window.__VDX_LS_PREFIX = 'myapp'` in a plain `<script>` **before any module loads** - the only way to affect stores created at module load (like the exported `darkTheme` store)

## Router API

### enableRouting(outlet, routes, options)

Enables routing. The first call creates the singleton router; subsequent calls warn and merge (new routes fold into the existing table with same-path definitions replaced, options are applied, the outlet is reattached). Use `getRouter().destroy()` first for a fresh router.

**Parameters:**
- `outlet` (HTMLElement) - Router outlet element
- `routes` (object) - Route configuration
- `options` (object, optional):
  - `checkCapability(required, { path, query, params, route })` - Called for routes with a `require` field; return `true` (or a promise resolving to `true`) to allow navigation. Routes with `require` are **denied if no checkCapability is configured** (fail closed).
  - `onUnauthorized({ path, query, params, require, route })` - Called when a `require` check fails. Defaults to rendering the `/404` route.

**Example:**
```javascript
import { enableRouting } from './lib/router.js';

const outlet = document.getElementsByTagName('router-outlet')[0];
const router = enableRouting(outlet, {
    '/': {
        component: 'home-page',
        load: () => import('./home.js')  // Lazy loading
    },
    '/admin/': {
        component: 'admin-page',
        require: 'admin',  // Enforced via checkCapability (fails closed)
        load: () => import('./admin.js')
    }
}, {
    checkCapability: (required) => auth.state.capabilities.includes(required)
});
```

### getRouter()

Returns current router set by enableRouting().

### router.navigate(path, query)

Navigate to a route programmatically.

**Parameters:**
- `path` (string) - Route path
- `query` (object) - Query parameters (optional)

**Example:**
```javascript
router.navigate('/users/123/');
router.navigate('/search/', { q: 'test', page: '2' });
```

### router.setOutlet(element)

Set the router outlet element.

**Parameters:**
- `element` (HTMLElement) - Router outlet element

```javascript
router.setOutlet(document.querySelector('router-outlet'));
```

A routed component may adopt its own `<router-outlet>` in `mounted()` (the layout pattern). The router never renders a component into an outlet that sits inside an element of that same component - the inner outlet serves the *other* (child) routes - and never renders into a detached outlet.

### router.replace(path, query)

Like `navigate()`, but replaces the current history entry instead of adding one.

```javascript
router.replace('/login/');
```

### router.back() / router.forward()

Navigate the browser history (wrappers around `window.history`).

### router.beforeEach(fn)

Register a guard that runs before each navigation. The hook receives `{ path, query, params, route }` and can return `false` (or a promise resolving to `false`) to cancel navigation.

```javascript
router.beforeEach(({ route }) => {
    if (route.require && !hasCapability(route.require)) {
        router.navigate('/unauthorized/');
        return false;
    }
});
```

### router.afterEach(fn)

Register a hook that runs after each navigation with the same `{ path, query, params, route }` context. Useful for analytics or logging.

### router.url(path, query)

Generate an href for a route, respecting the routing mode (returns `#/path` in hash mode, `base + /path` in HTML5 mode).

### router.currentRoute

Reactive store holding `{ path, query, params, component, meta }` for the current route. Subscribe or read `router.currentRoute.state` directly.

### router.destroy()

Remove the router's window event listeners and clear hooks (for tests or multi-router setups).

## Utilities API

### notify(message, severity, ttl)

Show toast notification.

**Parameters:**
- `message` (string) - Notification message
- `severity` (string) - One of: 'info', 'success', 'warning', 'error'
- `ttl` (number) - Time to live in seconds (default: 5)

**Example:**
```javascript
import { notify } from './lib/utils.js';

notify('Saved!', 'success', 3);
notify('Error occurred', 'error', 5);
```

### notifications

Reactive store of current notifications.

```javascript
import { notifications } from './lib/utils.js';

notifications.subscribe(notifs => {
    console.log('Notifications:', notifs);
});
```

### darkTheme

Reactive store for dark theme.

```javascript
import { darkTheme } from './lib/utils.js';

// Toggle dark mode
darkTheme.update(s => ({ enabled: !s.enabled }));

// Check current state
console.log(darkTheme.state.enabled);
```

### sleep(ms)

Async sleep helper.

**Parameters:**
- `ms` (number) - Milliseconds to sleep

**Returns:** Promise

**Example:**
```javascript
import { sleep } from './lib/utils.js';

async function demo() {
    console.log('Start');
    await sleep(1000);
    console.log('1 second later');
}
```

### range(start, end, step)

Generate array of numbers.

**Parameters:**
- `start` (number) - Start value
- `end` (number) - End value (exclusive)
- `step` (number) - Step value (default: 1)

**Returns:** Array of numbers

**Example:**
```javascript
import { range } from './lib/utils.js';

range(0, 5);        // [0, 1, 2, 3, 4]
range(1, 10, 2);    // [1, 3, 5, 7, 9]
```

### opt(templateFn)

Enables fine-grained reactivity by transforming a template function to wrap all expressions in `html.contain()`. Use with `eval()` for runtime transformation.

**Parameters:**
- `templateFn` (function) - Template function that returns `html\`...\``

**Returns:** String of transformed function source code (requires eval())

**Example:**
```javascript
import { defineComponent, Component, html } from './lib/framework.js';
import { opt } from './lib/opt.js';

class MyCounter extends Component {
    state = { count: 0, name: 'Counter' };
}

// Assign the optimized template to the PROTOTYPE after the class declaration.
// A `template = eval(opt(...))` class FIELD would silently not render - the
// framework harvests template() from the prototype at registration time.
MyCounter.prototype.template = eval(opt(function() {
    return html`
        <div>
            <h1>${this.state.name}</h1>
            <p>Count: ${this.state.count}</p>
            <button on-click="${() => this.state.count++}">+</button>
        </div>
    `;
}));

defineComponent('my-counter', MyCounter);
```

**What it does:**
- Transforms `${this.state.count}` to `${html.contain(() => this.state.count)}`
- Each expression becomes an isolated reactive boundary
- Only the affected expression re-renders when its dependencies change

**Expressions NOT wrapped:**
- Arrow functions: `${() => handler}`
- Already contained: `${contain(() => ...)}`
- Control flow: `${when(...)}`, `${each(...)}`, `${memoEach(...)}`
- Raw content: `${raw(...)}`
- Slots/children: `${this.props.children}`, `${this.props.slots.xxx}`

**CSP Note:** Requires `'unsafe-eval'` in Content Security Policy. For strict CSP environments, use manual `contain()` calls or the build-time optimizer.

### Other utility exports

Also exported from `./lib/utils.js`:

- `memoize(fn)` - Cache function results by JSON-stringified arguments
- `debounce(fn, delay)` / `throttle(fn, limit)` / `rafThrottle(fn)` - Rate-limiting wrappers
- `fetchJSON(url, options)` - `fetch` wrapper that handles JSON encoding/decoding and errors
- `eventBus` - Simple global pub/sub (`on`, `off`, `emit`)
- `formData(formElement)` / `serializeForm(formElement)` - Read form contents as an object
- `createInterval(fn, delay)` - `setInterval` wrapper returning a cancel function
- `dismissNotification(id)` - Remove a notification created by `notify()`
- `relativeTime(date)` - Human-friendly "3 minutes ago" formatting
- `clamp(value, min, max)`, `randomId(prefix)`, `isEmpty(value)` - Small helpers
- `rlog(fn, options)` - Remote/console logging helper for debugging

**Build-Time Alternative:**
```bash
# Optimize all templates
node optimize.js --input ./src --output ./dist

# With minification
node optimize.js -i ./src -o ./dist --minify --sourcemap

# Lint for early dereference issues
node optimize.js --lint-only -i ./src

# Auto-fix issues (replaces captured variables with reactive paths)
node optimize.js --auto-fix -i ./src

# Preview auto-fix changes
node optimize.js --auto-fix --dry-run -i ./src
```

This applies opt() transformations at build time to ALL html`` templates, eliminating the need for eval(). The `--lint-only` mode detects early dereference patterns that would break reactivity, and `--auto-fix` can automatically fix simple cases.

## Event Attributes

### on-click

Click event handler.

```javascript
<button on-click="handleClick">Click</button>
```

### on-change

Change event handler (for inputs, selects).

```javascript
<input on-change="handleChange">
<select on-change="handleSelect">
```

### on-input

Input event handler (fires on every keystroke).

```javascript
<input on-input="handleInput">
```

### on-submit

Form submit handler (must call preventDefault).

```javascript
<form on-submit="handleSubmit">
```

### on-submit-prevent

Form submit handler with automatic preventDefault.

```javascript
<form on-submit-prevent="handleSubmit">
```

### on-mouseenter, on-mouseleave

Mouse hover events.

```javascript
<div on-mouseenter="handleEnter" on-mouseleave="handleLeave">
```

### Event Modifiers

Append to any event name; multiple modifiers chain:

- `-prevent` - calls `e.preventDefault()`
- `-stop` - calls `e.stopPropagation()`
- `-passive` - registers with `{ passive: true }` (scroll-friendly touch/wheel handlers; incompatible with `-prevent`)

```javascript
<a on-click-prevent-stop="handleLink">
<div on-touchmove-passive="handleTouchMove">
```

## Special Attributes

### x-model

Two-way data binding for form inputs.

**Supported input types:**
- text, email, password, url, etc. (string)
- number, range (number)
- checkbox (boolean)
- radio (string from value attribute)
- select (string from selected option)
- textarea (string)
- file (FileList)

**Example:**
```javascript
<input type="text" x-model="username">
<input type="number" x-model="age">
<input type="checkbox" x-model="agreed">
<select x-model="country">
```

## Windowing API

### createWindowing(host, options)

Virtual-scroll controller from `./lib/windowing.js` - owns the window state (reactive `visibleStart`/`visibleEnd`/`offsetY`/`totalHeight`) and scroll/resize plumbing while the component owns the markup. `cl-virtual-list` is built on it.

**Parameters:**
- `host` (HTMLElement) - The list's element (scroll source in `'self'` mode)
- `options` (object): `itemHeight` (px, number or function - required), `count` (function returning total items - required), `buffer` (default 10), `scrollContainer` (`'self'` | `'parent'` | `'window'` | selector | element), `fallbackHeight` (default 400), `onRange(start, end)` (on-demand loading hook)

**Returns:** controller with reactive getters and `refresh()`, `scrollToIndex(i)`, `scrollToTop()`, `scrollToBottom()`, `setScrollContainer(mode)`, `attach()`, `detach()`, `destroy()`.

See [performance.md](performance.md#windowed-virtual-scrolling) for the full usage pattern.

## Gestures API

### createRowGestures(host, options)

Row-gesture controller from `./lib/gestures.js` - owns the state machines for list-row interactions (desktop drag-and-drop reordering with pointer-midpoint gap targeting and insertion indicators, touch drag via handle with edge autoscroll, long-press vs tap discrimination) while the component owns the markup and domain callbacks. Composes with `createWindowing` (pass the controller as `options.windowing` for absolute-index math). `cl-virtual-list`'s `reorderable` mode is the reference consumer.

**Parameters:**
- `host` (HTMLElement) - The list's component element
- `options` (object): `itemHeight` (required), `windowing` (controller, optional), `count` (fn, required without windowing), `onReorder(fromIndices, gap)` (gap is clamped and no-op-filtered), `onTap`/`onLongPress`/`onContextMenu`, `selection: { isSelected, indices }` (enables group drag), `indicator: { before, after }` class names, `longPressMs` (500), `slop` (10)

**Handler methods** (bind in templates; all state lives in the controller): `click`, `contextMenu`, `touchStart`, `touchMove`, `touchEnd`, `dragStart`, `dragOver`, `dragLeave`, `drop`, `dragEnd`, `handleTouchStart/Move/End` (drag handle), plus `isTouchDevice()`, `cancel()`, `destroy()`.

**Passive-safety invariant** (see the module JSDoc table): `touchStart`/`touchMove` never call `preventDefault` - bind them `-passive`; `touchEnd` and the `handleTouch*` suite may - keep them non-passive.

**Pure reorder-math helpers** (exported, for translating the insertion gap onto your reorder API):
- `gapToRemoveInsertIndex(from, gap)` - for remove-then-insert splice APIs
- `gapToGapIndex(from, gap)` - identity, for gap-semantic APIs
- `groupReorderTargets(fromIndices, gap)` - `{ target, newIndices }` for batch moves with selection-follow
- `isNoopGap(fromIndices, gap)` - whether a drop leaves order unchanged

## See Also

- [components.md](components.md) - Component development patterns
- [templates.md](templates.md) - Template system and helpers
- [reactivity.md](reactivity.md) - Reactive state management
- [performance.md](performance.md) - Virtual scrolling, large lists, high-frequency updates
- [routing.md](routing.md) - Router usage
- [security.md](security.md) - Security best practices
