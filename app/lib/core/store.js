/**
 * Store System
 * Simple reactive stores with subscription support
 */

import { reactive, createEffect, trackAllDependencies } from './reactivity.js';

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
    // Skip the first run (initial effect run)
    let effectRunCount = 0;
    createEffect(() => {
        effectRunCount++;

        // Track all state dependencies efficiently
        trackAllDependencies(state);

        // Don't notify on first run, always notify after that
        if (effectRunCount > 1) {
            notifySubscribers();
        }
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
         * Update store with new values
         * Note: The reactive effect automatically notifies subscribers when state changes
         */
        set(newState) {
            Object.assign(state, newState);
        },

        /**
         * Update store using updater function
         * Note: The reactive effect automatically notifies subscribers when state changes
         */
        update(updater) {
            const newState = updater(state);
            if (newState) {
                Object.assign(state, newState);
            }
        }
    };
}
