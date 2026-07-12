/**
 * Tests for createTask() - the latest-wins stale-async primitive.
 *
 * The order-independence tests run the same latest-wins scenario under many
 * seeds via the shuffle harness: no matter which order the underlying promises
 * settle, only the current run may commit.
 */

import { describe, assert } from './test-runner.js';
import {
    createTask, reactive, createEffect,
    defineComponent, Component, html
} from '../../lib/framework.js';
import { createShuffleScheduler } from './shuffle-harness.js';

/** A controllable deferred: resolve/reject on demand. */
function deferred() {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

describe('createTask: semantics', function(it) {
    it('runs the body and returns its value when current', async () => {
        const task = createTask(async (signal, x) => x * 2);
        const result = await task.run(21);
        assert.equal(result, 42, 'returns body value');
        assert.equal(task.pending, false, 'not pending after completion');
        assert.isNull(task.error, 'no error');
    });

    it('pending is true while in flight, false after', async () => {
        const d = deferred();
        const task = createTask(async () => { await d.promise; return 'done'; });
        const p = task.run();
        assert.equal(task.pending, true, 'pending during flight');
        d.resolve();
        const r = await p;
        assert.equal(r, 'done', 'resolved value');
        assert.equal(task.pending, false, 'pending cleared');
    });

    it('a superseded run resolves undefined and does not commit', async () => {
        const d1 = deferred();
        let commits = [];
        const task = createTask(async (signal, tag) => {
            const v = tag === 'A' ? await d1.promise : 'B';
            signal.throwIfAborted();       // guard for non-abort-aware await
            commits.push(v);
            return v;
        });

        const pA = task.run('A');          // will hang on d1
        const pB = task.run('B');          // supersedes A
        const rB = await pB;
        d1.resolve('A-late');              // A resolves after being superseded
        const rA = await pA;

        assert.equal(rB, 'B', 'current run returns its value');
        assert.equal(rA, undefined, 'superseded run resolves undefined');
        assert.deepEqual(commits, ['B'], 'only the current run committed');
    });

    it('a superseded run\'s AbortError does NOT land on task.error', async () => {
        // Each run gets its OWN deferred, keyed on its signal - so supersession
        // aborts run A while run B proceeds independently (the realistic shape).
        const task = createTask((signal) => new Promise((resolve, reject) => {
            signal.addEventListener('abort',
                () => reject(Object.assign(new Error('x'), { name: 'AbortError' })),
                { once: true });
            // B resolves promptly; A never resolves on its own, only aborts.
            if (!signal.aborted) setTimeout(() => resolve('ok'), 5);
        }));
        const pA = task.run();   // A
        const pB = task.run();   // supersede A -> A rejects AbortError (must be swallowed)
        const [rA, rB] = await Promise.all([pA, pB]);
        assert.equal(rA, undefined, 'superseded run resolves undefined');
        assert.equal(rB, 'ok', 'current run resolves its value');
        assert.isNull(task.error, 'superseded AbortError swallowed, error stays null');
        assert.equal(task.pending, false, 'pending cleared');
    });

    it('a CURRENT run\'s own AbortError IS reported and clears pending', async () => {
        // A foreign abort (e.g. the app's AbortSignal.timeout) surfaces as an
        // AbortError on the current run - it must be treated as a real failure,
        // never silently swallowed (which would strand pending=true forever).
        const task = createTask(async () => {
            throw Object.assign(new Error('own timeout'), { name: 'AbortError' });
        });
        const r = await task.run();
        assert.equal(r, undefined, 'failed run resolves undefined');
        assert.ok(task.error instanceof Error, 'current-run AbortError captured');
        assert.equal(task.pending, false, 'pending cleared - not stuck');
    });

    it('a failing CURRENT run sets task.error and clears pending', async () => {
        const task = createTask(async () => { throw new Error('boom'); });
        const r = await task.run();
        assert.equal(r, undefined, 'failed run resolves undefined');
        assert.ok(task.error instanceof Error, 'error captured');
        assert.equal(task.error.message, 'boom', 'error message');
        assert.equal(task.pending, false, 'pending cleared on failure');
    });

    it('error clears when a new run starts', async () => {
        let mode = 'fail';
        const task = createTask(async () => {
            if (mode === 'fail') throw new Error('bad');
            return 'good';
        });
        await task.run();
        assert.ok(task.error, 'error set');
        mode = 'ok';
        const p = task.run();
        assert.isNull(task.error, 'error cleared at start of new run');
        await p;
    });

    it('a superseded run failure does NOT set error', async () => {
        const d = deferred();
        const task = createTask(async (signal, tag) => {
            if (tag === 'A') { await d.promise; throw new Error('A-fail'); }
            return 'B';
        });
        task.run('A');
        await task.run('B');    // supersede A
        d.resolve();            // A now throws, but is superseded
        await new Promise(r => setTimeout(r, 0));
        assert.isNull(task.error, 'superseded failure ignored');
    });

    it('cancel() clears pending and prevents commit', async () => {
        const d = deferred();
        let committed = false;
        const task = createTask(async (signal) => {
            await d.promise;
            signal.throwIfAborted();
            committed = true;
        });
        const p = task.run();
        assert.equal(task.pending, true, 'pending');
        task.cancel();
        assert.equal(task.pending, false, 'pending cleared by cancel');
        d.resolve();
        await p;
        assert.equal(committed, false, 'commit skipped after cancel');
    });

    it('pending/error are reactive', async () => {
        const task = createTask(async () => { throw new Error('e'); });
        let seenPending = [];
        const { dispose } = createEffect(() => { seenPending.push(task.pending); });
        await task.run();
        // effect should have re-run for pending true then false
        assert.ok(seenPending.includes(true), 'observed pending true');
        assert.ok(seenPending[seenPending.length - 1] === false, 'settled to false');
        dispose();
    });
});

describe('createTask: order-independence under seeded shuffle', function(it) {
    // Run the canonical latest-wins scenario under many seeds. Regardless of
    // the (seeded-random) settlement order, only the last run may commit.
    const SEEDS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

    for (const seed of SEEDS) {
        it(`seed ${seed}: only the latest of many overlapping runs commits`, async () => {
            const sched = createShuffleScheduler(seed);
            const committed = [];
            const task = createTask(async (signal, tag) => {
                const v = await sched.defer('value-' + tag, { signal });
                signal.throwIfAborted();
                committed.push(tag);
                return v;
            });

            // Fire several overlapping runs; each supersedes the previous.
            const promises = [];
            for (let i = 0; i < 6; i++) {
                promises.push(task.run(i));
            }
            const results = await Promise.all(promises);

            // Only the final run (tag 5) is current; earlier ones abort.
            assert.deepEqual(committed, [5], `seed ${seed}: exactly the last run committed`);
            assert.equal(results[5], 'value-5', 'current run returned its value');
            for (let i = 0; i < 5; i++) {
                assert.equal(results[i], undefined, `run ${i} superseded -> undefined`);
            }
            assert.equal(task.pending, false, 'settled');
            assert.isNull(task.error, 'no error (aborts swallowed)');
        });
    }
});

describe('createTask: component binding', function(it) {
    it('this.createTask auto-disposes at unmount', async () => {
        let taskRef = null;
        const d = deferred();
        class TaskComp extends Component {
            constructor(props) {
                super(props);
                this.state = { hits: null };
                this.load = this.createTask(async (signal) => {
                    await d.promise;
                    signal.throwIfAborted();
                    this.state.hits = 'loaded';
                });
                taskRef = this.load;
            }
            template() { return html`<div>${this.state.hits || 'idle'}</div>`; }
        }
        defineComponent('task-comp', TaskComp);

        const el = document.createElement('task-comp');
        document.body.appendChild(el);
        el.load.run();
        assert.equal(taskRef.pending, true, 'task pending');

        document.body.removeChild(el);   // unmount -> auto dispose/cancel
        assert.equal(taskRef.pending, false, 'task cancelled on unmount');

        d.resolve();
        await new Promise(r => setTimeout(r, 0));
        assert.equal(el.state.hits, null, 'no commit after unmount');
    });
});
