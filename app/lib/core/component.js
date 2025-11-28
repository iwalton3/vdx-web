/**
 * Component System
 * Web Components-based system with reactive state (using Preact VDOM)
 */

import { reactive, createEffect, trackAllDependencies } from './reactivity.js';
import { render as preactRender } from '../vendor/preact/index.js';
import { applyValues } from './template-compiler.js';
import { html } from './template.js';

// Debug hooks - can be set by debug-enable.js
let debugRenderCycleHook = null;
let debugPropSetHook = null;
let debugVNodeHook = null;

export function setDebugComponentHooks(hooks) {
    debugRenderCycleHook = hooks.renderCycle;
    debugPropSetHook = hooks.propSet;
    debugVNodeHook = hooks.vnode;
}

// Cache for processed component styles (tag name -> processed CSS string)
const processedStylesCache = new Map();

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
    class Component extends HTMLElement {
        constructor() {
            super();

            // Initialize reactive state
            this.state = reactive(options.data ? options.data.call(this) : {});

            // Store props (always include children, even if empty)
            this.props = {
                children: []
            };

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

            // Lifecycle flags
            this._isMounted = false;
            this._isDestroyed = false;

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

            // Setup property setters for better DX
            this._setupPropertySetters();

            // Parse attributes as props
            this._parseAttributes();

            // Apply any pending props from Preact ref callbacks that fired before mount
            if (this._pendingProps) {
                for (const [name, value] of Object.entries(this._pendingProps)) {
                    // Set directly on props (not via setter) to avoid premature render
                    this.props[name] = value;
                }
                delete this._pendingProps;
            }

            // Clear light DOM children before rendering
            // Framework components render children via props.children in their template,
            // but Preact may have added children as light DOM nodes. We need to clear these
            // to prevent duplication. Plain custom elements (like router-link) are not
            // framework components and won't reach this code.
            while (this.firstChild) {
                this.removeChild(this.firstChild);
            }

            // Mark as mounted BEFORE initial render to prevent double-render
            this._isMounted = true;

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
            const { dispose: disposeRenderEffect } = createEffect(() => {
                // Track all state dependencies efficiently
                trackAllDependencies(this.state);

                // Track store dependencies too
                if (this.stores) {
                    for (const storeState of Object.values(this.stores)) {
                        trackAllDependencies(storeState);
                    }
                }

                // Defer initial render slightly to allow Preact's ref callback to set props
                // This is needed for nested custom elements created by Preact where props
                // are passed via ref callback after connectedCallback fires
                if (!this._hasRendered) {
                    this._hasRendered = true;
                    queueMicrotask(() => {
                        if (this._isMounted && !this._isDestroyed) {
                            this.render();
                        }
                    });
                } else {
                    // Subsequent renders happen immediately
                    this.render();
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

            // Unmount Preact tree
            preactRender(null, this);
        }

        attributeChangedCallback(name, oldValue, newValue) {
            // Only react to changes after initial mount
            if (!this._isMounted || oldValue === newValue) {
                return;
            }

            // Update props
            if (options.props && name in options.props) {
                // Try to parse JSON for complex types
                try {
                    this.props[name] = JSON.parse(newValue);
                } catch {
                    // If not JSON, use as string
                    this.props[name] = newValue;
                }
                // Trigger re-render
                this.render();
            }
        }

        static get observedAttributes() {
            // Observe all props as attributes
            return options.props ? Object.keys(options.props) : [];
        }

        _setupPropertySetters() {
            // Security: Block reserved property names to prevent DOM clobbering
            const reservedNames = new Set([
                'constructor', '__proto__', 'prototype', 'toString',
                'valueOf', 'hasOwnProperty', 'isPrototypeOf'
            ]);

            // Always create a setter for 'children' prop
            if (!reservedNames.has('children')) {
                const existingChildren = this.hasOwnProperty('children') ? this.children : undefined;

                Object.defineProperty(this, 'children', {
                    get() {
                        return this.props.children;
                    },
                    set(value) {
                        if (debugPropSetHook) {
                            debugPropSetHook(this.tagName, 'children', value, value, this._isMounted);
                        }
                        this.props.children = value;
                        // Re-render when children change
                        if (this._isMounted) {
                            this.render();
                        }
                    },
                    enumerable: true,
                    configurable: true
                });

                // Restore the pre-existing value if there was one
                if (existingChildren !== undefined) {
                    this.props.children = existingChildren;
                }
            }

            // Create property setters that automatically update props and trigger re-render
            if (options.props) {
                for (const propName of Object.keys(options.props)) {
                    if (reservedNames.has(propName) || propName === 'children') {
                        if (reservedNames.has(propName)) {
                            console.warn(`[Security] Skipping reserved prop name: ${propName}`);
                        }
                        continue;
                    }

                    // Check if property was already set (before connectedCallback)
                    // Store it so we can restore after defining the property setter
                    const existingValue = this.hasOwnProperty(propName) ? this[propName] : undefined;

                    const privateProp = `_${propName}`;

                    Object.defineProperty(this, propName, {
                        get() {
                            return this.props[propName];
                        },
                        set(value) {
                            // Parse string values to match expected types
                            let parsedValue = value;
                            if (typeof value === 'string') {
                                // Try JSON parse for booleans, numbers, objects
                                try {
                                    parsedValue = JSON.parse(value);
                                } catch {
                                    // Keep as string if not valid JSON
                                    parsedValue = value;
                                }
                            }

                            if (debugPropSetHook) {
                                debugPropSetHook(this.tagName, propName, parsedValue, value, this._isMounted);
                            }
                            this.props[propName] = parsedValue;
                            // Re-parse and re-render
                            if (this._isMounted) {
                                this.render();
                            }
                        },
                        enumerable: true,
                        configurable: true
                    });

                    // Restore the pre-existing value if there was one
                    if (existingValue !== undefined) {
                        this.props[propName] = existingValue;
                    }
                }
            }
        }

        _parseAttributes() {
            // Copy attribute values and direct properties to props
            if (options.props) {
                for (const propName of Object.keys(options.props)) {
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
                        // Try to parse JSON for complex types
                        try {
                            this.props[propName] = JSON.parse(attrValue);
                        } catch {
                            // If not JSON, use as string
                            this.props[propName] = attrValue;
                        }
                    } else if (!(propName in this.props)) {
                        // Use default from props definition if not already set
                        this.props[propName] = options.props[propName];
                    }
                }
            }
        }

        render() {
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

        // Helper method to access methods from component
        $method(name) {
            return options.methods?.[name]?.bind(this);
        }
    }

    // Register the custom element
    if (!customElements.get(name)) {
        customElements.define(name, Component);
    }

    return Component;
}
