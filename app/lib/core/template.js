/**
 * Template System with Automatic Context-Aware Security
 * Provides XSS protection by automatically detecting interpolation context
 */

import * as templateCompiler from './template-compiler.js';

// Security: Use Symbols to prevent spoofing of trusted content markers
// Symbols are private - only helper functions are exported
const HTML_MARKER = Symbol('html');
const RAW_MARKER = Symbol('raw');

// Render context - tracks current component during template evaluation
// This allows helpers like memoEach to access component-scoped caches
let currentRenderComponent = null;

// Call-site counter for memoEach (like React hook call order)
let memoEachCallIndex = 0;

/**
 * Set the current render context (called by component system)
 * @param {object|null} component - The component being rendered, or null to clear
 */
export function setRenderContext(component) {
    currentRenderComponent = component;
    // Reset memoEach call index at start of each component render
    memoEachCallIndex = 0;
}

/**
 * Get the current render context
 * @returns {object|null} The component being rendered, or null
 */
export function getRenderContext() {
    return currentRenderComponent;
}

// Helper functions to check markers (safe API for other code)
export const isHtml = (obj) => obj && obj[HTML_MARKER] === true;
export const isRaw = (obj) => obj && obj[RAW_MARKER] === true;

// Op codes for the instruction-based system
export const OP = {
    STATIC: 0,      // Return pre-built VNode
    SLOT: 1,        // Insert dynamic value from slot
    TEXT: 2,        // Static text
    ELEMENT: 3,     // Build element with props/children
    FRAGMENT: 4,    // Build fragment
};

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
 * Sanitize URL - blocks dangerous schemes like javascript:
 * No HTML escaping needed since URLs go into Preact props, not raw HTML strings.
 * Preact sets href/src/action as DOM properties, so the browser handles them directly.
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
        return normalized;
    }

    const scheme = schemeMatch[1].toLowerCase();

    // Allowlist of safe schemes
    const safeSchemes = ['http', 'https', 'mailto', 'tel', 'sms', 'ftp', 'ftps'];

    if (!safeSchemes.includes(scheme)) {
        console.warn('[Security] Blocked dangerous URL scheme:', url);
        return '';
    }

    return normalized;
}

/**
 * Tagged template literal with automatic context-aware escaping
 *
 * Uses compiled templates for performance:
 * - Parses template once and caches
 * - Creates structured tree
 * - Fills slots on each render
 * - No regex parsing on render!
 *
 * Returns a special object that can be nested without double-escaping
 */
export function html(strings, ...values) {
    const { compileTemplate } = html._compiler;
    const compiled = compileTemplate(strings);

    return {
        [HTML_MARKER]: true,
        _compiled: compiled,
        _values: values,
        toString() {
            return '';  // Not used in production
        }
    };
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
 * Conditional rendering helper
 * Returns thenValue if condition is truthy, otherwise returns elseValue (default: null)
 * Preact handles null children natively, no keys needed
 * @param {boolean} condition - Condition to evaluate
 * @param {*} thenValue - Value to return if condition is true
 * @param {*} elseValue - Value to return if condition is false (default: null)
 */
export function when(condition, thenValue, elseValue = null) {
    let result = condition ? thenValue : elseValue;

    if (typeof result === 'function') {
        result = result();
    }

    // Preact handles null/false natively - just return it
    if (!result) {
        // Return null wrapped in compiled structure
        return {
            [HTML_MARKER]: true,
            _compiled: {
                op: OP.STATIC,
                vnode: null,
                type: 'fragment',
                wrapped: false,
                children: []
            },
            toString() {
                return '';
            }
        };
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
        // Return empty fragment
        return {
            [HTML_MARKER]: true,
            _compiled: {
                op: OP.STATIC,
                vnode: null,
                type: 'fragment',
                wrapped: false,
                children: []
            },
            toString() {
                return '';
            }
        };
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

    // Return a fragment containing all compiled nodes
    return {
        [HTML_MARKER]: true,
        _compiled: {
            op: OP.FRAGMENT,
            type: 'fragment',
            wrapped: false,  // Unwrapped fragments spread their children into parent
            fromEach: true,   // Mark as from each() to distinguish from nested html() templates
            children: compiledChildren
        },
        toString() {
            return '';  // Not used in production
        }
    };
}

/**
 * Create a memoization cache for use with memoEach().
 * Should be created once per component (e.g., in mounted() or as instance property).
 *
 * @returns {Map} Cache map for memoEach
 *
 * @example
 * mounted() {
 *     this._songCache = createMemoCache();
 * }
 */
export function createMemoCache() {
    return new Map();
}

/**
 * Memoized version of each() - caches rendered templates per item key.
 * Only re-renders items that have changed (by reference).
 *
 * If called within a component's template(), automatically uses component-scoped caching.
 * Can also pass an explicit cache for manual control.
 *
 * @param {Array} array - Array to iterate over
 * @param {Function} mapFn - Function to map each item to a template
 * @param {Function} keyFn - Function to extract unique key from each item (REQUIRED for memoization)
 * @param {Map} [cache] - Optional explicit cache (if omitted, uses automatic component-scoped cache)
 * @returns {Object} Compiled fragment template
 *
 * @example
 * // Automatic caching (recommended) - cache is managed automatically per component
 * template() {
 *     return html`
 *         ${memoEach(this.state.songs, song => html`
 *             <div class="song">${song.title}</div>
 *         `, song => song.uuid)}
 *     `;
 * }
 *
 * @example
 * // Explicit cache (for advanced use cases)
 * mounted() {
 *     this._songCache = createMemoCache();
 * }
 * template() {
 *     return html`
 *         ${memoEach(this.state.songs, song => html`...`, song => song.uuid, this._songCache)}
 *     `;
 * }
 */
export function memoEach(array, mapFn, keyFn, cache) {
    if (!array || !Array.isArray(array)) {
        // Increment call index even for empty arrays to maintain call order
        if (currentRenderComponent) memoEachCallIndex++;
        return {
            [HTML_MARKER]: true,
            _compiled: {
                op: OP.STATIC,
                vnode: null,
                type: 'fragment',
                wrapped: false,
                children: []
            },
            toString() { return ''; }
        };
    }

    if (!keyFn) {
        // No keyFn - fall back to regular each() (no memoization possible)
        return each(array, mapFn, null);
    }

    // Get or create cache
    let effectiveCache = cache;
    if (!effectiveCache && currentRenderComponent) {
        // Automatic caching: store cache on component keyed by call-site index
        const callIndex = memoEachCallIndex++;
        if (!currentRenderComponent._memoEachCaches) {
            currentRenderComponent._memoEachCaches = new Map();
        }
        effectiveCache = currentRenderComponent._memoEachCaches.get(callIndex);
        if (!effectiveCache) {
            effectiveCache = new Map();
            currentRenderComponent._memoEachCaches.set(callIndex, effectiveCache);
        }
    }

    if (!effectiveCache) {
        // No cache available (not in component context and no explicit cache)
        return each(array, mapFn, keyFn);
    }

    // Track which keys are in current render (for cleanup)
    const currentKeys = new Set();

    const results = array.map((item, index) => {
        const key = keyFn(item);
        currentKeys.add(key);

        // Check cache - hit if same key AND same item reference
        const cached = effectiveCache.get(key);
        if (cached && cached.item === item) {
            // Cache hit - return cached compiled template
            return cached.result;
        }

        // Cache miss - render and cache
        const result = mapFn(item, index);

        // Add key to the compiled result
        if (result && result._compiled) {
            const keyedResult = {
                ...result,
                _compiled: {
                    ...result._compiled,
                    key: key
                }
            };
            effectiveCache.set(key, { item, result: keyedResult });
            return keyedResult;
        }

        effectiveCache.set(key, { item, result });
        return result;
    });

    // Clean up stale cache entries (items no longer in array)
    for (const key of effectiveCache.keys()) {
        if (!currentKeys.has(key)) {
            effectiveCache.delete(key);
        }
    }

    // Extract compiled children (same logic as each())
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
                const key = keyFn(array[itemIndex]);
                return {...element, key, _itemValues: childValues};
            }

            const key = keyFn(array[itemIndex]);
            return {...child, key, _itemValues: childValues};
        })
        .filter(Boolean);

    return {
        [HTML_MARKER]: true,
        _compiled: {
            op: OP.FRAGMENT,
            type: 'fragment',
            wrapped: false,
            fromEach: true,
            children: compiledChildren
        },
        toString() { return ''; }
    };
}

/**
 * Async content rendering helper (like Promise.then with loading state)
 * Returns an <x-await-then> component that manages its own loading/resolved/error state.
 * The component automatically re-renders when the promise resolves.
 *
 * @param {Promise|any} promiseOrValue - Promise to await, or immediate value
 * @param {Function} thenFn - Function to render resolved data: (data) => html`...`
 * @param {*} pendingContent - Content to show while loading
 * @param {Function|*} [catchFn] - Content or function for errors: (error) => html`...`
 * @returns {Object} html template containing x-await-then component
 *
 * @example
 * // Direct promise - no state management needed!
 * template() {
 *     return html`
 *         ${awaitThen(
 *             fetchUser(123),
 *             user => html`<div>${user.name}</div>`,
 *             html`<loading-spinner></loading-spinner>`,
 *             error => html`<div class="error">${error.message}</div>`
 *         )}
 *     `;
 * }
 *
 * @example
 * // With cached promise (prevents re-fetch on parent re-render)
 * data() { return { userPromise: null }; },
 * mounted() { this.state.userPromise = fetchUser(123); },
 * template() {
 *     return html`
 *         ${awaitThen(this.state.userPromise, user => html`...`, loading)}
 *     `;
 * }
 */
export function awaitThen(promiseOrValue, thenFn, pendingContent, catchFn = null) {
    return html`
        <x-await-then
            promise="${promiseOrValue}"
            then="${thenFn}"
            pending="${pendingContent}"
            catch="${catchFn}">
        </x-await-then>
    `;
}

// Initialize template compiler at module load
html._compiler = templateCompiler;
