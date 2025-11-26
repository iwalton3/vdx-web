/**
 * Router System
 * Hash-based routing with nested routes and query parameters
 */

import { createStore } from './store.js';
import { pruneTemplateCache } from './template-compiler.js';

/**
 * Parse query string into object
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
 */
function stringifyQuery(params) {
    const pairs = [];

    for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined) {
            pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
    }

    return pairs.join('&');
}

/**
 * Router class for managing navigation
 */
export class Router {
    constructor(routes, options = {}) {
        this.routes = {};
        this.beforeHooks = [];
        this.afterHooks = [];
        this.outletElement = null;

        // Detect routing mode: HTML5 (with base tag) or hash
        this.useHTML5 = this._detectRoutingMode();
        this.base = this._getBase();

        console.log(`[Router] Mode: ${this.useHTML5 ? 'HTML5' : 'Hash'}, Base: ${this.base}`);

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
     */
    _detectRoutingMode() {
        const baseTag = document.querySelector('base[href]');
        return !!baseTag;
    }

    /**
     * Get base URL for routing
     */
    _getBase() {
        if (this.useHTML5) {
            const baseTag = document.querySelector('base[href]');
            if (baseTag) {
                let base = baseTag.getAttribute('href');
                // Remove trailing slash
                if (base.endsWith('/')) {
                    base = base.slice(0, -1);
                }
                return base;
            }
        }
        // Hash routing uses # as base
        return window.location.origin + window.location.pathname + '#';
    }

    /**
     * Flatten nested routes into flat map
     */
    _flattenRoutes(routes, prefix = '') {
        for (const [path, config] of Object.entries(routes)) {
            const fullPath = prefix + (path === '/' ? '' : path);

            if (config.routes) {
                // Nested routes
                this._flattenRoutes(config.routes, fullPath);

                // Also register the parent route if it has a component
                if (config.component) {
                    this.routes[fullPath] = config;
                }
            } else {
                // Leaf route
                this.routes[fullPath] = config;
            }
        }

        // Ensure root route exists
        if (!this.routes['']) {
            this.routes[''] = this.routes['/'] || { component: null };
        }
    }

    /**
     * Navigate to a path
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
     * Replace current route (no history entry)
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
     * Go back in history
     */
    back() {
        window.history.back();
    }

    /**
     * Go forward in history
     */
    forward() {
        window.history.forward();
    }

    /**
     * Register a before-navigation hook
     */
    beforeEach(fn) {
        this.beforeHooks.push(fn);
    }

    /**
     * Register an after-navigation hook
     */
    afterEach(fn) {
        this.afterHooks.push(fn);
    }

    /**
     * Handle route change
     */
    async handleRoute() {
        let path, queryString;

        if (this.useHTML5) {
            // HTML5 routing: parse from pathname
            const fullPath = window.location.pathname;
            // Remove base from path
            let relativePath = fullPath;
            if (this.base && fullPath.startsWith(this.base)) {
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

        const query = parseQuery(queryString);

        // Find matching route
        let route = this.routes[path];

        // If no exact match, try without trailing slash
        if (!route && path.endsWith('/')) {
            route = this.routes[path.slice(0, -1)];
        }

        // If still no match, try with trailing slash
        if (!route && !path.endsWith('/')) {
            route = this.routes[path + '/'];
        }

        // Fallback to 404 or root
        if (!route) {
            route = this.routes['/404'] || this.routes[''] || { component: null };
        }

        // Run before hooks
        for (const hook of this.beforeHooks) {
            const result = await hook({ path, query, route });
            if (result === false) {
                // Navigation cancelled
                return;
            }
        }

        // Update current route
        this.currentRoute.set({
            path,
            query,
            params: {},
            component: route.component,
            meta: route.meta || {}
        });

        // Render component
        this._renderOutlet();

        // Run after hooks
        for (const hook of this.afterHooks) {
            await hook({ path, query, route });
        }

        // Clean up template cache on navigation to prevent unbounded growth
        pruneTemplateCache();
    }

    /**
     * Set the outlet element where components will be rendered
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
     */
    _renderOutlet() {
        if (!this.outletElement) {
            return;
        }

        const component = this.currentRoute.state.component;

        if (component) {
            this.outletElement.innerHTML = `<${component}></${component}>`;
        } else {
            // Fallback if no component is found (should not happen with proper 404 route)
            this.outletElement.innerHTML = '<page-not-found></page-not-found>';
        }
    }

    /**
     * Generate URL for a route
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

/**
 * Create a router outlet custom element
 */
export function defineRouterOutlet() {
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

/**
 * Create a router link component
 */
export function defineRouterLink(router) {
    if (customElements.get('router-link')) {
        return;
    }

    class RouterLink extends HTMLElement {
        connectedCallback() {
            // Store original content before Preact clears it
            if (!this._originalContent) {
                this._originalContent = this.innerHTML;
                this._to = this.getAttribute('to') || '/';
                this._attrs = Array.from(this.attributes)
                    .filter(attr => {
                        if (attr.name === 'to') return false;
                        if (attr.name.startsWith('on')) return false;
                        return true;
                    })
                    .map(attr => {
                        const escapedValue = attr.value
                            .replace(/&/g, '&amp;')
                            .replace(/"/g, '&quot;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;');
                        return `${attr.name}="${escapedValue}"`;
                    })
                    .join(' ');
            }

            const to = this._to;
            const content = this._originalContent;
            const attrs = this._attrs;

            // Generate URL based on router mode
            const href = router ? router.url(to) : `#${to}`;

            this.innerHTML = `<a href="${href}" ${attrs}>${content}</a>`;

            // Intercept clicks for HTML5 routing
            if (router && router.useHTML5) {
                const link = this.querySelector('a');
                if (link) {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        router.navigate(to);
                    });
                }
            }
        }
    }

    customElements.define('router-link', RouterLink);
}
