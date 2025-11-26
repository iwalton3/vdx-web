# Framework Bundle

This directory contains the bundled version of the custom framework, packaged as a single self-contained JavaScript file that can be used in any static website without a build step.

## Files

- **framework-bundle.js** - The complete framework bundle (~146 KB)
- **test-bundle.html** - Simple test page to verify the framework works
- **jellyfin-modal-demo.html** - Complete POC of a Jellyfin settings modal

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
        import { defineComponent, html } from './framework-bundle.js';

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

The bundled framework includes:

- **defineComponent** - Define reactive Web Components
- **html** - Tagged template for creating templates with auto-escaping
- **raw** - Render trusted HTML without escaping
- **when** - Conditional rendering helper
- **each** - List rendering helper
- **reactive** - Create reactive objects
- **createEffect** - Create reactive effects
- **createStore** - Create reactive stores with persistence
- **notify** - Show notifications
- **darkTheme** - Dark theme store
- **localStore** - localStorage wrapper

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
import { defineComponent, html, when, each } from './framework-bundle.js';

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

## Rebuilding the Bundle

To rebuild the bundle after making changes to the framework:

```bash
node ../build-bundle.js
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

- Uncompressed: ~146 KB
- Gzipped: ~35 KB (estimated)

The bundle includes:
- Preact 10.x (~4 KB core)
- Reactive system
- Template compiler
- Component system
- Utilities

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
