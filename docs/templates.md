# Template System

Complete guide to the template system, two-way data binding, and template helpers.

## Table of Contents

- [Template Basics](#template-basics)
- [Event Binding](#event-binding)
- [Two-Way Data Binding (x-model)](#two-way-data-binding-x-model)
- [Template Helpers](#template-helpers)
- [Boolean Attributes](#boolean-attributes)
- [Form Handling](#form-handling)

## Template Basics

### html`` Tagged Template Literal

Main template function - automatically escapes content for XSS protection:

```javascript
template() {
    return html`<div>${this.state.userInput}</div>`;
}
```

The framework:
- **Compiles templates once** - Structure cached, only values change on re-render
- **Auto-escapes** - User input is automatically escaped
- **URL sanitizes** - href/src attributes validated for dangerous protocols
- **Symbol-protected** - Cannot be JSON-injected

### Rendering Architecture

**How it works:**

1. **Template Compilation** - `html`` templates compiled once to AST structure
2. **Value Application** - On each render, values applied to create Preact VNodes
3. **Preact Reconciliation** - Preact efficiently updates the real DOM

```javascript
// Template compiled once when first rendered ✓
const template = html`<div>${this.state.count}</div>`;

// On re-render: apply new values → Preact VNode → Preact reconciles DOM
```

## Event Binding

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

### Event Modifiers

Add modifiers to the end of event names:

- `-prevent` - Calls `e.preventDefault()` automatically
- `-stop` - Calls `e.stopPropagation()` automatically

```javascript
// Prevent form submission default behavior
<form on-submit-prevent="handleSubmit">

// Stop click from bubbling to parent
<button on-click-stop="handleInnerClick">

// Multiple modifiers work together
<a on-click-prevent-stop="handleLink">
```

### Custom Events with Hyphens

Custom events with hyphens in their names (like `status-change` or `item-delete`) are handled via a ref-based mechanism because Preact lowercases event names.

```javascript
// Child component emits custom event
defineComponent('status-indicator', {
    methods: {
        updateStatus(newStatus) {
            this.dispatchEvent(new CustomEvent('status-change', {
                detail: { status: newStatus },
                bubbles: true
            }));
        }
    },
    template() {
        return html`<button on-click="${() => this.updateStatus('active')}">Activate</button>`;
    }
});

// Parent listens with on-status-change
defineComponent('parent-component', {
    methods: {
        handleStatusChange(e) {
            console.log('New status:', e.detail.status);
        }
    },
    template() {
        return html`
            <status-indicator on-status-change="handleStatusChange">
            </status-indicator>
        `;
    }
});
```

**Modifiers work with custom events too:**
```javascript
<my-child on-custom-event-prevent="handleEvent">
<my-child on-item-delete-stop="handleDelete">
```

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

## Two-Way Data Binding (x-model)

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
6. **Chainable**: Combine with on-input/on-change for custom logic

### Chaining x-model with Custom Handlers

You can combine `x-model` with `on-input` or `on-change` for additional logic:

```javascript
<input
    type="text"
    x-model="username"
    on-input="${() => this.clearError('username')}">

<input
    type="email"
    x-model="email"
    on-input="${() => this.validateEmail()}">
```

The framework runs both handlers:
1. First: x-model updates the state
2. Then: Your custom handler runs

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

**`x-model` works with custom components!** Your custom component just needs to:

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
- Dispatches a CustomEvent with `detail: { value }` and proper bubbling

**Note:** The helper does NOT update `this.props.value` directly. Props are updated by the parent component when it handles the change event and re-renders with new prop values. This is the correct one-way data flow pattern.

**Manual approach** (if you need custom behavior):
```javascript
handleInput(e) {
    e.stopPropagation();  // Stop native event from bubbling
    // Do NOT set this.props.value - parent will update props via re-render
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

- For custom components, the framework uses the `change` event (not `input`)
- **Use `this.emitChange(e, value)`** to emit change events
- Parent components should only receive your CustomEvent with `e.detail.value`, never the underlying native events

## Template Helpers

### when() - Conditional Rendering

**Always use `when()` instead of ternaries:**

```javascript
// ✅ CORRECT
${when(this.state.isLoggedIn,
    html`<p>Welcome!</p>`,
    html`<p>Please log in</p>`
)}

// ✅ CORRECT
${when(this.state.isLoggedIn,
    () => html`<p>Welcome!</p>`,
    () => html`<p>Please log in</p>`
)}

// ❌ WRONG
${this.state.isLoggedIn ? html`<p>Welcome!</p>` : html`<p>Log in</p>`}
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

### each() - List Rendering

```javascript
${each(this.state.items, item => html`
    <li>${item.name}</li>
`)}
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
`, item => item.id)}
```

The third parameter is a `keyFn` that returns a unique identifier for each item. This is **essential** when:
- Items can be reordered, inserted, or deleted
- List items contain form inputs (text boxes, checkboxes)
- List items have internal state that should be preserved

Without a key function, Preact uses array index for reconciliation, which can cause:
- Text inputs to "shift" content when items are reordered
- Checkbox states to appear on wrong items
- Focus to be lost during updates

**Filtering:**
```javascript
${each(this.state.items.filter(item => item.active), item => html`
    <li>${item.name}</li>
`)}
```

### memoEach() - Memoized List Rendering

For large lists or expensive item rendering, use `memoEach()` to cache rendered items:

```javascript
${memoEach(this.state.songs, song => html`
    <div class="song-item">
        <span class="title">${song.title}</span>
        <span class="artist">${song.artist}</span>
    </div>
`, song => song.uuid)}
```

**How it works:**
- Uses array reference as cache key - safe to use in conditional rendering
- Caches rendered templates per item key within each array
- Only re-renders items where the item reference changed
- Cache is automatically scoped to the component via WeakMap (proper GC)
- Stale cache entries are cleaned up when items leave the array

**When to use:**
- Virtual scroll with large lists (100+ items)
- Expensive item templates (many conditionals, nested components)
- Lists that update frequently but individual items rarely change

**Signature:**
```javascript
memoEach(array, mapFn, keyFn, [cache])
```

- `array` - Array to iterate over
- `mapFn` - Function to render each item: `(item, index) => html\`...\``
- `keyFn` - **Required** - Function to extract unique key: `item => item.id`
- `cache` - Optional explicit cache (see below for when this is needed)

**Conditional rendering - safe:**
```javascript
// ✅ Safe - caching is based on array reference, not call order
template() {
    return html`
        ${when(this.state.showSongs,
            html`${memoEach(this.state.songs, s => html`...`, s => s.id)}`
        )}
        ${memoEach(this.state.playlists, p => html`...`, p => p.id)}
    `;
}
```

**Same array rendered differently - use explicit caches:**
```javascript
// When rendering the SAME array with different templates, use explicit caches
data() {
    return {
        items: [],
        _cacheA: new Map(),  // Explicit cache
        _cacheB: new Map()   // Explicit cache
    };
},
template() {
    return html`
        <div class="view-a">
            ${memoEach(this.state.items, i => html`<div>${i.a}</div>`, i => i.id, this.state._cacheA)}
        </div>
        <div class="view-b">
            ${memoEach(this.state.items, i => html`<span>${i.b}</span>`, i => i.id, this.state._cacheB)}
        </div>
    `;
}
```

**Example with virtual scroll:**
```javascript
// Render only visible items, memoize to avoid re-rendering unchanged items
const visibleSongs = this.state.songs.slice(visibleStart, visibleEnd);

${memoEach(visibleSongs, (song, idx) => {
    const actualIndex = visibleStart + idx;
    return this.renderSongItem(song, actualIndex);
}, song => song.uuid)}
```

**Note:** The `keyFn` is required for memoization. Without it, `memoEach` falls back to regular `each()` behavior.

### raw() - Unsafe HTML

Only use for trusted, sanitized content:

```javascript
${raw(this.state.trustedHtmlContent)}
```

**When to use:**
- Backend-generated HTML
- Trusted API responses
- Pre-sanitized content

**When NOT to use:**
- ❌ User input
- ❌ URL parameters
- ❌ Any untrusted data

```javascript
// ✅ SAFE - Backend-generated HTML
${raw(this.state.passwordGeneratorResponse)}

// ❌ DANGEROUS - User input
${raw(this.state.userComment)}  // XSS!
```

## Boolean Attributes

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

## Form Handling

### Basic Form Pattern

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

### Select Dropdowns

Use `value` attribute and let Preact handle syncing:

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

### Form with x-model

```javascript
data() {
    return {
        username: '',
        email: '',
        agreed: false
    };
},

template() {
    return html`
        <form on-submit-prevent="handleSubmit">
            <input type="text" x-model="username" placeholder="Username">
            <input type="email" x-model="email" placeholder="Email">
            <label>
                <input type="checkbox" x-model="agreed">
                I agree to terms
            </label>
            <button type="submit" disabled="${!this.state.agreed}">
                Submit
            </button>
        </form>
    `;
},

methods: {
    async handleSubmit(e) {
        // All form values are already in this.state!
        await api.register({
            username: this.state.username,
            email: this.state.email
        });
    }
}
```

## See Also

- [components.md](components.md) - Component development patterns
- [reactivity.md](reactivity.md) - Reactive state management
- [security.md](security.md) - XSS protection and security best practices
- [api-reference.md](api-reference.md) - Complete API reference
