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

### defineComponent(name, options)

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

    // Template function
    template() {
        return html`...`;
    },

    // Lifecycle hooks
    mounted() { },       // Called after component added to DOM
    unmounted() { },     // Called before component removed
    afterRender() { },   // Called after each render (use sparingly)

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

#### this.emitChange(event, value)
Helper to emit change events for x-model compatibility.

```javascript
methods: {
    handleInput(e) {
        this.emitChange(e, e.target.value);
    }
}
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

### memoEach(array, mapFn, keyFn, [cache])

Memoized list rendering - caches rendered templates per item key.

**Parameters:**
- `array` (Array) - Array to iterate over (used as cache key)
- `mapFn` (function) - Function that returns template for each item
- `keyFn` (function) - **Required** - Function to extract unique key from item
- `cache` (Map, optional) - Explicit cache (only needed when same array rendered with different templates)

**Example:**
```javascript
${memoEach(this.state.songs, song => html`
    <div class="song">${song.title}</div>
`, song => song.uuid)}
```

**Caching behavior:**
- Uses array reference as cache key (WeakMap) - safe to use conditionally
- Each different array automatically gets its own cache
- Only need explicit `cache` param when rendering same array differently in multiple places

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
data() {
    return { userPromise: null };
},

mounted() {
    this.state.userPromise = fetchUser(123);
},

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
import { awaitThen, html } from './lib/framework.js';
import { lazy } from './lib/utils.js';

// Define lazy component at module level (cached)
const LazyChart = lazy(() => import('./chart-component.js'));

defineComponent('dashboard', {
    template() {
        return html`
            <h1>Dashboard</h1>
            ${awaitThen(LazyChart,
                () => html`<chart-component data="${this.state.chartData}"></chart-component>`,
                html`<cl-spinner></cl-spinner>`
            )}
        `;
    }
});
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
data() {
    return { showAdvanced: false };
},

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

Clears the template compilation cache. The framework caches compiled templates for performance (up to 500 entries). This function clears that cache.

**When to use:**
- Memory-constrained environments where cache grows too large
- Dynamic template generation (rare)
- Testing scenarios where you need clean state

**Parameters:** None

**Returns:** `void`

```javascript
import { pruneTemplateCache } from './lib/framework.js';

// Clear the template cache
pruneTemplateCache();
```

**Note:** In most applications, you never need to call this. The cache automatically limits itself to 500 entries and provides significant performance benefits for repeated renders.

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

### createEffect(fn)

Runs a function when its reactive dependencies change.

**Parameters:**
- `fn` (function) - Function to run

**Returns:** Cleanup function

**Example:**
```javascript
import { createEffect } from './lib/framework.js';

const state = reactive({ count: 0 });

const cleanup = createEffect(() => {
    console.log('Count:', state.count);
});

state.count++; // Logs: Count: 1

// Later: cleanup
cleanup();
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

Memoizes a function result based on dependencies.

**Parameters:**
- `fn` (function) - Function to memoize
- `deps` (Array) - Dependency array

**Example:**
```javascript
import { memo } from './lib/framework.js';

const expensiveComputation = memo(
    (a, b) => a * b * Math.random(),
    [a, b]
);
```

### untracked(value)

Wraps a value to opt out of deep reactivity tracking. Use for large arrays/objects where you only need to track when the whole value is replaced.

**Parameters:**
- `value` (any) - Initial value to mark as untracked

**Returns:** The value (unchanged)

**Example:**
```javascript
import { defineComponent, untracked } from './lib/framework.js';

defineComponent('song-list', {
    data() {
        return {
            // Large array - only track replacement, not individual items
            songs: untracked([]),
            // Normal reactive values
            currentIndex: 0
        };
    },

    methods: {
        loadSongs(newSongs) {
            // Reassign to trigger update (auto-applies untracked)
            this.state.songs = newSongs;
        }
    }
});
```

**When to use:** Arrays with 100+ items, deeply nested objects, API response data.

### flushSync(fn)

Execute a function and immediately flush any pending renders. Use when you need synchronous DOM updates after state changes.

**Parameters:**
- `fn` (function) - Function to execute (typically contains state updates)

**Returns:** Return value of the function

**Example:**
```javascript
import { defineComponent, html, flushSync } from './lib/framework.js';

defineComponent('my-form', {
    data() {
        return { showInput: false };
    },

    methods: {
        showAndFocus() {
            flushSync(() => {
                this.state.showInput = true;
            });
            // DOM is now updated, safe to focus
            this.refs.input.focus();
        },

        addAndScroll() {
            flushSync(() => {
                this.state.items.push(newItem);
            });
            // Scroll to bottom
            this.refs.list.scrollTop = this.refs.list.scrollHeight;
        }
    }
});
```

**When to use:** Focusing elements, scrolling after adding items, measuring elements after state change.

**Note:** Use sparingly - bypasses automatic batching and can hurt performance if overused.

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

**Note:** In normal application code, use `flushSync()` instead.

### createMemoCache()

Creates a memoization cache for use with `memoEach()`.

**Returns:** Map for caching

**Note:** Usually not needed - `memoEach()` automatically manages caches when used inside component templates.

## Store API

### createStore(initialState)

Creates a reactive store with pub/sub pattern.

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

Subscribe to store changes.

**Parameters:**
- `callback` (function) - Called with new state on changes

**Returns:** Unsubscribe function

```javascript
const unsubscribe = store.subscribe(state => {
    console.log('State changed:', state);
});

// Later
unsubscribe();
```

#### store.set(newState)

Replace entire state.

**Parameters:**
- `newState` (object) - New state object

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

Access store state. Methods on stores should be called on `store.state`.

```javascript
// ✅ CORRECT
await login.state.logoff();

// ❌ WRONG
await login.logoff();
```

### localStore(key, initialState)

Creates a store that persists to localStorage.

**Parameters:**
- `key` (string) - localStorage key
- `initialState` (object) - Initial state if not in localStorage

**Returns:** Store object

**Example:**
```javascript
import { localStore } from './lib/utils.js';

const prefs = localStore('user-prefs', { theme: 'light' });

prefs.state.theme = 'dark'; // Automatically saves to localStorage
```

## Router API

### enableRouting(outlet, routes, options)

Enables routing.

**Parameters:**
- `outlet` (HTMLElement) - Router outlet element
- `routes` (object) - Route configuration
- `options` (object) - Router options (optional)

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
        require: 'admin',  // Capability guard
        load: () => import('./admin.js')
    }
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

## Utilities API

### notify(message, severity, ttl)

Show toast notification.

**Parameters:**
- `message` (string) - Notification message
- `severity` (string) - One of: 'info', 'success', 'warning', 'error'
- `ttl` (number) - Time to live in seconds (default: 3)

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
import { defineComponent, html } from './lib/framework.js';
import { opt } from './lib/opt.js';

defineComponent('my-counter', {
    data() {
        return { count: 0, name: 'Counter' };
    },

    // Wrap template function in eval(opt(...))
    template: eval(opt(function() {
        return html`
            <div>
                <h1>${this.state.name}</h1>
                <p>Count: ${this.state.count}</p>
                <button on-click="${() => this.state.count++}">+</button>
            </div>
        `;
    }))
});
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

## See Also

- [components.md](components.md) - Component development patterns
- [templates.md](templates.md) - Template system and helpers
- [reactivity.md](reactivity.md) - Reactive state management
- [routing.md](routing.md) - Router usage
- [security.md](security.md) - Security best practices
