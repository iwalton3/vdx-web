/**
 * Mounting a component's template. Filled in by the render extraction; for
 * now it carries the one helper the prop path needs.
 */

/** Re-instantiate on the next microtask (error recovery after a prop change). */
export function scheduleRender(component) {
    if (component._fgReinstantiate && component._isMounted && !component._isDestroyed) {
        queueMicrotask(component._fgReinstantiate);
    }
}
