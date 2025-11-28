

import { createStore, pruneTemplateCache } from './framework.js';

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

function stringifyQuery(params) {
    const pairs = [];

    for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined) {
            pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
    }

    return pairs.join('&');
}

export class Router {
    
    constructor(routes, options = {}) {
        this.routes = {};
        this.beforeHooks = [];
        this.afterHooks = [];
        this.outletElement = null;
        this.loadedComponents = new Set(); 

        
        this.useHTML5 = this._detectRoutingMode();
        this.base = this._getBase();

        
        this._flattenRoutes(routes);

        
        this.currentRoute = createStore({
            path: '/',
            query: {},
            params: {},
            component: null,
            meta: {}
        });

        
        this._listeners = [];

        
        if (this.useHTML5) {
            
            const popstateHandler = () => this.handleRoute();
            window.addEventListener('popstate', popstateHandler);
            this._listeners.push({ event: 'popstate', handler: popstateHandler });

            
            const hashchangeHandler = () => {
                if (window.location.hash) {
                    const path = window.location.hash.slice(1);
                    this.replace(path);
                }
            };
            window.addEventListener('hashchange', hashchangeHandler);
            this._listeners.push({ event: 'hashchange', handler: hashchangeHandler });
        } else {
            
            const hashchangeHandler = () => this.handleRoute();
            window.addEventListener('hashchange', hashchangeHandler);
            this._listeners.push({ event: 'hashchange', handler: hashchangeHandler });
        }

        
        this.handleRoute();
    }

    
    destroy() {
        
        this._listeners.forEach(({ event, handler }) => {
            window.removeEventListener(event, handler);
        });
        this._listeners = [];

        
        this.beforeHooks = [];
        this.afterHooks = [];
    }

    
    _detectRoutingMode() {
        const baseTag = document.querySelector('base[href]');
        return !!baseTag;
    }

    
    _getBase() {
        if (this.useHTML5) {
            const baseTag = document.querySelector('base[href]');
            if (baseTag) {
                let base = baseTag.getAttribute('href');
                
                if (base === '/') {
                    return '';
                }
                if (base.endsWith('/')) {
                    base = base.slice(0, -1);
                }
                return base;
            }
            
            return '';
        }
        
        return window.location.origin + window.location.pathname + '#';
    }

    
    _flattenRoutes(routes, prefix = '') {
        for (const [path, config] of Object.entries(routes)) {
            const fullPath = prefix + (path === '/' ? '' : path);

            if (config.routes) {
                
                this._flattenRoutes(config.routes, fullPath);

                
                if (config.component) {
                    this.routes[fullPath] = config;
                }
            } else {
                
                this.routes[fullPath] = config;
            }
        }

        
        if (!this.routes['']) {
            this.routes[''] = this.routes['/'] || { component: null };
        }
    }

    
    navigate(path, query = {}) {
        const queryString = stringifyQuery(query);
        const fullPath = queryString ? `${path}?${queryString}` : path;

        if (this.useHTML5) {
            
            const url = this.base + fullPath;
            window.history.pushState({ path: fullPath }, '', url);
            this.handleRoute();
        } else {
            
            window.location.hash = fullPath;
        }
    }

    
    replace(path, query = {}) {
        const queryString = stringifyQuery(query);
        const fullPath = queryString ? `${path}?${queryString}` : path;

        if (this.useHTML5) {
            
            const url = this.base + fullPath;
            window.history.replaceState({ path: fullPath }, '', url);
            this.handleRoute();
        } else {
            
            window.location.replace(`#${fullPath}`);
        }
    }

    
    back() {
        window.history.back();
    }

    
    forward() {
        window.history.forward();
    }

    
    beforeEach(fn) {
        this.beforeHooks.push(fn);
    }

    
    afterEach(fn) {
        this.afterHooks.push(fn);
    }

    
    async handleRoute() {
        let path, queryString;

        if (this.useHTML5) {
            
            const fullPath = window.location.pathname;
            
            let relativePath = fullPath;
            if (this.base && this.base.length > 0 && fullPath.startsWith(this.base)) {
                relativePath = fullPath.slice(this.base.length);
            }
            if (!relativePath.startsWith('/')) {
                relativePath = '/' + relativePath;
            }

            
            queryString = window.location.search.slice(1);
            [path] = relativePath.split('?');
        } else {
            
            const hash = window.location.hash.slice(1) || '';
            [path, queryString] = hash.split('?');
        }

        const query = parseQuery(queryString);

        
        let route = this.routes[path];

        
        if (!route && path.endsWith('/')) {
            route = this.routes[path.slice(0, -1)];
        }

        
        if (!route && !path.endsWith('/')) {
            route = this.routes[path + '/'];
        }

        
        if (!route) {
            route = this.routes['/404'] || this.routes[''] || { component: null };
        }

        
        for (const hook of this.beforeHooks) {
            const result = await hook({ path, query, route });
            if (result === false) {
                
                return;
            }
        }

        
        if (route.load && route.component && !this.loadedComponents.has(route.component)) {
            try {
                await route.load();
                this.loadedComponents.add(route.component);
            } catch (error) {
                console.error(`Failed to load component for route ${path}:`, error);
                
                route = this.routes['/404'] || { component: 'page-not-found' };
            }
        }

        
        this.currentRoute.set({
            path,
            query,
            params: {},
            component: route.component,
            meta: route.meta || {}
        });

        
        this._renderOutlet();

        
        for (const hook of this.afterHooks) {
            await hook({ path, query, route });
        }

        
        pruneTemplateCache();
    }

    
    setOutlet(element) {
        
        if (this._outletUnsubscribe) {
            this._outletUnsubscribe();
        }

        this.outletElement = element;

        
        this._outletUnsubscribe = this.currentRoute.subscribe(() => {
            this._renderOutlet();
        });
    }

    
    _renderOutlet() {
        if (!this.outletElement) {
            return;
        }

        const component = this.currentRoute.state.component;

        if (component) {
            this.outletElement.innerHTML = `<${component}></${component}>`;
        } else {
            
            this.outletElement.innerHTML = '<page-not-found></page-not-found>';
        }
    }

    
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

export function defineRouterOutlet() {
    if (customElements.get('router-outlet')) {
        return;
    }

    class RouterOutlet extends HTMLElement {
        connectedCallback() {
            
        }
    }

    customElements.define('router-outlet', RouterOutlet);
}

export function defineRouterLink(router) {
    if (customElements.get('router-link')) {
        return;
    }

    class RouterLink extends HTMLElement {
        connectedCallback() {
            
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
