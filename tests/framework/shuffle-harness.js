/**
 * Seeded Shuffle Harness (test-only)
 *
 * Port of a proven manual technique: collect async settlements inside a window
 * and release them in SEEDED-random order, so out-of-order async bugs surface
 * deterministically (a failing seed reproduces exactly).
 *
 * Used to demonstrate that createTask's latest-wins semantics are
 * order-independent: across many seeds, only the current run ever commits, no
 * matter which order the underlying promises settle.
 */

/**
 * mulberry32 - a small, fast, seedable PRNG. Same seed -> same sequence.
 * @param {number} seed
 * @returns {() => number} A function returning floats in [0, 1)
 */
export function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Build an AbortError that matches what fetch(signal) / signal.throwIfAborted()
 * throw, so tasks treat it as a supersession, not a failure.
 * @returns {Error}
 */
function abortError() {
    try {
        return new DOMException('The operation was aborted.', 'AbortError');
    } catch {
        const e = new Error('The operation was aborted.');
        e.name = 'AbortError';
        return e;
    }
}

/**
 * Create a scheduler that collects deferred settlements and releases them in a
 * seeded-random order once per window.
 *
 * @param {number} seed - PRNG seed (a failing shuffle reproduces with this seed)
 * @param {Object} [opts]
 * @param {number} [opts.windowMs=0] - Collection window before a release flush
 * @returns {{ defer: Function, flush: Function, pending: () => number }}
 */
export function createShuffleScheduler(seed, opts = {}) {
    const rng = mulberry32(seed);
    const windowMs = opts.windowMs || 0;
    let queue = [];
    let flushScheduled = false;

    function scheduleFlush() {
        if (flushScheduled) return;
        flushScheduled = true;
        setTimeout(flush, windowMs);
    }

    function flush() {
        flushScheduled = false;
        const batch = queue;
        queue = [];
        // Fisher-Yates shuffle with the seeded PRNG
        for (let i = batch.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            const tmp = batch[i];
            batch[i] = batch[j];
            batch[j] = tmp;
        }
        for (const settle of batch) settle();
        // A settlement may enqueue more work (e.g. a chained run) - drain it too.
        if (queue.length > 0) scheduleFlush();
    }

    /**
     * A stand-in for an abort-aware fetch: resolves (or rejects) with `value`
     * only when the scheduler releases it, unless its signal aborts first (in
     * which case it rejects immediately with AbortError, like real fetch).
     *
     * @template T
     * @param {T} value - The value to settle with
     * @param {Object} [o]
     * @param {AbortSignal} [o.signal] - Aborts -> immediate AbortError rejection
     * @param {boolean} [o.fail] - Reject with `value` instead of resolving
     * @returns {Promise<T>}
     */
    function defer(value, o = {}) {
        return new Promise((resolve, reject) => {
            let settled = false;
            const { signal, fail } = o;
            if (signal) {
                if (signal.aborted) { reject(abortError()); return; }
                signal.addEventListener('abort', () => {
                    if (settled) return;
                    settled = true;
                    reject(abortError());
                }, { once: true });
            }
            scheduleFlush();
            queue.push(() => {
                if (settled) return;
                settled = true;
                if (fail) reject(value); else resolve(value);
            });
        });
    }

    return { defer, flush, pending: () => queue.length };
}
