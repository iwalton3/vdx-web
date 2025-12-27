/**
 * Store System
 * Simple reactive stores with subscription support
 */

import { reactive, createEffect } from './reactivity.js';

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

    return {
        get state() {
            return state;
        },

        /**
         * Subscribe to store changes.
         * Fine-grained: only re-runs when properties accessed by fn actually change.
         * Returns unsubscribe function.
         */
        subscribe(fn) {
            // Wrap subscriber in its own effect - tracks only what it accesses
            // This is fine-grained: if fn accesses state.queueIndex, it only
            // re-runs when queueIndex changes, not when currentTime changes
            const effect = createEffect(() => {
                try {
                    fn(state);
                } catch (error) {
                    console.error('Error in store subscriber:', error);
                }
            });

            return () => {
                effect.dispose();
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
