/**
 * Component System
 * Web Components-based system with reactive state (using Preact VDOM)
 */

import { reactive, createEffect, trackAllDependencies } from './reactivity.js';
import { render as preactRender } from '../vendor/preact/index.js';
import { applyValues } from './template-compiler.js';
import { html, getPropValue, getEventHandler } from './template.js';

// Debug logging control - only enable for specific components
const DEBUG_COMPONENTS = new Set([
    // Add component names here to debug them, e.g.:
    // 'HOME-PAGE',
    // 'X-TILES',
    // 'USER-TOOLS'
]);

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

            // Recursively scope the rules inside the @-rule
            result += scopeComponentStyles(atRuleBody, tagName);
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

            // Store props
            this.props = {};

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

            // Track model bindings for cleanup
            this._modelListeners = [];
            this._modelEffects = [];

            // Template caching for performance
            this._cachedTemplate = null;
            this._lastStateSnapshot = null;

            // Create a container div for Preact to render into
            // This gives us a stable mount point for Preact's reconciliation
            this._container = null;
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

            // Update the prop
            if (propName in this.props) {
                this.props[propName] = value;
            }

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

            // Mark as mounted BEFORE initial render to prevent double-render
            this._isMounted = true;

            // Setup reactivity - re-render on state changes
            const { dispose: disposeRenderEffect } = createEffect(() => {
                // Track all state dependencies efficiently
                trackAllDependencies(this.state);

                // Call render - it has its own guards to prevent rendering when unmounted
                this.render();
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
            if (!this._isMounted || oldValue === newValue) return;

            // Update props
            if (options.props && name in options.props) {
                // Check if this is a prop marker from template system
                const propValue = getPropValue(newValue);
                if (propValue !== null) {
                    // Use the actual object/array value
                    this.props[name] = propValue;
                } else {
                    // Try to parse JSON for complex types
                    try {
                        this.props[name] = JSON.parse(newValue);
                    } catch {
                        // If not JSON, use as string
                        this.props[name] = newValue;
                    }
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
            // Create property setters that automatically update props and trigger re-render
            if (options.props) {
                // Security: Block reserved property names to prevent DOM clobbering
                const reservedNames = new Set([
                    'constructor', '__proto__', 'prototype', 'toString',
                    'valueOf', 'hasOwnProperty', 'isPrototypeOf'
                ]);

                for (const propName of Object.keys(options.props)) {
                    if (reservedNames.has(propName)) {
                        console.warn(`[Security] Skipping reserved prop name: ${propName}`);
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
                            const isDebug = DEBUG_COMPONENTS.has(this.tagName);
                            if (isDebug) {
                                console.log(`[${this.tagName}] Prop "${propName}" changed:`, value);
                            }
                            this.props[propName] = value;
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
                        // Check if this is a prop marker from template system
                        const propValue = getPropValue(attrValue);
                        if (propValue !== null) {
                            // Use the actual object/array value
                            this.props[propName] = propValue;
                        } else {
                            // Try to parse JSON for complex types
                            try {
                                this.props[propName] = JSON.parse(attrValue);
                            } catch {
                                // If not JSON, use as string
                                this.props[propName] = attrValue;
                            }
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

            const isDebug = DEBUG_COMPONENTS.has(this.tagName);

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

            // Convert compiled tree to Preact elements
            if (templateResult && templateResult._compiled) {
                if (isDebug) {
                    console.log(`\n[${this.tagName}] Rendering with compiled template`);
                    // Deep clone to avoid proxy issues when logging
                    try {
                        console.log(`[${this.tagName}] State:`, JSON.stringify(this.state, null, 2));
                        console.log(`[${this.tagName}] Props:`, JSON.stringify(this.props, null, 2));
                    } catch (e) {
                        console.log(`[${this.tagName}] State (raw):`, this.state);
                        console.log(`[${this.tagName}] Props (raw):`, this.props);
                    }
                }

                // Apply values and convert to Preact VNode
                const preactElement = applyValues(
                    templateResult._compiled,
                    templateResult._values || [],
                    this
                );

                // Render using Preact's reconciliation
                // Preact automatically maintains vdom state between renders
                preactRender(preactElement, this);
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


        _setupBindings(root) {
            // Clean up old model bindings to prevent memory leaks
            this._modelListeners.forEach(({ element, listener }) => {
                element.removeEventListener('input', listener);
            });
            this._modelListeners = [];

            // Dispose old model effects
            if (this._modelEffects) {
                this._modelEffects.forEach(dispose => dispose());
            }
            this._modelEffects = [];

            // Setup x-model bindings (two-way)
            const modelElements = root.querySelectorAll('[x-model]');

            modelElements.forEach(el => {
                const prop = el.getAttribute('x-model');
                // Don't remove x-model attribute - we need it on subsequent renders

                // Set initial value
                if (prop in this.state) {
                    el.value = this.state[prop];
                }

                // Update state on input - store listener for cleanup
                const listener = (e) => {
                    this.state[prop] = e.target.value;
                };

                el.addEventListener('input', listener);
                this._modelListeners.push({ element: el, listener });

                // Update element when state changes
                const { dispose } = createEffect(() => {
                    if (el.value !== this.state[prop]) {
                        el.value = this.state[prop];
                    }
                });

                // Store dispose function
                this._modelEffects.push(dispose);
            });
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

/**
 * Create a simple functional component (just a template function)
 */
export function createComponent(templateFn) {
    return templateFn;
}
