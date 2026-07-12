/**
 * Tests for Reactivity System
 */

import { describe, assert } from './test-runner.js';
import { reactive, createEffect, createRoot, computed, watch, isReactive, trackAllDependencies, trackMutations, memo, flushEffects, reactiveSet, reactiveMap, isReactiveCollection, untracked, isUntracked } from '../../lib/framework.js';

describe('Reactivity System', function(it) {
    it('creates reactive proxy', () => {
        const obj = reactive({ count: 0 });
        assert.ok(isReactive(obj), 'Object should be reactive');
        assert.equal(obj.count, 0, 'Should preserve values');
    });

    it('tracks dependencies with createEffect', () => {
        const obj = reactive({ count: 0 });
        let effectRuns = 0;
        let capturedValue = 0;

        createEffect(() => {
            capturedValue = obj.count;
            effectRuns++;
        });
        flushEffects();

        assert.equal(effectRuns, 1, 'Effect should run immediately');
        assert.equal(capturedValue, 0, 'Effect should capture initial value');

        obj.count = 5;
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should re-run on change');
        assert.equal(capturedValue, 5, 'Effect should capture new value');
    });

    it('handles nested reactive objects', () => {
        const obj = reactive({
            user: {
                name: 'Alice',
                age: 30
            }
        });

        assert.ok(isReactive(obj.user), 'Nested object should be reactive');

        let capturedName = '';
        createEffect(() => {
            capturedName = obj.user.name;
        });
        flushEffects();

        obj.user.name = 'Bob';
        flushEffects();
        assert.equal(capturedName, 'Bob', 'Nested updates should trigger effects');
    });

    it('only triggers effects when values actually change', () => {
        const obj = reactive({ count: 0 });
        let effectRuns = 0;

        createEffect(() => {
            obj.count; // Read to track dependency
            effectRuns++;
        });
        flushEffects();

        const initialRuns = effectRuns;
        obj.count = 0; // Same value
        flushEffects();
        assert.equal(effectRuns, initialRuns, 'Should not re-run for same value');

        obj.count = 1; // Different value
        flushEffects();
        assert.equal(effectRuns, initialRuns + 1, 'Should re-run for different value');
    });

    it('creates computed values', () => {
        const obj = reactive({ a: 1, b: 2 });
        const sum = computed(() => obj.a + obj.b);
        flushEffects();

        assert.equal(sum.get(), 3, 'Computed should return correct initial value');

        obj.a = 5;
        flushEffects();
        assert.equal(sum.get(), 7, 'Computed should update when dependencies change');

        sum.dispose(); // Cleanup
    });

    it('computed re-tracks branch-dependent dependencies', () => {
        const obj = reactive({ flag: true, a: 1, b: 10 });
        const val = computed(() => obj.flag ? obj.a : obj.b);
        flushEffects();
        assert.equal(val.get(), 1, 'Initial value from a branch');

        obj.flag = false;
        flushEffects();
        assert.equal(val.get(), 10, 'Switches to b branch');

        // b was never accessed on the first run - it must still be tracked now
        obj.b = 20;
        flushEffects();
        assert.equal(val.get(), 20, 'Tracks b after branch switch');

        val.dispose();
    });

    it('effects that read a computed re-run when its dependencies change', () => {
        const obj = reactive({ a: 1, b: 2 });
        const sum = computed(() => obj.a + obj.b);
        let seen = null;
        let runs = 0;

        createEffect(() => {
            seen = sum.get();
            runs++;
        });
        flushEffects();
        assert.equal(seen, 3, 'Effect sees initial computed value');
        assert.equal(runs, 1, 'Effect ran once initially');

        obj.a = 10;
        flushEffects();
        assert.equal(seen, 12, 'Effect re-ran with updated computed value');
        assert.equal(runs, 2, 'Effect ran exactly once per invalidation');

        sum.dispose();
    });

    it('computed recomputes lazily (only on read)', () => {
        let computeCount = 0;
        const obj = reactive({ a: 1 });
        const doubled = computed(() => {
            computeCount++;
            return obj.a * 2;
        });
        flushEffects();
        assert.equal(computeCount, 1, 'Computed runs once initially');

        obj.a = 2;
        flushEffects();
        obj.a = 3;
        flushEffects();
        assert.equal(computeCount, 1, 'No recompute until read');

        assert.equal(doubled.get(), 6, 'Read returns fresh value');
        assert.equal(computeCount, 2, 'Recomputed exactly once on read');

        doubled.dispose();
    });

    it('computed is fresh when read synchronously after a write (no flush)', () => {
        const obj = reactive({ items: [1, 2] });
        const total = computed(() => obj.items.reduce((s, n) => s + n, 0));
        assert.equal(total.get(), 3, 'Initial value');

        // Read immediately after the mutation, before any microtask flush -
        // the "mutate then emit event with derived value" pattern
        obj.items = [1, 2, 3];
        assert.equal(total.get(), 6, 'Synchronous read after write is not stale');

        obj.items.push(4);
        assert.equal(total.get(), 10, 'Synchronous read after array mutation is not stale');

        total.dispose();
    });

    it('chained computeds are fresh on synchronous read after a write', () => {
        const obj = reactive({ n: 1 });
        const doubled = computed(() => obj.n * 2);
        const quadrupled = computed(() => doubled.get() * 2);
        assert.equal(quadrupled.get(), 4, 'Initial chained value');

        obj.n = 5;
        assert.equal(quadrupled.get(), 20, 'Chained computed fresh without flush');

        quadrupled.dispose();
        doubled.dispose();
    });

    it('computed does not leak its dependencies into the calling effect', () => {
        const obj = reactive({ a: 1, unrelated: 0 });
        const val = computed(() => obj.a);
        flushEffects();

        let runs = 0;
        createEffect(() => {
            val.get();
            runs++;
        });
        flushEffects();
        assert.equal(runs, 1, 'Effect ran once initially');

        // Invalidate the computed, then read it OUTSIDE any effect so the
        // recompute happens while the dependent effect is not active
        obj.a = 2;
        flushEffects();

        // The dependent effect re-ran (invalidation) - that's expected.
        const runsAfterInvalidation = runs;

        // Now mutate something the computed never accessed
        obj.unrelated = 99;
        flushEffects();
        assert.equal(runs, runsAfterInvalidation, 'Unrelated state does not re-run dependent effect');

        val.dispose();
    });

    it('watches reactive values', () => {
        const obj = reactive({ count: 0 });
        let watchedValue = null;
        let oldValue = null;

        watch(
            () => obj.count,
            (newVal, oldVal) => {
                watchedValue = newVal;
                oldValue = oldVal;
            }
        );
        flushEffects();

        obj.count = 5;
        flushEffects();
        assert.equal(watchedValue, 5, 'Watch callback should receive new value');
        assert.equal(oldValue, 0, 'Watch callback should receive old value');
    });

    it('watch returns dispose function that stops watching', () => {
        const obj = reactive({ value: 0 });
        let callCount = 0;

        const dispose = watch(
            () => obj.value,
            () => { callCount++; }
        );
        flushEffects();

        obj.value = 1;
        flushEffects();
        assert.equal(callCount, 1, 'Watch should fire on first change');

        dispose();

        obj.value = 2;
        obj.value = 3;
        flushEffects();
        assert.equal(callCount, 1, 'Watch should not fire after dispose');
    });

    it('watch tracks nested object properties', () => {
        const obj = reactive({ user: { name: 'Alice' } });
        let watchedName = null;

        watch(
            () => obj.user.name,
            (newName) => { watchedName = newName; }
        );
        flushEffects();

        obj.user.name = 'Bob';
        flushEffects();
        assert.equal(watchedName, 'Bob', 'Watch should track nested property changes');
    });

    it('watch does not fire on equal value assignment', () => {
        const obj = reactive({ count: 5 });
        let callCount = 0;

        watch(
            () => obj.count,
            () => { callCount++; }
        );
        flushEffects();

        obj.count = 5; // Same value
        flushEffects();
        assert.equal(callCount, 0, 'Watch should not fire when value does not change');

        obj.count = 6; // Different value
        flushEffects();
        assert.equal(callCount, 1, 'Watch should fire when value changes');
    });

    it('watch fires when value changes from undefined', () => {
        const obj = reactive({ count: undefined });
        let newVal = null;
        let oldVal = 'sentinel';

        watch(
            () => obj.count,
            (n, o) => { newVal = n; oldVal = o; }
        );
        flushEffects();

        obj.count = 5;
        flushEffects();
        assert.equal(newVal, 5, 'Callback fires on undefined -> value change');
        assert.equal(oldVal, undefined, 'Old value is undefined');
    });

    it('watch callback does not track state it reads', () => {
        const obj = reactive({ watched: 0, other: 0 });
        let callCount = 0;

        watch(
            () => obj.watched,
            () => {
                // Reading other state in the callback must NOT subscribe the watcher to it
                const _ = obj.other;
                callCount++;
            }
        );
        flushEffects();

        obj.watched = 1;
        flushEffects();
        assert.equal(callCount, 1, 'Callback fires on watched change');

        obj.other = 99;
        flushEffects();
        assert.equal(callCount, 1, 'Callback does NOT fire when callback-read state changes');

        obj.watched = 2;
        flushEffects();
        assert.equal(callCount, 2, 'Watcher still works after unrelated change');
    });

    it('handles array mutations', () => {
        const arr = reactive({ items: [1, 2, 3] });
        let sum = 0;

        createEffect(() => {
            sum = arr.items.reduce((a, b) => a + b, 0);
        });
        flushEffects();

        assert.equal(sum, 6, 'Initial sum should be correct');

        arr.items.push(4);
        flushEffects();
        assert.equal(sum, 10, 'Array mutations should trigger effects');
    });

    it('returns same proxy for already-reactive object', () => {
        const obj = { count: 0 };
        const proxy1 = reactive(obj);
        const proxy2 = reactive(proxy1);

        assert.equal(proxy1, proxy2, 'Should return same proxy');
    });

    it('returns same proxy when wrapping the same raw object twice', () => {
        const obj = { count: 0 };
        const proxy1 = reactive(obj);
        const proxy2 = reactive(obj);

        assert.equal(proxy1, proxy2, 'Wrapping same raw object should return cached proxy');
    });

    it('nested property access returns a stable proxy (=== works)', () => {
        const state = reactive({ items: [1, 2, 3], user: { name: 'Alice' } });

        assert.ok(state.items === state.items, 'Array proxy is stable across accesses');
        assert.ok(state.user === state.user, 'Object proxy is stable across accesses');

        const captured = state.items;
        state.items.push(4);
        assert.ok(captured === state.items, 'Proxy stays stable after mutation');
    });

    it('handles primitive values', () => {
        const num = reactive(5);
        const str = reactive('hello');
        const bool = reactive(true);

        assert.equal(num, 5, 'Should handle numbers');
        assert.equal(str, 'hello', 'Should handle strings');
        assert.equal(bool, true, 'Should handle booleans');
    });

    it('disposes effects properly', () => {
        const obj = reactive({ count: 0 });
        let effectRuns = 0;

        const { dispose } = createEffect(() => {
            obj.count; // Track dependency
            effectRuns++;
        });
        flushEffects();

        assert.equal(effectRuns, 1, 'Effect should run initially');

        obj.count = 1;
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should run after change');

        dispose(); // Stop tracking

        obj.count = 2;
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should not run after disposal');
    });

    it('removes disposed effects from pending queue', () => {
        // This test validates that when an effect is disposed, it's removed from
        // the pending effects queue. This prevents errors when parent effects
        // dispose child effects that were already queued to run.
        const state = reactive({ show: true, value: 'initial' });
        let parentRan = 0;
        let childRan = 0;
        let childDispose = null;

        // Parent effect that disposes child when show becomes false
        createEffect(() => {
            parentRan++;
            state.show; // Track show
            if (!state.show && childDispose) {
                childDispose();
                childDispose = null;
            }
        });

        // Child effect that accesses value (would throw if value is null)
        const result = createEffect(() => {
            childRan++;
            // This would throw if value is null and this effect runs after disposal
            const _ = state.value.length;
        });
        childDispose = result.dispose;

        flushEffects();
        assert.equal(parentRan, 1, 'Parent should run initially');
        assert.equal(childRan, 1, 'Child should run initially');

        // Now trigger both: set show=false AND value=null
        // Without the fix, child would run and throw when accessing null.length
        // With the fix, parent runs first, disposes child, child is removed from queue
        state.show = false;
        state.value = null;

        // This should NOT throw - child effect should be removed from queue
        flushEffects();

        // Parent should have run twice (initial + update)
        assert.equal(parentRan, 2, `Parent should run twice, ran ${parentRan}`);
        // Child should have run only once (initial), not after disposal
        assert.equal(childRan, 1, `Child should run once (initial only), ran ${childRan}`);
    });

    it('tracks all dependencies efficiently', () => {
        const obj = reactive({
            a: 1,
            b: { c: 2 },
            items: [1, 2, 3]
        });
        let tracked = 0;

        createEffect(() => {
            trackAllDependencies(obj);
            tracked++;
        });
        flushEffects();

        assert.equal(tracked, 1, 'Should run initially');

        obj.a = 5;
        flushEffects();
        assert.equal(tracked, 2, 'Should track top-level changes');

        obj.b.c = 10;
        flushEffects();
        assert.equal(tracked, 3, 'Should track nested changes');

        obj.items.push(4);
        flushEffects();
        // Array push triggers twice: once for the mutation, once for length change
        // This is expected behavior - both are valid reactivity triggers
        assert.ok(tracked >= 4, 'Should track array changes (may trigger multiple times)');
    });

    it('memoizes function results', () => {
        let computeCount = 0;
        const expensiveCompute = memo(() => {
            computeCount++;
            return 42;
        });

        const result1 = expensiveCompute();
        assert.equal(result1, 42, 'Should return correct value');
        assert.equal(computeCount, 1, 'Should compute initially');

        const result2 = expensiveCompute();
        assert.equal(result2, 42, 'Should return same value');
        assert.equal(computeCount, 1, 'Should not recompute if deps unchanged');
    });

    it('memo with function deps recomputes when deps change', () => {
        let computeCount = 0;
        const state = reactive({ items: [1, 2, 3] });

        const render = memo(() => {
            computeCount++;
            return state.items.length;
        }, () => [state.items]);

        assert.equal(render(), 3, 'Initial compute');
        assert.equal(computeCount, 1, 'Computed once');

        render();
        assert.equal(computeCount, 1, 'Cached while deps unchanged');

        // Reassign the array - the documented invalidation pattern
        state.items = [1, 2, 3, 4];
        assert.equal(render(), 4, 'Recomputes with new deps');
        assert.equal(computeCount, 2, 'Computed exactly twice');

        render();
        assert.equal(computeCount, 2, 'Cached again after recompute');
    });

    it('memo with function deps detects length changes', () => {
        let deps = [1];
        let computeCount = 0;
        const fn = memo(() => ++computeCount, () => deps);

        fn();
        assert.equal(computeCount, 1, 'Initial compute');

        deps = [1, 2];  // Same leading values, different length
        fn();
        assert.equal(computeCount, 2, 'Recomputes when deps array grows');
    });

    it('uses computed for reactive memoization', () => {
        let computeCount = 0;

        // For reactive dependencies, always use computed() not memo()
        const obj = reactive({ value: 5 });

        const doubledValue = computed(() => {
            computeCount++;
            return obj.value * 2;
        });
        flushEffects();

        const result1 = doubledValue.get();
        assert.equal(result1, 10, 'Should compute initially');
        assert.equal(computeCount, 1, 'Should run once');

        // Access again without changing reactive value - uses cache
        const result2 = doubledValue.get();
        assert.equal(result2, 10, 'Should return cached value');
        assert.equal(computeCount, 1, 'Should not recompute');

        // Change reactive value - invalidates cache
        obj.value = 10;
        flushEffects();
        const result3 = doubledValue.get();
        assert.equal(result3, 20, 'Should recompute with new value');
        assert.equal(computeCount, 2, 'Should have recomputed');

        doubledValue.dispose();
    });
});

describe('Reactive Collections', function(it) {
    it('reactiveSet triggers effects on add', () => {
        const set = reactiveSet([1, 2, 3]);
        let effectRuns = 0;

        createEffect(() => {
            const size = set.size;
            effectRuns++;
        });
        flushEffects();
        assert.equal(effectRuns, 1, 'Effect should run initially');

        set.add(4);
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should re-run on add');
        assert.equal(set.size, 4, 'Size should be updated');
    });

    it('reactiveSet triggers effects on delete', () => {
        const set = reactiveSet([1, 2, 3]);
        let effectRuns = 0;

        createEffect(() => {
            const _ = set.has(2);
            effectRuns++;
        });
        flushEffects();

        set.delete(2);
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should re-run on delete');
        assert.equal(set.has(2), false, 'Item should be deleted');
    });

    it('reactiveSet supports iteration', () => {
        const set = reactiveSet([1, 2, 3]);
        const values = [...set];
        assert.equal(values.length, 3, 'Should iterate all values');
        assert.ok(values.includes(1) && values.includes(2) && values.includes(3), 'Should contain all values');
    });

    it('reactiveSet clear triggers effects', () => {
        const set = reactiveSet([1, 2, 3]);
        let effectRuns = 0;

        createEffect(() => {
            const size = set.size;
            effectRuns++;
        });
        flushEffects();

        set.clear();
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should re-run on clear');
        assert.equal(set.size, 0, 'Set should be empty');
    });

    it('reactiveMap triggers effects on set', () => {
        const map = reactiveMap([['a', 1], ['b', 2]]);
        let effectRuns = 0;

        createEffect(() => {
            const val = map.get('a');
            effectRuns++;
        });
        flushEffects();
        assert.equal(effectRuns, 1, 'Effect should run initially');

        map.set('a', 10);
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should re-run on set');
        assert.equal(map.get('a'), 10, 'Value should be updated');
    });

    it('reactiveMap triggers effects on delete', () => {
        const map = reactiveMap([['a', 1], ['b', 2]]);
        let effectRuns = 0;

        createEffect(() => {
            const _ = map.has('a');
            effectRuns++;
        });
        flushEffects();

        map.delete('a');
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should re-run on delete');
        assert.equal(map.has('a'), false, 'Key should be deleted');
    });

    it('reactiveMap supports iteration', () => {
        const map = reactiveMap([['a', 1], ['b', 2]]);
        const entries = [...map];
        assert.equal(entries.length, 2, 'Should iterate all entries');
    });

    it('reactive() auto-wraps Set', () => {
        const state = reactive({ items: new Set([1, 2, 3]) });
        let effectRuns = 0;

        createEffect(() => {
            const size = state.items.size;
            effectRuns++;
        });
        flushEffects();
        assert.equal(effectRuns, 1, 'Effect should run initially');

        state.items.add(4);
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should re-run on add (auto-wrapped Set)');
        assert.equal(state.items.size, 4, 'Size should be updated');
    });

    it('reactive() auto-wraps Map', () => {
        const state = reactive({ data: new Map([['a', 1]]) });
        let effectRuns = 0;

        createEffect(() => {
            const val = state.data.get('a');
            effectRuns++;
        });
        flushEffects();
        assert.equal(effectRuns, 1, 'Effect should run initially');

        state.data.set('a', 10);
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should re-run on set (auto-wrapped Map)');
        assert.equal(state.data.get('a'), 10, 'Value should be updated');
    });

    it('reactive() does not wrap untracked Set/Map', () => {
        const state = reactive({
            items: untracked(new Set([1, 2, 3])),
            data: untracked(new Map([['a', 1]]))
        });

        // untracked Set/Map should NOT be reactive collections
        assert.ok(!isReactiveCollection(state.items), 'Untracked Set should not be reactive');
        assert.ok(!isReactiveCollection(state.data), 'Untracked Map should not be reactive');
    });

    it('nested Set/Map in reactive objects are auto-wrapped', () => {
        const state = reactive({
            nested: {
                items: new Set([1, 2]),
                data: new Map([['x', 1]])
            }
        });

        let effectRuns = 0;
        createEffect(() => {
            const size = state.nested.items.size;
            effectRuns++;
        });
        flushEffects();

        state.nested.items.add(3);
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should re-run on nested Set add');
    });

    it('reactiveSet addAll triggers once', () => {
        const set = reactiveSet([1, 2]);
        let effectRuns = 0;

        createEffect(() => {
            const size = set.size;
            effectRuns++;
        });
        flushEffects();
        assert.equal(effectRuns, 1, 'Effect should run initially');

        set.addAll([3, 4, 5]);
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should run exactly once after addAll');
        assert.equal(set.size, 5, 'Size should be 5');
    });

    it('reactiveSet deleteAll triggers once', () => {
        const set = reactiveSet([1, 2, 3, 4, 5]);
        let effectRuns = 0;

        createEffect(() => {
            const size = set.size;
            effectRuns++;
        });
        flushEffects();

        const deleted = set.deleteAll([2, 3, 4]);
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should run exactly once after deleteAll');
        assert.equal(deleted, 3, 'Should return number of deleted items');
        assert.equal(set.size, 2, 'Size should be 2');
    });

    it('reactiveMap setAll triggers once', () => {
        const map = reactiveMap([['a', 1]]);
        let effectRuns = 0;

        createEffect(() => {
            const size = map.size;
            effectRuns++;
        });
        flushEffects();
        assert.equal(effectRuns, 1, 'Effect should run initially');

        map.setAll([['b', 2], ['c', 3], ['d', 4]]);
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should run exactly once after setAll');
        assert.equal(map.size, 4, 'Size should be 4');
        assert.equal(map.get('c'), 3, 'Should have correct value');
    });

    it('reactiveMap deleteAll triggers once', () => {
        const map = reactiveMap([['a', 1], ['b', 2], ['c', 3], ['d', 4]]);
        let effectRuns = 0;

        createEffect(() => {
            const size = map.size;
            effectRuns++;
        });
        flushEffects();

        const deleted = map.deleteAll(['b', 'c']);
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should run exactly once after deleteAll');
        assert.equal(deleted, 2, 'Should return number of deleted items');
        assert.equal(map.size, 2, 'Size should be 2');
    });
});

describe('Atomic Array Operations', function(it) {
    it('sort() on reactive array is atomic and safe', () => {
        const state = reactive({ items: [3, 1, 4, 1, 5, 9, 2, 6] });
        let effectRuns = 0;

        createEffect(() => {
            // Access the array
            const len = state.items.length;
            effectRuns++;
        });
        flushEffects();
        assert.equal(effectRuns, 1, 'Effect should run once initially');

        // Sort should be atomic - only triggers once, not cause infinite loop
        state.items.sort((a, b) => a - b);
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should run exactly once after sort');
        assert.deepEqual([...state.items], [1, 1, 2, 3, 4, 5, 6, 9], 'Array should be sorted');
    });

    it('reverse() on reactive array is atomic and safe', () => {
        const state = reactive({ items: [1, 2, 3, 4, 5] });
        let effectRuns = 0;

        createEffect(() => {
            const len = state.items.length;
            effectRuns++;
        });
        flushEffects();

        state.items.reverse();
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should run exactly once after reverse');
        assert.deepEqual([...state.items], [5, 4, 3, 2, 1], 'Array should be reversed');
    });
});

describe('Untracked', function(it) {
    it('untracked() marks objects', () => {
        const arr = untracked([1, 2, 3]);
        assert.ok(isUntracked(arr), 'Array should be marked as untracked');
    });

    it('untracked objects are not deeply tracked', () => {
        const state = reactive({
            items: untracked([{ a: 1 }, { a: 2 }])
        });
        let effectRuns = 0;

        createEffect(() => {
            // Access the untracked array
            const len = state.items.length;
            effectRuns++;
        });
        flushEffects();
        assert.equal(effectRuns, 1, 'Effect runs initially');

        // Modifying nested object should NOT trigger effect (it's untracked)
        state.items[0].a = 100;
        flushEffects();
        assert.equal(effectRuns, 1, 'Effect should NOT re-run for nested changes in untracked array');

        // But replacing the array should trigger
        state.items = untracked([{ a: 3 }]);
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should re-run when untracked array is replaced');
    });

    it('auto-applies untracked to reassigned keys', () => {
        const state = reactive({
            items: untracked([1, 2, 3])
        });

        // Replace with new array (should auto-apply untracked)
        state.items = [4, 5, 6];
        assert.ok(isUntracked(state.items), 'Reassigned array should be auto-untracked');
    });
});

describe('Mutation Counter (trackMutations)', function(it) {
    it('trackMutations triggers on property set', () => {
        const state = reactive({ a: 1, b: 2 });
        let effectRuns = 0;

        createEffect(() => {
            trackMutations(state);
            effectRuns++;
        });
        flushEffects();
        assert.equal(effectRuns, 1, 'Effect should run initially');

        state.a = 10;
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should re-run on any property change');

        state.b = 20;
        flushEffects();
        assert.equal(effectRuns, 3, 'Effect should re-run on different property change');
    });

    it('trackMutations triggers on array mutation (direct)', () => {
        const items = reactive([1, 2, 3]);
        let effectRuns = 0;

        createEffect(() => {
            trackMutations(items);
            effectRuns++;
        });
        flushEffects();
        assert.equal(effectRuns, 1, 'Effect should run initially');

        items.push(4);
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should re-run on array push');

        items.sort((a, b) => b - a);
        flushEffects();
        assert.equal(effectRuns, 3, 'Effect should re-run on array sort');
    });

    it('trackMutations on parent does not track nested array mutations', () => {
        // This is expected behavior - trackMutations only tracks direct mutations
        const state = reactive({ items: [1, 2, 3] });
        let effectRuns = 0;

        createEffect(() => {
            trackMutations(state);
            effectRuns++;
        });
        flushEffects();
        assert.equal(effectRuns, 1, 'Effect should run initially');

        // Nested mutation - parent doesn't see it
        state.items.push(4);
        flushEffects();
        assert.equal(effectRuns, 1, 'Effect should NOT re-run on nested array mutation');

        // But replacing the array does trigger
        state.items = [5, 6, 7];
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should re-run when array is replaced');
    });

    it('trackMutations triggers on delete', () => {
        const state = reactive({ a: 1, b: 2 });
        let effectRuns = 0;

        createEffect(() => {
            trackMutations(state);
            effectRuns++;
        });
        flushEffects();

        delete state.a;
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should re-run on property delete');
    });

    it('trackMutations is O(1) - does not walk all properties', () => {
        // Create object with many properties
        const data = {};
        for (let i = 0; i < 1000; i++) {
            data[`prop${i}`] = i;
        }
        const state = reactive(data);
        let effectRuns = 0;

        // trackMutations should be O(1), not O(n) like trackAllDependencies
        createEffect(() => {
            trackMutations(state);
            effectRuns++;
        });
        flushEffects();
        assert.equal(effectRuns, 1, 'Effect should run initially');

        // Modify one property - should trigger the effect
        state.prop500 = 999;
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should re-run on property change');

        // The key point: trackMutations establishes dependency without
        // walking all 1000 properties - it just reads the mutation counter
    });

    it('trackMutations works with nested objects', () => {
        const state = reactive({
            nested: { deep: { value: 1 } }
        });
        let effectRuns = 0;

        createEffect(() => {
            trackMutations(state);
            effectRuns++;
        });
        flushEffects();

        // Note: trackMutations only tracks the top-level object's mutations
        // Nested mutations need their own trackMutations call or trigger via set
        state.nested = { deep: { value: 2 } };
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should re-run when nested object is replaced');
    });
});

describe('Array Index Optimization', function(it) {
    it('array index access tracks length, not individual indices', () => {
        const state = reactive({ items: ['a', 'b', 'c'] });
        let effectRuns = 0;

        createEffect(() => {
            // Access specific indices
            const first = state.items[0];
            const second = state.items[1];
            effectRuns++;
        });
        flushEffects();
        assert.equal(effectRuns, 1, 'Effect should run initially');

        // Direct index replacement triggers via length
        state.items[0] = 'x';
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should re-run on index replacement');

        // push triggers via length
        state.items.push('d');
        flushEffects();
        assert.equal(effectRuns, 3, 'Effect should re-run on push');
    });

    it('array iteration is O(1) for tracking', () => {
        // Create large array
        const items = [];
        for (let i = 0; i < 1000; i++) {
            items.push({ id: i, name: `item${i}` });
        }
        const state = reactive({ items });
        let effectRuns = 0;

        createEffect(() => {
            // Iterate entire array - should only create 1 dependency (on length)
            for (const item of state.items) {
                const _ = item.name;
            }
            effectRuns++;
        });
        flushEffects();
        assert.equal(effectRuns, 1, 'Effect should run initially');

        // Modifying any item triggers re-run
        state.items[500] = { id: 500, name: 'modified' };
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should re-run on item replacement');
    });

    it('nested property access still tracks correctly', () => {
        const state = reactive({ items: [{ name: 'first' }, { name: 'second' }] });
        let effectRuns = 0;

        createEffect(() => {
            const name = state.items[0].name;
            effectRuns++;
        });
        flushEffects();
        assert.equal(effectRuns, 1, 'Effect should run initially');

        // Nested property change triggers via nested proxy
        state.items[0].name = 'modified';
        flushEffects();
        assert.equal(effectRuns, 2, 'Effect should re-run on nested property change');
    });
});

describe('Reactivity - adversarial-review regressions', function(it) {
    it('createRoot disposes EVERY effect created in it, not just the first', () => {
        const state = reactive({ a: 0, b: 0 });
        let r1 = 0, r2 = 0;
        const disposeRoot = createRoot(() => {
            createEffect(() => { r1++; void state.a; });
            createEffect(() => { r2++; void state.b; });
        });
        disposeRoot();
        state.a++; state.b++; flushEffects();
        assert.equal(r1, 1, 'first effect disposed');
        assert.equal(r2, 1, 'second effect ALSO disposed (was orphaned)');
    });

    it('sort() on a large reactive array does not overflow or lose data', () => {
        const state = reactive({ items: Array.from({ length: 200000 }, (_, i) => i) });
        state.items.sort((a, b) => b - a);
        assert.equal(state.items.length, 200000, 'length preserved');
        assert.equal(state.items[0], 199999, 'sorted, data intact');
    });

    it('delete arr[i] notifies index/length readers', () => {
        const state = reactive({ arr: [1, 2, 3] });
        let seen;
        createEffect(() => { seen = state.arr[1]; });
        delete state.arr[1];
        flushEffects();
        assert.equal(seen, undefined, 'reader saw the deletion');
    });

    it('computed that threw on first run heals and notifies dependents', () => {
        const state = reactive({ obj: null });
        const c = computed(() => state.obj.x);   // throws first run
        let seen;
        createEffect(() => { try { seen = c.get(); } catch { seen = 'ERR'; } });
        assert.equal(seen, 'ERR', 'first run errored');
        state.obj = { x: 5 };
        flushEffects();
        assert.equal(seen, 5, 'dependent re-ran after the computed healed');
    });
});

describe('Reactivity - vnode detection by marker (not shape)', function(it) {
    it('user state with a _compiled field is still deeply reactive', () => {
        // Regression: the old shape-sniff ('_compiled' in obj && '_values' in obj)
        // silently froze user objects that merely had those field names.
        const state = reactive({ doc: { _compiled: 'v1', _values: [1], name: 'draft' } });
        assert.ok(isReactive(state.doc), 'object with _compiled/_values fields is wrapped');
        let seen;
        createEffect(() => { seen = state.doc.name; });
        flushEffects();
        state.doc.name = 'final';
        flushEffects();
        assert.equal(seen, 'final', 'nested writes trigger effects');
    });

    it('user state with _compiled + _renderFn / _array fields is still reactive', () => {
        const state = reactive({
            a: { _compiled: 1, _renderFn: 2, val: 0 },
            b: { _compiled: 1, _array: [], val: 0 }
        });
        assert.ok(isReactive(state.a), 'contain-shaped user object is wrapped');
        assert.ok(isReactive(state.b), 'memoEach-shaped user object is wrapped');
        let runs = 0;
        createEffect(() => { runs++; void state.a.val; void state.b.val; });
        flushEffects();
        state.a.val = 1;
        flushEffects();
        state.b.val = 1;
        flushEffects();
        assert.equal(runs, 3, 'writes to both objects trigger the effect');
    });

    it('framework vnodes stored in state are NOT proxied', async () => {
        const { html } = await import('../../lib/framework.js');
        const vnode = html`<div>${1}</div>`;
        const state = reactive({ tpl: vnode });
        assert.ok(!isReactive(state.tpl), 'html vnode passes through unwrapped');
        assert.ok(state.tpl === vnode, 'identity preserved');
    });
});
