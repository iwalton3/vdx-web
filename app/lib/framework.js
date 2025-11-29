/**
 * VDX-Web Framework - Barrel Export
 * https://github.com/iwalton3/vdx-web
 *
 * Zero-dependency reactive web framework with:
 * - Web Components based architecture
 * - Vue 3-style proxy reactivity
 * - Preact rendering for efficient DOM updates
 * - Compile-once template system
 * - Template helpers (html, when, each, raw)
 * - Reactive stores
 */

/**
 * Define a custom element component with reactive state and template rendering
 *
 * @typedef {Object} ComponentOptions
 * @property {Object<string, any>} [props] - Reactive props with default values
 * @property {() => Object<string, any>} [data] - Function returning reactive state
 * @property {Object<string, Function>} [methods] - Component methods (auto-bound to instance)
 * @property {() => any} template - Template function returning html`` tagged template
 * @property {string} [styles] - Scoped CSS styles for component
 * @property {() => void} [mounted] - Lifecycle hook called after component is added to DOM
 * @property {() => void} [unmounted] - Lifecycle hook called before component is removed
 * @property {() => void} [afterRender] - Lifecycle hook called after each render (use sparingly)
 *
 * @param {string} name - Component tag name (must contain hyphen, e.g., 'my-component')
 * @param {ComponentOptions} options - Component configuration
 * @returns {typeof HTMLElement} Custom element class
 *
 * @example
 * defineComponent('my-counter', {
 *   props: { title: 'Counter' },
 *   data() {
 *     return { count: 0 };
 *   },
 *   methods: {
 *     increment() { this.state.count++; }
 *   },
 *   template() {
 *     return html`
 *       <div>
 *         <h1>${this.props.title}</h1>
 *         <p>Count: ${this.state.count}</p>
 *         <button on-click="increment">+1</button>
 *       </div>
 *     `;
 *   }
 * });
 */
export { defineComponent } from './core/component.js';

/**
 * Create a reactive proxy that tracks dependencies and triggers effects on change
 *
 * @template T
 * @param {T} obj - Object to make reactive
 * @returns {T} Reactive proxy of the object
 *
 * @example
 * const state = reactive({ count: 0, user: { name: 'Alice' } });
 * state.count++; // Triggers reactive effects
 * state.user.name = 'Bob'; // Deep reactivity works
 */
/**
 * Create an effect that automatically runs when its reactive dependencies change
 *
 * @param {() => void} fn - Function to run (dependencies tracked automatically)
 * @returns {() => void} Cleanup function to stop the effect
 *
 * @example
 * const state = reactive({ count: 0 });
 * const cleanup = createEffect(() => {
 *   console.log('Count:', state.count);
 * });
 * state.count++; // Logs: Count: 1
 * cleanup(); // Stop tracking
 */
/**
 * Create a computed value with automatic dependency tracking (deprecated - use computed from utils.js)
 *
 * @deprecated Use `computed` from './utils.js' instead
 * @param {() => any} fn - Computation function
 * @returns {() => any} Computed function
 */
/**
 * Track all reactive dependencies deeply in an object
 *
 * @param {Object} obj - Object to track
 * @returns {void}
 */
/**
 * Check if a value is reactive
 *
 * @param {any} value - Value to check
 * @returns {boolean} True if value is a reactive proxy
 *
 * @example
 * const state = reactive({ count: 0 });
 * isReactive(state); // true
 * isReactive({}); // false
 */
/**
 * Watch reactive dependencies and call callback when they change
 *
 * @param {() => any} fn - Function that accesses reactive values
 * @param {(newValue: any, oldValue: any) => void} callback - Callback with new and old values
 * @returns {() => void} Cleanup function
 *
 * @example
 * const state = reactive({ count: 0 });
 * watch(
 *   () => state.count,
 *   (newVal, oldVal) => console.log(`${oldVal} → ${newVal}`)
 * );
 */
/**
 * Memoize a function result based on dependencies (deprecated - use memo from utils.js)
 *
 * @deprecated Use `debounce` or `throttle` from './utils.js' instead
 * @param {Function} fn - Function to memoize
 * @param {any[]} deps - Dependency array
 * @returns {Function} Memoized function
 */
export { reactive, createEffect, computed, trackAllDependencies, isReactive, watch, memo } from './core/reactivity.js';

/**
 * Tagged template literal for creating XSS-safe HTML templates
 *
 * @param {TemplateStringsArray} strings - Template strings
 * @param {...any} values - Interpolated values (automatically escaped)
 * @returns {Object} Compiled template structure compatible with Preact
 *
 * @example
 * html`<div>${userInput}</div>` // Auto-escaped
 * html`<a href="${url}">Link</a>` // URL sanitized
 */
/**
 * Render trusted HTML without escaping (⚠️ use only for trusted content!)
 *
 * @param {string} htmlString - Trusted HTML string
 * @returns {Object} Raw HTML marker
 *
 * @example
 * // ✅ SAFE - Backend-generated HTML
 * raw(apiResponse.htmlContent)
 *
 * // ❌ DANGEROUS - User input
 * raw(userComment) // XSS vulnerability!
 */
/**
 * Conditional rendering helper
 *
 * @param {boolean} condition - Condition to evaluate
 * @param {any} thenValue - Value/template to return if true
 * @param {any} [elseValue] - Value/template to return if false (optional)
 * @returns {any} The appropriate value based on condition
 *
 * @example
 * when(isLoggedIn,
 *   html`<p>Welcome!</p>`,
 *   html`<p>Please log in</p>`
 * )
 */
/**
 * List rendering helper with automatic keying
 *
 * @template T
 * @param {T[]} array - Array to iterate over
 * @param {(item: T, index: number) => any} mapFn - Function that returns template for each item
 * @returns {any[]} Array of rendered templates
 *
 * @example
 * each(items, item => html`<li>${item.name}</li>`)
 * each(items, (item, index) => html`<li>${index + 1}. ${item.name}</li>`)
 */
/**
 * Async content rendering helper (like Promise.then with loading state)
 * Returns an x-await-then component that manages its own loading/resolved/error state.
 * The component automatically re-renders when the promise resolves - no manual state needed!
 *
 * @param {Promise|any} promiseOrValue - Promise to await, or immediate value
 * @param {(data: any) => any} thenFn - Function to render resolved data
 * @param {any} pendingContent - Content to show while loading
 * @param {((error: any) => any)|any} [catchFn] - Content or function for errors
 * @returns {Object} html template containing x-await-then component
 *
 * @example
 * // Just pass a promise directly!
 * awaitThen(
 *   fetchUser(123),
 *   user => html`<div>${user.name}</div>`,
 *   html`<loading-spinner></loading-spinner>`,
 *   error => html`<div class="error">${error.message}</div>`
 * )
 */
export { html, raw, when, each, awaitThen } from './core/template.js';

/**
 * Clear the template compilation cache (rarely needed)
 *
 * @returns {void}
 *
 * @example
 * pruneTemplateCache(); // Clear compiled templates
 */
export { pruneTemplateCache } from './core/template-compiler.js';

/**
 * Create a reactive store with pub/sub pattern
 *
 * @template T
 * @param {T} initialState - Initial state object
 * @returns {{
 *   state: T,
 *   subscribe: (callback: (state: T) => void) => () => void,
 *   set: (newState: T) => void,
 *   update: (fn: (state: T) => T) => void
 * }} Store object
 *
 * @example
 * const store = createStore({ count: 0 });
 *
 * // Subscribe to changes
 * const unsubscribe = store.subscribe(state => {
 *   console.log('Count:', state.count);
 * });
 *
 * // Update state
 * store.set({ count: 5 });
 * store.update(s => ({ ...s, count: s.count + 1 }));
 *
 * // Cleanup
 * unsubscribe();
 */
export { createStore } from './core/store.js';

/**
 * Preact's createElement function (for advanced usage)
 * @function h
 * @param {string | Function} type - Element type or component
 * @param {Object | null} props - Props/attributes
 * @param {...any} children - Child elements
 * @returns {Object} VNode
 */
/**
 * Preact's Fragment component (for grouping elements without wrapper)
 * @type {Function}
 */
/**
 * Preact's render function (for manual rendering)
 * @function render
 * @param {Object} vnode - Virtual node to render
 * @param {HTMLElement} container - Container element
 * @returns {void}
 */
/**
 * Preact's Component base class (for class components)
 * @class Component
 */
/**
 * Preact's context creation function (for context API)
 * @function createContext
 * @param {any} defaultValue - Default context value
 * @returns {Object} Context object
 */
export { h, Fragment, render, Component, createContext } from './vendor/preact/index.js';

// Auto-register x-await-then component (used by awaitThen() helper)
import './core/x-await-then.js';
