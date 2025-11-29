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
    mounted() { },      // Called after component added to DOM
    unmounted() { },    // Called before component removed
    afterRender() { },  // Called after each render (use sparingly)

    // Scoped styles
    styles: `...`
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

    styles: `
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
- Returns structure compatible with Preact VNodes

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
```

### raw(htmlString)

Renders trusted HTML without escaping.

**⚠️ Use only for trusted, server-generated content!**

```javascript
${raw(this.state.trustedHtmlFromBackend)}
```

### pruneTemplateCache()

Clears the template compilation cache. Rarely needed.

```javascript
import { pruneTemplateCache } from './lib/framework.js';

pruneTemplateCache();
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

Creates a memoized computed value.

**Parameters:**
- `fn` (function) - Function that computes value based on dependencies

**Returns:** Computed function

**Example:**
```javascript
import { computed } from './lib/utils.js';

data() {
    return {
        items: [...],
        filteredItems: computed((items, query) => {
            return items.filter(item => item.name.includes(query));
        })
    };
},

template() {
    const filtered = this.state.filteredItems(
        this.state.items,
        this.state.query
    );
    // ...
}
```

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

### defineRouterOutlet()

Defines the `<router-outlet>` custom element.

```javascript
import { defineRouterOutlet } from './lib/router.js';

defineRouterOutlet();
```

### defineRouterLink(router)

Defines the `<router-link>` custom element.

**Parameters:**
- `router` (Router) - Router instance

```javascript
import { defineRouterLink } from './lib/router.js';

defineRouterLink(router);
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

## Preact Exports (Advanced)

For advanced use cases, the framework exposes Preact primitives:

```javascript
import { h, Fragment, render, Component, createContext } from './lib/framework.js';
```

These are primarily for internal use but can be useful for integrating third-party Preact libraries.

## See Also

- [components.md](components.md) - Component development patterns
- [templates.md](templates.md) - Template system and helpers
- [reactivity.md](reactivity.md) - Reactive state management
- [routing.md](routing.md) - Router usage
- [security.md](security.md) - Security best practices
