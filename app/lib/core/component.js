/**
 * Component System
 * Web Components-based system with fine-grained reactive rendering
 */

import { reactive, createEffect, trackMutations, flushEffects } from './reactivity.js';
import { compileTemplate } from './template-compiler.js';
import { setRenderContext } from './template.js';
import { instantiateTemplate, createDeferredChild, VALUE_GETTER, flushDOMUpdates } from './template-renderer.js';

// Debug hooks - can be set by debug-enable.js
let debugRenderCycleHook = null;
let debugPropSetHook = null;
let debugVNodeHook = null;

export const componentDefinitions = new Map();

// ============================================================================
// Coordinated Root Rendering System with Automatic Batching
// ============================================================================
// This system ensures that all VDX components render efficiently,
// preventing cascading re-render issues through fine-grained reactivity.
//
// BATCHING: Multiple state changes within the same synchronous execution
// are automatically batched into a single render. For example:
//
//   this.state.a = 1;  // Schedules render
//   this.state.b = 2;  // Same batch
//   this.state.c = 3;  // Same batch
//   // Only ONE render happens (via queueMicrotask)

/** Flag to indicate if we're in the middle of a coordinated tree render */
let isRenderingTree = false;

/** Set of root components pending render (for batching) */
let pendingRoots = null;

/**
 * Schedule a render for a root component.
 * Multiple calls within the same microtask are batched into a single render.
 * If we're already inside a render cycle, the request is ignored since the tree
 * is already being rendered.
 * @param {HTMLElement} root - The root VDX component to render
 */
function scheduleRootRender(root) {
    // Don't schedule if we're already rendering - the tree is being updated
    if (isRenderingTree) {
        return;
    }

    if (!pendingRoots) {
        pendingRoots = new Set();
        queueMicrotask(flushPendingRenders);
    }
    pendingRoots.add(root);
}

/**
 * Flush all pending renders. Called via queueMicrotask.
 * This runs after the current synchronous code completes, batching
 * all state changes into a single render pass.
 */
function flushPendingRenders() {
    if (!pendingRoots) return;

    const roots = pendingRoots;
    pendingRoots = null;

    for (const root of roots) {
        // Only render if component is still mounted
        if (root._isMounted && !root._isDestroyed) {
            performTreeRender(root);
        }
    }
}

/**
 * Flush any pending renders synchronously.
 * Useful for tests that need to verify DOM state immediately after state changes.
 * In normal application code, you don't need to call this - renders are batched
 * automatically via queueMicrotask.
 *
 * @example
 * // In a test:
 * component.state.count = 5;
 * flushRenders();  // Force render to happen now
 * expect(component.textContent).toBe('5');
 */
/**
 * Internal function to flush all pending updates synchronously.
 * Flushes: reactive effects -> component renders -> DOM updates
 */
function flushAll() {
    flushEffects();
    flushPendingRenders();
    flushDOMUpdates();
}

/**
 * Force all pending renders and DOM updates to complete synchronously.
 * Alias for flushSync() without a callback - use when you need DOM to be current.
 */
export function flushRenders() {
    flushAll();
}

/**
 * Execute a function and immediately flush any pending renders.
 * Use this when you need synchronous DOM updates after state changes,
 * such as when measuring elements or interacting with focus.
 *
 * Similar to React's flushSync() - use sparingly as it bypasses batching.
 *
 * @param {Function} fn - Function to execute (typically contains state updates)
 * @returns {any} Return value of the function
 *
 * @example
 * // Scroll to bottom after adding an item
 * flushSync(() => {
 *   this.state.items.push(newItem);
 * });
 * this.refs.container.scrollTop = this.refs.container.scrollHeight;
 *
 * @example
 * // Focus an input after showing it
 * flushSync(() => {
 *   this.state.showInput = true;
 * });
 * this.refs.input.focus();
 *
 * @example
 * // Measure element after state change
 * flushSync(() => {
 *   this.state.expanded = true;
 * });
 * const height = this.refs.panel.offsetHeight;
 */
export function flushSync(fn) {
    const result = fn();
    flushAll();
    return result;
}

/**
 * Perform a SYNCHRONOUS coordinated tree render starting from root.
 * This is called from flushPendingRenders after batching, or directly
 * when immediate rendering is needed (e.g., during tests).
 * @param {HTMLElement} root - The root VDX component to render
 */
function performTreeRender(root) {
    // Prevent re-entry - if we're already rendering, skip
    if (isRenderingTree) {
        return;
    }

    isRenderingTree = true;

    try {
        // Render the tree depth-first
        renderComponentTree(root);
    } finally {
        isRenderingTree = false;
    }
}

/**
 * Recursively render component tree depth-first
 * Catches errors to ensure sibling components still render
 */
function renderComponentTree(component) {
    if (!component._isMounted || component._isDestroyed) {
        return;
    }

    // Render this component with error isolation
    try {
        component._doRender();
    } catch (error) {
        // _doRender has its own error handling, but catch any uncaught errors
        // to ensure tree continues rendering
        console.error(`[${component.tagName}] Unhandled render error:`, error);
    }

    // Continue rendering child VDX components even if parent had errors
    if (component._vdxChildComponents) {
        for (const child of component._vdxChildComponents) {
            renderComponentTree(child);
        }
    }
}

export function setDebugComponentHooks(hooks) {
    debugRenderCycleHook = hooks.renderCycle;
    debugPropSetHook = hooks.propSet;
    debugVNodeHook = hooks.vnode;
}

// Cache for processed component styles (tag name -> processed CSS string)
const processedStylesCache = new Map();

/**
 * Strip CSS comments from a string
 * @param {string} css - CSS string potentially containing comments
 * @returns {string} CSS with comments removed
 */
function stripCSSComments(css) {
    let result = '';
    let i = 0;
    const len = css.length;

    while (i < len) {
        // Check for comment start
        if (css[i] === '/' && i + 1 < len && css[i + 1] === '*') {
            // Skip until comment end
            i += 2;
            while (i < len - 1 && !(css[i] === '*' && css[i + 1] === '/')) {
                i++;
            }
            i += 2; // Skip the */
            // Add a space to prevent tokens from merging
            result += ' ';
        } else {
            result += css[i];
            i++;
        }
    }

    return result;
}

/**
 * Namespace keyframes in CSS to prevent conflicts between components
 * Also updates animation/animation-name properties to reference the namespaced names
 * @param {string} css - CSS string
 * @param {string} tagName - Component tag name for namespacing
 * @returns {string} CSS with namespaced keyframes
 */
function namespaceKeyframes(css, tagName) {
    // Find all keyframe names defined in this CSS
    const keyframeNames = new Set();
    const keyframeRegex = /@(?:-webkit-)?keyframes\s+([a-zA-Z_][\w-]*)/g;
    let match;

    while ((match = keyframeRegex.exec(css)) !== null) {
        keyframeNames.add(match[1]);
    }

    if (keyframeNames.size === 0) {
        return css;
    }

    // Create namespace prefix from tag name (e.g., 'cl-button' -> 'cl-button--')
    const prefix = tagName + '--';

    // Replace keyframe definitions
    let result = css.replace(
        /@(-webkit-)?keyframes\s+([a-zA-Z_][\w-]*)/g,
        (match, webkit, name) => {
            if (keyframeNames.has(name)) {
                return `@${webkit || ''}keyframes ${prefix}${name}`;
            }
            return match;
        }
    );

    // Replace animation and animation-name references
    // This handles: animation: name 1s; animation-name: name;
    for (const name of keyframeNames) {
        // Match animation-name: name or animation: name (with various formats)
        // Be careful not to replace partial matches (e.g., 'spin' in 'spinner')
        const animationRegex = new RegExp(
            `(animation(?:-name)?\\s*:[^;]*?)\\b(${name})\\b`,
            'g'
        );
        result = result.replace(animationRegex, `$1${prefix}${name}`);
    }

    return result;
}

/**
 * Scope component styles to prevent leakage to other components
 * Transforms selectors to be prefixed with component tag name
 *
 * Strategy: Prefix selectors with tag name using descendant combinator.
 * This allows styling nested elements within the component, but prevents
 * styles from affecting other custom components (which have hyphenated tag names).
 *
 * Example:
 *   Input:  "button { color: blue; }"
 *   Output: "x-select-box button { color: blue; }"
 *
 * This means:
 * - ✅ Styles apply to <button> inside x-select-box
 * - ✅ Styles apply to nested <div><button></div> inside x-select-box
 * - ❌ Styles DON'T apply to <my-other-component> inside x-select-box
 *
 * @param {string} css - Raw CSS from component
 * @param {string} tagName - Component tag name (e.g., 'x-select-box')
 * @returns {string} Scoped CSS
 */
function scopeComponentStyles(css, tagName) {
    let result = '';
    let i = 0;

    // Strip comments first to avoid parsing issues
    css = stripCSSComments(css);

    // Namespace keyframes to prevent conflicts between components
    css = namespaceKeyframes(css, tagName);

    const len = css.length;

    // Replace :host and :host() with tag name
    // :host → tagName
    // :host(selector) → tagName + selector (concatenated, no parentheses)
    css = css.replace(/:host(\([^)]*(?:\([^)]*\)[^)]*)*\))?/g, (match, selector) => {
        if (selector) {
            // :host(selector) → tagName + selector (remove outer parens)
            return tagName + selector.slice(1, -1);
        }
        // :host → tagName
        return tagName;
    });

    while (i < len) {
        // Skip whitespace
        while (i < len && /\s/.test(css[i])) {
            result += css[i];
            i++;
        }

        if (i >= len) break;

        // Check for @-rules (media queries, keyframes, etc.)
        if (css[i] === '@') {
            // Find the opening brace of the @-rule
            let j = i;
            while (j < len && css[j] !== '{') {
                j++;
            }

            // Extract the @-rule name to check if it's @keyframes
            const atRuleDecl = css.substring(i, j);
            const isKeyframes = /^@keyframes\s/i.test(atRuleDecl) || /^@-webkit-keyframes\s/i.test(atRuleDecl);

            // Add the @-rule declaration (e.g., "@media screen and (max-width: 600px)")
            result += css.substring(i, j + 1);
            i = j + 1;

            // Find the matching closing brace
            let depth = 1;
            let atRuleBody = '';
            while (i < len && depth > 0) {
                if (css[i] === '{') depth++;
                if (css[i] === '}') depth--;

                if (depth > 0) {
                    atRuleBody += css[i];
                }
                i++;
            }

            // Don't scope @keyframes content (selectors are percentages/from/to, not CSS selectors)
            // Do scope @media queries (they contain normal CSS rules)
            if (isKeyframes) {
                result += atRuleBody;
            } else {
                result += scopeComponentStyles(atRuleBody, tagName);
            }
            result += '}';
            continue;
        }

        // Regular rule: find selector and body
        let selector = '';
        while (i < len && css[i] !== '{') {
            selector += css[i];
            i++;
        }

        selector = selector.trim();
        if (!selector) {
            if (i < len) {
                result += css[i];
                i++;
            }
            continue;
        }

        // Skip the opening brace
        if (i < len && css[i] === '{') {
            i++;
        }

        // Find the rule body
        let depth = 1;
        let body = '';
        while (i < len && depth > 0) {
            if (css[i] === '{') depth++;
            if (css[i] === '}') depth--;

            if (depth > 0) {
                body += css[i];
            }
            i++;
        }

        // Scope the selector
        const scopedSelector = scopeSelector(selector, tagName);
        result += `${scopedSelector} { ${body} }\n`;
    }

    return result;
}

/**
 * Scope a single selector (or comma-separated selectors)
 * @param {string} selector - CSS selector(s)
 * @param {string} tagName - Component tag name
 * @returns {string} Scoped selector(s)
 */
function scopeSelector(selector, tagName) {
    // Split by comma for multiple selectors
    const selectors = selector.split(',').map(s => s.trim());

    return selectors.map(sel => {
        // Don't scope special selectors
        if (sel === '*' || sel === 'body' || sel === 'html' || sel.startsWith('@')) {
            return sel;
        }

        // Already scoped (starts with tag name)
        if (sel.startsWith(tagName)) {
            return sel;
        }

        // Scope with descendant combinator
        // This allows styling nested elements but prevents leakage to other components
        return `${tagName} ${sel}`;
    }).join(', ');
}

/**
 * Define a custom component
 */
export function defineComponent(name, options) {
    // Security: Reserved property names that should not be overwritten
    const reservedNames = new Set([
        'constructor', '__proto__', 'prototype', 'toString',
        'valueOf', 'hasOwnProperty', 'isPrototypeOf'
    ]);

    class Component extends HTMLElement {
        constructor() {
            super();

            // Initialize reactive state
            this.state = reactive(options.data ? options.data.call(this) : {});

            // Store props (always include children and slots, even if empty)
            // children is always an array of default slot children
            // slots is an object with named slot children
            this.props = {
                children: [],
                slots: {}
            };

            // Reactive version counter for fine-grained prop tracking
            // Effects that access this will re-run when props change
            this._propsVersion = reactive({ v: 0 });


            // Apply any props that were set via prototype setters before constructor ran
            // (This happens when props are set on an element before it's added to DOM)
            if (this._pendingProps) {
                for (const [propName, value] of Object.entries(this._pendingProps)) {
                    this.props[propName] = value;
                    if (typeof value === 'string') {
                        // improves usability/accessibility
                        this.setAttribute(propName, value);
                    }
                }
                delete this._pendingProps;
            }

            // Initialize stores (direct references to store state for fine-grained reactivity)
            if (options.stores) {
                this.stores = {};
                for (const [storeName, store] of Object.entries(options.stores)) {
                    // Use store state directly - templates access this.stores.name.property
                    // which tracks only the specific properties accessed, enabling fine-grained updates
                    this.stores[storeName] = store.state;
                }
            }

            // Initialize refs container
            this.refs = {};

            // Bind all methods to this instance
            if (options.methods) {
                for (const [name, method] of Object.entries(options.methods)) {
                    this[name] = method.bind(this);
                }
            }

            // Bind propsChanged hook if defined
            if (options.propsChanged) {
                this.propsChanged = options.propsChanged.bind(this);
            }

            // Lifecycle flags
            this._isMounted = false;
            this._isDestroyed = false;
            this._suppressAttributeChange = false;

            // VDX component hierarchy tracking for coordinated rendering
            this._isVdxComponent = true;
            this._vdxParent = null;
            this._vdxChildComponents = null;  // Set<Component>, created lazily - tracks child VDX components
            this._isVdxRoot = false;   // Will be set in connectedCallback

            // Cleanup functions
            this._cleanups = [];
        }

        /**
         * Emit a change event for x-model binding
         * Handles all the boilerplate: stopPropagation, update prop, emit CustomEvent
         * @param {Event} e - The original event (will have propagation stopped)
         * @param {*} value - The new value to emit
         * @param {string} propName - The prop name to update (default: 'value')
         */
        emitChange(e, value, propName = 'value') {
            // Stop the native event from bubbling
            if (e && e.stopPropagation) {
                e.stopPropagation();
            }

            // NOTE: Removed direct prop mutation - props should only be updated by parent
            // The parent component will handle the change event and update its state,
            // which will trigger a re-render and pass new props to this component
            //
            // Old code (caused reactivity issues):
            // if (propName in this.props) {
            //     this.props[propName] = value;
            // }

            // Emit CustomEvent with detail
            this.dispatchEvent(new CustomEvent('change', {
                bubbles: true,
                composed: true,
                detail: { value }
            }));
        }

        connectedCallback() {
            // Allow reconnection of previously disconnected elements
            // Web Components can be disconnected and reconnected multiple times
            if (this._isDestroyed) {
                // Reset destroyed flag to allow reconnection
                this._isDestroyed = false;
            }

            // Parse attributes as props (prototype setters handle property access)
            this._parseAttributes();

            // Mark as mounted BEFORE initial render to prevent double-render
            this._isMounted = true;

            // Track VDX component hierarchy
            // Find nearest VDX parent by walking up DOM tree
            let parent = this.parentElement;
            while (parent) {
                if (parent._isVdxComponent) {
                    this._vdxParent = parent;
                    // Register with parent
                    if (!(parent._vdxChildComponents instanceof Set)) {
                        parent._vdxChildComponents = new Set();
                    }
                    parent._vdxChildComponents.add(this);
                    break;
                }
                parent = parent.parentElement;
            }
            // If no VDX parent found, this is a root component
            this._isVdxRoot = !this._vdxParent;

            // Capture light DOM children before first render
            // All components capture children as real DOM nodes
            if (this.innerHTML.trim()) {
                // Capture the light DOM content
                const lightDomContent = this.innerHTML;
                // Clear it so it doesn't duplicate when we render
                this.innerHTML = '';

                // Create a temporary container to parse the HTML
                const temp = document.createElement('div');
                temp.innerHTML = lightDomContent;

                // Process children and extract slots
                const defaultChildren = [];
                const namedSlots = {};

                for (const child of Array.from(temp.childNodes)) {
                    if (child.nodeType === Node.ELEMENT_NODE) {
                        const slotName = child.getAttribute('slot');
                        if (slotName) {
                            child.removeAttribute('slot');
                            if (!namedSlots[slotName]) namedSlots[slotName] = [];
                            namedSlots[slotName].push(child);
                        } else {
                            defaultChildren.push(child);
                        }
                    } else if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
                        defaultChildren.push(child);
                    }
                }

                this.props.children = defaultChildren;
                this.props.slots = namedSlots;
            }

            // Note: Store subscriptions are no longer needed because this.stores[name]
            // directly references store.state. Templates access this.stores.name.property
            // which tracks the store's reactive state directly (fine-grained reactivity).

            // Setup reactivity - fine-grained rendering with per-binding effects
            if (options.template) {
                    this._injectStyles();

                    const component = this;
                    let currentCompiled = null;
                    let currentCleanup = null;
                    let afterRenderCalled = false;

                    // Function to instantiate error fallback template (uses static values)
                    const instantiateErrorFallback = (templateResult) => {
                        // Clean up previous if exists
                        if (currentCleanup) {
                            currentCleanup();
                            component.innerHTML = '';
                        }

                        currentCompiled = templateResult._compiled;

                        // Use static values directly - error fallbacks don't need reactive getters
                        const values = templateResult._values || [];

                        // Instantiate template with static values
                        const { fragment, cleanup: templateCleanup } = instantiateTemplate(
                            templateResult._compiled,
                            values,
                            component
                        );

                        component.appendChild(fragment);
                        currentCleanup = templateCleanup;
                    };

                    // Function to instantiate/reinstantiate template
                    const instantiate = (templateResult) => {
                        // Clean up previous if exists
                        if (currentCleanup) {
                            currentCleanup();
                            component.innerHTML = '';
                        }

                        currentCompiled = templateResult._compiled;

                        // Cached template result - updated by a single "compute" effect
                        // Slot getters read from this cache (NOT calling template() themselves)
                        // Use a wrapper object so getters always see updated values via cache.values
                        const cache = { values: templateResult._values || [] };

                        // Reactive version counter - slot effects track this to know when to re-read
                        const cacheVersion = reactive({ v: 0 });
                        // Non-reactive counter to avoid self-tracking loop (v++ reads then writes)
                        let versionCounter = 0;

                        // Single effect that watches ALL state and recomputes template once
                        // This prevents N slots from calling template() N times
                        const computeEffect = createEffect(() => {
                            // Track props version
                            if (component._propsVersion) {
                                const _ = component._propsVersion.v;
                            }

                            try {
                                setRenderContext(component);
                                const result = options.template.call(component);
                                setRenderContext(null);

                                // If template structure changed, schedule re-instantiation
                                if (result._compiled !== currentCompiled) {
                                    queueMicrotask(() => {
                                        if (!component._isDestroyed && component._isMounted) {
                                            instantiate(result);
                                        }
                                    });
                                    return;
                                }

                                // Update cached values and bump version to trigger slot effects
                                // Write to cache.values (not reassign) so getters see update
                                cache.values = result._values || [];
                                // Write new version without reading (avoids self-tracking loop)
                                cacheVersion.v = ++versionCounter;
                            } catch (error) {
                                setRenderContext(null);
                                if (!component._hasRenderError) {
                                    component._hasRenderError = true;
                                    console.error(`[${component.tagName}] Render error:`, error);

                                    if (options.renderError) {
                                        queueMicrotask(() => {
                                            if (component._isDestroyed || !component._isMounted) return;
                                            try {
                                                const fallback = options.renderError.call(component, error);
                                                if (fallback && fallback._compiled) {
                                                    instantiateErrorFallback(fallback);
                                                }
                                            } catch (fallbackError) {
                                                console.error(`[${component.tagName}] renderError() also failed:`, fallbackError);
                                            }
                                        });
                                    }
                                }
                            }
                        });

                        // Convert initial values to getters that read from cached result
                        const values = templateResult._values || [];
                        const valueGetters = values.map((initialValue, index) => {
                            if (typeof initialValue === 'function') {
                                // Actual function values (like renderItem) - pass through as-is
                                return initialValue;
                            }
                            // Create getter that reads from cached values
                            // Tracking cacheVersion.v ensures this re-runs when computeEffect updates
                            const getter = () => {
                                const _ = cacheVersion.v;  // Track version to trigger re-runs
                                return cache.values[index];
                            };
                            // Mark as a value getter so template-renderer knows to call it
                            getter[VALUE_GETTER] = true;
                            return getter;
                        });

                        // Instantiate template
                        const { fragment, cleanup: templateCleanup } = instantiateTemplate(
                            templateResult._compiled,
                            valueGetters,
                            component
                        );

                        component.appendChild(fragment);
                        currentCleanup = () => {
                            templateCleanup();
                            computeEffect.dispose();
                        };

                        // Call afterRender hook
                        if (options.afterRender && !afterRenderCalled) {
                            afterRenderCalled = true;
                            Promise.resolve().then(() => {
                                if (!component._isDestroyed && component._isMounted) {
                                    options.afterRender.call(component);
                                }
                            }).catch(error => {
                                console.error(`[${component.tagName}] afterRender() error:`, error);
                            });
                        }
                    };

                    // Store reinstantiate function for prop change handling
                    component._fgReinstantiate = () => {
                        if (component._isDestroyed || !component._isMounted) return;
                        try {
                            setRenderContext(component);
                            const result = options.template.call(component);
                            setRenderContext(null);
                            if (result && result._compiled) {
                                instantiate(result);
                            }
                            component._hasRenderError = false;
                        } catch (error) {
                            setRenderContext(null);
                            component._hasRenderError = true;

                            // Call error handler if defined
                            if (options.renderError) {
                                try {
                                    const fallback = options.renderError.call(component, error);
                                    if (fallback && fallback._compiled) {
                                        instantiateErrorFallback(fallback);
                                    }
                                } catch (fallbackError) {
                                    console.error(`[${component.tagName}] renderError() also failed:`, fallbackError);
                                }
                            }

                            console.error(`[${component.tagName}] Render error:`, error);
                        }
                    };

                    // Initial instantiation with error handling
                    try {
                        setRenderContext(this);
                        const templateResult = options.template.call(this);
                        setRenderContext(null);

                        if (templateResult && templateResult._compiled) {
                            instantiate(templateResult);
                        }
                        this._hasRenderError = false;
                    } catch (error) {
                        setRenderContext(null);
                        this._hasRenderError = true;

                        // Call error handler if defined
                        if (options.renderError) {
                            try {
                                const fallback = options.renderError.call(this, error);
                                if (fallback && fallback._compiled) {
                                    instantiateErrorFallback(fallback);
                                }
                            } catch (fallbackError) {
                                console.error(`[${this.tagName}] renderError() also failed:`, fallbackError);
                            }
                        }

                        console.error(`[${this.tagName}] Render error:`, error);

                        // Set up recovery effect - watches state and retries when it changes
                        const recoveryEffect = createEffect(() => {
                            // Track mutations using O(1) mutation counter
                            trackMutations(component.state);
                            if (component.stores) {
                                for (const storeState of Object.values(component.stores)) {
                                    trackMutations(storeState);
                                }
                            }

                            // Don't run recovery on first execution (that's the initial failed render)
                            if (!component._hasRenderError) return;

                            // Try to re-render
                            queueMicrotask(() => {
                                if (component._isDestroyed || !component._isMounted) return;
                                try {
                                    setRenderContext(component);
                                    const result = options.template.call(component);
                                    setRenderContext(null);

                                    if (result && result._compiled) {
                                        // Success! Clean up recovery effect and instantiate
                                        recoveryEffect.dispose();
                                        instantiate(result);
                                        component._hasRenderError = false;
                                    }
                                } catch (retryError) {
                                    setRenderContext(null);
                                    // Still failing - will retry on next state change
                                }
                            });
                        });

                        // Store recovery effect cleanup
                        this._cleanups.push(() => recoveryEffect.dispose());
                    }

                // Store cleanup
                this._fineGrainedCleanup = () => {
                    if (currentCleanup) currentCleanup();
                };
            }

            // Call mounted hook AFTER initial render (async, non-blocking)
            // This ensures the component renders immediately and doesn't block navigation
            if (options.mounted) {
                // Use queueMicrotask to ensure mounted runs after current render cycle
                queueMicrotask(() => {
                    // Check if still mounted (might have unmounted during render)
                    if (this._isMounted && !this._isDestroyed) {
                        options.mounted.call(this);
                    }
                });
            }
        }

        disconnectedCallback() {
            // Set flags FIRST to prevent any new operations
            this._isDestroyed = true;
            this._isMounted = false;

            // Clean up VDX component hierarchy
            if (this._vdxParent && this._vdxParent._vdxChildComponents) {
                this._vdxParent._vdxChildComponents.delete(this);
            }
            this._vdxParent = null;
            // Note: child components are cleaned up by their own disconnectedCallback

            // Dispose reactive effects IMMEDIATELY to stop state updates from triggering renders
            // This must happen before calling unmounted() hook
            if (this._cleanups && this._cleanups.length > 0) {
                this._cleanups.forEach(fn => fn());
                this._cleanups = [];
            }

            // Clean up fine-grained rendering effects
            if (this._fineGrainedCleanup) {
                this._fineGrainedCleanup();
                this._fineGrainedCleanup = null;
            }

            // Call unmounted hook (after effects are disposed)
            if (options.unmounted) {
                options.unmounted.call(this);
            }

            // Clear refs to prevent memory leaks from stale DOM references
            this.refs = {};
        }

        attributeChangedCallback(name, oldValue, newValue) {
            // Only react to changes after initial mount
            if (!this._isMounted || oldValue === newValue || this._suppressAttributeChange) {
                return;
            }

            // Update props (prop changes are tracked by fine-grained effects automatically)
            if (options.props && name in options.props) {
                this.props[name] = newValue;
            }
        }

        /**
         * Get the root VDX component in this component's hierarchy
         * Root is the topmost VDX component (has no VDX parent)
         */
        _getVdxRoot() {
            let current = this;
            while (current._vdxParent) {
                current = current._vdxParent;
            }
            return current;
        }

        static get observedAttributes() {
            // Observe all props as attributes
            return options.props ? Object.keys(options.props) : [];
        }

        _parseAttributes() {
            // Copy attribute values and direct properties to props
            if (options.props) {
                for (const propName of Object.keys(options.props)) {
                    if (propName === 'style') {
                        // no-op: style is handled separately as _vdxStyle
                        continue;
                    }

                    // Check if property was set directly on element (before connectedCallback)
                    // This happens when el[propName] = value is set before adding to DOM
                    if (propName in this && this[propName] !== undefined && this[propName] !== options.props[propName]) {
                        // Property was set, use it
                        const value = this[propName];
                        this.props[propName] = value;
                        continue;
                    }

                    // Check for attribute
                    const attrValue = this.getAttribute(propName);
                    if (attrValue !== null) {
                        this.props[propName] = attrValue;
                    } else if (!(propName in this.props)) {
                        // Use default from props definition if not already set
                        this.props[propName] = options.props[propName];
                    }
                }
            }

            // Process json-* attributes for hydration from <script type="application/json"> elements
            // Example: <my-component json-items="items-data"></my-component>
            //          <script type="application/json" id="items-data">[...]</script>
            const jsonAttrsToRemove = [];
            for (const attr of this.attributes) {
                if (attr.name.startsWith('json-')) {
                    // Extract prop name by removing 'json-' prefix and converting to camelCase
                    const propName = attr.name.slice(5).replace(/-([a-z])/g, g => g[1].toUpperCase());
                    const scriptId = attr.value;
                    const scriptEl = document.getElementById(scriptId);

                    if (scriptEl && scriptEl.type === 'application/json') {
                        try {
                            const jsonData = JSON.parse(scriptEl.textContent);
                            this.props[propName] = jsonData;
                        } catch (e) {
                            console.warn(
                                `[${this.tagName}] Failed to parse JSON from #${scriptId} for prop "${propName}".\n` +
                                `  Error: ${e.message}\n` +
                                `  Tip: Ensure the JSON in <script id="${scriptId}"> is valid. ` +
                                `Use a JSON validator if needed.`
                            );
                            // Prop keeps its default value from props definition
                        }
                    } else if (!scriptEl) {
                        try {
                            const jsonData = JSON.parse(scriptId);
                            this.props[propName] = jsonData;
                        } catch (e) {
                            console.warn(
                                `[${this.tagName}] Could not find element #${scriptId} or parse as inline JSON for prop "${propName}".\n` +
                                `  Error: ${e.message}\n` +
                                `  Tip: Either add <script type="application/json" id="${scriptId}">...</script> ` +
                                `or provide valid inline JSON.`
                            );
                            // Prop keeps its default value from props definition
                        }
                    } else {
                        console.warn(
                            `[${this.tagName}] json-${propName} references #${scriptId} which exists but is not type="application/json".\n` +
                            `  Current type: "${scriptEl.type || '(none)'}"\n` +
                            `  Tip: Add type="application/json" to the script tag.`
                        );
                        // Prop keeps its default value from props definition
                    }

                    jsonAttrsToRemove.push(attr.name);
                }
            }

            // Remove json-* attributes after processing (don't modify while iterating)
            for (const attrName of jsonAttrsToRemove) {
                this.removeAttribute(attrName);
            }
        }

        /**
         * Inject component styles into document head (shared by both render paths)
         */
        _injectStyles() {
            if (options.styles && !this._stylesInjected) {
                const styleId = `component-styles-${options.name || this.tagName}`;
                const tagName = this.tagName.toLowerCase();

                if (!document.getElementById(styleId)) {
                    // Check cache first
                    let processedStyles = processedStylesCache.get(tagName);

                    if (!processedStyles) {
                        // Process styles: scope all selectors to this component
                        processedStyles = scopeComponentStyles(options.styles, tagName);

                        // Cache the processed styles
                        processedStylesCache.set(tagName, processedStyles);
                    }

                    // Inject into document head
                    const styleEl = document.createElement('style');
                    styleEl.id = styleId;
                    styleEl.textContent = processedStyles;
                    document.head.appendChild(styleEl);
                }
                this._stylesInjected = true;
            }
        }

        /**
         * Public render method - no-op in fine-grained mode.
         * Kept for API backwards compatibility.
         */
        render() {
            // No-op - fine-grained effects handle all updates automatically
        }

        // Helper method to access methods from component
        $method(name) {
            return options.methods?.[name]?.bind(this);
        }
    }

    // Define property accessors on prototype BEFORE registration

    // Helper to trigger re-instantiation on prop change (for error recovery)
    const scheduleRender = (component) => {
        if (component._fgReinstantiate && component._isMounted && !component._isDestroyed) {
            queueMicrotask(component._fgReinstantiate);
        }
    };

    // Helper to create a prop setter that handles pre-constructor calls
    const createPropSetter = (propName) => ({
        get() {
            // If props exists, return from props; otherwise return undefined
            return this.props ? this.props[propName] : undefined;
        },
        set(value) {
            // Parse string values ONLY for objects/arrays (not primitives)
            // This preserves string types for custom elements - "4" stays "4", not 4
            if (debugPropSetHook) {
                debugPropSetHook(this.tagName || name, propName, value, value, this._isMounted);
            }

            // If props doesn't exist yet (setter called before constructor),
            // store in _pendingProps for later application
            if (!this.props) {
                if (!this._pendingProps) this._pendingProps = {};
                this._pendingProps[propName] = value;
                return;
            }

            const oldValue = this.props[propName];

            // Compare values to avoid unnecessary updates
            // For primitives: compare by value
            // For objects/arrays: compare by reference (deep comparison is too expensive)
            if (value === oldValue) {
                return; // No change, skip update
            }

            this.props[propName] = value;

            // improves usability/accessibility
            this._suppressAttributeChange = true;
            if (typeof value === 'string') {
                this.setAttribute(propName, value);
            } else if (this.hasAttribute(propName)) {
                // remove non-string attributes
                this.removeAttribute(propName);
            }
            this._suppressAttributeChange = false;

            // Only trigger updates if mounted
            if (this._isMounted) {
                if (typeof this.propsChanged === 'function') {
                    this.propsChanged(propName, value, oldValue);
                }
                // Increment props version to trigger reactive effects
                if (this._propsVersion) {
                    this._propsVersion.v++;
                    // If component is in error state, also trigger reinstantiation
                    // since error fallbacks don't have reactive effects watching _propsVersion
                    if (this._hasRenderError) {
                        scheduleRender(this);
                    }
                }
            }
        },
        enumerable: true,
        configurable: true
    });

    // Define 'children' accessor
    Object.defineProperty(Component.prototype, 'children', {
        get() {
            return this.props ? this.props.children : undefined;
        },
        set(value) {
            if (debugPropSetHook) {
                debugPropSetHook(this.tagName || name, 'children', value, value, this._isMounted);
            }
            if (!this.props) {
                if (!this._pendingProps) this._pendingProps = {};
                this._pendingProps.children = value;
                return;
            }
            this.props.children = value;
            if (this._isMounted && this._propsVersion) {
                this._propsVersion.v++;
            }
        },
        enumerable: true,
        configurable: true
    });

    // Define 'slots' accessor
    Object.defineProperty(Component.prototype, 'slots', {
        get() {
            return this.props ? this.props.slots : undefined;
        },
        set(value) {
            if (debugPropSetHook) {
                debugPropSetHook(this.tagName || name, 'slots', value, value, this._isMounted);
            }
            if (!this.props) {
                if (!this._pendingProps) this._pendingProps = {};
                this._pendingProps.slots = value;
                return;
            }
            this.props.slots = value;
            if (this._isMounted && this._propsVersion) {
                this._propsVersion.v++;
            }
        },
        enumerable: true,
        configurable: true
    });

    // Define '_vdxChildren' accessor - avoids conflicts with native DOM 'children' property
    // Maps to props.children internally.
    Object.defineProperty(Component.prototype, '_vdxChildren', {
        get() {
            return this.props ? this.props.children : undefined;
        },
        set(value) {
            if (debugPropSetHook) {
                debugPropSetHook(this.tagName || name, '_vdxChildren', value, value, this._isMounted);
            }
            if (!this.props) {
                if (!this._pendingProps) this._pendingProps = {};
                this._pendingProps.children = value;
                return;
            }
            this.props.children = value;
            if (this._isMounted && this._propsVersion) {
                this._propsVersion.v++;
            }
        },
        enumerable: true,
        configurable: true
    });

    // Define '_vdxSlots' accessor - maps to props.slots internally.
    Object.defineProperty(Component.prototype, '_vdxSlots', {
        get() {
            return this.props ? this.props.slots : undefined;
        },
        set(value) {
            if (debugPropSetHook) {
                debugPropSetHook(this.tagName || name, '_vdxSlots', value, value, this._isMounted);
            }
            if (!this.props) {
                if (!this._pendingProps) this._pendingProps = {};
                this._pendingProps.slots = value;
                return;
            }
            this.props.slots = value;
            if (this._isMounted && this._propsVersion) {
                this._propsVersion.v++;
            }
        },
        enumerable: true,
        configurable: true
    });

    // Define accessors for all declared props
    if (options.props) {
        for (const propName of Object.keys(options.props)) {
            if (reservedNames.has(propName) || propName === 'children' || propName === 'slots') {
                if (reservedNames.has(propName)) {
                    console.warn(`[Security] Skipping reserved prop name: ${propName}`);
                }
                continue;
            }
            if (propName === 'style') {
                // needs workaround due to style being a special property on HTMLElement
                Object.defineProperty(Component.prototype, '_vdxStyle', {
                    get() {
                        return this.props ? this.props.style : undefined;
                    },
                    set(value) {
                        if (debugPropSetHook) {
                            debugPropSetHook(this.tagName || name, '_vdxStyle', value, value, this._isMounted);
                        }
                        if (!this.props) {
                            if (!this._pendingProps) this._pendingProps = {};
                            this._pendingProps.style = value;
                            return;
                        }
                        this.props.style = value;
                        if (this._isMounted) scheduleRender(this);
                    },
                    enumerable: true,
                    configurable: true
                });
                continue;
            }
            Object.defineProperty(Component.prototype, propName, createPropSetter(propName));
        }
    }

    // Register the custom element
    if (!customElements.get(name)) {
        customElements.define(name, Component);
        componentDefinitions.set(name, Component);
    }

    return Component;
}
