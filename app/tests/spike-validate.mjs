#!/usr/bin/env node
/**
 * Spike Validation - Node.js
 *
 * Validates the core logic of the deferred children system
 * without requiring browser DOM. Tests the data structures and flow.
 */

import { reactive, createEffect } from '../lib/core/reactivity.js';

// Mock DOM for testing
class MockElement {
    constructor(tag) {
        this.tagName = tag;
        this.children = [];
        this.attributes = {};
        this.textContent = '';
        this.className = '';
        this.style = {};
    }
    appendChild(child) {
        this.children.push(child);
    }
    setAttribute(name, value) {
        this.attributes[name] = value;
    }
    querySelector(selector) {
        // Simple mock
        return null;
    }
}

class MockTextNode {
    constructor(text) {
        this.textContent = text;
        this.nodeType = 3;
    }
}

// Simplified deferred child implementation for validation
const DEFERRED_CHILDREN = Symbol('vdx:deferred-children');

function createDeferredChild(compiled, values, parentComponent) {
    return {
        [DEFERRED_CHILDREN]: true,
        compiled,
        values,
        parentComponent,
        slotName: null
    };
}

function isDeferredChild(value) {
    return value && typeof value === 'object' && value[DEFERRED_CHILDREN] === true;
}

// Test utilities
let passCount = 0;
let failCount = 0;

function test(name, fn) {
    try {
        fn();
        passCount++;
        console.log(`  ✅ ${name}`);
    } catch (error) {
        failCount++;
        console.error(`  ❌ ${name}`);
        console.error(`     ${error.message}`);
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message || 'Not equal'}: expected ${expected}, got ${actual}`);
    }
}

// === TESTS ===

console.log('\n🧪 Spike Validation - Core Logic\n');

console.log('📦 Deferred Child Mechanics');

test('createDeferredChild captures all data', () => {
    const mockParent = { state: { foo: 'bar' } };
    const compiled = { type: 'element', tag: 'p' };
    const values = [1, 2, 3];

    const deferred = createDeferredChild(compiled, values, mockParent);

    assert(isDeferredChild(deferred), 'Should be identified as deferred');
    assertEqual(deferred.parentComponent, mockParent, 'Should capture parent');
    assertEqual(deferred.compiled, compiled, 'Should capture compiled');
    assertEqual(deferred.values.length, 3, 'Should capture values');
});

test('isDeferredChild correctly identifies types', () => {
    const deferred = createDeferredChild({}, [], null);

    assert(isDeferredChild(deferred), 'Should identify deferred child');
    assert(!isDeferredChild({}), 'Should not identify plain object');
    assert(!isDeferredChild(null), 'Should not identify null');
    assert(!isDeferredChild('string'), 'Should not identify string');
    assert(!isDeferredChild([1, 2, 3]), 'Should not identify array');
});

console.log('\n📦 Reactive Context Preservation');

test('parent state is accessible from child context', () => {
    const parentState = reactive({ message: 'Hello' });
    const mockParent = { state: parentState };

    const deferred = createDeferredChild(
        { type: 'text' },
        [() => parentState.message],  // Function captures parent state
        mockParent
    );

    // Simulate what would happen during instantiation
    const valueGetter = deferred.values[0];
    assertEqual(valueGetter(), 'Hello', 'Should access parent state');

    // Update parent state
    parentState.message = 'Updated';
    assertEqual(valueGetter(), 'Updated', 'Should see updated state');
});

test('effect tracks parent state changes', async () => {
    const parentState = reactive({ count: 0 });
    let effectRunCount = 0;
    let lastValue = null;

    createEffect(() => {
        effectRunCount++;
        lastValue = parentState.count;
    });

    // Initial run
    await new Promise(r => queueMicrotask(r));
    assertEqual(effectRunCount, 1, 'Effect should run once initially');
    assertEqual(lastValue, 0, 'Should have initial value');

    // Update
    parentState.count = 5;
    await new Promise(r => queueMicrotask(r));
    assertEqual(effectRunCount, 2, 'Effect should run again on update');
    assertEqual(lastValue, 5, 'Should have updated value');
});

test('nested state access works through context chain', () => {
    // Simulate: Parent -> Wrapper -> Child with ${parent.state.x}
    const parentState = reactive({
        user: { name: 'Alice' }
    });

    const mockParent = { state: parentState };

    // Deep child references nested parent state
    const deepValueGetter = () => parentState.user.name;

    // Create chain of deferred children
    const deepChild = createDeferredChild(
        { type: 'text' },
        [deepValueGetter],
        mockParent  // Parent context preserved!
    );

    const middleChild = createDeferredChild(
        { type: 'element', children: [deepChild.compiled] },
        [],
        mockParent
    );

    // Verify context chain
    assertEqual(deepChild.parentComponent.state.user.name, 'Alice');

    // Update nested state
    parentState.user.name = 'Bob';
    assertEqual(deepValueGetter(), 'Bob', 'Should track nested state changes');
});

console.log('\n📦 Slot Routing');

test('named slots are captured correctly', () => {
    const mockParent = { state: {} };

    const headerChild = createDeferredChild({ type: 'element' }, [], mockParent);
    headerChild.slotName = 'header';

    const footerChild = createDeferredChild({ type: 'element' }, [], mockParent);
    footerChild.slotName = 'footer';

    const defaultChild = createDeferredChild({ type: 'element' }, [], mockParent);
    // No slotName = default slot

    // Simulate grouping by slot
    const children = [headerChild, defaultChild, footerChild];
    const defaultSlot = [];
    const namedSlots = {};

    for (const child of children) {
        if (child.slotName) {
            if (!namedSlots[child.slotName]) {
                namedSlots[child.slotName] = [];
            }
            namedSlots[child.slotName].push(child);
        } else {
            defaultSlot.push(child);
        }
    }

    assertEqual(defaultSlot.length, 1, 'Should have 1 default child');
    assertEqual(namedSlots.header?.length, 1, 'Should have 1 header slot child');
    assertEqual(namedSlots.footer?.length, 1, 'Should have 1 footer slot child');
});

console.log('\n📦 Effect Cleanup');

test('effects can be disposed', async () => {
    const state = reactive({ value: 0 });
    let runCount = 0;

    const { dispose } = createEffect(() => {
        runCount++;
        state.value; // Track
    });

    await new Promise(r => queueMicrotask(r));
    assertEqual(runCount, 1, 'Initial run');

    state.value = 1;
    await new Promise(r => queueMicrotask(r));
    assertEqual(runCount, 2, 'After first update');

    // Dispose
    dispose();

    state.value = 2;
    await new Promise(r => queueMicrotask(r));
    assertEqual(runCount, 2, 'Should not run after dispose');
});

// === SUMMARY ===

console.log('\n' + '='.repeat(50));
console.log(`\n📊 Results: ${passCount} passed, ${failCount} failed\n`);

if (failCount > 0) {
    process.exit(1);
}
