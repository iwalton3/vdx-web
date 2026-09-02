/**
 * computed() flag machine: every cell, enumerated.
 *
 * computed() carries three booleans - dirty, firstRun, failed - and reaches
 * them from two entry points: its own effect body (a dependency changed) and a
 * lazy get() (something read it). The getter can also throw. Reviewers sample
 * that space; they do not walk it, which is how a getter that healed after
 * throwing came to leave its dependents holding the error forever.
 *
 * Runs in node - reactivity.js touches no DOM - so it costs ~0.1s and needs no
 * browser:
 *
 *     node tests/node/computed-cells.mjs
 *
 * A cell asserts the OBSERVABLES, not the flags: the value returned, how many
 * times the getter ran, and how many times a dependent effect re-ran. Asserting
 * the flags would just restate the implementation.
 */

import assert from 'node:assert';
import { reactive, computed, createEffect, flushEffects, setEffectErrorHandler }
    from '../../lib/core/reactivity.js';

// Several cells make a getter throw on purpose. Collect those instead of
// letting the default handler print a stack per cell - a run whose expected
// output is a wall of stack traces is a run nobody reads.
const swallowed = [];
setEffectErrorHandler(e => { swallowed.push(e); });

let passed = 0;
const failures = [];

function cell(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ok   ${name}`);
    } catch (e) {
        failures.push({ name, e });
        console.log(`  FAIL ${name}\n       ${e.message}`);
    }
}

/** A computed plus counters for the two things that are observable about it. */
function harness(getter) {
    const state = reactive({ n: 1, boom: false });
    let runs = 0;
    const c = computed(() => { runs++; return getter(state); });
    return {
        state, c,
        get runs() { return runs; },
        /** An effect that reads the computed, counting its own re-runs. */
        watcher() {
            let seen = 0, last, error;
            const { dispose } = createEffect(() => {
                seen++;
                try { last = c.get(); error = null; } catch (e) { error = e; }
            });
            return { get seen() { return seen; }, get last() { return last; },
                     get error() { return error; }, dispose };
        }
    };
}

console.log('\ncomputed() cells\n');

/* -------------------------------------------------- entry: lazy get() ----- */

cell('lazy read computes once and caches', () => {
    const h = harness(s => s.n * 2);
    assert.equal(h.c.get(), 2);
    assert.equal(h.c.get(), 2);
    assert.equal(h.runs, 1, 'a clean computed does not re-run the getter');
});

cell('lazy read after a dependency write recomputes exactly once', () => {
    const h = harness(s => s.n * 2);
    assert.equal(h.c.get(), 2);
    h.state.n = 5;
    assert.equal(h.c.get(), 10);
    assert.equal(h.c.get(), 10);
    assert.equal(h.runs, 2);
});

cell('a write that does not change the value still invalidates only once', () => {
    const h = harness(s => s.n * 2);
    h.c.get();
    h.state.n = 5;
    h.state.n = 6;
    assert.equal(h.c.get(), 12);
    assert.equal(h.runs, 2, 'two writes before a read collapse into one recompute');
});

cell('a getter that throws propagates and stays retryable', () => {
    const h = harness(s => { if (s.boom) throw new Error('nope'); return s.n; });
    // computed() runs its getter eagerly once when created, so count from
    // there rather than from zero.
    const base = h.runs;
    h.state.boom = true;
    assert.throws(() => h.c.get(), /nope/);
    assert.throws(() => h.c.get(), /nope/, 'a failed computed re-runs rather than caching the throw');
    assert.equal(h.runs - base, 2, 'one getter run per read while failed - the throw is not cached');
});

cell('a getter that heals after throwing returns the new value', () => {
    const h = harness(s => { if (s.boom) throw new Error('nope'); return s.n; });
    h.state.boom = true;
    assert.throws(() => h.c.get(), /nope/);
    h.state.boom = false;
    assert.equal(h.c.get(), 1, 'healing is not blocked by the failed flag');
});

/* ------------------------------------------ entry: the computed's effect -- */

cell('a dependent effect re-runs when a dependency changes', () => {
    const h = harness(s => s.n * 2);
    const w = h.watcher();
    assert.equal(w.last, 2);
    assert.equal(w.seen, 1);
    h.state.n = 5;
    flushEffects();
    assert.equal(w.last, 10);
    assert.equal(w.seen, 2, 'exactly one re-run per dependency change');
    w.dispose();
});

cell('two dependency writes before a flush wake the dependent once', () => {
    const h = harness(s => s.n * 2);
    const w = h.watcher();
    h.state.n = 5;
    h.state.n = 6;
    flushEffects();
    assert.equal(w.last, 12);
    assert.equal(w.seen, 2, 'batched, not once per write');
    w.dispose();
});

cell('a dependent that already saw the invalidation is not woken twice', () => {
    const h = harness(s => s.n * 2);
    const w = h.watcher();
    h.state.n = 5;
    flushEffects();
    const after = w.seen;
    flushEffects();
    assert.equal(w.seen, after, 'a flush with nothing dirty wakes nobody');
    w.dispose();
});

cell('a dependent observes the throw, not a stale value', () => {
    const h = harness(s => { if (s.boom) throw new Error('nope'); return s.n; });
    const w = h.watcher();
    assert.equal(w.last, 1);
    h.state.boom = true;
    flushEffects();
    assert.ok(w.error, 'the dependent sees the error');
    w.dispose();
});

cell('a dependent is woken when the getter heals', () => {
    // The regression this machine exists for: whoever observed the throw is
    // holding it, and only the healing run can tell them otherwise.
    const h = harness(s => { if (s.boom) throw new Error('nope'); return s.n; });
    const w = h.watcher();
    h.state.boom = true;
    flushEffects();
    assert.ok(w.error);
    h.state.boom = false;
    flushEffects();
    assert.equal(w.error, null, 'the dependent re-read after healing');
    assert.equal(w.last, 1);
    w.dispose();
});

cell('eager healing wakes a dependent exactly once', () => {
    // The getter tracked the dependency that later heals it, so the computed's
    // own effect runs the healing eagerly and the dependent is woken once.
    const h = harness(s => { if (s.boom) throw new Error('nope'); return s.n; });
    h.state.boom = true;
    flushEffects();

    let seen = 0, error = null;
    const { dispose } = createEffect(() => {
        seen++;
        try { h.c.get(); error = null; } catch (e) { error = e; }
    });
    assert.ok(error, 'the first run observes the throw');

    h.state.boom = false;
    flushEffects();

    assert.equal(error, null, 'the dependent ends up with the healed value');
    assert.equal(seen, 2, 'one re-run, no redundant render');
    dispose();
});

cell('LAZY healing inside a dependent\'s own run costs one extra run', () => {
    // The one cell where the machine is not minimal.
    //
    // The getter throws BEFORE reading state.n, so the computed never tracked
    // it and no dependency write can heal it eagerly. The heal therefore
    // happens inside get() - and get() is being called from a dependent effect
    // that is mid-run, so the trigger() that wakes dependents wakes the very
    // effect it is inside. It runs a second time.
    //
    // PINNED, not fixed. The output is correct either way; the cost is one
    // redundant render. Excluding the active effect from that trigger is a
    // one-line change, but this machine's history is that every adjustment to
    // it that looked obviously safe stranded dependents holding a stale error,
    // and there is no finding behind this one - only a count. Recorded so a
    // future change to the count is visible rather than silent.
    // See docs/tasklists/ATTR-CONTRACT-HANDOFF.md, item 5.
    const state = reactive({ tick: 0, n: 7 });
    let broken = true;
    const c = computed(() => { if (broken) throw new Error('nope'); return state.n; });

    let seen = 0, error = null, last;
    const { dispose } = createEffect(() => {
        seen++;
        void state.tick;                       // an independent wake-up source
        try { last = c.get(); error = null; } catch (e) { error = e; }
    });
    assert.ok(error, 'the dependent starts out holding the throw');
    const before = seen;

    broken = false;                            // heals, untracked by anything
    state.tick++;                              // wakes the dependent; heal is INSIDE its run
    flushEffects();

    assert.equal(error, null, 'the dependent ends up with the healed value');
    assert.equal(last, 7, 'and the right one');
    assert.equal(seen - before, 2,
        'two runs, not one: the healing read triggers the run it is inside');
    dispose();
});

cell('dispose() stops invalidation', () => {
    const h = harness(s => s.n * 2);
    assert.equal(h.c.get(), 2);
    h.c.dispose();
    h.state.n = 5;
    assert.equal(h.c.get(), 2, 'a disposed computed stops tracking and keeps its last value');
});

cell('_depCount reflects the most recent run', () => {
    const state = reactive({ a: 1, b: 2, useB: false });
    const c = computed(() => state.useB ? state.a + state.b : state.a);
    c.get();
    const before = c._depCount();
    state.useB = true;
    c.get();
    assert.ok(c._depCount() > before,
        'a branch switch tracks the newly read dependency');
});

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
    for (const f of failures) console.error(f.e);
    process.exit(1);
}
