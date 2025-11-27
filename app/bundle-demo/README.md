# Bundle Demo

This directory contains examples demonstrating how to use the pre-bundled framework distributions from `../dist/`.

## Files

- **test-bundle.html** - Simple test page verifying framework.js works
- **jellyfin-modal-demo.html** - Complete POC of a Jellyfin settings modal
- **index.html** - Overview of bundle demos

The bundles themselves are in `../dist/`:
- **../dist/framework.js** - Complete framework bundle (~74 KB)
- **../dist/router.js** - Router system (~10 KB)
- **../dist/utils.js** - Utilities (~7 KB)

## Usage

### Basic Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>My App</title>
</head>
<body>
    <my-counter></my-counter>

    <script type="module">
        import { defineComponent, html } from '../dist/framework.js';

        defineComponent('my-counter', {
            data() {
                return { count: 0 };
            },

            methods: {
                increment() {
                    this.state.count++;
                }
            },

            template() {
                return html`
                    <div>
                        <h2>Count: ${this.state.count}</h2>
                        <button on-click="increment">Increment</button>
                    </div>
                `;
            }
        });
    </script>
</body>
</html>
```

### Features

The framework.js bundle includes:

- **defineComponent** - Define reactive Web Components
- **html** - Tagged template for creating templates with auto-escaping
- **raw** - Render trusted HTML without escaping
- **when** - Conditional rendering helper
- **each** - List rendering helper
- **pruneTemplateCache** - Clear template compilation cache
- **reactive** - Create reactive objects
- **createEffect** - Create reactive effects
- **computed** - Create computed values
- **isReactive** - Check if value is reactive
- **watch** - Watch reactive dependencies
- **memo** - Memoize function result
- **trackAllDependencies** - Deep dependency tracking
- **createStore** - Create reactive stores with persistence
- **h, Fragment, render, Component, createContext** - Preact primitives (advanced)

Additional bundles available:
- **utils.js** - `notify`, `darkTheme`, `localStore`, etc.
- **router.js** - `Router`, `defineRouterOutlet`, `defineRouterLink`

### Two-Way Data Binding

The framework supports `x-model` for automatic two-way data binding:

```javascript
defineComponent('my-form', {
    data() {
        return {
            username: '',
            agreed: false
        };
    },

    template() {
        return html`
            <input type="text" x-model="username">
            <input type="checkbox" x-model="agreed">
            <p>Username: ${this.state.username}</p>
        `;
    }
});
```

### Event Handling

Use `on-*` attributes for event binding:

```javascript
template() {
    return html`
        <button on-click="handleClick">Click Me</button>
        <form on-submit-prevent="handleSubmit">
            <input type="text">
        </form>
    `;
}
```

### Conditional and List Rendering

```javascript
import { defineComponent, html, when, each } from '../dist/framework.js';

template() {
    return html`
        ${when(this.state.isLoggedIn,
            html`<p>Welcome!</p>`,
            html`<p>Please log in</p>`
        )}

        <ul>
            ${each(this.state.items, item => html`
                <li>${item.name}</li>
            `)}
        </ul>
    `;
}
```

## Testing

To test the bundle:

1. Start a local web server in this directory:
   ```bash
   python3 -m http.server 8000
   # or
   npx serve
   ```

2. Open your browser to:
   - http://localhost:8000/test-bundle.html - Basic functionality tests
   - http://localhost:8000/jellyfin-modal-demo.html - Full modal demo

## Rebuilding the Bundles

To rebuild the bundles after making changes to the framework:

```bash
cd ../..  # Go to project root
node bundler-esm.js && node copy-dist-extras.js
```

## Use Cases

This bundled framework is perfect for:

- **Embedding in existing applications** - Add reactive components to static sites
- **No build step environments** - Jellyfin Media Player, or other applications that can't use npm/webpack
- **Quick prototypes** - Just drop in one file and start building
- **Legacy projects** - Modernize old codebases without a complete rewrite

## Security

The framework includes built-in XSS protection:

- Automatic context-aware escaping in templates
- Symbol-based trust markers to prevent JSON injection
- URL validation for href/src attributes
- Safe event handler binding

Always use the `html` template tag for user-generated content. Only use `raw()` for trusted, server-generated HTML.

## Size

**framework.js:**
- Uncompressed: ~74 KB
- Gzipped: ~20 KB (estimated)

Includes:
- Preact 10.x (~4 KB core)
- Reactive system (reactive, createEffect, computed, watch, memo, isReactive)
- Template compiler and helpers (html, when, each, raw)
- Component system (defineComponent)
- Store system (createStore)

**router.js:** ~10 KB uncompressed
**utils.js:** ~7 KB uncompressed

## Comparison to Manual DOM Manipulation

**Before (Manual DOM):**
```javascript
function showModal() {
    const modal = document.createElement("div");
    modal.className = "modal";

    const title = document.createElement("h2");
    title.textContent = "Settings";
    modal.appendChild(title);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.addEventListener("change", e => {
        settings.enabled = e.target.checked;
    });
    modal.appendChild(checkbox);

    document.body.appendChild(modal);
}
```

**After (Framework):**
```javascript
defineComponent('settings-modal', {
    data() {
        return { enabled: false };
    },

    template() {
        return html`
            <div class="modal">
                <h2>Settings</h2>
                <input type="checkbox" x-model="enabled">
            </div>
        `;
    }
});

// Usage: document.body.appendChild(document.createElement('settings-modal'));
```

## License

Same as the main project.
