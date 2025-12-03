/**
 * Main Application Entry Point
 * Demonstrates typed routing setup with VDX
 */
import { enableRouting } from './lib/router.js';
import type { RouteDefinitions } from './lib/router.js';

// Import pages (they self-register as custom elements)
import './pages/home.js';
import './pages/tasks.js';
import './pages/task-detail.js';

// =============================================================================
// Route Configuration
// =============================================================================

const routes: RouteDefinitions = {
    '/': {
        component: 'demo-home',
        meta: { title: 'Home' }
    },
    '/tasks/': {
        component: 'demo-tasks',
        meta: { title: 'Tasks' }
    },
    '/tasks/:id/': {
        component: 'demo-task-detail',
        meta: { title: 'Task Detail' }
    }
};

// =============================================================================
// Initialize Router
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    const outlet = document.querySelector('router-outlet');

    if (!outlet) {
        console.error('Router outlet not found!');
        return;
    }

    const router = enableRouting(outlet as HTMLElement, routes);

    // Update page title on navigation
    router.afterEach(({ meta }) => {
        const title = (meta as { title?: string } | undefined)?.title || 'Task Manager';
        document.title = `${title} - VDX TypeScript Demo`;
    });

    console.log('VDX TypeScript Demo initialized');
});
