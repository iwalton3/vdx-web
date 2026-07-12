/**
 * Tests for versionedList()
 */

import { describe, assert } from './test-runner.js';
import {
    versionedList, reactive, createEffect, isUntracked, isReactive,
    defineComponent, Component, html, nextRender, flushEffects
} from '../../lib/framework.js';
import { createWindowing } from '../../lib/windowing.js';

describe('versionedList: basics', function(it) {
    it('behaves like the wrapped array', () => {
        const list = versionedList([1, 2, 3]);
        assert.equal(list.length, 3, 'length');
        assert.equal(list[0], 1, 'index read');
        assert.deepEqual(list.slice(1), [2, 3], 'slice works');
        assert.deepEqual([...list], [1, 2, 3], 'iterable');
    });

    it('starts at version 0 and exposes touch/replace', () => {
        const list = versionedList([]);
        assert.equal(list.version, 0, 'initial version');
        assert.isType(list.touch, 'function', 'touch is a function');
        assert.isType(list.replace, 'function', 'replace is a function');
    });

    it('is marked untracked so reactive() does not wrap it', () => {
        const list = versionedList([{ a: 1 }]);
        assert.ok(isUntracked(list), 'wrapper is untracked');
        const state = reactive({ list });
        // Reading state.list returns the SAME wrapper (not a re-proxied copy)
        assert.equal(state.list, list, 'not re-wrapped by reactive()');
        assert.ok(!isReactive(state.list[0]), 'items are returned raw (not proxied)');
    });
});

describe('versionedList: reactivity', function(it) {
    it('bumps version and re-runs effects on push', () => {
        const list = versionedList([]);
        let runs = 0;
        let seenLen = -1;
        const { dispose } = createEffect(() => { seenLen = list.length; runs++; });
        assert.equal(runs, 1, 'effect ran once');

        list.push('a');
        assert.equal(list.version, 1, 'version bumped');
        flushEffects();
        assert.equal(runs, 2, 'effect re-ran on push');
        assert.equal(seenLen, 1, 'effect saw new length');
        dispose();
    });

    it('bumps on splice, index write, and length write', () => {
        const list = versionedList(['a', 'b', 'c']);
        let runs = 0;
        const { dispose } = createEffect(() => { void list.length; void list[0]; runs++; });
        const base = runs;

        list.splice(1, 1);
        flushEffects();
        assert.equal(runs, base + 1, 'splice bumped');
        list[0] = 'z';
        flushEffects();
        assert.equal(runs, base + 2, 'index write bumped');
        list.length = 1;
        flushEffects();
        assert.equal(runs, base + 3, 'length write bumped');
        dispose();
    });

    it('touch() bumps for in-place item edits', () => {
        const list = versionedList([{ title: 'x' }]);
        let runs = 0;
        const { dispose } = createEffect(() => { void list.length; runs++; });
        const base = runs;

        list[0].title = 'changed';   // raw item edit - NOT tracked
        flushEffects();
        assert.equal(runs, base, 'item field edit did not bump');
        list.touch();
        flushEffects();
        assert.equal(runs, base + 1, 'touch() bumped');
        dispose();
    });

    it('replace() swaps contents with a single bump', () => {
        const list = versionedList([1, 2]);
        let runs = 0;
        const { dispose } = createEffect(() => { void list.length; runs++; });
        const base = runs;
        const before = list.version;

        list.replace([9, 8, 7]);
        assert.deepEqual([...list], [9, 8, 7], 'contents replaced');
        assert.equal(list.version, before + 1, 'exactly one version bump');
        flushEffects();
        assert.equal(runs, base + 1, 'effect ran once');
        dispose();
    });

    it('item-field edits are not tracked (untracked contract)', () => {
        const list = versionedList([{ n: 0 }]);
        let runs = 0;
        const { dispose } = createEffect(() => { void list[0]; void list.length; runs++; });
        const base = runs;
        list[0].n = 5;
        assert.equal(runs, base, 'no re-run on item mutation');
        dispose();
    });
});

describe('versionedList: windowing integration', function(it) {
    it('createWindowing auto-refreshes when list.length changes (no manual refresh)', async () => {
        const list = versionedList([]);
        for (let i = 0; i < 5; i++) list.push({ id: i });

        const host = document.createElement('div');
        Object.defineProperty(host, 'clientHeight', { value: 200, configurable: true });
        document.body.appendChild(host);

        const win = createWindowing(host, {
            itemHeight: 20,
            count: () => list.length
        });

        // Let the deferred attach + count effect wire up.
        await new Promise(r => setTimeout(r, 0));
        const endBefore = win.visibleEnd;

        // Structural growth with NO win.refresh() call.
        for (let i = 5; i < 50; i++) list.push({ id: i });
        await new Promise(r => setTimeout(r, 0));

        assert.ok(win.visibleEnd > endBefore, `window grew after push (was ${endBefore}, now ${win.visibleEnd})`);
        assert.equal(win.totalHeight, 50 * 20, 'totalHeight reflects new count');

        win.destroy();
        document.body.removeChild(host);
    });
});

describe('versionedList: in component state', function(it) {
    it('drives template re-renders through component state', async () => {
        class VlComp extends Component {
            constructor(props) { super(props); this.state = { items: versionedList(['a']) }; }
            template() { return html`<div id="n">${this.state.items.length}</div>`; }
        }
        defineComponent('vl-comp', VlComp);

        const el = document.createElement('vl-comp');
        document.body.appendChild(el);
        await el.nextRender();
        assert.equal(el.querySelector('#n').textContent, '1', 'initial count');

        el.state.items.push('b');
        await el.nextRender();
        assert.equal(el.querySelector('#n').textContent, '2', 're-rendered on push');

        document.body.removeChild(el);
    });
});

describe('versionedList: replace at scale', function(it) {
    it('replace() handles very large arrays (no spread/arg-limit overflow)', () => {
        const list = versionedList([1, 2, 3]);
        const big = new Array(200000);
        for (let i = 0; i < big.length; i++) big[i] = i;
        list.replace(big);
        assert.equal(list.length, 200000, 'replaced with 200k items');
        assert.equal(list[199999], 199999, 'last item correct');
        list.replace([7]);
        assert.equal(list.length, 1, 'shrinks correctly');
        assert.equal(list[0], 7, 'content correct after shrink');
    });
});
