# SWAPI Client - Zero-Dependency Vanilla JavaScript Framework

Please note: This is EXPERIMENTAL and CLAUDE-generated code. The idea behind this project
was to create a web framework as close to a modern web framework as possible that has
ZERO dependencies on NPM. In the age of code rot, supply chain vulnerabilities, and
dependency chains so big you cannot hope to review everything, sometimes it's desirable
to explore other options. This project is one such exploration.

This is a client for SWAPI (Simple Web API) built with a custom zero-dependency vanilla JavaScript framework. It features modern reactive state management, an innovative compiled template system, and vendored Preact for efficient DOM reconciliation - all without npm or build tools.

## What Makes This Special

- **Zero npm dependencies** - No package.json, no node_modules
- **No build step** - Runs directly in the browser using ES6 modules
- **Vendored Preact** - Includes Preact 10.x (~4KB) for efficient rendering
- **Innovative template compiler** - Compiles `html` templates once, applies values on re-render
- **Smart two-way binding** - `x-model` with automatic type conversion (even React doesn't have this!)
- **Chainable event handlers** - Combine x-model with on-input/on-change for custom logic
- **Auto-bound methods** - No manual `.bind(this)` needed, just works
- **Computed properties** - Memoized values with dependency tracking
- **Virtual scrolling** - Efficiently render massive lists
- **Modern & secure** - Built-in XSS protection, reactive state, component system
- **Production ready** - Comprehensive test suite with 125 passing tests
- **Clean architecture** - ~3000 lines of well-documented framework code

## Quick Start

```bash
cd app
python3 -m http.server 8000
```

Then open: http://localhost:8000/

That's it! No `npm install`, no build process, no dependencies to install.

## Project Structure

```
app/
├── core/                    # Framework core (~3000 lines)
│   ├── reactivity.js       # Proxy-based reactive state (Vue 3-inspired)
│   ├── store.js            # Stores with localStorage persistence
│   ├── template.js         # Tagged template literals with XSS protection
│   ├── template-compiler.js # Innovative template→VNode compiler
│   ├── component.js        # Web Components with Preact rendering
│   ├── router.js           # Hash/HTML5 router with capability checks
│   └── utils.js            # Utilities, notifications, dark theme
├── vendor/
│   └── preact/             # Vendored Preact 10.x (~4KB, no npm!)
├── auth/                    # Authentication system
├── apps/                    # Application modules
│   └── pwgen/              # Password generators (3 variants)
├── hremote-app/            # Home remote control (Philips Hue)
├── components/             # Shared UI components
├── playground/             # Interactive framework demos
├── styles/                 # Global CSS
├── tests/                  # Test suite (125 tests)
└── index.html              # Entry point
```

## Architecture: Template Compilation → Preact Rendering

This framework uses an innovative hybrid approach:

1. **Template Compilation** - `html` templates are compiled once to an AST
2. **Value Application** - On each render, values are applied to create Preact VNodes
3. **Preact Reconciliation** - Preact efficiently updates the real DOM

```javascript
// Template compiled once ✓
const template = html`<div>${this.state.count}</div>`;

// On re-render: just apply new values → VNode → Preact reconciles
```

### Why This Approach?

- **No string manipulation on re-render** - Template structure cached
- **Efficient updates** - Preact's battle-tested VDOM reconciliation
- **Type safety** - Functions and objects passed by reference, not serialized
- **Zero build** - No JSX transform, no bundler, runs in browser
- **Familiar syntax** - Keep the `html` tagged template syntax developers love

## Framework Features

### Reactive State

Proxy-based reactivity system inspired by Vue 3:

```javascript
import { reactive } from './core/reactivity.js';

const state = reactive({ count: 0 });
state.count++; // Automatically triggers re-render
```

### Two-Way Data Binding (`x-model`)

**Automatic two-way binding for form inputs** - a feature React doesn't have!

```javascript
// Simple, type-aware binding
<input type="text" x-model="username">
<input type="number" x-model="age">        // Automatic number conversion
<input type="checkbox" x-model="agreed">   // Automatic boolean
<select x-model="country">...</select>
<textarea x-model="bio"></textarea>

// Combine x-model with additional event handlers!
<input
    type="text"
    x-model="username"
    on-input="${() => this.clearError('username')}">
```

The framework automatically:
- Uses the correct attribute (`value` or `checked`) based on input type
- Sets up the right event (`input` or `change`)
- Converts types (numbers, booleans) automatically
- Updates state and re-renders on changes
- **Chains handlers** - x-model works seamlessly with on-input/on-change for custom logic

**Supports all input types**: text, number, email, password, checkbox, radio, select, textarea, range, file

### XSS-Safe Compiled Templates

Tagged template literals with compile-time optimization and runtime XSS protection:

```javascript
import { html, raw } from './core/template.js';

// Automatically escaped - SAFE
html`<div>${userInput}</div>`

// URL sanitized automatically - SAFE
html`<a href="${userUrl}">Link</a>`

// Only explicit raw() for trusted content (Symbol-protected)
html`<div>${raw(trustedApiHtml)}</div>`
```

The framework:
- **Compiles templates once** - Structure cached, only values change
- **Detects URL attributes** (`href`, `src`) and sanitizes automatically
- **Prevents toString() attacks** - Uses `Object.prototype.toString.call()` for objects
- **Symbol-based security** - `raw()` and `html()` markers cannot be JSON-injected

**Boolean Attributes**: Use `true`/`undefined` for clean conditional rendering:

```javascript
const isDisabled = loading;
html`<button disabled="${isDisabled}">Submit</button>`
// When loading=true  → <button disabled="">
// When loading=false → <button>

// Works with all boolean attributes
html`<input type="checkbox" checked="${isChecked}">`
html`<option value="1" selected="${isSelected}">Option</option>`
```

### Component System

Web Components with Preact-powered rendering:

```javascript
import { defineComponent } from './core/component.js';
import { html } from './core/template.js';

defineComponent('my-component', {
    data() {
        return {
            count: 0,
            name: '',
            agreed: false
        };
    },

    template() {
        return html`
            <div>
                <p>Count: ${this.state.count}</p>
                <button on-click="increment">+1</button>

                <input type="text" x-model="name" placeholder="Your name">
                <p>Hello, ${this.state.name || 'stranger'}!</p>

                <label>
                    <input type="checkbox" x-model="agreed">
                    I agree to the terms
                </label>
            </div>
        `;
    },

    methods: {
        increment() {
            this.state.count++;
        }
    },

    styles: `
        :host {
            display: block;
            padding: 1rem;
        }
        button {
            background: #007bff;
            color: white;
        }
    `
});
```

Components automatically:
- **Auto-bind methods** - No `.bind(this)` needed, methods just work!
- Compile templates on first render (cached)
- Use Preact for efficient DOM updates
- Scope styles to component tag name (`:host` → `my-component`)
- Clean up effects and subscriptions on unmount

### Computed Properties

Memoized computed properties with automatic dependency tracking:

```javascript
import { computed } from './core/utils.js';

defineComponent('product-list', {
    data() {
        return {
            items: [...], // 1000 items
            searchQuery: '',
            sortBy: 'name',

            // Computed property - only recalculates when dependencies change
            filteredItems: computed((items, query) => {
                console.log('[Computed] Filtering...');  // Only logs when needed!
                return items.filter(item =>
                    item.name.toLowerCase().includes(query.toLowerCase())
                );
            })
        };
    },

    template() {
        // Call computed with current dependencies
        const filtered = this.state.filteredItems(
            this.state.items,
            this.state.searchQuery
        );

        return html`
            <input type="text" x-model="searchQuery" placeholder="Search...">
            <div>${filtered.length} items found</div>
        `;
    }
});
```

Computed properties cache results and only recalculate when dependencies change - perfect for expensive operations like filtering/sorting large lists!

### Router

Supports both hash routing (default) and HTML5 routing:

```javascript
import { Router } from './core/router.js';

const router = new Router({
    '/': { component: 'home-page' },
    '/about': { component: 'about-page' },
    '/admin': {
        component: 'admin-page',
        require: 'admin' // Capability-based access control
    }
});

// Programmatic navigation
router.navigate('/about');
router.navigate('/search', { q: 'test', page: '2' });

// Declarative links
html`<router-link to="/about">About</router-link>`
```

### Store with Persistence

Reactive stores with optional localStorage persistence:

```javascript
import { createStore, persistentStore } from './core/store.js';

// Simple store
const counter = createStore({ count: 0 });

// Persistent store (automatically syncs to localStorage)
const userPrefs = persistentStore('user-prefs', { theme: 'light' });

// Subscribe to changes
userPrefs.subscribe(state => {
    console.log('Preferences updated:', state);
});

// Update store (automatically persists)
userPrefs.set({ theme: 'dark' });
```

## HTML5 Routing

The router uses hash routing (`/#/`) by default. To use HTML5 routing, add a `<base>` tag:

```html
<base href="/app/">
```

The router automatically switches to real paths and redirects hash routes to clean URLs.

### Server Configuration for HTML5 Routing

**Apache** (`.htaccess`):
```apache
RewriteEngine on
RewriteCond %{REQUEST_FILENAME} -s [OR]
RewriteCond %{REQUEST_FILENAME} -l [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^.*$ - [NC,L]
RewriteRule ^(.*) index.html [NC,L]
```

**Nginx**:
```nginx
try_files $uri $uri/ /index.html;
```

## Running Tests

```bash
cd app
python3 test-server.py
```

Then open: http://localhost:9000/tests/

All 125 tests pass, covering:
- Reactive state system
- Template compilation and value application
- Preact VNode generation
- XSS protection (including toString() attack prevention)
- Component lifecycle and event binding
- Router (hash & HTML5 modes)
- Store persistence
- Authentication flow

## Interactive Playground

View live demos of framework features:

```bash
cd app
python3 test-server.py
```

Then open: http://localhost:8000/playground.html

Features demonstrated:
- **Counter** - Reactive state with x-model two-way binding
- **Form** - Validation with x-model + on-input chaining
- **List** - Todo list with each(), when(), and x-model
- **Conditional** - Advanced when() patterns (nested, state machines)
- **Nested** - Component composition and prop passing
- **Notifications** - Toast notification system
- **Computed** - Memoized properties for efficient filtering/sorting (1000 items)
- **Virtual Scroll** - Efficiently render huge lists (only visible items)

## Security Features

### Defense-in-Depth XSS Protection

1. **Symbol-based trust markers** - `HTML_MARKER` and `RAW_MARKER` are non-exported Symbols
2. **Context-aware escaping** - URLs, attributes, text content each handled correctly
3. **toString() attack prevention** - Uses `Object.prototype.toString.call()` for objects
4. **No dangerous fallbacks** - Removed all `dangerouslySetInnerHTML` except in `raw()`
5. **CSRF token support** - Automatic inclusion in API requests

### Best Practices

```javascript
// ✅ DO: Use html template tag
html`<div>${userInput}</div>`

// ✅ DO: Validate input
if (!/^[a-zA-Z0-9]+$/.test(username)) {
    throw new Error('Invalid format');
}

// ✅ DO: Use raw() only for trusted backend HTML
html`<div>${raw(apiResponse.html)}</div>`

// ❌ DON'T: Concatenate strings
element.innerHTML = '<div>' + userInput + '</div>'

// ❌ DON'T: Use raw() with user input
html`<div>${raw(userComment)}</div>` // XSS!
```

## Browser Compatibility

Requires modern browsers with ES6+ support:
- Chrome/Edge 61+
- Firefox 63+
- Safari 10.1+

**No IE11 support** - By design (IE11 EOL 2022)

## Why Vendor Preact?

**Q**: Why include Preact instead of writing a custom VDOM?

**A**: Several reasons:
1. **Battle-tested** - Preact is used in production by thousands of sites
2. **Tiny** - Only ~4KB gzipped, smaller than most custom implementations
3. **Efficient** - Highly optimized reconciliation algorithm
4. **No npm needed** - We vendor it, no package.json required
5. **Focus on innovation** - Spend time on template compilation, not reimplementing VDOM

The innovative part is the **template compilation system** that converts `html` templates to Preact VNodes efficiently.

## Development

No build tools needed. Just edit files and refresh!

For detailed framework documentation and conventions, see `CLAUDE.md`.

## Deployment

Since there's no build step, deployment is simple:

1. Download `api.js` from your SWAPI server:
   ```bash
   wget https://your-server.com/spa-api/.js -O app/api.js
   ```

2. Copy the `app/` directory to your web server

3. Configure server routing if using HTML5 mode

That's it!

## Inspiration

This framework combines ideas from:
- **[lit-html](https://lit.dev/)** - Tagged template literals for HTML
- **Vue 3** - Proxy-based reactivity system
- **Preact** - Efficient VDOM reconciliation (vendored)
- **Svelte** - Component-first architecture
- **Web Components** - Native browser APIs

The template compilation system is our own innovation.

## License

See LICENSE.md
