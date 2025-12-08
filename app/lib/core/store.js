/**
 * Store System
 * Simple reactive stores with subscription support
 */

import { reactive, createEffect, trackAllDependencies } from './reactivity.js';

/**
 * Dangerous property names that could enable prototype pollution attacks.
 * @type {Set<string>}
 */
const STORE_DANGEROUS_KEYS = new Set([
    '__proto__', 'prototype', 'constructor',
    '__defineGetter__', '__defineSetter__',
    '__lookupGetter__', '__lookupSetter__'
]);

/**
 * Filter an object to remove dangerous keys that could pollute prototypes.
 * @param {Object} obj - Object to filter
 * @returns {Object} New object with dangerous keys removed
 */
function filterDangerousKeys(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const filtered = {};
    for (const key of Object.keys(obj)) {
        if (!STORE_DANGEROUS_KEYS.has(key)) {
            filtered[key] = obj[key];
        } else {
            console.warn(`[VDX Security] Blocked attempt to set dangerous store key: ${key}`);
        }
    }
    return filtered;
}

/**
 * Create a writable store with reactive state
 */
export function createStore(initial) {
    const state = reactive(initial);
    const subscribers = new Set();

    // Helper to notify all subscribers
    function notifySubscribers() {
        subscribers.forEach(fn => {
            try {
                fn(state);
            } catch (error) {
                console.error('Error in store subscriber:', error);
            }
        });
    }

    // Use createEffect to automatically notify on any state change
    // Skip the first run (initial effect run) using a boolean flag
    let hasInitialized = false;
    createEffect(() => {
        // Track all state dependencies efficiently
        trackAllDependencies(state);

        // Don't notify on first run, always notify after that
        if (hasInitialized) {
            notifySubscribers();
        }
        hasInitialized = true;
    });

    return {
        get state() {
            return state;
        },

        /**
         * Subscribe to store changes
         * Returns unsubscribe function
         */
        subscribe(fn) {
            subscribers.add(fn);
            // Call immediately with current state
            try {
                fn(state);
            } catch (error) {
                console.error('Error in store subscriber (initial call):', error);
            }

            return () => {
                subscribers.delete(fn);
            };
        },

        /**
         * Update store with new values.
         * Includes prototype pollution protection.
         * Note: The reactive effect automatically notifies subscribers when state changes
         */
        set(newState) {
            // SECURITY: Filter dangerous keys before assignment
            Object.assign(state, filterDangerousKeys(newState));
        },

        /**
         * Update store using updater function.
         * Includes prototype pollution protection.
         * Note: The reactive effect automatically notifies subscribers when state changes
         */
        update(updater) {
            const newState = updater(state);
            if (newState) {
                // SECURITY: Filter dangerous keys before assignment
                Object.assign(state, filterDangerousKeys(newState));
            }
        }
    };
}
