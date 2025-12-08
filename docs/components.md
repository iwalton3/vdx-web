# Component Development

Complete guide to building components with the framework.

## Table of Contents

- [Basic Component Pattern](#basic-component-pattern)
- [Props System](#props-system)
- [Passing Props to Child Components](#passing-props-to-child-components)
- [Children Props (React-style Composition)](#children-props-react-style-composition)
- [Refs (DOM References)](#refs-dom-references)
- [Stores (Auto-Subscribe)](#stores-auto-subscribe)
- [Lifecycle Hooks](#lifecycle-hooks)
- [Component Styles](#component-styles)
- [Best Practices](#best-practices)

## Basic Component Pattern

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
    styles: /*css*/`
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

## Props System

Components can define props that are reactive and can be set via HTML attributes or programmatically. **All props support full reactivity** - changes trigger automatic re-renders.

### Defining Props

Define props in the component definition with default values:

```javascript
export default defineComponent('user-card', {
    props: {
        username: '',           // String prop
        userId: 0,              // Number prop
        tags: [],               // Array prop
        onSave: null           // Function prop
    },

    template() {
        // Access props via this.props
        return html`
            <div class="card">
                <h2>${this.props.username}</h2>
                <p>ID: ${this.props.userId}</p>
                <p>Tags: ${this.props.tags.join(', ')}</p>
            </div>
        `;
    }
});
```

### Setting Props - Four Ways

**1. HTML Attributes (String Props)**

Props can be set via regular HTML attributes (values are always strings):

```html
<!-- In HTML or at root level -->
<user-card username="alice" user-id="123"></user-card>
<!-- Note: user-id="123" becomes this.props.userId = "123" (string) -->
```

**How it works:**
- All props are automatically registered as `observedAttributes`
- Attribute values are always strings (use JavaScript properties for other types)
- Changes to attributes after mount trigger re-renders via `attributeChangedCallback`

**2. JavaScript Properties**

Props can be set programmatically, triggering automatic re-renders:

```javascript
const card = document.querySelector('user-card');
card.username = 'bob';              // ✅ Triggers re-render
card.userId = 456;                  // ✅ Triggers re-render
card.tags = ['admin', 'developer']; // ✅ Triggers re-render
```

**How it works:**
- Framework creates property descriptors for each prop
- Setting `el.propName = value` updates `el.props.propName` and triggers re-render
- Works at any time (before or after mount)

**3. From Parent Templates**

When passed from a parent component template, complex types are passed by reference:

```javascript
// Parent component
template() {
    return html`
        <user-card
            username="${this.state.currentUser}"
            userId="${this.state.userId}"
            tags="${this.state.userTags}"           <!-- Array passed directly -->
            onSave="${this.handleSave}">            <!-- Function passed directly -->
        </user-card>
    `;
}
```

**How it works:**
- Framework detects custom elements (tags with hyphens)
- Objects/arrays/functions are passed via property assignment, not stringified
- Strings/numbers are passed as strings (parsed by child component)

**4. JSON Hydration (for SSG)**

For static site generators, use `json-*` attributes either containing JSON or which reference JSON data in script tags:

```html
<!-- Component with json-* attribute -->
<country-list json-countries="my-data" title="Countries"></country-list>

<!-- JSON data (easy for SSG templates to generate) -->
<script type="application/json" id="my-data">
[{"name": "France"}, {"name": "Germany"}]
</script>
```

**How it works:**
- On mount, `json-countries` looks for `<script id="my-data" type="application/json">`
- Parses JSON and sets `this.props.countries`
- Removes the `json-*` attribute after processing
- Script element remains (can be shared by multiple components)

### Reactivity Guarantees

**All these trigger re-renders:**
```javascript
// Via setAttribute
el.setAttribute('username', 'charlie');

// Via property setter
el.username = 'charlie';

// Via direct prop mutation (if reactive)
el.props.username = 'charlie';

// From parent re-render (automatic)
```

### Complete Example

```javascript
// Define component with props
export default defineComponent('product-card', {
    props: {
        name: '',
        price: 0,
        inStock: true,
        tags: [],
        onBuy: null
    },

    methods: {
        handleBuyClick() {
            if (this.props.onBuy) {
                this.props.onBuy(this.props.name, this.props.price);
            }
        }
    },

    template() {
        return html`
            <div class="product">
                <h3>${this.props.name}</h3>
                <p class="price">$${this.props.price}</p>
                <p class="stock">${this.props.inStock ? 'In Stock' : 'Out of Stock'}</p>
                <p class="tags">${this.props.tags.join(', ')}</p>
                <button on-click="handleBuyClick" disabled="${!this.props.inStock}">
                    Buy Now
                </button>
            </div>
        `;
    }
});

// Use in HTML (textual props)
<product-card name="Widget" price="29.99" inStock="true"></product-card>

// Use programmatically
const card = document.createElement('product-card');
card.name = 'Gadget';
card.price = 49.99;
card.inStock = true;
card.tags = ['electronics', 'new'];
card.onBuy = (name, price) => console.log(`Buying ${name} for $${price}`);
document.body.appendChild(card);

// Use in parent template
template() {
    return html`
        <product-card
            name="${product.name}"
            price="${product.price}"
            inStock="${product.inStock}"
            tags="${product.tags}"                  <!-- Array passed directly -->
            onBuy="${this.handleProductPurchase}">  <!-- Function passed directly -->
        </product-card>
    `;
}
```

### Security Note

The framework includes security protections for props:
- Reserved property names (constructor, __proto__, etc.) are blocked
- URL attributes are sanitized automatically

## Passing Props to Child Components

### Automatic Object/Function Passing for Custom Elements

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

## Children Props (React-style Composition)

The framework supports **React-style children props** for component composition. This enables powerful component composition patterns.

### Basic Children

Children passed to a component are automatically available as `this.props.children`:

```javascript
// Define a wrapper component
defineComponent('my-wrapper', {
    template() {
        return html`
            <div class="wrapper">
                ${this.props.children}
            </div>
        `;
    }
});

// Usage
<my-wrapper>
    <p>Hello, World!</p>
    <p>This content is passed as children</p>
</my-wrapper>
```

### Named Slots

Use the `slot="name"` attribute to pass children to specific named slots. Named slots are accessed via `this.props.slots`:

```javascript
// Usage
<my-dialog>
    <div slot="header">Dialog Title</div>
    <p>Main content goes here</p>
    <div slot="footer">
        <button>OK</button>
        <button>Cancel</button>
    </div>
</my-dialog>

// Component definition
defineComponent('my-dialog', {
    template() {
        // children is always an array of default slot children
        // slots is an object with named slot children
        const headerSlot = this.props.slots.header || [];
        const footerSlot = this.props.slots.footer || [];

        return html`
            <div class="dialog">
                <div class="header">${headerSlot}</div>
                <div class="body">${this.props.children}</div>
                ${when(footerSlot.length > 0, html`
                    <div class="footer">${footerSlot}</div>
                `)}
            </div>
        `;
    }
});
```

### Children and Slots API Reference

**`this.props.children`** - Default slot children (always an array)

Always available, even if no children are provided (defaults to empty array `[]`).

```javascript
this.props.children // [vnode1, vnode2, ...] - always an array
```

**`this.props.slots`** - Named slot children (always an object)

Always available, even if no named slots are provided (defaults to empty object `{}`).

```javascript
this.props.slots.header  // Named slot "header" children array (or undefined)
this.props.slots.footer  // Named slot "footer" children array (or undefined)
```

### Conditional Rendering and State Preservation

**⚠️ Important:** When using `when()` to conditionally render children, child components will **unmount and lose state** when hidden.

To preserve state, use CSS hiding instead:

```javascript
// ✅ PRESERVES STATE - Use CSS display:none
template() {
    return html`
        <div class="tab1 ${this.state.activeTab === 'tab1' ? '' : 'hidden'}">
            ${this.props.slots.tab1}
        </div>
        <div class="tab2 ${this.state.activeTab === 'tab2' ? '' : 'hidden'}">
            ${this.props.slots.tab2}
        </div>
    `;
},
styles: /*css*/`
    .hidden { display: none; }
`

// ❌ LOSES STATE - Unmounts component when hidden
template() {
    return html`
        ${when(this.state.activeTab === 'tab1', html`
            <div>${this.props.slots.tab1}</div>
        `)}
    `;
}
```

### Using raw() with Children

The `raw()` function works with children for rendering dynamic HTML (password generators, markdown renderers, etc.):

```javascript
defineComponent('password-generator', {
    data() {
        return {
            passwordHtml: '<code>aB3$xY9!</code>'
        };
    },

    template() {
        return html`
            <password-display>
                <h3>Your Generated Password:</h3>
                ${raw(this.state.passwordHtml)}
                <button on-click="copyPassword">Copy</button>
            </password-display>
        `;
    }
});
```

**Security Note:** Only use `raw()` with HTML you trust (your own generated content). Never use it with user input without sanitization.

### Empty Children Handling

Handle empty children gracefully:

```javascript
template() {
    return html`
        <div class="wrapper">
            ${when(this.props.children.length > 0, html`
                <div class="has-children">
                    ${this.props.children}
                </div>
            `, html`
                <div class="empty">No content provided</div>
            `)}
        </div>
    `;
}
```

## Refs (DOM References)

Use the `ref` attribute to get direct references to DOM elements:

```javascript
defineComponent('my-form', {
    methods: {
        focusInput() {
            this.refs.nameInput.focus();
        },

        playVideo() {
            this.refs.videoPlayer.play();
        }
    },

    template() {
        return html`
            <div>
                <input type="text" ref="nameInput" placeholder="Name">
                <button on-click="focusInput">Focus Input</button>

                <video ref="videoPlayer" src="movie.mp4"></video>
                <button on-click="playVideo">Play</button>
            </div>
        `;
    }
});
```

**Key points:**
- Refs are available in `this.refs` after the component mounts
- Ref names must be unique within the component
- Refs are automatically cleaned up when elements unmount
- Use refs for imperative DOM operations (focus, play, scroll, etc.)

**When to use refs:**
- Focusing form inputs
- Controlling media elements (video, audio)
- Measuring element dimensions
- Integrating with third-party DOM libraries

**When NOT to use refs:**
- Reading input values (use `x-model` instead)
- Changing element content (use reactive state)
- Toggling classes (use template interpolation)

## Stores (Auto-Subscribe)

The `stores` option automatically subscribes to external stores and syncs their state:

```javascript
import { loginStore } from './auth/auth.js';
import { themeStore } from './utils.js';

defineComponent('user-dashboard', {
    stores: {
        login: loginStore,
        theme: themeStore
    },

    template() {
        return html`
            <div class="${this.stores.theme.dark ? 'dark' : 'light'}">
                ${when(this.stores.login.user, html`
                    <h1>Welcome, ${this.stores.login.user.name}!</h1>
                    <button on-click="handleLogout">Logout</button>
                `, html`
                    <p>Please log in</p>
                `)}
            </div>
        `;
    },

    methods: {
        async handleLogout() {
            await this.stores.login.logoff();
        }
    }
});
```

**How it works:**
1. On mount, the component subscribes to each store
2. Store state is synced to `this.stores[name]`
3. Changes to store state automatically trigger re-renders
4. On unmount, subscriptions are automatically cleaned up

**Benefits over manual subscription:**
```javascript
// ❌ OLD WAY - Manual subscribe/unsubscribe
mounted() {
    this.unsubscribe = loginStore.subscribe(state => {
        this.state.user = state.user;
    });
}
unmounted() {
    if (this.unsubscribe) this.unsubscribe();
}

// ✅ NEW WAY - Automatic with stores option
stores: {
    login: loginStore
}
// Access via this.stores.login.user
// Cleanup is automatic!
```

## Lifecycle Hooks

### mounted()

Called after component is added to DOM. Perfect for:
- Loading initial data
- Setting up subscriptions
- Starting timers/intervals
- Third-party library initialization

```javascript
mounted() {
    this.state.loading = true;
    this.fetchData().then(data => {
        this.state.items = data;
        this.state.loading = false;
    });

    // Subscribe to store
    this.unsubscribe = myStore.subscribe(state => {
        this.state.data = state.data;
    });
}
```

### unmounted()

Called before component is removed from DOM. **CRITICAL for cleanup:**
- Unsubscribe from stores
- Clear timers/intervals
- Remove global event listeners
- Clean up third-party libraries

```javascript
unmounted() {
    // ✅ REQUIRED - Clean up to prevent memory leaks
    if (this._interval) clearInterval(this._interval);
    if (this.unsubscribe) this.unsubscribe();
}
```

### propsChanged(prop, newValue, oldValue)

Called when a prop changes from a parent component. Useful for:
- Responding to external prop changes
- Syncing internal state with props
- Re-initializing based on new prop values

**Parameters:**
- `prop` - The name of the prop that changed
- `newValue` - The new value of the prop
- `oldValue` - The previous value of the prop

```javascript
propsChanged(prop, newValue, oldValue) {
    if (prop === 'value' && newValue !== oldValue) {
        // Update internal state based on new prop value
        this.parseValue(newValue);
        this.syncInputElement();
    }
    if (prop === 'options') {
        // Re-initialize when options change
        this.rebuildOptions(newValue);
    }
}
```

**Important notes:**
- Called BEFORE the component re-renders with the new props
- Not called on initial mount - use `mounted()` for initial setup
- Not called if the prop value is the same as before (strict equality)
- Multiple prop changes in a single update will result in multiple calls

### afterRender()

Called after each render. **Use sparingly** - Preact handles most DOM sync automatically.

**When to use:**
- Imperative DOM APIs (focus, scroll position)
- Third-party library integration (charts, maps)
- Reading DOM measurements

**When NOT to use:**
- ❌ Value syncing (Preact handles this)
- ❌ Event binding (use `on-*` attributes)
- ❌ Setting select values (use `value` attribute)

```javascript
// ✅ CORRECT - Focus input after render
afterRender() {
    if (this.state.shouldFocus) {
        this.querySelector('input').focus();
        this.state.shouldFocus = false;
    }
}

// ❌ WRONG - Preact handles value syncing automatically
afterRender() {
    this.querySelector('select').value = this.state.selected;
}

// ❌ WRONG - Use on-* attributes instead
afterRender() {
    this.querySelector('button').addEventListener('click', this.handleClick);
}
```

## Component Styles

Styles are automatically scoped to the component tag name:

```javascript
defineComponent('my-button', {
    template() {
        return html`
            <button class="primary">Click Me</button>
        `;
    },

    styles: /*css*/`
        /* Scoped to my-button */
        .primary {
            background: #007bff;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
        }

        .primary:hover {
            background: #0056b3;
        }

        /* Use :host for component root */
        :host {
            display: block;
            margin: 10px 0;
        }

        /* Dark theme support */
        :host-context(body.dark) .primary {
            background: #444;
            color: #ccc;
        }
    `
});
```

### :host Selector Transformation

The `:host` selector is transformed to the component's tag name at runtime. This is **not** Shadow DOM - it's a convenience feature for styling the component's root element.

```javascript
// In your component
styles: /*css*/`
    :host {
        display: block;
        padding: 20px;
    }
    :host(.active) {
        border: 2px solid blue;
    }
`

// Becomes (at runtime)
// my-component {
//     display: block;
//     padding: 20px;
// }
// my-component.active {
//     border: 2px solid blue;
// }
```

**Important:** Since this isn't Shadow DOM:
- Styles can still be overridden by external CSS
- Use specific class names to avoid conflicts
- `:host-context()` works for ancestor-based styling (e.g., dark mode)

### Keyframe Animation Scoping

Keyframe animations defined in component styles are automatically namespaced to prevent conflicts between components:

```javascript
defineComponent('cl-spinner', {
    styles: /*css*/`
        .spinner {
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `
});
```

The framework transforms this to:

```css
cl-spinner .spinner {
    animation: cl-spinner--spin 1s linear infinite;
}

@keyframes cl-spinner--spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
```

**Benefits:**
- Multiple components can define `@keyframes spin` without conflicts
- Animation references in `animation` and `animation-name` properties are automatically updated
- Both `@keyframes` and `@-webkit-keyframes` are handled

## Best Practices

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

### Loading Data Pattern

```javascript
data() {
    return {
        items: [],
        loading: false,
        error: null
    };
},

async mounted() {
    this.state.loading = true;
    this.state.error = null;

    try {
        const response = await fetch('/api/items');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.state.items = await response.json();
    } catch (error) {
        console.error('Failed to load:', error);
        this.state.error = error.message;
    } finally {
        this.state.loading = false;
    }
},

template() {
    return html`
        ${when(this.state.loading,
            html`<p>Loading...</p>`,
            when(this.state.error,
                html`<p class="error">Error: ${this.state.error}</p>`,
                html`<ul>${each(this.state.items, item => html`
                    <li>${item.name}</li>
                `)}</ul>`
            )
        )}
    `;
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

## Common Patterns

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

### For Native Select Elements

Use value attribute and on-change:

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

## See Also

- [templates.md](templates.md) - Template system, x-model, event binding
- [reactivity.md](reactivity.md) - Reactive state management
- [api-reference.md](api-reference.md) - Complete API reference
