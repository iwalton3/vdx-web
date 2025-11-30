# VDX - Vanilla Developer Experience

**vdx-web** (core framework) + **vdx-ui** (component library)

A modern web framework with **ZERO npm dependencies**. Reactive state, components, routing, two-way binding - all running directly in the browser with no build step.

## Key Features

- **Zero dependencies** - No npm, no node_modules, no supply chain risk
- **No build step** - ES6 modules run directly in the browser
- **Reactive state** - Vue-style proxy-based reactivity
- **Two-way binding** - `x-model` with automatic type conversion
- **Component system** - Web Components with Preact rendering
- **Router** - Hash and HTML5 routing with lazy loading
- **Static site friendly** - Embed components in any HTML page

## Quick Start

```bash
cd app
python3 test-server.py
```

Then open: **http://localhost:9000/**

That's it! No `npm install`, no build process, no dependencies to install.

**New to VDX?** Check out the **[Step-by-Step Tutorial](docs/tutorial.md)** for a comprehensive guide.

## VS Code Setup (Optional)

For CSS and HTML syntax highlighting in components, install [es6-string-html](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html).

Ctrl+P, then:
```
ext install Tobermory.es6-string-html
```

Use a `/*css*/` comment in your styles to get highlighting:

```javascript
styles: /*css*/`
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

## Two-Way Data Binding

A feature even React doesn't have - automatic two-way binding with type conversion:

```javascript
defineComponent('user-form', {
    data() {
        return {
            username: '',
            age: 18,
            newsletter: false
        };
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
    },

    methods: {
        handleSubmit(e) {
            console.log({
                username: this.state.username,
                age: this.state.age,          // Already a number!
                newsletter: this.state.newsletter  // Already a boolean!
            });
        }
    }
});
```

The framework automatically uses the correct attribute (`value` or `checked`), sets up the right event, and converts types.

## Live Demos

| Demo | Description |
|------|-------------|
| [E-commerce Shop](https://iwalton.com/apps/shop/) | Full shopping experience with routing and state management |
| [Component Library](https://iwalton.com/componentlib/) | Interactive showcase of all vdx-ui components |
| [Playground](https://iwalton.com/playground.html) | Core framework features demo |
| [Static Integration](https://iwalton.com/bundle-demo/static-integration-demo.html) | Embedding components in static HTML |
| [Framework Tests](https://iwalton.com/tests/) | Comprehensive test suite |

## Documentation

- **[docs/tutorial.md](docs/tutorial.md)** - Step-by-step tutorial with hands-on examples
- **[docs/components.md](docs/components.md)** - Component development patterns, props, children
- **[docs/templates.md](docs/templates.md)** - Template system, x-model, helpers
- **[docs/reactivity.md](docs/reactivity.md)** - Reactive state, stores, computed
- **[docs/routing.md](docs/routing.md)** - Router setup, lazy loading
- **[docs/security.md](docs/security.md)** - XSS protection, input validation, CSP
- **[docs/bundles.md](docs/bundles.md)** - Using pre-bundled versions
- **[docs/api-reference.md](docs/api-reference.md)** - Complete API reference
- **[CLAUDE.md](CLAUDE.md)** - Quick reference for AI coding assistants

---

## Why VDX?

In the age of code rot, supply chain vulnerabilities, and dependency chains too big to review, this project explores another path.

### Core Principles

- **Zero npm dependencies** - No package.json, no node_modules, no supply chain risk
- **No build step** - Runs directly in the browser using ES6 modules
- **Battle-tested core** - Vendored Preact (~4KB) for DOM reconciliation
- **Modern DX** - Reactive state, components, routing, two-way binding
- **Production ready** - 230+ passing tests, XSS protection, used in real apps

### Technical Innovation

- **Template compilation system** - Compiles `html`` templates once, applies values on re-render
- **Smart two-way binding** - `x-model` with automatic type conversion
- **Chainable event handlers** - Combine x-model with on-input/on-change for custom logic
- **Auto-bound methods** - No manual `.bind(this)` needed
- **Computed properties** - Memoized values with dependency tracking
- **Virtual scrolling** - Efficiently render massive lists

## Static Site Integration

Components work like native HTML elements, making them perfect for enhancing static sites:

- **Vanilla JS event listeners** - Use `addEventListener()` on components like any HTML element
- **DOM attribute propagation** - `setAttribute()` changes automatically flow into components
- **Direct prop setting** - Pass arrays/objects/functions directly: `element.items = [...]`
- **Children props** - Pass HTML content inside component tags, access via `this.props.children`
- **Nested component hydration** - VDX components in light DOM children hydrate automatically, enabling SSG patterns
- **No framework lock-in** - Components integrate with jQuery, vanilla JS, or any other code

**Important:** Components are a boundary between vanilla JS and VDX. The framework manages everything *inside* a component's template - don't use DOM manipulation (`appendChild`, `innerHTML`, etc.) on elements inside components, as the virtual DOM will overwrite changes on the next render.

See the [Static Integration Demo](/bundle-demo/static-integration-demo.html) for live examples.

### Hydration Support

VDX supports **automatic hydration** of component trees from static HTML - perfect for static site generators (Hugo, Jekyll, Eleventy):

```html
<!-- Server-rendered or static HTML -->
<collapsible-panel title="Settings">
    <theme-switcher mode="dark"></theme-switcher>
    <volume-control level="80"></volume-control>
</collapsible-panel>
```

When the page loads, VDX automatically captures children, parses them as VNodes, and hydrates nested components recursively. No special hydration API needed.

## Architecture

### How It Works

1. **Template Compilation** - `html`` templates compiled once to AST structure
2. **Value Application** - On each render, values applied to create Preact VNodes
3. **Preact Reconciliation** - Preact efficiently updates the real DOM

```javascript
// Template compiled once when first rendered
const template = html`<div>${this.state.count}</div>`;

// On re-render: apply new values → Preact VNode → Preact reconciles DOM
```

### Why Vendor Preact?

1. **Battle-tested** - Used in production by thousands of sites
2. **Tiny** - Only ~4KB gzipped, smaller than most custom implementations
3. **Efficient** - Highly optimized reconciliation algorithm
4. **No npm needed** - We vendor it, no package.json required

The innovative part is the **template compilation system** that converts `html`` templates to Preact VNodes efficiently without JSX or a build step.

## Project Structure

```
app/
├── lib/                     # vdx-web: Core framework
│   ├── framework.js         # Main barrel export
│   ├── router.js            # Router system
│   ├── utils.js             # Utilities (notify, darkTheme, etc.)
│   └── core/                # Framework internals (~3000 lines)
├── dist/                    # Pre-bundled versions for embedding
├── componentlib/            # vdx-ui: Professional UI component library
├── components/              # Shared UI components
├── tests/                   # Test suite (187 tests)
└── index.html               # Entry point
```

## Two Ways to Use

**1. Library imports (development):**
```javascript
import { defineComponent, html, reactive } from './lib/framework.js';
import { Router } from './lib/router.js';
import { notify, darkTheme } from './lib/utils.js';
```

**2. Pre-bundled (embedding/simple projects):**
```javascript
import { defineComponent, html, reactive } from './dist/framework.js';
// Everything in one ~74KB file
```

## Security Features

### Defense-in-Depth XSS Protection

1. **Symbol-based trust markers** - `HTML_MARKER` and `RAW_MARKER` are non-exported Symbols
2. **Context-aware escaping** - URLs, attributes, text content each handled correctly
3. **toString() attack prevention** - Uses `Object.prototype.toString.call()` for objects
4. **No dangerous fallbacks** - Removed all `dangerouslySetInnerHTML` except in `raw()`

```javascript
// SAFE - Auto-escaped
html`<div>${userInput}</div>`

// SAFE - URL sanitized
html`<a href="${userUrl}">Link</a>`

// USE ONLY FOR TRUSTED CONTENT
html`<div>${raw(trustedApiHtml)}</div>`
```

## Running Tests

```bash
cd app
python3 test-server.py
```

Then open: **http://localhost:9000/tests/**

## Browser Compatibility

Requires modern browsers with ES6+ support:
- Chrome/Edge 61+
- Firefox 63+
- Safari 10.1+

**No IE11 support** - By design (IE11 EOL 2022)

## Deployment

Since there's no build step, deployment is simple:

1. Copy the `app/` directory to your web server
2. Configure server routing if using HTML5 mode (see [docs/routing.md](docs/routing.md))

That's it!

## Use Cases

- **Sustainable projects** - No dependency rot or supply chain issues
- **Embedded environments** - Jellyfin Media Player, Electron apps, etc.
- **Quick prototypes** - Just drop in one file and start building
- **Legacy modernization** - Add reactive components without a complete rewrite
- **Security-conscious projects** - Audit the entire codebase (~3000 lines)
- **Learning** - Understand how modern frameworks work under the hood

## Philosophy

In a world where a simple "hello world" requires hundreds of megabytes of dependencies, we asked: **What if we didn't?**

**Zero dependencies doesn't mean zero features.**

## Inspiration

- **[lit-html](https://lit.dev/)** - Tagged template literals for HTML
- **Vue 3** - Proxy-based reactivity system
- **Preact** - Efficient VDOM reconciliation (vendored)
- **Svelte** - Component-first architecture
- **Web Components** - Native browser APIs

## License

See LICENSE.md

## Contributing

PRs are welcome! Please ensure:
- No npm dependencies are added
- Tests pass (see `/app/tests/` and `/componentlib-e2e/`)
- Code follows existing patterns
- Security best practices maintained

## Acknowledgments

- **Preact team** - For creating an amazing, tiny VDOM library
- **Vue.js** - For inspiration on reactivity system
- **lit-html** - For tagged template literal ideas
- **developit/htm** - For optimization ideas for template engine
