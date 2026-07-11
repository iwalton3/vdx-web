/**
 * Tests for Utility Functions
 */

import { describe, assert } from './test-runner.js';
import {
    sleep,
    debounce,
    throttle,
    notify,
    notifications,
    dismissNotification,
    isEmpty,
    clamp,
    range,
    relativeTime,
    localStore,
    darkTheme,
    setThemeMode,
    resolveDarkMode,
    systemPrefersDark,
    THEME_MODES
} from '../lib/utils.js';

describe('Utility Functions', function(it) {
    it('sleep() delays execution', async () => {
        const start = Date.now();
        await sleep(100);
        const end = Date.now();

        assert.ok(end - start >= 90, 'Should delay at least 90ms'); // Allow some tolerance
    });

    it('range() creates arrays correctly', () => {
        const r1 = range(5);
        const r2 = range(2, 5);
        const r3 = range(0, 10, 2);

        assert.deepEqual(r1, [0, 1, 2, 3, 4], 'Should create range from 0 to n');
        assert.deepEqual(r2, [2, 3, 4], 'Should create range from a to b');
        assert.deepEqual(r3, [0, 2, 4, 6, 8], 'Should create range with step');
    });

    it('isEmpty() checks for empty values', () => {
        assert.ok(isEmpty(null), 'null should be empty');
        assert.ok(isEmpty(''), 'Empty string should be empty');
        assert.ok(isEmpty('   '), 'Whitespace string should be empty');
        assert.ok(isEmpty([]), 'Empty array should be empty');
        assert.ok(isEmpty({}), 'Empty object should be empty');

        assert.ok(!isEmpty('hello'), 'Non-empty string should not be empty');
        assert.ok(!isEmpty([1, 2, 3]), 'Non-empty array should not be empty');
        assert.ok(!isEmpty({ a: 1 }), 'Non-empty object should not be empty');
    });

    it('clamp() constrains values', () => {
        assert.equal(clamp(5, 0, 10), 5, 'Value within range should stay same');
        assert.equal(clamp(-5, 0, 10), 0, 'Value below min should clamp to min');
        assert.equal(clamp(15, 0, 10), 10, 'Value above max should clamp to max');
    });

    it('relativeTime() formats dates', () => {
        const now = new Date();
        const justNow = new Date(now.getTime() - 30 * 1000); // 30 seconds ago
        const hoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

        assert.equal(relativeTime(justNow), 'just now', 'Should show "just now" for recent times');
        assert.ok(relativeTime(hoursAgo).includes('hours ago'), 'Should show hours for older times');
    });
});

describe('Notification System', function(it) {
    it('creates notifications', () => {
        const initialCount = notifications.state.list.length;
        const id = notify('Test message', 'info', 0); // ttl=0 means no auto-dismiss

        assert.ok(typeof id === 'number', 'Should return notification ID');
        assert.equal(notifications.state.list.length, initialCount + 1, 'Should add notification to list');

        // Cleanup
        dismissNotification(id);
    });

    it('auto-dismisses notifications after TTL', async () => {
        const id = notify('Test message', 'warn', 0.1); // 0.1 seconds

        assert.ok(notifications.state.list.some(n => n.id === id), 'Should have notification initially');

        // Wait for TTL
        await sleep(150);

        assert.ok(!notifications.state.list.some(n => n.id === id), 'Should auto-dismiss after TTL');
    });

    it('manually dismisses notifications', () => {
        const id = notify('Test message', 'error', 0);

        assert.ok(notifications.state.list.some(n => n.id === id), 'Should have notification');

        dismissNotification(id);

        assert.ok(!notifications.state.list.some(n => n.id === id), 'Should dismiss notification');
    });

    it('supports different severity levels', () => {
        const infoId = notify('Info', 'info', 0);
        const warnId = notify('Warning', 'warn', 0);
        const errorId = notify('Error', 'error', 0);

        const infoNotif = notifications.state.list.find(n => n.id === infoId);
        const warnNotif = notifications.state.list.find(n => n.id === warnId);
        const errorNotif = notifications.state.list.find(n => n.id === errorId);

        assert.equal(infoNotif.severity, 'info', 'Should have info severity');
        assert.equal(warnNotif.severity, 'warn', 'Should have warn severity');
        assert.equal(errorNotif.severity, 'error', 'Should have error severity');

        // Cleanup
        dismissNotification(infoId);
        dismissNotification(warnId);
        dismissNotification(errorId);
    });
});

describe('Local Storage', function(it) {
    it('creates store with localStorage persistence', () => {
        const store = localStore('test', { value: 42 });

        assert.ok(store.state, 'Should have state');
        assert.equal(store.state.value, 42, 'Should have initial value');
    });

    it('persists changes to localStorage', () => {
        const store = localStore('test-persist', { count: 0 });

        store.state.count = 5;

        // Give it a moment to persist
        setTimeout(() => {
            const stored = localStorage.getItem('swapi_test-persist');
            assert.ok(stored, 'Should save to localStorage');

            const parsed = JSON.parse(stored);
            assert.equal(parsed.count, 5, 'Should persist the correct value');
        }, 50);
    });

    it('loads existing values from localStorage', () => {
        // Set a value first
        localStorage.setItem('swapi_test-load', JSON.stringify({ loaded: true }));

        const store = localStore('test-load', { loaded: false });

        assert.ok(store.state.loaded, 'Should load existing value from localStorage');
    });
});

describe('Dark Theme', function(it) {
    it('has dark theme store with a valid mode', () => {
        assert.ok(darkTheme, 'Should have darkTheme store');
        assert.ok(darkTheme.state, 'Should have state');
        assert.ok(THEME_MODES.includes(darkTheme.state.mode), 'Should have a valid mode');
    });

    it('setThemeMode changes the mode', () => {
        const initial = darkTheme.state.mode;

        setThemeMode('dark');
        assert.equal(darkTheme.state.mode, 'dark', 'Should set dark mode');

        setThemeMode('light');
        assert.equal(darkTheme.state.mode, 'light', 'Should set light mode');

        setThemeMode('auto');
        assert.equal(darkTheme.state.mode, 'auto', 'Should set auto mode');

        // Restore original
        setThemeMode(initial);
    });

    it('setThemeMode falls back to auto for invalid values', () => {
        const initial = darkTheme.state.mode;

        setThemeMode('nonsense');
        assert.equal(darkTheme.state.mode, 'auto', 'Invalid mode should fall back to auto');

        setThemeMode(initial);
    });

    it('resolveDarkMode maps modes to a dark boolean', () => {
        assert.equal(resolveDarkMode('dark'), true, 'dark -> true');
        assert.equal(resolveDarkMode('light'), false, 'light -> false');
        assert.equal(resolveDarkMode('auto'), systemPrefersDark(), 'auto -> OS preference');
    });
});

describe('Debounce and Throttle', function(it) {
    it('debounce() delays function execution', async () => {
        let callCount = 0;
        const debouncedFn = debounce(() => callCount++, 50);

        // Call multiple times rapidly
        debouncedFn();
        debouncedFn();
        debouncedFn();

        // Should not execute immediately
        assert.equal(callCount, 0, 'Should not execute immediately');

        // Wait for debounce
        await sleep(100);

        // Should only execute once
        assert.equal(callCount, 1, 'Should execute once after debounce delay');
    });

    it('throttle() limits function execution rate', async () => {
        let callCount = 0;
        const throttledFn = throttle(() => callCount++, 50);

        // Call multiple times
        throttledFn(); // Should execute
        throttledFn(); // Should not execute (throttled)
        throttledFn(); // Should not execute (throttled)

        assert.equal(callCount, 1, 'Should execute once immediately');

        // Wait for throttle to reset
        await sleep(100);

        throttledFn(); // Should execute
        assert.equal(callCount, 2, 'Should execute again after throttle period');
    });
});
