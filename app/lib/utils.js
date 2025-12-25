/**
 * Utility Functions
 *
 * Common helpers for:
 * - Async operations (sleep, debounce, throttle)
 * - Memoization for expensive computations
 * - Notifications and toast messages
 * - Form helpers
 * - Event bus for cross-component communication
 * - localStorage persistence
 * - Dark theme management
 */

import { createStore } from './framework.js';

/**
 * Memoize a function based on its arguments.
 *
 * Caches the result until arguments change. Useful for expensive operations
 * like sorting, filtering large arrays, or complex calculations.
 *
 * @param {Function} fn - Function to memoize that takes arguments
 * @returns {Function} Memoized function that caches results based on arguments
 *
 * @example
 * data() {
 *   return {
 *     items: [...],
 *     sortedItems: memoize((items) => [...items].sort((a, b) => a.name.localeCompare(b.name)))
 *   };
 * }
 *
 * template() {
 *   // Only recomputes when items array reference changes
 *   const sorted = this.state.sortedItems(this.state.items);
 *   return html`...`;
 * }
 */
export function memoize(fn) {
    let cache = null;
    let deps = [];
    let hasCache = false;

    return function(...currentDeps) {
        // Check if dependencies changed
        if (hasCache && depsEqual(deps, currentDeps)) {
            return cache;
        }

        // Recompute
        deps = currentDeps;
        cache = fn.apply(this, currentDeps);
        hasCache = true;
        return cache;
    };
}

/**
 * Deep equality check for dependencies
 * @private
 * @param {any[]} a - First dependency array
 * @param {any[]} b - Second dependency array
 * @returns {boolean} True if dependencies are equal
 */
function depsEqual(a, b) {
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
        if (!shallowEqual(a[i], b[i])) return false;
    }

    return true;
}

/**
 * Shallow equality check
 * @private
 * @param {any} a - First value
 * @param {any} b - Second value
 * @returns {boolean} True if values are shallowly equal
 */
function shallowEqual(a, b) {
    // Same reference
    if (a === b) return true;

    // Null/undefined
    if (a == null || b == null) return false;

    // Primitives
    if (typeof a !== 'object' || typeof b !== 'object') return false;

    // Arrays
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    // Objects
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if (a[key] !== b[key]) return false;
    }

    return true;
}

/**
 * Sleep/delay utility for async operations
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>} Promise that resolves after specified time
 *
 * @example
 * async function demo() {
 *   console.log('Start');
 *   await sleep(1000);
 *   console.log('1 second later');
 * }
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function - delays execution until after delay has elapsed since last call
 * @param {Function} fn - Function to debounce
 * @param {number} [delay=300] - Delay in milliseconds
 * @returns {Function} Debounced function
 *
 * @example
 * const handleSearch = debounce((query) => {
 *   searchAPI(query);
 * }, 500);
 *
 * // Only calls searchAPI once, 500ms after user stops typing
 * input.addEventListener('input', e => handleSearch(e.target.value));
 */
export function debounce(fn, delay = 300) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Throttle function - ensures function is called at most once per limit period
 * @param {Function} fn - Function to throttle
 * @param {number} [limit=300] - Minimum time between calls in milliseconds
 * @returns {Function} Throttled function
 *
 * @example
 * const handleScroll = throttle(() => {
 *   updateScrollPosition();
 * }, 100);
 *
 * // Only calls updateScrollPosition once every 100ms, even if scrolling faster
 * window.addEventListener('scroll', handleScroll);
 */
export function throttle(fn, limit = 300) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * RAF Throttle - throttles function using requestAnimationFrame
 * @param {Function} fn - Function to throttle
 * @returns {Function} Throttled function that runs at most once per animation frame (~16ms at 60fps)
 *
 * @example
 * const handleScroll = rafThrottle(() => {
 *   updateVisibleItems();
 * });
 *
 * // Only calls updateVisibleItems once per frame, ideal for scroll handlers
 * window.addEventListener('scroll', handleScroll);
 */
export function rafThrottle(fn) {
    let rafPending = false;
    return function(...args) {
        if (!rafPending) {
            rafPending = true;
            requestAnimationFrame(() => {
                fn.apply(this, args);
                rafPending = false;
            });
        }
    };
}

/**
 * Notification system
 */
let notificationId = 0;

/**
 * Reactive store containing current notifications
 * @type {{list: Array<{id: number, message: string, severity: string, timestamp: number}>}}
 *
 * @example
 * notifications.subscribe(({ list }) => {
 *   console.log('Current notifications:', list);
 * });
 */
export const notifications = createStore({
    list: []
});

/**
 * Show a toast notification
 * @param {string} message - Notification message
 * @param {('info'|'success'|'warning'|'error')} [severity='info'] - Notification severity/type
 * @param {number} [ttl=5] - Time to live in seconds (0 for persistent)
 * @returns {number} Notification ID (can be used with dismissNotification)
 *
 * @example
 * notify('Saved successfully!', 'success', 3);
 * notify('Error occurred', 'error', 5);
 *
 * const id = notify('Processing...', 'info', 0); // Persistent
 * // Later: dismissNotification(id);
 */
export function notify(message, severity = 'info', ttl = 5) {
    const id = notificationId++;

    // Add notification
    notifications.update(s => ({
        list: [...s.list, { id, message, severity, timestamp: Date.now() }]
    }));

    // Remove after TTL (ttl is in seconds, convert to milliseconds)
    if (ttl > 0) {
        setTimeout(() => {
            notifications.update(s => ({
                list: s.list.filter(n => n.id !== id)
            }));
        }, ttl * 1000);
    }

    return id;
}

/**
 * Dismiss a notification by ID
 * @param {number} id - Notification ID (returned from notify())
 * @returns {void}
 *
 * @example
 * const id = notify('Loading...', 'info', 0);
 * // Later:
 * dismissNotification(id);
 */
export function dismissNotification(id) {
    notifications.update(s => ({
        list: s.list.filter(n => n.id !== id)
    }));
}

/**
 * Extract form data as object
 * @param {HTMLFormElement} formElement - Form element
 * @returns {Object<string, string>} Form data as key-value pairs
 *
 * @example
 * const data = formData(formElement);
 * // { username: 'alice', email: 'alice@example.com' }
 */
export function formData(formElement) {
    return Object.fromEntries(new FormData(formElement));
}

/**
 * Serialize form data as URL-encoded string
 * @param {HTMLFormElement} formElement - Form element
 * @returns {string} URL-encoded form data
 *
 * @example
 * const encoded = serializeForm(formElement);
 * // "username=alice&email=alice%40example.com"
 */
export function serializeForm(formElement) {
    const data = formData(formElement);
    return new URLSearchParams(data).toString();
}

/**
 * Fetch JSON with better error handling
 * @param {string} url - URL to fetch
 * @param {RequestInit} [options={}] - Fetch options
 * @returns {Promise<any>} Parsed JSON response
 * @throws {Error} HTTP error with status code
 *
 * @example
 * try {
 *   const data = await fetchJSON('/api/users');
 *   console.log(data);
 * } catch (error) {
 *   console.error('Failed:', error.message); // "HTTP 404: Not Found"
 * }
 */
export async function fetchJSON(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

/**
 * Interval helper that cleans up automatically
 * @param {Function} fn - Function to run at interval
 * @param {number} delay - Delay in milliseconds
 * @returns {{id: number, clear: () => void}} Interval controller
 *
 * @example
 * const interval = createInterval(() => {
 *   fetchUpdates();
 * }, 60000); // Every minute
 *
 * // Later: cleanup
 * interval.clear();
 */
export function createInterval(fn, delay) {
    const id = setInterval(fn, delay);

    return {
        id,
        clear() {
            clearInterval(id);
        }
    };
}

/**
 * Event bus for cross-component communication
 * @class EventBus
 */
class EventBus {
    constructor() {
        this.events = {};
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler to remove
     * @returns {void}
     */
    off(event, callback) {
        if (!this.events[event]) return;

        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    /**
     * Emit an event to all subscribers
     * @param {string} event - Event name
     * @param {...any} args - Arguments to pass to handlers
     * @returns {void}
     */
    emit(event, ...args) {
        if (!this.events[event]) return;

        this.events[event].forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`Error in event handler for "${event}":`, error);
            }
        });
    }

    /**
     * Subscribe to an event for one emission only
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     * @returns {Function} Unsubscribe function
     */
    once(event, callback) {
        const onceWrapper = (...args) => {
            callback(...args);
            this.off(event, onceWrapper);
        };

        return this.on(event, onceWrapper);
    }
}

/**
 * Global event bus instance for cross-component communication
 * @type {EventBus}
 *
 * @example
 * // In one component
 * eventBus.on('user-updated', (user) => {
 *   console.log('User updated:', user);
 * });
 *
 * // In another component
 * eventBus.emit('user-updated', { name: 'Alice', id: 123 });
 */
export const eventBus = new EventBus();

/**
 * Check if value is empty (null, undefined, empty string/array/object)
 * @param {any} value - Value to check
 * @returns {boolean} True if value is empty
 *
 * @example
 * isEmpty(null); // true
 * isEmpty(''); // true
 * isEmpty([]); // true
 * isEmpty({}); // true
 * isEmpty('hello'); // false
 */
export function isEmpty(value) {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
}

/**
 * Clamp number between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 *
 * @example
 * clamp(150, 0, 100); // 100
 * clamp(-10, 0, 100); // 0
 * clamp(50, 0, 100); // 50
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Generate random ID
 * @param {string} [prefix='id'] - Prefix for the ID
 * @returns {string} Random ID string
 *
 * @example
 * randomId(); // 'id-x7k2m9p4q'
 * randomId('user'); // 'user-a3f8g1h5j'
 */
export function randomId(prefix = 'id') {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 * @param {Date|string|number} date - Date to format
 * @returns {string} Relative time string
 *
 * @example
 * relativeTime(new Date(Date.now() - 3600000)); // "1 hours ago"
 * relativeTime(new Date(Date.now() - 120000)); // "2 minutes ago"
 * relativeTime(new Date(Date.now() - 30000)); // "just now"
 */
export function relativeTime(date) {
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now - then) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

    return then.toLocaleDateString();
}

/**
 * localStorage prefix for this application
 * @private
 */
const LOCALSTORAGE_PREFIX = 'swapi';

/**
 * Create a store that persists to localStorage
 * @param {string} name - Storage key name (prefix will be added automatically)
 * @param {any} initial - Initial value if not found in localStorage
 * @returns {ReturnType<typeof createStore>} Store object that auto-syncs to localStorage
 *
 * @example
 * const prefs = localStore('user-prefs', { theme: 'light', lang: 'en' });
 *
 * // Automatically loads from localStorage on creation
 * console.log(prefs.state.theme);
 *
 * // Automatically saves to localStorage on change
 * prefs.state.theme = 'dark';
 */
export function localStore(name, initial) {
    const key = `${LOCALSTORAGE_PREFIX}_${name}`;

    // Try to load from localStorage
    try {
        const data = window.localStorage.getItem(key);
        if (data !== null) {
            initial = JSON.parse(data);
        }
    } catch (e) {
        console.error('Failed to load from localStorage:', e);
    }

    const store = createStore(initial);

    // Subscribe to save changes
    store.subscribe(value => {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
    });

    return store;
}

/**
 * Dark theme preference store
 * Note: Store must be an object, not a primitive, for reactivity to work
 * @private
 * @returns {ReturnType<typeof createStore>} Dark theme store
 */
function initDarkTheme() {
    const key = `${LOCALSTORAGE_PREFIX}_dark`;
    let initial = { enabled: false };

    try {
        const data = window.localStorage.getItem(key);
        if (data !== null) {
            const parsed = JSON.parse(data);
            // Handle old boolean format
            if (typeof parsed === 'boolean') {
                initial = { enabled: parsed };
            } else if (parsed && typeof parsed.enabled === 'boolean') {
                initial = parsed;
            }
        }
    } catch (e) {
        console.error('Failed to load dark theme from localStorage:', e);
    }

    const store = createStore(initial);

    // Subscribe to save changes
    store.subscribe(value => {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Failed to save dark theme to localStorage:', e);
        }
    });

    return store;
}

/**
 * Global dark theme store with localStorage persistence
 * @type {ReturnType<typeof createStore>}
 *
 * @example
 * // Toggle dark mode
 * darkTheme.update(s => ({ enabled: !s.enabled }));
 *
 * // Subscribe to changes
 * darkTheme.subscribe(state => {
 *   document.body.classList.toggle('dark', state.enabled);
 * });
 */
export const darkTheme = initDarkTheme();

/**
 * Range utility (like Python's range) - generates array of numbers
 * @param {number} a - Start (or stop if b is null)
 * @param {number} [b=null] - Stop (exclusive)
 * @param {number} [step=1] - Step size
 * @returns {number[]} Array of numbers
 *
 * @example
 * range(5); // [0, 1, 2, 3, 4]
 * range(2, 5); // [2, 3, 4]
 * range(0, 10, 2); // [0, 2, 4, 6, 8]
 */
export function range(a, b = null, step = 1) {
    let start = 0;
    let stop = a;

    if (b !== null) {
        start = a;
        stop = b;
    }

    const result = [];
    for (let i = start; i < stop; i += step) {
        result.push(i);
    }

    return result;
}

// =============================================================================
// Lazy Component Loading
// =============================================================================

/**
 * Cache for lazy-loaded modules to prevent duplicate imports
 * @type {Map<Function, Promise<any>>}
 */
const lazyCache = new Map();

/**
 * Create a lazy-loadable component reference.
 *
 * Returns a promise that resolves when the component module is loaded.
 * The promise is cached, so multiple uses don't trigger multiple imports.
 * Works seamlessly with awaitThen() for loading states.
 *
 * @param {() => Promise<any>} importFn - Dynamic import function, e.g., () => import('./my-component.js')
 * @returns {Promise<true>} Promise that resolves to true when component is ready
 *
 * @example
 * // Define lazy component at module level (cached)
 * const LazyChart = lazy(() => import('./chart-component.js'));
 *
 * // Use with awaitThen in template
 * template() {
 *     return html`
 *         ${awaitThen(LazyChart,
 *             () => html`<chart-component data="${this.state.data}"></chart-component>`,
 *             html`<cl-spinner></cl-spinner>`
 *         )}
 *     `;
 * }
 *
 * @example
 * // Conditional lazy loading
 * ${when(this.state.showAdvanced,
 *     () => awaitThen(
 *         lazy(() => import('./advanced-panel.js')),
 *         () => html`<advanced-panel></advanced-panel>`,
 *         html`<cl-spinner size="small"></cl-spinner>`
 *     )
 * )}
 */
export function lazy(importFn) {
    // Return cached promise if already loading/loaded
    if (lazyCache.has(importFn)) {
        return lazyCache.get(importFn);
    }

    // Create and cache the loading promise
    const loadPromise = importFn()
        .then(module => {
            // Module loaded successfully
            // The component should be auto-registered via its defineComponent call
            return true;
        })
        .catch(error => {
            // Remove from cache on error so retry is possible
            lazyCache.delete(importFn);
            throw error;
        });

    lazyCache.set(importFn, loadPromise);
    return loadPromise;
}

/**
 * Preload a lazy component without rendering it.
 * Useful for preloading components the user is likely to need.
 *
 * @param {() => Promise<any>} importFn - Dynamic import function
 * @returns {Promise<true>} Promise that resolves when loaded
 *
 * @example
 * // Preload on hover for instant display when clicked
 * <button
 *     on-mouseenter="${() => preloadLazy(() => import('./heavy-dialog.js'))}"
 *     on-click="${() => this.state.showDialog = true}">
 *     Open Dialog
 * </button>
 */
export function preloadLazy(importFn) {
    return lazy(importFn);
}

/**
 * Clear the lazy loading cache.
 * Rarely needed - mainly for testing or memory optimization.
 *
 * @returns {void}
 */
export function clearLazyCache() {
    lazyCache.clear();
}

/**
 * Default export for backward compatibility
 * @type {typeof notify}
 */
export default notify;
