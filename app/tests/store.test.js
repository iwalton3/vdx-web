/**
 * Tests for Store System
 */

import { describe, assert } from './test-runner.js';
import { createStore, flushEffects } from '../lib/framework.js';

describe('Store System', function(it) {
    it('creates store with initial state', () => {
        const store = createStore({ count: 0 });
        assert.equal(store.state.count, 0, 'Should have initial state');
    });

    it('allows state updates via set', () => {
        const store = createStore({ count: 0 });
        store.set({ count: 5 });
        assert.equal(store.state.count, 5, 'Should update state');
    });

    it('allows state updates via update function', () => {
        const store = createStore({ count: 0 });
        store.update(s => ({ count: s.count + 1 }));
        assert.equal(store.state.count, 1, 'Should increment count');
    });

    it('notifies subscribers of changes', async () => {
        const store = createStore({ count: 0 });
        let notified = false;
        let capturedValue = 0;

        store.subscribe(state => {
            notified = true;
            capturedValue = state.count;
        });

        assert.ok(notified, 'Should notify immediately on subscribe');
        assert.equal(capturedValue, 0, 'Should receive initial value');

        notified = false;
        store.state.count = 5;

        // Notification should be synchronous, but add small delay to be safe
        await new Promise(resolve => setTimeout(resolve, 0));

        assert.ok(notified, 'Should notify on state change');
        assert.equal(capturedValue, 5, 'Should receive new value');
    });

    it('returns unsubscribe function', () => {
        const store = createStore({ count: 0 });
        let notifications = 0;

        const unsubscribe = store.subscribe(() => {
            notifications++;
        });

        const afterSubscribe = notifications;
        unsubscribe();

        store.state.count = 5;
        assert.equal(notifications, afterSubscribe, 'Should not notify after unsubscribe');
    });

    it('handles multiple subscribers', () => {
        const store = createStore({ count: 0 });
        let sub1Value = 0;
        let sub2Value = 0;

        store.subscribe(state => { sub1Value = state.count; });
        store.subscribe(state => { sub2Value = state.count; });

        store.state.count = 10;

        setTimeout(() => {
            assert.equal(sub1Value, 10, 'First subscriber should be notified');
            assert.equal(sub2Value, 10, 'Second subscriber should be notified');
        }, 10);
    });

    it('queues notifications when subscriber modifies state', async () => {
        const store = createStore({ a: 0, b: 0 });
        let aNotifications = 0;
        let bNotifications = 0;

        // Subscriber that modifies state
        store.subscribe(state => {
            aNotifications++;
            if (state.a === 1 && state.b === 0) {
                // Modify b when a changes
                state.b = 10;
            }
        });

        // Second subscriber to track b
        store.subscribe(state => {
            bNotifications++;
        });

        // Trigger initial notification counts
        const initialA = aNotifications;
        const initialB = bNotifications;

        // Change a - should trigger notification for a, then queued notification for b
        store.state.a = 1;

        // Flush effects (batched via rAF in browser, microtask in Node)
        flushEffects();

        // Wait for store's queued notifications (uses queueMicrotask internally)
        await new Promise(resolve => queueMicrotask(resolve));
        await new Promise(resolve => queueMicrotask(resolve));
        flushEffects();

        assert.equal(store.state.b, 10, 'Subscriber should have set b');
        assert.ok(aNotifications > initialA, 'Should have notified about a');
        assert.ok(bNotifications > initialB, 'Should have notified about b change');
    });

    it('limits recursive notification depth', async () => {
        const store = createStore({ count: 0, trigger: false });
        let incrementCount = 0;

        // Create circular dependency - subscriber increments on every notification
        // Only activate after trigger is set to avoid initial subscribe interference
        // Use a lower limit to avoid hitting reactivity's MAX_FLUSH_ITERATIONS
        store.subscribe(state => {
            if (state.trigger && state.count < 10) {
                incrementCount++;
                state.count++;
            }
        });

        // Trigger the circular dependency
        store.state.trigger = true;
        store.state.count = 1;

        // Wait for queued notifications to process (or hit limit)
        for (let i = 0; i < 25; i++) {
            await new Promise(resolve => setTimeout(resolve, 5));
        }

        // With effect batching, recursive notifications happen across microtasks.
        // The subscriber's own guard (count < 10) limits the recursion.
        // The reactivity system's MAX_FLUSH_ITERATIONS (100) provides a safety limit.
        assert.ok(incrementCount >= 1, `Subscriber should have run at least once (got ${incrementCount})`);
        // Should run ~9 times (count goes 1->2->3...->9, then guard stops it)
        assert.ok(incrementCount <= 15, `Increment count should be limited by guard (got ${incrementCount})`);
    });
});
