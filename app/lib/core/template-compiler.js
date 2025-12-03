/**
 * Template Compiler - Optimized Op-Based Architecture
 *
 * Key optimizations:
 * 1. Static subtrees are pre-built as VNodes at compile time
 * 2. Flat op-based structure minimizes runtime branching
 * 3. applyValues is a simple interpreter that just executes ops
 *
 * @module core/template-compiler
 */

import { sanitizeUrl, isHtml, isRaw, OP } from './template.js';
import { h, Fragment } from '../vendor/preact/index.js';
import { componentDefinitions } from './component.js';

// Boolean attributes that should be converted to actual booleans
const BOOLEAN_ATTRS = new Set([
    'disabled', 'checked', 'selected', 'readonly', 'required',
    'multiple', 'autofocus', 'autoplay', 'controls', 'loop',
    'muted', 'open', 'reversed', 'hidden', 'async', 'defer'
]);

/**
 * Get a nested value from an object using a dot-separated path
 */
function getNestedValue(obj, path) {
    if (!path || !obj) return undefined;
    if (!path.includes('.')) return obj[path];

    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        current = current[part];
    }
    return current;
}

/**
 * Set a nested value in an object using a dot-separated path
 */
function setNestedValue(obj, path, value) {
    if (!path || !obj) return;
    if (!path.includes('.')) {
        obj[path] = value;
        return;
    }

    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined || current[part] === null) {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}

/**
 * Template cache - keyed by statics array reference (HTM-style O(1) lookup)
 * @type {Map<TemplateStringsArray, Object>}
 */
const templateCache = new Map();

/** Maximum template cache size before cleanup */
const MAX_CACHE_SIZE = 500;

/** Track cache access times for LRU eviction */
const cacheAccessTimes = new Map();

/**
 * Compile a template string into an optimized op-based structure
 * @param {TemplateStringsArray} strings - Template literal string parts
 * @returns {Object} Compiled template with ops and pre-built statics
 */
export function compileTemplate(strings) {
    // HTM-style cache lookup using array reference
    if (templateCache.has(strings)) {
        cacheAccessTimes.set(strings, Date.now());
        return templateCache.get(strings);
    }

    // Build full template string with slot markers
    let fullTemplate = '';
    for (let i = 0; i < strings.length; i++) {
        fullTemplate += strings[i];
        if (i < strings.length - 1) {
            fullTemplate += `__SLOT_${i}__`;
        }
    }

    // Parse and build op-based structure
    const parsed = parseXMLToTree(fullTemplate);
    const compiled = buildOpTree(parsed);

    // Cache the compiled template
    templateCache.set(strings, compiled);
    cacheAccessTimes.set(strings, Date.now());

    // Trigger cleanup if cache is getting too large
    if (templateCache.size > MAX_CACHE_SIZE) {
        cleanupTemplateCache();
    }

    return compiled;
}

/**
 * Clean up least recently used templates
 */
function cleanupTemplateCache() {
    const entries = Array.from(cacheAccessTimes.entries())
        .sort((a, b) => a[1] - b[1]);

    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
        const [staticsArray] = entries[i];
        templateCache.delete(staticsArray);
        cacheAccessTimes.delete(staticsArray);
    }
}

/**
 * Build optimized op tree from parsed structure
 * Pre-builds static VNodes and creates flat op structure
 */
function buildOpTree(node) {
    if (!node) return null;

    // Check if entire subtree is static (no dynamic slots)
    if (isFullyStatic(node)) {
        // Pre-build the VNode at compile time!
        const staticVNode = buildStaticVNode(node);
        return {
            op: OP.STATIC,
            vnode: staticVNode,
            // Keep type info for compatibility with existing code (e.g., each() checks child.children)
            type: 'fragment',
            children: [],  // Required for compatibility with each() helper
            isStatic: true
        };
    }

    if (node.type === 'text') {
        if (node.slot !== undefined) {
            return {
                op: OP.SLOT,
                index: node.slot,
                context: node.context || 'content',
                type: 'text'
            };
        }
        return {
            op: OP.TEXT,
            value: node.value,
            type: 'text',
            isStatic: true
        };
    }

    if (node.type === 'fragment') {
        const children = (node.children || [])
            .map(child => buildOpTree(child))
            .filter(Boolean);

        return {
            op: OP.FRAGMENT,
            children,
            wrapped: node.wrapped,
            fromEach: node.fromEach,
            key: node.key,
            type: 'fragment',
            isStatic: children.every(c => c.isStatic)
        };
    }

    if (node.type === 'element') {
        const isCustomElement = componentDefinitions.has(node.tag);

        // Separate static props from dynamic props
        const staticProps = {};
        const dynamicProps = [];

        for (const [name, attrDef] of Object.entries(node.attrs || {})) {
            if (attrDef.value !== undefined && attrDef.slot === undefined &&
                attrDef.slots === undefined && attrDef.xModel === undefined &&
                attrDef.refName === undefined) {
                // Fully static prop
                staticProps[name] = attrDef.value;
            } else {
                // Dynamic prop - needs runtime resolution
                dynamicProps.push({ name, def: attrDef });
            }
        }

        // Pre-process events
        const events = [];
        for (const [eventName, eventDef] of Object.entries(node.events || {})) {
            events.push({ name: eventName, def: eventDef });
        }

        // Build children ops
        const children = (node.children || [])
            .map(child => buildOpTree(child))
            .filter(Boolean);

        return {
            op: OP.ELEMENT,
            tag: node.tag,
            staticProps,
            dynamicProps,
            events,
            children,
            isCustomElement,
            key: node.key,
            type: 'element',
            isStatic: dynamicProps.length === 0 && events.length === 0 &&
                      children.every(c => c.isStatic)
        };
    }

    return null;
}

/**
 * Check if a node subtree is fully static (no dynamic slots)
 */
function isFullyStatic(node) {
    if (!node) return true;

    if (node.type === 'text') {
        return node.slot === undefined;
    }

    if (node.type === 'fragment') {
        return (node.children || []).every(isFullyStatic);
    }

    if (node.type === 'element') {
        // Custom elements are never static - they need special children handling (_vdxChildren)
        if (componentDefinitions.has(node.tag)) {
            return false;
        }

        // Check attrs for any dynamic content
        for (const attrDef of Object.values(node.attrs || {})) {
            if (attrDef.slot !== undefined || attrDef.slots !== undefined ||
                attrDef.xModel !== undefined || attrDef.refName !== undefined) {
                return false;
            }
        }

        // Check events - any event makes it non-static (needs component context)
        if (Object.keys(node.events || {}).length > 0) {
            return false;
        }

        // Check children
        return (node.children || []).every(isFullyStatic);
    }

    return true;
}

/**
 * Build a static VNode at compile time (no dynamic values)
 */
function buildStaticVNode(node) {
    if (!node) return null;

    if (node.type === 'text') {
        return node.value || '';
    }

    if (node.type === 'fragment') {
        const children = (node.children || [])
            .map(child => buildStaticVNode(child))
            .filter(child => child !== null && child !== undefined);

        if (children.length === 0) return null;
        if (children.length === 1) return children[0];

        return h(Fragment, null, ...children);
    }

    if (node.type === 'element') {
        const props = {};

        // Convert static attrs to props
        for (const [name, attrDef] of Object.entries(node.attrs || {})) {
            if (attrDef.value !== undefined) {
                let propName = name;
                if (name === 'class') propName = 'className';
                else if (name === 'for') propName = 'htmlFor';

                if (BOOLEAN_ATTRS.has(propName)) {
                    props[propName] = attrDef.value === propName || attrDef.value === 'true' || attrDef.value === true;
                } else {
                    props[propName] = attrDef.value;
                }
            }
        }

        // Build static children
        const children = (node.children || [])
            .map(child => buildStaticVNode(child))
            .filter(child => child !== null && child !== undefined);

        return h(node.tag, props, ...children);
    }

    return null;
}

/**
 * Apply values to compiled template - optimized op interpreter
 * @param {Object} compiled - Compiled template with ops
 * @param {Array} values - Dynamic values to fill slots
 * @param {HTMLElement} [component] - Component instance for binding
 * @returns {import('../vendor/preact/index.js').VNode | string | null}
 */
export function applyValues(compiled, values, component = null) {
    if (!compiled) return null;

    // Fast path: fully static - return pre-built VNode directly
    if (compiled.op === OP.STATIC) {
        return compiled.vnode;
    }

    // Dispatch based on op code
    switch (compiled.op) {
        case OP.TEXT:
            return compiled.value;

        case OP.SLOT:
            return resolveSlotValue(compiled, values, component);

        case OP.FRAGMENT:
            return applyFragment(compiled, values, component);

        case OP.ELEMENT:
            return applyElement(compiled, values, component);

        default:
            throw new Error(`[applyValues] Unknown op type: ${compiled.op}`);
    }
}

/**
 * Resolve a slot value (dynamic interpolation)
 */
function resolveSlotValue(compiled, values, component) {
    let value = values[compiled.index];

    // Handle html() tagged templates
    if (isHtml(value)) {
        if (!('_compiled' in value)) {
            console.error('[applyValues] html() template missing _compiled');
            return null;
        }
        if (value._compiled === null) return null;
        return applyValues(value._compiled, value._values || [], component);
    }

    // Handle raw()
    if (isRaw(value)) {
        return h('span', { dangerouslySetInnerHTML: { __html: value.toString() } });
    }

    // Handle null/undefined
    if (value === null || value === undefined) return null;

    // Handle arrays (could be vnodes or primitives)
    if (Array.isArray(value)) {
        if (value.length === 0) return null;

        const hasVNodes = value.some(item => {
            if (!item) return false;
            if (typeof item === 'string' || typeof item === 'number') return true;
            if (typeof item === 'object' && ('type' in item || 'props' in item || '__' in item)) return true;
            return false;
        });

        if (hasVNodes) return value;
        return value.join('');
    }

    // Check if this is a vnode (Preact VNode structure)
    if (typeof value === 'object') {
        // Preact vnodes have 'type', 'props', or '__' (internal marker)
        if (value.type || value.props || value.__) {
            return value;
        }
        // Security: prevent malicious toString()
        return Object.prototype.toString.call(value);
    }

    // Normalize strings
    if (typeof value === 'string') {
        value = value.replace(/[\uFEFF\u200B-\u200D\uFFFE\uFFFF]/g, '');
    }

    return value;
}

/**
 * Apply fragment op
 */
function applyFragment(compiled, values, component) {
    const children = compiled.children
        .map(child => {
            const childValues = child._itemValues !== undefined ? child._itemValues : values;
            return applyValues(child, childValues, component);
        })
        .filter(child => child !== undefined && child !== false && child !== null);

    if (children.length === 0) return null;

    const props = compiled.key !== undefined ? { key: compiled.key } : null;
    return h(Fragment, props, ...children);
}

/**
 * Apply element op - the main workhorse
 */
function applyElement(compiled, values, component) {
    const props = { ...compiled.staticProps };
    const isCustomElement = compiled.isCustomElement;

    // Apply dynamic props
    for (const { name, def } of compiled.dynamicProps) {
        const value = resolveProp(name, def, values, component, isCustomElement);
        if (value !== undefined) {
            // Remap HTML attributes to Preact props
            let propName = name;
            if (name === 'class') propName = 'className';
            else if (name === 'for') propName = 'htmlFor';
            else if (name === 'style' && isCustomElement) {
                props._vdxStyle = value;
                continue;
            }

            if (name === '__ref__') {
                // Handle ref
                props.ref = createRefCallback(def.refName, component);
                continue;
            }

            if (BOOLEAN_ATTRS.has(propName)) {
                props[propName] = value === true ? true : value === false ? false :
                    typeof value === 'string' ? value : Boolean(value);
            } else {
                props[propName] = value;
            }
        }
    }

    // Apply events - collect hyphenated events for single ref handling
    const customEvents = [];
    for (const { name, def } of compiled.events) {
        const handler = resolveEventHandler(name, def, values, component, isCustomElement);
        if (handler) {
            if (name === 'clickoutside' || name === 'click-outside') {
                props.ref = createClickOutsideRef(handler, props.ref);
            } else if (name.includes('-')) {
                // Collect hyphenated events - they need ref-based handling
                // because Preact lowercases event names (see preact#2592)
                customEvents.push({ name, handler });
            } else {
                const propName = 'on' + name.charAt(0).toUpperCase() + name.slice(1);
                props[propName] = handler;
            }
        }
    }

    // Create single ref for all custom hyphenated events
    if (customEvents.length > 0) {
        props.ref = createCustomEventsRef(customEvents, props.ref);
    }

    // Add key if present
    if (compiled.key !== undefined) {
        props.key = compiled.key;
    }

    // Apply children
    const children = compiled.children
        .map(child => {
            const childValues = child._itemValues !== undefined ? child._itemValues : values;
            return applyValues(child, childValues, component);
        })
        .filter(child => child !== undefined && child !== false);

    // For custom elements, handle children/slots specially
    if (isCustomElement && children.length > 0) {
        const { defaultChildren, namedSlots } = groupChildrenBySlot(children);
        return h(compiled.tag, {
            ...props,
            _vdxChildren: defaultChildren,
            _vdxSlots: namedSlots
        });
    }

    return h(compiled.tag, props, ...children);
}

/**
 * Resolve a dynamic prop value
 */
function resolveProp(name, def, values, component, isCustomElement) {
    // x-model binding
    if (def.xModel !== undefined) {
        if (component && component.state) {
            let value = getNestedValue(component.state, def.xModel);

            if (def.context === 'x-model-checked') {
                return !!value;
            } else if (def.context === 'x-model-radio') {
                return value === def.radioValue;
            } else if (def.context === 'x-model-value' && isCustomElement &&
                       (typeof value === 'object' || typeof value === 'function') && value !== null) {
                return value;
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
                const slotMarker = `__SLOT_${slotIndex}__`;
                const slotValue = values[slotIndex];
                value = value.replace(slotMarker, String(slotValue ?? ''));
            }
        } else {
            value = values[def.slot];
            if (def.template) {
                value = def.template.replace(`__SLOT_${def.slot}__`, String(value));
            }
        }

        // Context-specific handling
        if (def.context === 'url') {
            return sanitizeUrl(value) || '';
        } else if (def.context === 'custom-element-attr') {
            return value;
        }

        if (value !== undefined && value !== null && typeof value !== 'boolean') {
            return String(value);
        }
        return value;
    }

    // Ref
    if (def.refName !== undefined) {
        return def;  // Will be handled by caller
    }

    return def.value;
}

/**
 * Create a ref callback for component refs
 */
function createRefCallback(refName, component) {
    return (el) => {
        if (component) {
            if (el) {
                component.refs[refName] = el;
            } else {
                delete component.refs[refName];
            }
        }
    };
}

/**
 * Create a ref callback for multiple custom hyphenated events (e.g., 'status-change', 'item-delete')
 * These can't use Preact's event prop system because Preact lowercases event names
 * (onStatusChange -> 'statuschange', not 'status-change')
 * See: https://github.com/preactjs/preact/issues/2592
 *
 * @param {Array<{name: string, handler: Function}>} events - Array of event definitions
 * @param {Function|null} existingRef - Existing ref to chain with
 */
function createCustomEventsRef(events, existingRef) {
    let lastEl = null;

    return (el) => {
        if (existingRef) existingRef(el);

        // Remove old listeners
        if (lastEl) {
            for (const { name } of events) {
                const handlerKey = `_customEvent_${name}`;
                if (lastEl[handlerKey]) {
                    lastEl.removeEventListener(name, lastEl[handlerKey]);
                    delete lastEl[handlerKey];
                }
            }
        }

        // Add new listeners
        if (el) {
            for (const { name, handler } of events) {
                const handlerKey = `_customEvent_${name}`;
                el[handlerKey] = handler;
                el.addEventListener(name, handler);
            }
            lastEl = el;
        } else {
            lastEl = null;
        }
    };
}

/**
 * Create a ref callback for click-outside handling
 */
function createClickOutsideRef(handler, existingRef) {
    let lastEl = null;

    return (el) => {
        if (existingRef) existingRef(el);

        if (lastEl && lastEl._clickOutsideHandler) {
            document.removeEventListener('click', lastEl._clickOutsideHandler);
            delete lastEl._clickOutsideHandler;
        }

        if (el) {
            const documentHandler = (e) => {
                if (!el.contains(e.target)) {
                    handler(e);
                }
            };
            el._clickOutsideHandler = documentHandler;
            document.addEventListener('click', documentHandler);
            lastEl = el;
        } else {
            lastEl = null;
        }
    };
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

        // Chain with existing handler if needed
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
 * Group children by slot name for custom elements
 * Exported for use in light DOM children capture
 */
export function groupChildrenBySlot(children) {
    const defaultChildren = [];
    const namedSlots = {};

    for (const child of children) {
        if (child && typeof child === 'object' && child.props && child.props.slot) {
            const slotName = child.props.slot;
            if (!namedSlots[slotName]) {
                namedSlots[slotName] = [];
            }
            namedSlots[slotName].push(child);
        } else {
            defaultChildren.push(child);
        }
    }

    return { defaultChildren, namedSlots: Object.keys(namedSlots).length > 0 ? namedSlots : {} };
}

// ============================================================================
// XML Parsing (unchanged from before - this is the compile-time parsing)
// ============================================================================

/**
 * Parse XML string into tree structure
 */
function parseXMLToTree(xmlString) {
    const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
                          'link', 'meta', 'param', 'source', 'track', 'wbr'];

    // Convert boolean attributes to explicit values
    const tagPattern = /<([a-zA-Z][\w-]*)([^>]*)>/g;
    const booleanAttrs = ['checked', 'selected', 'disabled', 'readonly', 'multiple', 'ismap',
                          'defer', 'declare', 'noresize', 'nowrap', 'noshade', 'compact',
                          'autofocus', 'required', 'autoplay', 'controls', 'loop', 'muted',
                          'default', 'open', 'reversed', 'scoped', 'seamless', 'sortable',
                          'novalidate', 'formnovalidate', 'itemscope'];

    // get rid of all whitespace between tags
    xmlString = xmlString.replace('\n', ' ').replace(/>\s+</g, '><').trim();

    xmlString = xmlString.replace(tagPattern, (fullMatch, tagName, attrs) => {
        if (fullMatch.startsWith('</')) return fullMatch;

        let processedAttrs = attrs;
        for (const boolAttr of booleanAttrs) {
            const pattern = new RegExp(`(\\s${boolAttr})(?=\\s|>|/|$)`, 'gi');
            const parts = processedAttrs.split(/("[^"]*"|'[^']*')/);
            processedAttrs = parts.map((part, index) => {
                if (index % 2 === 0) {
                    return part.replace(pattern, `$1="${boolAttr}"`);
                }
                return part;
            }).join('');
        }

        return `<${tagName}${processedAttrs}>`;
    });

    // Auto-close void elements
    voidElements.forEach(tag => {
        const regex = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi');
        xmlString = xmlString.replace(regex, (match, attrs) => {
            if (match.trimEnd().endsWith('/>')) return match;
            return `<${tag}${attrs || ''} />`;
        });
    });

    const parser = new DOMParser();
    const doc = parser.parseFromString(`<root>${xmlString}</root>`, 'text/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        console.error('[parseXMLToTree] Parse error:', parseError.textContent);
        return { type: 'fragment', wrapped: false, children: [] };
    }

    const root = doc.documentElement;
    if (!root) {
        return { type: 'fragment', wrapped: false, children: [] };
    }

    const children = [];
    for (const node of root.childNodes) {
        const tree = nodeToTree(node);
        if (tree) {
            if (tree.type === 'fragment') {
                children.push(...tree.children);
            } else {
                children.push(tree);
            }
        }
    }

    return { type: 'fragment', wrapped: false, children };
}

/**
 * Convert DOM node to tree structure
 */
function nodeToTree(node) {
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;

        const slotMatch = text.match(/^__SLOT_(\d+)__$/);
        if (slotMatch) {
            return {
                type: 'text',
                slot: parseInt(slotMatch[1], 10),
                context: 'content'
            };
        }

        if (text.includes('__SLOT_')) {
            const parts = text.split(/(__SLOT_\d+__)/);
            const children = parts
                .filter(part => part)
                .map(part => {
                    const match = part.match(/^__SLOT_(\d+)__$/);
                    if (match) {
                        return { type: 'text', slot: parseInt(match[1], 10), context: 'content' };
                    }
                    return { type: 'text', value: part };
                });
            return { type: 'fragment', wrapped: false, children };
        }

        if (text) {
            return { type: 'text', value: text };
        }
        return null;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        const attrs = {};
        const events = {};

        for (const attr of node.attributes) {
            const name = attr.name;
            const value = attr.value;

            // x-model
            if (name === 'x-model') {
                const isCustomElement = componentDefinitions.has(tag);

                if (isCustomElement) {
                    attrs['value'] = { xModel: value, context: 'x-model-value' };
                    events['change'] = { xModel: value, modifier: null, customElement: true };
                } else {
                    const inputType = node.getAttribute('type');

                    if (inputType === 'checkbox') {
                        attrs['checked'] = { xModel: value, context: 'x-model-checked' };
                        events['change'] = { xModel: value, modifier: null };
                    } else if (inputType === 'radio') {
                        const radioValue = node.getAttribute('value');
                        attrs['checked'] = { xModel: value, radioValue, context: 'x-model-radio' };
                        events['change'] = { xModel: value, modifier: null };
                    } else if (inputType === 'file') {
                        events['change'] = { xModel: value, modifier: null };
                    } else {
                        attrs['value'] = { xModel: value, context: 'x-model-value' };
                        events['input'] = { xModel: value, modifier: null };
                    }
                }
                continue;
            }

            // ref
            if (name === 'ref') {
                attrs['__ref__'] = { refName: value };
                continue;
            }

            // on-* events
            if (name.startsWith('on-')) {
                const fullEventName = name.substring(3);
                let eventName, modifier;

                // Known event modifiers
                const KNOWN_MODIFIERS = ['prevent', 'stop'];

                if (fullEventName === 'click-outside') {
                    eventName = 'clickoutside';
                    modifier = null;
                } else {
                    const parts = fullEventName.split('-');
                    const lastPart = parts[parts.length - 1];

                    // Only treat as modifier if it's a known modifier
                    if (parts.length > 1 && KNOWN_MODIFIERS.includes(lastPart)) {
                        eventName = parts.slice(0, -1).join('-');
                        modifier = lastPart;
                    } else {
                        eventName = fullEventName;
                        modifier = null;
                    }
                }

                const slotMatch = value.match(/^__SLOT_(\d+)__$/);
                let newHandler;

                if (slotMatch) {
                    newHandler = { slot: parseInt(slotMatch[1], 10), modifier };
                } else if (value.match(/__EVENT_/)) {
                    newHandler = { handler: value, modifier };
                } else {
                    newHandler = { method: value, modifier };
                }

                if (events[eventName]) {
                    newHandler._chainWith = events[eventName];
                }

                events[eventName] = newHandler;
                continue;
            }

            // Regular attributes
            const slotMatch = value.match(/^__SLOT_(\d+)__$/);
            if (slotMatch) {
                const slotIndex = parseInt(slotMatch[1], 10);
                let context = 'attribute';

                if (name === 'href' || name === 'src' || name === 'action') {
                    context = 'url';
                } else if (name.startsWith('on')) {
                    context = 'event-handler';
                } else if (name === 'style' || name === 'srcdoc') {
                    context = 'dangerous';
                } else if (tag.includes('-')) {
                    context = 'custom-element-attr';
                }

                attrs[name] = { slot: slotIndex, context, attrName: name };
            } else if (value.includes('__SLOT_')) {
                const matches = value.match(/__SLOT_(\d+)__/g);
                if (matches && matches.length >= 1) {
                    const slots = matches.map(m => parseInt(m.match(/\d+/)[0], 10));
                    attrs[name] = { slots, context: 'attribute', attrName: name, template: value };
                } else {
                    attrs[name] = { value };
                }
            } else {
                attrs[name] = { value };
            }
        }

        const children = [];
        for (const child of node.childNodes) {
            const childTree = nodeToTree(child);
            if (childTree) {
                if (childTree.type === 'fragment') {
                    children.push(...childTree.children);
                } else {
                    children.push(childTree);
                }
            }
        }

        return { type: 'element', tag, attrs, events, slotProps: {}, children };
    }

    if (node.nodeType === Node.COMMENT_NODE) {
        return null;
    }

    return null;
}

/**
 * Clear template cache
 */
export function clearTemplateCache() {
    templateCache.clear();
    cacheAccessTimes.clear();
}

/**
 * Prune template cache
 */
export function pruneTemplateCache() {
    if (templateCache.size > MAX_CACHE_SIZE * 0.5) {
        cleanupTemplateCache();
    }
}

/**
 * Get cache size for debugging
 */
export function getTemplateCacheSize() {
    return templateCache.size;
}
