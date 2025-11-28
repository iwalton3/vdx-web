/**
 * Template Compiler - Compiles HTML templates directly to Preact VNodes
 *
 * Architecture:
 * 1. Parse template string + values into structured AST
 * 2. Create slots for dynamic values
 * 3. Cache compiled template
 * 4. On render: fill slots with values, generate Preact VNodes
 *
 * Performance benefits:
 * - No regex on every render
 * - No HTML string parsing
 * - Direct VNode generation
 * - Optimal Preact reconciliation
 *
 * @module core/template-compiler
 */

import { sanitizeUrl, isHtml, isRaw } from './template.js';
import { h, Fragment } from '../vendor/preact/index.js';

/**
 * @typedef {Object} CompiledTextNode
 * @property {'text'} type - Node type
 * @property {string} [value] - Static text content
 * @property {number} [slot] - Dynamic slot index
 * @property {string} [context] - Context for escaping (content, attribute, url, etc.)
 */

/**
 * @typedef {Object} AttributeDefinition
 * @property {string} [value] - Static attribute value
 * @property {number} [slot] - Dynamic slot index
 * @property {string} [context] - Context for escaping
 * @property {string} [attrName] - Attribute name
 * @property {string} [template] - Template string for partial slots
 */

/**
 * @typedef {Object} EventDefinition
 * @property {number} [slot] - Dynamic slot index for function
 * @property {string} [handler] - Handler marker from registry
 * @property {string} [method] - Method name string
 * @property {string} [modifier] - Event modifier (prevent, stop, etc.)
 */

/**
 * @typedef {Object} CompiledElementNode
 * @property {'element'} type - Node type
 * @property {string} tag - HTML tag name
 * @property {Object.<string, AttributeDefinition>} attrs - Attribute definitions
 * @property {Object.<string, EventDefinition>} events - Event bindings
 * @property {Object.<string, string>} slotProps - Prop markers
 * @property {Array<CompiledNode>} children - Child nodes
 */

/**
 * @typedef {Object} CompiledFragmentNode
 * @property {'fragment'} type - Node type
 * @property {Array<CompiledNode>} children - Child nodes
 */

/**
 * @typedef {CompiledTextNode | CompiledElementNode | CompiledFragmentNode} CompiledNode
 */

/**
 * @typedef {Object} AppliedTextNode
 * @property {'text' | 'html'} type - Node type
 * @property {string} value - Actual text content (escaped)
 */

/**
 * @typedef {Object} AppliedElementNode
 * @property {'element'} type - Node type
 * @property {string} tag - HTML tag name
 * @property {Object.<string, string | Object>} attrs - Applied attributes
 * @property {Object.<string, EventDefinition>} events - Event bindings with handlers
 * @property {Object.<string, string>} slotProps - Prop values
 * @property {Array<AppliedNode>} children - Child nodes with values applied
 */

/**
 * @typedef {Object} AppliedFragmentNode
 * @property {'fragment'} type - Node type
 * @property {Array<AppliedNode>} children - Child nodes
 */

/**
 * @typedef {AppliedTextNode | AppliedElementNode | AppliedFragmentNode} AppliedNode
 */

/** @type {Map<string, CompiledNode>} Template cache - keyed by template strings joined */
const templateCache = new Map();

/** Maximum template cache size before cleanup */
const MAX_CACHE_SIZE = 500;

/** Track cache access times for LRU eviction */
const cacheAccessTimes = new Map();

/**
 * Compile a template string into an optimized tree structure
 * @param {Array<string>} strings - Template literal string parts
 * @returns {CompiledNode} Compiled template with slots for dynamic values
 * @example
 * const strings = ['<div class="', '">', '</div>'];
 * const compiled = compileTemplate(strings);
 * // Returns structured tree with slot for class value
 */
export function compileTemplate(strings) {
    // Create cache key from static strings
    const cacheKey = strings.join('␞'); // Use rare char as separator

    if (templateCache.has(cacheKey)) {
        // Update access time for LRU tracking
        cacheAccessTimes.set(cacheKey, Date.now());
        return templateCache.get(cacheKey);
    }

    // Parse the full template string with slot markers
    let fullTemplate = '';
    for (let i = 0; i < strings.length; i++) {
        fullTemplate += strings[i];
        if (i < strings.length - 1) {
            fullTemplate += `__SLOT_${i}__`;
        }
    }

    // Parse XML into tree structure (preserves all nodes, allows self-closing tags)
    const compiled = parseXMLToTree(fullTemplate);

    // Cache the compiled template
    templateCache.set(cacheKey, compiled);
    cacheAccessTimes.set(cacheKey, Date.now());

    // Trigger cleanup if cache is getting too large
    if (templateCache.size > MAX_CACHE_SIZE) {
        cleanupTemplateCache();
    }

    return compiled;
}

/**
 * Clean up least recently used templates when cache grows too large
 * Removes oldest 25% of entries based on access time
 */
function cleanupTemplateCache() {
    // Sort entries by access time
    const entries = Array.from(cacheAccessTimes.entries())
        .sort((a, b) => a[1] - b[1]); // Sort by timestamp (oldest first)

    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
        const [key] = entries[i];
        templateCache.delete(key);
        cacheAccessTimes.delete(key);
    }
}

/**
 * Parse XML string into tree structure
 * Uses DOMParser with XML mode to preserve all text nodes and allow self-closing tags
 */
function parseXMLToTree(xmlString) {
    // List of void elements that should be self-closing
    const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
                          'link', 'meta', 'param', 'source', 'track', 'wbr'];

    // Convert boolean attributes to have explicit values for XML compatibility
    // Split by tags first to process only opening tags
    const tagPattern = /<([a-zA-Z][\w-]*)([^>]*)>/g;
    const booleanAttrs = ['checked', 'selected', 'disabled', 'readonly', 'multiple', 'ismap',
                          'defer', 'declare', 'noresize', 'nowrap', 'noshade', 'compact',
                          'autofocus', 'required', 'autoplay', 'controls', 'loop', 'muted',
                          'default', 'open', 'reversed', 'scoped', 'seamless', 'sortable',
                          'novalidate', 'formnovalidate', 'itemscope'];

    xmlString = xmlString.replace(tagPattern, (fullMatch, tagName, attrs) => {
        // Skip closing tags and tags that are already processed
        if (fullMatch.startsWith('</')) {
            return fullMatch;
        }

        // Process each boolean attribute
        let processedAttrs = attrs;
        for (const boolAttr of booleanAttrs) {
            // Only match the boolean attribute when it's:
            // 1. Preceded by whitespace
            // 2. Not inside quotes (no = before it, or if there is =, it's already quoted)
            // 3. Followed by whitespace, >, /, or end of string
            const pattern = new RegExp(`(\\s${boolAttr})(?=\\s|>|/|$)`, 'gi');

            // Before replacing, make sure we're not inside a quoted string
            // Split by quotes and only process parts outside quotes
            const parts = processedAttrs.split(/("[^"]*"|'[^']*')/);
            processedAttrs = parts.map((part, index) => {
                // Even indices are outside quotes, odd indices are inside quotes
                if (index % 2 === 0) {
                    return part.replace(pattern, `$1="${boolAttr}"`);
                }
                return part;  // Don't modify quoted parts
            }).join('');
        }

        return `<${tagName}${processedAttrs}>`;
    });

    // Auto-close void elements for XML compatibility
    // Note: Avoid negative lookbehind (?<!/) for Safari < 16.4 compatibility
    voidElements.forEach(tag => {
        const regex = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi');
        xmlString = xmlString.replace(regex, (match, attrs) => {
            // Skip if already self-closed (ends with />)
            if (match.trimEnd().endsWith('/>')) {
                return match;
            }
            // Make it self-closing for XML compatibility
            return `<${tag}${attrs || ''} />`;
        });
    });

    // Wrap in a root element for XML parsing
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<root>${xmlString}</root>`, 'text/xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        console.error('[parseXMLToTree] Parse error:', parseError.textContent);
        console.error('[parseXMLToTree] Input:', xmlString);
        console.error('[parseXMLToTree] Processed XML:', `<root>${xmlString}</root>`);
        // Return empty fragment instead of failing completely
        return { type: 'fragment', wrapped: false, children: [] };
    }

    const root = doc.documentElement;
    if (!root) {
        return { type: 'fragment', wrapped: false, children: [] };
    }

    // Walk the parsed DOM and create our tree
    const children = [];
    for (const node of root.childNodes) {
        const tree = nodeToTree(node);
        if (tree) {
            // Flatten nested fragments (happens when text nodes contain multiple slots)
            if (tree.type === 'fragment') {
                children.push(...tree.children);
            } else {
                children.push(tree);
            }
        }
    }

    return {
        type: 'fragment',
        wrapped: false,  // Root template fragments are unwrapped
        children
    };
}

/**
 * Convert a DOM node to our tree structure
 */
function nodeToTree(node) {
    // Text node
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;

        // Check for single slot marker
        const slotMatch = text.match(/^__SLOT_(\d+)__$/);
        if (slotMatch) {
            return {
                type: 'text',
                slot: parseInt(slotMatch[1], 10),
                context: 'content'
            };
        }

        // Check if contains multiple slots (DOMParser merged text nodes)
        if (text.includes('__SLOT_')) {
            // Split on slot markers and create fragment with multiple nodes
            const parts = text.split(/(__SLOT_\d+__)/);
            const children = parts
                .filter(part => part) // Remove empty strings
                .map(part => {
                    const slotMatch = part.match(/^__SLOT_(\d+)__$/);
                    if (slotMatch) {
                        return {
                            type: 'text',
                            slot: parseInt(slotMatch[1], 10),
                            context: 'content'
                        };
                    }
                    return {
                        type: 'text',
                        value: part
                    };
                });

            // Return a fragment with multiple text nodes
            return {
                type: 'fragment',
                wrapped: false,  // Text fragments are unwrapped
                children
            };
        }

        // Static text (keep even if just whitespace - important for spacing)
        if (text) {
            return {
                type: 'text',
                value: text
            };
        }

        return null;
    }

    // Element node
    if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        const attrs = {};
        const events = {};
        let slotProps = {};

        // Parse attributes
        for (const attr of node.attributes) {
            const name = attr.name;
            const value = attr.value;

            // x-model two-way binding (convert to value/checked + onInput/onChange)
            if (name === 'x-model') {
                const isCustomElement = tag.includes('-');

                if (isCustomElement) {
                    // Custom elements: use 'value' prop and 'change' event
                    // The custom component should emit a 'change' event with e.detail.value
                    attrs['value'] = {
                        xModel: value,
                        context: 'x-model-value'
                    };
                    events['change'] = {
                        xModel: value,
                        modifier: null,
                        customElement: true  // Flag to use e.detail.value
                    };
                } else {
                    // Native elements: determine attribute and event based on input type
                    const inputType = node.getAttribute('type');

                    if (inputType === 'checkbox') {
                        // Checkboxes use 'checked' attribute and 'change' event
                        attrs['checked'] = {
                            xModel: value,
                            context: 'x-model-checked'
                        };
                        events['change'] = {
                            xModel: value,
                            modifier: null
                        };
                    } else if (inputType === 'radio') {
                        // Radio buttons use 'checked' attribute and 'change' event
                        // Store the radio button's value for comparison
                        const radioValue = node.getAttribute('value');
                        attrs['checked'] = {
                            xModel: value,
                            radioValue: radioValue,
                            context: 'x-model-radio'
                        };
                        events['change'] = {
                            xModel: value,
                            modifier: null
                        };
                    } else if (inputType === 'file') {
                        // File inputs can't have value binding, only change event
                        events['change'] = {
                            xModel: value,
                            modifier: null
                        };
                    } else {
                        // Text, number, select, textarea, etc. use 'value' and 'input'
                        attrs['value'] = {
                            xModel: value,
                            context: 'x-model-value'
                        };
                        events['input'] = {
                            xModel: value,
                            modifier: null
                        };
                    }
                }
                continue;
            }

            // Ref binding - store element reference in component.refs
            if (name === 'ref') {
                attrs['__ref__'] = { refName: value };
                continue;
            }

            // Event binding
            if (name.startsWith('on-')) {
                // Parse event name and optional modifier (e.g., "on-submit-prevent")
                const fullEventName = name.substring(3);
                const parts = fullEventName.split('-');
                const eventName = parts[0];
                const modifier = parts.length > 1 ? parts[parts.length - 1] : null;

                const slotMatch = value.match(/^__SLOT_(\d+)__$/);

                let newHandler;
                if (slotMatch) {
                    newHandler = {
                        slot: parseInt(slotMatch[1], 10),
                        modifier: modifier
                    };
                } else if (value.match(/__EVENT_/)) {
                    // Event handler from registry
                    newHandler = {
                        handler: value,
                        modifier: modifier
                    };
                } else {
                    // Method name
                    newHandler = {
                        method: value,
                        modifier: modifier
                    };
                }

                // Check if this event already has a handler (e.g., from x-model)
                if (events[eventName]) {
                    // Store both handlers for later chaining
                    const existingHandler = events[eventName];
                    newHandler._chainWith = existingHandler;
                }

                events[eventName] = newHandler;
                continue;
            }

            // Check for slot in value
            const slotMatch = value.match(/^__SLOT_(\d+)__$/);
            if (slotMatch) {
                const slotIndex = parseInt(slotMatch[1], 10);

                // Determine context based on attribute name
                let context = 'attribute';
                if (name === 'href' || name === 'src' || name === 'action') {
                    context = 'url';
                } else if (name.startsWith('on')) {
                    context = 'event-handler';
                } else if (name === 'style' || name === 'srcdoc') {
                    context = 'dangerous';
                } else if (tag.includes('-')) {
                    // Custom element
                    context = 'custom-element-attr';
                }

                attrs[name] = {
                    slot: slotIndex,
                    context,
                    attrName: name
                };
            } else if (value.includes('__SLOT_')) {
                // Partial slot (mixed static and dynamic)
                const matches = value.match(/__SLOT_(\d+)__/g);
                if (matches && matches.length >= 1) {
                    // Extract all slot indices
                    const slots = matches.map(m => parseInt(m.match(/\d+/)[0], 10));

                    // Store template and all slot indices for interpolation
                    attrs[name] = {
                        slots: slots,  // Array of slot indices
                        context: 'attribute',
                        attrName: name,
                        template: value  // Keep template for interpolation
                    };
                } else {
                    // Shouldn't happen, but fallback just in case
                    attrs[name] = { value };
                }
            } else if (value.match(/__PROP_/)) {
                // Prop marker
                slotProps[name] = value;
            } else {
                // Static attribute
                attrs[name] = { value };
            }
        }

        // Parse children recursively
        const children = [];
        for (const child of node.childNodes) {
            const childTree = nodeToTree(child);
            if (childTree) {
                // Flatten nested fragments (happens when text nodes contain multiple slots)
                if (childTree.type === 'fragment') {
                    children.push(...childTree.children);
                } else {
                    children.push(childTree);
                }
            }
        }

        return {
            type: 'element',
            tag,
            attrs,
            events,
            slotProps,
            children
        };
    }

    // Comment node - skip
    if (node.nodeType === Node.COMMENT_NODE) {
        return null;
    }

    return null;
}

/**
 * Apply values to compiled template slots and return Preact VNode
 * @param {Object} compiled - Compiled template
 * @param {Array} values - Dynamic values to fill slots
 * @param {HTMLElement} [component] - Component instance for binding methods
 * @returns {import('../vendor/preact/index.js').VNode | string | null} Preact VNode
 */
export function applyValues(compiled, values, component = null) {
    if (!compiled) return null;

    if (compiled.type === 'fragment') {
        // Apply values to children recursively, returns Preact vnodes
        const children = compiled.children
            .map(child => {
                // Check if child has its own values (from each())
                const childValues = child._itemValues !== undefined ? child._itemValues : values;
                return applyValues(child, childValues, component);
            })
            .filter(child => child !== undefined && child !== false && child !== null);

        // If no children after filtering, return null instead of empty Fragment
        if (children.length === 0) {
            return null;
        }

        // Return Preact Fragment vnode
        const props = compiled.key !== undefined ? { key: compiled.key } : null;
        return h(Fragment, props, ...children);
    }

    if (compiled.type === 'text') {
        if (compiled.slot !== undefined) {
            let value = values[compiled.slot];

            // Handle html() tagged templates with compiled structure
            if (isHtml(value)) {
                // All html() templates must have _compiled in the new system
                if (!('_compiled' in value)) {
                    console.error('[applyValues] html() template missing _compiled property - this should not happen');
                    return null;
                }

                const compiledValue = value._compiled;

                // If null (from when() returning null), return null directly
                if (compiledValue === null) {
                    return null;
                }

                // Recursively convert ALL nested templates to vnodes
                // Use the nested template's own values, not the parent's
                return applyValues(compiledValue, value._values || [], component);
            }

            // Handle raw()
            if (isRaw(value)) {
                return h('span', {
                    dangerouslySetInnerHTML: { __html: value.toString() }
                });
            }

            // Convert value to string (Preact handles escaping)
            // Handle null/undefined
            if (value === null || value === undefined) {
                return null;
            }

            // Handle arrays - could be array of vnodes (children) or primitives
            if (Array.isArray(value)) {
                // Empty array - return null
                if (value.length === 0) {
                    return null;
                }

                // Check if array contains vnodes (Preact elements)
                // Preact vnodes have 'type', 'props', 'key' properties
                // Also check for strings (text nodes) which Preact can handle
                const hasVNodesOrText = value.some(item => {
                    if (!item) return false;
                    // String or number - valid child
                    if (typeof item === 'string' || typeof item === 'number') return true;
                    // Object with 'type' property - likely a vnode
                    if (typeof item === 'object' && ('type' in item || 'props' in item || '__' in item)) return true;
                    return false;
                });

                if (hasVNodesOrText) {
                    // Return array directly - Preact will handle mixed arrays of strings and vnodes
                    return value;
                }

                // Array of other primitives - join to string
                return value.join('');
            }

            // Security: For objects, use Object.prototype.toString to prevent
            // malicious custom toString() methods from executing
            if (typeof value === 'object') {
                // Don't call value.toString() - use the safe default instead
                return Object.prototype.toString.call(value);  // Returns "[object Object]"
            }

            // Normalize Unicode to prevent encoding attacks (remove BOM, etc.)
            if (typeof value === 'string') {
                // Remove BOM (U+FEFF) and other zero-width characters
                value = value.replace(/[\uFEFF\u200B-\u200D\uFFFE\uFFFF]/g, '');
            }

            // Return primitives directly
            return value;
        }

        // Static text - return value directly
        return compiled.raw !== undefined ? compiled.raw : compiled.value;
    }

    if (compiled.type === 'element') {
        const props = {};
        const customElementProps = {};
        const isCustomElement = compiled.tag.includes('-');

        // Boolean attributes that should be converted to actual booleans
        const booleanAttrs = new Set([
            'disabled', 'checked', 'selected', 'readonly', 'required',
            'multiple', 'autofocus', 'autoplay', 'controls', 'loop',
            'muted', 'open', 'reversed', 'hidden', 'async', 'defer'
        ]);

        // Apply attribute slots
        for (const [name, attrDef] of Object.entries(compiled.attrs)) {
            let value;

            if (attrDef.xModel !== undefined) {
                // x-model binding: get value from component state
                if (component && component.state) {
                    value = component.state[attrDef.xModel];

                    // For checked attribute (checkbox), ensure boolean
                    if (attrDef.context === 'x-model-checked') {
                        value = !!value;
                    }
                    // For radio buttons, compare state value with radio's value attribute
                    else if (attrDef.context === 'x-model-radio') {
                        value = (value === attrDef.radioValue);
                    }
                    // For custom elements with arrays/objects, store in customElementProps
                    else if (attrDef.context === 'x-model-value' && isCustomElement && (typeof value === 'object' || typeof value === 'function') && value !== null) {
                        customElementProps[name] = value;
                        continue;  // Skip normal attribute handling
                    }
                } else {
                    value = (attrDef.context === 'x-model-checked' || attrDef.context === 'x-model-radio') ? false : '';
                }
            } else if (attrDef.slot !== undefined || attrDef.slots !== undefined) {
                // Handle single slot (attrDef.slot) or multiple slots (attrDef.slots)
                if (attrDef.slots) {
                    // Multiple slots: replace all __SLOT_N__ markers in template
                    value = attrDef.template;
                    for (const slotIndex of attrDef.slots) {
                        const slotMarker = `__SLOT_${slotIndex}__`;
                        const slotValue = values[slotIndex];
                        value = value.replace(slotMarker, String(slotValue !== null && slotValue !== undefined ? slotValue : ''));
                    }
                } else {
                    // Single slot
                    value = values[attrDef.slot];

                    // If there's a template with static parts, interpolate
                    if (attrDef.template) {
                        // Replace __SLOT_N__ with the actual value
                        const slotMarker = `__SLOT_${attrDef.slot}__`;
                        value = attrDef.template.replace(slotMarker, String(value));
                    }
                }

                // Handle different contexts
                if (attrDef.context === 'url') {
                    value = sanitizeUrl(value) || '';
                } else if (attrDef.context === 'custom-element-attr') {
                    // For custom elements, check if it's an object/array/function
                    if ((typeof value === 'object' || typeof value === 'function') && value !== null) {
                        // Store for ref callback (includes functions, objects, arrays)
                        customElementProps[name] = value;
                        continue;
                    } else {
                        value = String(value);
                    }
                } else if (attrDef.context === 'x-model-value') {
                    // This path is for when x-model value comes from a slot, not directly from component state
                    // For custom elements, preserve arrays/objects
                    if (isCustomElement && (typeof value === 'object' || typeof value === 'function') && value !== null) {
                        // Store arrays/objects for ref callback
                        customElementProps[name] = value;
                        continue;
                    }
                    // For native elements or primitive values, convert to string
                    if (typeof value !== 'object' && typeof value !== 'function') {
                        value = String(value);
                    }
                } else if (attrDef.context === 'attribute') {
                    // Pass booleans/nulls/undefined as-is, escape strings
                    if (value !== undefined && value !== null && typeof value !== 'boolean') {
                        value = String(value);  // Don't escape for Preact
                    }
                }
            } else if (attrDef.value !== undefined) {
                value = attrDef.value;
            } else if (attrDef.refName !== undefined) {
                // Handle ref attribute - create Preact ref callback
                const refName = attrDef.refName;
                props.ref = (el) => {
                    if (component) {
                        if (el) {
                            component.refs[refName] = el;
                        } else {
                            // Element unmounted, clean up ref
                            delete component.refs[refName];
                        }
                    }
                };
                continue;
            } else {
                continue;
            }

            // Skip undefined/null values
            if (value === undefined || value === null) {
                continue;
            }

            // Remap HTML attributes to Preact props
            let propName = name;
            if (name === 'class') {
                propName = 'className';
            } else if (name === 'for') {
                propName = 'htmlFor';
            }

            // Convert boolean attributes
            if (booleanAttrs.has(propName)) {
                // Only convert actual boolean values, keep strings as-is
                if (value === true) {
                    props[propName] = true;
                } else if (value === false) {
                    props[propName] = false;
                } else if (typeof value === 'string') {
                    // Keep string values as-is (including "true" and "false" strings)
                    props[propName] = value;
                } else {
                    // Convert other values to boolean
                    props[propName] = Boolean(value);
                }
            } else {
                props[propName] = value;
            }
        }

        // Helper function to resolve a single event handler
        const resolveHandler = (eventDef) => {
            let handler = null;

            if (eventDef.xModel !== undefined) {
                // x-model binding: create handler to update component state
                const propName = eventDef.xModel;
                handler = (e) => {
                    if (component && component.state) {
                        let value;

                        // For custom elements, value is in e.detail.value
                        if (eventDef.customElement) {
                            value = e.detail.value !== undefined ? e.detail.value : e.detail;
                        } else {
                            // For native elements, extract value from target
                            const target = e.target;

                            // Determine value based on input type
                            if (target.type === 'checkbox') {
                                value = target.checked;
                            } else if (target.type === 'radio') {
                                // For radio buttons, only update if this one is checked
                                if (target.checked) {
                                    value = target.value;
                                } else {
                                    return; // Don't update state for unchecked radios
                                }
                            } else if (target.type === 'number' || target.type === 'range') {
                                // Convert to number for number/range inputs
                                value = target.valueAsNumber;
                                // Fall back to string value if valueAsNumber is NaN
                                if (isNaN(value)) {
                                    value = target.value;
                                }
                            } else if (target.type === 'file') {
                                // For file inputs, provide the FileList
                                value = target.files;
                            } else {
                                // Default: text, textarea, select, etc.
                                value = target.value;
                            }
                        }

                        component.state[propName] = value;
                    }
                };
            } else if (eventDef.slot !== undefined) {
                handler = values[eventDef.slot];
            } else if (eventDef.handler && typeof eventDef.handler === 'function') {
                handler = eventDef.handler;
            } else if (eventDef.method && component && component[eventDef.method]) {
                handler = component[eventDef.method].bind(component);
            }

            if (handler && typeof handler === 'function') {
                // Apply modifiers
                if (eventDef.modifier === 'prevent') {
                    const originalHandler = handler;
                    handler = (e) => {
                        e.preventDefault();
                        return originalHandler(e);
                    };
                }
                if (eventDef.modifier === 'stop') {
                    const originalHandler = handler;
                    handler = (e) => {
                        e.stopPropagation();
                        return originalHandler(e);
                    };
                }
            }

            return handler;
        };

        // Convert events to Preact event handlers
        for (const [eventName, eventDef] of Object.entries(compiled.events)) {
            const propName = 'on' + eventName.charAt(0).toUpperCase() + eventName.slice(1);
            let handler = resolveHandler(eventDef);

            // Check if this handler needs to be chained with a previous one (e.g., x-model + on-input)
            if (eventDef._chainWith && handler) {
                const firstHandler = resolveHandler(eventDef._chainWith);
                if (firstHandler) {
                    // Create closure that calls both handlers in sequence
                    const secondHandler = handler;
                    handler = (e) => {
                        firstHandler(e);
                        secondHandler(e);
                    };
                }
            }

            // For custom elements, wrap handler to pass e.detail.value as second argument
            // This allows handlers like (e, val) => this.state.x = val
            if (isCustomElement && handler && typeof handler === 'function' && !eventDef.xModel) {
                const originalHandler = handler;
                handler = (e) => {
                    // Extract value from e.detail.value (or e.detail if value not present)
                    const value = (e.detail && e.detail.value !== undefined) ? e.detail.value : e.detail;
                    return originalHandler(e, value);
                };
            }

            if (handler && typeof handler === 'function') {
                props[propName] = handler;
            }
        }

        // Add key if present
        if (compiled.key !== undefined) {
            props.key = compiled.key;
        }

        // Apply children recursively
        const children = compiled.children
            .map(child => {
                // Check if child has its own values (from each())
                const childValues = child._itemValues !== undefined ? child._itemValues : values;
                return applyValues(child, childValues, component);
            })
            .filter(child => child !== undefined && child !== false);

        // For custom elements, pass children as a prop so components can access this.props.children
        if (isCustomElement && children.length > 0) {
            // Group children by slot name
            const defaultChildren = [];
            const namedChildren = {};

            for (const child of children) {
                // Check if child has a slot attribute
                if (child && typeof child === 'object' && child.props && child.props.slot) {
                    const slotName = child.props.slot;
                    if (!namedChildren[slotName]) {
                        namedChildren[slotName] = [];
                    }
                    namedChildren[slotName].push(child);
                } else {
                    defaultChildren.push(child);
                }
            }

            // Build children prop
            let childrenProp;
            if (Object.keys(namedChildren).length > 0) {
                // Has named slots - create object with default and named children
                childrenProp = defaultChildren.length > 0 ? defaultChildren : [];
                // Attach named children as properties
                for (const [name, namedChildArray] of Object.entries(namedChildren)) {
                    if (!Array.isArray(childrenProp)) {
                        childrenProp = { default: childrenProp };
                    }
                    childrenProp[name] = namedChildArray;
                }
            } else {
                // Only default children
                childrenProp = defaultChildren;
            }

            customElementProps.children = childrenProp;
        }

        // If custom element has props (including children), use ref to set them
        if (isCustomElement && Object.keys(customElementProps).length > 0) {
            props.ref = (el) => {
                if (el) {
                    // For framework components that haven't mounted yet, store as pending
                    if ('_isMounted' in el && !el._isMounted) {
                        if (!el._pendingProps) {
                            el._pendingProps = {};
                        }
                        Object.assign(el._pendingProps, customElementProps);
                    } else {
                        // For plain custom elements or mounted components, set directly
                        for (const [name, value] of Object.entries(customElementProps)) {
                            // Special handling for children: Element.prototype.children is read-only
                            if (name === 'children') {
                                if ('_isMounted' in el && el.props) {
                                    // Framework component - set on props object directly
                                    el.props.children = value;
                                    // Trigger re-render if mounted
                                    if (el._isMounted && typeof el.render === 'function') {
                                        el.render();
                                    }
                                }
                                // Skip for non-framework components (can't override Element.prototype.children)
                            } else {
                                // Regular prop - set normally
                                el[name] = value;
                            }
                        }
                    }
                }
            };
        }

        // Return Preact element vnode
        // ALWAYS pass children to h() so plain custom elements (like router-link) get them as DOM children
        // Framework components will ALSO get children via props.children (set in ref callback above)
        return h(compiled.tag, props, ...children);
    }

    return null;
}

/**
 * Clear template cache (useful for development)
 */
export function clearTemplateCache() {
    templateCache.clear();
    cacheAccessTimes.clear();
}

/**
 * Trigger template cache cleanup (can be called on route navigation)
 * This is less aggressive than clearTemplateCache() - only removes old entries
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
