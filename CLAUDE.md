# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a web application that uses a **custom zero-dependency vanilla JavaScript framework** (in `/app/`). The application is a client for the SWAPI (Simple Web API) server with authentication and various tools. The framework requires **no build step** - it runs directly in the browser using ES6 modules.

## Quick Start

```bash
cd app
python3 test-server.py
```

Then open: http://localhost:9000/

## Framework Architecture

- **Zero npm dependencies** - Pure vanilla JavaScript, vendored Preact, no npm packages
- **No build step** - Runs directly in the browser using ES6 modules
- **Reactive state management** - Vue 3-style proxy-based reactivity
- **Web Components** - Built on native Custom Elements API
- **Preact rendering** - Vendored Preact (~4KB) for efficient DOM reconciliation
- **Template compilation** - Compile-once system: `html`` → compile → Preact VNode → render`
- **Router** - Hash-based and HTML5 routing with capability checks
- **Stores** - Reactive stores with localStorage persistence

## Project Structure

```
app/
├── lib/                     # Framework library
│   ├── framework.js         # Main barrel export (defineComponent, html, reactive, etc.)
│   ├── router.js            # Router system
│   ├── utils.js             # Utilities (notify, darkTheme, localStore, etc.)
│   └── core/                # Framework internals (~3000 lines)
├── dist/                    # Pre-bundled versions for embedding
├── componentlib/            # Professional UI component library (cl-* components)
├── components/              # Reusable UI components
├── auth/                    # Authentication system
├── apps/                    # Application modules
├── tests/                   # Comprehensive unit tests (166 tests)
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
    styles: `
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

**Available:** `on-click`, `on-change`, `on-submit`, `on-submit-prevent`, `on-input`, `on-mouseenter`, `on-mouseleave`

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

// each() - List rendering
${each(this.state.items, item => html`
    <li>${item.name}</li>
`)}

// each() with key function - preserves DOM state on reorder
${each(this.state.items, item => html`
    <li><input type="text" x-model="items[${item.id}].name"></li>
`, item => item.id)}

// raw() - Only for trusted, sanitized content
${raw(this.state.trustedHtmlContent)}
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

**Named children (named slots):**

```javascript
// ✅ Named children using slot attribute
defineComponent('dialog', {
    template() {
        const defaultChildren = Array.isArray(this.props.children)
            ? this.props.children
            : (this.props.children?.default || []);
        const footerChildren = this.props.children?.footer || [];

        return html`
            <div class="dialog">
                <div class="content">${defaultChildren}</div>
                ${when(footerChildren.length > 0, html`
                    <div class="footer">${footerChildren}</div>
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

**⚠️ State Preservation:** When conditionally rendering children with `when()`, child components will **unmount and lose state**. To preserve state, use CSS hiding instead:

```javascript
// ✅ PRESERVES STATE - Use CSS display:none
template() {
    return html`
        <div class="tab1 ${this.state.activeTab === 'tab1' ? '' : 'hidden'}">
            ${this.props.children.tab1}
        </div>
    `;
},
styles: `
    .hidden { display: none; }
`

// ❌ LOSES STATE - Unmounts component
${when(this.state.activeTab === 'tab1', html`
    <div>${this.props.children.tab1}</div>
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

**See [docs/reactivity.md](docs/reactivity.md) for complete reactivity guide.**

### 8. Router

```javascript
import { Router } from './lib/router.js';

const router = new Router({
    '/': {
        component: 'home-page',
        load: () => import('./home.js')  // Optional lazy loading
    },
    '/admin/': {
        component: 'admin-page',
        require: 'admin'  // Capability check
    }
});
```

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

For project overview and quickstart, see [README.md](README.md).

## Backend (SWAPI Server)

**Note**: The `backend` and `backend-apps` directories are symlinks to `../swapi/server/` and `../swapi-apps/`. **Do NOT modify these from this repository.**

### SWAPI Framework

Python-based web API framework built on Werkzeug:
- Decorator-based API registration: `@api.add(require=capability)`
- Auto-generated client libraries (`.js`, `.py` endpoints)
- Email-based OTP authentication
- Role hierarchy and capability system
- SQLAlchemy database backend

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
// ❌ WRONG - Framework does it automatically
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

### Framework Unit Tests (~166 tests)

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
```

## Getting Help

- Check `/app/tests/` for working examples
- Review `/app/lib/core/` for framework APIs
- See `/app/components/` for component patterns
- Read the docs/ folder for detailed information
