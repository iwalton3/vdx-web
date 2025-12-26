# Pre-Bundled Framework

Complete guide to using the pre-bundled versions of the framework for embedding and simple projects.

## Table of Contents

- [Available Bundles](#available-bundles)
- [Usage Examples](#usage-examples)
- [Building Bundles](#building-bundles)
- [Bundle Demo](#bundle-demo)
- [Use Cases](#use-cases)

## Available Bundles

Located in `/app/dist/`:

### framework.js (~74 KB)
Complete framework bundle including:
- **Component system:** `defineComponent`
- **Reactivity:** `reactive`, `createEffect`, `computed`, `isReactive`, `watch`, `memo`, `trackAllDependencies`
- **Template system:** `html`, `when`, `each`, `raw`, `pruneTemplateCache`
- **Store system:** `createStore`

**Usage:**
```html
<script type="module">
  import { defineComponent, html, when } from './dist/framework.js';

  defineComponent('my-app', {
    data() {
      return { count: 0 };
    },

    template() {
      return html`
        <div>
          <h1>Count: ${this.state.count}</h1>
          <button on-click="${() => this.state.count++}">+</button>
        </div>
      `;
    }
  });
</script>

<my-app></my-app>
```

### router.js (~10 KB)
Router library for client-side routing:
- Hash-based routing (default)
- HTML5 History API routing (with `<base>` tag)
- Route guards and hooks
- Query parameters
- Nested routes

**Usage:**
```html
<script type="module">
  import { enableRouting } from './dist/router.js';

  const outlet = document.querySelector('router-outlet');
  const router = enableRouting(outlet, {
    '/': { component: 'home-page' },
    '/about/': { component: 'about-page' }
  });
</script>

<router-outlet></router-outlet>
```

### utils.js (~7 KB)
Utility functions for common tasks:
- **Notifications:** `notify(message, severity, ttl)`, `notifications` store
- **Dark theme:** `darkTheme` reactive store
- **localStorage:** `localStore(key, initial)` - reactive localStorage wrapper
- **Helpers:** `sleep(ms)`, `range(start, end)`

**Usage:**
```html
<script type="module">
  import { notify, darkTheme, localStore } from './dist/utils.js';

  // Show notification
  notify('Hello!', 'info', 3);

  // Toggle dark theme
  darkTheme.update(s => ({ enabled: !s.enabled }));

  // Reactive localStorage
  const settings = localStore('app-settings', { theme: 'light' });
  settings.state.theme = 'dark'; // Automatically syncs to localStorage
</script>
```

## Usage Examples

### Basic Counter Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>Counter Example</title>
</head>
<body>
    <my-counter></my-counter>

    <script type="module">
        import { defineComponent, html } from './dist/framework.js';

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
            },

            styles: /*css*/`
                div {
                    padding: 20px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                }
                button {
                    background: #007bff;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
            `
        });
    </script>
</body>
</html>
```

### Form with x-model

```html
<!DOCTYPE html>
<html>
<body>
    <user-form></user-form>

    <script type="module">
        import { defineComponent, html } from './dist/framework.js';

        defineComponent('user-form', {
            data() {
                return {
                    username: '',
                    email: '',
                    agreed: false
                };
            },

            methods: {
                handleSubmit(e) {
                    e.preventDefault();
                    console.log({
                        username: this.state.username,
                        email: this.state.email,
                        agreed: this.state.agreed
                    });
                }
            },

            template() {
                return html`
                    <form on-submit-prevent="handleSubmit">
                        <div>
                            <label>Username:
                                <input type="text" x-model="username" placeholder="Username">
                            </label>
                        </div>

                        <div>
                            <label>Email:
                                <input type="email" x-model="email" placeholder="Email">
                            </label>
                        </div>

                        <div>
                            <label>
                                <input type="checkbox" x-model="agreed">
                                I agree to terms
                            </label>
                        </div>

                        <button type="submit" disabled="${!this.state.agreed}">
                            Submit
                        </button>
                    </form>

                    <pre>
                        Username: ${this.state.username}
                        Email: ${this.state.email}
                        Agreed: ${this.state.agreed}
                    </pre>
                `;
            }
        });
    </script>
</body>
</html>
```

### Conditional and List Rendering

```html
<script type="module">
    import { defineComponent, html, when, each } from './dist/framework.js';

    defineComponent('todo-list', {
        data() {
            return {
                todos: [],
                newTodo: ''
            };
        },

        methods: {
            addTodo(e) {
                e.preventDefault();
                if (this.state.newTodo.trim()) {
                    this.state.todos.push({
                        id: Date.now(),
                        text: this.state.newTodo,
                        done: false
                    });
                    this.state.newTodo = '';
                }
            },

            toggleTodo(id) {
                const todo = this.state.todos.find(t => t.id === id);
                if (todo) todo.done = !todo.done;
            },

            removeTodo(id) {
                const index = this.state.todos.findIndex(t => t.id === id);
                this.state.todos.splice(index, 1);
            }
        },

        template() {
            return html`
                <div>
                    <h2>Todo List</h2>

                    <form on-submit-prevent="addTodo">
                        <input type="text" x-model="newTodo" placeholder="New todo">
                        <button type="submit">Add</button>
                    </form>

                    ${when(this.state.todos.length === 0,
                        html`<p>No todos yet!</p>`,
                        html`
                            <ul>
                                ${each(this.state.todos, todo => html`
                                    <li>
                                        <input
                                            type="checkbox"
                                            checked="${todo.done}"
                                            on-change="${() => this.toggleTodo(todo.id)}">
                                        <span style="text-decoration: ${todo.done ? 'line-through' : 'none'}">
                                            ${todo.text}
                                        </span>
                                        <button on-click="${() => this.removeTodo(todo.id)}">
                                            Remove
                                        </button>
                                    </li>
                                `)}
                            </ul>
                        `
                    )}
                </div>
            `;
        }
    });
</script>

<todo-list></todo-list>
```

## Building Bundles

Bundles are generated with:

```bash
cd app
node bundler-esm.js      # Builds framework.js
node copy-dist-extras.js # Copies router.js and utils.js (strips comments)
```

Or build all at once:
```bash
node bundler-esm.js && node copy-dist-extras.js
```

## Bundle Demo

See `/app/bundle-demo/` for complete examples:

- **test-bundle.html** - Simple test page verifying framework.js works
- **jellyfin-modal-demo.html** - Complete POC of a Jellyfin settings modal
- **index.html** - Overview of bundle demos

**To run demos:**
```bash
cd app
python3 test-server.py
```

Then open: http://localhost:9000/bundle-demo/

## Notes

- **No build step required** - Use directly in browsers with ES6 module support
- **Self-contained** - All dependencies bundled
- **Tree-shakeable** - Import only what you need
- **No external dependencies** - Works offline, no CDN required

## Size Comparison

**framework.js:**
- Uncompressed: ~74 KB
- Gzipped: ~20 KB (estimated)

**Includes:**
- Reactive system (reactive, createEffect, computed, watch, memo, isReactive)
- Template compiler and helpers (html, when, each, raw)
- Component system (defineComponent)
- Store system (createStore)

**router.js:** ~10 KB uncompressed
**utils.js:** ~7 KB uncompressed

## Use Cases

This bundled framework is perfect for:

- **Embedding in existing applications** - Add reactive components to static sites
- **No build step environments** - Jellyfin Media Player, Electron apps, or other applications that can't use npm/webpack
- **Quick prototypes** - Just drop in one file and start building
- **Legacy projects** - Modernize old codebases without a complete rewrite
- **Security-conscious projects** - Audit the entire codebase
- **Learning** - Understand how modern frameworks work

## Security

The framework includes built-in XSS protection:

- Automatic context-aware escaping in templates
- Symbol-based trust markers to prevent JSON injection
- URL validation for href/src attributes
- Safe event handler binding

Always use the `html` template tag for user-generated content. Only use `raw()` for trusted, server-generated HTML.

## See Also

- [components.md](components.md) - Component development patterns
- [templates.md](templates.md) - Template system, x-model, helpers
- [api-reference.md](api-reference.md) - Complete API reference
