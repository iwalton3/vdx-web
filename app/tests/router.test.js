/**
 * Tests for Router System
 */

import { describe, assert } from './test-runner.js';
import { Router } from '../lib/router.js';

describe('Router', function(it) {
    it('creates router with routes', () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/about/': { component: 'about-page' }
        });

        assert.ok(router, 'Should create router');
        assert.ok(router.routes, 'Should have routes');
    });

    it('flattens nested routes correctly', () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/test/': { component: 'test-page' }
        });

        assert.equal(router.routes['/test/'].component, 'test-page', 'Should flatten routes');
        assert.equal(router.routes[''].component, 'home-page', 'Should create empty root route');
    });

    it('generates correct URLs for hash mode', () => {
        const router = new Router({
            '/': { component: 'home-page' }
        });

        const url = router.url('/test/', { foo: 'bar' });
        assert.ok(url.includes('#/test/'), 'Should generate hash URL');
        assert.ok(url.includes('foo=bar'), 'Should include query parameters');
    });

    it('stores routes in flat structure', () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/about/': { component: 'about-page' },
            '/contact/': { component: 'contact-page' }
        });

        // Root route '/' gets stored as '' (empty string)
        assert.equal(router.routes[''].component, 'home-page', 'Should store home route as empty string');
        assert.equal(router.routes['/about/'].component, 'about-page', 'Should store about route');
        assert.equal(router.routes['/contact/'].component, 'contact-page', 'Should store contact route');
    });

    it('handles nested route definitions', () => {
        const router = new Router({
            '/': { component: 'home-page' }
        });

        assert.ok(router.routes, 'Should have routes object');
        assert.ok(router.routes[''], 'Should create empty string route as alias for root');
    });

    it('supports navigation hooks', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/protected/': { component: 'protected-page', require: 'admin' }
        });

        let hookCalled = false;
        router.beforeEach(async (context) => {
            hookCalled = true;
        });

        // Navigate to a different route (not /) since router already navigated to / on creation
        router.navigate('/protected/');
        await new Promise(resolve => setTimeout(resolve, 50));

        assert.ok(hookCalled, 'Should call beforeEach hook on navigation');
    });

    it('can cancel navigation with hook', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/blocked/': { component: 'blocked-page' }
        });

        let hookCalled = false;
        let navigationCompleted = false;

        router.beforeEach(async (context) => {
            hookCalled = true;
            if (context.path === '/blocked/') {
                return false; // Block navigation
            }
        });

        router.afterEach(async () => {
            navigationCompleted = true;
        });

        router.navigate('/blocked/');
        await new Promise(resolve => setTimeout(resolve, 50));

        assert.ok(hookCalled, 'Should call hook for blocked route');
        assert.ok(!navigationCompleted, 'Should not complete navigation when blocked');
    });
});

describe('Router Query Parameters', function(it) {
    it('preserves query parameters on navigation', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/search/': { component: 'search-page' }
        });

        router.navigate('/search/', { q: 'test', page: '2' });

        // Wait for navigation to complete
        await new Promise(resolve => setTimeout(resolve, 50));

        const currentRoute = router.currentRoute.state;
        assert.equal(currentRoute.query.q, 'test', 'Should have query parameter q');
        assert.equal(currentRoute.query.page, '2', 'Should have query parameter page');
    });

    it('handles empty query parameters', async () => {
        const router = new Router({
            '/': { component: 'home-page' }
        });

        router.navigate('/');

        // Wait for navigation to complete
        await new Promise(resolve => setTimeout(resolve, 50));

        const currentRoute = router.currentRoute.state;
        assert.ok(typeof currentRoute.query === 'object', 'Should have empty query object');
    });
});

describe('Router URL Parameters', function(it) {
    it('matches single URL parameter', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/users/:id/': { component: 'user-profile' }
        });

        router.navigate('/users/123/');
        await new Promise(resolve => setTimeout(resolve, 50));

        const currentRoute = router.currentRoute.state;
        assert.equal(currentRoute.component, 'user-profile', 'Should match user-profile component');
        assert.equal(currentRoute.params.id, '123', 'Should extract id parameter');
    });

    it('matches multiple URL parameters', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/products/:category/:sku/': { component: 'product-detail' }
        });

        router.navigate('/products/electronics/ABC123/');
        await new Promise(resolve => setTimeout(resolve, 50));

        const currentRoute = router.currentRoute.state;
        assert.equal(currentRoute.component, 'product-detail', 'Should match product-detail component');
        assert.equal(currentRoute.params.category, 'electronics', 'Should extract category parameter');
        assert.equal(currentRoute.params.sku, 'ABC123', 'Should extract sku parameter');
    });

    it('decodes URL-encoded parameters', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/search/:term/': { component: 'search-page' }
        });

        router.navigate('/search/hello%20world/');
        await new Promise(resolve => setTimeout(resolve, 50));

        const currentRoute = router.currentRoute.state;
        assert.equal(currentRoute.params.term, 'hello world', 'Should decode URL-encoded parameter');
    });

    it('handles routes without parameters', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/about/': { component: 'about-page' },
            '/users/:id/': { component: 'user-profile' }
        });

        router.navigate('/about/');
        await new Promise(resolve => setTimeout(resolve, 50));

        const currentRoute = router.currentRoute.state;
        assert.equal(currentRoute.component, 'about-page', 'Should match static route');
        assert.deepEqual(currentRoute.params, {}, 'Should have empty params for static route');
    });

    it('prefers exact match over pattern match', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/users/new/': { component: 'user-new' },
            '/users/:id/': { component: 'user-profile' }
        });

        router.navigate('/users/new/');
        await new Promise(resolve => setTimeout(resolve, 50));

        const currentRoute = router.currentRoute.state;
        assert.equal(currentRoute.component, 'user-new', 'Should match exact route over pattern');
    });

    it('matches routes with or without trailing slash', async () => {
        const router = new Router({
            '/users/:id/': { component: 'user-profile' }
        });

        // Without trailing slash
        router.navigate('/users/456');
        await new Promise(resolve => setTimeout(resolve, 50));

        let currentRoute = router.currentRoute.state;
        assert.equal(currentRoute.params.id, '456', 'Should match without trailing slash');

        // With trailing slash
        router.navigate('/users/789/');
        await new Promise(resolve => setTimeout(resolve, 50));

        currentRoute = router.currentRoute.state;
        assert.equal(currentRoute.params.id, '789', 'Should match with trailing slash');
    });

    it('combines URL params with query params', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/users/:id/': { component: 'user-profile' }
        });

        router.navigate('/users/123/', { tab: 'settings', view: 'full' });
        await new Promise(resolve => setTimeout(resolve, 50));

        const currentRoute = router.currentRoute.state;
        assert.equal(currentRoute.params.id, '123', 'Should have URL param');
        assert.equal(currentRoute.query.tab, 'settings', 'Should have query param tab');
        assert.equal(currentRoute.query.view, 'full', 'Should have query param view');
    });

    it('passes params to beforeEach hooks', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/users/:id/': { component: 'user-profile' }
        });

        let capturedParams = null;
        router.beforeEach(({ params }) => {
            capturedParams = params;
        });

        router.navigate('/users/999/');
        await new Promise(resolve => setTimeout(resolve, 50));

        assert.ok(capturedParams, 'Hook should receive params');
        assert.equal(capturedParams.id, '999', 'Hook should have correct param value');
    });

    it('passes params to afterEach hooks', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/products/:cat/:id/': { component: 'product-page' }
        });

        let capturedParams = null;
        router.afterEach(({ params }) => {
            capturedParams = params;
        });

        router.navigate('/products/books/ISBN123/');
        await new Promise(resolve => setTimeout(resolve, 50));

        assert.ok(capturedParams, 'Hook should receive params');
        assert.equal(capturedParams.cat, 'books', 'Hook should have cat param');
        assert.equal(capturedParams.id, 'ISBN123', 'Hook should have id param');
    });
});

describe('Router Same-Component Navigation', function(it) {
    it('updates currentRoute when navigating to same component with different params', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/items/:id/': { component: 'item-detail' }
        });

        // First navigation
        router.navigate('/items/1/');
        await new Promise(resolve => setTimeout(resolve, 50));

        assert.equal(router.currentRoute.state.params.id, '1', 'Should have initial param');

        // Navigate to same component with different param
        router.navigate('/items/2/');
        await new Promise(resolve => setTimeout(resolve, 50));

        assert.equal(router.currentRoute.state.params.id, '2', 'Should update param');
        assert.equal(router.currentRoute.state.component, 'item-detail', 'Should keep same component');
    });

    it('updates currentRoute when navigating with different query', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/search/': { component: 'search-page' }
        });

        // First navigation
        router.navigate('/search/', { q: 'first' });
        await new Promise(resolve => setTimeout(resolve, 50));

        assert.equal(router.currentRoute.state.query.q, 'first', 'Should have initial query');

        // Navigate with different query
        router.navigate('/search/', { q: 'second', page: '2' });
        await new Promise(resolve => setTimeout(resolve, 50));

        assert.equal(router.currentRoute.state.query.q, 'second', 'Should update query q');
        assert.equal(router.currentRoute.state.query.page, '2', 'Should add query page');
    });

    it('tracks navigation history for params', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/users/:id/': { component: 'user-profile' }
        });

        const paramHistory = [];
        router.afterEach(({ params }) => {
            paramHistory.push({ ...params });
        });

        router.navigate('/users/1/');
        await new Promise(resolve => setTimeout(resolve, 50));
        router.navigate('/users/2/');
        await new Promise(resolve => setTimeout(resolve, 50));
        router.navigate('/users/3/');
        await new Promise(resolve => setTimeout(resolve, 50));

        assert.equal(paramHistory.length, 3, 'Should track all navigations');
        assert.equal(paramHistory[0].id, '1', 'First navigation');
        assert.equal(paramHistory[1].id, '2', 'Second navigation');
        assert.equal(paramHistory[2].id, '3', 'Third navigation');
    });
});

describe('Router Hash Mode Query Parsing', function(it) {
    it('parses query string from hash URL', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/search/': { component: 'search-page' }
        });

        // Simulate hash with query string
        window.location.hash = '#/search/?q=test&limit=10';
        await router.handleRoute();
        await new Promise(resolve => setTimeout(resolve, 50));

        const currentRoute = router.currentRoute.state;
        assert.equal(currentRoute.path, '/search/', 'Should extract path');
        assert.equal(currentRoute.query.q, 'test', 'Should parse q param');
        assert.equal(currentRoute.query.limit, '10', 'Should parse limit param');
    });

    it('handles hash URL without query string', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/about/': { component: 'about-page' }
        });

        window.location.hash = '#/about/';
        await router.handleRoute();
        await new Promise(resolve => setTimeout(resolve, 50));

        const currentRoute = router.currentRoute.state;
        assert.equal(currentRoute.path, '/about/', 'Should extract path');
        assert.deepEqual(currentRoute.query, {}, 'Should have empty query');
    });

    it('handles special characters in hash query string', async () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/search/': { component: 'search-page' }
        });

        window.location.hash = '#/search/?q=hello%20world&tag=c%2B%2B';
        await router.handleRoute();
        await new Promise(resolve => setTimeout(resolve, 50));

        const currentRoute = router.currentRoute.state;
        assert.equal(currentRoute.query.q, 'hello world', 'Should decode spaces');
        assert.equal(currentRoute.query.tag, 'c++', 'Should decode plus signs');
    });
});

describe('Router Pattern Compilation', function(it) {
    it('compiles routes with parameters on init', () => {
        const router = new Router({
            '/': { component: 'home-page' },
            '/users/:id/': { component: 'user-profile' },
            '/posts/:year/:month/:slug/': { component: 'post-page' }
        });

        // Check that routes have compiled patterns
        const userRoute = router.routes['/users/:id/'];
        assert.ok(userRoute._compiled, 'User route should have compiled pattern');
        assert.ok(userRoute._compiled.regex instanceof RegExp, 'Should have regex');
        assert.ok(Array.isArray(userRoute._compiled.paramNames), 'Should have paramNames array');
        assert.equal(userRoute._compiled.paramNames[0], 'id', 'Should extract param name');

        const postRoute = router.routes['/posts/:year/:month/:slug/'];
        assert.ok(postRoute._compiled, 'Post route should have compiled pattern');
        assert.equal(postRoute._compiled.paramNames.length, 3, 'Should have 3 params');
        assert.deepEqual(postRoute._compiled.paramNames, ['year', 'month', 'slug'], 'Should have correct param names');
    });

    it('handles routes with special regex characters', async () => {
        const router = new Router({
            '/api/v1.0/:endpoint/': { component: 'api-page' }
        });

        router.navigate('/api/v1.0/users/');
        await new Promise(resolve => setTimeout(resolve, 50));

        const currentRoute = router.currentRoute.state;
        assert.equal(currentRoute.params.endpoint, 'users', 'Should handle dots in route');
    });
});

describe('Router Component Name Security', function(it) {
    it('accepts valid custom element names', () => {
        // Valid names should be accepted - just test route configuration, not rendering
        const validNames = [
            'home-page',
            'user-profile',
            'my-app',
            'x-button',
            'a-b',
            'component-123',
            'my-long-component-name'
        ];

        for (const name of validNames) {
            const router = new Router({
                '/': { component: name }
            });
            assert.equal(router.routes[''].component, name, `Should accept "${name}"`);
            router.destroy();
        }
    });

    it('logs error for invalid component names during render', async () => {
        // Capture console.error before creating router
        const originalError = console.error;
        let errorLogged = false;
        let errorMessage = '';
        console.error = (...args) => {
            if (args[0] && args[0].includes && args[0].includes('Invalid component name')) {
                errorLogged = true;
                errorMessage = args[0];
            }
        };

        const router = new Router({
            '/': { component: 'home-page' },
            '/invalid/': { component: 'invalid' } // No hyphen
        });

        try {
            // Create a mock outlet
            const outlet = document.createElement('div');
            router.setOutlet(outlet);

            router.navigate('/invalid/');
            await new Promise(resolve => setTimeout(resolve, 100));

            assert.ok(errorLogged, 'Should log error for component without hyphen');
        } finally {
            console.error = originalError;
            router.destroy();
        }
    });

    it('rejects component names without hyphens', async () => {
        // Capture console.error before creating router
        const originalError = console.error;
        let errorLogged = false;
        console.error = (...args) => {
            if (args[0] && args[0].includes && args[0].includes('Invalid component name') && args[0].includes('nohyphen')) {
                errorLogged = true;
            }
        };

        const router = new Router({
            '/': { component: 'nohyphen' }
        });

        try {
            const outlet = document.createElement('div');
            router.setOutlet(outlet);

            await new Promise(resolve => setTimeout(resolve, 100));
            assert.ok(errorLogged, 'Should reject name without hyphen');
        } finally {
            console.error = originalError;
            router.destroy();
        }
    });

    it('rejects component names starting with uppercase', async () => {
        const originalError = console.error;
        let errorLogged = false;
        console.error = (...args) => {
            if (args[0] && args[0].includes && args[0].includes('Invalid component name') && args[0].includes('Invalid-Component')) {
                errorLogged = true;
            }
        };

        const router = new Router({
            '/': { component: 'Invalid-Component' }
        });

        try {
            const outlet = document.createElement('div');
            router.setOutlet(outlet);

            await new Promise(resolve => setTimeout(resolve, 100));
            assert.ok(errorLogged, 'Should reject name starting with uppercase');
        } finally {
            console.error = originalError;
            router.destroy();
        }
    });

    it('rejects component names with script injection attempts', async () => {
        const originalError = console.error;
        let errorLogged = false;
        console.error = (...args) => {
            if (args[0] && args[0].includes && args[0].includes('Invalid component name') && args[0].includes('script')) {
                errorLogged = true;
            }
        };

        const router = new Router({
            '/': { component: '<script>alert(1)</script>' }
        });

        try {
            const outlet = document.createElement('div');
            router.setOutlet(outlet);

            await new Promise(resolve => setTimeout(resolve, 100));
            assert.ok(errorLogged, 'Should reject script injection attempt');
        } finally {
            console.error = originalError;
            router.destroy();
        }
    });

    it('rejects reserved custom element names', async () => {
        // Test first reserved name only to avoid test interference
        const originalError = console.error;
        let errorLogged = false;
        console.error = (...args) => {
            if (args[0] && args[0].includes && args[0].includes('Invalid component name') && args[0].includes('annotation-xml')) {
                errorLogged = true;
            }
        };

        const router = new Router({
            '/': { component: 'annotation-xml' }
        });

        try {
            const outlet = document.createElement('div');
            router.setOutlet(outlet);

            await new Promise(resolve => setTimeout(resolve, 100));
            assert.ok(errorLogged, 'Should reject reserved name "annotation-xml"');
        } finally {
            console.error = originalError;
            router.destroy();
        }
    });
});
