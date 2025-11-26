/**
 * Utility Functions
 * Common helpers for async operations, notifications, etc.
 */

import { createStore } from './store.js';

// memo is now in reactivity.js (old vdom.js version no longer used)

/**
 * Create a computed property with dependency-based caching
 *
 * Caches the result until dependencies change. Useful for expensive operations
 * like sorting, filtering large arrays, or complex calculations.
 *
 * @param {Function} fn - Computation function that takes dependencies as arguments
 * @returns {Function} Memoized function
 *
 * @example
 * data() {
 *   return {
 *     items: [...],
 *     sortedItems: computed((items) => [...items].sort((a, b) => a.name.localeCompare(b.name)))
 *   };
 * }
 *
 * template() {
 *   // Only recomputes when items array changes
 *   const sorted = this.state.sortedItems(this.state.items);
 *   return html`...`;
 * }
 */
export function computed(fn) {
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
 * Sleep/delay utility
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Lifecycle: onMounted hook
 * Runs after component is mounted (next tick)
 */
export function onMounted(fn) {
    queueMicrotask(fn);
}

/**
 * Lifecycle: onUnmounted hook
 * Register cleanup function
 */
export function onUnmounted(fn) {
    // This would be called by the component system
    // For now, components handle their own cleanup
    return fn;
}

/**
 * Debounce function
 */
export function debounce(fn, delay = 300) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Throttle function
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
 * Notification system
 */
let notificationId = 0;

export const notifications = createStore({
    list: []
});

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

export function dismissNotification(id) {
    notifications.update(s => ({
        list: s.list.filter(n => n.id !== id)
    }));
}

/**
 * Form helpers
 */
export function formData(formElement) {
    return Object.fromEntries(new FormData(formElement));
}

export function serializeForm(formElement) {
    const data = formData(formElement);
    return new URLSearchParams(data).toString();
}

/**
 * Fetch helper with better error handling
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
 */
class EventBus {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (!this.events[event]) return;

        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

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

    once(event, callback) {
        const onceWrapper = (...args) => {
            callback(...args);
            this.off(event, onceWrapper);
        };

        return this.on(event, onceWrapper);
    }
}

export const eventBus = new EventBus();

/**
 * Check if value is empty
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
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Generate random ID
 */
export function randomId(prefix = 'id') {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format date to relative time (e.g., "2 hours ago")
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
 * localStorage prefix
 */
const LOCALSTORAGE_PREFIX = 'swapi';

/**
 * Create a store that persists to localStorage
 * @param {string} name - Storage key name
 * @param {*} initial - Initial value
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

export const darkTheme = initDarkTheme();

/**
 * Range utility (like Python's range)
 * @param {number} a - Start (or stop if b is null)
 * @param {number} b - Stop
 * @param {number} step - Step size
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

// Default export for backward compatibility
export default notify;
