/**
 * Main Application Entry Point
 */

import { Router, defineRouterOutlet, defineRouterLink } from './core/router.js';
import login from './auth/auth.js';

// Import core components
import './core/app-header.js';

// Import pages
import './home.js';
import './page-not-found.js';
import './apps/pwgen/spwg.js';
import './apps/pwgen/apwg.js';
import './apps/pwgen/v1.js';

// Import applications
import './hremote-app/remote-button.js';
import './hremote-app/remote.js';

// Import auth system
import './auth/login.js';
import './auth/login-component.js';
import './auth/user-manager.js';
import './auth/user-tools.js';
import './auth/logoff-all.js';
import './auth/auth-error.js';

// Import components
import './components/icon.js';
import './components/select-box.js';
import './components/lazy-select-box.js';
import './components/tiles.js';
import './components/notification-list.js';

// Define router outlet
defineRouterOutlet();

// Setup router
const router = new Router({
    '/': {
        component: 'home-page'
    },
    '/pwgen/': {
        component: 'spwg-page'
    },
    '/pwgen/apwg/': {
        component: 'apwg-page'
    },
    '/pwgen/v1/': {
        component: 'v1-page'
    },
    '/auth/': {
        component: 'auth-login'
    },
    '/auth/login/': {
        component: 'auth-login'
    },
    '/auth/logoff-all/': {
        component: 'auth-logoff-all'
    },
    '/auth/error/': {
        component: 'auth-error'
    },
    '/auth/admin/': {
        component: 'user-manager',
        require: 'accountmanager'
    },
    '/hremote/': {
        component: 'remote-control',
        require: 'root'
    },
    '/404': {
        component: 'page-not-found'
    }
});

// Add capability checking hook
router.beforeEach(async ({ path, query, route }) => {
    // Check if route requires a capability
    if (route.require) {
        const requiredCapability = route.require;

        // Check if user has the required capability
        if (!login.state.has(requiredCapability)) {
            console.warn(`Route ${path} requires capability "${requiredCapability}" which user does not have`);

            // Redirect to auth error page
            router.replace('/auth/error/', {
                message: `You do not have permission to access this page. Required capability: ${requiredCapability}`
            });

            return false; // Cancel navigation
        }
    }

    return true; // Allow navigation
});

// Set the outlet element
const outlet = document.querySelector('router-outlet');
router.setOutlet(outlet);

// Define router link component
defineRouterLink(router);

// For debugging
window.router = router;
