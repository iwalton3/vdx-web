/**
 * Main Application Entry Point
 */

import { enableRouting } from '../../lib/router.js';
import login from './auth/auth.js';

// Import core components (needed immediately)
import './components/app-header.js';
import './components/notification-list.js';

// Note: All other components are lazy-loaded by the pages that use them

// Setup router with lazy loading
const outlet = document.querySelector('router-outlet');
const router = enableRouting(outlet, {
    '/': {
        component: 'home-page',
        load: () => import('./home.js')
    },
    '/pwgen/': {
        component: 'spwg-page',
        load: () => import('../pwgen/spwg.js')
    },
    '/pwgen/apwg/': {
        component: 'apwg-page',
        load: () => import('../pwgen/apwg.js')
    },
    '/pwgen/v1/': {
        component: 'v1-page',
        load: () => import('../pwgen/v1.js')
    },
    '/auth/': {
        component: 'auth-login',
        load: () => import('./auth/login.js')
    },
    '/auth/login/': {
        component: 'auth-login',
        load: () => import('./auth/login.js')
    },
    '/auth/logoff-all/': {
        component: 'auth-logoff-all',
        load: () => import('./auth/logoff-all.js')
    },
    '/auth/error/': {
        component: 'auth-error',
        load: () => import('./auth/auth-error.js')
    },
    '/auth/admin/': {
        component: 'user-manager',
        require: 'accountmanager',
        load: () => import('./auth/user-manager.js')  // Let component import its own deps
    },
    '/hremote/': {
        component: 'remote-control',
        require: 'root',
        load: () => import('./hremote-app/remote.js')  // Let component import its own deps
    },
    '/autopassword/': {
        component: 'autopassword-page',
        load: () => import('../autopassword/autopassword.js')
    },
    '/webgrep/': {
        component: 'webgrep-page',
        load: () => import('../webgrep/webgrep.js')
    },
    '/qnote/': {
        component: 'qnote-page',
        load: () => import('../qnote/qnote.js')
    },
    '/qnote/:name/': {
        component: 'qnote-page',
        load: () => import('../qnote/qnote.js')
    },
    '/fl/': {
        component: 'fastlink-page',
        load: () => import('../fl/fastlink.js')
    },
    '/404': {
        component: 'page-not-found',
        load: () => import('./page-not-found.js')
    }
}, {
    // Routes with `require` fail closed - the router denies them unless
    // this approves. (Replaces the old beforeEach capability hook.)
    checkCapability: (required) => login.state.has(required),

    onUnauthorized: ({ path, require }) => {
        console.warn(`Route ${path} requires capability "${require}" which user does not have`);
        router.replace('/auth/error/', {
            message: `You do not have permission to access this page. Required capability: ${require}`
        });
    }
});
