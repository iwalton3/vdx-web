/**
 * Template System with Automatic Context-Aware Security
 * Provides XSS protection by automatically detecting interpolation context
 */

import * as templateCompiler from './template-compiler.js';

// Security: Use Symbols to prevent spoofing of trusted content markers
// Symbols are private - only helper functions are exported
const HTML_MARKER = Symbol('html');
const RAW_MARKER = Symbol('raw');

// Helper functions to check markers (safe API for other code)
export const isHtml = (obj) => obj && obj[HTML_MARKER] === true;
export const isRaw = (obj) => obj && obj[RAW_MARKER] === true;

// URL attributes that need URL sanitization
const URL_ATTRIBUTES = new Set([
    'href', 'src', 'action', 'formaction', 'data', 'poster',
    'cite', 'background', 'longdesc', 'manifest', 'usemap'
]);

// Dangerous attributes where interpolation should be blocked
const DANGEROUS_ATTRIBUTES = new Set(['style', 'srcdoc']);

// Boolean attributes that should use presence/absence pattern
const BOOLEAN_ATTRIBUTES = new Set([
    'checked', 'selected', 'disabled', 'readonly', 'required',
    'multiple', 'autofocus', 'autoplay', 'controls', 'loop',
    'muted', 'open', 'reversed', 'hidden', 'async', 'defer',
    'novalidate', 'formnovalidate', 'ismap', 'itemscope'
]);

/**
 * Normalize input to prevent encoding attacks
 */
function normalizeInput(input) {
    if (input == null) return '';
    let str = String(input);

    // Remove null bytes (common bypass technique)
    str = str.replace(/\x00/g, '');

    // Remove BOM markers
    str = str.replace(/^\uFEFF/, '');

    // Unicode NFC normalization (prevents different representations of same character)
    if (typeof str.normalize === 'function') {
        str = str.normalize('NFC');
    }

    // Remove non-characters (U+FDD0-U+FDEF, U+FFFE, U+FFFF)
    str = str.replace(/[\uFDD0-\uFDEF\uFFFE\uFFFF]/g, '');

    // Remove control characters (except tab, LF, CR)
    str = str.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');

    return str;
}

/**
 * Escape HTML content (for use between tags)
 */
export function escapeHtml(unsafe) {
    const normalized = normalizeInput(unsafe);
    return normalized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Escape HTML attributes (stricter than content)
 */
export function escapeAttr(unsafe) {
    const normalized = normalizeInput(unsafe);
    return normalized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .replace(/=/g, '&#x3D;')
        .replace(/`/g, '&#x60;')
        .replace(/\n/g, '&#x0A;')
        .replace(/\r/g, '&#x0D;')
        .replace(/\t/g, '&#x09;');
}

/**
 * Escape URL for use in attributes (preserves : and / which are safe in URLs)
 */
export function escapeUrl(url) {
    const normalized = normalizeInput(url);
    return normalized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/=/g, '&#x3D;')
        .replace(/`/g, '&#x60;');
    // Note: Don't escape : or / in URLs - they're safe and expected in attributes
}

/**
 * Sanitize URL - blocks dangerous schemes
 */
export function sanitizeUrl(url) {
    const normalized = normalizeInput(url);

    // Remove all whitespace (including Unicode whitespace)
    const cleaned = normalized.replace(/\s/g, '');

    // Decode HTML entities that might hide the scheme
    const decoded = cleaned
        .replace(/&colon;/gi, ':')
        .replace(/&#58;/g, ':')
        .replace(/&#x3a;/gi, ':')
        .replace(/&sol;/gi, '/')
        .replace(/&#47;/g, '/')
        .replace(/&#x2f;/gi, '/');

    // Extract scheme (everything before first colon)
    const schemeMatch = decoded.match(/^([a-zA-Z][a-zA-Z0-9+.-]*?):/);

    if (!schemeMatch) {
        // No scheme = relative URL, which is safe
        return escapeUrl(normalized);
    }

    const scheme = schemeMatch[1].toLowerCase();

    // Allowlist of safe schemes
    const safeSchemes = ['http', 'https', 'mailto', 'tel', 'sms', 'ftp', 'ftps'];

    if (!safeSchemes.includes(scheme)) {
        console.warn('[Security] Blocked dangerous URL scheme:', url);
        return '';
    }

    return escapeUrl(normalized);
}

/**
 * Detect interpolation context by analyzing preceding string
 * Returns: { type, tagName, attrName }
 * type: 'content' | 'attribute' | 'url' | 'event-handler' | 'dangerous' | 'tag' | 'custom-element-attr'
 */
function detectContext(precedingString) {
    // Look at last 300 characters for context
    const relevant = precedingString.slice(-300);

    // Remove HTML comments (they can hide context)
    const withoutComments = relevant.replace(/<!--[\s\S]*?-->/g, '');

    const lastOpenTag = withoutComments.lastIndexOf('<');
    const lastCloseTag = withoutComments.lastIndexOf('>');

    // If > comes after <, we're in content (between tags)
    if (lastCloseTag > lastOpenTag) {
        return { type: 'content' };
    }

    // We're inside a tag - check if we're in an attribute value
    const afterTag = withoutComments.slice(lastOpenTag);

    // Extract tag name
    const tagMatch = afterTag.match(/^<([\w-]+)/);
    const tagName = tagMatch ? tagMatch[1].toLowerCase() : '';

    // Match attribute pattern: attribute-name="value or attribute-name='value
    const attrMatch = afterTag.match(/\s([\w-]+)\s*=\s*["']([^"']*)$/);

    if (!attrMatch) {
        // Inside tag but not in attribute value
        return { type: 'tag', tagName };
    }

    const attrName = attrMatch[1].toLowerCase();

    // Block event handlers (onclick, onload, etc.)
    if (attrName.startsWith('on')) {
        return { type: 'event-handler', tagName, attrName };
    }

    // Detect URL attributes
    if (URL_ATTRIBUTES.has(attrName)) {
        return { type: 'url', tagName, attrName };
    }

    // Detect dangerous attributes
    if (DANGEROUS_ATTRIBUTES.has(attrName)) {
        return { type: 'dangerous', tagName, attrName };
    }

    // Check if this is a custom element (has hyphen in tag name)
    if (tagName.includes('-')) {
        return { type: 'custom-element-attr', tagName, attrName };
    }

    // Regular attribute - return attribute name for boolean handling
    return { type: 'attribute', tagName, attrName };
}

// Feature flag for compiled templates (set to true to enable experimental compiler)
export const USE_COMPILED_TEMPLATES = true;

/**
 * Tagged template literal with automatic context-aware escaping
 *
 * Can use compiled templates for performance (when USE_COMPILED_TEMPLATES = true):
 * - Parses template once and caches
 * - Creates structured tree
 * - Fills slots on each render
 * - No regex parsing on render!
 *
 * Returns a special object that can be nested without double-escaping
 */
export function html(strings, ...values) {
    // All templates now use the compiled path
    if (!html._useCompiled || !html._compiler) {
        console.error('[html] Template compiler not initialized. Call html.init(templateCompiler) first.');
        return {
            [HTML_MARKER]: true,
            _compiled: null,
            _values: [],
            toString() {
                return '<!-- template compiler not initialized -->';
            }
        };
    }

    try {
        const { compileTemplate } = html._compiler;
        const compiled = compileTemplate(strings);

        return {
            [HTML_MARKER]: true,
            _compiled: compiled,
            _values: values,
            toString() {
                // Compiled templates are rendered via Preact, not strings
                // This is only for backward compat with legacy code/debugging
                return '<!-- compiled template -->';
            }
        };
    } catch (error) {
        console.error('[html] Template compilation failed:', error);
        return {
            [HTML_MARKER]: true,
            _compiled: null,
            _values: [],
            toString() {
                return '<!-- compilation error -->';
            }
        };
    }
}

/**
 * Mark string as safe raw HTML (use sparingly!)
 * Only use this for content you absolutely trust (e.g., your own API responses)
 * Security: Use Symbol for trust verification (JSON can't fake this)
 */
export function raw(htmlString) {
    return {
        [RAW_MARKER]: true,
        toString() {
            return htmlString;
        }
    };
}

/**
 * For debugging: check what context would be detected
 */
export function debugContext(templateString) {
    return detectContext(templateString);
}

/**
 * Check if a string is a prop marker and retrieve the actual value
 * Note: With compiled templates, prop markers are no longer used.
 * This function is kept for backward compatibility and always returns null.
 */
export function getPropValue(str) {
    return null;
}

/**
 * Check if a string is an event handler marker and retrieve the function
 * Note: With compiled templates, event markers are no longer used.
 * This function is kept for backward compatibility and always returns null.
 */
export function getEventHandler(str) {
    return null;
}

/**
 * Conditional rendering helper
 * Returns thenValue if condition is truthy, otherwise returns elseValue (default: null)
 * Preact handles null children natively, no keys needed
 * @param {boolean} condition - Condition to evaluate
 * @param {*} thenValue - Value to return if condition is true
 * @param {*} elseValue - Value to return if condition is false (default: null)
 */
export function when(condition, thenValue, elseValue = null) {
    const result = condition ? thenValue : elseValue;

    // Preact handles null/false natively - just return it
    if (!result) {
        if (USE_COMPILED_TEMPLATES) {
            // Return null wrapped in compiled structure
            return {
                [HTML_MARKER]: true,
                _compiled: null,  // Preact handles null children
                toString() {
                    return '';
                }
            };
        }
        return raw('');
    }

    // Handle html template objects (check Symbol for security)
    if (isHtml(result)) {
        // Mark as wrapped so applyValues doesn't convert to HTML string
        if (result._compiled) {
            return {
                ...result,
                _compiled: {
                    ...result._compiled,
                    wrapped: true
                }
            };
        }
        return result;
    }

    // Handle functions (lazy evaluation)
    if (typeof result === 'function') {
        return when(condition, result());
    }

    // Otherwise return as-is
    return result;
}

/**
 * Loop rendering helper with optional key support
 * Maps array items to templates and returns safe concatenated HTML or compiled fragment
 * @param {Array} array - Array to iterate over
 * @param {Function} mapFn - Function to map each item to a template
 * @param {Function} [keyFn] - Optional function to extract unique key from each item (e.g., item => item.id)
 */
export function each(array, mapFn, keyFn = null) {
    if (!array || !Array.isArray(array)) {
        // Return empty fragment (not raw HTML) to maintain consistent type
        if (USE_COMPILED_TEMPLATES) {
            return {
                [HTML_MARKER]: true,
                _compiled: {
                    type: 'fragment',
                    wrapped: false,
                    children: []
                },
                toString() {
                    return '';
                }
            };
        }
        return raw('');
    }

    const results = array.map((item, index) => {
        const result = mapFn(item, index);

        // If keyFn provided and result has compiled template, add key to the node
        if (keyFn && result && result._compiled) {
            const key = keyFn(item);
            // Attach key to the compiled node
            return {
                ...result,
                _compiled: {
                    ...result._compiled,
                    key: key
                }
            };
        }

        return result;
    });

    // Check if results contain compiled templates
    const hasCompiled = results.some(r => r && r._compiled);

    // Always use compiled templates if enabled (even for empty arrays to maintain consistent type)
    if (USE_COMPILED_TEMPLATES && (hasCompiled || results.length === 0)) {
        // Extract compiled trees from results, keeping track of original item index
        // IMPORTANT: Also preserve _values from nested templates
        const compiledChildren = results
            .map((r, itemIndex) => {
                if (!r || !r._compiled) return null;

                const child = r._compiled;
                const childValues = r._values;  // Preserve values from nested template

                // Skip whitespace-only text nodes
                if (child.type === 'text' && child.value && /^\s*$/.test(child.value)) {
                    return null;
                }

                // If unwrapped fragment with single element child, unwrap and move key to element
                // This is needed for Preact's keyed reconciliation (keys must be on elements, not fragments)
                if (child.type === 'fragment' && !child.wrapped && child.children.length === 1 && child.children[0].type === 'element') {
                    const element = child.children[0];
                    const key = keyFn ? keyFn(array[itemIndex]) : itemIndex;
                    return {...element, key, _itemValues: childValues};
                }

                // For multi-child fragments or other nodes, keep as-is
                // Set key for Preact reconciliation
                const key = keyFn ? keyFn(array[itemIndex]) : itemIndex;
                return {...child, key, _itemValues: childValues};
            })
            .filter(Boolean);

        // Minimal logging - uncomment for debugging
        // console.log('[each]', compiledChildren.length, 'items');

        // For compiled templates, return a fragment containing all compiled nodes
        return {
            [HTML_MARKER]: true,
            _compiled: {
                type: 'fragment',
                wrapped: false,  // Unwrapped fragments spread their children into parent
                fromEach: true,   // Mark as from each() to distinguish from nested html() templates
                children: compiledChildren
            },
            toString() {
                // Fallback for string-based rendering
                return results.map(r => {
                    if (isHtml(r)) {
                        return r.toString();
                    }
                    return escapeHtml(r);
                }).join('');
            }
        };
    }

    // String-based path (legacy)
    const joined = results.map(r => {
        if (isHtml(r)) {
            return r.toString();
        }
        return escapeHtml(r);
    }).join('');

    return raw(joined);
}
/**
 * Convert compiled tree to HTML string (for backwards compatibility)
 * @param {Object} tree - Compiled template tree
 * @returns {string} HTML string
 */
function treeToString(tree) {
    if (!tree) return '';

    if (tree.type === 'text') {
        return tree.value || '';
    }

    if (tree.type === 'html') {
        return tree.value || '';
    }

    if (tree.type === 'fragment') {
        return tree.children.map(treeToString).join('');
    }

    if (tree.type === 'element') {
        const {tag, attrs = {}, children = []} = tree;
        const attrStr = Object.entries(attrs)
            .map(([name, value]) => {
                if (value && typeof value === 'object' && value.propValue !== undefined) {
                    return ''; // Skip object props in string representation
                }
                return value === '' ? name : `${name}="${value}"`;
            })
            .filter(Boolean)
            .join(' ');

        const childrenStr = children.map(treeToString).join('');

        const attrsPart = attrStr ? ` ${attrStr}` : '';

        // Void elements
        const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
        if (voidElements.has(tag)) {
            return `<${tag}${attrsPart}>`;
        }

        return `<${tag}${attrsPart}>${childrenStr}</${tag}>`;
    }

    return '';
}

/**
 * Register the template compiler for use with html() function
 * Call this to enable compiled template mode
 * @param {Object} compiler - Compiler module with compileTemplate and applyValues
 */
export function registerTemplateCompiler(compiler) {
    html._compiler = compiler;
    html._useCompiled = true;
}

// Auto-register compiled template system if enabled
if (USE_COMPILED_TEMPLATES) {
    registerTemplateCompiler(templateCompiler);
    console.log('[Template] Compiled template system enabled');
}
