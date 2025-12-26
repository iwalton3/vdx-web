/**
 * Template Renderer Spike - Fine-Grained DOM Instantiation
 *
 * This is a proof-of-concept for the children/slots system.
 * Goal: Prove that deferred child instantiation works with parent context preservation.
 */

import { createEffect } from './reactivity.js';

// Marker for deferred children
const DEFERRED_CHILDREN = Symbol('vdx:deferred-children');

/**
 * Create a deferred child descriptor.
 * This captures everything needed to instantiate the child later,
 * including the parent component reference for reactive context.
 */
export function createDeferredChild(compiled, values, parentComponent) {
    return {
        [DEFERRED_CHILDREN]: true,
        compiled,
        values,
        parentComponent,
        // For slot routing
        slotName: null
    };
}

/**
 * Check if a value is a deferred child descriptor
 */
export function isDeferredChild(value) {
    return value && typeof value === 'object' && value[DEFERRED_CHILDREN] === true;
}

/**
 * Instantiate a template into real DOM nodes with reactive effects.
 *
 * @param {Object} compiled - Compiled template (from compileTemplate)
 * @param {Array} values - Dynamic values array
 * @param {Object} component - Component instance for bindings
 * @returns {{ fragment: DocumentFragment, effects: Array, cleanup: Function }}
 */
export function instantiateTemplate(compiled, values, component) {
    const effects = [];
    const fragment = document.createDocumentFragment();

    instantiateNode(compiled, values, component, fragment, effects);

    return {
        fragment,
        effects,
        cleanup() {
            for (const effect of effects) {
                if (effect.dispose) effect.dispose();
            }
        }
    };
}

/**
 * Instantiate a single node (dispatcher)
 */
function instantiateNode(node, values, component, parent, effects) {
    if (!node) return;

    switch (node.op) {
        case 0: // OP.STATIC
            instantiateStatic(node, parent);
            break;
        case 1: // OP.SLOT
            instantiateSlot(node, values, component, parent, effects);
            break;
        case 2: // OP.TEXT
            instantiateText(node, parent);
            break;
        case 3: // OP.ELEMENT
            instantiateElement(node, values, component, parent, effects);
            break;
        case 4: // OP.FRAGMENT
            instantiateFragment(node, values, component, parent, effects);
            break;
    }
}

/**
 * Instantiate a static node (pre-built, no dynamic content)
 */
function instantiateStatic(node, parent) {
    if (node.vnode) {
        // Convert VNode to real DOM (for spike, we'll create simple elements)
        const dom = vnodeToDOM(node.vnode);
        if (dom) parent.appendChild(dom);
    }
}

/**
 * Instantiate a text node
 */
function instantiateText(node, parent) {
    if (node.value) {
        parent.appendChild(document.createTextNode(node.value));
    }
}

/**
 * Instantiate a dynamic slot (the core of fine-grained rendering)
 */
function instantiateSlot(node, values, component, parent, effects) {
    // Create a placeholder comment for this slot
    const placeholder = document.createComment(`slot:${node.index}`);
    parent.appendChild(placeholder);

    // Track current nodes for this slot (for cleanup/replacement)
    let currentNodes = [];

    const effect = createEffect(() => {
        // Get the value (may be a function for reactive access)
        let value = values[node.index];
        if (typeof value === 'function') {
            value = value();
        }

        // Remove old nodes
        for (const oldNode of currentNodes) {
            oldNode.remove();
        }
        currentNodes = [];

        // Handle different value types
        if (value == null || value === false) {
            // Nothing to render
            return;
        }

        if (isDeferredChild(value)) {
            // Deferred child - instantiate with parent's context!
            const { compiled, values: childValues, parentComponent } = value;
            const { fragment, effects: childEffects } = instantiateTemplate(
                compiled,
                childValues,
                parentComponent  // Use the PARENT's component for reactive context
            );
            effects.push(...childEffects);

            // Insert after placeholder
            const nodes = [...fragment.childNodes];
            placeholder.after(fragment);
            currentNodes = nodes;
            return;
        }

        if (Array.isArray(value)) {
            // Array of deferred children (e.g., this.props.children)
            // Track insertion point to maintain correct order
            let insertPoint = placeholder;
            for (const item of value) {
                if (isDeferredChild(item)) {
                    const { compiled, values: childValues, parentComponent } = item;
                    const { fragment, effects: childEffects } = instantiateTemplate(
                        compiled,
                        childValues,
                        parentComponent
                    );
                    effects.push(...childEffects);

                    const nodes = [...fragment.childNodes];
                    insertPoint.after(fragment);
                    if (nodes.length > 0) {
                        insertPoint = nodes[nodes.length - 1];
                    }
                    currentNodes.push(...nodes);
                } else if (item != null) {
                    // Regular value
                    const textNode = document.createTextNode(String(item));
                    insertPoint.after(textNode);
                    insertPoint = textNode;
                    currentNodes.push(textNode);
                }
            }
            return;
        }

        if (value && value._compiled) {
            // Compiled template result (from html``)
            const { fragment, effects: childEffects } = instantiateTemplate(
                value._compiled,
                value._values || [],
                component
            );
            effects.push(...childEffects);

            const nodes = [...fragment.childNodes];
            placeholder.after(fragment);
            currentNodes = nodes;
            return;
        }

        // Primitive value - create text node
        const textNode = document.createTextNode(String(value));
        placeholder.after(textNode);
        currentNodes = [textNode];
    });

    effects.push(effect);
}

/**
 * Instantiate an element
 */
function instantiateElement(node, values, component, parent, effects) {
    const el = document.createElement(node.tag);
    const isCustomElement = node.isCustomElement;

    // Static props
    if (node.staticProps) {
        for (const [name, value] of Object.entries(node.staticProps)) {
            if (name === 'class') {
                el.className = value;
            } else if (name === 'style') {
                el.style.cssText = value;
            } else {
                el.setAttribute(name, value);
            }
        }
    }

    // Dynamic props (create effects)
    for (const { name, def } of node.dynamicProps || []) {
        const effect = createEffect(() => {
            const value = resolveDynamicProp(name, def, values, component, isCustomElement);

            if (value == null || value === false) {
                el.removeAttribute(name);
            } else if (name === 'class') {
                el.className = value;
            } else if (name === 'style') {
                el.style.cssText = value;
            } else if (name === 'value' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
                // Only update if different (preserve cursor)
                if (el.value !== value) {
                    el.value = value;
                }
            } else if (name === 'checked') {
                el.checked = !!value;
            } else if (isCustomElement || name in el) {
                // Set as property for custom elements
                el[name] = value;
            } else {
                el.setAttribute(name, value === true ? '' : String(value));
            }
        });
        effects.push(effect);
    }

    // Events
    for (const { name, def } of node.events || []) {
        const handler = resolveEventHandler(name, def, values, component);
        if (handler) {
            el.addEventListener(name, handler);
            // Track for cleanup
            effects.push({
                dispose() {
                    el.removeEventListener(name, handler);
                }
            });
        }
    }

    // Ref
    if (node.refName && component && component.refs) {
        component.refs[node.refName] = el;
        effects.push({
            dispose() {
                if (component.refs[node.refName] === el) {
                    delete component.refs[node.refName];
                }
            }
        });
    }

    // Children
    if (isCustomElement && node.children && node.children.length > 0) {
        // For custom elements, pass children as deferred descriptors
        const deferredChildren = [];
        const namedSlots = {};

        for (const child of node.children) {
            // Check if child has a slot attribute
            const slotName = getSlotName(child, values);

            const deferred = createDeferredChild(
                child,
                child._itemValues !== undefined ? child._itemValues : values,
                component  // Parent component for context
            );

            if (slotName) {
                if (!namedSlots[slotName]) {
                    namedSlots[slotName] = [];
                }
                namedSlots[slotName].push(deferred);
            } else {
                deferredChildren.push(deferred);
            }
        }

        // Set children/slots on the custom element
        // These will be available as this.props.children and this.props.slots
        el._vdxChildren = deferredChildren;
        el._vdxSlots = Object.keys(namedSlots).length > 0 ? namedSlots : {};
    } else {
        // Regular element - instantiate children directly
        for (const child of node.children || []) {
            const childValues = child._itemValues !== undefined ? child._itemValues : values;
            instantiateNode(child, childValues, component, el, effects);
        }
    }

    parent.appendChild(el);
}

/**
 * Instantiate a fragment
 */
function instantiateFragment(node, values, component, parent, effects) {
    for (const child of node.children || []) {
        const childValues = child._itemValues !== undefined ? child._itemValues : values;
        instantiateNode(child, childValues, component, parent, effects);
    }
}

/**
 * Get slot name from a child node
 */
function getSlotName(node, values) {
    if (!node.staticProps) return null;
    return node.staticProps.slot || null;
}

/**
 * Resolve a dynamic prop value
 */
function resolveDynamicProp(name, def, values, component, isCustomElement) {
    if (def.slot !== undefined) {
        let value = values[def.slot];
        if (typeof value === 'function') {
            value = value();
        }
        return value;
    }

    if (def.xModel !== undefined && component && component.state) {
        return getNestedValue(component.state, def.xModel);
    }

    return null;
}

/**
 * Resolve an event handler
 */
function resolveEventHandler(eventName, def, values, component) {
    if (def.xModel !== undefined && component) {
        // x-model handler
        return (e) => {
            const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
            setNestedValue(component.state, def.xModel, value);
        };
    }

    if (def.slot !== undefined) {
        let handler = values[def.slot];
        if (typeof handler === 'string' && component && component[handler]) {
            handler = component[handler].bind(component);
        }
        return handler;
    }

    if (def.method && component && component[def.method]) {
        return component[def.method].bind(component);
    }

    return null;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
    if (!path) return obj;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current == null) return undefined;
        current = current[part];
    }
    return current;
}

/**
 * Set nested value in object using dot notation
 */
function setNestedValue(obj, path, value) {
    if (!path) return;
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]] == null) {
            current[parts[i]] = {};
        }
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
}

/**
 * Convert a VNode to real DOM (simplified for spike)
 */
function vnodeToDOM(vnode) {
    if (vnode == null) return null;

    if (typeof vnode === 'string' || typeof vnode === 'number') {
        return document.createTextNode(String(vnode));
    }

    if (typeof vnode.type === 'string') {
        const el = document.createElement(vnode.type);

        // Props
        if (vnode.props) {
            for (const [key, value] of Object.entries(vnode.props)) {
                if (key === 'children') continue;
                if (key === 'className' || key === 'class') {
                    el.className = value;
                } else if (key === 'style' && typeof value === 'object') {
                    Object.assign(el.style, value);
                } else if (key.startsWith('on')) {
                    // Skip events for static nodes
                } else if (value != null && value !== false) {
                    el.setAttribute(key, value === true ? '' : String(value));
                }
            }

            // Children
            const children = vnode.props.children;
            if (children) {
                if (Array.isArray(children)) {
                    for (const child of children) {
                        const childDOM = vnodeToDOM(child);
                        if (childDOM) el.appendChild(childDOM);
                    }
                } else {
                    const childDOM = vnodeToDOM(children);
                    if (childDOM) el.appendChild(childDOM);
                }
            }
        }

        return el;
    }

    // Fragment
    if (vnode.type === null || vnode.type === undefined) {
        const frag = document.createDocumentFragment();
        const children = vnode.props?.children;
        if (children) {
            if (Array.isArray(children)) {
                for (const child of children) {
                    const childDOM = vnodeToDOM(child);
                    if (childDOM) frag.appendChild(childDOM);
                }
            } else {
                const childDOM = vnodeToDOM(children);
                if (childDOM) frag.appendChild(childDOM);
            }
        }
        return frag;
    }

    return null;
}

// Export for testing
export {
    instantiateNode,
    instantiateSlot,
    instantiateElement,
    getNestedValue,
    setNestedValue
};
