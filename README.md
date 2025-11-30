# VDX - Vanilla Developer Experience

**vdx-web** (core framework) + **vdx-ui** (component library)

A web framework as close to modern frameworks as possible, but with **ZERO npm dependencies**. In the age of code rot, supply chain vulnerabilities, and dependency chains too big to review, this project explores another path.

## What Makes This Special

This is **not another JavaScript framework**. This is a statement about sustainability, security, and simplicity in web development.

### Core Principles

- **Zero npm dependencies** - No package.json, no node_modules, no supply chain risk
- **No build step** - Runs directly in the browser using ES6 modules
- **Battle-tested core** - Vendored Preact (~4KB) for DOM reconciliation
- **Modern DX** - Reactive state, components, routing, two-way binding
- **Production ready** - 230+ passing tests, XSS protection, used in real apps

### Technical Innovation

- **Template compilation system** - Compiles `html`` templates once, applies values on re-render
- **Smart two-way binding** - `x-model` with automatic type conversion (React doesn't have this!)
- **Chainable event handlers** - Combine x-model with on-input/on-change for custom logic
- **Auto-bound methods** - No manual `.bind(this)` needed
- **Computed properties** - Memoized values with dependency tracking
- **Virtual scrolling** - Efficiently render massive lists

## Quick Start

```bash
cd app
python3 test-server.py
```

Then open: **http://localhost:9000/**

That's it! No `npm install`, no build process, no dependencies to install.

## VS Code Setup (Optional)

For CSS and HTML syntax highlighting in components, install [es6-string-html](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html).

Ctrl+P, then:
```
ext install Tobermory.es6-string-html
```

You need to use a `/*css*/` comment in your styles like this to get highlighting:

```javascript
styles: /*css*/`
    :host {
        display: block;
    }
    .button {
        background: #007bff;
    }
`
```

## Hello World

```html
<!DOCTYPE html>
<html>
<body>
    <my-counter></my-counter>

    <script type="module">
        import { defineComponent, html } from './lib/framework.js';

        defineComponent('my-counter', {
            data() {
                return { count: 0 };
            },

            template() {
                return html`
                    <div>
                        <h1>Count: ${this.state.count}</h1>
                        <button on-click="${() => this.state.count++}">
                            Increment
                        </button>
                    </div>
                `;
            }
        });
    </script>
</body>
</html>
```

No compilation. No bundling. Just refresh your browser.

## Two-Way Data Binding Example

A feature even React doesn't have - automatic two-way data binding with type conversion:

```javascript
import { defineComponent, html } from './lib/framework.js';

defineComponent('user-form', {
    data() {
        return {
            username: '',
            age: 18,
            newsletter: false
        };
    },

    methods: {
        handleSubmit(e) {
            e.preventDefault();
            console.log({
                username: this.state.username,
                age: this.state.age,          // Already a number!
                newsletter: this.state.newsletter  // Already a boolean!
            });
        }
    },

    template() {
        return html`
            <form on-submit-prevent="handleSubmit">
                <input type="text" x-model="username" placeholder="Username">
                <input type="number" x-model="age" min="13" max="120">
                <label>
                    <input type="checkbox" x-model="newsletter">
                    Subscribe to newsletter
                </label>
                <button type="submit">Submit</button>
            </form>

            <pre>
                Username: ${this.state.username}
                Age: ${this.state.age} (type: ${typeof this.state.age})
                Newsletter: ${this.state.newsletter}
            </pre>
        `;
    }
});
```

The framework automatically:
- Uses the correct attribute (`value` or `checked`)
- Sets up the right event (`input` or `change`)
- Converts types (numbers, booleans) automatically
- Updates state and re-renders on changes

## Architecture

### How It Works

1. **Template Compilation** - `html`` templates compiled once to AST structure
2. **Value Application** - On each render, values applied to create Preact VNodes
3. **Preact Reconciliation** - Preact efficiently updates the real DOM

```javascript
// Template compiled once when first rendered ✓
const template = html`<div>${this.state.count}</div>`;

// On re-render: apply new values → Preact VNode → Preact reconciles DOM
```

### Why This Approach?

- **No string manipulation on re-render** - Template structure cached
- **Efficient updates** - Preact's battle-tested VDOM reconciliation
- **Type safety** - Functions and objects passed by reference, not serialized
- **Zero build** - No JSX transform, no bundler, runs in browser
- **Familiar syntax** - Keep the `html`` tagged template syntax developers love

### Why Vendor Preact?

**Q**: Why include Preact instead of writing a custom VDOM?

**A**: Several reasons:
1. **Battle-tested** - Used in production by thousands of sites
2. **Tiny** - Only ~4KB gzipped, smaller than most custom implementations
3. **Efficient** - Highly optimized reconciliation algorithm
4. **No npm needed** - We vendor it, no package.json required
5. **Focus on innovation** - Spend time on template compilation, not reimplementing VDOM

The innovative part is the **template compilation system** that converts `html`` templates to Preact VNodes efficiently without JSX or a build step.

## Project Structure

```
app/
├── lib/                     # vdx-web: Core framework
│   ├── framework.js         # Main barrel export (defineComponent, html, reactive, etc.)
│   ├── router.js            # Router system
│   ├── utils.js             # Utilities (notify, darkTheme, localStore, etc.)
│   ├── core/                # Framework internals (~3000 lines)
│   │   ├── reactivity.js    # Proxy-based reactive state (Vue 3-inspired)
│   │   ├── store.js         # Stores with localStorage persistence
│   │   ├── template.js      # Tagged template literals with XSS protection
│   │   ├── template-compiler.js # Innovative template→VNode compiler
│   │   └── component.js     # Web Components with Preact rendering
│   └── vendor/
│       └── preact/          # Vendored Preact 10.x (~4KB, no npm!)
├── dist/                    # Pre-bundled versions for embedding
│   ├── framework.js         # Complete framework bundle (~85KB)
│   ├── router.js            # Standalone router (~10KB)
│   └── utils.js             # Standalone utilities (~7KB)
├── componentlib/            # vdx-ui: Professional UI component library (cl-* prefix)
├── components/              # Shared UI components
├── playground/              # Interactive framework demos
├── bundle-demo/             # Examples using dist/ bundles
├── styles/                  # Global CSS
├── tests/                   # Test suite (187 tests)
└── index.html               # Entry point
```

## Two Ways to Use the Framework

**1. Library imports (development):**
```javascript
import { defineComponent, html, reactive } from './lib/framework.js';
import { Router } from './lib/router.js';
import { notify, darkTheme } from './lib/utils.js';
```

**Benefits:**
- Clean imports from barrel export files
- Individual file caching in browser
- Easy debugging with source maps
- Smaller initial load for simple apps

**2. Pre-bundled (embedding/simple projects):**
```javascript
import { defineComponent, html, reactive } from './dist/framework.js';
// Everything in one file - perfect for demos!
```

**Benefits:**
- Single file download (~74KB framework.js)
- No dependency resolution needed
- Perfect for demos and embedding
- See `app/bundle-demo/` for examples

## Live Demos

Start the server and explore:

```bash
cd app
python3 test-server.py
```

### Application Demos

| Demo | URL | Description |
|------|-----|-------------|
| **E-commerce Shop** | [/apps/shop/](https://iwalton.com/apps/shop/) | Full shopping experience with product catalog, filtering, cart, and checkout flow. Demonstrates routing, state management, and responsive design. |
| **iwalton.com** | [iwalton.com](https://iwalton.com/) | Personal website re-implementation with user management, authentication, password generator, and home automation tools. |

### Framework Showcases

| Demo | URL | Description |
|------|-----|-------------|
| **Component Library** | [/componentlib/](https://iwalton.com/componentlib/) | Interactive showcase of all vdx-ui components (buttons, forms, dialogs, data tables, etc.) with live examples. |
| **Playground** | [/playground.html](https://iwalton.com/playground.html) | Core framework features: reactive state, x-model binding, each/when helpers, computed properties, virtual scrolling. |
| **Bundle Demo** | [/bundle-demo/](https://iwalton.com/bundle-demo/) | Examples using pre-bundled framework versions for embedding scenarios. |
| **Framework Tests** | [/tests/](https://iwalton.com/tests/) | Comprehensive tests. |

## Running Tests

```bash
cd app
python3 test-server.py
```

Then open: **http://localhost:9000/tests/**

Tests cover:
- Reactive state system
- Template compilation and value application
- Preact VNode generation
- XSS protection (including toString() attack prevention)
- Component lifecycle and event binding
- Router (hash & HTML5 modes)
- Store persistence
- Authentication flow

## Security Features

### Defense-in-Depth XSS Protection

1. **Symbol-based trust markers** - `HTML_MARKER` and `RAW_MARKER` are non-exported Symbols
2. **Context-aware escaping** - URLs, attributes, text content each handled correctly
3. **toString() attack prevention** - Uses `Object.prototype.toString.call()` for objects
4. **No dangerous fallbacks** - Removed all `dangerouslySetInnerHTML` except in `raw()`

**Always use the `html` template tag:**

```javascript
// ✅ SAFE - Auto-escaped
html`<div>${userInput}</div>`

// ✅ SAFE - URL sanitized
html`<a href="${userUrl}">Link</a>`

// ⚠️ USE ONLY FOR TRUSTED CONTENT
html`<div>${raw(trustedApiHtml)}</div>`
```

## Browser Compatibility

Requires modern browsers with ES6+ support:
- Chrome/Edge 61+
- Firefox 63+
- Safari 10.1+

**No IE11 support** - By design (IE11 EOL 2022)

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Quick reference for AI coding assistants
- **[docs/components.md](docs/components.md)** - Component development patterns, props, children
- **[docs/templates.md](docs/templates.md)** - Template system, x-model, helpers
- **[docs/reactivity.md](docs/reactivity.md)** - Reactive state, stores, computed
- **[docs/routing.md](docs/routing.md)** - Router setup, lazy loading
- **[docs/security.md](docs/security.md)** - XSS protection, input validation, CSP
- **[docs/testing.md](docs/testing.md)** - Running tests, writing tests
- **[docs/bundles.md](docs/bundles.md)** - Using pre-bundled versions
- **[docs/componentlib.md](docs/componentlib.md)** - Professional UI component library
- **[docs/api-reference.md](docs/api-reference.md)** - Complete API reference

## Deployment

Since there's no build step, deployment is simple:

1. Copy the `app/` directory to your web server

2. Configure server routing if using HTML5 mode (see [docs/routing.md](docs/routing.md))

That's it!

## Inspiration

This framework combines ideas from:
- **[lit-html](https://lit.dev/)** - Tagged template literals for HTML
- **Vue 3** - Proxy-based reactivity system
- **Preact** - Efficient VDOM reconciliation (vendored)
- **Svelte** - Component-first architecture
- **Web Components** - Native browser APIs

The template compilation system is our own innovation.

## Use Cases

Perfect for:
- **Sustainable projects** - No dependency rot or supply chain issues
- **Embedded environments** - Jellyfin Media Player, Electron apps, etc.
- **Quick prototypes** - Just drop in one file and start building
- **Legacy modernization** - Add reactive components without a complete rewrite
- **Security-conscious projects** - Audit the entire codebase (~3000 lines)
- **Learning** - Understand how modern frameworks work under the hood

## Philosophy

In a world where a simple "hello world" requires hundreds of megabytes of dependencies, we asked: **What if we didn't?**

This project proves you can have:
- Modern developer experience
- Reactive state management
- Component-based architecture
- Template compilation
- Router with lazy loading
- Type-safe two-way binding

All without npm, without build tools, without the complexity.

**Zero dependencies doesn't mean zero features.**

## License

See LICENSE.md

## Contributing

This is an experimental project, but PRs are welcome! Please ensure:
- No npm dependencies are added
- Tests pass (see `/app/tests/` and `/componentlib-e2e/`)
- Code follows existing patterns
- Security best practices maintained

## Acknowledgments

- **Preact team** - For creating an amazing, tiny VDOM library
- **Vue.js** - For inspiration on reactivity system
- **lit-html** - For tagged template literal ideas
