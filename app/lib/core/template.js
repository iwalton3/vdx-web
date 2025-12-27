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
    // OPTIMIZATION: When using function forms, cache result based on condition
    // This prevents re-evaluating branches when unrelated state changes
    // Note: Only works with function forms - document this in tutorials
    const isFunctionForm = typeof thenValue === 'function' || typeof elseValue === 'function';

    if (isFunctionForm && currentRenderComponent) {
        // Use thenValue function reference as cache key (stable across renders)
        if (!currentRenderComponent._whenCaches) {
            currentRenderComponent._whenCaches = new WeakMap();
        }

        // Get or create cache for this when() call site
        const cacheKey = typeof thenValue === 'function' ? thenValue : elseValue;
        if (cacheKey && typeof cacheKey === 'function') {
            let cacheData = currentRenderComponent._whenCaches.get(cacheKey);
            if (!cacheData) {
                cacheData = { lastCondition: undefined, lastResult: null };
                currentRenderComponent._whenCaches.set(cacheKey, cacheData);
            }

            // Check if condition is unchanged (compare truthy/falsy)
            const conditionTruthy = !!condition;
            if (cacheData.lastCondition === conditionTruthy && cacheData.lastResult) {
                return cacheData.lastResult;
            }

            // Condition changed - evaluate and cache
            cacheData.lastCondition = conditionTruthy;
            let result = condition ? thenValue : elseValue;
            if (typeof result === 'function') {
                result = result();
            }
            if (!result) {
                cacheData.lastResult = EMPTY_WHEN_RESULT;
                return EMPTY_WHEN_RESULT;
            }
            cacheData.lastResult = result;
            return result;
        }
    }

    // Non-function form or no component context - evaluate normally
    let result = condition ? thenValue : elseValue;

    if (typeof result === 'function') {
        result = result();
    }

    // Null/false returns empty template for stable reference in fine-grained diffing
    if (!result) {
        return EMPTY_WHEN_RESULT;
    }

    // Handle html template objects (check Symbol for security)
    if (isHtml(result)) {
        // Return directly to preserve stable _compiled reference
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

    // Get or create cache for this component
    // Uses mapFn.toString() as call-site identifier to scope caches correctly.
    // This allows proper cleanup of stale items without affecting other memoEach calls.
    let effectiveCache = null;

    // Handle explicit cache parameter (backward compatibility)
    if (cache) {
        if (cache instanceof Map) {
            effectiveCache = cache;
        } else if (cache.itemCache) {
            effectiveCache = cache.itemCache;
        }
    } else if (currentRenderComponent) {
        // Use mapFn + keyFn source as call-site identifier (stable across renders)
        // This differentiates even if mapFn is identical but keyFn differs
        const callSiteId = mapFn.toString() + '||' + keyFn.toString();
        if (!currentRenderComponent._memoCallSiteCaches) {
            currentRenderComponent._memoCallSiteCaches = new Map();
        }
        if (!currentRenderComponent._memoCallSiteCaches.has(callSiteId)) {
            currentRenderComponent._memoCallSiteCaches.set(callSiteId, new Map());
        }
        effectiveCache = currentRenderComponent._memoCallSiteCaches.get(callSiteId);
    }

    if (!effectiveCache) {
        // No cache available (not in component context and no explicit cache)
        return each(array, mapFn, keyFn);
    }

    const results = array.map((item, index) => {
        const key = keyFn(item, index);

        // Check cache - hit only if same key AND same item reference
        // Reference check ensures re-render when item data changes
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


    // NOTE: We intentionally do NOT clean up stale cache entries here.
    // For virtualized/windowed lists, items scroll in and out of view frequently.
    // Cleaning up items not in the current array would force re-rendering when
    // scrolling back. The cache is scoped to the component and cleaned up on unmount.

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
                const key = keyFn(array[itemIndex], itemIndex);
                return {...element, key, _itemValues: childValues};
            }

            const key = keyFn(array[itemIndex], itemIndex);
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
            hasExplicitKeys: true,  // memoEach always has explicit keys
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
