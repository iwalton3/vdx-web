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
2. **Value Application** - On each render, values applied to create DOM nodes
3. **Fine-grained Updates** - Direct DOM updates without virtual DOM diffing

```javascript
// Template compiled once when first rendered ✓
const template = html`<div>${this.state.count}</div>`;

// On re-render: apply new values → direct DOM updates
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

Custom events with hyphens in their names (like `status-change` or `item-delete`) are handled via a ref-based mechanism.

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

// ✅ CORRECT - Function form (preferred for performance)
${when(this.state.isLoggedIn,
    () => html`<p>Welcome!</p>`,
    () => html`<p>Please log in</p>`
)}

// ❌ WRONG
${this.state.isLoggedIn ? html`<p>Welcome!</p>` : html`<p>Log in</p>`}
```

**Performance tip:** When using function forms (passing `() => html\`...\`` instead of `html\`...\``), the framework can cache branches based on the condition value. This avoids re-evaluating both branches on every render - only the active branch is evaluated.

```javascript
// Template form - both branches evaluated every render
${when(condition, html`<a>...</a>`, html`<b>...</b>`)}

// Function form - only active branch evaluated, cached by condition
${when(condition, () => html`<a>...</a>`, () => html`<b>...</b>`)}
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

Without a key function, the framework uses array index for reconciliation, which can cause:
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

**⚠️ External State Dependencies:**

Unlike `each()`, `memoEach()` defers execution of the mapFn to a later phase. This means **state accessed inside the mapFn closure does NOT create reactive dependencies** for the component. If your memoEach items depend on external state (not just the item itself), you must read that state outside the closure:

```javascript
// ❌ WRONG - selectedIndex accessed inside closure won't trigger re-renders
template() {
    return html`
        ${memoEach(this.state.items, (item, idx) => {
            const isSelected = idx === this.state.selectedIndex;  // NOT tracked!
            return html`<div class="${isSelected ? 'selected' : ''}">${item.name}</div>`;
        }, item => item.id)}
    `;
}

// ✅ CORRECT - Read external state outside the closure
template() {
    // Read HERE to create dependency (during template evaluation)
    const selectedIdx = this.state.selectedIndex;

    return html`
        ${memoEach(this.state.items, (item, idx) => {
            const isSelected = idx === selectedIdx;  // Uses captured value
            return html`<div class="${isSelected ? 'selected' : ''}">${item.name}</div>`;
        }, item => item.id)}
    `;
}
```

**Why this matters:**
- `each()` executes mapFn immediately during template() - state access IS tracked
- `memoEach()` stores the closure and executes it later - state access is NOT tracked
- When external state changes but isn't tracked, the template won't re-render

**When to include external state in the key:**

If cached items should invalidate when external state changes, include it in the key:

```javascript
// Selection state changes which item looks "selected" - include in key
${memoEach(items, (item, idx) => {
    const isSelected = idx === selectedIdx;
    return html`<div class="${isSelected ? 'selected' : ''}">${item.name}</div>`;
}, (item, idx) => `${item.id}-${idx === selectedIdx}`)}
```

### contain() - Reactive Boundaries

Use `contain()` to isolate high-frequency state updates from the rest of the template. This prevents expensive parent re-renders when only a small part of the UI changes rapidly.

```javascript
import { defineComponent, html, contain } from './lib/framework.js';

template() {
    return html`
        <div class="player">
            <!-- This list only re-renders when queue changes -->
            ${memoEach(this.state.queue, song => html`
                <div class="song">${song.title}</div>
            `, song => song.uuid)}

            <!-- This updates frequently but is isolated from the list -->
            ${contain(() => html`
                <div class="time">${this.stores.player.currentTime}</div>
            `)}
        </div>
    `;
}
```

**How it works:**
- Creates an isolated reactive boundary around the render function
- State accessed inside `contain()` only triggers re-renders inside the boundary
- Parent template does NOT re-render when contained state changes
- Effectively creates a mini-component without the overhead of a separate element

**When to use:**
- High-frequency updates (timers, progress bars, audio currentTime)
- Small UI sections that update independently from siblings
- Avoiding expensive sibling re-renders (e.g., long virtualized lists)

**When NOT to use:**
- For one-off or infrequent updates (overhead not worth it)
- When you need a proper component with props/state (use a real component)
- For static content that never changes

**Comparison with components:**
```javascript
// contain() - Lightweight, inline reactive boundary
${contain(() => html`<span>${this.state.timer}</span>`)}

// Component - Full lifecycle, props, methods, reusable
<timer-display time="${this.state.timer}"></timer-display>
```

Use `contain()` when you just need isolation without the overhead of defining a full component.

### opt() - Automatic Fine-Grained Reactivity

The `opt()` function enables Solid-style fine-grained reactivity by automatically wrapping ALL template expressions in `html.contain()`. This gives you the benefits of `contain()` without manually wrapping each expression.

```javascript
import { defineComponent, html, when } from './lib/framework.js';
import { opt } from './lib/opt.js';

export default defineComponent('counter', {
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

**What opt() does:**

Transforms template expressions from:
```javascript
${this.state.count}
```
To:
```javascript
${html.contain(() => this.state.count)}
```

**Benefits:**
- Changing `count` only updates the count display, not the entire template
- Changing `name` only updates the heading, not the count
- Each expression has isolated reactivity automatically
- No need to manually wrap expressions in `contain()`

**Expressions that are NOT wrapped:**
- Arrow functions: `${() => this.doSomething()}`
- Already contained: `${contain(() => ...)}`
- Control flow: `${when(...)}`, `${each(...)}`, `${memoEach(...)}`
- Raw content: `${raw(...)}`
- Slots/children: `${this.props.children}`, `${this.props.slots.xxx}`

**When to use opt():**
- Components with many independent reactive values
- High-frequency updates (timers, animations, real-time data)
- Large templates where full re-renders are expensive
- When you want contain() on every expression without manual wrapping

**CSP Considerations:**

`opt()` requires `eval()`, so your Content Security Policy must allow `'unsafe-eval'`. For strict CSP environments, use manual `contain()` calls instead.

**Build-Time Alternative:**

For production builds, use the `optimize.js` script to apply opt() transformations at build time, eliminating the need for `eval()` in deployed code:

```bash
# Basic usage - optimize all templates
node optimize.js --input ./src --output ./dist

# With minification and source maps
node optimize.js -i ./src -o ./dist --minify --sourcemap

# Only optimize templates wrapped in eval(opt())
node optimize.js -i ./src -o ./dist --wrapped-only
```

This transforms ALL `html`` ` templates to use fine-grained reactivity, and strips any existing `eval(opt())` calls since they become redundant.

**Linting for Early Dereference Issues:**

The optimizer can detect "early dereference" patterns that would break reactivity:

```bash
# Lint-only mode - check for issues without transforming
node optimize.js --lint-only -i ./src

# Auto-fix simple issues (replaces captured variables with reactive paths)
node optimize.js --auto-fix -i ./src

# Preview auto-fix changes without writing (dry-run)
node optimize.js --auto-fix --dry-run -i ./src
```

The linter categorizes issues as:
- **Fixable** - Simple dereferences like `const x = this.state.y` that the optimizer or `--auto-fix` can handle
- **Unfixable** - Computed expressions like `const x = this.state.y + 2` that require manual refactoring

### Important: Reactive Access Inside contain()

A critical requirement for `contain()` and `opt()` to work correctly: **reactive state must be accessed INSIDE the closure, not before it**.

```javascript
// ❌ BAD - Early dereference defeats reactivity
template() {
    const count = this.state.count;           // Accessed HERE
    const userName = this.stores.auth.name;   // Accessed HERE

    return html`
        <p>${count}</p>           <!-- contain() captures the VALUE, not the getter -->
        <p>${userName}</p>        <!-- This will NEVER update! -->
    `;
}

// ✅ GOOD - Reactive access inside template
template() {
    return html`
        <p>${this.state.count}</p>           <!-- Reactive access inside contain() -->
        <p>${this.stores.auth.name}</p>      <!-- Updates when store changes -->
    `;
}
```

**Why this matters:**

When `opt()` or `optimize.js` transforms `${count}` to `${html.contain(() => count)}`, the closure captures the *variable* `count`, not the reactive path `this.state.count`. Since `count` was evaluated before the closure was created, the closure has no reactive dependencies - it just returns the captured value forever.

**Note about when(), each(), and memoEach():**

These helpers do NOT create isolated reactive boundaries by default. They work like regular JavaScript - captured variables are fine because the parent template re-renders when state changes:

```javascript
// ✅ Both patterns work - captured variables are fine
template() {
    const isAdmin = this.stores.auth.isAdmin;

    // when() and each() do NOT create reactive boundaries by default
    // They re-evaluate when the parent template re-renders
    return html`
        ${when(isAdmin, () => html`<admin-panel></admin-panel>`)}
        ${each(this.state.items, item => html`
            <div class="${isAdmin ? 'admin' : ''}">${item.name}</div>
        `)}
    `;
}
```

**Note:** `when()` and `each()` do not create isolated reactive boundaries. They work like regular JavaScript - captured variables are fine. Use `contain()` explicitly if you need fine-grained isolation, or use `optimize.js` to automatically wrap expressions for optimal performance.

**For computed values, use methods or inline expressions:**

```javascript
// ❌ BAD - Computed variable loses reactivity
template() {
    const doubled = this.state.count * 2;
    const fullName = `${this.state.firstName} ${this.state.lastName}`;

    return html`<p>${doubled}</p><p>${fullName}</p>`;
}

// ✅ GOOD Option 1 - Inline expressions
template() {
    return html`
        <p>${this.state.count * 2}</p>
        <p>${this.state.firstName} ${this.state.lastName}</p>
    `;
}

// ✅ GOOD Option 2 - Getter methods
methods: {
    get doubled() {
        return this.state.count * 2;
    },
    get fullName() {
        return `${this.state.firstName} ${this.state.lastName}`;
    }
},
template() {
    return html`<p>${this.doubled}</p><p>${this.fullName}</p>`;
}
```

**Exception - memoEach external state:**

For `memoEach()`, external state that affects rendering SHOULD be captured outside the item callback. This ensures the memoEach re-evaluates when that state changes:

```javascript
template() {
    // Capture external state OUTSIDE - this is correct for memoEach
    const selectedId = this.state.selectedId;

    return html`
        ${memoEach(this.state.items, (item) => {
            // Use captured value inside - memoEach handles the dependency
            const isSelected = item.id === selectedId;
            return html`<div class="${isSelected ? 'selected' : ''}">${item.name}</div>`;
        }, item => item.id)}
    `;
}
```

See the [memoEach section](#memoeach---memoized-list-rendering) for more details on this pattern.

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

// ✅ No afterRender() needed! Framework handles value syncing automatically
```

### Select Dropdowns

Use `value` attribute and let the framework handle syncing:

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
