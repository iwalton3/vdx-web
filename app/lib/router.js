/**
 * Router System
 *
 * Client-side routing with support for:
 * - Hash-based routing (default)
 * - HTML5 History API routing (with <base> tag)
 * - Lazy loading routes with dynamic imports
 * - Route guards and hooks
 * - URL parameters (e.g., /product/:id/:sku)
 * - Query parameters (including hash mode: #/path?q=1)
 * - Reactive prop updates on same-component navigation
 * - Nested routes
 */

import { createStore, pruneTemplateCache, html, defineComponent } from './framework.js';

// Singleton router instance
let _router = null;

/**
 * Shallow compare two objects for equality
 * @private
 * @param {Object} a - First object
 * @param {Object} b - Second object
 * @returns {boolean} True if objects have same keys and values
 */
function shallowEqual(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
        if (a[key] !== b[key]) return false;
    }
    return true;
}

/**
 * Get the singleton router instance
 * @returns {Router|null} The router instance, or null if not set
 */
export function getRouter() {
    return _router;
}

/**
 * Parse query string into object
 * @private
 * @param {string} queryString - Query string to parse
 * @returns {Object<string, string>} Parsed query parameters
 */
function parseQuery(queryString) {
    if (!queryString) return {};

    const params = {};
    const pairs = queryString.split('&');

    for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key) {
            params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
    }

    return params;
}

/**
 * Convert object to query string
 * @private
 * @param {Object<string, any>} params - Parameters to stringify
 * @returns {string} Query string
 */
function stringifyQuery(params) {
    const pairs = [];

    for (const [key, value] of Object.entries(params)) {
        if (value != null) {
            pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
    }

    return pairs.join('&');
}

/**
 * Validate a component name for security.
 * Custom element names must:
 * - Contain at least one hyphen
 * - Start with a lowercase letter
 * - Not contain uppercase letters
 * - Match the PotentialCustomElementName production from the HTML spec
 * @private
 * @param {string} name - Component name to validate
 * @returns {boolean} True if valid custom element name
 */
function isValidCustomElementName(name) {
    if (!name || typeof name !== 'string') {
        return false;
    }

    // Must contain a hyphen (required for custom elements)
    if (!name.includes('-')) {
        return false;
    }

    // Must start with lowercase letter
    if (!/^[a-z]/.test(name)) {
        return false;
    }

    // Must only contain valid characters (lowercase, digits, hyphens)
    // Per HTML spec: PCENChar (restricted for security)
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
        return false;
    }

    // Reserved names that browsers won't allow
    const reserved = [
        'annotation-xml',
        'color-profile',
        'font-face',
        'font-face-src',
        'font-face-uri',
        'font-face-format',
        'font-face-name',
        'missing-glyph'
    ];

    if (reserved.includes(name)) {
        return false;
    }

    return true;
}

/**
 * Convert route pattern to regex and extract param names
 * @private
 * @param {string} pattern - Route pattern (e.g., '/product/:id/:sku')
 * @returns {{regex: RegExp, paramNames: string[]}} Compiled pattern
 */
function compileRoutePattern(pattern) {
    const paramNames = [];

    // Escape regex special chars except for our param syntax
    let regexStr = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        // Replace :paramName with capture group
        .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, paramName) => {
            paramNames.push(paramName);
            return '([^/]+)';
        });

    // Match with or without trailing slash
    if (regexStr.endsWith('/')) {
        regexStr = regexStr.slice(0, -1) + '/?';
    } else {
        regexStr = regexStr + '/?';
    }

    return {
        regex: new RegExp(`^${regexStr}$`),
        paramNames
    };
}

/**
 * Match a path against a compiled route pattern
 * @private
 * @param {string} path - URL path to match
 * @param {{regex: RegExp, paramNames: string[]}} compiledPattern - Compiled route pattern
 * @returns {{match: boolean, params: Object<string, string>}} Match result with extracted params
 */
function matchRoute(path, compiledPattern) {
    const match = path.match(compiledPattern.regex);

    if (!match) {
        return { match: false, params: {} };
    }

    const params = {};
    for (let i = 0; i < compiledPattern.paramNames.length; i++) {
        params[compiledPattern.paramNames[i]] = decodeURIComponent(match[i + 1]);
    }

    return { match: true, params };
}

/**
 * Router class for managing client-side navigation
 *
 * @typedef {Object} RouteConfig
 * @property {string} component - Component tag name to render
 * @property {() => Promise<any>} [load] - Optional lazy load function (dynamic import)
 * @property {string} [require] - Optional capability requirement for access control
 * @property {Object} [meta] - Optional metadata for the route
 * @property {Object<string, RouteConfig>} [routes] - Optional nested routes
 *
 * @example
 * const router = new Router({
 *   '/': {
 *     component: 'home-page',
 *     load: () => import('./home.js')
 *   },
 *   '/admin/': {
 *     component: 'admin-page',
 *     require: 'admin',
 *     load: () => import('./admin.js')
 *   }
 * });
 *
 * router.setOutlet(document.querySelector('router-outlet'));
 */
export class Router {
    /**
     * Create a new router instance
     * @param {Object<string, RouteConfig>} routes - Route configuration map
     * @param {Object} [options={}] - Router options (reserved for future use)
     */
    constructor(routes, options = {}) {
        this.routes = {};
        this.beforeHooks = [];
        this.afterHooks = [];
        this.outletElement = null;
        this.loadedComponents = new Set(); // Track loaded components

        // Detect routing mode: HTML5 (with base tag) or hash
        this.useHTML5 = this._detectRoutingMode();
        this.base = this._getBase();

        // Flatten nested routes
        this._flattenRoutes(routes);

        // Create reactive current route store
        this.currentRoute = createStore({
            path: '/',
            query: {},
            params: {},
            component: null,
            meta: {}
        });

        // Track listeners for cleanup
        this._listeners = [];

        // Setup listeners based on routing mode
        if (this.useHTML5) {
            // HTML5 routing: listen to popstate
            const popstateHandler = () => this.handleRoute();
            window.addEventListener('popstate', popstateHandler);
            this._listeners.push({ event: 'popstate', handler: popstateHandler });

            // Also handle hash URLs and redirect to clean URLs
            const hashchangeHandler = () => {
                if (window.location.hash) {
                    const path = window.location.hash.slice(1);
                    this.replace(path);
                }
            };
            window.addEventListener('hashchange', hashchangeHandler);
            this._listeners.push({ event: 'hashchange', handler: hashchangeHandler });
        } else {
            // Hash routing: listen to hashchange
            const hashchangeHandler = () => this.handleRoute();
            window.addEventListener('hashchange', hashchangeHandler);
            this._listeners.push({ event: 'hashchange', handler: hashchangeHandler });
        }

        // Handle initial route
        this.handleRoute();
    }

    /**
     * Clean up router resources
     * Call this when destroying the router instance
     * @returns {void}
     */
    destroy() {
        // Remove all event listeners
        this._listeners.forEach(({ event, handler }) => {
            window.removeEventListener(event, handler);
        });
        this._listeners = [];

        // Clear hooks
        this.beforeHooks = [];
        this.afterHooks = [];
    }

    /**
     * Detect if we should use HTML5 routing (base tag present)
     * @private
     * @returns {boolean}
     */
    _detectRoutingMode() {
        const baseTag = document.querySelector('base[href]');
        return !!baseTag;
    }

    /**
     * Get base URL for routing
     * @private
     * @returns {string}
     */
    _getBase() {
        if (this.useHTML5) {
            const baseTag = document.querySelector('base[href]');
            if (baseTag) {
                let base = baseTag.getAttribute('href');
                // Remove trailing slash, but preserve empty string for root base
                if (base === '/') {
                    return '';
                }
                if (base.endsWith('/')) {
                    base = base.slice(0, -1);
                }
                return base;
            }
            // Fallback to empty base if no base tag in HTML5 mode
            return '';
        }
        // Hash routing uses # as base
        return window.location.origin + window.location.pathname + '#';
    }

    /**
     * Flatten nested routes into flat map and compile patterns
     * @private
     * @param {Object<string, RouteConfig>} routes - Routes to flatten
     * @param {string} [prefix=''] - Path prefix for nested routes
     * @returns {void}
     */
    _flattenRoutes(routes, prefix = '') {
        for (const [path, config] of Object.entries(routes)) {
            const fullPath = prefix + (path === '/' ? '' : path);

            // Compile route pattern (handles :param syntax)
            const compiled = compileRoutePattern(fullPath || '/');

            if (config.routes) {
                // Nested routes
                this._flattenRoutes(config.routes, fullPath);

                // Also register the parent route if it has a component
                if (config.component) {
                    this.routes[fullPath] = { ...config, _compiled: compiled };
                }
            } else {
                // Leaf route
                this.routes[fullPath] = { ...config, _compiled: compiled };
            }
        }

        // Ensure root route exists
        if (!this.routes['']) {
            this.routes[''] = this.routes['/'] || { component: null, _compiled: compileRoutePattern('/') };
        }
    }

    /**
     * Navigate to a path (adds history entry)
     * @param {string} path - Path to navigate to (e.g., '/about', '/users/123')
     * @param {Object<string, string>} [query={}] - Optional query parameters
     * @returns {void}
     *
     * @example
     * router.navigate('/about');
     * router.navigate('/search', { q: 'test', page: '2' });
     */
    navigate(path, query = {}) {
        const queryString = stringifyQuery(query);
        const fullPath = queryString ? `${path}?${queryString}` : path;

        if (this.useHTML5) {
            // HTML5 routing: use pushState
            const url = this.base + fullPath;
            window.history.pushState({ path: fullPath }, '', url);
            this.handleRoute();
        } else {
            // Hash routing: use hash
            window.location.hash = fullPath;
        }
    }

    /**
     * Replace current route without adding history entry
     * @param {string} path - Path to navigate to
     * @param {Object<string, string>} [query={}] - Optional query parameters
     * @returns {void}
     *
     * @example
     * router.replace('/login'); // Replaces current entry
     */
    replace(path, query = {}) {
        const queryString = stringifyQuery(query);
        const fullPath = queryString ? `${path}?${queryString}` : path;

        if (this.useHTML5) {
            // HTML5 routing: use replaceState
            const url = this.base + fullPath;
            window.history.replaceState({ path: fullPath }, '', url);
            this.handleRoute();
        } else {
            // Hash routing: use hash
            window.location.replace(`#${fullPath}`);
        }
    }

    /**
     * Go back in browser history
     * @returns {void}
     */
    back() {
        window.history.back();
    }

    /**
     * Go forward in browser history
     * @returns {void}
     */
    forward() {
        window.history.forward();
    }

    /**
     * Register a before-navigation hook (runs before route changes)
     * @param {(context: {path: string, query: Object, route: RouteConfig}) => boolean|void|Promise<boolean|void>} fn - Hook function (return false to cancel navigation)
     * @returns {void}
     *
     * @example
     * router.beforeEach(({ path, route }) => {
     *   if (route.require && !hasPermission(route.require)) {
     *     router.navigate('/unauthorized');
     *     return false; // Cancel navigation
     *   }
     * });
     */
    beforeEach(fn) {
        this.beforeHooks.push(fn);
    }

    /**
     * Register an after-navigation hook (runs after route changes)
     * @param {(context: {path: string, query: Object, route: RouteConfig}) => void|Promise<void>} fn - Hook function
     * @returns {void}
     *
     * @example
     * router.afterEach(({ path }) => {
     *   console.log('Navigated to:', path);
     *   trackPageView(path);
     * });
     */
    afterEach(fn) {
        this.afterHooks.push(fn);
    }

    /**
     * Find a route matching the given path
     * @private
     * @param {string} path - URL path to match
     * @returns {{route: RouteConfig|null, params: Object<string, string>}} Matched route and extracted params
     */
    _findRoute(path) {
        // Normalize path - ensure it starts with /
        if (!path) path = '/';
        if (!path.startsWith('/')) path = '/' + path;

        // First, try exact match (most common case, fastest)
        let route = this.routes[path];
        if (route) {
            return { route, params: {} };
        }

        // Try without trailing slash
        if (path.endsWith('/') && path.length > 1) {
            route = this.routes[path.slice(0, -1)];
            if (route) {
                return { route, params: {} };
            }
        }

        // Try with trailing slash
        if (!path.endsWith('/')) {
            route = this.routes[path + '/'];
            if (route) {
                return { route, params: {} };
            }
        }

        // No exact match - try pattern matching for routes with :params
        for (const [pattern, routeConfig] of Object.entries(this.routes)) {
            if (!routeConfig._compiled) continue;

            const result = matchRoute(path, routeConfig._compiled);
            if (result.match) {
                return { route: routeConfig, params: result.params };
            }
        }

        // Fallback to 404 or root
        return {
            route: this.routes['/404'] || this.routes[''] || { component: null },
            params: {}
        };
    }

    /**
     * Handle route change
     * @private
     * @returns {Promise<void>}
     */
    async handleRoute() {
        let path, queryString;

        if (this.useHTML5) {
            // HTML5 routing: parse from pathname
            const fullPath = window.location.pathname;
            // Remove base from path
            let relativePath = fullPath;
            if (this.base && this.base.length > 0 && fullPath.startsWith(this.base)) {
                relativePath = fullPath.slice(this.base.length);
            }
            if (!relativePath.startsWith('/')) {
                relativePath = '/' + relativePath;
            }

            // Get query from search
            queryString = window.location.search.slice(1);
            [path] = relativePath.split('?');
        } else {
            // Hash routing: parse from hash
            const hash = window.location.hash.slice(1) || '';
            [path, queryString] = hash.split('?');
        }

        // Ensure path starts with /
        if (!path) path = '/';
        if (!path.startsWith('/')) path = '/' + path;

        const query = parseQuery(queryString);

        // Find matching route with params
        const { route, params } = this._findRoute(path);

        // Run before hooks
        for (const hook of this.beforeHooks) {
            const result = await hook({ path, query, params, route });
            if (result === false) {
                // Navigation cancelled
                return;
            }
        }

        // Lazy load component if needed
        if (route.load && route.component && !this.loadedComponents.has(route.component)) {
            try {
                await route.load();
                this.loadedComponents.add(route.component);
            } catch (error) {
                console.error(`Failed to load component for route ${path}:`, error);
                // Fallback to 404 on load error
                const fallback = this.routes['/404'] || { component: 'page-not-found' };
                this.currentRoute.set({
                    path,
                    query,
                    params: {},
                    component: fallback.component,
                    meta: fallback.meta || {}
                });
                this._renderOutlet();
                return;
            }
        }

        // Update current route
        this.currentRoute.set({
            path,
            query,
            params,
            component: route.component,
            meta: route.meta || {}
        });

        // Render component (handles same-component prop updates)
        this._renderOutlet();

        // Run after hooks
        for (const hook of this.afterHooks) {
            await hook({ path, query, params, route });
        }

        // Clean up template cache on navigation to prevent unbounded growth
        pruneTemplateCache();
    }

    /**
     * Set the outlet element where routed components will be rendered
     * @param {HTMLElement} element - Router outlet element (typically <router-outlet>)
     * @returns {void}
     *
     * @example
     * router.setOutlet(document.querySelector('router-outlet'));
     */
    setOutlet(element) {
        // Clean up previous subscription if it exists
        if (this._outletUnsubscribe) {
            this._outletUnsubscribe();
        }

        this.outletElement = element;

        // Subscribe to route changes and re-render
        this._outletUnsubscribe = this.currentRoute.subscribe(() => {
            this._renderOutlet();
        });
    }

    /**
     * Render the current component in the outlet
     * Handles same-component navigation by updating props instead of recreating
     * @private
     * @returns {void}
     */
    _renderOutlet() {
        if (!this.outletElement) {
            return;
        }

        const { component, params, query } = this.currentRoute.state;

        if (!component) {
            // Fallback if no component is found (should not happen with proper 404 route)
            // SECURITY: Use createElement instead of innerHTML to prevent potential injection
            this.outletElement.textContent = ''; // Clear safely
            const notFoundElement = document.createElement('page-not-found');
            this.outletElement.appendChild(notFoundElement);
            this._currentComponent = null;
            this._currentElement = null;
            return;
        }

        // SECURITY: Validate component name before createElement
        if (!isValidCustomElementName(component)) {
            console.error(`[Router] Invalid component name: "${component}". Component names must be lowercase, contain a hyphen, and start with a letter.`);
            this.outletElement.textContent = ''; // Clear safely
            const errorElement = document.createElement('page-not-found');
            this.outletElement.appendChild(errorElement);
            this._currentComponent = null;
            this._currentElement = null;
            return;
        }

        // Check if we can reuse the existing component (same tag name)
        const existingElement = this.outletElement.firstElementChild;
        if (existingElement && existingElement.tagName.toLowerCase() === component) {
            // Same component - update props only if changed (shallow compare)
            // This prevents unnecessary propsChanged calls
            if (!shallowEqual(existingElement.params, params)) {
                existingElement.params = params;
            }
            if (!shallowEqual(existingElement.query, query)) {
                existingElement.query = query;
            }
            this._currentElement = existingElement;
        } else {
            // Different component - create new element
            const element = document.createElement(component);

            // Set params and query as properties (not attributes)
            // This allows passing objects directly to the component
            element.params = params;
            element.query = query;

            // Replace outlet content
            this.outletElement.innerHTML = '';
            this.outletElement.appendChild(element);

            this._currentComponent = component;
            this._currentElement = element;
        }
    }

    /**
     * Generate URL for a route (respects routing mode)
     * @param {string} path - Route path
     * @param {Object<string, string>} [query={}] - Optional query parameters
     * @returns {string} Complete URL (hash or HTML5 based on mode)
     *
     * @example
     * router.url('/about'); // Returns '#/about' or '/app/about' depending on mode
     * router.url('/search', { q: 'test' }); // '/search?q=test'
     */
    url(path, query = {}) {
        const queryString = stringifyQuery(query);
        const fullPath = queryString ? `${path}?${queryString}` : path;

        if (this.useHTML5) {
            return this.base + fullPath;
        } else {
            return `#${fullPath}`;
        }
    }
}

function init() {
    defineComponent('router-link', {
        props: {
            to: '/'
        },

        methods: {
            handleClick(e) {
                // Intercept clicks for HTML5 routing
                if (_router && _router.useHTML5) {
                    e.preventDefault();
                    _router.navigate(this.props.to);
                }
            }
        },

        template() {
            const href = _router ? _router.url(this.props.to) : `#${this.props.to}`;

            return html`
                <a href="${href}" on-click="handleClick">${this.props.children}</a>
            `;
        }
    });


    if (customElements.get('router-outlet')) {
        return;
    }

    class RouterOutlet extends HTMLElement {
        connectedCallback() {
            // Router will find this and use it
        }
    }

    customElements.define('router-outlet', RouterOutlet);
}

init();

/**
 * Enable routing for a specific outlet element
 * @param {RouterOutlet} outlet router outlet element
 * @param {Object<string, RouteConfig>} routes object defining routes
 * @param {Object} options additional options (currently unused)
 * @returns {Router} The singleton router instance
 */
export function enableRouting(outlet, routes, options = {}) {
    if (!_router) {
        _router = new Router(routes, options);
    }
    _router.setOutlet(outlet);
    return _router;
}