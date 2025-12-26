/**
 * Tests for Reactivity System
 */

import { describe, assert } from './test-runner.js';
import { reactive, createEffect, computed, watch, isReactive, trackAllDependencies, memo, flushEffects } from '../lib/framework.js';

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
