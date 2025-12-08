# Router

Complete guide to client-side routing with the framework.

## Table of Contents

- [Basic Setup](#basic-setup)
- [Defining Routes](#defining-routes)
- [Nested Routes](#nested-routes)
- [Route Parameters](#route-parameters)
- [Query Parameters](#query-parameters)
- [Reactive Navigation](#reactive-navigation)
- [Lazy Loading](#lazy-loading)
- [Navigation](#navigation)
- [HTML5 Routing](#html5-routing)
- [Route Guards](#route-guards)
- [Router Cleanup](#router-cleanup)

## Basic Setup

```javascript
import { enableRouting } from './lib/router.js';

// Get the router outlet element
const outlet = document.querySelector('router-outlet');

// Create router with routes - outlet and link components are auto-registered
const router = enableRouting(outlet, {
    '/': {
        component: 'home-page'
    },
    '/about/': {
        component: 'about-page'
    },
    '/users/:id/': {
        component: 'user-profile'
    }
});
```

**In your HTML:**
```html
<router-outlet></router-outlet>
```

## Defining Routes

Routes are defined in `app.js` or your main entry file:

```javascript
const router = enableRouting(outlet, {
    '/': {
        component: 'home-page'
    },
    '/admin/': {
        component: 'admin-page',
        require: 'admin'  // Capability check
    },
    '/users/:id/': {
        component: 'user-profile'
    },
    '/search/': {
        component: 'search-page'
    }
});
```

## Nested Routes

Routes can be nested to create hierarchical URL structures. The framework automatically flattens nested routes:

```javascript
const router = enableRouting(outlet, {
    '/': { component: 'home-page' },

    // Nested admin routes
    '/admin/': {
        component: 'admin-layout',
        routes: {
            '/': { component: 'admin-dashboard' },  // /admin/
            '/users/': { component: 'admin-users' },  // /admin/users/
            '/users/:id/': { component: 'admin-user-edit' },  // /admin/users/123/
            '/settings/': { component: 'admin-settings' }  // /admin/settings/
        }
    },

    // Nested product routes
    '/products/': {
        routes: {
            '/': { component: 'product-list' },  // /products/
            '/:category/': { component: 'product-category' },  // /products/electronics/
            '/:category/:sku/': { component: 'product-detail' }  // /products/electronics/abc123/
        }
    }
});
```

**How nesting works:**
1. The `routes` property contains child routes
2. Child paths are prefixed with the parent path
3. Parent routes can have their own `component` (for layout wrappers)
4. Routes are flattened internally: `/admin/users/` becomes a single route entry

**Use cases:**
- Admin sections with shared layouts
- Multi-level product categories
- User account areas with multiple pages
- Any hierarchical URL structure

## Route Parameters

Define routes with `:param` syntax to capture URL segments:

```javascript
const router = enableRouting(outlet, {
    '/': { component: 'home-page' },
    '/users/:id/': { component: 'user-profile' },
    '/products/:category/:sku/': { component: 'product-detail' }
});
```

### Accessing Route Parameters

Parameters are automatically passed to components as the `params` prop:

```javascript
defineComponent('user-profile', {
    props: {
        params: {},  // { id: '123' }
        query: {}    // Query string parameters
    },

    mounted() {
        // Access route params from props
        this.loadUser(this.props.params.id);
    },

    methods: {
        loadUser(userId) {
            console.log('Loading user:', userId);
            // Fetch user data...
        }
    }
});
```

### Multiple Parameters

Routes can have multiple parameters:

```javascript
// Route: /products/:category/:sku/
// URL: /products/electronics/ABC123/

defineComponent('product-detail', {
    props: {
        params: {},
        query: {}
    },

    mounted() {
        const { category, sku } = this.props.params;
        console.log(`Category: ${category}, SKU: ${sku}`);
        // category = 'electronics', sku = 'ABC123'
    }
});
```

## Query Parameters

Query strings are parsed and passed as the `query` prop. This works in both hash mode (`#/path?q=1`) and HTML5 mode (`/path?q=1`):

```javascript
// URL: /search?q=hello&page=2

defineComponent('search-page', {
    props: {
        params: {},
        query: {}  // { q: 'hello', page: '2' }
    },

    mounted() {
        if (this.props.query.q) {
            this.performSearch(this.props.query.q);
        }
    },

    methods: {
        performSearch(term) {
            console.log('Searching for:', term);
            // Use this.props.query.page for pagination
        }
    }
});
```

### Hash Mode Query Strings

In hash mode, query strings work after the hash:

```
#/search?q=hello&page=2
```

The router correctly parses both the path (`/search`) and query (`{ q: 'hello', page: '2' }`).

## Reactive Navigation

When navigating to the same component with different parameters or query strings, the router **updates the existing component's props** instead of recreating it. This enables reactive updates:

```javascript
defineComponent('user-profile', {
    props: {
        params: {},
        query: {}
    },

    data() {
        return {
            user: null
        };
    },

    mounted() {
        this.loadUser();
    },

    // Watch for prop changes using the computed pattern
    template() {
        // Re-render whenever params change
        const userId = this.props.params.id;

        // Side effect: load user when id changes
        if (userId && userId !== this._lastUserId) {
            this._lastUserId = userId;
            this.loadUser();
        }

        return html`
            <div>
                ${when(this.state.user, html`
                    <h1>${this.state.user.name}</h1>
                `, html`
                    <p>Loading user ${userId}...</p>
                `)}
            </div>
        `;
    },

    methods: {
        async loadUser() {
            const userId = this.props.params.id;
            this.state.user = await fetchUser(userId);
        }
    }
});
```

### Navigation Between Items

When clicking links to different items of the same type, the component receives updated props:

```javascript
// In a list component
template() {
    return html`
        <ul>
            ${each(this.state.users, user => html`
                <li>
                    <router-link to="/users/${user.id}/">${user.name}</router-link>
                </li>
            `)}
        </ul>
    `;
}
```

Clicking different users updates the `user-profile` component's `params.id` without unmounting/remounting it.

## Lazy Loading

For better performance, routes can be lazy-loaded using dynamic imports. This improves Time to First Contentful Paint by only loading the requested route initially:

```javascript
const router = enableRouting(outlet, {
    '/': {
        component: 'home-page',
        load: () => import('./home.js')  // Lazy load on demand
    },
    '/admin/': {
        component: 'admin-page',
        require: 'admin',
        load: () => import('./admin.js')  // Component loads its own dependencies
    },
    '/users/:id/': {
        component: 'user-profile',
        load: () => import('./user-profile.js')
    }
});
```

**How it works:**
1. When a route is visited for the first time, the router calls the `load` function
2. The component module is dynamically imported
3. Component is cached in `router.loadedComponents` Set
4. Subsequent visits to the same route are instant (no re-download)

**Benefits:**
- Only the initial route loads on page load
- Other routes load on-demand when navigated to
- Components manage their own dependencies via import statements
- ES module caching ensures no duplicate downloads

**Component dependencies:**

Each lazy-loaded component should import its own dependencies:

```javascript
// In home.js
import { defineComponent } from './lib/framework.js';
import './components/tiles.js';     // Component imports what it needs
import './auth/user-tools.js';

export default defineComponent('home-page', {
    // ...
});
```

The browser's ES module system automatically caches all imports, so there's no performance penalty for components importing their dependencies.

## Navigation

### Declarative Navigation

Use `router-link` for navigation:

```javascript
<router-link to="/about/">About</router-link>
<router-link to="/users/123/">User Profile</router-link>
```

### Programmatic Navigation

Navigate via JavaScript:

```javascript
import { Router } from './lib/router.js';

// Assuming router is accessible (e.g., global or imported)
methods: {
    goToProfile(userId) {
        router.navigate(`/users/${userId}/`);
    },

    goToSearch(query) {
        router.navigate('/search/', { q: query, page: '1' });
    }
}
```

**With query parameters:**
```javascript
router.navigate('/search/', { q: 'test', page: '2' });
// Results in: /search/?q=test&page=2
```

## HTML5 Routing

The router uses hash routing (`/#/`) by default. To use HTML5 routing, add a `<base>` tag:

```html
<base href="/app/">
```

The router automatically:
- Switches to real paths (no `#`)
- Redirects hash routes to clean URLs
- Handles browser back/forward buttons
- Falls back to hash routing if no `<base>` tag

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
location / {
    try_files $uri $uri/ /index.html;
}
```

**Python test server** (for development):

```bash
cd app
python3 test-server.py
```

This serves the app with proper routing support on http://localhost:9000/

## Route Guards

### Capability-Based Access Control

Require specific capabilities for routes:

```javascript
const router = enableRouting(outlet, {
    '/': {
        component: 'home-page'
    },
    '/admin/': {
        component: 'admin-page',
        require: 'admin'  // Only users with 'admin' capability
    },
    '/moderator/': {
        component: 'moderator-page',
        require: 'moderator'
    }
});
```

**How it works:**
- Router checks if user has required capability before rendering route
- If user lacks capability, router may redirect or show access denied
- Capabilities are checked via your authentication system

**Setting up capabilities:**

The capability check integrates with your authentication store:

```javascript
// In auth/auth.js
const login = createStore({
    user: null,
    capabilities: [],

    // ... auth methods
});

// Router uses this to check capabilities
router.checkCapability = (required) => {
    return login.state.capabilities.includes(required);
};
```

### Custom Route Guards

You can implement custom route guards using the `beforeEach` hook:

```javascript
router.beforeEach(async ({ path, query, route }) => {
    // Return false to prevent navigation
    if (path === '/private/' && !isAuthenticated()) {
        router.navigate('/login/');
        return false;
    }
    return true;
});
```

## Best Practices

### Route Organization

```javascript
// ✅ GOOD - Organized by feature
const router = enableRouting(outlet, {
    // Public routes
    '/': { component: 'home-page', load: () => import('./home.js') },
    '/about/': { component: 'about-page', load: () => import('./about.js') },

    // User routes
    '/users/': { component: 'user-list', load: () => import('./users/list.js') },
    '/users/:id/': { component: 'user-profile', load: () => import('./users/profile.js') },

    // Admin routes (protected)
    '/admin/': { component: 'admin-page', require: 'admin', load: () => import('./admin/index.js') },
    '/admin/users/': { component: 'admin-users', require: 'admin', load: () => import('./admin/users.js') }
});
```

### Use Lazy Loading for Large Apps

```javascript
// ✅ GOOD - Lazy load all routes
const router = enableRouting(outlet, {
    '/': {
        component: 'home-page',
        load: () => import('./home.js')  // Only loads when visited
    },
    // ... more routes
});
```

### Trailing Slashes

Be consistent with trailing slashes:

```javascript
// ✅ GOOD - Consistent trailing slashes
'/about/'
'/users/:id/'

// ❌ BAD - Inconsistent
'/about'
'/users/:id/'
```

## Debugging

Enable router debugging:

```javascript
const router = enableRouting(outlet, {
    // ... routes
}, {
    debug: true  // Logs route changes
});
```

## Router Cleanup

When your application needs to dispose of the router (e.g., in tests, SPAs with multiple routers, or micro-frontends), use the `destroy()` method:

```javascript
// Create router
const router = enableRouting(outlet, routes);

// Later, when cleaning up:
router.destroy();
```

**What `destroy()` does:**
- Removes `popstate` event listeners (browser back/forward buttons)
- Removes `hashchange` event listeners (hash routing mode)
- Clears internal state
- Prevents memory leaks from lingering event handlers

**When to call `destroy()`:**
- In test teardown/cleanup
- When unmounting a micro-frontend
- Before creating a new router instance
- When switching between different router configurations

```javascript
// Example: Test cleanup
afterEach(() => {
    if (router) {
        router.destroy();
        router = null;
    }
});

// Example: Hot module replacement
if (module.hot) {
    module.hot.dispose(() => {
        router.destroy();
    });
}
```

**Important:** Failing to call `destroy()` when re-creating routers can cause:
- Memory leaks from accumulated event listeners
- Multiple route handlers firing for single navigation
- Unexpected behavior from stale router instances

## See Also

- [components.md](components.md) - Component development patterns
- [api-reference.md](api-reference.md) - Complete API reference
