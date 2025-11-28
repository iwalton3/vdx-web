/**
 * @fileoverview Core Reactivity System
 * Implements Vue 3-style reactivity using JavaScript Proxies for automatic dependency tracking.
 * Provides reactive state, computed values, watchers, and effects.
 * @module core/reactivity
 */

// Debug hooks - can be set by debug-enable.js
let debugReactivityHook = null;
export function setDebugReactivityHook(hook) {
    debugReactivityHook = hook;
}

/** @type {Function|null} Current active effect being tracked */
let activeEffect = null;

/** @type {Array<Function>} Stack of effects for nested tracking */
const effectStack = [];

/**
 * Creates a reactive effect that automatically tracks dependencies.
 * The effect runs immediately and re-runs whenever tracked dependencies change.
 *
 * @param {Function} fn - The effect function to run and track
 * @returns {Object} Object with effect function and dispose method
 * @property {Function} effect - The effect function that can be called to re-run
 * @property {Function} dispose - Cleanup function to stop tracking and remove all dependencies
 * @example
 * const state = reactive({ count: 0 });
 * const { dispose } = createEffect(() => {
 *     console.log('Count is:', state.count);
 * });
 * // Logs: Count is: 0
 *
 * state.count = 5;
 * // Logs: Count is: 5 (automatically re-runs)
 *
 * dispose(); // Stop tracking
 * state.count = 10; // No longer logs
 */
export function createEffect(fn) {
    let disposed = false;

    const effect = () => {
        // Don't run if disposed
        if (disposed) return;

        activeEffect = effect;
        effectStack.push(effect);
        try {
            return fn();
        } finally {
            effectStack.pop();
            activeEffect = effectStack[effectStack.length - 1];
        }
    };

    effect.deps = new Set();

    const dispose = () => {
        if (disposed) return;
        disposed = true;

        // Remove this effect from all dependency sets
        effect.deps.forEach(dep => {
            dep.delete(effect);
        });

        // Clear the deps set
        effect.deps.clear();

        // Remove from effect stack if currently running
        const index = effectStack.indexOf(effect);
        if (index !== -1) {
            effectStack.splice(index, 1);
        }

        // Clear active effect if this was it
        if (activeEffect === effect) {
            activeEffect = null;
        }
    };

    // Run effect once
    effect();

    // Return both the effect and dispose function
    return { effect, dispose };
}

/**
 * Tracks a dependency between the active effect and a reactive property.
 * Called internally during reactive property access.
 *
 * @param {Object} target - The target object
 * @param {string|symbol} key - The property key being accessed
 * @private
 */
function track(target, key) {
    if (activeEffect) {
        let depsMap = targetMap.get(target);
        if (!depsMap) {
            targetMap.set(target, (depsMap = new Map()));
        }
        let deps = depsMap.get(key);
        if (!deps) {
            depsMap.set(key, (deps = new Set()));
        }
        deps.add(activeEffect);
        activeEffect.deps.add(deps);
    }
}

/**
 * Triggers all effects that depend on a reactive property.
 * Called internally when a reactive property is modified.
 *
 * @param {Object} target - The target object
 * @param {string|symbol} key - The property key being modified
 * @private
 */
function trigger(target, key) {
    const depsMap = targetMap.get(target);
    if (!depsMap) return;

    const deps = depsMap.get(key);
    if (deps) {
        if (debugReactivityHook) {
            debugReactivityHook(target, key, target[key], `trigger(${deps.size} effects)`);
        }
        const effects = [...deps];
        effects.forEach(effect => effect());
    }
}

/** @type {WeakMap<Object, Map>} WeakMap to store dependencies for each target object */
const targetMap = new WeakMap();

/**
 * Makes an object reactive using JavaScript Proxy.
 * All property access and mutations are tracked, triggering effects automatically.
 * Nested objects are recursively made reactive.
 *
 * @param {Object|Array} obj - The object or array to make reactive
 * @returns {Proxy} A reactive proxy of the object
 * @example
 * const state = reactive({
 *     count: 0,
 *     nested: { value: 10 }
 * });
 *
 * createEffect(() => console.log(state.count));
 * state.count++; // Effect runs automatically
 * state.nested.value = 20; // Nested changes are tracked too
 */
export function reactive(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    // If already a proxy, return as-is
    if (obj.__isReactive) {
        return obj;
    }

    // Don't wrap Set, Map, WeakSet, WeakMap - they have internal slots
    if (obj instanceof Set || obj instanceof Map || obj instanceof WeakSet || obj instanceof WeakMap) {
        return obj;
    }

    const proxy = new Proxy(obj, {
        get(target, key, receiver) {
            // Special marker property
            if (key === '__isReactive') {
                return true;
            }

            track(target, key);
            const value = Reflect.get(target, key, receiver);

            // For array methods that modify the array, wrap them to trigger updates
            if (Array.isArray(target) && typeof value === 'function') {
                const arrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
                if (arrayMethods.includes(key)) {
                    return function(...args) {
                        const result = value.apply(target, args);
                        // Trigger on length change (covers both length and iteration tracking)
                        trigger(target, 'length');
                        return result;
                    };
                }
            }

            // Recursively make nested objects reactive (but skip Sets/Maps)
            if (typeof value === 'object' && value !== null &&
                !(value instanceof Set) && !(value instanceof Map) &&
                !(value instanceof WeakSet) && !(value instanceof WeakMap)) {
                return reactive(value);
            }

            return value;
        },

        set(target, key, value, receiver) {
            const oldValue = target[key];
            const result = Reflect.set(target, key, value, receiver);

            // Trigger if:
            // 1. Value changed (primitive comparison)
            // 2. Assigning an object/Proxy (internal state might have changed)
            const isObjectAssignment = value !== null && typeof value === 'object';
            if (oldValue !== value || isObjectAssignment) {
                if (debugReactivityHook) {
                    debugReactivityHook(target, key, value, 'set');
                }
                trigger(target, key);
            }

            return result;
        },

        deleteProperty(target, key) {
            const result = Reflect.deleteProperty(target, key);
            trigger(target, key);
            return result;
        }
    });

    return proxy;
}

/**
 * Creates a computed value that automatically updates when dependencies change.
 * The getter function is lazily evaluated and cached until dependencies change.
 *
 * @param {Function} getter - Function that computes the value
 * @returns {Object} Object with computed getter and dispose method
 * @property {Function} get - Function that returns the current computed value
 * @property {Function} dispose - Cleanup function to stop tracking
 * @example
 * const state = reactive({ a: 1, b: 2 });
 * const sum = computed(() => state.a + state.b);
 *
 * console.log(sum.get()); // 3
 * state.a = 5;
 * console.log(sum.get()); // 7 (automatically recomputed)
 *
 * sum.dispose(); // Clean up when done
 */
export function computed(getter) {
    let value;
    let dirty = true;
    let firstRun = true;

    // Create effect that tracks dependencies and marks dirty on changes
    const { dispose } = createEffect(() => {
        if (firstRun) {
            // First run: compute value and track dependencies
            value = getter();
            dirty = false;
            firstRun = false;
        } else {
            // Subsequent runs: mark as dirty (recompute on next get)
            dirty = true;
        }
    });

    const get = () => {
        if (dirty) {
            value = getter();
            dirty = false;
        }
        return value;
    };

    return { get, dispose };
}

/**
 * Watches a reactive value and runs a callback when it changes.
 * The callback receives the new and old values.
 *
 * @param {Function} fn - Function that returns the value to watch
 * @param {Function} [callback] - Callback to run on changes (receives newValue, oldValue)
 * @returns {Function} Dispose function to stop watching
 * @example
 * const state = reactive({ count: 0 });
 *
 * const stopWatching = watch(
 *     () => state.count,
 *     (newCount, oldCount) => {
 *         console.log(`Count changed from ${oldCount} to ${newCount}`);
 *     }
 * );
 *
 * state.count = 5; // Logs: Count changed from 0 to 5
 * stopWatching(); // Stop watching
 */
export function watch(fn, callback) {
    let oldValue;

    const { dispose } = createEffect(() => {
        const newValue = fn();
        if (callback && oldValue !== undefined) {
            callback(newValue, oldValue);
        }
        oldValue = newValue;
    });

    return dispose;
}

/**
 * Checks if a value is a reactive proxy.
 *
 * @param {*} value - The value to check
 * @returns {boolean} True if the value is reactive, false otherwise
 * @example
 * const obj = { count: 0 };
 * const reactiveObj = reactive(obj);
 *
 * console.log(isReactive(obj)); // false
 * console.log(isReactive(reactiveObj)); // true
 */
export function isReactive(value) {
    return !!(value && value.__isReactive);
}

/**
 * Memoizes a function and tracks its dependencies.
 * The cached value is only recomputed when dependencies change.
 * Much more efficient than recomputing templates on every render.
 *
 * @param {Function} fn - The function to memoize
 * @param {Array} [deps] - Optional explicit dependencies to track
 * @returns {Function} Memoized function that returns cached value when possible
 * @example
 * // In component:
 * this._memoizedTemplate = memo(() => {
 *     return html`<div>${this.state.items.length} items</div>`;
 * }, [this.state.items]);
 *
 * template() {
 *     return this._memoizedTemplate();  // Only recomputes if items changed
 * }
 */
export function memo(fn, deps) {
    let cachedValue;
    let lastDeps = null;
    let dirty = true;

    return (...args) => {
        // Check if dependencies changed
        if (deps) {
            const depsChanged = !lastDeps || deps.some((dep, i) => dep !== lastDeps[i]);
            if (depsChanged) {
                dirty = true;
                lastDeps = [...deps];
            }
        }

        // Recompute if dirty
        if (dirty) {
            cachedValue = fn(...args);
            dirty = false;
        }

        return cachedValue;
    };
}

/**
 * Efficiently track all properties of a reactive object.
 * This recursively accesses all enumerable properties to register dependencies
 * without the overhead of JSON.stringify.
 *
 * @param {Object} obj - The reactive object to track
 * @param {Set} [visited] - Internal set to prevent circular references
 * @example
 * const state = reactive({ count: 0, nested: { value: 10 } });
 * createEffect(() => {
 *     trackAllDependencies(state);  // Tracks all changes to state
 *     console.log('State changed!');
 * });
 */
export function trackAllDependencies(obj, visited = new Set()) {
    // Handle null/undefined
    if (obj === null || obj === undefined) return;

    // Handle primitives
    if (typeof obj !== 'object') return;

    // Prevent circular references
    if (visited.has(obj)) return;
    visited.add(obj);

    // Handle arrays
    if (Array.isArray(obj)) {
        // Access length to track array changes
        obj.length;
        // Access each element
        for (let i = 0; i < obj.length; i++) {
            const item = obj[i];
            if (typeof item === 'object' && item !== null) {
                trackAllDependencies(item, visited);
            }
        }
        return;
    }

    // Handle objects
    try {
        const keys = Object.keys(obj);
        for (const key of keys) {
            try {
                const value = obj[key];  // Access triggers tracking
                // Recursively track nested objects
                if (typeof value === 'object' && value !== null) {
                    trackAllDependencies(value, visited);
                }
            } catch (e) {
                // Skip properties that throw on access
            }
        }
    } catch (e) {
        // Skip objects that don't support Object.keys
    }
}
