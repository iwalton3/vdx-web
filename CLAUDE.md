# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**VDX - Vanilla Developer Experience** consists of:
- **vdx-web**: Core framework (in `/app/lib/`) - Zero-dependency reactive web framework
- **vdx-ui**: Component library (in `/app/componentlib/`) - Professional UI components (cl-* prefix)

The framework requires **no build step** - it runs directly in the browser using ES6 modules.

## Quick Start

```bash
cd app
python3 test-server.py
```

Then open: http://localhost:9000/

## Framework Architecture

- **Zero npm dependencies** - Pure vanilla JavaScript, vendored Preact, no npm packages
- **No build step** - Runs directly in the browser using ES6 modules
- **TypeScript support** - Optional `.d.ts` files for type checking (see [docs/typescript.md](docs/typescript.md))
- **Reactive state management** - Vue 3-style proxy-based reactivity
- **Web Components** - Built on native Custom Elements API
- **Preact rendering** - Vendored Preact (~4KB) for efficient DOM reconciliation
- **Template compilation** - Compile-once system: `html`` → compile → Preact VNode → render`
- **Router** - Hash-based and HTML5 routing with capability checks
- **Stores** - Reactive stores with pub/sub pattern (use `localStore()` from utils.js for localStorage persistence)

## Project Structure

```
app/
├── lib/                     # vdx-web: Core framework
│   ├── framework.js         # Main barrel export (defineComponent, html, reactive, etc.)
│   ├── framework.d.ts       # TypeScript definitions for framework
│   ├── router.js            # Router system
│   ├── router.d.ts          # TypeScript definitions for router
│   ├── utils.js             # Utilities (notify, darkTheme, localStore, etc.)
│   ├── utils.d.ts           # TypeScript definitions for utils
│   ├── componentlib.d.ts    # TypeScript definitions for UI components
│   └── core/                # Framework internals (~3000 lines)
├── dist/                    # Pre-bundled versions for embedding
├── componentlib/            # vdx-ui: Professional UI component library (cl-* prefix)
├── components/              # Reusable UI components
├── apps/                    # Application modules
├── tests/                   # Comprehensive unit tests (187 tests)
├── ts-demo/                 # TypeScript demo application
└── index.html               # Entry point
```

## Core Framework Concepts

### 1. Component Pattern

```javascript
import { defineComponent, html, when, each } from './lib/framework.js';

export default defineComponent('my-component', {
    // Props (attributes) - automatically observed
    props: {
        title: 'Default Title',
        count: 0
    },

    // Local reactive state
    data() {
        return {
            message: 'Hello',
            items: []
        };
    },

    // Lifecycle hooks
    mounted() {
        // Called after component is added to DOM
    },

    unmounted() {
        // Called before component is removed - cleanup subscriptions/timers
    },

    propsChanged(prop, newValue, oldValue) {
        // Called when a prop changes - see docs/components.md for details
    },

    // Methods
    methods: {
        handleClick(e) {
            this.state.message = 'Clicked!';
        }
    },

    // Template using tagged template literals
    template() {
        return html`
            <div>
                <h1>${this.props.title}</h1>
                <p>${this.state.message}</p>
                <button on-click="handleClick">Click Me</button>
            </div>
        `;
    },

    // Scoped styles
    styles: /*css*/`
        button {
            background: #007bff;
            color: white;
        }
    `
});
```

**See [docs/components.md](docs/components.md) for complete component patterns.**

### 2. Event Binding - CRITICAL

✅ **ALWAYS use `on-*` attributes** - Never use inline onclick or addEventListener in templates:

```javascript
// ✅ CORRECT
<button on-click="handleClick">Click</button>
<form on-submit-prevent="handleSubmit">...</form>
<input type="text" on-change="handleChange">

// ❌ WRONG
<button onclick="handleClick()">Click</button>
```

**Common events:** `on-click`, `on-change`, `on-submit`, `on-submit-prevent`, `on-input`, `on-mouseenter`, `on-mouseleave`

**Custom events:** Any event name works: `on-my-event`, `on-status-change`, etc. Modifiers (`prevent`, `stop`) go at the end: `on-custom-event-prevent`

### 3. Two-Way Data Binding with `x-model`

**Automatic two-way binding** - a feature even React doesn't have:

```javascript
data() {
    return {
        username: '',
        age: 0,
        agreed: false
    };
},

template() {
    return html`
        <input type="text" x-model="username">
        <input type="number" x-model="age">      <!-- Auto number conversion -->
        <input type="checkbox" x-model="agreed">  <!-- Auto boolean -->
    `;
}
```

**Chain with custom handlers:**
```javascript
<input type="text" x-model="username" on-input="${() => this.clearError()}">
```

**See [docs/templates.md](docs/templates.md) for complete x-model documentation.**

### 4. Template Helpers

```javascript
// html`` - Auto-escaped, XSS-safe
html`<div>${this.state.userInput}</div>`

// when() - Conditional rendering (use instead of ternaries)
${when(this.state.isLoggedIn,
    html`<p>Welcome!</p>`,
    html`<p>Please log in</p>`
)}

// Can also accept function to avoid executing when a condition is invalid
${when(this.state.isLoggedIn,
    () => html`<p>Welcome!</p>`,
    () => html`<p>Please log in</p>`
)}

// each() - List rendering
${each(this.state.items, item => html`
    <li>${item.name}</li>
`)}

// each() with key function - preserves DOM state on reorder
${each(this.state.items, item => html`
    <li><input type="text" x-model="items[${item.id}].name"></li>
`, item => item.id)}

// awaitThen() - Async data loading with loading/error states
${awaitThen(
    this.state.userPromise,  // Promise stored in state
    user => html`<div>${user.name}</div>`,  // render when resolved
    html`<loading-spinner></loading-spinner>`,  // loading content
    error => html`<error-msg>${error.message}</error-msg>`  // error content
)}

// raw() - Only for trusted, sanitized content
${raw(this.state.trustedHtmlContent)}
```

**Async Data with `awaitThen`:**
```javascript
import { defineComponent, html, awaitThen } from './lib/framework.js';

defineComponent('user-profile', {
    data() {
        return {
            userPromise: null  // Store promise in state to control when it's created
        };
    },

    mounted() {
        this.state.userPromise = fetchUser(123);  // Create promise on mount
    },

    methods: {
        reload() {
            this.state.userPromise = fetchUser(123);  // New promise triggers re-render
        }
    },

    template() {
        return html`
            ${awaitThen(
                this.state.userPromise,
                user => html`<h1>${user.name}</h1>`,
                html`<p>Loading...</p>`,
                error => html`<p class="error">${error.message}</p>`
            )}
        `;
    }
});
```

### 5. Passing Props to Child Components

The framework **automatically** passes objects, arrays, and functions to custom elements without stringification:

```javascript
template() {
    return html`
        <!-- ✅ Arrays/objects/functions passed automatically -->
        <x-select-box
            options="${this.state.lengthOptions}"
            value="${this.state.length}"
            on-change="handleChange">
        </x-select-box>

        <!-- Methods are auto-bound - just pass them directly -->
        <virtual-list
            items="${this.state.items}"
            renderItem="${this.handleItemRender}">
        </virtual-list>
    `;
}
```

**See [docs/components.md](docs/components.md) for prop passing details.**

### 6. Children Props (React-style Composition)

The framework supports **React-style children** for component composition:

```javascript
// ✅ Basic children - always available as this.props.children
defineComponent('wrapper', {
    template() {
        return html`
            <div class="wrapper">
                ${this.props.children}
            </div>
        `;
    }
});

// Usage
<wrapper>
    <p>Hello, World!</p>
</wrapper>
```

**Named slots:**

```javascript
// ✅ Named slots using slot attribute
defineComponent('dialog', {
    template() {
        // children is always an array, slots has named slots
        const footerSlot = this.props.slots.footer || [];

        return html`
            <div class="dialog">
                <div class="content">${this.props.children}</div>
                ${when(footerSlot.length > 0, html`
                    <div class="footer">${footerSlot}</div>
                `)}
            </div>
        `;
    }
});

// Usage
<dialog>
    <p>Main content</p>
    <div slot="footer">
        <button>OK</button>
    </div>
</dialog>
```

**API:**
- `this.props.children` - Always an array of default slot children
- `this.props.slots` - Object with named slot children (e.g., `this.props.slots.footer`)

**⚠️ State Preservation:** When conditionally rendering children with `when()`, child components will **unmount and lose state**. To preserve state, use CSS hiding instead:

```javascript
// ✅ PRESERVES STATE - Use CSS display:none
template() {
    return html`
        <div class="tab1 ${this.state.activeTab === 'tab1' ? '' : 'hidden'}">
            ${this.props.slots.tab1}
        </div>
    `;
},
styles: /*css*/`
    .hidden { display: none; }
`

// ❌ LOSES STATE - Unmounts component
${when(this.state.activeTab === 'tab1', html`
    <div>${this.props.slots.tab1}</div>
`)}
```

**Using `raw()` with children:**

```javascript
// For password generators, markdown renderers, etc.
defineComponent('result-display', {
    data() {
        return {
            generatedHtml: '<code>aB3$xY9!</code>' // Your generated HTML
        };
    },
    template() {
        return html`
            <password-card>
                <h3>Generated:</h3>
                ${raw(this.state.generatedHtml)}  <!-- Creates vnode with dangerouslySetInnerHTML -->
                <button>Copy</button>
            </password-card>
        `;
    }
});
```

**See [docs/components.md](docs/components.md) for complete children documentation.**

### 7. Reactive State - CRITICAL

⚠️ **NEVER mutate reactive arrays with `.sort()`** - This causes infinite re-render loops!

```javascript
// ✅ CORRECT - Create a copy before sorting
getSortedItems() {
    return [...this.state.items].sort((a, b) => a.time - b.time);
}

// ❌ WRONG - Infinite loop!
getSortedItems() {
    return this.state.items.sort((a, b) => a.time - b.time);
}
```

**Safe methods** (return new arrays): `.filter()`, `.map()`, `.slice()`
**Unsafe methods** (mutate in place): `.sort()`, `.reverse()`, `.splice()`

⚠️ **Sets and Maps are NOT reactive** - Must reassign:

```javascript
// ✅ CORRECT
addItem(item) {
    const newSet = new Set(this.state.items);
    newSet.add(item);
    this.state.items = newSet;
}
```

⚠️ **Large arrays cause performance issues** - Use `untracked()` for arrays with 100+ items:

```javascript
import { defineComponent, html, untracked } from './lib/framework.js';

defineComponent('playlist-view', {
    data() {
        return {
            // Large array - only track when the whole array is replaced
            songs: untracked([]),
            // Small values - track normally
            currentIndex: 0
        };
    },

    methods: {
        loadSongs(newSongs) {
            // Just assign - untracked is auto-applied to keys marked initially
            this.state.songs = newSongs;
        }
    }
});
```

Once a key is marked with `untracked()` in `data()`, all future assignments to that key are automatically untracked. This prevents the framework from walking every property of every item in large arrays.

**See [docs/reactivity.md](docs/reactivity.md) for complete reactivity guide.**

### 8. Router

```javascript
import { enableRouting } from './lib/router.js';

const outlet = document.getElementsByTagName('router-outlet')[0];
const router = enableRouting(outlet, {
    '/': {
        component: 'home-page',
        load: () => import('./home.js')  // Optional lazy loading
    },
    '/users/:id/': {
        component: 'user-profile'  // URL parameters
    },
    '/products/:category/:sku/': {
        component: 'product-detail'  // Multiple params
    },
    '/admin/': {
        component: 'admin-page',
        require: 'admin'  // Capability check
    }
});
```

**URL Parameters and Query Strings** - passed automatically as props:
```javascript
defineComponent('user-profile', {
    props: {
        params: {},  // { id: '123' } from /users/123/
        query: {}    // { tab: 'settings' } from ?tab=settings
    },

    mounted() {
        this.loadUser(this.props.params.id);
    }
});
```

**Reactive Navigation** - same-component navigation updates props without remounting:
```javascript
// Navigating from /users/1/ to /users/2/ updates params.id reactively
<router-link to="/users/${user.id}/">${user.name}</router-link>
```

**Hash Mode Query Strings** work too: `#/search?q=hello&page=2`

**Navigation:**
```javascript
<router-link to="/about/">About</router-link>
```

**See [docs/routing.md](docs/routing.md) for complete router documentation.**

### 9. Stores

**Automatic subscription** (recommended) - use `stores` option for auto-subscribe/unsubscribe:

```javascript
import login from './auth/auth.js';

export default defineComponent('my-component', {
    stores: { login },  // Auto-subscribes on mount, unsubscribes on unmount

    template() {
        return html`
            <p>User: ${this.stores.login.user?.name || 'Guest'}</p>
            <button on-click="logoff">Log out</button>
        `;
    },

    methods: {
        async logoff() {
            await login.state.logoff();  // Call methods on store.state
        }
    }
});
```

**Manual subscription** (when you need custom logic):

```javascript
import login from './auth/auth.js';

async mounted() {
    this.unsubscribe = login.subscribe(state => {
        this.state.user = state.user;
    });
}

unmounted() {
    if (this.unsubscribe) this.unsubscribe();
}
```

**Important:** Always call store methods on `.state`, not the store directly: `login.state.logoff()`

### 10. Refs

Get direct DOM references using the `ref` attribute:

```javascript
export default defineComponent('my-form', {
    methods: {
        focusInput() {
            this.refs.nameInput.focus();
        },

        handleSubmit() {
            console.log('Value:', this.refs.nameInput.value);
        }
    },

    template() {
        return html`
            <input ref="nameInput" type="text">
            <button on-click="focusInput">Focus</button>
            <button on-click="handleSubmit">Submit</button>
        `;
    }
});
```

- Refs are available after first render
- Automatically cleaned up when element is removed
- Access via `this.refs.refName`

## Key Conventions

1. **Use `x-model` for form inputs** - One attribute for two-way binding
2. **Use `on-*` for ALL event binding** - Never use inline handlers or addEventListener
3. **Use `when()` and `each()`** - Not ternaries or manual loops
4. **Never mutate reactive arrays** - Use `[...array].sort()`, not `array.sort()`
5. **Call store methods on `.state`** - `store.state.method()`, not `store.method()`
6. **Reassign Sets/Maps** - They're not reactive otherwise
7. **Clean up in `unmounted()`** - Unsubscribe from stores, clear timers
8. **Validate user input** - Always validate before API calls
9. **Handle errors properly** - Don't let errors fail silently
10. **Use descriptive names** - No abbreviations or single letters

## Documentation

For detailed information, see:

- **[docs/components.md](docs/components.md)** - Component development patterns, props, children, lifecycle
- **[docs/templates.md](docs/templates.md)** - Template system, x-model, helpers, event binding
- **[docs/reactivity.md](docs/reactivity.md)** - Reactive state, stores, computed properties
- **[docs/routing.md](docs/routing.md)** - Router setup, lazy loading, navigation
- **[docs/security.md](docs/security.md)** - XSS protection, input validation, CSRF, CSP
- **[docs/testing.md](docs/testing.md)** - Running tests, writing tests, test structure
- **[docs/bundles.md](docs/bundles.md)** - Using pre-bundled framework versions
- **[docs/componentlib.md](docs/componentlib.md)** - Professional UI component library (cl-* components)
- **[docs/api-reference.md](docs/api-reference.md)** - Complete API reference
- **[docs/typescript.md](docs/typescript.md)** - TypeScript support, types, and demo app

For project overview and quickstart, see [README.md](README.md).

## Common Anti-Patterns to Avoid

### ❌ Don't use afterRender() for value syncing or event binding

```javascript
// ❌ WRONG - Preact handles value syncing automatically
afterRender() {
    const select = this.querySelector('select');
    select.value = this.state.selected;
}

// ❌ WRONG - Use on-* attributes instead
afterRender() {
    this.querySelector('button').addEventListener('click', this.handleClick);
}
```

### ❌ Don't manually bind methods

```javascript
// ❌ WRONG - Methods are already auto-bound
mounted() {
    this._boundRender = this.handleRender.bind(this);
}

// ✅ CORRECT - Just pass the method directly
template() {
    return html`
        <virtual-list renderItem="${this.handleRender}">
    `;
}
```

### ❌ Don't stringify objects for custom components

```javascript
// ❌ WRONG - Framework passes by reference
<x-select-box options="${JSON.stringify(this.state.options)}">

// ✅ CORRECT - Just pass the object
<x-select-box options="${this.state.options}">
```

## Running Tests

Both test suites require the test server running first:

```bash
cd app
source ~/.venv/bin/activate
python3 test-server.py
```

### Framework Unit Tests (~187 tests)

Tests the core framework: reactivity, templates, components, router, etc.

```bash
# From project root (with server running)
cd componentlib-e2e
node run-framework-tests.js
```

Or open http://localhost:9000/tests/ in a browser.

### Component Library E2E Tests (~150 tests)

Tests the component library using Puppeteer.

```bash
# From project root (with server running)
cd componentlib-e2e
node test-runner.js

# Only show output from failing tests (quieter for CI or quick checks)
node test-runner.js --only-errors
```

## Getting Help

- Check `/app/tests/` for working examples
- Review `/app/lib/core/` for framework APIs
- See `/app/components/` for component patterns
- Read the docs/ folder for detailed information
- VERY IMPORTANT: This framework does not use shadow dom for anything, children are handled via preact virtual dom rendering.