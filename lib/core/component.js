/**
 * Component System
 * Web Components-based system with fine-grained reactive rendering
 */

import { reactive, createEffect, trackMutations, flushEffects, runAsEffect, computed, withoutTracking, isReactive, nextRender, holdNextRender, releaseNextRender } from './reactivity.js';
import { classToOptions, constructInstance } from './component-class.js';
import { createTask } from './task.js';
import { STORE_BRAND } from './store.js';
import { compileTemplate } from './template-compiler.js';
import { setRenderContext } from './template.js';
import { instantiateTemplate, createDeferredChild, VALUE_GETTER, flushDOMUpdates } from './template-renderer.js';

// Debug hooks - can be set by debug-enable.js. Only the propSet hook has
// call sites; the old renderCycle/vnode hooks died with the pre-fine-grained
// renderer and are no longer accepted.

export const componentDefinitions = new Map();

// ============================================================================
// Batched Rendering
// ============================================================================
// All rendering is driven by fine-grained reactive effects (see the
// computeEffect / slot effects created in connectedCallback). Coordination
// across components happens through effect ownership and depth-sorted
// flushing in reactivity.js, not through DOM-tree walking:
//
//   this.state.a = 1;  // Queues effects
//   this.state.b = 2;  // Same batch
//   this.state.c = 3;  // Same batch
//   // Effects flush once (microtask), DOM commits batch via rAF

/**
 * Internal function to flush all pending updates synchronously.
 * Flushes: reactive effects -> DOM updates
 */
function flushAll() {
    flushEffects();
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

let debugPropSetHook = null;

export function setDebugComponentHooks(hooks) {
    debugPropSetHook = hooks.propSet;
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
    // Identity of this definition (the user's class or options object) -
    // used to keep re-registration of the same definition silent
    const source = options;

    // Class-authored components: translate the class into the options format
    // (see component-class.js). The class is an authoring surface - at
    // runtime `this` is the custom element, exactly as with options.
    if (typeof options === 'function') {
        options = classToOptions(options);
    }

    // Security: Reserved property names that should not be overwritten
    const reservedNames = new Set([
        'constructor', '__proto__', 'prototype', 'toString',
        'valueOf', 'hasOwnProperty', 'isPrototypeOf'
    ]);

    // Attribute name mapping: camelCase props are exposed as kebab-case
    // attributes (fromUnit <-> from-unit). HTML lowercases attribute names,
    // so a camelCase prop name can never match a literal attribute; the
    // legacy smushed-lowercase form (fromunit) is also accepted for reading.
    const toKebabCase = (str) => str.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
    const propAttrNames = new Map();  // propName -> canonical (kebab) attribute name
    const attrToProp = new Map();     // observed attribute name -> propName
    if (options.props) {
        for (const propName of Object.keys(options.props)) {
            const kebab = toKebabCase(propName);
            propAttrNames.set(propName, kebab);
            attrToProp.set(kebab, propName);
            const lower = propName.toLowerCase();
            if (!attrToProp.has(lower)) {
                attrToProp.set(lower, propName);
            }
        }
    }

    // Validate computed property names once at definition time.
    // Names that collide with props, methods, or reserved names are skipped.
    const computedNames = [];
    if (options.computed) {
        for (const [cname, getter] of Object.entries(options.computed)) {
            if (typeof getter !== 'function') {
                console.warn(`[${name}] Skipping computed "${cname}" - must be a plain function`);
                continue;
            }
            if (reservedNames.has(cname) || cname === 'children' || cname === 'slots' || cname === 'style' ||
                (options.props && cname in options.props) ||
                (options.methods && cname in options.methods)) {
                console.warn(`[${name}] Skipping computed "${cname}" - name conflicts with a prop, method, or reserved name`);
                continue;
            }
            computedNames.push(cname);
        }
    }

    class Component extends HTMLElement {
        constructor() {
            super();

            // Store props (always include children and slots, even if empty)
            // children is always an array of default slot children
            // slots is an object with named slot children
            // Initialized BEFORE data() so code in data() (e.g. option
            // factories passed to helpers like createWindowing) can safely
            // read this.props - values arrive later, but the object exists
            this.props = {
                children: [],
                slots: {}
            };

            // Initialize reactive state
            this.state = reactive(options.data ? options.data.call(this) : {});

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
                        this.setAttribute(propAttrNames.get(propName) || propName, value);
                    }
                }
                delete this._pendingProps;
            }

            // Initialize stores (direct references to store state for fine-grained reactivity)
            if (options.stores) {
                this.stores = {};
                for (const [storeName, store] of Object.entries(options.stores)) {
                    if (store && store[STORE_BRAND]) {
                        // Class-based Store: expose the INSTANCE so state fields
                        // (promoted accessors), computed getters, and methods all
                        // hang off this.stores.name. Field reads still track
                        // fine-grained (they forward to the reactive .state).
                        if (store._checkFieldShadow) store._checkFieldShadow();
                        this.stores[storeName] = store;
                    } else {
                        // Legacy createStore: use store state directly - templates
                        // access this.stores.name.property, tracking only the
                        // specific properties accessed (fine-grained updates).
                        this.stores[storeName] = store.state;
                    }
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

            // Per-connect generation counter. Custom elements fire
            // disconnect->reconnect SYNCHRONOUSLY when moved in the DOM
            // (drag-reorder, re-parenting, list re-keying); a same-task move
            // resets _isMounted/_isDestroyed before microtasks queued by the
            // previous connect run, defeating those guards. Every continuation
            // queued during a connect captures the generation and bails if a
            // newer connect has happened since.
            this._connectGen = 0;
            // True once the mounted() microtask for the CURRENT connect has
            // completed - unmounted() is only delivered when its mounted()
            // actually ran (lifecycle pairing).
            this._mountedHookRan = false;
            // Light-DOM children are captured exactly once (first connect).
            // On reconnect the element's innerHTML is its own previous
            // rendered output - re-capturing would corrupt props.children.
            this._childrenCaptured = false;
            // Tasks from this.createTask(): cancelled (NOT disposed) at each
            // disconnect so in-flight runs abort but the task stays usable if
            // the element reconnects.
            this._boundTasks = [];

            // Cleanup functions
            this._cleanups = [];

            // First-render-complete promise (for whenMounted): resolves after
            // the initial render AND mounted() hook complete. whenMounted()
            // waiters await this to know a matched child is fully ready.
            this._ready = new Promise(resolve => { this._resolveReady = resolve; });
            // Resolvers fired when this element disconnects (whenMounted races
            // these to resolve null if the waiter unmounts first).
            this._unmountResolvers = [];
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

        /**
         * Resolve after the next effect flush and DOM commit complete.
         * Rendering is globally batched, so this just delegates to the global
         * nextRender() - there is no per-component variant.
         * @returns {Promise<void>}
         */
        nextRender() {
            return nextRender();
        }

        /**
         * Resolve when a matched child exists in this component's subtree, its
         * custom element is defined (covers lazy import()ed definitions), and
         * its first render + mounted() have completed.
         *
         * Resolves null (never rejects) if THIS component unmounts while
         * waiting - callers write `if (!el) return;`, no try/catch.
         *
         * @param {string|Element} selectorOrElement - CSS selector queried within
         *     this subtree, or a specific element to wait on.
         * @returns {Promise<Element|null>}
         */
        async whenMounted(selectorOrElement) {
            const UNMOUNTED = Symbol('unmounted');

            // A promise that resolves when THIS (the waiter) unmounts.
            const unmounted = new Promise(resolve => {
                if (this._isDestroyed) resolve(UNMOUNTED);
                else this._unmountResolvers.push(() => resolve(UNMOUNTED));
            });

            const resolveTarget = () => (typeof selectorOrElement === 'string'
                ? this.querySelector(selectorOrElement)
                : selectorOrElement);

            // One polling lap: at least one render flush AND one macrotask.
            // nextRender() alone resolves through pure microtasks (it forces a
            // flush even when nothing is pending), so a loop awaiting only it
            // spins on the microtask queue and STARVES macrotasks - the very
            // timeout/fetch/import that would produce the awaited child never
            // gets to run.
            const waitLap = () => Promise.all([
                nextRender(),
                new Promise(resolve => setTimeout(resolve, 0))
            ]);

            // Element we already waited one render on without _ready appearing -
            // a defined non-VDX custom element never gets one, so a second lap
            // on the same element returns it as-is instead of spinning forever.
            let waitedForReadyOn = null;

            while (true) {
                if (this._isDestroyed) return null;

                let el = resolveTarget();

                // Selector not matched yet - wait for a render and re-query.
                // (querySelector already scopes to this subtree; an explicitly
                // passed element is trusted and skips this wait.)
                if (!el) {
                    const r = await Promise.race([waitLap(), unmounted]);
                    if (r === UNMOUNTED || this._isDestroyed) return null;
                    continue;
                }

                const tag = el.tagName ? el.tagName.toLowerCase() : '';
                const isCustom = tag.includes('-');

                if (isCustom) {
                    // Ensure the custom element is defined (lazy import()).
                    if (!customElements.get(tag)) {
                        const defined = customElements.whenDefined(tag).then(() => 'defined');
                        const r = await Promise.race([defined, unmounted]);
                        if (r === UNMOUNTED || this._isDestroyed) return null;
                    }

                    // Await the child's first-render-complete promise. If the
                    // element isn't upgraded to a VDX component yet, wait a
                    // render and retry - but only once per element: a defined
                    // custom element with no _ready after a render is not a VDX
                    // component (third-party), and "defined + present" is the
                    // strongest guarantee it can offer.
                    if (el._ready) {
                        const r = await Promise.race([el._ready, unmounted]);
                        if (r === UNMOUNTED || this._isDestroyed) return null;
                        // _ready also resolves at DISCONNECT (never leave a
                        // waiter hanging) - a detached element is not mounted.
                        // Wait a render and retry; reconnect creates a fresh
                        // _ready which the next lap awaits.
                        if (!el.isConnected) {
                            const r2 = await Promise.race([waitLap(), unmounted]);
                            if (r2 === UNMOUNTED || this._isDestroyed) return null;
                            continue;
                        }
                    } else if (waitedForReadyOn !== el) {
                        waitedForReadyOn = el;
                        const r = await Promise.race([waitLap(), unmounted]);
                        if (r === UNMOUNTED || this._isDestroyed) return null;
                        continue;
                    }
                }

                return el;
            }
        }

        /**
         * Create a latest-wins async task bound to this component's lifetime -
         * in-flight runs are auto-cancelled when the component unmounts. The
         * task itself stays usable, so a task created once in a class
         * constructor keeps working after a disconnect->reconnect DOM move
         * (dispose() would kill it permanently; the element may come back).
         * @param {(signal: AbortSignal, ...args: any[]) => any} fn
         * @returns {ReturnType<typeof createTask>}
         */
        createTask(fn) {
            const task = createTask(fn);
            this._boundTasks.push(task);
            return task;
        }

        connectedCallback() {
            // Allow reconnection of previously disconnected elements
            // Web Components can be disconnected and reconnected multiple times
            if (this._isDestroyed) {
                // Reset destroyed flag to allow reconnection
                this._isDestroyed = false;
            }

            // Claim this connect's generation. Continuations queued below
            // (mount hook, structural re-instantiation, error fallback and
            // recovery, afterRender) capture `gen` and no-op when a newer
            // connect has superseded them - the resettable flags alone cannot
            // catch a synchronous disconnect->reconnect (DOM move).
            const gen = ++this._connectGen;
            const isReconnect = this._childrenCaptured;

            // Parse attributes as props (prototype setters handle property access)
            this._parseAttributes();

            // Mark as mounted BEFORE initial render to prevent double-render
            this._isMounted = true;

            // Recreate the first-render-complete promise per connect (the
            // constructor made the first one; disconnect and mount-completion
            // consume it). Without this, whenMounted()'s "first render +
            // mounted() done" guarantee is void for any element that ever
            // disconnected - its old _ready stays resolved forever.
            if (!this._resolveReady) {
                this._ready = new Promise(resolve => { this._resolveReady = resolve; });
            }

            // Capture light DOM children ONCE, before the first render.
            // All components capture children as real DOM nodes.
            if (!isReconnect && this.innerHTML.trim()) {
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
            if (!isReconnect) {
                this._childrenCaptured = true;
            } else if (options.template) {
                // Reconnect: clear the remnants of the previous render (slot
                // effect disposal at disconnect removed slot-created nodes;
                // static nodes remain) so re-instantiation doesn't duplicate
                // them. props.children keeps the first-connect capture.
                this.textContent = '';
            }

            // Note: Store subscriptions are no longer needed because this.stores[name]
            // directly references store.state. Templates access this.stores.name.property
            // which tracks the store's reactive state directly (fine-grained reactivity).

            // Class-authored components: run the user constructor now - after
            // attributes are parsed and children captured, so constructor(props)
            // sees real values (deferred timing is part of the class API
            // contract, unlike data() which runs at element construction).
            // Runs once per element; reconnection does not re-run it.
            if (options._class && !this._classConstructed) {
                this._classConstructed = true;

                // Snapshot own properties so class fields (which appear during
                // construction) can be told apart from pre-existing properties
                const ownBefore = new Set(Object.getOwnPropertyNames(this));
                constructInstance(this, options._class);

                // Class fields land as own properties via [[DefineOwnProperty]],
                // which would shadow the prototype prop accessors (and the
                // native style/children APIs). Remove them - prop defaults
                // belong in `static props`.
                for (const key of Object.getOwnPropertyNames(this)) {
                    if (ownBefore.has(key)) continue;
                    const isDeclaredProp = options.props &&
                        Object.prototype.hasOwnProperty.call(options.props, key);
                    if (isDeclaredProp || key === 'children' || key === 'slots' || key === 'style') {
                        delete this[key];
                        console.warn(
                            `[${name}] Class field "${key}" conflicts with a ` +
                            `${isDeclaredProp ? 'declared prop' : 'reserved property'} and was removed - ` +
                            'set prop defaults in static props instead'
                        );
                    }
                }

                // The constructor assigned a plain object to this.state - wrap
                // it now (replaces the placeholder from the element constructor)
                if (!isReactive(this.state)) {
                    this.state = reactive(this.state || {});
                }
            }

            // Create computed properties (lazy, cached; disposed on disconnect).
            // Created inside withoutTracking so they are root-owned effects -
            // NOT children of whatever parent effect is instantiating this
            // component - and survive parent re-renders.
            if (computedNames.length > 0 && !this._computeds) {
                const component = this;
                this._computeds = {};
                withoutTracking(() => {
                    for (const cname of computedNames) {
                        const getter = options.computed[cname];

                        // The computed's creation runs the getter eagerly once.
                        // Instrument this.props for that first run: props is a
                        // plain object (invalidation rides on _propsVersion),
                        // so props reads are invisible to the dependency tracker.
                        let touchedProps = false;
                        const realProps = component.props;
                        Object.defineProperty(component, 'props', {
                            get() { touchedProps = true; return realProps; },
                            configurable: true,
                            enumerable: true
                        });
                        let c;
                        try {
                            c = computed(() => {
                                // Track props version so prop changes invalidate the computed
                                if (component._propsVersion) {
                                    const _ = component._propsVersion.v;
                                }
                                return getter.call(component);
                            });
                        } finally {
                            Object.defineProperty(component, 'props', {
                                value: realProps,
                                writable: true,
                                configurable: true,
                                enumerable: true
                            });
                        }

                        // Footgun lessener: a getter that tracked no reactive
                        // dependency beyond the props version - and never
                        // touched props - can never be invalidated; a cached
                        // computed would return its first value forever.
                        // Fall back to re-evaluating on every read.
                        if (!touchedProps && c._depCount() <= 1) {
                            c.dispose();
                            c = {
                                get: () => getter.call(component),
                                dispose() {}
                            };
                        }
                        component._computeds[cname] = c;
                    }
                });
            }

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

                        // Reference to the compute effect (set after creation for access in effect body)
                        let computeEffectRef = null;

                        // Single effect that watches ALL state and recomputes template once
                        // This prevents N slots from calling template() N times
                        // Slot effects created during instantiation become children of computeEffect
                        // via the ownership system, ensuring cascading disposal on unmount.
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
                                    // Dispose all child effects immediately to prevent them from
                                    // running with stale state before re-instantiation
                                    // (They were triggered by the same state change that triggered us)
                                    const eff = computeEffectRef;
                                    if (eff && eff.children) {
                                        for (const child of eff.children) {
                                            if (child.dispose) child.dispose();
                                        }
                                        eff.children.clear();
                                    }
                                    queueMicrotask(() => {
                                        // gen check: a synchronous DOM move re-ran the
                                        // template setup; instantiating from this stale
                                        // closure would create a zombie compute effect
                                        if (!component._isDestroyed && component._isMounted &&
                                            gen === component._connectGen) {
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
                                            if (component._isDestroyed || !component._isMounted ||
                                                gen !== component._connectGen) return;
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
                        }, { label: `compute:${name}` });

                        // Set ref so effect body can access it on subsequent runs
                        computeEffectRef = computeEffect.effect;

                        // Store on component so children can use it for ownership
                        component._computeEffect = computeEffectRef;

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

                        // Instantiate template - run with computeEffect as owner so
                        // slot effects become its children (for cascading disposal)
                        const { fragment, cleanup: templateCleanup } = runAsEffect(
                            computeEffectRef,
                            () => instantiateTemplate(templateResult._compiled, valueGetters, component)
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
                                if (!component._isDestroyed && component._isMounted &&
                                    gen === component._connectGen) {
                                    options.afterRender.call(component);
                                }
                            }).catch(error => {
                                console.error(`[${component.tagName}] afterRender() error:`, error);
                            });
                        }
                    };

                    // Store reinstantiate function for prop change handling
                    component._fgReinstantiate = () => {
                        if (component._isDestroyed || !component._isMounted ||
                            gen !== component._connectGen) return;
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
                                for (const store of Object.values(component.stores)) {
                                    // Class Store instances expose reactive data
                                    // under .state; legacy stores ARE the state.
                                    trackMutations(store && store[STORE_BRAND] ? store.state : store);
                                }
                            }

                            // Don't run recovery on first execution (that's the initial failed render)
                            if (!component._hasRenderError) return;

                            // Try to re-render
                            queueMicrotask(() => {
                                if (component._isDestroyed || !component._isMounted ||
                                    gen !== component._connectGen) return;
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

            // Call mounted hook AFTER initial render (async, non-blocking).
            // This ensures the component renders immediately and doesn't block
            // navigation. The _ready promise (for whenMounted) resolves here,
            // after mounted() - so a waiter sees a fully-initialized child.
            // Hold nextRender() until this mount microtask has run: state
            // written by mounted() belongs to the render an awaiting caller
            // is waiting on (otherwise `await nextRender()` resolves between
            // the child mounting and its mounted() writes rendering).
            holdNextRender();
            queueMicrotask(() => {
                try {
                    // Check if still mounted (might have unmounted during render)
                    // AND still the same connect - a synchronous DOM move queues a
                    // second mount microtask; without the gen check, mounted()
                    // fires once per queued microtask instead of once per connect.
                    if (this._isMounted && !this._isDestroyed && gen === this._connectGen) {
                        this._mountedHookRan = true;
                        if (options.mounted) {
                            options.mounted.call(this);
                        }
                        if (this._resolveReady) {
                            this._resolveReady(this);
                            this._resolveReady = null;
                        }
                    }
                } finally {
                    releaseNextRender();
                }
            });
        }

        disconnectedCallback() {
            // Set flags FIRST to prevent any new operations
            this._isDestroyed = true;
            this._isMounted = false;

            // Notify whenMounted() waiters that this element unmounted.
            if (this._unmountResolvers && this._unmountResolvers.length > 0) {
                const resolvers = this._unmountResolvers;
                this._unmountResolvers = [];
                for (const resolve of resolvers) resolve();
            }
            // Never leave a whenMounted() await hanging on an element that
            // unmounted before it finished its first render.
            if (this._resolveReady) {
                this._resolveReady(this);
                this._resolveReady = null;
            }

            // Cancel (not dispose) component-bound tasks: in-flight runs
            // abort, but the tasks stay usable if the element reconnects
            // (a task created in a class constructor exists once per element).
            if (this._boundTasks) {
                for (const task of this._boundTasks) task.cancel();
            }

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

            // Call unmounted hook (after effects are disposed) - but only when
            // this connect's mounted() actually ran. A synchronous disconnect
            // can arrive before the queued mount microtask; delivering
            // unmounted() for a mount that never happened breaks pairing.
            if (options.unmounted && this._mountedHookRan) {
                options.unmounted.call(this);
            }
            this._mountedHookRan = false;

            // Dispose computed properties (recreated if the element reconnects)
            if (this._computeds) {
                for (const c of Object.values(this._computeds)) {
                    if (c && c.dispose) c.dispose();
                }
                this._computeds = null;
            }

            // Clear refs to prevent memory leaks from stale DOM references
            this.refs = {};
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue === newValue || this._suppressAttributeChange || !this.props) {
                return;
            }

            // Before the FIRST connect, initial attributes are applied by
            // _parseAttributes (which implements kebab-over-legacy precedence
            // when both attribute forms are present) - skip them here.
            if (this._connectGen === 0) {
                return;
            }

            // Update props, mirroring the property-setter path so attribute
            // changes also notify propsChanged and trigger re-renders.
            // `name` arrives lowercase; map kebab/lowercase forms to the prop.
            const propName = attrToProp.get(name);
            if (propName) {
                const previous = this.props[propName];
                if (previous === newValue) {
                    return;
                }
                this.props[propName] = newValue;

                // While detached (initial parse or between disconnect and
                // reconnect) the value is applied silently: the (re)connect
                // render reads props fresh, so the change is not lost - but
                // propsChanged/re-render only fire on a live component.
                if (!this._isMounted) {
                    return;
                }

                if (typeof this.propsChanged === 'function') {
                    this.propsChanged(propName, newValue, previous);
                }
                if (this._propsVersion) {
                    this._propsVersion.v++;
                    // Error fallbacks have no reactive effects watching _propsVersion
                    if (this._hasRenderError) {
                        scheduleRender(this);
                    }
                }
            }
        }

        static get observedAttributes() {
            // Observe kebab-case and legacy lowercase forms of all props
            return [...attrToProp.keys()];
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

                    // Check for attribute: kebab-case form first, then the
                    // legacy smushed-lowercase form (getAttribute lowercases
                    // propName, so 'fromUnit' reads the 'fromunit' attribute)
                    let attrValue = this.getAttribute(propAttrNames.get(propName));
                    if (attrValue === null) {
                        attrValue = this.getAttribute(propName);
                    }
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
    const createPropSetter = (propName) => {
        // Canonical attribute form (kebab-case for camelCase props)
        const attrName = propAttrNames.get(propName) || propName;
        const hasLegacyForm = attrName !== propName.toLowerCase();
        return {
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
                this.setAttribute(attrName, value);
            } else if (this.hasAttribute(attrName)) {
                // remove non-string attributes
                this.removeAttribute(attrName);
            }
            // Clear a stale legacy smushed-lowercase attribute (e.g. from
            // static HTML written before kebab-case support)
            if (hasLegacyForm && this.hasAttribute(propName)) {
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
        };
    };

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

    // Batched prop assignment: updates ALL backing values before firing any
    // propsChanged callback, so a handler can safely read this.props for
    // sibling props delivered in the same batch. The router uses this for
    // params+query — with individual setters, the params handler runs while
    // this.props.query is still stale (and vice versa).
    Object.defineProperty(Component.prototype, 'setProps', {
        value: function setProps(newProps) {
            if (!newProps || typeof newProps !== 'object') return;

            // Called before constructor: stash for later application
            if (!this.props) {
                if (!this._pendingProps) this._pendingProps = {};
                Object.assign(this._pendingProps, newProps);
                return;
            }

            const changes = [];
            for (const [propName, value] of Object.entries(newProps)) {
                // Only declared props with generated accessors participate in
                // batching; special/undeclared props fall back to plain
                // assignment (identical to setting the property directly)
                const declared = options.props &&
                    Object.prototype.hasOwnProperty.call(options.props, propName) &&
                    !reservedNames.has(propName) &&
                    propName !== 'style' && propName !== 'children' && propName !== 'slots';
                if (!declared) {
                    this[propName] = value;
                    continue;
                }

                if (debugPropSetHook) {
                    debugPropSetHook(this.tagName || name, propName, value, value, this._isMounted);
                }

                const oldValue = this.props[propName];
                if (value === oldValue) continue;

                this.props[propName] = value;

                // Mirror the attribute handling in createPropSetter
                const attrName = propAttrNames.get(propName) || propName;
                this._suppressAttributeChange = true;
                if (typeof value === 'string') {
                    this.setAttribute(attrName, value);
                } else if (this.hasAttribute(attrName)) {
                    this.removeAttribute(attrName);
                }
                if (attrName !== propName.toLowerCase() && this.hasAttribute(propName)) {
                    this.removeAttribute(propName);
                }
                this._suppressAttributeChange = false;

                changes.push([propName, value, oldValue]);
            }

            if (changes.length === 0 || !this._isMounted) return;

            // All backing values are current — now notify
            if (typeof this.propsChanged === 'function') {
                for (const [propName, value, oldValue] of changes) {
                    this.propsChanged(propName, value, oldValue);
                }
            }
            // Single version bump for the whole batch (one re-render)
            if (this._propsVersion) {
                this._propsVersion.v++;
                if (this._hasRenderError) {
                    scheduleRender(this);
                }
            }
        },
        writable: true,
        configurable: true
    });

    // Define accessors for all declared props
    if (options.props) {
        for (const propName of Object.keys(options.props)) {
            if (reservedNames.has(propName) || propName === 'children' || propName === 'slots') {
                if (reservedNames.has(propName)) {
                    console.warn(`[VDX Security] Skipping reserved prop name: ${propName}`);
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

    // Define accessors for computed properties - read as plain properties
    // (this.total, not this.total()). get() registers the reading effect as
    // a dependent, so templates re-render when the computed invalidates.
    for (const cname of computedNames) {
        Object.defineProperty(Component.prototype, cname, {
            get() {
                const c = this._computeds && this._computeds[cname];
                return c ? c.get() : undefined;
            },
            enumerable: true,
            configurable: true
        });
    }

    // Register the custom element. On a name collision, keep the existing
    // definition and warn loudly - silently registering nothing (and
    // returning a class that isn't the one in the registry) hides the
    // conflict until components render as the wrong thing.
    const existing = customElements.get(name);
    if (existing) {
        const registered = componentDefinitions.get(name) || existing;
        // Re-registering the SAME definition (same class or options object,
        // e.g. a defineComponent call that runs twice) is idempotent and
        // silent; a different definition under the same name is a collision
        if (registered._vdxSource !== source) {
            console.warn(
                `[defineComponent] <${name}> is already defined - keeping the existing definition. ` +
                'Register this component under a different tag name to resolve the collision.'
            );
        }
        return registered;
    }
    Component._vdxSource = source;
    customElements.define(name, Component);
    componentDefinitions.set(name, Component);

    return Component;
}
