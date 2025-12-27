/**
 * Template System with Automatic Context-Aware Security
 * Provides XSS protection by automatically detecting interpolation context
 */

import * as templateCompiler from './template-compiler.js';

// Security: Use Symbols to prevent spoofing of trusted content markers
// Symbols are private - only helper functions are exported
const HTML_MARKER = Symbol('html');
const RAW_MARKER = Symbol('raw');
const CONTAIN_MARKER = Symbol('contain');
const MEMO_EACH_MARKER = Symbol('memoEach');
const WHEN_MARKER = Symbol('when');

// Render context - tracks current component during template evaluation
// This allows helpers like memoEach to access component-scoped caches
let currentRenderComponent = null;

/**
 * Set the current render context (called by component system)
 * @param {object|null} component - The component being rendered, or null to clear
 */
export function setRenderContext(component) {
    currentRenderComponent = component;
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
export const isContain = (obj) => obj && obj[CONTAIN_MARKER] === true;
export const isMemoEach = (obj) => obj && obj[MEMO_EACH_MARKER] === true;
export const isWhen = (obj) => obj && obj[WHEN_MARKER] === true;

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
 * No HTML escaping needed since URLs are set as DOM properties directly.
 * The browser handles href/src/action properties natively.
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
 * @param {boolean} condition - Condition to evaluate
 * @param {*} thenValue - Value to return if condition is true
 * @param {*} elseValue - Value to return if condition is false (default: null)
 */
// Cached empty template for when() false case - stable reference for fine-grained diffing
const EMPTY_COMPILED = {
    op: OP.STATIC,
    template: null,
    type: 'fragment',
    wrapped: false,
    children: []
};
const EMPTY_WHEN_RESULT = {
    [HTML_MARKER]: true,
    _compiled: EMPTY_COMPILED,
    toString() {
        return '';
    }
};

export function when(condition, thenValue, elseValue = null) {
    const isFunctionForm = typeof thenValue === 'function' || typeof elseValue === 'function';

    // For function forms, return a marker object that gets cached at DOM position
    // This fixes the bug where the same function used in multiple when() calls shares cache
    if (isFunctionForm) {
        return {
            [WHEN_MARKER]: true,
            [HTML_MARKER]: true,  // Mark as html-like so slot renderer handles it
            _condition: !!condition,
            _thenValue: thenValue,
            _elseValue: elseValue,
            _compiled: {
                op: OP.SLOT,
                type: 'when'
            },
            toString() { return '[when]'; }
        };
    }

    // Non-function form - evaluate immediately (no caching benefit)
    const result = condition ? thenValue : elseValue;

    // Null/false returns empty template for stable reference in fine-grained diffing
    if (!result) {
        return EMPTY_WHEN_RESULT;
    }

    // Handle html template objects (check Symbol for security)
    if (isHtml(result)) {
        return result;
    }

    // Otherwise return as-is (primitives, etc)
    return result;
}

/**
 * Create a reactive boundary - isolates state tracking from parent template.
 * Use this to prevent high-frequency state updates (like currentTime) from
 * causing the entire parent template to re-render.
 *
 * The render function is evaluated in its own isolated effect, so only state
 * accessed within the function triggers re-renders of this boundary.
 *
 * @param {Function} renderFn - Function that returns html template
 * @returns {Object} Contained template result
 *
 * @example
 * // Without contain: entire template re-renders when currentTime changes
 * template() {
 *     return html`
 *         <div class="queue">${memoEach(this.state.queue, ...)}</div>
 *         <div class="time">${this.stores.player.currentTime}</div>
 *     `;
 * }
 *
 * // With contain: only the time display re-renders
 * template() {
 *     return html`
 *         <div class="queue">${memoEach(this.state.queue, ...)}</div>
 *         ${contain(() => html`
 *             <div class="time">${this.stores.player.currentTime}</div>
 *         `)}
 *     `;
 * }
 */
export function contain(renderFn) {
    if (typeof renderFn !== 'function') {
        console.warn('[contain] Expected a function, got:', typeof renderFn);
        return renderFn;
    }

    // Return a special marker object that template-renderer will handle
    // by creating an isolated effect for this boundary
    return {
        [CONTAIN_MARKER]: true,
        [HTML_MARKER]: true,  // Also mark as html so it's handled as a slot value
        _renderFn: renderFn,
        _compiled: {
            op: OP.SLOT,
            type: 'contain',
            isContain: true
        },
        toString() { return '[contain]'; }
    };
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
                template: null,
                type: 'fragment',
                wrapped: false,
                children: []
            },
            toString() {
                return '';
            }
        };
    }

    // NOTE: We intentionally DON'T cache each() results based on array reference.
    // The mapFn may access reactive state (e.g., this.isGroupExpanded(item)) that
    // changes even when the array reference is unchanged. Fine-grained reactivity
    // requires re-evaluating the mapFn on each template() call.
    // For performance with large arrays, use memoEach() instead.

    const results = array.map((item, index) => {
        const result = mapFn(item, index);

        // If keyFn provided and result has compiled template, add key to the node
        if (keyFn && result && result._compiled) {
            const key = keyFn(item, index);
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
            // This is needed for keyed reconciliation (keys must be on elements, not fragments)
            if (child.type === 'fragment' && !child.wrapped && child.children.length === 1 && child.children[0].type === 'element') {
                const element = child.children[0];
                const key = keyFn ? keyFn(array[itemIndex], itemIndex) : itemIndex;
                return {...element, key, _itemValues: childValues};
            }

            // For multi-child fragments or other nodes, keep as-is
            // Set key for list reconciliation
            const key = keyFn ? keyFn(array[itemIndex], itemIndex) : itemIndex;
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
            hasExplicitKeys: !!keyFn,  // Only use keyed reconciliation when user provides keys
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
 * Only re-renders items that have changed (by reference, or by key if trustKey is true).
 *
 * If called within a component's template(), automatically uses component-scoped caching.
 *
 * @param {Array} array - Array to iterate over
 * @param {Function} mapFn - Function to map each item to a template
 * @param {Function} keyFn - Function to extract unique key from each item (REQUIRED for memoization)
 * @param {Object} [options] - Options object
 * @param {boolean} [options.trustKey=false] - If true, only compare keys (not item references). Useful for virtual scroll.
 * @param {Array} [options.deps] - External dependencies array. When any value changes, ALL items re-render.
 * @param {Map} [options.cache] - Explicit cache Map (for advanced use cases)
 * @returns {Object} Compiled fragment template
 *
 * @example
 * // Basic usage - cache is managed automatically
 * ${memoEach(this.state.songs, song => html`
 *     <div class="song">${song.title}</div>
 * `, song => song.uuid)}
 *
 * @example
 * // With trustKey for virtual scroll (items may be different object refs with same key)
 * ${memoEach(this.state.songs, song => html`...`, song => song.uuid, { trustKey: true })}
 *
 * @example
 * // With deps for external state (busts ALL item caches when selection changes)
 * ${memoEach(this.state.items, (item, idx) => {
 *     const isSelected = this.state.selectedIndex === idx;
 *     return html`<div class="${isSelected ? 'selected' : ''}">${item.name}</div>`;
 * }, item => item.id, { deps: [this.state.selectedIndex] })}
 */
export function memoEach(array, mapFn, keyFn, options) {
    if (!array || !Array.isArray(array)) {
        return {
            [HTML_MARKER]: true,
            _compiled: {
                op: OP.STATIC,
                template: null,
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

    // Support both old API (cache as Map) and new API (options object)
    // Old: memoEach(arr, fn, keyFn, cacheMap)
    // New: memoEach(arr, fn, keyFn, { cache, trustKey, deps })
    let cache = null;
    let trustKey = false;
    let deps = null;

    if (options) {
        if (options instanceof Map || options?.itemCache) {
            // Backward compatibility: options is a cache Map or cache object
            cache = options;
        } else if (typeof options === 'object') {
            // New API: options object
            cache = options.cache || null;
            trustKey = options.trustKey || false;
            deps = options.deps || null;  // External dependencies that bust all caches when changed
        }
    }

    // Return a marker object that template-renderer will handle
    // The caching is done at the slot level (DOM location) for stable identity
    return {
        [MEMO_EACH_MARKER]: true,
        [HTML_MARKER]: true,
        _array: array,
        _mapFn: mapFn,
        _keyFn: keyFn,
        _explicitCache: cache,  // Optional explicit cache for backward compatibility
        _trustKey: trustKey,    // When true, skip item reference check - trust key alone
        _deps: deps,            // External deps array - when any value changes, bust all caches
        _compiled: {
            op: OP.SLOT,
            type: 'memoEach'
        },
        toString() { return '[memoEach]'; }
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
