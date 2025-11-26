# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a web application that uses a **custom zero-dependency vanilla JavaScript framework** (in `/app/`) as a replacement for the original Svelte implementation (in `/src/`). The application is a client for the SWAPI (Simple Web API) server with authentication, various tools (password generators, remote control, location tool, home automation), and supports both modern browsers and legacy browsers with polyfills.

## Custom Framework (`/app/` directory)

The `/app/` directory contains a completely custom web framework built from scratch with zero dependencies. **All new development should use this framework, NOT Svelte.**

### Framework Architecture

- **Zero npm dependencies** - Pure vanilla JavaScript, vendored Preact, no npm packages
- **Reactive state management** - Vue 3-style proxy-based reactivity
- **Web Components** - Built on native Custom Elements API
- **Preact rendering** - Vendored Preact (~4KB) for efficient DOM reconciliation
- **Template compilation** - Innovative compile-once system: `html`` → compile → Preact VNode → render`
- **Router** - Hash-based and HTML5 routing with capability checks
- **Stores** - Reactive stores with localStorage persistence
- **Template system** - Tagged template literals with helpers (`html`, `when`, `each`, `raw`)

### Project Structure

```
app/
├── core/                    # Framework core (~3000 lines)
│   ├── component.js         # Component definition system
│   ├── reactivity.js        # Reactive proxy system
│   ├── template.js          # Template helpers (html, when, each, raw)
│   ├── template-compiler.js # Template → Preact VNode compiler
│   ├── router.js            # Routing system
│   ├── store.js             # State management
│   ├── utils.js             # Utility functions (notify, darkTheme, etc.)
│   ├── app-header.js        # App header component
│   └── x-page.js            # Page wrapper component
├── vendor/
│   └── preact/              # Vendored Preact 10.x (~4KB, no npm!)
├── components/              # Reusable UI components
│   ├── icon.js
│   ├── select-box.js
│   ├── lazy-select-box.js
│   ├── tiles.js
│   └── notification-list.js
├── auth/                    # Authentication system
├── apps/                    # Application modules (pwgen, etc.)
├── hremote-app/             # Home remote control
├── playground/              # Interactive framework demos
├── styles/                  # Global CSS
│   └── global.css
└── tests/                   # Comprehensive unit tests (125 tests)
```

## Component Development

### ✅ CORRECT Component Pattern

```javascript
import { defineComponent } from './core/component.js';
import { html, when, each } from './core/template.js';

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

    // Lifecycle: called after component is added to DOM
    mounted() {
        this.loadData();
    },

    // Lifecycle: called after each render
    // ⚠️ Often unnecessary with Preact - use only when needed for DOM manipulation
    afterRender() {
        // Use only for: imperative DOM APIs, third-party library integration
        // NOT for: syncing values (Preact handles this), event binding (use on-*)
    },

    // Lifecycle: called before component is removed
    unmounted() {
        // Cleanup subscriptions, timers
    },

    // Methods accessible via this.methodName()
    methods: {
        async loadData() {
            this.state.items = await fetchData();
        },

        handleClick(e) {
            e.preventDefault();
            this.state.message = 'Clicked!';
        }
    },

    // Template using tagged template literals
    template() {
        return html`
            <div class="container">
                <h1>${this.props.title}</h1>
                <p>${this.state.message}</p>
                <button on-click="handleClick">Click Me</button>
            </div>
        `;
    },

    // Scoped styles (using component tag name prefix)
    styles: `
        .container {
            padding: 20px;
        }

        /* Styles are automatically scoped to component tag name */
        button {
            background: #007bff;
            color: white;
        }
    `
});
```

## Rendering Architecture: Preact Integration

**How it works:**

1. **Template Compilation** - `html`` templates are compiled once to an AST structure
2. **Value Application** - On each render, values are applied to create Preact VNodes
3. **Preact Reconciliation** - Preact efficiently updates the real DOM

```javascript
// Template compiled once when first rendered ✓
const template = html`<div>${this.state.count}</div>`;

// On re-render: apply new values → Preact VNode → Preact reconciles DOM
```

**Why Preact?**
- **Battle-tested** - Used in production by thousands of sites
- **Tiny** - Only ~4KB gzipped, vendored (no npm needed)
- **Efficient** - Highly optimized reconciliation algorithm
- **Zero build** - No JSX transform, no bundler

The innovative part is the **template compilation system** that converts `html`` templates to Preact VNodes efficiently without JSX or a build step.

## Event Binding - CRITICAL

### ✅ ALWAYS Use on-* Attributes

**NEVER use inline onclick or addEventListener in templates!** Always use the framework's `on-*` event binding:

```javascript
template() {
    return html`
        <button on-click="handleClick">Click</button>
        <form on-submit-prevent="handleSubmit">
            <input type="text" on-change="handleChange">
            <select on-change="handleSelect">
                <option>Option 1</option>
            </select>
        </form>
        <div on-mouseenter="handleHover" on-mouseleave="handleLeave">
            Hover me
        </div>
    `;
}
```

**Available event bindings:**
- `on-click` - Click events
- `on-change` - Change events
- `on-submit` - Form submission (you must call `e.preventDefault()`)
- `on-submit-prevent` - Form submission with automatic `preventDefault()`
- `on-mouseenter`, `on-mouseleave` - Mouse events
- `on-input` - Input events

### ❌ NEVER Do This

```javascript
// ❌ WRONG - Don't use inline handlers
template() {
    return html`<button onclick="handleClick()">Click</button>`;
}

// ❌ WRONG - Don't use addEventListener in templates
afterRender() {
    this.querySelector('button').addEventListener('click', this.handleClick);
}
```

## Passing Props to Child Components

### ✅ Automatic Object/Function Passing for Custom Elements

The framework **automatically** passes objects, arrays, and functions to custom elements (Web Components) without stringification. Just use regular `${}` interpolation:

```javascript
template() {
    return html`
        <!-- ✅ CORRECT - Arrays/objects/functions passed automatically -->
        <x-select-box
            options="${this.state.lengthOptions}"
            value="${this.state.length}"
            on-change="handleChange">
        </x-select-box>

        <!-- ✅ Functions work too! -->
        <virtual-list
            items="${this.state.items}"
            renderItem="${this._boundRenderItem}">
        </virtual-list>
    `;
}
```

**How it works:**
- Framework detects custom elements (tags with hyphens like `x-select-box`)
- For custom element attributes, objects/arrays/functions are passed by reference automatically
- For native HTML elements (`<input>`, `<div>`, etc.), values are converted to strings as normal
- You can pass any JavaScript expression: `"${this.state.items.filter(x => x.active)}"`

### Examples

```javascript
methods: {
    handleItemRender(item, index) {
        return html`<div>${item.name}</div>`;
    }
},

template() {
    return html`
        <!-- Custom elements: objects/functions passed automatically -->
        <x-select-box options="${this.state.options}"></x-select-box>
        <my-list items="${this.getFilteredItems()}"></my-list>
        <data-table rows="${this.state.rows}" config="${{ sortable: true }}"></data-table>

        <!-- Methods are auto-bound - just pass them directly! -->
        <virtual-list items="${this.state.items}" renderItem="${this.handleItemRender}"></virtual-list>

        <!-- Native HTML: values converted to strings -->
        <input value="${this.state.username}">
        <div data-count="${this.state.count}"></div>
    `;
}
```

**Important:** Methods are **automatically bound** to the component instance in the constructor. Just pass them directly like `this.methodName` - no manual binding needed!

### ❌ Don't Use JSON.stringify or Manual Binding

```javascript
// ❌ WRONG - Don't stringify (framework does it automatically)
<x-select-box options="${JSON.stringify(this.state.options)}">

// ❌ WRONG - Don't manually bind (methods are already bound!)
mounted() {
    this._boundRender = this.handleRender.bind(this);
}

// ✅ CORRECT - Just pass the method directly
template() {
    return html`
        <virtual-list renderItem="${this.handleRender}">
    `;
}

// ❌ WRONG - Don't manually set props in afterRender
afterRender() {
    this.querySelector('x-select-box').props.options = this.state.options;
}
```

## Template Helpers

### `html` - Tagged Template Literal

Main template function - automatically escapes content:

```javascript
template() {
    return html`<div>${this.state.userInput}</div>`;
}
```

### `when()` - Conditional Rendering

**Always use `when()` instead of ternaries:**

```javascript
// ✅ CORRECT
${when(this.state.isLoggedIn,
    html`<p>Welcome!</p>`,
    html`<p>Please log in</p>`
)}

// ❌ WRONG
${this.state.isLoggedIn ? html`<p>Welcome!</p>` : html`<p>Log in</p>`}
```

### `each()` - List Rendering

```javascript
${each(this.state.items, item => html`
    <li>${item.name}</li>
`)}
```

### `raw()` - Unsafe HTML

Only use for trusted, sanitized content:

```javascript
${raw(this.state.trustedHtmlContent)}
```

## Two-Way Data Binding with `x-model`

**`x-model` provides automatic two-way data binding for form inputs** - a feature that even React doesn't have! It automatically handles value binding and change events based on the input type.

### Basic Usage

Simply add `x-model="propertyName"` to any input element:

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
        <input type="number" x-model="age">
        <input type="checkbox" x-model="agreed">
    `;
}
```

That's it! The framework automatically:
- Binds the correct attribute (`value` or `checked`)
- Sets up the correct event listener (`input` or `change`)
- Updates `this.state.propertyName` when the input changes
- Re-renders when state changes

### Supported Input Types

#### Text Inputs (text, email, password, url, etc.)
```javascript
<input type="text" x-model="name">
<input type="email" x-model="email">
<textarea x-model="message"></textarea>
```
- Binds to `value` attribute
- Listens to `input` event
- Stores as string

#### Number and Range Inputs
```javascript
<input type="number" x-model="count" min="1" max="100">
<input type="range" x-model="volume" min="0" max="10">
```
- Binds to `value` attribute
- Listens to `input` event
- **Automatically converts to number** using `valueAsNumber`
- Falls back to string if value is invalid

#### Checkboxes
```javascript
<input type="checkbox" x-model="agreed">
<input type="checkbox" x-model="receiveNewsletter">
```
- Binds to `checked` attribute
- Listens to `change` event
- Stores as boolean (`true`/`false`)

#### Radio Buttons
```javascript
<input type="radio" name="size" value="small" x-model="selectedSize">
<input type="radio" name="size" value="medium" x-model="selectedSize">
<input type="radio" name="size" value="large" x-model="selectedSize">
```
- Binds to `checked` attribute
- Listens to `change` event
- Stores the `value` of the selected radio button
- All radios should use the same state property

#### Select Dropdowns
```javascript
<select x-model="country">
    <option value="us">United States</option>
    <option value="uk">United Kingdom</option>
    <option value="ca">Canada</option>
</select>
```
- Binds to `value` attribute
- Listens to `input` event
- Stores selected option's value

#### File Inputs
```javascript
<input type="file" x-model="uploadedFiles">
<input type="file" multiple x-model="uploadedFiles">
```
- No value binding (can't set file input values)
- Listens to `change` event
- Stores `FileList` object in state
- Access files with `this.state.uploadedFiles[0]`, etc.

### Complete Example

```javascript
export default defineComponent('registration-form', {
    data() {
        return {
            username: '',
            email: '',
            age: 18,
            country: 'us',
            newsletter: false,
            plan: 'free',
            bio: ''
        };
    },

    methods: {
        async handleSubmit(e) {
            e.preventDefault();

            console.log('Form data:', {
                username: this.state.username,
                email: this.state.email,
                age: this.state.age,          // Already a number!
                country: this.state.country,
                newsletter: this.state.newsletter,  // Already a boolean!
                plan: this.state.plan,
                bio: this.state.bio
            });

            // All values are ready to send - no parsing needed!
            await api.register(this.state);
        }
    },

    template() {
        return html`
            <form on-submit-prevent="handleSubmit">
                <div>
                    <label>Username: <input type="text" x-model="username"></label>
                </div>

                <div>
                    <label>Email: <input type="email" x-model="email"></label>
                </div>

                <div>
                    <label>Age: <input type="number" x-model="age" min="13" max="120"></label>
                </div>

                <div>
                    <label>Country:
                        <select x-model="country">
                            <option value="us">United States</option>
                            <option value="uk">United Kingdom</option>
                            <option value="ca">Canada</option>
                        </select>
                    </label>
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
                    <label><input type="radio" name="plan" value="enterprise" x-model="plan"> Enterprise</label>
                </div>

                <div>
                    <label>Bio: <textarea x-model="bio"></textarea></label>
                </div>

                <button type="submit">Register</button>
            </form>
        `;
    }
});
```

### x-model vs Manual Binding

**Without x-model** (verbose):
```javascript
<input
    type="text"
    value="${this.state.username}"
    on-input="${(e) => { this.state.username = e.target.value; }}">
```

**With x-model** (concise):
```javascript
<input type="text" x-model="username">
```

### Benefits

1. **Concise**: One attribute instead of two
2. **Type-safe**: Automatic type conversion for numbers
3. **Smart**: Uses correct attribute and event for each input type
4. **Less error-prone**: No need to remember `value` vs `checked`, `input` vs `change`
5. **Better DX**: Feels like Vue/Svelte but works without a build step

### When NOT to Use x-model

Use manual binding if you need:
- **Value transformation**: `on-input="${(e) => { this.state.price = parseFloat(e.target.value) * 1.1; }}"`
- **Validation**: Check value before updating state
- **Debouncing**: Delay state updates
- **Custom logic**: Any processing beyond simple assignment

```javascript
// Manual binding for custom logic
<input
    type="text"
    value="${this.state.search}"
    on-input="${(e) => {
        const value = e.target.value.trim().toLowerCase();
        if (value.length >= 3) {
            this.state.search = value;
            this.performSearch();
        }
    }}">
```

### Using x-model with Custom Components

**`x-model` now works with custom components!** Your custom component just needs to:

1. Accept a `value` prop
2. Emit a `change` event with the new value in `event.detail.value`

**Example: Creating a reusable input component**

```javascript
export default defineComponent('my-input', {
    props: {
        value: '',
        placeholder: ''
    },

    methods: {
        handleInput(e) {
            // Use emitChange helper - handles stopPropagation, prop update, and CustomEvent
            this.emitChange(e, e.target.value);
        }
    },

    template() {
        return html`
            <input
                type="text"
                value="${this.props.value}"
                placeholder="${this.props.placeholder}"
                on-input="handleInput">
        `;
    }
});
```

**The `emitChange()` helper** handles all the boilerplate for you:
- Calls `e.stopPropagation()` to prevent native event leakage
- Updates `this.props.value` with the new value
- Dispatches a CustomEvent with `detail: { value }` and proper bubbling

**Manual approach** (if you need custom behavior):
```javascript
handleInput(e) {
    e.stopPropagation();  // Stop native event
    this.props.value = e.target.value;  // Update prop
    this.dispatchEvent(new CustomEvent('change', {
        bubbles: true,
        composed: true,
        detail: { value: e.target.value }
    }));
}
```

**Using it with x-model:**

```javascript
template() {
    return html`
        <form>
            <!-- Simple! The framework handles the rest -->
            <my-input x-model="username" placeholder="Enter username"></my-input>
            <p>You typed: ${this.state.username}</p>
        </form>
    `;
}
```

**What happens behind the scenes:**

1. Framework binds `value` prop to `this.state.username`
2. Framework listens for `change` events
3. When `change` fires, framework reads `e.detail.value` and updates `this.state.username`
4. Component re-renders with new value

**Important notes:**

- For custom components, the framework uses the `change` event (not `input`). This follows the convention that `change` events signal completed changes, while `input` events signal ongoing typing.
- **Use `this.emitChange(e, value)`** to emit change events - this helper automatically handles event propagation stopping, prop updates, and CustomEvent creation.
- Parent components should only receive your CustomEvent with `e.detail.value`, never the underlying native events.

## State Management

### Reactive State

State changes automatically trigger re-renders:

```javascript
data() {
    return {
        count: 0
    };
},

methods: {
    increment() {
        this.state.count++; // Auto re-renders
    }
}
```

### ⚠️ CRITICAL: Array Mutations and Infinite Loops

**NEVER mutate reactive arrays with methods like `.sort()`** - This causes infinite re-render loops!

```javascript
// ✅ CORRECT - Create a copy before sorting
getSortedItems() {
    return [...this.state.items].sort((a, b) => a.time - b.time);
}

// ❌ WRONG - Mutates reactive array, triggers re-render loop!
getSortedItems() {
    return this.state.items.sort((a, b) => a.time - b.time);  // INFINITE LOOP!
}
```

**Why?** When you call `.sort()` on a reactive array during rendering:
1. Sort mutates the array
2. Mutation triggers reactivity
3. Reactivity triggers re-render
4. Re-render calls your method again
5. Loop repeats forever → Stack overflow

**Safe methods** (return new arrays): `.filter()`, `.map()`, `.slice()`
**Unsafe methods** (mutate in place): `.sort()`, `.reverse()`, `.splice()`

### ⚠️ CRITICAL: Sets and Maps

**Sets and Maps are NOT reactive!** Must reassign to trigger updates:

```javascript
// ✅ CORRECT
addItem(item) {
    const newSet = new Set(this.state.items);
    newSet.add(item);
    this.state.items = newSet;
}

// ❌ WRONG - Won't trigger re-render
addItem(item) {
    this.state.items.add(item);
}
```

### Stores

Always call methods on `store.state`, not the original object:

```javascript
import login from './auth/auth.js';

// ✅ CORRECT
async mounted() {
    this.unsubscribe = login.subscribe(state => {
        this.state.user = state.user;
    });
}

async logoff() {
    await login.state.logoff(); // Call on .state!
}

unmounted() {
    if (this.unsubscribe) this.unsubscribe();
}
```

## Form Handling Pattern

```javascript
template() {
    return html`
        <form on-submit-prevent="handleSubmit">
            <input type="text" id="username" value="${this.state.username}">
            <input type="submit" value="Submit">
        </form>
    `;
},

methods: {
    async handleSubmit(e) {
        // preventDefault already called by on-submit-prevent
        const input = this.querySelector('#username');
        this.state.username = input.value;

        await this.saveData();
    }
}

// ✅ No afterRender() needed! Preact handles value syncing automatically
```

**For select dropdowns**, use `value` attribute and let Preact handle syncing:

```javascript
template() {
    return html`
        <select on-change="handleChange" value="${this.state.selected}">
            <option value="opt1">Option 1</option>
            <option value="opt2">Option 2</option>
        </select>
    `;
},

methods: {
    handleChange(e) {
        this.state.selected = e.target.value;
    }
}
```

## Router

Routes are defined in `app.js`:

```javascript
const router = new Router({
    '/': {
        component: 'home-page'
    },
    '/admin/': {
        component: 'admin-page',
        require: 'admin'  // Capability check
    }
});
```

Use `router-link` for navigation:

```javascript
<router-link to="/about/">About</router-link>
```

## Dark Theme

```javascript
import { darkTheme } from './core/utils.js';

// Toggle
darkTheme.update(s => ({ enabled: !s.enabled }));

// In styles
styles: `
    :host-context(body.dark) .element {
        background: #333;
        color: #ccc;
    }
`
```

## Notifications

```javascript
import { notify } from './core/utils.js';

methods: {
    async save() {
        try {
            await this.saveData();
            notify('Saved!', 'info', 3); // message, severity, seconds
        } catch (error) {
            notify('Error!', 'error', 5);
        }
    }
}
```

## Testing

Located in `/app/tests/`. Tests auto-run on page load.

```javascript
import { describe, assert } from './test-runner.js';

describe('My Tests', function(it) {
    it('does something', async () => {
        const result = await doSomething();
        assert.equal(result, expected, 'Should match');
    });
});
```

## Common Patterns

### Loading Data

```javascript
data() {
    return {
        items: [],
        loading: false
    };
},

async mounted() {
    this.state.loading = true;
    try {
        const response = await fetch('/api/items');
        this.state.items = await response.json();
    } catch (error) {
        console.error('Failed to load:', error);
    } finally {
        this.state.loading = false;
    }
}
```

### Select Boxes with Custom Components

Use inline event handlers - no afterRender() needed:

```javascript
template() {
    return html`
        <x-select-box
            value="${this.state.selected}"
            options="${this.state.options}"
            on-change="${(e) => { this.state.selected = e.detail.value; }}">
        </x-select-box>
    `;
}

// ✅ No afterRender() needed!
```

**Note:** Custom components like `x-select-box` emit CustomEvents with `detail: { value }`. They automatically stop propagation of native events, so you'll only receive the clean CustomEvent.

**For native select elements**, use value attribute and on-change:

```javascript
template() {
    return html`
        <select on-change="handleChange" value="${this.state.selected}">
            ${each(this.state.options, opt => html`
                <option value="${opt}">${opt}</option>
            `)}
        </select>
    `;
},

methods: {
    handleChange(e) {
        this.state.selected = e.target.value;
    }
}
```

## Security Best Practices

The framework has built-in security protections with defense-in-depth:

### Security Architecture

1. **Symbol-based trust markers**: The framework uses non-exported Symbols for `html` and `raw` markers, preventing JSON injection attacks
2. **Context-aware escaping**: Automatic XSS protection based on interpolation context
3. **toString() attack prevention**: Uses `Object.prototype.toString.call()` to prevent malicious custom toString() methods from executing
4. **Attribute sanitization**: URL validation, boolean attribute handling, and dangerous attribute blocking

### 1. XSS Protection

**Always use `html` tag** - Automatic context-aware escaping:

```javascript
// ✅ CORRECT - Auto-escaped
template() {
    return html`<div>${this.state.userInput}</div>`;
}

// ❌ WRONG - XSS vulnerable
template() {
    const html = `<div>${this.state.userInput}</div>`;
    return raw(html);
}
```

**Use `raw()` only for trusted content** from your own backend:

```javascript
// ✅ SAFE - Backend-generated HTML
${raw(this.state.passwordGeneratorResponse)}

// ❌ DANGEROUS - User input
${raw(this.state.userComment)}  // XSS!
```

### 2. Dynamic Content and Boolean Attributes

**Use the template system for all dynamic content**:

```javascript
// ✅ CORRECT - Let the framework handle escaping
template() {
    return html`
        <select>
            ${each(items, item => {
                const selected = item.id === this.state.selectedId ? 'selected' : '';
                return html`<option value="${item.id}" ${selected}>${item.name}</option>`;
            })}
        </select>
    `;
}

// ❌ WRONG - Manual string building with raw() is dangerous
const optionsHtml = items.map(item => {
    const escapedName = item.name.replace(/"/g, '&quot;'); // Easy to miss escaping!
    return `<option value="${item.id}">${escapedName}</option>`;
}).join('');
return html`<select>${raw(optionsHtml)}</select>`; // XSS if escaping is incomplete!
```

**Conditional Boolean Attributes**:

Use `true`/`undefined` in attribute values for clean conditional rendering:

```javascript
// ✅ CORRECT - Boolean attributes in attribute value context
const selected = item.id === selectedId ? true : undefined;
html`<option selected="${selected}">${item.name}</option>`

const disabled = isLoading ? true : undefined;
html`<button disabled="${disabled}">Submit</button>`

// Also works in each()
${each(items, item => {
    const selected = item.id === this.state.selectedId ? true : undefined;
    return html`<option value="${item.id}" selected="${selected}">${item.name}</option>`;
})}
```

When the value is `true`, the attribute is added with an empty value (`selected=""`). When `undefined` or `false`, the attribute is removed entirely.

**IMPORTANT**: String values like `"true"` or `"false"` are treated as regular strings, not booleans:
- `selected="${true}"` → `<option selected="">` (boolean true)
- `selected="${'true'}"` → `<option selected="true">` (string "true")

The `html` template tag provides automatic context-aware escaping. Always use it instead of manual string concatenation.

### 3. Event Handler Security

**Never pass user input to event attributes**:

```javascript
// ❌ DANGEROUS - Allows script injection
<button on-click="${this.state.userHandler}">

// ✅ CORRECT - Use method names only
<button on-click="handleClick">
```

### 4. CSRF Protection

The framework includes CSRF token support. Add to your HTML:

```html
<meta name="csrf-token" content="YOUR_TOKEN_HERE">
```

All `fetchJSON()` calls automatically include this token.

### 5. Input Validation

**Always validate user input** before API calls:

```javascript
methods: {
    async saveEmail(e) {
        e.preventDefault();

        const email = this.state.email.trim();
        if (!this.isValidEmail(email)) {
            notify('Invalid email address', 'error');
            return;
        }

        await api.updateEmail(email);
    },

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
}
```

### 6. Sensitive Data Storage

**Never store sensitive data in localStorage**:

```javascript
// ❌ WRONG - Plaintext tokens exposed
localStore('authToken', token);

// ✅ CORRECT - Session-only storage
sessionStorage.setItem('authToken', token);
```

### 7. Memory Leak Prevention

The framework automatically cleans up event listeners, but you must clean up subscriptions:

```javascript
mounted() {
    this._interval = setInterval(() => this.refresh(), 60000);
    this.unsubscribe = store.subscribe(state => {
        this.state.data = state.data;
    });
},

unmounted() {
    // ✅ REQUIRED - Clean up to prevent leaks
    if (this._interval) clearInterval(this._interval);
    if (this.unsubscribe) this.unsubscribe();
}
```

## Migration from Svelte (`/src/` → `/app/`)

| Svelte | Custom Framework |
|--------|------------------|
| `on:click` / `@click` | `on-click` |
| `bind:value` | Manual sync in `afterRender()` |
| `{#if}` | `when(condition, then, else)` |
| `{#each}` | `each(items, item => ...)` |
| `{@html}` | `raw(content)` |
| `$store` | `store.state` |
| `export let prop` | `props: { prop: default }` |

## Migration Complete

The original Svelte implementation has been fully migrated to the vanilla JavaScript framework in `/app/`. All legacy code (`/src/`, npm dependencies, build tools) has been removed.

The framework requires no build step - it runs directly in the browser using ES6 modules.

## Backend (SWAPI Server)

**Note**: The `backend` and `backend-apps` directories are symlinks to `../swapi/server/` and `../swapi-apps/`. **Do NOT modify these from this repository.**

### SWAPI Framework

Python-based web API framework built on Werkzeug:
- Decorator-based API registration: `@api.add(require=capability)`
- Auto-generated client libraries (`.js`, `.py` endpoints)
- Email-based OTP authentication
- Role hierarchy and capability system
- SQLAlchemy database backend

### Backend Apps

- **HRemote**: Philips Hue control, home automation (requires `root`)

## Coding Best Practices

### Naming Conventions

```javascript
// ✅ Component names: kebab-case for custom elements
defineComponent('user-profile', { ... })
defineComponent('x-select-box', { ... })  // x- prefix for reusable UI components

// ✅ Methods: descriptive camelCase
methods: {
    loadUserData() { ... },
    handleFormSubmit() { ... },
    updateUserProfile() { ... }
}

// ❌ Avoid abbreviations
methods: {
    upd() { ... },          // Bad: unclear
    ld() { ... },           // Bad: cryptic
    hdlClick() { ... }      // Bad: hard to read
}

// ✅ Private properties: underscore prefix
this._interval = setInterval(...);
this._cleanups = [];
this._unsubscribe = null;
```

### Error Handling

```javascript
// ✅ CORRECT - Proper error handling
methods: {
    async loadData() {
        try {
            this.state.loading = true;
            const data = await api.getData();
            this.state.items = data;
        } catch (error) {
            console.error('[MyComponent] Failed to load data:', error);
            notify(`Error: ${error.message}`, 'error');
            this.state.items = [];  // Fallback state
        } finally {
            this.state.loading = false;
        }
    }
}

// ❌ WRONG - Silent failure
methods: {
    async loadData() {
        const data = await api.getData();  // No error handling!
        this.state.items = data;
    }
}
```

### Constants Over Magic Numbers

```javascript
// ✅ CORRECT
const REFRESH_INTERVAL_MS = 60 * 1000;  // 1 minute
const MAX_RETRIES = 3;
const TIMEOUT_SECONDS = 30;

mounted() {
    this._interval = setInterval(() => this.refresh(), REFRESH_INTERVAL_MS);
}

// ❌ WRONG
mounted() {
    this._interval = setInterval(() => this.refresh(), 60000);  // What is 60000?
}
```

### Avoid Code Duplication

```javascript
// ✅ CORRECT - Reusable error handler
methods: {
    async safeApiCall(apiMethod, errorMessage) {
        try {
            return await apiMethod();
        } catch (error) {
            console.error(errorMessage, error);
            notify(errorMessage, 'error');
            throw error;
        }
    },

    async loadUsers() {
        await this.safeApiCall(
            () => api.getUsers(),
            'Failed to load users'
        );
    },

    async saveUser() {
        await this.safeApiCall(
            () => api.saveUser(this.state.user),
            'Failed to save user'
        );
    }
}

// ❌ WRONG - Repeated error handling
methods: {
    async loadUsers() {
        try {
            return await api.getUsers();
        } catch (error) {
            console.error('Failed to load', error);
            notify('Failed to load', 'error');
        }
    },

    async saveUser() {
        try {
            return await api.saveUser(this.state.user);
        } catch (error) {
            console.error('Failed to save', error);
            notify('Failed to save', 'error');
        }
    }
}
```

### Documentation

```javascript
/**
 * User Profile Component
 *
 * Displays and edits user profile information with validation.
 *
 * Props:
 *   - userId: ID of the user to display (required)
 *   - editable: Whether profile can be edited (default: false)
 *
 * Events:
 *   - save: Emitted when profile is successfully saved
 *   - cancel: Emitted when user cancels editing
 *
 * @example
 * <user-profile userId="123" editable="true"></user-profile>
 */
export default defineComponent('user-profile', {
    props: {
        userId: '',
        editable: false
    },
    // ...
});
```

## Key Conventions

1. **Use `x-model` for form inputs** - One attribute for two-way binding instead of value + on-input
2. **Use `on-*` for ALL event binding** - Never use inline handlers or addEventListener
3. **Use `when()` and `each()`** - Not ternaries or manual loops
4. **Never mutate reactive arrays** - Use `[...array].sort()`, not `array.sort()` (prevents infinite loops)
5. **Call store methods on `.state`** - `login.state.logoff()`, not `login.logoff()`
6. **Reassign Sets/Maps** - They're not reactive otherwise
7. **Avoid `afterRender()` anti-patterns** - Don't use for value syncing or event binding (Preact handles this)
8. **Clean up in `unmounted()`** - Unsubscribe from stores, clear timers
9. **Validate user input** - Always validate before API calls
10. **Handle errors properly** - Don't let errors fail silently
11. **Use descriptive names** - No abbreviations or single letters
12. **Add JSDoc comments** - Document component purpose, props, and events
13. **Use constants** - No magic numbers or strings

## Getting Help

- Check `/app/tests/` for working examples
- Review `/app/core/` for framework APIs
- See `/app/components/` for component patterns
- Read this CLAUDE.md for conventions
- Security audit results in project documentation
