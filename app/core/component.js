/**
 * Component System
 * Web Components-based system with reactive state
 */

import { reactive, createEffect } from './reactivity.js';
import { patchHTML } from './vdom.js';
import { html, getPropValue, getEventHandler } from './template.js';

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

            // Track bound event listeners for cleanup
            this._boundListeners = [];

            // Track model bindings for cleanup
            this._modelListeners = [];
            this._modelEffects = [];

            // Use shadow DOM only when styles are provided (for encapsulation)
            // Or when explicitly requested with useShadowDOM: true
            if (options.styles || options.useShadowDOM) {
                this.attachShadow({ mode: 'open' });
            }
        }

        connectedCallback() {
            if (this._isDestroyed) return;

            // Setup property setters for better DX
            this._setupPropertySetters();

            // Parse attributes as props
            this._parseAttributes();

            // Initial render
            this.render();

            // Setup reactivity - re-render on state changes
            const effect = createEffect(() => {
                // Always access state to track dependencies (even before mounted)
                JSON.stringify(this.state);

                // Only re-render if component is mounted
                if (this._isMounted) {
                    this.render();
                }
            });

            this._cleanups.push(() => {
                // Cleanup would go here if needed
            });

            // Call mounted hook
            this._isMounted = true;
            if (options.mounted) {
                Promise.resolve().then(() => {
                    if (!this._isDestroyed) {
                        options.mounted.call(this);
                    }
                });
            }
        }

        disconnectedCallback() {
            this._isDestroyed = true;
            this._isMounted = false;

            // Call unmounted hook
            if (options.unmounted) {
                options.unmounted.call(this);
            }

            // Run cleanup functions
            this._cleanups.forEach(fn => fn());
            this._cleanups = [];
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

                    const privateProp = `_${propName}`;

                    Object.defineProperty(this, propName, {
                        get() {
                            return this.props[propName];
                        },
                        set(value) {
                            this.props[propName] = value;
                            // Re-parse and re-render
                            if (this._isMounted) {
                                this.render();
                            }
                        },
                        enumerable: true,
                        configurable: true
                    });
                }
            }
        }

        _parseAttributes() {
            // Copy attribute values and direct properties to props
            if (options.props) {
                for (const propName of Object.keys(options.props)) {
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
            if (!options.template) return;

            // Clean up old event listeners
            this._cleanupEventListeners();

            // Get template HTML
            const templateHTML = options.template.call(this);

            // Convert template to string (in case it's an html tag object)
            const templateString = templateHTML && templateHTML.toString ? templateHTML.toString() : String(templateHTML || '');

            // Get target (shadow root or element itself)
            const target = this.shadowRoot || this;

            // Build full HTML
            const fullHTML = `
                ${options.styles ? `<style>${options.styles}</style>` : ''}
                ${templateString}
            `;

            // Use virtual DOM patching to efficiently update
            patchHTML(target, fullHTML);

            // Bind event handlers (only binds new elements that have on-* attributes)
            this._bindEvents(target);

            // Setup two-way bindings (only binds new elements with x-model)
            this._setupBindings(target);

            // Call afterRender hook if provided
            if (options.afterRender && this._isMounted) {
                Promise.resolve().then(() => {
                    if (!this._isDestroyed) {
                        options.afterRender.call(this);
                    }
                });
            }
        }

        _cleanupEventListeners() {
            // Remove all tracked event listeners
            this._boundListeners.forEach(({ element, eventName, listener }) => {
                element.removeEventListener(eventName, listener);
            });
            this._boundListeners = [];
        }

        _bindEvents(root) {
            // Find all elements with on-* attributes
            // Only bind events on this component's own elements, not child components
            const allElements = root.querySelectorAll('*');

            allElements.forEach(el => {
                // Skip elements that are inside other custom elements WITHOUT Shadow DOM
                // (those components manage their own light DOM children)
                // Elements inside custom elements WITH Shadow DOM are slotted content
                // and should be bound by the parent component
                let parent = el.parentElement;
                while (parent && parent !== root) {
                    if (parent.tagName && parent.tagName.includes('-')) {
                        // Found a custom element parent
                        // Skip only if it doesn't use Shadow DOM
                        if (!parent.shadowRoot) {
                            // Child manages its own light DOM children
                            return;
                        }
                        // Has Shadow DOM, so this element is slotted content
                        // Continue checking up the tree
                    }
                    parent = parent.parentElement;
                }

                // Check all attributes for on- prefix
                Array.from(el.attributes).forEach(attr => {
                    if (attr.name.startsWith('on-')) {
                        const fullAttrName = attr.name;
                        const attrValue = attr.value;

                        // Parse event name and modifiers
                        // Format: on-eventName or on-eventName-modifier
                        const parts = fullAttrName.substring(3).split('-');
                        const eventName = parts[0];
                        const modifier = parts[1];

                        // DON'T remove the attribute - we need it for re-renders
                        // The cleanup phase will remove old listeners before re-binding

                        // Check if this is an event handler marker from template
                        const eventHandler = getEventHandler(attrValue);

                        // Create event listener
                        const listener = (e) => {
                            // Handle modifiers
                            if (modifier === 'prevent') {
                                e.preventDefault();
                            }
                            if (modifier === 'stop') {
                                e.stopPropagation();
                            }

                            // If event handler marker, call the stored function
                            if (eventHandler) {
                                eventHandler.call(this, e);
                            }
                            // Otherwise look up method by name (if we have methods)
                            else if (options.methods && this[attrValue]) {
                                this[attrValue](e);
                            } else if (!eventHandler) {
                                console.warn(`Method "${attrValue}" not found in component ${name}`);
                            }
                        };

                        // Add event listener
                        el.addEventListener(eventName, listener);

                        // Track for cleanup
                        this._boundListeners.push({ element: el, eventName, listener });
                    }
                });
            });
        }

        _setupBindings(root) {
            // Clean up old model bindings to prevent memory leaks
            this._modelListeners.forEach(({ element, listener }) => {
                element.removeEventListener('input', listener);
            });
            this._modelListeners = [];

            // Note: Effect cleanup would require extending createEffect with dispose mechanism
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
                const effect = createEffect(() => {
                    if (el.value !== this.state[prop]) {
                        el.value = this.state[prop];
                    }
                });

                this._modelEffects.push(effect);

                this._cleanups.push(() => {
                    el.removeEventListener('input', listener);
                });
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
