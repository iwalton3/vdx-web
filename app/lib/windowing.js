/**
 * Windowing Controller
 *
 * Rendering-agnostic virtual-scroll math, extracted from cl-virtual-list and
 * the inline windowing implementations it was distilled from. The controller
 * owns the window state (visibleStart/visibleEnd/offsetY/totalHeight) and the
 * scroll/resize plumbing; the component owns the markup.
 *
 * Usage (component with its own markup):
 *
 *     import { createWindowing } from './lib/windowing.js';
 *
 *     data() {
 *         // Created in data() so windowing state exists for the first render
 *         this._win = createWindowing(this, {
 *             itemHeight: 52,
 *             buffer: 10,
 *             count: () => this.state.items.length,
 *             onRange: (start, end) => this.maybeLoadMore(end)
 *         });
 *         return { items: untracked([]) };
 *     },
 *     unmounted() { this._win.destroy(); },
 *     template() {
 *         const win = this._win;
 *         return html`
 *             <div class="spacer" style="height: ${win.totalHeight}px;"></div>
 *             <div class="window" style="transform: translateY(${win.offsetY}px);">
 *                 ${memoEach(this.state.items.slice(win.visibleStart, win.visibleEnd),
 *                     item => html`...`, item => item.id, { trustKey: true })}
 *             </div>
 *         `;
 *     }
 *
 * Reading win.visibleStart / visibleEnd / offsetY / totalHeight in a template
 * tracks them reactively - the template re-renders when the window moves.
 * Range commits are flushSync'd so window position and contents land in the
 * same animation frame (no tearing during fast scroll).
 *
 * If the item source is untracked() or lives in props, call win.refresh()
 * after changing it (reactive arrays are tracked automatically via count()).
 */

import { reactive, flushSync, withoutTracking, createEffect } from './framework.js';
import { rafThrottle } from './utils.js';

/**
 * Resolve a number-or-function option
 * @private
 */
function resolve(value, fallback) {
    const v = typeof value === 'function' ? value() : value;
    return (v === undefined || v === null || Number.isNaN(v)) ? fallback : v;
}

/**
 * Find the nearest scrollable ancestor of an element
 * @private
 */
function findScrollableParent(el) {
    let parent = el.parentElement;
    while (parent) {
        const style = getComputedStyle(parent);
        const overflow = style.overflow + style.overflowY;
        if (overflow.includes('auto') || overflow.includes('scroll')) {
            return parent;
        }
        parent = parent.parentElement;
    }
    return null;
}

/**
 * Create a windowing controller for virtual scrolling.
 *
 * @param {HTMLElement} host - The element the list lives in. Used for scroll
 *     listening in 'self' mode, position math in 'parent'/'window' modes,
 *     and resize observation.
 * @param {Object} options
 * @param {number|(() => number)} options.itemHeight - Fixed row height in px (required)
 * @param {(() => number)} options.count - Returns the total item count (required).
 *     If this reads reactive state, item-count changes update the window automatically.
 * @param {number|(() => number)} [options.buffer=10] - Extra rows rendered above/below the viewport
 * @param {string|HTMLElement} [options.scrollContainer='self'] - 'self' | 'parent' |
 *     'window' | CSS selector | element
 * @param {number|(() => number)} [options.fallbackHeight=400] - Viewport height used
 *     before the container can be measured
 * @param {(start: number, end: number) => void} [options.onRange] - Called after the
 *     visible range changes (use for on-demand loading)
 * @returns {Object} controller - reactive getters { visibleStart, visibleEnd, offsetY,
 *     totalHeight, scrollTop, containerHeight } and methods { refresh, scrollToIndex,
 *     scrollToTop, scrollToBottom, setScrollContainer, destroy }
 */
export function createWindowing(host, options) {
    const opts = options || {};
    if (!host || !opts.itemHeight || typeof opts.count !== 'function') {
        throw new Error('[windowing] createWindowing(host, { itemHeight, count }) - host, itemHeight, and count are required');
    }

    const itemHeight = () => resolve(opts.itemHeight, 1);
    const buffer = () => resolve(opts.buffer, 10);
    const fallbackHeight = () => resolve(opts.fallbackHeight, 400);

    // Pre-measurement estimate so the first render shows a sensible window.
    // Option functions may not be evaluable yet at creation time (e.g. when
    // created in data() before component state exists) - fall back and let
    // the deferred attach below compute the real range.
    let initialEnd = 20;
    try {
        initialEnd = Math.ceil(fallbackHeight() / itemHeight()) + buffer();
    } catch {
        // Options not ready pre-mount; the attach microtask recomputes
    }

    // Reactive window state - template reads of the getters below track these
    const state = reactive({
        scrollTop: 0,
        containerHeight: 0,
        visibleStart: 0,
        visibleEnd: initialEnd
    });

    let scrollTarget = null;
    let scrollHandler = null;
    let scrollMode = opts.scrollContainer || 'self';
    let resizeObserver = null;
    let countEffect = null;
    let destroyed = false;

    function measureHeight() {
        if (scrollMode === 'self') {
            return host.clientHeight || fallbackHeight();
        }
        if (scrollTarget === window) {
            return window.innerHeight;
        }
        if (scrollTarget) {
            return scrollTarget.clientHeight;
        }
        return fallbackHeight();
    }

    function measureScrollTop() {
        if (scrollMode === 'self') {
            return host.scrollTop;
        }
        if (scrollTarget === window) {
            // Position of the list relative to the viewport
            const rect = host.getBoundingClientRect();
            return Math.max(0, -rect.top);
        }
        if (scrollTarget) {
            const parentRect = scrollTarget.getBoundingClientRect();
            const thisRect = host.getBoundingClientRect();
            return Math.max(0, parentRect.top - thisRect.top);
        }
        return 0;
    }

    function updateVisibleRange() {
        if (destroyed) return;

        const rowH = itemHeight();
        const buf = buffer();
        // Count is read untracked here: the count effect below owns reactive
        // tracking; this avoids double-triggering from scroll handlers
        const total = withoutTracking(() => opts.count());

        const first = Math.floor(state.scrollTop / rowH);
        const visibleCount = Math.ceil((state.containerHeight || fallbackHeight()) / rowH);

        let newStart = Math.max(0, first - buf);
        let newEnd = Math.min(total, first + visibleCount + buf);

        // Bottom-locking: never let the rendered window extend past the list
        // end (prevents blank space / scroll-height jumps at the bottom)
        const renderCount = newEnd - newStart;
        newStart = Math.min(newStart, Math.max(0, total - renderCount));

        if (state.visibleStart !== newStart || state.visibleEnd !== newEnd) {
            // flushSync: commit position (translateY) and contents (slice) in
            // THIS frame - scroll handlers run inside rAF, and attribute-only
            // updates would otherwise batch to the next frame (tearing)
            flushSync(() => {
                state.visibleStart = newStart;
                state.visibleEnd = newEnd;
            });
            if (typeof opts.onRange === 'function') {
                opts.onRange(newStart, newEnd);
            }
        }
    }

    function handleScroll() {
        if (destroyed) return;
        state.scrollTop = measureScrollTop();
        updateVisibleRange();
    }

    function updateDimensions() {
        if (destroyed) return;
        const newHeight = measureHeight();
        if (state.containerHeight !== newHeight) {
            state.containerHeight = newHeight;
            updateVisibleRange();
        }
    }

    function cleanupScrollTracking() {
        if (scrollHandler) {
            if (scrollTarget === window) {
                window.removeEventListener('scroll', scrollHandler, true);
            } else if (scrollTarget) {
                scrollTarget.removeEventListener('scroll', scrollHandler);
            }
            scrollHandler = null;
            scrollTarget = null;
        }
    }

    function setupScrollTracking() {
        cleanupScrollTracking();
        // Scroll events cannot be canceled - passive is free performance
        const listenerOptions = { passive: true };
        scrollHandler = rafThrottle(handleScroll);

        if (scrollMode === 'self') {
            host.addEventListener('scroll', scrollHandler, listenerOptions);
            scrollTarget = host;
        } else if (scrollMode === 'window') {
            window.addEventListener('scroll', scrollHandler, { capture: true, passive: true });
            scrollTarget = window;
        } else if (scrollMode === 'parent') {
            scrollTarget = findScrollableParent(host);
            if (scrollTarget) {
                scrollTarget.addEventListener('scroll', scrollHandler, listenerOptions);
            } else {
                // No scrollable parent (yet) - fall back to window
                window.addEventListener('scroll', scrollHandler, { capture: true, passive: true });
                scrollTarget = window;
            }
        } else if (typeof scrollMode === 'string') {
            // CSS selector
            scrollTarget = document.querySelector(scrollMode);
            if (scrollTarget) {
                scrollTarget.addEventListener('scroll', scrollHandler, listenerOptions);
            } else {
                console.warn(`[windowing] scrollContainer "${scrollMode}" not found, falling back to self`);
                host.addEventListener('scroll', scrollHandler, listenerOptions);
                scrollTarget = host;
            }
        } else if (scrollMode instanceof Element) {
            scrollTarget = scrollMode;
            scrollTarget.addEventListener('scroll', scrollHandler, listenerOptions);
        }
    }

    function attach() {
        setupScrollTracking();
        if (!resizeObserver && typeof ResizeObserver !== 'undefined') {
            // Re-measure when the host resizes (also fires when it first connects)
            resizeObserver = new ResizeObserver(() => updateDimensions());
            resizeObserver.observe(host);
        }
        updateDimensions();
        updateVisibleRange();
    }

    function detach() {
        cleanupScrollTracking();
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }
    }

    // Initial setup is deferred one microtask: createWindowing is typically
    // called inside data() where this.state doesn't exist yet, so count()
    // cannot be invoked synchronously. The visibleEnd estimate above covers
    // the first render; the microtask (which runs before mounted()) attaches
    // listeners and computes the real range.
    queueMicrotask(() => {
        if (destroyed) return;
        attach();

        // Auto-refresh when a reactive count() changes. Created root-owned
        // (withoutTracking) so a parent render effect can't dispose it.
        withoutTracking(() => {
            countEffect = createEffect(() => {
                opts.count();
                if (!destroyed) {
                    updateVisibleRange();
                }
            });
        });
    });

    const controller = {
        /** First index of the rendered window (inclusive) */
        get visibleStart() { return state.visibleStart; },
        /** End index of the rendered window (exclusive) - slice(visibleStart, visibleEnd) */
        get visibleEnd() { return state.visibleEnd; },
        /** translateY offset for the window container, in px */
        get offsetY() { return state.visibleStart * itemHeight(); },
        /** Height of the spacer element, in px. Reads count() tracked, so a
         *  template using it re-renders when a reactive item count changes. */
        get totalHeight() { return opts.count() * itemHeight(); },
        /** Current scroll position relative to the list */
        get scrollTop() { return state.scrollTop; },
        /** Measured viewport height */
        get containerHeight() { return state.containerHeight; },

        /**
         * Recompute dimensions and the visible range. Call after changing an
         * untracked() item source or replacing items delivered via props.
         */
        refresh() {
            updateDimensions();
            updateVisibleRange();
        },

        /** Scroll so the given item index is at the top of the viewport */
        scrollToIndex(index) {
            const target = index * itemHeight();
            if (scrollMode === 'self') {
                host.scrollTop = target;
            } else if (scrollTarget === window) {
                const rect = host.getBoundingClientRect();
                window.scrollTo({ top: window.scrollY + rect.top + target, behavior: 'smooth' });
            } else if (scrollTarget) {
                const thisRect = host.getBoundingClientRect();
                const parentRect = scrollTarget.getBoundingClientRect();
                const offset = thisRect.top - parentRect.top + scrollTarget.scrollTop;
                scrollTarget.scrollTop = offset + target;
            }
        },

        scrollToTop() {
            controller.scrollToIndex(0);
        },

        scrollToBottom() {
            const total = withoutTracking(() => opts.count());
            controller.scrollToIndex(Math.max(0, total - 1));
        },

        /** Switch scroll tracking mode (e.g. when a scrollContainer prop changes) */
        setScrollContainer(mode) {
            scrollMode = mode;
            setupScrollTracking();
            updateDimensions();
            updateVisibleRange();
        },

        /**
         * (Re-)attach listeners and observers. Idempotent. Use with detach()
         * from mounted()/unmounted() when the host element can reconnect.
         */
        attach() {
            if (!destroyed) attach();
        },

        /** Remove listeners/observers but keep state (see attach()). */
        detach,

        /** Full teardown: detach and dispose effects. The controller is dead afterwards. */
        destroy() {
            destroyed = true;
            detach();
            if (countEffect) {
                countEffect.dispose();
                countEffect = null;
            }
        }
    };

    return controller;
}
