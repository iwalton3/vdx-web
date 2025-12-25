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
    let isNotifying = false;
    let pendingNotification = false;
    let chainLength = 0;  // Counts total notifications in current chain
    const MAX_CHAIN_LENGTH = 10;

    // Helper to notify all subscribers
    // Uses copy-before-iterate to handle unsubscribe during iteration
    // Queues re-entrant notifications instead of dropping them
    // Throws error on excessive recursion to surface circular dependencies
    function notifySubscribers() {
        if (isNotifying) {
            // Queue notification for after current batch completes
            pendingNotification = true;
            return;
        }

        chainLength++;
        if (chainLength > MAX_CHAIN_LENGTH) {
            chainLength = 0;  // Reset for next chain
            throw new Error(
                `Store notification chain exceeded ${MAX_CHAIN_LENGTH}. ` +
                `This usually indicates circular dependencies in store subscribers.`
            );
        }

        isNotifying = true;
        try {
            // Copy to array to safely handle unsubscribe during iteration
            const subscribersCopy = [...subscribers];
            for (const fn of subscribersCopy) {
                // Check if still subscribed (might have been removed by earlier callback)
                if (subscribers.has(fn)) {
                    try {
                        fn(state);
                    } catch (error) {
                        console.error('Error in store subscriber:', error);
                    }
                }
            }
        } finally {
            isNotifying = false;

            // Process queued notification
            if (pendingNotification) {
                pendingNotification = false;
                queueMicrotask(() => notifySubscribers());
            } else {
                // Chain complete - reset for next chain
                chainLength = 0;
            }
        }
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
