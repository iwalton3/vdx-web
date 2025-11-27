# Distribution Bundles

Standalone, pre-bundled versions of the framework libraries for easy embedding.

## Available Bundles

### `framework.js` (~74 KB)
Complete framework bundle including:
- **Component system:** `defineComponent`
- **Reactivity:** `reactive`, `createEffect`, `computed`, `isReactive`, `watch`, `memo`, `trackAllDependencies`
- **Template system:** `html`, `when`, `each`, `raw`, `pruneTemplateCache`
- **Store system:** `createStore`
- **Preact rendering:** `h`, `Fragment`, `render`, `Component`, `createContext`

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

### `router.js` (~10 KB)
Router library for client-side routing:
- Hash-based routing (default)
- HTML5 History API routing (with `<base>` tag)
- Route guards and hooks
- Query parameters
- Nested routes

**Usage:**
```html
<script type="module">
  import { Router, defineRouterOutlet, defineRouterLink } from './dist/router.js';

  defineRouterOutlet();

  const router = new Router({
    '/': { component: 'home-page' },
    '/about': { component: 'about-page' }
  });

  router.setOutlet(document.querySelector('router-outlet'));
  defineRouterLink(router);
</script>

<router-outlet></router-outlet>
```

### `utils.js` (~7 KB)
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

## Building

Bundles are generated with:
```bash
node bundler-esm.js      # Builds framework.js
node copy-dist-extras.js # Copies router.js and utils.js (strips comments)
```

Or build all at once:
```bash
node bundler-esm.js && node copy-dist-extras.js
```

## Notes

- **No build step required** - Use directly in browsers with ES6 module support
- **Self-contained** - All dependencies bundled (including Preact for framework.js)
- **Tree-shakeable** - Import only what you need
- **No external dependencies** - Works offline, no CDN required

## Examples

See:
- `../bundle-demo/` - Framework bundle demonstration
- `../playground.html` - Interactive framework demos
- `../index.html` - Full app using both router and framework
