/**
 * Tests for the row-gestures controller and its pure reorder-math helpers.
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, memoEach, untracked } from '../../lib/framework.js';
import { createWindowing } from '../../lib/windowing.js';
import {
    createRowGestures,
    gapToRemoveInsertIndex,
    gapToGapIndex,
    groupReorderTargets,
    isNoopGap
} from '../../lib/gestures.js';

// --- test component factory -------------------------------------------------
// A windowed list wired to a gestures controller. Records semantic callbacks
// on the element (_reorders / _taps / _longPresses) for assertions. When
// `selection` is true, exposes a real selection set (el._selected) and a
// selection adapter so group drag can be exercised.
function defineGestureList(tag, itemCount, { selection = false, gesture = {} } = {}) {
    defineComponent(tag, {
        data() {
            this._win = createWindowing(this, {
                itemHeight: 50,
                buffer: 4,
                count: () => this.state.items.length,
                fallbackHeight: 200
            });
            this._reorders = [];
            this._taps = [];
            this._longPresses = [];
            this._selected = new Set();

            const options = {
                itemHeight: 50,
                windowing: this._win,
                count: () => this.state.items.length,
                onReorder: (from, gap) => this._reorders.push([from.slice(), gap]),
                onTap: (i) => this._taps.push(i),
                onLongPress: (i) => this._longPresses.push(i),
                ...gesture
            };
            if (selection) {
                options.selection = {
                    isSelected: (i) => this._selected.has(i),
                    indices: () => [...this._selected]
                };
            }
            this._g = createRowGestures(this, options);

            return {
                items: untracked(Array.from({ length: itemCount }, (_, i) => ({ id: i, label: `Item ${i}` })))
            };
        },
        unmounted() {
            this._g.destroy();
            this._win.destroy();
        },
        template() {
            const win = this._win;
            return html`
                <div class="spacer" style="height: ${win.totalHeight}px;"></div>
                <div class="window" style="transform: translateY(${win.offsetY}px);">
                    ${memoEach(this.state.items.slice(win.visibleStart, win.visibleEnd),
                        (item) => html`<div class="row" data-index="${item.id}" style="height: 50px;">${item.label}</div>`,
                        item => item.id,
                        { trustKey: true })}
                </div>
            `;
        },
        styles: /*css*/`
            :host { display: block; height: 200px; overflow-y: auto; position: relative; }
            .window { position: absolute; top: 0; left: 0; right: 0; }
        `
    });

    const el = document.createElement(tag);
    el.style.cssText = 'display:block;height:200px;overflow-y:auto;position:relative;';
    document.body.appendChild(el);
    return el;
}

function ready(el, ms = 150) {
    return new Promise(resolve => setTimeout(() => resolve(el), ms));
}

function rowOf(el, index) {
    return el.querySelector(`[data-index="${index}"]`);
}

// Synthetic drag event over a row, clientY placed in its upper or lower half.
function dragEvt(row, half) {
    const rect = row.getBoundingClientRect();
    const clientY = half === 'upper' ? rect.top + rect.height * 0.25 : rect.top + rect.height * 0.75;
    return {
        currentTarget: row,
        clientY,
        preventDefault() {},
        dataTransfer: { setData() {}, effectAllowed: '', dropEffect: '' }
    };
}

// Synthetic touch event with a preventDefault tripwire.
function touchEvt(x, y) {
    const e = { touches: [{ clientX: x, clientY: y }], defaultPrevented: false };
    e.preventDefault = () => { e.defaultPrevented = true; };
    e.stopPropagation = () => {};
    return e;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
describe('Row Gesture Pure Helpers', function(it) {
    it('gapToRemoveInsertIndex decrements gaps past the source', () => {
        // moving down: removal shifts the insertion point left by one
        assert.equal(gapToRemoveInsertIndex(2, 5), 4, 'gap 5 from 2 -> to 4');
        assert.equal(gapToRemoveInsertIndex(2, 3), 2, 'gap just below (3) -> to 2 (no-op vs from)');
        // moving up (or gap <= from): passthrough
        assert.equal(gapToRemoveInsertIndex(5, 2), 2, 'gap 2 from 5 -> to 2');
        assert.equal(gapToRemoveInsertIndex(5, 5), 5, 'gap == from -> to == from');
        assert.equal(gapToRemoveInsertIndex(0, 0), 0, 'top edge');
    });

    it('gapToGapIndex is the identity passthrough', () => {
        assert.equal(gapToGapIndex(3, 0), 0);
        assert.equal(gapToGapIndex(3, 7), 7);
        assert.equal(gapToGapIndex(0, 4), 4);
    });

    it('groupReorderTargets matches the selection-follow math', () => {
        // [0,1] dropped at gap 5 (lower-half of row 4): both removed before the
        // gap, insertion pulls left by 2 -> target 3, block lands at [3,4]
        const a = groupReorderTargets([0, 1], 5);
        assert.equal(a.target, 3, 'target = gap - (indices before gap)');
        assert.deepEqual(a.newIndices, [3, 4], 'block occupies [target..target+n-1]');

        // scattered selection [2,4] to the very top: nothing before gap 0
        const b = groupReorderTargets([2, 4], 0);
        assert.equal(b.target, 0);
        assert.deepEqual(b.newIndices, [0, 1]);

        // scattered [2,4] to gap 6 (both before it): target 4, lands [4,5]
        const c = groupReorderTargets([4, 2], 6);
        assert.equal(c.target, 4, 'unsorted input is sorted internally');
        assert.deepEqual(c.newIndices, [4, 5]);
    });

    it('isNoopGap: single row no-ops at gaps i and i+1 only', () => {
        assert.equal(isNoopGap([3], 3), true, 'gap i');
        assert.equal(isNoopGap([3], 4), true, 'gap i+1');
        assert.equal(isNoopGap([3], 2), false, 'gap above');
        assert.equal(isNoopGap([3], 5), false, 'gap below');
        assert.equal(isNoopGap([0], 0), true, 'top edge no-op');
    });

    it('isNoopGap: group no-ops only within a contiguous selected run', () => {
        // contiguous [2,3]: gaps hugging/inside the run are no-ops
        assert.equal(isNoopGap([2, 3], 2), true, 'gap at block start');
        assert.equal(isNoopGap([2, 3], 3), true, 'gap inside block');
        assert.equal(isNoopGap([2, 3], 4), true, 'gap at block end');
        assert.equal(isNoopGap([2, 3], 1), false, 'gap above block');
        assert.equal(isNoopGap([2, 3], 5), false, 'gap below block');
        // non-contiguous [1,3]: any drop compacts the block, never a no-op
        assert.equal(isNoopGap([1, 3], 1), false);
        assert.equal(isNoopGap([1, 3], 3), false);
    });
});

// ---------------------------------------------------------------------------
// Desktop drag-and-drop over a windowed list
// ---------------------------------------------------------------------------
describe('Row Gesture Drag-and-Drop', function(it) {
    it('reports the lower-half gap when dragging down', async () => {
        const el = await ready(defineGestureList('gest-dnd-down', 50));
        const g = el._g;

        g.dragStart(2, dragEvt(rowOf(el, 2), 'upper'));
        g.dragOver(5, dragEvt(rowOf(el, 5), 'lower'));   // gap = 6
        g.drop(5, dragEvt(rowOf(el, 5), 'lower'));

        assert.equal(el._reorders.length, 1, 'one reorder emitted');
        assert.deepEqual(el._reorders[0][0], [2], 'fromIndices = [2]');
        assert.equal(el._reorders[0][1], 6, 'gap = index + 1 for lower half');

        document.body.removeChild(el);
    });

    it('reports the upper-half gap when dragging up', async () => {
        const el = await ready(defineGestureList('gest-dnd-up', 50));
        const g = el._g;

        g.dragStart(5, dragEvt(rowOf(el, 5), 'upper'));
        g.dragOver(2, dragEvt(rowOf(el, 2), 'upper'));   // gap = 2
        g.drop(2, dragEvt(rowOf(el, 2), 'upper'));

        assert.equal(el._reorders.length, 1);
        assert.deepEqual(el._reorders[0][0], [5]);
        assert.equal(el._reorders[0][1], 2, 'gap = index for upper half');

        document.body.removeChild(el);
    });

    it('suppresses no-op drops adjacent to the dragged row', async () => {
        const el = await ready(defineGestureList('gest-dnd-noop', 50));
        const g = el._g;

        // drop on the dragged row's own upper half (gap == from) -> no-op
        g.dragStart(3, dragEvt(rowOf(el, 3), 'upper'));
        g.drop(3, dragEvt(rowOf(el, 3), 'upper'));
        assert.equal(el._reorders.length, 0, 'gap == from filtered');

        // drop on its lower half (gap == from + 1) -> also a no-op
        g.dragStart(3, dragEvt(rowOf(el, 3), 'upper'));
        g.drop(3, dragEvt(rowOf(el, 3), 'lower'));
        assert.equal(el._reorders.length, 0, 'gap == from + 1 filtered');

        document.body.removeChild(el);
    });

    it('places and cleans up the insertion-edge indicator', async () => {
        const el = await ready(defineGestureList('gest-dnd-indicator', 50));
        const g = el._g;

        g.dragStart(2, dragEvt(rowOf(el, 2), 'upper'));

        g.dragOver(5, dragEvt(rowOf(el, 5), 'upper'));   // gap 5 -> before row 5
        assert.ok(rowOf(el, 5).classList.contains('drag-over'), 'upper half -> before class');
        assert.ok(!rowOf(el, 5).classList.contains('drag-over-below'), 'no after class yet');

        g.dragOver(5, dragEvt(rowOf(el, 5), 'lower'));   // gap 6 -> after row 5
        assert.ok(rowOf(el, 5).classList.contains('drag-over-below'), 'lower half -> after class');
        assert.ok(!rowOf(el, 5).classList.contains('drag-over'), 'before class cleared');

        // hovering the dragged row itself is a no-op -> indicator cleared
        g.dragOver(2, dragEvt(rowOf(el, 2), 'upper'));
        assert.equal(el.querySelectorAll('.drag-over, .drag-over-below').length, 0, 'no-op clears indicator');

        // dragEnd clears everything
        g.dragOver(5, dragEvt(rowOf(el, 5), 'lower'));
        g.dragEnd({ currentTarget: rowOf(el, 2) });
        assert.equal(el.querySelectorAll('.drag-over, .drag-over-below').length, 0, 'dragEnd clears indicators');
        assert.equal(el.querySelectorAll('.dragging').length, 0, 'dragEnd clears dragging class');

        document.body.removeChild(el);
    });
});

// ---------------------------------------------------------------------------
// Group drag via a selection adapter
// ---------------------------------------------------------------------------
describe('Row Gesture Group Drag', function(it) {
    it('moves the whole selection when dragging a selected row', async () => {
        const el = await ready(defineGestureList('gest-group-move', 50, { selection: true }));
        const g = el._g;
        el._selected = new Set([0, 1]);

        g.dragStart(0, dragEvt(rowOf(el, 0), 'upper'));
        assert.ok(rowOf(el, 0).classList.contains('group-dragging'), 'selected row 0 flagged');
        assert.ok(rowOf(el, 1).classList.contains('group-dragging'), 'selected row 1 flagged');

        g.drop(5, dragEvt(rowOf(el, 5), 'lower'));   // gap 6
        assert.equal(el._reorders.length, 1);
        assert.deepEqual(el._reorders[0][0], [0, 1], 'fromIndices = full selection');
        assert.equal(el._reorders[0][1], 6, 'gap forwarded to consumer');
        // consumer-side follow math (validation): [0,1] @ gap 6 -> lands [4,5]
        assert.deepEqual(groupReorderTargets([0, 1], 6).newIndices, [4, 5]);
        assert.equal(el.querySelectorAll('.group-dragging').length, 0, 'group feedback cleaned up');

        document.body.removeChild(el);
    });

    it('drags a single row when it is not part of the selection', async () => {
        const el = await ready(defineGestureList('gest-group-single', 50, { selection: true }));
        const g = el._g;
        el._selected = new Set([0, 1]);

        g.dragStart(5, dragEvt(rowOf(el, 5), 'upper'));   // 5 not selected
        assert.ok(!rowOf(el, 5).classList.contains('group-dragging'), 'no group feedback for lone drag');

        g.drop(2, dragEvt(rowOf(el, 2), 'upper'));   // gap 2
        assert.deepEqual(el._reorders[0][0], [5], 'single fromIndices');
        assert.equal(el._reorders[0][1], 2);

        document.body.removeChild(el);
    });
});

// ---------------------------------------------------------------------------
// Touch drag via handle over a windowed list
// ---------------------------------------------------------------------------
describe('Row Gesture Touch Drag', function(it) {
    it('computes the gap from touch geometry and reorders', async () => {
        const el = await ready(defineGestureList('gest-touch-drag', 50));
        const g = el._g;

        g.handleTouchStart(2, touchEvt(10, rowOf(el, 2).getBoundingClientRect().top + 25));
        assert.ok(rowOf(el, 2).classList.contains('dragging'), 'source row flagged dragging');

        // move over row 5 lower half -> gap 6
        const r5 = rowOf(el, 5).getBoundingClientRect();
        g.handleTouchMove(touchEvt(10, r5.top + r5.height * 0.75));
        assert.ok(rowOf(el, 6).classList.contains('drag-over'), 'indicator shown on the hovered edge row');

        g.handleTouchEnd(touchEvt(10, r5.top + r5.height * 0.75));
        assert.equal(el._reorders.length, 1, 'reorder committed on touch end');
        assert.deepEqual(el._reorders[0][0], [2]);
        assert.equal(el._reorders[0][1], 6, 'geometric gap = 6');
        assert.equal(el.querySelectorAll('.dragging, .drag-over').length, 0, 'touch end cleans up');

        document.body.removeChild(el);
    });
});

// ---------------------------------------------------------------------------
// Long-press vs tap, and passive-safety
// ---------------------------------------------------------------------------
describe('Row Gesture Long-press / Tap', function(it) {
    it('fires onLongPress, suppresses the tap, and preventDefaults on touchEnd', (done) => {
        const el = defineGestureList('gest-longpress', 20, { gesture: { longPressMs: 80 } });
        setTimeout(() => {
            const g = el._g;
            g.touchStart(3, touchEvt(100, 100));
            setTimeout(() => {
                assert.deepEqual(el._longPresses, [3], 'long press fired for row 3');

                const end = touchEvt(100, 100);
                g.touchEnd(3, end);
                assert.ok(end.defaultPrevented, 'touchEnd preventDefaults the ghost click');
                assert.equal(el._taps.length, 0, 'no tap after a long press');

                // the browser-synthesized click must not sneak a tap through
                g.click(3, {});
                assert.equal(el._taps.length, 0, 'synthesized click suppressed');

                document.body.removeChild(el);
                done();
            }, 130);
        }, 150);
    });

    it('a clean quick tap fires onTap exactly once', async () => {
        const el = await ready(defineGestureList('gest-tap', 20, { gesture: { longPressMs: 80 } }));
        const g = el._g;

        const start = touchEvt(50, 50);
        g.touchStart(4, start);
        const end = touchEvt(50, 50);
        g.touchEnd(4, end);   // timer still armed -> clean tap
        assert.deepEqual(el._taps, [4], 'tap fired from touchEnd');
        assert.ok(!end.defaultPrevented, 'a clean tap does not preventDefault');

        g.click(4, {});   // the follow-up synthesized click
        assert.deepEqual(el._taps, [4], 'click did not double-fire the tap');

        document.body.removeChild(el);
    });

    it('movement beyond slop cancels the long-press (and no tap)', (done) => {
        const el = defineGestureList('gest-slop', 20, { gesture: { longPressMs: 80 } });
        setTimeout(() => {
            const g = el._g;
            g.touchStart(2, touchEvt(100, 100));
            g.touchMove(touchEvt(100, 140));   // dy 40 > slop
            setTimeout(() => {
                g.touchEnd(2, touchEvt(100, 140));
                assert.equal(el._longPresses.length, 0, 'long press cancelled by movement');
                assert.equal(el._taps.length, 0, 'a drag/scroll is not a tap');
                document.body.removeChild(el);
                done();
            }, 130);
        }, 150);
    });

    it('touchStart and touchMove never preventDefault (passive-safe)', async () => {
        const el = await ready(defineGestureList('gest-passive', 20));
        const g = el._g;

        const s = touchEvt(10, 10);
        g.touchStart(1, s);
        assert.ok(!s.defaultPrevented, 'touchStart is passive-safe');

        const m = touchEvt(12, 12);
        g.touchMove(m);
        assert.ok(!m.defaultPrevented, 'touchMove is passive-safe');

        g.cancel();
        document.body.removeChild(el);
    });

    it('a plain mouse click routes to onTap', async () => {
        const el = await ready(defineGestureList('gest-mouse-click', 20));
        const g = el._g;

        g.click(7, {});
        assert.deepEqual(el._taps, [7], 'mouse click fires onTap with no touch guard');

        document.body.removeChild(el);
    });
});
