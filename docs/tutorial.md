# VDX Framework Tutorial

A hands-on guide to building reactive web applications with zero dependencies.

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Your First Component](#your-first-component)
4. [Working with State](#working-with-state)
5. [Two-Way Data Binding](#two-way-data-binding)
6. [Template Helpers](#template-helpers)
7. [Event Handling](#event-handling)
8. [Component Communication](#component-communication)
9. [Lifecycle Hooks](#lifecycle-hooks)
10. [Routing](#routing)
11. [State Management with Stores](#state-management-with-stores)
12. [Static Site Integration](#static-site-integration)
13. [Advanced Patterns](#advanced-patterns)
14. [Performance Optimization](#performance-optimization)
15. [Best Practices](#best-practices)
16. [The Legacy Options Format](#the-legacy-options-format)

---

## Introduction

VDX (Vanilla Developer Experience) is a web framework that provides modern reactive features without any npm dependencies. It runs directly in the browser using ES6 modules - no build step required.

### What You'll Learn

By the end of this tutorial, you'll be able to:
- Create reactive components with automatic re-rendering
- Use two-way data binding for forms
- Build single-page applications with routing
- Manage global state with stores
- Integrate VDX components into static HTML pages
- Apply best practices for performance and security

### Prerequisites

- Basic knowledge of HTML, CSS, and JavaScript
- A text editor (VS Code recommended)
- Python 3 (for the development server) or any HTTP server

---

## Getting Started

### Step 1: Set Up the Development Server

```bash
python3 tools/test-server.py
```

Open your browser to **http://localhost:9000/**

### Step 2: Understand the Project Structure

```
app/
├── lib/                     # Core framework
│   ├── framework.js         # Main exports (defineComponent, html, etc.)
│   ├── router.js            # Router system
│   └── utils.js             # Utilities (notify, darkTheme, etc.)
├── dist/                    # Pre-bundled versions (for embedding)
├── components/              # Reusable components
├── apps/                    # Application pages
└── index.html               # Entry point
```

### Two Ways to Import

**Development (separate files):**
```javascript
import { defineComponent, html } from './lib/framework.js';
```

**Bundled (single file, ~92KB):**
```javascript
import { defineComponent, html } from './dist/framework.js';
```

---

## Your First Component

Let's create a simple counter component to understand the basics.

### Step 1: Create the Component File

Create `app/my-counter.js`:

```javascript
import { defineComponent, Component, html } from './lib/framework.js';

export class MyCounter extends Component {
    // Reactive state - changes trigger re-renders
    constructor(props) {
        super(props);
        this.state = {
            count: 0
        };
    }

    // Methods are auto-bound and callable from the template
    increment() {
        this.state.count++;
    }

    decrement() {
        this.state.count--;
    }

    // Template returns the component's HTML
    template() {
        return html`
            <div class="counter">
                <h2>Count: ${this.state.count}</h2>
                <button on-click="decrement">-</button>
                <button on-click="increment">+</button>
            </div>
        `;
    }

    // Scoped styles (optional)
    static styles = /*css*/`
        .counter {
            text-align: center;
            padding: 20px;
        }
        button {
            font-size: 1.5rem;
            padding: 10px 20px;
            margin: 0 5px;
        }
    `;
}

export default defineComponent('my-counter', MyCounter);
```

### Step 2: Use the Component

Create `app/counter-demo.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Counter Demo</title>
</head>
<body>
    <my-counter></my-counter>

    <script type="module">
        import './my-counter.js';
    </script>
</body>
</html>
```

### Key Concepts

1. **`class MyCounter extends Component`** - A component is a class extending `Component`
2. **`defineComponent(name, MyCounter)`** - Registers the class as a custom element
3. **`constructor(props)`** - Initializes reactive state on `this.state` (props hold real values here)
4. **Methods** - Class methods are auto-bound to the element and callable from the template
5. **`template()`** - Returns the HTML using the `html` template literal
6. **`on-click="methodName"`** - Binds events to methods
7. **`${this.state.property}`** - Interpolates reactive values

Getters become cached computed properties, and `static props` / `static stores` / `static styles`
declare props, stores, and scoped CSS. We'll cover each of these as we go. (An older
options-object format also exists - see [The Legacy Options Format](#the-legacy-options-format)
near the end.)

---

## Working with State

State is the heart of reactive components. When state changes, the component automatically re-renders.

### Accessing State

```javascript
constructor(props) {
    super(props);
    this.state = {
        user: {
            name: 'Alice',
            age: 30
        },
        items: ['apple', 'banana']
    };
}

updateName() {
    // Direct property assignment
    this.state.user.name = 'Bob';
}

addItem() {
    // Array methods work reactively
    this.state.items.push('orange');
}
```

### Reactivity Rules

**DO:**
```javascript
// Direct assignment
this.state.count = 10;

// Nested property updates
this.state.user.settings.theme = 'dark';

// Array mutations in event handlers
this.state.items.push(newItem);
this.state.items.splice(index, 1);
```

**sort() and reverse() are safe** - they're made atomic automatically:
```javascript
getSortedItems() {
    return this.state.items.sort((a, b) => a.name.localeCompare(b.name)); // ✅ Works!
}
```

### Sets and Maps Are Automatically Reactive

Sets and Maps are automatically wrapped to be reactive:

```javascript
constructor(props) {
    super(props);
    this.state = {
        selectedIds: new Set(),  // ✅ Automatically reactive!
        userScores: new Map()    // ✅ Automatically reactive!
    };
}

toggleSelection(id) {
    if (this.state.selectedIds.has(id)) {
        this.state.selectedIds.delete(id);  // ✅ Triggers re-render
    } else {
        this.state.selectedIds.add(id);     // ✅ Triggers re-render
    }
}
```

**Batch operations** for multiple items (single re-render):
```javascript
this.state.selectedIds.addAll([1, 2, 3]);
this.state.userScores.setAll([['alice', 100], ['bob', 85]]);
```

### Automatic Render Batching

Multiple state changes in the same synchronous function are automatically batched into a single render:

```javascript
updateMultiple() {
    // These three changes result in ONE render, not three
    this.state.firstName = 'John';
    this.state.lastName = 'Doe';
    this.state.fullName = 'John Doe';
    // Render happens after this function completes
}
```

This batching is automatic and happens via `queueMicrotask`. You don't need to do anything special.

### flushSync() - Immediate DOM Updates

Sometimes you need the DOM to update immediately after a state change (e.g., to focus an element):

```javascript
import { defineComponent, Component, html, when, flushSync } from './lib/framework.js';

defineComponent('my-form', class extends Component {
    constructor(props) {
        super(props);
        this.state = { showInput: false };
    }

    showAndFocus() {
        // Use flushSync to render immediately
        flushSync(() => {
            this.state.showInput = true;
        });
        // Now safe to focus - DOM is updated
        this.refs.input.focus();
    }

    template() {
        return html`
            <button on-click="showAndFocus">Add Input</button>
            ${when(this.state.showInput, html`
                <input ref="input" type="text">
            `)}
        `;
    }
});
```

Use `flushSync()` sparingly - it bypasses batching and can hurt performance if overused.

---

## Two-Way Data Binding

The `x-model` directive provides automatic two-way binding, including with nested properties using the dot operator.

### Basic Usage

```javascript
defineComponent('user-form', class extends Component {
    constructor(props) {
        super(props);
        this.state = {
            username: '',
            age: 18,
            agreed: false
        };
    }

    template() {
        return html`
            <form>
                <!-- Text input -->
                <input type="text" x-model="username" placeholder="Username">

                <!-- Number input - automatically converts to number! -->
                <input type="number" x-model="age" min="0" max="120">

                <!-- Checkbox - automatically converts to boolean! -->
                <label>
                    <input type="checkbox" x-model="agreed">
                    I agree to the terms
                </label>

                <p>Username: ${this.state.username}</p>
                <p>Age: ${this.state.age} (type: ${typeof this.state.age})</p>
                <p>Agreed: ${this.state.agreed}</p>
            </form>
        `;
    }
});
```

### Supported Input Types

| Input Type | Value Type | Notes |
|------------|-----------|-------|
| text, email, password | string | Standard text input |
| number, range | number | Auto-converts to number |
| checkbox | boolean | Binds to `checked` |
| radio | string | Value of selected radio |
| select | string | Value of selected option |
| textarea | string | Multi-line text |
| file | FileList | Read-only binding |

### Complete Form Example

```javascript
defineComponent('registration-form', class extends Component {
    constructor(props) {
        super(props);
        this.state = {
            username: '',
            email: '',
            password: '',
            age: 18,
            country: 'us',
            newsletter: false,
            plan: 'free'
        };
    }

    handleSubmit(e) {
        console.log('Form data:', {
            username: this.state.username,
            email: this.state.email,
            age: this.state.age,  // Already a number!
            country: this.state.country,
            newsletter: this.state.newsletter,  // Already a boolean!
            plan: this.state.plan
        });
    }

    template() {
        return html`
            <form on-submit-prevent="handleSubmit">
                <div>
                    <label>Username:</label>
                    <input type="text" x-model="username" required>
                </div>

                <div>
                    <label>Email:</label>
                    <input type="email" x-model="email" required>
                </div>

                <div>
                    <label>Password:</label>
                    <input type="password" x-model="password" required>
                </div>

                <div>
                    <label>Age:</label>
                    <input type="number" x-model="age" min="13" max="120">
                </div>

                <div>
                    <label>Country:</label>
                    <select x-model="country">
                        <option value="us">United States</option>
                        <option value="uk">United Kingdom</option>
                        <option value="ca">Canada</option>
                    </select>
                </div>

                <div>
                    <label>
                        <input type="checkbox" x-model="newsletter">
                        Subscribe to newsletter
                    </label>
                </div>

                <div>
                    <label>Plan:</label>
                    <label><input type="radio" name="plan" value="free" x-model="plan"> Free</label>
                    <label><input type="radio" name="plan" value="pro" x-model="plan"> Pro</label>
                </div>

                <button type="submit">Register</button>
            </form>
        `;
    }
});
```

### Chaining with Custom Handlers

Combine `x-model` with event handlers for additional logic:

```javascript
<input type="text" x-model="username" on-input="${() => this.validateUsername()}">
```

---

## Template Helpers

### Conditional Rendering with `when()`

Always use `when()` instead of ternary operators:

```javascript
import { defineComponent, html, when } from './lib/framework.js';

template() {
    return html`
        ${when(this.state.isLoading,
            html`<p>Loading...</p>`,
            html`<p>Content loaded!</p>`
        )}
    `;
}
```

**Nested conditionals:**

```javascript
${when(this.state.loading,
    html`<p>Loading...</p>`,
    when(this.state.error,
        html`<p class="error">${this.state.error}</p>`,
        html`<div>${this.state.content}</div>`
    )
)}
```

**Using functions (deferred evaluation):**

```javascript
${when(this.state.user,
    () => html`<p>Welcome, ${this.state.user.name}!</p>`,
    () => html`<p>Please log in</p>`
)}
```

### List Rendering with `each()`

```javascript
import { defineComponent, html, each } from './lib/framework.js';

template() {
    return html`
        <ul>
            ${each(this.state.items, item => html`
                <li>${item.name} - $${item.price}</li>
            `)}
        </ul>
    `;
}
```

**With index:**

```javascript
${each(this.state.items, (item, index) => html`
    <li>${index + 1}. ${item.name}</li>
`)}
```

**With key function (preserves DOM state on reorder):**

```javascript
${each(this.state.items, item => html`
    <li>
        <input type="text" x-model="items[${item.id}].name">
    </li>
`, item => item.id)}  // Key function
```

### Raw HTML with `raw()`

Use only for trusted content:

```javascript
import { raw } from './lib/framework.js';

// SAFE - Server-generated HTML
${raw(this.state.serverRenderedContent)}

// DANGEROUS - Never use with user input!
${raw(this.state.userComment)}  // XSS vulnerability!
```

---

## Event Handling

### Event Binding Syntax

**Always use `on-*` attributes:**

```javascript
<button on-click="handleClick">Click Me</button>
<input on-input="handleInput">
<form on-submit-prevent="handleSubmit">
```

**Available events:**
- `on-click` - Click events
- `on-change` - Change events (inputs, selects)
- `on-input` - Input events (fires on every keystroke)
- `on-submit` - Form submission
- `on-submit-prevent` - Form submission with automatic `preventDefault()`
- `on-mouseenter`, `on-mouseleave` - Mouse hover

### Method References vs Inline Handlers

```javascript
// Method reference (recommended for complex logic)
<button on-click="handleClick">Click</button>

// Inline handler (for simple operations)
<button on-click="${() => this.state.count++}">+1</button>

// Inline with parameters
<button on-click="${() => this.removeItem(item.id)}">Remove</button>
```

### Passing Event Data

```javascript
handleClick(e) {
    console.log('Event target:', e.target);
    console.log('Mouse position:', e.clientX, e.clientY);
}

handleInput(e) {
    console.log('Input value:', e.target.value);
}
```

---

## Component Communication

### Props (Parent to Child)

**Define props with defaults:**

```javascript
defineComponent('user-card', class extends Component {
    static props = {
        name: 'Guest',
        role: 'user',
        isAdmin: false
    };

    template() {
        return html`
            <div class="card">
                <h3>${this.props.name}</h3>
                <p>Role: ${this.props.role}</p>
                ${when(this.props.isAdmin, html`<span class="badge">Admin</span>`)}
            </div>
        `;
    }
});
```

**Pass props from parent:**

```javascript
// In parent component template
<user-card name="${this.state.userName}" role="admin" isAdmin="${true}"></user-card>
```

### Passing Functions and Objects

Arrays, objects, and functions are automatically passed by reference:

```javascript
// Parent component
template() {
    return html`
        <product-list
            items="${this.state.products}"
            onSelect="${this.handleProductSelect}">
        </product-list>
    `;
}
```

### Children Props (Slots)

Components can accept children like React:

```javascript
defineComponent('my-card', class extends Component {
    template() {
        return html`
            <div class="card">
                <div class="card-body">
                    ${this.props.children}
                </div>
            </div>
        `;
    }
});

// Usage
<my-card>
    <h3>Card Title</h3>
    <p>Card content goes here</p>
</my-card>
```

**Named slots:**

```javascript
defineComponent('my-dialog', class extends Component {
    template() {
        const headerSlot = this.props.slots.header || [];
        const footerSlot = this.props.slots.footer || [];

        return html`
            <div class="dialog">
                <div class="dialog-header">${headerSlot}</div>
                <div class="dialog-body">${this.props.children}</div>
                <div class="dialog-footer">${footerSlot}</div>
            </div>
        `;
    }
});

// Usage
<my-dialog>
    <div slot="header">Dialog Title</div>
    <p>Main content</p>
    <div slot="footer">
        <button>OK</button>
        <button>Cancel</button>
    </div>
</my-dialog>
```

### Custom Events (Child to Parent)

**Emit events from child:**

```javascript
defineComponent('color-picker', class extends Component {
    selectColor(color) {
        this.dispatchEvent(new CustomEvent('color-change', {
            bubbles: true,
            detail: { color }
        }));
    }

    template() {
        return html`
            <div>
                <button on-click="${() => this.selectColor('red')}">Red</button>
                <button on-click="${() => this.selectColor('blue')}">Blue</button>
            </div>
        `;
    }
});
```

**Listen in parent:**

```javascript
// In template
<color-picker on-color-change="${(e) => this.handleColorChange(e)}"></color-picker>

// As a method on the component class
handleColorChange(e) {
    this.state.selectedColor = e.detail.color;
}
```

### Refs (Direct DOM Access)

```javascript
defineComponent('my-form', class extends Component {
    focusInput() {
        this.refs.nameInput.focus();
    }

    template() {
        return html`
            <div>
                <input ref="nameInput" type="text" placeholder="Name">
                <button on-click="focusInput">Focus Input</button>
            </div>
        `;
    }
});
```

---

## Lifecycle Hooks

### mounted()

Called after the component is added to the DOM:

```javascript
mounted() {
    // Fetch initial data
    this.loadData();

    // Set up subscriptions
    this.unsubscribe = myStore.subscribe(state => {
        this.state.data = state.data;
    });

    // Start timers
    this._interval = setInterval(() => this.refresh(), 60000);
}
```

### unmounted()

Called before the component is removed. **Critical for cleanup:**

```javascript
unmounted() {
    // Clear timers
    if (this._interval) {
        clearInterval(this._interval);
    }

    // Unsubscribe from stores
    if (this.unsubscribe) {
        this.unsubscribe();
    }

    // Remove global event listeners
    if (this._handleResize) {
        window.removeEventListener('resize', this._handleResize);
    }
}
```

### propsChanged(prop, newValue, oldValue)

Called when a prop changes:

```javascript
propsChanged(prop, newValue, oldValue) {
    if (prop === 'userId' && newValue !== oldValue) {
        this.loadUser(newValue);
    }
}
```

### afterRender()

Called after each render. Use sparingly:

```javascript
// Use only for imperative DOM operations
afterRender() {
    if (this.state.shouldFocus && this.refs.input) {
        this.refs.input.focus();
        this.state.shouldFocus = false;
    }
}
```

---

## Routing

### Basic Setup

```javascript
import { enableRouting } from './lib/router.js';

const outlet = document.querySelector('router-outlet');
const router = enableRouting(outlet, {
    '/': {
        component: 'home-page',
        load: () => import('./pages/home.js')
    },
    '/about/': {
        component: 'about-page',
        load: () => import('./pages/about.js')
    },
    '/users/:id/': {
        component: 'user-profile',
        load: () => import('./pages/user-profile.js')
    }
});
```

**HTML structure:**

```html
<nav>
    <router-link to="/">Home</router-link>
    <router-link to="/about/">About</router-link>
</nav>

<router-outlet></router-outlet>
```

### Route Parameters

```javascript
// Route: /users/:id/
defineComponent('user-profile', class extends Component {
    static props = {
        params: {},  // { id: '123' }
        query: {}    // Query string params
    };

    mounted() {
        this.loadUser(this.props.params.id);
    }

    async loadUser(userId) {
        const response = await fetch(`/api/users/${userId}`);
        this.state.user = await response.json();
    }
});
```

### Query Parameters

```javascript
// URL: /search?q=hello&page=2

defineComponent('search-page', class extends Component {
    static props = {
        params: {},
        query: {}  // { q: 'hello', page: '2' }
    };

    mounted() {
        if (this.props.query.q) {
            this.search(this.props.query.q);
        }
    }
});
```

### Programmatic Navigation

```javascript
import { getRouter } from './lib/router.js';

// Methods on the component class
goToUser(userId) {
    const router = getRouter();
    router.navigate(`/users/${userId}/`);
}

searchWithParams(query) {
    const router = getRouter();
    router.navigate('/search/', { q: query, page: '1' });
}
```

### Lazy Loading

Routes load components on-demand:

```javascript
const router = enableRouting(outlet, {
    '/': {
        component: 'home-page',
        load: () => import('./pages/home.js')  // Loads only when visited
    },
    '/admin/': {
        component: 'admin-page',
        require: 'admin',  // Capability guard
        load: () => import('./pages/admin.js')
    }
});
```

### Authentication Integration

To use capability-based route guards (`require: 'admin'`), you need to connect the router to your authentication system. Here's how:

**Step 1: Create an auth store**

```javascript
// stores/auth.js
import { createStore } from './lib/framework.js';

const authStore = createStore({
    user: null,
    capabilities: [],

    async login(username, password) {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        this.user = data.user;
        this.capabilities = data.capabilities || [];
        return data;
    },

    async logout() {
        await fetch('/api/logout', { method: 'POST' });
        this.user = null;
        this.capabilities = [];
    },

    hasCapability(cap) {
        return this.capabilities.includes(cap);
    }
});

export default authStore;
```

**Step 2: Connect the router to auth**

```javascript
// app.js
import { enableRouting } from './lib/router.js';
import authStore from './stores/auth.js';

const outlet = document.querySelector('router-outlet');
const router = enableRouting(outlet, {
    '/': { component: 'home-page' },
    '/profile/': {
        component: 'profile-page',
        require: 'user'  // Requires 'user' capability
    },
    '/admin/': {
        component: 'admin-page',
        require: 'admin'  // Requires 'admin' capability
    }
}, {
    // Routes with `require` fail closed - denied unless this approves.
    // Passed via options so the initial route is also checked.
    checkCapability: (required) => authStore.state.hasCapability(required),

    // Optional: redirect unauthorized users (default renders the 404 page)
    onUnauthorized: ({ path, require }) => {
        console.log(`Access denied to ${path} - requires: ${require}`);
        router.navigate('/login/');
    }
});
```

**Step 3: Use in components**

```javascript
import authStore from './stores/auth.js';

defineComponent('nav-bar', class extends Component {
    static stores = { auth: authStore };

    template() {
        return html`
            <nav>
                <router-link to="/">Home</router-link>
                ${when(this.stores.auth.user,
                    html`
                        <router-link to="/profile/">Profile</router-link>
                        ${when(this.stores.auth.hasCapability('admin'),
                            html`<router-link to="/admin/">Admin</router-link>`
                        )}
                        <button on-click="${() => this.stores.auth.logout()}">Logout</button>
                    `,
                    html`<router-link to="/login/">Login</router-link>`
                )}
            </nav>
        `;
    }
});
```

**Common capabilities pattern:**

```javascript
// Backend returns capabilities like:
{
    user: { name: 'Alice', email: 'alice@example.com' },
    capabilities: ['user', 'verified', 'admin']  // or just ['user'] for regular users
}
```

---

## State Management with Stores

### Creating a Store

```javascript
import { createStore } from './lib/framework.js';

const counterStore = createStore({
    count: 0,

    // Methods can be added to state
    increment() {
        this.count++;
    },
    decrement() {
        this.count--;
    }
});

export default counterStore;
```

### Using Stores with Auto-Subscribe

The recommended approach - use the `stores` option:

```javascript
import counterStore from './stores/counter.js';

defineComponent('counter-display', class extends Component {
    static stores = {
        counter: counterStore
    };

    template() {
        return html`
            <div>
                <p>Count: ${this.stores.counter.count}</p>
                <button on-click="${() => this.stores.counter.increment()}">+</button>
            </div>
        `;
    }
});
```

### Manual Subscription

For more control:

```javascript
import counterStore from './stores/counter.js';

defineComponent('counter-display', class extends Component {
    constructor(props) {
        super(props);
        this.state = {
            count: 0
        };
    }

    mounted() {
        this.unsubscribe = counterStore.subscribe(state => {
            this.state.count = state.count;
        });
    }

    unmounted() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
});
```

### LocalStorage Persistence

```javascript
import { localStore } from './lib/utils.js';

// Creates a store that auto-syncs to localStorage
const userPrefs = localStore('user-prefs', {
    theme: 'light',
    fontSize: 16
});

// Changes automatically persist
userPrefs.state.theme = 'dark';
```

---

## Static Site Integration

VDX components work seamlessly with static HTML pages, making them perfect for enhancing existing sites or static site generators.

### Using Components in Static HTML

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Static Page</title>
</head>
<body>
    <h1>Welcome to My Site</h1>

    <!-- VDX component embedded in static page -->
    <unit-converter from-unit="gallons" to-unit="liters" initial-value="1"></unit-converter>

    <p>More static content...</p>

    <script type="module">
        import { defineComponent, Component, html } from './dist/framework.js';

        defineComponent('unit-converter', class extends Component {
            static props = {
                fromUnit: 'gallons',
                toUnit: 'liters',
                initialValue: 1
            };

            constructor(props) {
                super(props);
                this.state = {
                    inputValue: 1
                };
            }

            mounted() {
                this.state.inputValue = parseFloat(this.props.initialValue) || 1;
            }

            convert(value) {
                const factors = {
                    'gallons': 3.78541,
                    'liters': 1
                };
                const liters = value * factors[this.props.fromUnit];
                return (liters / factors[this.props.toUnit]).toFixed(4);
            }

            template() {
                return html`
                    <div>
                        <input type="number" x-model="inputValue" step="0.1">
                        <span>${this.props.fromUnit}</span>
                        <span>=</span>
                        <strong>${this.convert(this.state.inputValue)}</strong>
                        <span>${this.props.toUnit}</span>
                    </div>
                `;
            }
        });
    </script>
</body>
</html>
```

### Manipulating Components with Vanilla JavaScript

**Set props directly on the DOM element:**

```javascript
const converter = document.querySelector('unit-converter');

// Set props directly - triggers re-render automatically
converter.fromUnit = 'liters';
converter.toUnit = 'gallons';
converter.initialValue = 5;

// Works with any prop type - strings, numbers, arrays, objects, functions
const list = document.getElementById('countryList');
list.countries = [
    { flag: '🇫🇷', name: 'France' },
    { flag: '🇩🇪', name: 'Germany' }
];
```

### Event Listeners

Components emit standard DOM events:

```javascript
const counter = document.getElementById('myCounter');

counter.addEventListener('count-changed', (e) => {
    console.log('Count changed to:', e.detail.count);
});
```

**Emitting events from components:**

```javascript
defineComponent('event-counter', class extends Component {
    increment() {
        this.state.count++;
        this.dispatchEvent(new CustomEvent('count-changed', {
            bubbles: true,
            detail: { count: this.state.count }
        }));
    }
});
```

### Passing Rich Data

Props can hold any JavaScript value - arrays, objects, and functions. Just define them in your component and set them directly:

```javascript
defineComponent('country-list', class extends Component {
    static props = {
        countries: [],    // Array prop
        title: 'Countries',
        onSelect: null    // Function prop
    };

    template() {
        return html`
            <div>
                <h3>${this.props.title}</h3>
                <ul>
                    ${each(this.props.countries, country => html`
                        <li on-click="${() => this.props.onSelect?.(country)}">
                            ${country.flag} ${country.name}
                        </li>
                    `)}
                </ul>
            </div>
        `;
    }
});
```

**Using from vanilla JavaScript:**

```javascript
const list = document.getElementById('countryList');

// Set props directly on the element - no custom methods needed!
list.countries = [
    { flag: '🇫🇷', name: 'France' },
    { flag: '🇩🇪', name: 'Germany' }
];
list.title = 'European Countries';
list.onSelect = (country) => console.log('Selected:', country.name);
```

**Adding items incrementally:**

```javascript
// Read current value, modify, and reassign
list.countries = [...list.countries, { flag: '🇮🇹', name: 'Italy' }];
```

### Nested Component Hydration

VDX components can be nested inside other components in static HTML:

```html
<collapsible-section title="Interactive Tools">
    <temp-converter initial-fahrenheit="72"></temp-converter>
    <unit-converter from-unit="miles" to-unit="kilometers"></unit-converter>
</collapsible-section>
```

All nested components hydrate automatically - perfect for static site generators like Hugo, Jekyll, or Eleventy.

### JSON Hydration for SSG

For static site generators, you can pass complex data using `json-*` attributes that either contain JSON or reference `<script type="application/json">` elements. The latter avoids HTML attribute escaping issues:

```html
<!-- Component references JSON data by script ID -->
<country-list json-countries="countries-data" title="My Countries"></country-list>

<!-- JSON data in a script tag (easy for SSG templates to generate) -->
<script type="application/json" id="countries-data">
[
    {"flag": "🇫🇷", "name": "France", "capital": "Paris"},
    {"flag": "🇩🇪", "name": "Germany", "capital": "Berlin"},
    {"flag": "🇮🇹", "name": "Italy", "capital": "Rome"}
]
</script>
```

**How it works:**
1. On mount, the framework looks for `json-*` attributes
2. For `json-countries="countries-data"`, it finds `<script id="countries-data">`
3. Parses the JSON and sets `this.props.countries`
4. Removes the `json-*` attribute (script element stays for potential reuse)

**Benefits:**
- No HTML escaping needed for quotes or special characters
- JSON stays formatted and readable in view-source
- Multiple components can share the same data source
- SSG templates can easily output JSON blocks

### Component Boundaries

**Important:** Components are boundaries between vanilla JS and VDX. Don't manipulate DOM inside components externally:

```html
<!-- GOOD: Static page with component islands -->
<header>Static header</header>
<main>
    <p>Static content...</p>
    <unit-converter></unit-converter>  <!-- Component island -->
    <p>More static content...</p>
</main>

<!-- BAD: Don't wrap entire page in a component -->
<site-wrapper>
    <header>...</header>
    <main>...entire site...</main>
</site-wrapper>
```

---

## Advanced Patterns

### Computed Properties

For most derived values, a **class getter** is the simplest option - it's lazy, cached on its
reactive dependencies, and automatically disposed with the component:

```javascript
get remaining() {
    return this.state.items.filter(i => !i.done).length;
}
// ...used in the template as ${this.remaining}
```

(Getters must read only `state`/`stores`/`props` - never refs, DOM measurements, or non-reactive
fields, or the cache goes stale.)

When you need an explicitly managed computed - one you read outside `template()`, or whose lifetime
you control by hand - use the standalone `computed()` function. `computed(getter)` takes a
zero-argument getter (dependencies are tracked automatically) and returns `{ get, dispose }`:

```javascript
import { computed } from './lib/framework.js';

defineComponent('product-list', class extends Component {
    constructor(props) {
        super(props);
        this.state = {
            items: [...],  // 1000 items
            searchQuery: ''
        };
    }

    mounted() {
        // Dependencies (items, searchQuery) are tracked automatically;
        // the getter only re-runs when they change
        this._filteredItems = computed(() => {
            console.log('Computing filtered items...');
            return this.state.items.filter(item =>
                item.name.toLowerCase().includes(this.state.searchQuery.toLowerCase())
            );
        });
    }

    unmounted() {
        if (this._filteredItems) this._filteredItems.dispose();
    }

    template() {
        const filtered = this._filteredItems?.get() ?? [];

        return html`
            <input type="text" x-model="searchQuery" placeholder="Search...">
            <p>${filtered.length} items</p>
            ${each(filtered, item => html`<div>${item.name}</div>`)}
        `;
    }
});
```

### Watch for Side Effects

```javascript
import { watch, reactive } from './lib/framework.js';

mounted() {
    this._unwatch = watch(
        () => this.state.selectedId,
        async (newId, oldId) => {
            if (newId) {
                this.state.details = await this.loadDetails(newId);
            }
        }
    );
}

unmounted() {
    if (this._unwatch) this._unwatch();
}
```

### Async Data with `awaitThen()`

```javascript
import { defineComponent, html, awaitThen } from './lib/framework.js';

defineComponent('user-profile', class extends Component {
    constructor(props) {
        super(props);
        this.state = {
            userPromise: null
        };
    }

    mounted() {
        this.state.userPromise = fetch('/api/user/123').then(r => r.json());
    }

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

### Custom x-model Components

Create components that work with `x-model`:

```javascript
defineComponent('my-slider', class extends Component {
    static props = {
        value: 50,
        min: 0,
        max: 100
    };

    handleInput(e) {
        // Use emitChange helper for x-model compatibility
        this.emitChange(e, parseInt(e.target.value));
    }

    template() {
        return html`
            <input
                type="range"
                value="${this.props.value}"
                min="${this.props.min}"
                max="${this.props.max}"
                on-input="handleInput">
            <span>${this.props.value}</span>
        `;
    }
});

// Usage with x-model
<my-slider x-model="volume" min="0" max="100"></my-slider>
```

---

## Performance Optimization

VDX provides tools to optimize rendering performance for large datasets and complex UIs.

### Array Iteration is O(1)

Large arrays work efficiently by default. Array index access is optimized to track `length` instead of individual indices:

```javascript
// Iterating 2000 items creates 1 dependency, not 2000
each(this.state.songs, song => html`<div>${song.title}</div>`)
```

You no longer need special handling just for array iteration performance.

### Optional: `untracked()` to Skip Proxying

Use `untracked()` when you want to **completely skip reactive proxying** for an object:

```javascript
import { defineComponent, Component, html, untracked } from './lib/framework.js';

defineComponent('song-library', class extends Component {
    constructor(props) {
        super(props);
        this.state = {
            // Skip proxying: 2000 items × 50 properties = expensive
            songs: untracked([]),
            // Normal reactivity for simple values
            currentIndex: 0
        };
    }

    loadSongs(newSongs) {
        // Reassign to trigger update (items aren't individually reactive)
        this.state.songs = newSongs;
    }
});
```

**When to use `untracked()`:**
- Large arrays where items have many properties you never read individually
- Third-party objects with custom getters/proxies (avoid double-proxying)
- Immutable API responses where you replace the whole object on change

**When NOT to use:**
- Normal arrays - iteration is already O(1)
- Objects where you need `item.property = value` to trigger updates

### Memoized Lists with `memoEach()`

For large lists or expensive item rendering, use `memoEach()` to cache rendered templates:

```javascript
import { defineComponent, Component, html, memoEach } from './lib/framework.js';

defineComponent('playlist-view', class extends Component {
    constructor(props) {
        super(props);
        this.state = {
            songs: []
        };
    }

    template() {
        return html`
            <div class="playlist">
                ${memoEach(this.state.songs, song => html`
                    <div class="song-item">
                        <span class="title">${song.title}</span>
                        <span class="artist">${song.artist}</span>
                        <button on-click="${() => this.playSong(song)}">Play</button>
                    </div>
                `, song => song.uuid)}
            </div>
        `;
    }
});
```

**How it works:**
- Caches rendered templates per item key
- Only re-renders items where the item reference changed
- Cache is automatically scoped to the component
- Stale cache entries are cleaned up when items leave the array

**The key function is required** - it tells `memoEach()` how to identify each item uniquely.

### Virtual Scroll with cl-virtual-list

For very large lists (1000+ items), use the `cl-virtual-list` component:

```javascript
import { defineComponent, Component, html } from './lib/framework.js';

defineComponent('song-list', class extends Component {
    constructor(props) {
        super(props);
        this.state = {
            songs: []  // Array iteration is O(1), no special handling needed
        };
    }

    handleSelect(e) {
        console.log('Selected:', e.detail.item);
    }

    getItemKey(item) {
        return item.id;
    }

    template() {
        return html`
            <!-- Self-scrolling (component has its own scrollbar) -->
            <cl-virtual-list
                items="${this.state.songs}"
                itemHeight="60"
                height="400px"
                keyFn="${this.getItemKey}"
                selectable="true"
                on-select="handleSelect">
            </cl-virtual-list>

            <!-- Or track parent scroll for full-page lists -->
            <cl-virtual-list
                items="${this.state.songs}"
                itemHeight="60"
                scrollContainer="parent"
                keyFn="${this.getItemKey}">
            </cl-virtual-list>
        `;
    }
});
```

**scrollContainer options:**
- `"self"` (default) - Component has its own scrollbar
- `"parent"` - Tracks nearest scrollable parent
- `"window"` - Tracks window/document scroll
- CSS selector - Tracks a specific element

The `cl-virtual-list` component automatically uses `memoEach()` and `rafThrottle()` for optimal performance. See [componentlib.md](componentlib.md#cl-virtual-list) for full documentation.

### Reactive Boundaries (Critical)

Templates re-evaluate as a single unit - you can't track individual `${}` slots separately. This is a fundamental limitation of JavaScript tagged template literals.

**The Problem:**

```javascript
// ❌ ANTIPATTERN: High-frequency updates in large templates
// Every currentTime update (e.g., every 100ms) re-evaluates the ENTIRE template
template() {
    return html`
        <div class="time">${this.stores.player.currentTime}</div>
        ${memoEach(this.state.songs, song => html`
            <div class="song">${song.title}</div>
        `, song => song.uuid)}
    `;
}
```

Even though `memoEach()` caches the rendered items, the template function itself runs on every `currentTime` update. For a list of 1000 songs, this means iterating 1000 items 10 times per second - causing UI jank.

**The Solution: Reactive Boundaries**

Use `contain()` to isolate high-frequency updates:

```javascript
// ✅ CORRECT: Isolate high-frequency updates with contain()
template() {
    return html`
        ${contain(() => html`<div class="time">${this.stores.player.currentTime}</div>`)}
        ${memoEach(this.state.songs, song => html`
            <div class="song">${song.title}</div>
        `, song => song.uuid)}
    `;
}
```

Now `currentTime` updates only run the small `contain()` callback, not the entire template.

**Other reactive boundary options:**

```javascript
// Child components naturally isolate updates
<player-time store="${this.stores.player}"></player-time>  // Isolated
${memoEach(this.state.songs, ...)}  // Not affected by player-time's updates
```

**Note:** `when()` and `each()` do NOT create boundaries by default - they work like regular JavaScript. Use `contain()` explicitly when you need isolation, or use `opt()`/`optimize.js` to wrap expressions automatically.

**The Rule:** If a template has both high-frequency updates AND expensive content, use `contain()` to isolate the high-frequency part.

### Automatic Fine-Grained Reactivity with opt()

Instead of manually wrapping each expression with `contain()`, you can use `opt()` to automatically wrap ALL template expressions:

```javascript
import { defineComponent, Component, html, when, each } from './lib/framework.js';
import { opt } from './lib/opt.js';

class MusicPlayer extends Component {
    static stores = { player: playerStore };

    constructor(props) {
        super(props);
        this.state = { songs: [] };
    }
}

// opt() transforms a function's source to wrap every ${...} expression in
// contain() automatically. It returns a plain function, so assign the eval'd
// result to the prototype's template (eval runs once here, at module load).
MusicPlayer.prototype.template = eval(opt(function() {
    return html`
        <div class="player">
            <!-- Each expression is isolated - no manual contain() needed -->
            <div class="time">${this.stores.player.currentTime}</div>
            <div class="title">${this.stores.player.currentSong?.title}</div>

            ${each(this.state.songs, song => html`
                <div class="song">${song.title}</div>
            `)}
        </div>
    `;
}));

defineComponent('music-player', MusicPlayer);
```

For class components, the **build-time optimizer** (below) is usually the cleaner choice - it
applies the same fine-grained wrapping to ordinary `template()` methods with no `eval()` at all.

**What opt() does:**
- Transforms `${this.state.count}` to `${html.contain(() => this.state.count)}`
- Skips expressions that are already optimized: `when()`, `each()`, `memoEach()`, `contain()`, `raw()`
- Skips arrow functions (event handlers) and slot references

**When to use opt():**
- Components with many independent reactive values
- High-frequency updates (timers, animations, real-time data)
- Large templates where you'd otherwise need many `contain()` calls

**CSP Note:** `opt()` requires `eval()`, so your Content Security Policy must allow `'unsafe-eval'`. For strict CSP environments, use manual `contain()` calls.

### Build-Time Optimizer

For production builds, use `optimize.js` to apply opt() transformations at build time, eliminating the need for `eval()`:

```bash
# Copy and optimize all files
node optimize.js --input ./src --output ./dist

# With minification and source maps
node optimize.js -i ./src -o ./dist --minify --sourcemap

# Only optimize templates wrapped in eval(opt())
node optimize.js -i ./src -o ./dist --wrapped-only
```

**What the optimizer does:**
- Transforms ALL `html`` ` templates to use fine-grained reactivity (by default)
- Strips existing `eval(opt())` calls (they become redundant)
- Optionally minifies code with source maps
- Copies non-JS files as-is

**The `--wrapped-only` option** only transforms templates explicitly wrapped in `eval(opt())`, leaving other templates unchanged. Useful for incremental adoption.

### Linting and Auto-Fix

The optimizer includes lint and auto-fix modes to detect and fix early dereference issues:

```bash
# Lint-only mode - check for issues without modifying files
node optimize.js --lint-only -i ./src

# Auto-fix simple issues in-place
node optimize.js --auto-fix -i ./src

# Preview auto-fix changes without writing (dry-run)
node optimize.js --auto-fix --dry-run -i ./src
```

**Issue categories:**
- **Fixable** - Simple dereferences like `const x = this.state.y` that the optimizer or `--auto-fix` can automatically replace with `this.state.y`
- **Unfixable** - Computed expressions like `const x = this.state.y + 2` or method calls that access state - these require manual refactoring

**Example auto-fix output:**
```diff
--- my-component.js
+++ my-component.js (auto-fixed)
@@ line 42 @@
-                ${when(count > 0, html`...`)}
+                ${when(this.state.count > 0, html`...`)}
```

### Critical: Avoid Early Dereference

When using `contain()`, `opt()`, or the optimizer, reactive state **must be accessed inside the template**, not before it:

```javascript
// ❌ BAD - Variable evaluated before contain(), loses reactivity
template() {
    const count = this.state.count;        // Accessed HERE
    const user = this.stores.auth.user;    // Accessed HERE

    return html`
        <p>Count: ${count}</p>             <!-- Won't update! -->
        <p>User: ${user.name}</p>          <!-- Won't update! -->
    `;
}

// ✅ GOOD - Reactive access inside template
template() {
    return html`
        <p>Count: ${this.state.count}</p>  <!-- Updates correctly -->
        <p>User: ${this.stores.auth.user.name}</p>
    `;
}
```

**For computed values, use class getters:**

```javascript
get doubled() {
    return this.state.count * 2;
}

get fullName() {
    return `${this.state.firstName} ${this.state.lastName}`;
}

template() {
    // Getters are cached computed properties, re-read inside the reactive
    // boundary - so their state access stays tracked
    return html`
        <p>${this.doubled}</p>
        <p>${this.fullName}</p>
    `;
}
```

**Why this matters:** When `opt()` transforms `${count}` to `${html.contain(() => count)}`, the closure captures the variable's *value*, not the reactive path. With no reactive access inside the closure, it never re-runs.

**Same applies to when()/each() function callbacks** (they also create reactive boundaries):

```javascript
// ❌ BAD - isAdmin captured before callback
const isAdmin = this.stores.auth.isAdmin;
${when(isAdmin, () => html`<admin-panel></admin-panel>`)}

// ✅ GOOD - Access inside callback
${when(this.stores.auth.isAdmin, () => html`<admin-panel></admin-panel>`)}
```

**Note:** This doesn't apply to `memoEach()`'s external state pattern, where capturing values outside is intentional. See [templates.md](templates.md) for details.

### Performance Tips Summary

| Technique | Use When | Benefit |
|-----------|----------|---------|
| `opt()` | Many reactive expressions in one template | Auto-wraps all expressions |
| `contain()` | High-frequency updates mixed with expensive content | Isolates update scope |
| `memoEach()` | Expensive item templates | Caches rendered items |
| `rafThrottle()` | Scroll/resize handlers | Limits to 60fps max |
| `cl-virtual-list` | Lists with 500+ items | Only renders visible items |
| `untracked()` | Objects with many unused properties | Skips reactive proxying entirely |
| `optimize.js` | Production builds | Build-time opt() without eval() |

**Note:** Array iteration and `sort()`/`reverse()` are optimized automatically - no special handling needed.

---

## Best Practices

### 1. Keep Components Focused

Each component should do one thing well:

```javascript
// GOOD: Focused components
<user-avatar user="${this.state.user}"></user-avatar>
<user-info user="${this.state.user}"></user-info>

// BAD: Monolithic component
<user-everything user="${this.state.user}" showAvatar showInfo showPosts showComments></user-everything>
```

### 2. Always Clean Up

```javascript
mounted() {
    this._timer = setInterval(() => this.refresh(), 5000);
    this._unsubscribe = store.subscribe(s => this.state.data = s);
}

unmounted() {
    clearInterval(this._timer);
    this._unsubscribe();
}
```

### 3. Use x-model for Forms

```javascript
// GOOD: Concise
<input type="text" x-model="username">

// VERBOSE: Manual binding
<input type="text" value="${this.state.username}"
       on-input="${(e) => this.state.username = e.target.value}">
```

### 4. sort() and reverse() Are Safe

These methods are made atomic automatically:

```javascript
// ✅ This is now safe - made atomic automatically
template() {
    const sorted = this.state.items.sort((a, b) => a.name.localeCompare(b.name));
}
```

### 5. Use `when()` for Conditionals

```javascript
// GOOD
${when(this.state.loading, html`<spinner>`, html`<content>`)}

// BAD: Ternaries are harder to read
${this.state.loading ? html`<spinner>` : html`<content>`}
```

### 6. Validate User Input

```javascript
async handleSubmit(e) {
    e.preventDefault();

    const email = this.state.email.trim();
    if (!this.isValidEmail(email)) {
        notify('Invalid email', 'error');
        return;
    }

    await this.saveEmail(email);
}

isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

### 7. Handle Errors Gracefully

```javascript
async loadData() {
    try {
        this.state.loading = true;
        const response = await fetch('/api/data');
        this.state.data = await response.json();
    } catch (error) {
        console.error('Failed to load:', error);
        notify('Failed to load data', 'error');
        this.state.data = [];
    } finally {
        this.state.loading = false;
    }
}
```

### 8. Use Stores for Shared State

```javascript
// auth-store.js
export const authStore = createStore({
    user: null,
    isAuthenticated: false,

    async login(credentials) { ... },
    async logout() { ... }
});

// Any component can subscribe
static stores = { auth: authStore };
```

---

## The Legacy Options Format

Before class components, VDX components were authored as a plain **options object** passed to
`defineComponent`. This format is still fully supported - class components are translated into it
internally - so you'll encounter it in older code and examples. It's worth being able to read.

The same counter from [Your First Component](#your-first-component), written the old way:

```javascript
import { defineComponent, html } from './lib/framework.js';

export default defineComponent('my-counter', {
    data() {                       // -> constructor(props) { super(props); this.state = ... }
        return { count: 0 };
    },
    methods: {                     // -> plain class methods
        increment() { this.state.count++; },
        decrement() { this.state.count--; }
    },
    computed: {                    // -> get accessors
        doubled() { return this.state.count * 2; }
    },
    template() {
        return html`
            <h2>${this.state.count} (doubled: ${this.doubled})</h2>
            <button on-click="decrement">-</button>
            <button on-click="increment">+</button>
        `;
    }
});
```

The mapping to class components is mechanical:

| Options format | Class format |
|----------------|--------------|
| `data() { return {...} }` | `constructor(props) { super(props); this.state = {...} }` |
| `methods: { foo() {...} }` | `foo() {...}` (class method) |
| `computed: { bar() {...} }` | `get bar() {...}` |
| `props: {...}` / `stores: {...}` / `styles: ...` | `static props` / `static stores` / `static styles` |
| `template()` / `mounted()` / `unmounted()` / ... | same-named class methods |

One semantic difference matters: options-format `data()` runs at element construction, **before**
prop values arrive, so it only ever sees prop *defaults*. A class `constructor(props)` runs at first
connect, **after** attributes are parsed, so it sees the *real* prop values and can copy them into
state directly. See [docs/components.md](components.md) for the full class-component reference, and
`scripts/convert-to-class.mjs` for a codemod that converts options components mechanically.

---

## Next Steps

- Explore the [Component Library](/site/showcase/) for pre-built UI components
- Check out the [Static Integration Demo](/site/embedding/static-integration-demo.html) for embedding examples
- Read the [API Reference](api-reference.md) for complete documentation
- Browse the [Test Suite](/tests/framework/) to see comprehensive examples
- Study the [E-commerce Shop](/examples/shop/) for a full application example

---

## Summary

VDX provides a modern development experience without the complexity:

| Feature | VDX Syntax |
|---------|-----------|
| Reactive state | `this.state.count++` |
| Two-way binding | `x-model="fieldName"` |
| Event handling | `on-click="methodName"` |
| Conditionals | `when(condition, then, else)` |
| Lists | `each(array, item => html\`...\`)` |
| Memoized lists | `memoEach(array, fn, keyFn)` |
| Sets/Maps | `new Set()`, `new Map()` (auto-reactive) |
| Props | `static props = { name: 'default' }` |
| Children | `this.props.children` |
| Lifecycle | `mounted()`, `unmounted()` |
| Computed | `get fullName() { ... }` |
| Stores | `static stores = { name: store }` |

**Key principles:**
1. Zero dependencies - runs directly in browsers
2. No build step - just refresh and go
3. Familiar patterns - feels like Vue/React
4. Security first - automatic XSS protection
5. Works anywhere - embed in any page

Happy coding!
