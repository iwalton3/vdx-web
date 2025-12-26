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

// Effect flush hooks - allows template-renderer to batch DOM updates
let onBeforeEffectFlush = null;
let onAfterEffectFlush = null;

/**
 * Register callbacks to run before/after effect flush.
 * Used by template-renderer to batch DOM updates.
 * @param {Function} before - Called before effects run
 * @param {Function} after - Called after all effects complete
 */
export function registerEffectFlushHooks(before, after) {
    onBeforeEffectFlush = before;
    onAfterEffectFlush = after;
}

/** @type {Function|null} Current active effect being tracked */
let activeEffect = null;

/** @type {Array<Function>} Stack of effects for nested tracking */
const effectStack = [];

/**
 * Temporarily detach from the current effect context.
 * Any state accessed during the callback won't become a dependency
 * of the current effect. However, new effects created inside the callback
 * will track their own dependencies normally.
 *
 * @param {Function} fn - Callback to execute without current effect context
 * @returns {any} Return value of the callback
 */
export function withoutTracking(fn) {
    const savedActiveEffect = activeEffect;
    const savedStack = effectStack.slice();

    // Clear the effect context - state access won't be tracked
    activeEffect = null;
    effectStack.length = 0;

    try {
        return fn();
    } finally {
        // Restore the effect context
        effectStack.length = 0;
        for (const effect of savedStack) {
            effectStack.push(effect);
        }
        activeEffect = savedActiveEffect;
    }
}

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
        } catch (e) {
            // Log error but don't re-throw to prevent one broken effect
            // from stopping all reactive tracking
            console.error('[Effect Error] An error occurred in a reactive effect:', e);
            // Return undefined on error - effect tracking continues
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
/**
 * Triggers all effects that depend on a reactive property.
 * Called internally when a reactive property is modified.
 *
 * Note: Effects run synchronously for predictable behavior.
 * Batching should be done at the component level (e.g., render batching).
 *
 * @param {Object} target - The target object
 * @param {string|symbol} key - The property key being modified
 * @private
 */
// Track currently running effects to prevent re-entrancy
const runningEffects = new Set();

// Pending effects to run (batched via microtask)
const pendingEffects = new Set();
let flushScheduled = false;
let isFlushing = false;  // Track if we're inside flushEffects

/** Max iterations to prevent infinite effect loops */
const MAX_FLUSH_ITERATIONS = 100;

/**
 * Schedule effect flush using queueMicrotask.
 * This batches all synchronous state changes into a single effect run,
 * while still being fast enough for interactive updates.
 */
function scheduleFlush() {
    // Don't schedule if already scheduled OR if we're currently flushing
    // (effects triggered during flush are handled by the while loop)
    if (flushScheduled || isFlushing) return;
    flushScheduled = true;

    // Use microtask for fast batching - runs after current sync code
    // but before browser rendering, so UI stays responsive
    queueMicrotask(flushEffects);
}

/**
 * Flush all pending effects synchronously.
 * Effects that were triggered multiple times only run once with latest state.
 *
 * Normally effects are batched and run via requestAnimationFrame (60fps).
 * Call this when you need effects to run immediately (e.g., in tests,
 * or when you need to read DOM state right after a state change).
 *
 * @example
 * state.count = 5;
 * flushEffects(); // Effects run now, not on next frame
 * console.log(document.querySelector('.count').textContent); // "5"
 */
export function flushEffects() {
    // Prevent re-entrant flushing
    if (isFlushing) return;

    isFlushing = true;

    let iterations = 0;

    try {
        // Outer loop: effects → commit → repeat if commit triggered new effects
        do {
            // Begin deferred DOM updates mode (if registered)
            if (onBeforeEffectFlush) onBeforeEffectFlush();

            // Inner loop: run all queued effects (effects can trigger more effects)
            while (pendingEffects.size > 0) {
                iterations++;
                if (iterations > MAX_FLUSH_ITERATIONS) {
                    console.error('[Reactivity] Max flush iterations exceeded - possible infinite effect loop');
                    pendingEffects.clear();
                    break;
                }

                // Copy to array and clear pending set before running
                const effects = [...pendingEffects];
                pendingEffects.clear();

                for (const effect of effects) {
                    if (!runningEffects.has(effect)) {
                        runningEffects.add(effect);
                        try {
                            effect();
                        } finally {
                            runningEffects.delete(effect);
                        }
                    }
                }
            }

            // Commit all queued DOM updates in one batch
            // This may trigger new effects (e.g., custom element props changed)
            if (onAfterEffectFlush) onAfterEffectFlush();

        } while (pendingEffects.size > 0 && iterations < MAX_FLUSH_ITERATIONS);

    } finally {
        isFlushing = false;
        flushScheduled = false;
    }
}

function trigger(target, key) {
    const depsMap = targetMap.get(target);
    if (!depsMap) return;

    const deps = depsMap.get(key);
    if (deps) {
        if (debugReactivityHook) {
            debugReactivityHook(target, key, target[key], `trigger(${deps.size} effects)`);
        }

        // Queue effects for batched execution
        for (const effect of deps) {
            pendingEffects.add(effect);
        }

        // Schedule flush via rAF (60fps) or microtask (fallback)
        scheduleFlush();
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

    // Don't wrap objects with internal slots that can't be proxied
    // These include Set, Map, WeakSet, WeakMap, Promise, and Error
    if (obj instanceof Set || obj instanceof Map || obj instanceof WeakSet || obj instanceof WeakMap || obj instanceof Promise || obj instanceof Error) {
        return obj;
    }

    // Don't wrap html template objects - they're immutable data structures
    if ('_compiled' in obj && '_values' in obj) {
        return obj;
    }

    // Check if object is a Date - needs special handling for method binding
    const isDate = obj instanceof Date;

    // Track which keys were initially untracked - these stay untracked permanently
    // This allows: queue: untracked([]) to auto-apply untracked to future assignments
    const untrackedKeys = new Set();
    for (const key in obj) {
        if (obj[key] !== null && typeof obj[key] === 'object' && obj[key][UNTRACKED]) {
            untrackedKeys.add(key);
        }
    }

    const proxy = new Proxy(obj, {
        get(target, key, receiver) {
            // Special marker property
            if (key === '__isReactive') {
                return true;
            }

            track(target, key);
            const value = Reflect.get(target, key, receiver);

            // Date methods need to be bound to the original Date object
            // because Date's internal slots check 'this' type
            if (isDate && typeof value === 'function') {
                return value.bind(target);
            }

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

            // Recursively make nested objects reactive (but skip Sets/Maps/Promises/Errors/DOM Nodes/html templates)
            if (typeof value === 'object' && value !== null &&
                !(value instanceof Set) && !(value instanceof Map) &&
                !(value instanceof WeakSet) && !(value instanceof WeakMap) &&
                !(value instanceof Promise) && !(value instanceof Error) &&
                !(typeof Node !== 'undefined' && value instanceof Node) &&  // Skip DOM Nodes (can't be proxied)
                !('_compiled' in value && '_values' in value)) {  // Skip html template objects
                return reactive(value);
            }

            return value;
        },

        set(target, key, value, receiver) {
            const oldValue = target[key];

            // Auto-apply untracked to keys that were initially untracked
            if (untrackedKeys.has(key) && value !== null && typeof value === 'object' && !value[UNTRACKED]) {
                untracked(value);
            }

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

/** Symbol to mark objects as untracked */
const UNTRACKED = Symbol('untracked');

/**
 * Marks an object as untracked. When used with reactive state, the object's
 * internal properties won't be deeply tracked - only reassignment of the
 * object itself will trigger updates.
 *
 * Use this for large data structures (arrays of hundreds/thousands of items)
 * where you only care about the array being replaced, not individual item changes.
 *
 * @param {T} obj - The object to mark as untracked
 * @returns {T} The same object with untracked marker
 * @example
 * data() {
 *     return {
 *         // Large list - only track when the whole list is replaced
 *         songs: untracked([]),
 *         // Small values - track normally
 *         currentIndex: 0
 *     };
 * }
 *
 * // To update, reassign the whole array:
 * this.state.songs = untracked([...this.state.songs, newSong]);
 *
 * // Individual item changes won't trigger re-render (by design):
 * this.state.songs[0].title = 'New Title'; // No re-render
 */
export function untracked(obj) {
    if (obj !== null && typeof obj === 'object') {
        Object.defineProperty(obj, UNTRACKED, {
            value: true,
            enumerable: false,
            writable: false,
            configurable: false
        });
    }
    return obj;
}

/**
 * Checks if an object is marked as untracked.
 * @param {*} obj - The object to check
 * @returns {boolean} True if untracked
 */
export function isUntracked(obj) {
    return obj !== null && typeof obj === 'object' && obj[UNTRACKED] === true;
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
 * Optimizations:
 * - Skips objects marked with untracked() - only tracks the reference
 * - Skips non-reactive nested objects (they can't trigger updates)
 * - Uses iterative approach for arrays to reduce call stack
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
export function trackAllDependencies(obj, visited) {
    // Handle null/undefined/primitives
    if (obj == null || typeof obj !== 'object') return;

    // Initialize visited set only at top level (avoid allocation on recursion)
    if (!visited) visited = new Set();

    // Prevent circular references
    if (visited.has(obj)) return;
    visited.add(obj);

    // Skip untracked objects - just accessing obj is enough to track the reference
    // The proxy get trap was already triggered by the caller accessing this property
    if (obj[UNTRACKED]) return;

    // Handle arrays
    if (Array.isArray(obj)) {
        // Access length to track array changes
        const len = obj.length;

        // For large arrays, only track length - not every element
        // Individual elements should be marked untracked if needed
        if (len > 100) {
            // Just track length for large arrays
            return;
        }

        // For smaller arrays, track elements
        for (let i = 0; i < len; i++) {
            const item = obj[i];
            if (item !== null && typeof item === 'object') {
                // Only recurse into reactive objects
                if (item.__isReactive) {
                    trackAllDependencies(item, visited);
                }
            }
        }
        return;
    }

    // Handle objects - use for...in which is faster than Object.keys() + iteration
    for (const key in obj) {
        // Skip prototype properties and internal markers
        if (key === '__isReactive' || key === UNTRACKED) continue;

        try {
            const value = obj[key];  // Access triggers tracking via proxy

            // Only recurse into reactive nested objects
            if (value !== null && typeof value === 'object' && value.__isReactive) {
                trackAllDependencies(value, visited);
            }
        } catch (e) {
            // Skip properties that throw on access (getters that error, etc.)
        }
    }
}
