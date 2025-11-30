/**
 * Component System
 * Web Components-based system with reactive state (using Preact VDOM)
 */

import { reactive, createEffect, trackAllDependencies } from './reactivity.js';
import { render as preactRender } from '../vendor/preact/index.js';
import { applyValues, compileTemplate, groupChildrenBySlot } from './template-compiler.js';

// Debug hooks - can be set by debug-enable.js
let debugRenderCycleHook = null;
let debugPropSetHook = null;
let debugVNodeHook = null;

export const componentDefinitions = new Map();

// ============================================================================
// Coordinated Root Rendering System
// ============================================================================
// This system ensures that all VDX components render from a single root,
// preventing the cascading re-render issues that occur when each component
// manages its own Preact VDOM tree independently.

/** Flag to indicate if we're in the middle of a coordinated tree render */
let isRenderingTree = false;

/**
 * Perform a SYNCHRONOUS coordinated tree render starting from root
 * This must be synchronous to stay within the reactive effect context
 * and prevent the effect from re-triggering during render.
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
 */
function renderComponentTree(component) {
    if (!component._isMounted || component._isDestroyed) {
        return;
    }

    // Render this component
    component._doRender();

    // Render child VDX components (they were updated by our render via Preact props)
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

    // Replace :host with tag name
    css = css.replace(/:host/g, tagName);

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

            // Apply any props that were set via prototype setters before constructor ran
            // (This happens when Preact sets props on an already-constructed element)
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

            // Initialize stores (reactive copies of external store state)
            if (options.stores) {
                this.stores = {};
                for (const [storeName, store] of Object.entries(options.stores)) {
                    // Create reactive copy of store state
                    this.stores[storeName] = reactive({ ...store.state });
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
            if (this._isDestroyed) return;

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

            // For root components, capture light DOM children before first render
            // This enables static HTML inside component tags to be passed as children
            // Nested VDX components in the light DOM will be properly hydrated
            if (this._isVdxRoot && this.innerHTML.trim()) {
                // Capture the light DOM content
                const lightDomContent = this.innerHTML;
                // Clear it so it doesn't duplicate when we render
                this.innerHTML = '';

                // Parse the HTML using the template compiler
                // Using array notation to call compileTemplate with raw HTML (no interpolations)
                const compiled = compileTemplate([lightDomContent]);
                // Convert to VNodes (no dynamic values, no component context needed)
                const vnodes = applyValues(compiled, [], null);

                // Normalize to array for slot processing
                const childArray = Array.isArray(vnodes) ? vnodes : (vnodes ? [vnodes] : []);

                // Separate default children from named slots
                const { defaultChildren, namedSlots } = groupChildrenBySlot(childArray);

                // Set children and slots on props
                this.props.children = defaultChildren;
                this.props.slots = namedSlots;
            }

            // Setup store subscriptions (auto-sync external stores)
            if (options.stores) {
                for (const [storeName, store] of Object.entries(options.stores)) {
                    const unsubscribe = store.subscribe(state => {
                        // Sync all properties from store to our reactive copy
                        for (const key of Object.keys(state)) {
                            this.stores[storeName][key] = state[key];
                        }
                    });
                    this._cleanups.push(unsubscribe);
                }
            }

            // Setup reactivity - re-render on state changes
            // Uses coordinated root rendering to prevent cascading re-renders
            const { dispose: disposeRenderEffect } = createEffect(() => {
                // Track all state dependencies efficiently
                trackAllDependencies(this.state);

                // Track store dependencies too
                if (this.stores) {
                    for (const storeState of Object.values(this.stores)) {
                        trackAllDependencies(storeState);
                    }
                }

                // Perform synchronous coordinated tree render from root
                // Must be synchronous to stay within effect context
                if (this._isMounted && !this._isDestroyed) {
                    performTreeRender(this._getVdxRoot());
                }
            });

            // Store disposal function for cleanup
            this._cleanups.push(disposeRenderEffect);

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

            // Call unmounted hook (after effects are disposed)
            if (options.unmounted) {
                options.unmounted.call(this);
            }

            // Clear refs to prevent memory leaks from stale DOM references
            this.refs = {};

            // Unmount Preact tree
            preactRender(null, this);
        }

        attributeChangedCallback(name, oldValue, newValue) {
            // Only react to changes after initial mount
            if (!this._isMounted || oldValue === newValue || this._suppressAttributeChange) {
                return;
            }

            // Update props
            if (options.props && name in options.props) {
                this.props[name] = newValue;
                // Trigger coordinated re-render from root
                performTreeRender(this._getVdxRoot());
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
                    // This happens when VDOM sets el[propName] = value before adding to DOM
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
                            console.warn(`[${this.tagName}] Failed to parse JSON from #${scriptId} for prop "${propName}":`, e.message);
                        }
                    } else if (!scriptEl) {
                        try {
                            const jsonData = JSON.parse(scriptId);
                            this.props[propName] = jsonData;
                        } catch (e) {
                            console.warn(`[${this.tagName}] Could not find #${scriptId} or parse as JSON for prop "${propName}":`, e.message);
                        }
                    } else {
                        console.warn(`[${this.tagName}] json-${propName} references #${scriptId} which is not type="application/json"`);
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
         * Internal render implementation - called by the coordinated rendering system
         * This is the actual Preact render call. External code should NOT call this directly.
         * Instead, use scheduleRootRender() to trigger a coordinated tree render.
         */
        _doRender() {
            // Guard: Don't render if component is destroyed or not mounted
            if (this._isDestroyed || !this._isMounted) {
                return;
            }

            if (!options.template) return;

            if (debugRenderCycleHook) {
                debugRenderCycleHook(this, 'before-template');
            }

            // Inject styles into document head if not already done
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

            // Call template function to get compiled tree
            const templateResult = options.template.call(this);

            if (debugRenderCycleHook) {
                debugRenderCycleHook(this, 'after-template', {
                    hasCompiled: !!templateResult?._compiled,
                    valuesCount: templateResult?._values?.length || 0
                });
            }

            // Convert compiled tree to Preact elements
            if (templateResult && templateResult._compiled) {
                // Apply values and convert to Preact VNode
                const preactElement = applyValues(
                    templateResult._compiled,
                    templateResult._values || [],
                    this
                );

                if (debugRenderCycleHook) {
                    debugRenderCycleHook(this, 'before-vnode', {
                        isNull: preactElement === null,
                        type: preactElement?.type || 'null'
                    });
                }
                if (debugVNodeHook) {
                    debugVNodeHook(this, preactElement);
                }

                // Render using Preact's reconciliation
                // Preact automatically maintains vdom state between renders
                preactRender(preactElement, this);

                if (debugRenderCycleHook) {
                    debugRenderCycleHook(this, 'after-vnode');
                }
            } else {
                // No compiled template - this shouldn't happen in production
                console.error(`[${this.tagName}] Template was not compiled. Ensure you're using the html\`\` tag.`);
            }

            // Call afterRender hook if provided
            if (options.afterRender && this._isMounted) {
                Promise.resolve().then(() => {
                    if (!this._isDestroyed && this._isMounted) {
                        options.afterRender.call(this);
                    }
                });
            }
        }

        /**
         * Public render method - performs a coordinated render from root
         * This ensures all components render in the correct order
         */
        render() {
            if (this._isMounted && !this._isDestroyed) {
                performTreeRender(this._getVdxRoot());
            }
        }

        // Helper method to access methods from component
        $method(name) {
            return options.methods?.[name]?.bind(this);
        }
    }

    // Define property accessors on prototype BEFORE registration
    // This ensures `name in dom` returns true when Preact checks, allowing
    // direct property setting instead of falling back to setAttribute()

    // Helper to trigger a coordinated tree render from root
    // This ensures all renders go through the tree coordination to prevent cascading issues
    const scheduleRender = (component) => {
        if (component._isMounted && !component._isDestroyed) {
            performTreeRender(component._getVdxRoot());
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
                if (typeof this.propsChanged === 'function' && value !== oldValue) {
                    this.propsChanged(propName, value, oldValue);
                }
                // Use batched render to prevent multiple render cycles during prop updates
                scheduleRender(this);
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
            if (this._isMounted) scheduleRender(this);
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
            if (this._isMounted) scheduleRender(this);
        },
        enumerable: true,
        configurable: true
    });

    // Define '_vdxChildren' accessor - avoids conflicts with native DOM 'children' property
    // and Preact's special handling of props.children. Maps to props.children internally.
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
            if (this._isMounted) scheduleRender(this);
        },
        enumerable: true,
        configurable: true
    });

    // Define '_vdxSlots' accessor - avoids conflicts with Preact prop handling.
    // Maps to props.slots internally.
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
            if (this._isMounted) scheduleRender(this);
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
