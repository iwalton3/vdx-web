/**
 * Fine-Grained Template Renderer
 *
 * Instantiates compiled templates into real DOM nodes with per-binding effects.
 * Each dynamic value creates its own effect that updates only that DOM location.
 *
 * Key concepts:
 * - Templates are compiled once (by template-compiler.js)
 * - This renderer creates DOM nodes and wires up reactive effects
 * - Updates are O(1) per binding (no full-tree diffing)
 */

import { createEffect, withoutTracking, reactive, registerEffectFlushHooks } from './reactivity.js';
import { isHtml, isRaw, isContain, isMemoEach, isWhen, OP, sanitizeUrl, setRenderContext } from './template.js';
import { componentDefinitions } from './component.js';
import { BOOLEAN_ATTRS } from './constants.js';

// ============================================================================
// Deferred DOM Updates System
// ============================================================================
// Effects run via microtask (fast, works in background tabs).
// DOM updates are batched and applied via requestAnimationFrame.
// This reduces layout thrashing - multiple state changes = one layout.

/** Pending attribute updates: Map<Element, Map<attrName, value>> */
const pendingAttrUpdates = new Map();

/** Pending text updates: Map<TextNode, value> */
const pendingTextUpdates = new Map();

/** Whether we're currently in effect flush mode (queue updates vs apply directly) */
let isDeferringUpdates = false;

/** Whether a rAF is scheduled for DOM commits */
let domCommitScheduled = false;

/** Whether any DOM instantiations occurred during deferred update mode */
let hadInstantiations = false;

/**
 * Actually apply all pending DOM updates.
 * Called from rAF or flushDOMUpdates (for flushSync).
 */
function applyPendingDOMUpdates() {
    domCommitScheduled = false;

    // Commit attribute updates
    for (const [el, attrs] of pendingAttrUpdates) {
        for (const [name, { value, isCustomElement }] of attrs) {
            applyAttributeDirect(el, name, value, isCustomElement);
        }
    }
    pendingAttrUpdates.clear();

    // Commit text updates
    for (const [textNode, value] of pendingTextUpdates) {
        textNode.textContent = value ?? '';
    }
    pendingTextUpdates.clear();
}

/**
 * Enter deferred update mode. Called at start of effect flush.
 */
export function beginDeferredUpdates() {
    isDeferringUpdates = true;
    hadInstantiations = false;
}

/**
 * Signal that DOM instantiation occurred during deferred mode.
 * Called from instantiateTemplate when new elements are created.
 */
export function markInstantiation() {
    if (isDeferringUpdates) {
        hadInstantiations = true;
    }
}

/**
 * Exit deferred update mode and apply DOM commits.
 * If instantiations occurred, apply immediately to avoid FOUC.
 * Otherwise, schedule via rAF for batching efficiency.
 */
export function commitDeferredUpdates() {
    isDeferringUpdates = false;

    const hasPendingUpdates = pendingAttrUpdates.size > 0 || pendingTextUpdates.size > 0;

    if (hasPendingUpdates) {
        if (hadInstantiations) {
            // New elements were added - apply updates immediately to keep
            // instantiations and style updates in sync (avoids jank in virtual scroll
            // where elements would appear then jump to correct position)
            applyPendingDOMUpdates();
        } else if (!domCommitScheduled) {
            // No instantiations - safe to batch via RAF for efficiency
            domCommitScheduled = true;
            requestAnimationFrame(applyPendingDOMUpdates);
        }
    }

    hadInstantiations = false;
}

/**
 * Force-flush all pending DOM updates immediately.
 * Used by flushSync() when synchronous DOM access is needed.
 */
export function flushDOMUpdates() {
    if (pendingAttrUpdates.size > 0 || pendingTextUpdates.size > 0) {
        applyPendingDOMUpdates();
    }
}

/**
 * Queue or apply an attribute update depending on mode.
 */
function applyAttribute(el, name, value, isCustomElement) {
    if (isDeferringUpdates) {
        // Queue for later commit (last-write-wins)
        if (!pendingAttrUpdates.has(el)) {
            pendingAttrUpdates.set(el, new Map());
        }
        pendingAttrUpdates.get(el).set(name, { value, isCustomElement });
    } else {
        // Apply directly (initial render, outside effect flush)
        applyAttributeDirect(el, name, value, isCustomElement);
    }
}

/**
 * Queue or apply a text node update depending on mode.
 */
function applyTextContent(textNode, value) {
    if (isDeferringUpdates) {
        // Queue for later commit (last-write-wins)
        pendingTextUpdates.set(textNode, value);
    } else {
        // Apply directly
        textNode.textContent = value ?? '';
    }
}

// ============================================================================

// Symbol to mark a reactive values container
const VALUES_REF = Symbol('vdx:values-ref');

// Marker for deferred children (passed to custom elements)
const DEFERRED_CHILDREN = Symbol('vdx:deferred-children');

// Marker for value getter functions (to distinguish from actual function values)
export const VALUE_GETTER = Symbol('vdx:value-getter');

// Dangerous property names for prototype pollution protection
const DANGEROUS_KEYS = new Set([
    '__proto__', 'prototype', 'constructor',
    '__defineGetter__', '__defineSetter__',
    '__lookupGetter__', '__lookupSetter__'
]);

/**
 * Insert content into DOM without current effect context.
 * This prevents child component state from becoming dependencies of parent effects,
 * while still allowing child components to establish their own effect tracking.
 * Critical for custom elements whose connectedCallback creates its own reactive effects.
 */
function insertWithoutParentTracking(referenceNode, content) {
    withoutTracking(() => {
        referenceNode.after(content);
    });
}

/**
 * Create a deferred child descriptor.
 * Captures everything needed to instantiate the child later,
 * including the parent component reference for reactive context.
 */
export function createDeferredChild(compiled, values, parentComponent) {
    return {
        [DEFERRED_CHILDREN]: true,
        compiled,
        values,
        parentComponent,
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
 * Instantiate a compiled template into real DOM nodes with reactive effects.
 *
 * @param {Object} compiled - Compiled template (from compileTemplate)
 * @param {Array} values - Dynamic values array
 * @param {Object} component - Component instance for bindings
 * @param {boolean} [inSvg=false] - Whether we're inside an SVG context (for namespace inheritance)
 * @returns {{ fragment: DocumentFragment, effects: Array, cleanup: Function }}
 */
export function instantiateTemplate(compiled, values, component, inSvg = false) {
    // Signal that DOM instantiation is occurring - this ensures attribute updates
    // are applied immediately (not deferred to RAF) to avoid FOUC
    markInstantiation();

    const effects = [];
    const fragment = document.createDocumentFragment();

    instantiateNode(compiled, values, component, fragment, effects, inSvg);

    return {
        fragment,
        effects,
        cleanup() {
            for (const effect of effects) {
                if (effect.dispose) effect.dispose();
            }
            effects.length = 0;
        }
    };
}

/**
 * Update template values in place when structure is same but values changed.
 * This preserves DOM elements (important for form inputs) while updating content.
 */
function updateTemplateValues(compiled, newValues, oldValues, domNodes, effects, component) {
    // Walk the DOM to find slot placeholders and update their content
    // Also update custom element props
    // Returns true if all updates succeeded, false if re-instantiation is needed

    // Build a map of slot index -> slot content nodes
    const slotMap = new Map();
    collectSlotNodes(domNodes, slotMap);

    let needsReinstantiation = false;

    // Update each changed slot
    for (const [slotIndex, info] of slotMap) {
        if (slotIndex >= newValues.length) continue;

        let newValue = newValues[slotIndex];
        let oldValue = oldValues[slotIndex];

        // Unwrap VALUE_GETTERs
        if (typeof newValue === 'function' && newValue[VALUE_GETTER]) {
            newValue = newValue();
        }
        if (typeof oldValue === 'function' && oldValue[VALUE_GETTER]) {
            oldValue = oldValue();
        }

        if (newValue === oldValue) continue;

        // For html templates, check if _compiled is the same (same template structure)
        // This happens when when() returns the same template but as a new object
        if (isHtml(newValue) && isHtml(oldValue) &&
            newValue._compiled === oldValue._compiled) {
            // Same template structure - the slot effect handles value updates via
            // reactive container (currentValuesRef). Child effects automatically re-run
            // when the container is updated. No reinstantiation needed.
            continue;
        }

        // Update based on value type
        if (info.nodes.length === 1 && info.nodes[0].nodeType === Node.TEXT_NODE) {
            // Simple text update - use deferred update system
            if (newValue == null || newValue === false) {
                applyTextContent(info.nodes[0], '');
            } else if (typeof newValue !== 'object') {
                applyTextContent(info.nodes[0], String(newValue));
            } else {
                // Object/html value in a text slot - need re-instantiation
                needsReinstantiation = true;
            }
        } else if (isHtml(newValue) || isRaw(newValue) || Array.isArray(newValue)) {
            // Complex slot content changed - need re-instantiation
            needsReinstantiation = true;
        }
        // Slots with elements (like custom elements) are handled by prop updates below
    }

    // Update custom element props
    updateCustomElementProps(compiled, newValues, oldValues, domNodes, component);

    return !needsReinstantiation;
}

/**
 * Update a keyed list (from each()) by diffing items and only updating changed ones.
 * This preserves DOM nodes for unchanged items, avoiding puppeteer element handle issues.
 *
 * @param {Array} newChildren - New compiled children
 * @param {Array} oldChildren - Old compiled children
 * @param {Map} oldItemMap - Map of old items by key
 * @param {Comment} placeholder - Placeholder comment node
 * @param {Object} component - Parent component
 * @param {boolean} slotInSvg - Whether slot is in SVG context
 * @param {boolean} hasExplicitKeys - Whether keys are user-provided (not index-based)
 * @returns {Object|null} { nodes, effects, itemMap } or null if update failed
 */
function updateKeyedList(newChildren, oldChildren, oldItemMap, placeholder, component, slotInSvg = false, hasExplicitKeys = false) {
    // Build map of old items by key
    const newItemMap = new Map();
    const allNodes = [];
    const allEffects = [];

    // Get keys from children
    const newKeys = newChildren.map(c => c?.key);
    const oldKeys = oldChildren.map(c => c?.key);

    // Check for duplicate keys (which would cause reconciliation bugs)
    const uniqueNewKeys = new Set(newKeys);
    const uniqueOldKeys = new Set(oldKeys);
    if (uniqueNewKeys.size !== newKeys.length) {
        console.warn('[Fine-grained] DUPLICATE KEYS in newChildren!', newKeys.length, 'items but only', uniqueNewKeys.size, 'unique keys. First few keys:', newKeys.slice(0, 5));
    }
    if (uniqueOldKeys.size !== oldKeys.length) {
        console.warn('[Fine-grained] DUPLICATE KEYS in oldChildren!', oldKeys.length, 'items but only', uniqueOldKeys.size, 'unique keys. First few keys:', oldKeys.slice(0, 5));
    }

    // Quick check: if keys are identical, just update values in each item
    let keysIdentical = newKeys.length === oldKeys.length;
    if (keysIdentical) {
        for (let i = 0; i < newKeys.length; i++) {
            if (newKeys[i] !== oldKeys[i]) {
                keysIdentical = false;
                break;
            }
        }
    }

    if (keysIdentical) {
        // Keys are the same - update each item in place
        let insertPoint = placeholder;
        for (let i = 0; i < newChildren.length; i++) {
            const newChild = newChildren[i];
            const oldChild = oldChildren[i];
            const key = newChild?.key;
            const oldItem = oldItemMap.get(key);

            if (!oldItem) {
                // Item exists but no old data - shouldn't happen, fallback to full reinstantiation
                return null;
            }

            // Check if structure is the same (ignoring key and _itemValues)
            const sameStructure = isSameStructure(newChild, oldChild);

            if (sameStructure && oldItem.valuesRef) {
                // Same structure and we have a reactive values container
                // Just update the container - effects will re-run automatically
                const newValues = newChild._itemValues || [];
                oldItem.valuesRef.current = newValues;

                // Keep old nodes and effects, update compiled reference
                newItemMap.set(key, {
                    nodes: oldItem.nodes,
                    effects: oldItem.effects,
                    compiled: newChild,
                    valuesRef: oldItem.valuesRef
                });
                allNodes.push(...oldItem.nodes);
                allEffects.push(...oldItem.effects);
                if (oldItem.nodes.length > 0) insertPoint = oldItem.nodes[oldItem.nodes.length - 1];
            } else if (sameStructure) {
                // Same structure but no valuesRef - try updateTemplateValues
                const newValues = newChild._itemValues || [];
                const oldValues = oldChild._itemValues || [];
                const success = updateTemplateValues(
                    newChild,
                    newValues,
                    oldValues,
                    oldItem.nodes,
                    oldItem.effects,
                    component
                );
                if (!success) {
                    // Value update failed - need to reinstantiate this item
                    // Clean up old item
                    for (const node of oldItem.nodes) node.remove();
                    for (const eff of oldItem.effects) if (eff.dispose) eff.dispose();

                    // Create new item with reactive values
                    const valuesRef = reactive({ current: newValues });
                    const wrappedValues = newValues.map((_, index) => {
                        const getter = () => valuesRef.current[index];
                        getter[VALUE_GETTER] = true;
                        return getter;
                    });

                    const { fragment, effects: childEffects } = instantiateTemplate(
                        newChild,
                        wrappedValues,
                        component,
                        slotInSvg
                    );
                    const nodes = [...fragment.childNodes];
                    insertPoint.after(fragment);
                    if (nodes.length > 0) insertPoint = nodes[nodes.length - 1];

                    newItemMap.set(key, { nodes, effects: childEffects, compiled: newChild, valuesRef, slotInSvg });
                    allNodes.push(...nodes);
                    allEffects.push(...childEffects);
                } else {
                    // Keep old nodes
                    newItemMap.set(key, { nodes: oldItem.nodes, effects: oldItem.effects, compiled: newChild, slotInSvg: oldItem.slotInSvg });
                    allNodes.push(...oldItem.nodes);
                    allEffects.push(...oldItem.effects);
                    if (oldItem.nodes.length > 0) insertPoint = oldItem.nodes[oldItem.nodes.length - 1];
                }
            } else {
                // Structure changed - reinstantiate this item
                // Clean up old item
                for (const node of oldItem.nodes) node.remove();
                for (const eff of oldItem.effects) if (eff.dispose) eff.dispose();

                // Create new item with reactive values
                const newValues = newChild._itemValues || [];
                const valuesRef = reactive({ current: newValues });
                const wrappedValues = newValues.map((_, index) => {
                    const getter = () => valuesRef.current[index];
                    getter[VALUE_GETTER] = true;
                    return getter;
                });

                const { fragment, effects: childEffects } = instantiateTemplate(
                    newChild,
                    wrappedValues,
                    component,
                    slotInSvg
                );
                const nodes = [...fragment.childNodes];
                insertPoint.after(fragment);
                if (nodes.length > 0) insertPoint = nodes[nodes.length - 1];

                newItemMap.set(key, { nodes, effects: childEffects, compiled: newChild, valuesRef });
                allNodes.push(...nodes);
                allEffects.push(...childEffects);
            }
        }

        return { nodes: allNodes, effects: allEffects, itemMap: newItemMap };
    }

    // Keys changed - only do proper keyed reconciliation with explicit keys
    // Index-based keys don't represent item identity, so reordering would cause
    // incorrect DOM reuse (e.g., item at index 0 removed, item 1 becomes 0)
    if (!hasExplicitKeys) {
        // Return null to trigger full re-instantiation
        return null;
    }

    // Reuse DOM for items that exist in both old and new lists
    const newKeySet = new Set(newKeys);

    // Step 1: Remove items that are no longer present
    // (Their dispose() will clean up DOM thanks to our enhanced disposal)
    for (const [oldKey, oldItem] of oldItemMap) {
        if (!newKeySet.has(oldKey)) {
            // Item removed - dispose effects (which removes DOM)
            for (const eff of oldItem.effects) {
                if (eff.dispose) eff.dispose();
            }
            // Also remove nodes directly in case they weren't in effects
            for (const node of oldItem.nodes) {
                if (node.parentNode) node.remove();
            }
        }
    }

    // Step 2: Build new list, reusing existing items where possible
    let insertPoint = placeholder;

    for (let i = 0; i < newChildren.length; i++) {
        const newChild = newChildren[i];
        const key = newChild?.key;
        const existingItem = oldItemMap.get(key);

        if (existingItem) {
            // Reuse existing item - update values if needed
            if (existingItem.valuesRef) {
                const newValues = newChild._itemValues || [];
                existingItem.valuesRef.current = newValues;
            }

            // Move nodes to correct position if needed
            // Check if nodes are already in the right place
            const firstNode = existingItem.nodes[0];
            if (firstNode && firstNode.previousSibling !== insertPoint) {
                // Need to move - insert after current insertPoint
                for (const node of existingItem.nodes) {
                    insertPoint.after(node);
                    insertPoint = node;
                }
            } else {
                // Already in place, just update insertPoint
                if (existingItem.nodes.length > 0) {
                    insertPoint = existingItem.nodes[existingItem.nodes.length - 1];
                }
            }

            newItemMap.set(key, {
                nodes: existingItem.nodes,
                effects: existingItem.effects,
                compiled: newChild,
                valuesRef: existingItem.valuesRef,
                slotInSvg: existingItem.slotInSvg
            });
            allNodes.push(...existingItem.nodes);
            allEffects.push(...existingItem.effects);
        } else {
            // New item - create DOM
            const newValues = newChild._itemValues || [];
            const valuesRef = reactive({ current: newValues });
            const wrappedValues = newValues.map((_, index) => {
                const getter = () => valuesRef.current[index];
                getter[VALUE_GETTER] = true;
                return getter;
            });

            const { fragment, effects: childEffects } = instantiateTemplate(
                newChild,
                wrappedValues,
                component,
                slotInSvg
            );
            const nodes = [...fragment.childNodes];
            insertPoint.after(fragment);
            if (nodes.length > 0) {
                insertPoint = nodes[nodes.length - 1];
            }

            newItemMap.set(key, { nodes, effects: childEffects, compiled: newChild, valuesRef, slotInSvg });
            allNodes.push(...nodes);
            allEffects.push(...childEffects);
        }
    }

    // Sanity check: if we have children but no nodes were created, something went wrong
    if (newChildren.length > 0 && allNodes.length === 0) {
        console.warn('[Fine-grained] updateKeyedList: Expected', newChildren.length, 'items but created 0 nodes');
        return null;  // Force re-instantiation
    }

    return { nodes: allNodes, effects: allEffects, itemMap: newItemMap };
}

/**
 * Check if two compiled children have the same structure (ignoring key and values)
 */
function isSameStructure(a, b) {
    if (!a || !b) return a === b;
    // For each() items, compare the underlying structure
    // If both are elements with same tag and children structure, consider same
    if (a.op !== b.op) return false;
    if (a.tag !== b.tag) return false;
    // For fragments, check children count
    if (a.children?.length !== b.children?.length) return false;
    return true;
}

/**
 * Build initial item map when first instantiating an each() result
 */
function buildItemMapFromChildren(children, nodes, effects, component) {
    // This is complex because we need to map which DOM nodes belong to which child
    // For now, return null to fall back to non-keyed mode
    // The initial render will create currentItemMap correctly in the each() handler
    return null;
}

/**
 * Collect slot placeholder comments and their content nodes from DOM
 */
function collectSlotNodes(domNodes, slotMap) {
    for (const node of domNodes) {
        collectSlotNodesRecursive(node, slotMap);
    }
}

function collectSlotNodesRecursive(node, slotMap) {
    if (!node) return;

    // Don't recurse into custom elements - they have their own template slots
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName && node.tagName.includes('-')) {
        return;
    }

    // Recurse into children, but handle slots specially
    if (node.childNodes && node.childNodes.length > 0) {
        const children = Array.from(node.childNodes);
        let i = 0;
        while (i < children.length) {
            const child = children[i];

            // Check if this child is a slot placeholder comment
            if (child.nodeType === Node.COMMENT_NODE &&
                child.textContent &&
                child.textContent.startsWith('slot:')) {
                const slotIndex = parseInt(child.textContent.slice(5), 10);

                // Collect nodes that belong to this slot (between this comment and next slot comment)
                const contentNodes = [];
                let j = i + 1;
                while (j < children.length) {
                    const sibling = children[j];
                    // Stop at next slot comment
                    if (sibling.nodeType === Node.COMMENT_NODE &&
                        sibling.textContent &&
                        sibling.textContent.startsWith('slot:')) {
                        break;
                    }
                    contentNodes.push(sibling);
                    j++;
                }

                slotMap.set(slotIndex, { placeholder: child, nodes: contentNodes });

                // Skip past the slot content - DON'T recurse into it
                // It's managed by its own slot effect with its own updateTemplateValues
                i = j;
                continue;
            }

            // Regular node - recurse into it
            collectSlotNodesRecursive(child, slotMap);
            i++;
        }
    }
}

/**
 * Update custom element props when template values change but structure is same
 * This is a targeted update that avoids re-instantiation
 */
function updateCustomElementProps(compiled, newValues, oldValues, domNodes, component) {
    // Find custom elements in the compiled template and update their props
    updatePropsInNode(compiled, newValues, oldValues, domNodes, 0, component);
}

/**
 * Recursively find and update custom element props
 * Returns the next DOM node index to check
 */
function updatePropsInNode(node, newValues, oldValues, domNodes, nodeIndex, component) {
    if (!node) return nodeIndex;

    switch (node.op) {
        case OP.STATIC:
            // Static nodes produce one DOM node (text or pre-built element)
            return nodeIndex + 1;

        case OP.TEXT:
            // Text nodes produce one DOM node
            return nodeIndex + 1;

        case OP.SLOT:
            // Slots produce one or more nodes, but we can't know how many
            // For simplicity, assume slots produce one placeholder comment
            return nodeIndex + 1;

        case OP.ELEMENT:
            // Element node - check if custom element and update props
            if (node.isCustomElement) {
                const el = domNodes[nodeIndex];
                if (el && el.nodeType === Node.ELEMENT_NODE) {
                    // Update dynamic props that have changed
                    for (const { name, def } of node.dynamicProps || []) {
                        if (def.slot !== undefined) {
                            const newValue = newValues[def.slot];
                            const oldValue = oldValues[def.slot];
                            if (newValue !== oldValue) {
                                // Get actual value (handle VALUE_GETTER)
                                let value = newValue;
                                if (typeof value === 'function' && value[VALUE_GETTER]) {
                                    value = value();
                                }
                                // Apply the new value
                                applyAttribute(el, name, value, true);
                            }
                        }
                    }
                }
            }
            // Element produces one DOM node
            return nodeIndex + 1;

        case OP.FRAGMENT:
            // Fragment - recurse into children
            for (const child of node.children || []) {
                nodeIndex = updatePropsInNode(child, newValues, oldValues, domNodes, nodeIndex, component);
            }
            return nodeIndex;

        default:
            return nodeIndex;
    }
}

/**
 * Instantiate a single node (dispatcher)
 * @param {boolean} [inSvg=false] - Whether we're inside an SVG context
 */
function instantiateNode(node, values, component, parent, effects, inSvg = false) {
    if (!node) return;

    switch (node.op) {
        case OP.STATIC:
            instantiateStatic(node, parent, inSvg);
            break;
        case OP.SLOT:
            instantiateSlot(node, values, component, parent, effects, inSvg);
            break;
        case OP.TEXT:
            instantiateText(node, parent);
            break;
        case OP.ELEMENT:
            instantiateElement(node, values, component, parent, effects, inSvg);
            break;
        case OP.FRAGMENT:
            instantiateFragment(node, values, component, parent, effects, inSvg);
            break;
    }
}

/**
 * Instantiate a static node by cloning pre-built DOM.
 * Uses importNode to ensure the clone is in the current document context,
 * which is important for custom elements to use the correct registry.
 *
 * When in SVG context, static templates may need namespace correction since
 * they were compiled without knowing they'd be inside an SVG.
 */
function instantiateStatic(node, parent, inSvg = false) {
    if (node.template) {
        // Use importNode to clone the DOM into the current document.
        // This ensures custom elements are constructed using the current
        // document's CustomElementRegistry (important for cross-context cloning).
        const clone = document.importNode(node.template, true);

        // If we're in SVG context, check if the clone needs namespace correction
        if (inSvg && clone.nodeType === Node.ELEMENT_NODE) {
            const fixed = fixSvgNamespace(clone);
            parent.appendChild(fixed);
        } else {
            parent.appendChild(clone);
        }
    }
    // If template is null, nothing to render (empty result)
}

/**
 * Fix SVG namespace for an element and its children.
 * Used when static templates are instantiated inside SVG context.
 */
function fixSvgNamespace(element) {
    // If already in SVG namespace, no fix needed
    if (element.namespaceURI === RENDERER_SVG_NS) {
        return element;
    }

    // Recreate element with SVG namespace
    const fixed = document.createElementNS(RENDERER_SVG_NS, element.tagName.toLowerCase());

    // Copy attributes
    for (const attr of element.attributes) {
        fixed.setAttribute(attr.name, attr.value);
    }

    // Recursively fix children
    while (element.firstChild) {
        const child = element.firstChild;
        if (child.nodeType === Node.ELEMENT_NODE) {
            fixed.appendChild(fixSvgNamespace(child));
        } else {
            fixed.appendChild(child);
        }
    }

    return fixed;
}

/**
 * Instantiate a text node
 */
function instantiateText(node, parent) {
    if (node.value != null) {
        parent.appendChild(document.createTextNode(node.value));
    }
}

/**
 * Instantiate a dynamic slot (the core of fine-grained rendering)
 * @param {boolean} [inSvg=false] - Whether we're inside an SVG context
 */
function instantiateSlot(node, values, component, parent, effects, inSvg = false) {
    // Create a placeholder comment for this slot
    const placeholder = document.createComment('');
    parent.appendChild(placeholder);

    // Determine SVG context for child content:
    // - If parent already told us we're in SVG, use that
    // - Otherwise, check if the actual parent element (not fragment) is SVG
    const slotInSvg = inSvg || (parent.namespaceURI === RENDERER_SVG_NS);

    // Track current nodes for this slot (for cleanup/replacement)
    let currentNodes = [];
    let currentEffects = [];
    let previousValue = undefined;
    let initialized = false;
    // For each() results: track per-item DOM state for keyed diffing
    let currentItemMap = null;  // Map<key, { nodes: [], effects: [], compiled: obj }>
    // Reactive container for child template values - allows updates without reinstantiation
    let currentValuesRef = null;

    // memoEach slot-level caches - stable identity per DOM location
    // We keep two caches (previous + current) and rotate each render for automatic pruning
    let memoPrevCache = null;     // Map<key, { item, result }> from previous render
    let memoCurrCache = null;     // Map<key, { item, result }> for current render
    let memoPrevDeps = null;      // Previous deps array for cache invalidation

    // when() slot-level cache - caches by DOM position, not function reference
    let whenLastCondition = undefined;
    let whenLastResult = null;

    // contain() slot-level state - for DOM reuse across containEffect recreations
    let containPreviousCompiled = null;
    let containValuesRef = null;
    let containNodes = [];
    let containEffects = [];
    let containEffectRef = null;      // The active containEffect
    let containRenderFnRef = null;    // Mutable ref to current renderFn (updated on each render)

    const effect = createEffect(() => {
        // Get the value (may be a function for reactive access)
        let value = values[node.index];
        // Only call if marked as a value getter (not an actual function value)
        if (typeof value === 'function' && value[VALUE_GETTER]) {
            value = value();
        }

        // Skip re-render if value is the same
        // For html templates, compare _compiled reference (the actual template structure)
        // This preserves child component state when slot content structure doesn't change
        if (initialized) {
            if (value === previousValue) {
                return;
            }
            // For html templates, check if _compiled is the same - the child effects
            // will handle updating any changed values within
            if (isHtml(value) && isHtml(previousValue) &&
                value._compiled === previousValue._compiled) {
                // Same template structure - update values reactively without re-instantiating
                // This preserves DOM state (focus, scroll position, input values, etc.)
                const newValues = value._values || [];

                // Update the reactive values container - child effects will re-run automatically
                if (currentValuesRef) {
                    currentValuesRef.current = newValues;
                    previousValue = value;
                    return;
                }
                // Fall through to re-instantiation if no valuesRef (shouldn't happen)
            }

            // For contain() boundaries, we always recreate the containEffect (cheap)
            // but reuse DOM when the compiled template structure matches.
            // State is maintained at the slot level, not inside the containEffect.
            // This removes the fragile toString() comparison for call-site identity.

            // For each() fragments, do smart keyed diffing
            // This preserves DOM for items that haven't changed structure
            // For index-based keys (no keyFn), only safe when keys are identical
            // updateKeyedList handles this: identical keys -> update in place,
            // changed keys + no explicit keys -> returns null to force re-instantiation
            const isFromEach = isHtml(value) && value._compiled?.fromEach;
            const wasFromEach = isHtml(previousValue) && previousValue._compiled?.fromEach;

            if (isFromEach && wasFromEach && currentItemMap) {
                const result = updateKeyedList(
                    value._compiled.children || [],
                    previousValue._compiled.children || [],
                    currentItemMap,
                    placeholder,
                    component,
                    slotInSvg,
                    value._compiled?.hasExplicitKeys  // Pass flag for handling key changes
                );
                if (result) {
                    currentNodes = result.nodes;
                    currentEffects = result.effects;
                    currentItemMap = result.itemMap;
                    previousValue = value;
                    return;
                }
                // Fall through to full re-instantiation if keyed update failed
            }
        }
        previousValue = value;
        initialized = true;

        // Clean up old nodes and their effects
        for (const oldNode of currentNodes) {
            oldNode.remove();
        }
        for (const oldEffect of currentEffects) {
            if (oldEffect.dispose) oldEffect.dispose();
        }
        currentNodes = [];
        currentEffects = [];
        currentItemMap = null;  // Reset keyed item tracking

        // Helper to clean up contain state when transitioning away
        const cleanupContain = () => {
            if (containEffectRef) {
                containEffectRef.dispose();
                for (const oldNode of containNodes) oldNode.remove();
                for (const oldEffect of containEffects) if (oldEffect.dispose) oldEffect.dispose();
                containNodes = [];
                containEffects = [];
                containPreviousCompiled = null;
                containValuesRef = null;
                containEffectRef = null;
                containRenderFnRef = null;
            }
        };

        // Handle different value types
        if (value == null || value === false) {
            cleanupContain();  // Clean up contain if we had one
            return;
        }

        // Handle when() - DOM-position-based caching
        // This fixes the bug where same function used in multiple when() calls shares cache
        if (isWhen(value)) {
            const { _condition, _thenValue, _elseValue } = value;

            // Check if condition changed (cache hit if same)
            if (whenLastCondition === _condition && whenLastResult) {
                value = whenLastResult;
            } else {
                // Evaluate the appropriate branch
                whenLastCondition = _condition;
                let result = _condition ? _thenValue : _elseValue;
                if (typeof result === 'function') {
                    setRenderContext(component);
                    result = result();
                    setRenderContext(null);
                }
                whenLastResult = result;
                value = result;
            }

            // If result is null/empty, clean up and return
            if (!value) {
                cleanupContain();
                return;
            }

            // Fall through to normal html/primitive handling
        }

        // Handle contain() - isolated reactive boundary
        // Creates its own effect that only tracks dependencies from its render function
        // State is maintained at slot level to enable DOM reuse across containEffect recreations
        if (isContain(value) && value._renderFn) {
            // If we already have a containEffect, just update the renderFn ref
            // The arrow function is recreated each parent render, but we reuse the containEffect
            // and let it call the updated renderFn via the mutable ref
            if (containEffectRef) {
                containRenderFnRef = value._renderFn;
                return;
            }

            // Store the initial renderFn - will be updated via containRenderFnRef on parent re-renders
            containRenderFnRef = value._renderFn;

            // Create an isolated effect for this boundary
            const newContainEffect = createEffect(() => {
                // Evaluate the render function in this isolated effect
                // Use containRenderFnRef to get the current renderFn (may be updated by parent)
                // This creates the dependency tracking for just this boundary
                setRenderContext(component);
                const result = containRenderFnRef();
                setRenderContext(null);

                if (!result || !isHtml(result) || !result._compiled) {
                    // Clean up if result is null/empty
                    for (const oldNode of containNodes) {
                        oldNode.remove();
                    }
                    for (const oldEffect of containEffects) {
                        if (oldEffect.dispose) oldEffect.dispose();
                    }
                    containNodes = [];
                    containEffects = [];
                    containPreviousCompiled = null;
                    containValuesRef = null;
                    return;
                }

                const rawValues = result._values || [];

                // Check if template structure is the same - can reuse DOM
                // Uses slot-level state so this works across containEffect recreations
                if (containPreviousCompiled === result._compiled && containValuesRef) {
                    // Same template structure - just update values reactively
                    // Child effects will re-run automatically
                    containValuesRef.current = rawValues;
                    return;
                }

                // Different template structure - need to reinstantiate
                // Clean up old nodes first
                for (const oldNode of containNodes) {
                    oldNode.remove();
                }
                for (const oldEffect of containEffects) {
                    if (oldEffect.dispose) oldEffect.dispose();
                }

                // Create reactive container for values
                containValuesRef = reactive({ current: rawValues });

                // Wrap values in getters that read from reactive container
                const wrappedValues = rawValues.map((_, index) => {
                    const getter = () => containValuesRef.current[index];
                    getter[VALUE_GETTER] = true;
                    return getter;
                });

                const { fragment, effects: childEffects } = instantiateTemplate(
                    result._compiled,
                    wrappedValues,
                    component,
                    slotInSvg
                );
                const nodes = [...fragment.childNodes];
                insertWithoutParentTracking(placeholder, fragment);
                containNodes = nodes;
                containEffects = childEffects;
                containPreviousCompiled = result._compiled;
            });

            // Track this containEffect (renderFn already stored above)
            containEffectRef = newContainEffect;

            // Add the contain effect to our effects list for cleanup
            effects.push(newContainEffect);
            return;
        }

        // Clean up contain if we're switching to a different value type
        cleanupContain();

        // Handle memoEach() - memoized list rendering with slot-level cache
        // The cache is stored at the slot level (DOM location) for stable identity
        if (isMemoEach(value)) {
            const { _array: array, _mapFn: mapFn, _keyFn: keyFn, _explicitCache: explicitCache, _trustKey: trustKey, _deps: deps } = value;

            // For explicit cache (backward compatibility), use it directly
            // Otherwise use slot-level two-cache rotation for automatic pruning
            const useExplicitCache = explicitCache instanceof Map ? explicitCache :
                                     explicitCache?.itemCache ? explicitCache.itemCache : null;

            // Check if deps changed - if so, bust all caches
            let depsChanged = false;
            if (deps) {
                if (!memoPrevDeps || memoPrevDeps.length !== deps.length) {
                    depsChanged = true;
                } else {
                    for (let i = 0; i < deps.length; i++) {
                        if (deps[i] !== memoPrevDeps[i]) {
                            depsChanged = true;
                            break;
                        }
                    }
                }
                if (depsChanged) {
                    // Clear caches when deps change
                    memoPrevCache = null;
                    memoCurrCache = null;
                    if (useExplicitCache) {
                        useExplicitCache.clear();
                    }
                }
                memoPrevDeps = deps;
            }

            // Create new current cache for this render
            // We rotate: previous becomes garbage, current becomes previous
            const newCurrCache = new Map();

            // Iterate array and apply memoization
            const results = array.map((item, index) => {
                const key = keyFn(item, index);

                // Check both previous and current cache for hits
                // (current may have duplicates if same key appears twice in array)
                // When trustKey is true, skip item reference check - useful for virtual scroll
                // where items are sliced from arrays and positions change
                const cachedCurr = newCurrCache.get(key);
                if (cachedCurr && (trustKey || cachedCurr.item === item)) {
                    return cachedCurr.result;
                }

                // Check previous render's cache
                const cachedPrev = useExplicitCache ? useExplicitCache.get(key) :
                                   (memoPrevCache?.get(key) || memoCurrCache?.get(key));
                if (cachedPrev && (trustKey || cachedPrev.item === item)) {
                    // Copy to current cache and return
                    newCurrCache.set(key, cachedPrev);
                    if (useExplicitCache) {
                        useExplicitCache.set(key, cachedPrev);
                    }
                    return cachedPrev.result;
                }

                // Cache miss - render and cache
                setRenderContext(component);
                const result = mapFn(item, index);
                setRenderContext(null);

                // Add key to the compiled result
                if (result && result._compiled) {
                    const keyedResult = {
                        ...result,
                        _compiled: {
                            ...result._compiled,
                            key: key
                        }
                    };
                    const cacheEntry = { item, result: keyedResult };
                    newCurrCache.set(key, cacheEntry);
                    if (useExplicitCache) {
                        useExplicitCache.set(key, cacheEntry);
                    }
                    return keyedResult;
                }

                const cacheEntry = { item, result };
                newCurrCache.set(key, cacheEntry);
                if (useExplicitCache) {
                    useExplicitCache.set(key, cacheEntry);
                }
                return result;
            });

            // Rotate caches: previous = current, current = new
            // Old previous cache is garbage collected (automatic pruning!)
            memoPrevCache = memoCurrCache;
            memoCurrCache = newCurrCache;

            // Build each()-like fragment structure for the keyed list handling
            const compiledChildren = results
                .map((r, itemIndex) => {
                    if (!r || !r._compiled) return null;

                    const child = r._compiled;
                    const childValues = r._values;

                    if (child.type === 'text' && child.value && /^\s*$/.test(child.value)) {
                        return null;
                    }

                    if (child.type === 'fragment' && !child.wrapped && child.children.length === 1 && child.children[0].type === 'element') {
                        const element = child.children[0];
                        const key = keyFn(array[itemIndex], itemIndex);
                        return {...element, key, _itemValues: childValues};
                    }

                    const key = keyFn(array[itemIndex], itemIndex);
                    return {...child, key, _itemValues: childValues};
                })
                .filter(Boolean);

            // Convert to html-like object so it falls through to the each() fragment handling
            value = {
                _compiled: {
                    fromEach: true,
                    hasExplicitKeys: true,
                    children: compiledChildren
                }
            };
            // Fall through to html() handling which will process the each() fragment
        }

        // Handle html() template result
        if (isHtml(value) || value?._compiled?.fromEach) {
            if (!value._compiled) return;

            // Check if this is an each() fragment with keyed children
            if (value._compiled.fromEach && value._compiled.children?.length > 0) {
                // Build item map for keyed diffing on subsequent updates
                currentItemMap = new Map();
                let insertPoint = placeholder;

                for (const child of value._compiled.children) {
                    const key = child.key;
                    const rawValues = child._itemValues || [];

                    // Create reactive container for this item's values
                    const valuesRef = reactive({ current: rawValues });

                    // Wrap values in getters that read from reactive container
                    const wrappedValues = rawValues.map((_, index) => {
                        const getter = () => valuesRef.current[index];
                        getter[VALUE_GETTER] = true;
                        return getter;
                    });

                    const { fragment, effects: childEffects } = instantiateTemplate(
                        child,
                        wrappedValues,
                        component,
                        slotInSvg
                    );
                    const nodes = [...fragment.childNodes];
                    insertWithoutParentTracking(insertPoint, fragment);
                    if (nodes.length > 0) {
                        insertPoint = nodes[nodes.length - 1];
                    }
                    currentItemMap.set(key, { nodes, effects: childEffects, compiled: child, valuesRef, slotInSvg });
                    currentNodes.push(...nodes);
                    currentEffects.push(...childEffects);
                }
                return;
            }

            // Regular html() template (non-each)
            // Create reactive container for values - allows updates without reinstantiation
            const rawValues = value._values || [];
            currentValuesRef = reactive({ current: rawValues });

            // Wrap values in getters that read from reactive container
            // This ensures child effects re-run when values change
            const wrappedValues = rawValues.map((_, index) => {
                const getter = () => currentValuesRef.current[index];
                getter[VALUE_GETTER] = true;
                return getter;
            });

            const { fragment, effects: childEffects } = instantiateTemplate(
                value._compiled,
                wrappedValues,
                component,
                slotInSvg
            );
            currentEffects = childEffects;
            const nodes = [...fragment.childNodes];
            // Pause tracking during DOM insertion to isolate child component effects
            insertWithoutParentTracking(placeholder, fragment);
            currentNodes = nodes;
            return;
        }

        // Handle raw() HTML
        if (isRaw(value)) {
            const span = document.createElement('span');
            span.innerHTML = value.toString();
            insertWithoutParentTracking(placeholder, span);
            currentNodes = [span];
            return;
        }

        // Handle deferred child (from children/slots system)
        if (isDeferredChild(value)) {
            const { compiled, values: childValues, parentComponent } = value;
            const { fragment, effects: childEffects } = instantiateTemplate(
                compiled,
                childValues,
                parentComponent,  // Use PARENT's component for reactive context
                slotInSvg
            );
            currentEffects = childEffects;
            const nodes = [...fragment.childNodes];
            // Pause tracking during DOM insertion to isolate child component effects
            insertWithoutParentTracking(placeholder, fragment);
            currentNodes = nodes;
            return;
        }

        // Handle DOM Node directly
        if (value instanceof Node) {
            insertWithoutParentTracking(placeholder, value);
            currentNodes = [value];
            return;
        }

        // Handle arrays (e.g., this.props.children or each() results)
        if (Array.isArray(value)) {
            let insertPoint = placeholder;
            for (const item of value) {
                if (item == null || item === false) continue;

                // Handle DOM Node in array
                if (item instanceof Node) {
                    insertWithoutParentTracking(insertPoint, item);
                    insertPoint = item;
                    currentNodes.push(item);
                    continue;
                }

                if (isDeferredChild(item)) {
                    const { compiled, values: childValues, parentComponent } = item;
                    const { fragment, effects: childEffects } = instantiateTemplate(
                        compiled,
                        childValues,
                        parentComponent,
                        slotInSvg
                    );
                    currentEffects.push(...childEffects);
                    const nodes = [...fragment.childNodes];
                    insertWithoutParentTracking(insertPoint, fragment);
                    if (nodes.length > 0) {
                        insertPoint = nodes[nodes.length - 1];
                    }
                    currentNodes.push(...nodes);
                } else if (isHtml(item)) {
                    if (!item._compiled) continue;
                    const { fragment, effects: childEffects } = instantiateTemplate(
                        item._compiled,
                        item._values || [],
                        component,
                        slotInSvg
                    );
                    currentEffects.push(...childEffects);
                    const nodes = [...fragment.childNodes];
                    insertWithoutParentTracking(insertPoint, fragment);
                    if (nodes.length > 0) {
                        insertPoint = nodes[nodes.length - 1];
                    }
                    currentNodes.push(...nodes);
                } else if (item != null) {
                    const textNode = document.createTextNode(String(item));
                    insertPoint.after(textNode);  // Text nodes don't need paused tracking
                    insertPoint = textNode;
                    currentNodes.push(textNode);
                }
            }
            return;
        }

        // Primitive value - create text node
        // Safe: textContent can never be parsed as HTML
        const textNode = document.createTextNode(String(value));
        placeholder.after(textNode);  // Text nodes don't need paused tracking
        currentNodes = [textNode];
    });

    // Wrap the effect to clean up DOM when disposed
    // This is critical: when a parent slot disposes child effects,
    // we must also clean up the DOM nodes those child effects created
    const originalDispose = effect.dispose;
    effect.dispose = () => {
        // Clean up DOM nodes created by this slot
        for (const node of currentNodes) {
            node.remove();
        }
        // Dispose nested effects (which will recursively clean their DOM)
        for (const childEffect of currentEffects) {
            if (childEffect.dispose) childEffect.dispose();
        }
        // Also remove the placeholder comment
        placeholder.remove();
        // Clear references
        currentNodes = [];
        currentEffects = [];
        currentItemMap = null;
        // Call original dispose to clear reactive tracking
        originalDispose();
    };

    effects.push(effect);
}

/** SVG namespace URI (prefixed to avoid bundler conflicts with template-compiler) */
const RENDERER_SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Instantiate an element
 * @param {boolean} [inheritedSvg=false] - Whether we're inside an SVG context (passed from parent)
 */
function instantiateElement(node, values, component, parent, effects, inheritedSvg = false) {
    const tag = node.tag;
    // Check if we're creating an SVG element or are inside SVG context
    // Use inheritedSvg when parent is a DocumentFragment (no namespaceURI)
    const inSvg = tag === 'svg' || inheritedSvg || (parent && parent.namespaceURI === RENDERER_SVG_NS);
    const el = inSvg
        ? document.createElementNS(RENDERER_SVG_NS, tag)
        : document.createElement(tag);
    const isCustomElement = node.isCustomElement;

    // Apply static props - always apply directly since this is initial instantiation
    // (Deferring would cause FOUC as element appears without attributes)
    if (node.staticProps) {
        for (const [name, value] of Object.entries(node.staticProps)) {
            applyAttributeDirect(el, name, value, isCustomElement);
        }
    }

    // Apply dynamic props (create effects)
    for (const { name, def } of node.dynamicProps || []) {
        // Handle ref separately
        if (def.refName !== undefined) {
            if (component && component.refs) {
                component.refs[def.refName] = el;
                effects.push({
                    dispose() {
                        if (component.refs[def.refName] === el) {
                            delete component.refs[def.refName];
                        }
                    }
                });
            }
            continue;
        }

        // Create effect for dynamic prop
        // First run applies directly (no deferring) to avoid FOUC
        // Subsequent runs defer to batch DOM updates
        let isFirstRun = true;
        const effect = createEffect(() => {
            const value = resolveDynamicProp(name, def, values, component, isCustomElement);
            if (isFirstRun) {
                isFirstRun = false;
                applyAttributeDirect(el, name, value, isCustomElement);
            } else {
                applyAttribute(el, name, value, isCustomElement);
            }
        });
        effects.push(effect);
    }

    // Apply events
    for (const { name, def } of node.events || []) {
        const handler = resolveEventHandler(name, def, values, component, isCustomElement);
        if (handler) {
            // Handle special events
            if (name === 'clickoutside' || name === 'click-outside') {
                setupClickOutside(el, handler, false, effects);
            } else if (name === 'clickoutside-stop' || name === 'click-outside-stop') {
                setupClickOutside(el, handler, true, effects);
            } else {
                el.addEventListener(name, handler);
                effects.push({
                    dispose() {
                        el.removeEventListener(name, handler);
                    }
                });
            }
        }
    }

    // Handle children
    if (isCustomElement && node.children && node.children.length > 0) {
        // For custom elements, create deferred child descriptors
        const deferredChildren = [];
        const namedSlots = {};

        for (const child of node.children) {
            const childValues = child._itemValues !== undefined ? child._itemValues : values;
            const slotName = getSlotName(child);

            const deferred = createDeferredChild(
                child,
                childValues,
                component  // Parent component for context
            );

            if (slotName) {
                deferred.slotName = slotName;
                if (!namedSlots[slotName]) {
                    namedSlots[slotName] = [];
                }
                namedSlots[slotName].push(deferred);
            } else {
                deferredChildren.push(deferred);
            }
        }

        // Set on element for custom element to pick up
        el._vdxChildren = deferredChildren;
        el._vdxSlots = Object.keys(namedSlots).length > 0 ? namedSlots : {};
    } else {
        // Regular element - instantiate children directly
        // Pass SVG context so children know to use SVG namespace
        for (const child of node.children || []) {
            const childValues = child._itemValues !== undefined ? child._itemValues : values;
            instantiateNode(child, childValues, component, el, effects, inSvg);
        }
    }

    // For custom elements, detach from parent effect context during mount to prevent
    // child component state from becoming dependencies of parent effects
    if (isCustomElement) {
        withoutTracking(() => {
            parent.appendChild(el);
        });
    } else {
        parent.appendChild(el);
    }
}

/**
 * Instantiate a fragment
 * @param {boolean} [inSvg=false] - Whether we're inside an SVG context
 */
function instantiateFragment(node, values, component, parent, effects, inSvg = false) {
    for (const child of node.children || []) {
        const childValues = child._itemValues !== undefined ? child._itemValues : values;
        instantiateNode(child, childValues, component, parent, effects, inSvg);
    }
}

/**
 * Apply an attribute/property to an element directly (no queueing).
 * Called during initial render or when committing deferred updates.
 */
function applyAttributeDirect(el, name, value, isCustomElement) {
    // ARIA attributes require explicit "true"/"false" strings, don't remove on false
    if (name.startsWith('aria-')) {
        if (value == null) {
            el.removeAttribute(name);
        } else {
            el.setAttribute(name, String(value));
        }
        return;
    }

    if (value == null || value === false) {
        el.removeAttribute(name);
        if (BOOLEAN_ATTRS.has(name)) {
            el[name] = false;
        }
        // For custom elements, always call the prop setter even for false/null
        // This triggers scheduleRender for fine-grained mode
        if (isCustomElement && name in el) {
            el[name] = value;
        }
        return;
    }

    if (name === 'class' || name === 'className') {
        el.className = value;
    } else if (name === 'style') {
        if (typeof value === 'object') {
            Object.assign(el.style, value);
        } else {
            el.style.cssText = value;
        }
    } else if (name === 'value' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
        // Only update if different (preserve cursor position)
        if (el.value !== String(value)) {
            el.value = value;
        }
    } else if (name === 'checked') {
        el.checked = !!value;
    } else if (BOOLEAN_ATTRS.has(name)) {
        const boolVal = !!value;
        el[name] = boolVal;
        // For custom elements, just set the property - don't use setAttribute('')
        // which would make getAttribute() return "" instead of the boolean value
        if (!isCustomElement) {
            if (boolVal) {
                el.setAttribute(name, '');
            } else {
                el.removeAttribute(name);
            }
        }
    } else if (isCustomElement && (typeof value === 'object' || typeof value === 'function')) {
        // Pass objects/functions as properties to custom elements
        el[name] = value;
    } else if (name.startsWith('data-')) {
        el.setAttribute(name, value === true ? '' : String(value));
    } else if (name in el && !name.includes('-')) {
        // Set as property if it exists
        try {
            el[name] = value;
        } catch {
            el.setAttribute(name, String(value));
        }
    } else {
        el.setAttribute(name, value === true ? '' : String(value));
    }
}

/**
 * Resolve a dynamic prop value
 */
function resolveDynamicProp(name, def, values, component, isCustomElement) {
    // x-model binding - read from component state
    if (def.xModel !== undefined) {
        if (component && component.state) {
            const value = getNestedValue(component.state, def.xModel);

            if (def.context === 'x-model-checked') {
                return !!value;
            } else if (def.context === 'x-model-radio') {
                return value === def.radioValue;
            }
            return value;
        }
        return (def.context === 'x-model-checked' || def.context === 'x-model-radio') ? false : '';
    }

    // Slot-based value
    if (def.slot !== undefined || def.slots !== undefined) {
        let value;

        if (def.slots) {
            // Multiple slots: interpolate template
            value = def.template;
            for (const slotIndex of def.slots) {
                const marker = `\x00${slotIndex}\x00`;
                let slotValue = values[slotIndex];
                // Only call if marked as a value getter (not an actual function value)
                if (typeof slotValue === 'function' && slotValue[VALUE_GETTER]) slotValue = slotValue();
                value = value.replace(marker, String(slotValue ?? ''));
            }
        } else {
            value = values[def.slot];
            // Only call if marked as a value getter (not an actual function value)
            if (typeof value === 'function' && value[VALUE_GETTER]) value = value();
            if (def.template) {
                const marker = `\x00${def.slot}\x00`;
                value = def.template.replace(marker, String(value ?? ''));
            }
        }

        // Context-specific handling
        if (def.context === 'url') {
            return sanitizeUrl(value) || '';
        }

        return value;
    }

    return def.value;
}

/**
 * Resolve an event handler
 */
function resolveEventHandler(eventName, def, values, component, isCustomElement) {
    let handler = null;

    if (def.xModel !== undefined) {
        // x-model binding: create state update handler
        const propName = def.xModel;
        handler = (e) => {
            if (component && component.state) {
                let value;

                if (def.customElement) {
                    value = (e.detail && e.detail.value !== undefined) ? e.detail.value : e.detail;
                } else {
                    const target = e.target;

                    if (target.type === 'checkbox') {
                        value = target.checked;
                    } else if (target.type === 'radio') {
                        if (target.checked) {
                            value = target.value;
                        } else {
                            return;
                        }
                    } else if (target.type === 'number' || target.type === 'range') {
                        value = target.valueAsNumber;
                        if (isNaN(value)) value = target.value;
                    } else if (target.type === 'file') {
                        value = target.files;
                    } else {
                        value = target.value;
                    }
                }

                setNestedValue(component.state, propName, value);
            }
        };
    } else if (def.slot !== undefined) {
        handler = values[def.slot];
        // Handle VALUE_GETTER wrapper (fine-grained mode)
        // Create a wrapper that calls the getter fresh each time to get current closure
        if (typeof handler === 'function' && handler[VALUE_GETTER]) {
            const getter = handler;
            handler = (e) => {
                const actualHandler = getter();
                if (typeof actualHandler === 'function') {
                    return actualHandler(e);
                }
            };
        }
        // Handle string method references
        if (typeof handler === 'string' && component && component[handler]) {
            handler = component[handler].bind(component);
        }
    } else if (def.handler && typeof def.handler === 'function') {
        handler = def.handler;
    } else if (def.method && component && component[def.method]) {
        handler = component[def.method].bind(component);
    }

    if (handler && typeof handler === 'function') {
        // Apply modifiers
        if (def.modifier === 'prevent') {
            const orig = handler;
            handler = (e) => { e.preventDefault(); return orig(e); };
        }
        if (def.modifier === 'stop') {
            const orig = handler;
            handler = (e) => { e.stopPropagation(); return orig(e); };
        }

        // Chain with existing handler if needed (e.g., x-model + on-input)
        if (def._chainWith) {
            const firstHandler = resolveEventHandler(eventName, def._chainWith, values, component, isCustomElement);
            if (firstHandler) {
                const secondHandler = handler;
                handler = (e) => { firstHandler(e); secondHandler(e); };
            }
        }

        // Wrap for custom elements to extract e.detail.value
        if (isCustomElement && !def.xModel) {
            const orig = handler;
            handler = (e) => {
                const value = (e.detail && e.detail.value !== undefined) ? e.detail.value : e.detail;
                return orig(e, value);
            };
        }
    }

    return handler;
}

/**
 * Setup click-outside handling
 */
function setupClickOutside(el, handler, stopPropagation, effects) {
    const documentHandler = (e) => {
        if (el.isConnected && !el.contains(e.target)) {
            if (stopPropagation) {
                e.stopPropagation();
            }
            handler(e);
        }
    };

    // Delay to avoid triggering on the opening click
    const timerId = requestAnimationFrame(() => {
        if (el.isConnected) {
            document.addEventListener('click', documentHandler, true);
        }
    });

    effects.push({
        dispose() {
            cancelAnimationFrame(timerId);
            document.removeEventListener('click', documentHandler, true);
        }
    });
}

/**
 * Get slot name from a child node
 */
function getSlotName(node) {
    if (!node.staticProps) return null;
    return node.staticProps.slot || null;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
    if (!path || !obj) return undefined;
    if (hasDangerousKey(path)) return undefined;

    if (!path.includes('.')) return obj[path];

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
    if (!path || !obj) return;
    if (hasDangerousKey(path)) {
        console.warn(`[VDX Security] Blocked attempt to set dangerous property path: ${path}`);
        return;
    }

    if (!path.includes('.')) {
        obj[path] = value;
        return;
    }

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
 * Check for dangerous prototype pollution keys
 */
function hasDangerousKey(path) {
    if (!path) return false;
    const parts = path.includes('.') ? path.split('.') : [path];
    return parts.some(part => DANGEROUS_KEYS.has(part));
}

// Export for testing
export {
    instantiateNode,
    instantiateSlot,
    instantiateElement,
    getNestedValue,
    setNestedValue
};

// Register DOM update hooks with reactivity system
// This enables batched DOM updates: effects queue changes, commit applies them all at once
registerEffectFlushHooks(beginDeferredUpdates, commitDeferredUpdates);
