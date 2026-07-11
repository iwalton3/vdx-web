/**
 * Tests for cl-virtual-list's `reorderable` mode - the component-library
 * exemplar of the windowing + gesture controllers composed together.
 *
 * Drives synthetic desktop DragEvents (controlled clientY upper/lower half) over
 * rendered rows and asserts the component's 'reorder' CustomEvent fires with the
 * correct { fromIndices, gap, from, to } payload, plus the drag-handle render
 * guard (present iff reorderable).
 */

import { describe, assert } from './test-runner.js';
import '../../ui/data/virtual-list.js';

// --- fixtures ---------------------------------------------------------------

// Mount a cl-virtual-list with 50 items + an explicit keyFn. Self-scroll, 400px
// tall, 50px rows -> rows 0..~17 are rendered at scrollTop 0, so every index the
// tests touch (2, 3, 5) is present without scrolling.
function mountList({ reorderable = false } = {}) {
    const el = document.createElement('cl-virtual-list');
    el.itemHeight = 50;
    el.height = '400px';
    el.scrollContainer = 'self';
    el.keyFn = (item) => item.id;
    el.items = Array.from({ length: 50 }, (_, i) => ({ id: i, title: `Item ${i}` }));
    if (reorderable) el.reorderable = true;
    document.body.appendChild(el);
    return el;
}

function ready(el, ms = 150) {
    return new Promise(resolve => setTimeout(() => resolve(el), ms));
}

function rowOf(el, absIndex) {
    return el.querySelector(`.virtual-list-item[data-index="${absIndex}"]`);
}

// Dispatch a real DragEvent on a row with clientY placed in its upper or lower
// half (drives the gesture controller's pointer-midpoint gap math).
function fireDrag(row, type, half) {
    const rect = row.getBoundingClientRect();
    const clientY = half === 'upper'
        ? rect.top + rect.height * 0.25
        : rect.top + rect.height * 0.75;
    const ev = new DragEvent(type, { bubbles: true, cancelable: true, clientY });
    row.dispatchEvent(ev);
    return ev;
}

// Capture 'reorder' payloads emitted by the component.
function captureReorders(el) {
    const events = [];
    el.addEventListener('reorder', (e) => events.push(e.detail));
    return events;
}

// Perform a full drag from `fromIndex` to `overIndex` (drop in the given half).
function drag(el, fromIndex, overIndex, half) {
    fireDrag(rowOf(el, fromIndex), 'dragstart', 'upper');
    fireDrag(rowOf(el, overIndex), 'dragover', half);
    fireDrag(rowOf(el, overIndex), 'drop', half);
    fireDrag(rowOf(el, fromIndex), 'dragend', 'upper');
}

// ---------------------------------------------------------------------------
describe('cl-virtual-list reorderable', function(it) {
    it('emits reorder with the lower-half gap when dragging DOWN (down-lower)', async () => {
        const el = await ready(mountList({ reorderable: true }));
        const events = captureReorders(el);

        // drag row 2 down onto row 5's lower half -> gap 6
        drag(el, 2, 5, 'lower');

        assert.equal(events.length, 1, 'one reorder emitted');
        assert.deepEqual(events[0].fromIndices, [2], 'fromIndices = [2]');
        assert.equal(events[0].gap, 6, 'gap = overIndex + 1 for lower half');
        assert.equal(events[0].from, 2, 'from = fromIndices[0]');
        // remove-then-insert index: gap past `from` decrements -> 5
        assert.equal(events[0].to, 5, 'to = gapToRemoveInsertIndex(2, 6) = 5');

        document.body.removeChild(el);
    });

    it('emits reorder with the upper-half gap when dragging DOWN (down-upper)', async () => {
        const el = await ready(mountList({ reorderable: true }));
        const events = captureReorders(el);

        // drag row 2 down onto row 5's upper half -> gap 5
        drag(el, 2, 5, 'upper');

        assert.equal(events.length, 1);
        assert.deepEqual(events[0].fromIndices, [2]);
        assert.equal(events[0].gap, 5, 'gap = overIndex for upper half');
        assert.equal(events[0].from, 2);
        assert.equal(events[0].to, 4, 'to = gapToRemoveInsertIndex(2, 5) = 4');

        document.body.removeChild(el);
    });

    it('emits reorder with the upper-half gap when dragging UP', async () => {
        const el = await ready(mountList({ reorderable: true }));
        const events = captureReorders(el);

        // drag row 5 up onto row 2's upper half -> gap 2
        drag(el, 5, 2, 'upper');

        assert.equal(events.length, 1);
        assert.deepEqual(events[0].fromIndices, [5]);
        assert.equal(events[0].gap, 2, 'gap = overIndex for upper half');
        assert.equal(events[0].from, 5);
        // gap <= from -> passthrough
        assert.equal(events[0].to, 2, 'to = gapToRemoveInsertIndex(5, 2) = 2');

        document.body.removeChild(el);
    });

    it('does NOT emit for a no-op drop adjacent to the dragged row', async () => {
        const el = await ready(mountList({ reorderable: true }));
        const events = captureReorders(el);

        // drop on the dragged row's own upper half (gap == from) -> filtered
        fireDrag(rowOf(el, 3), 'dragstart', 'upper');
        fireDrag(rowOf(el, 3), 'drop', 'upper');
        fireDrag(rowOf(el, 3), 'dragend', 'upper');

        assert.equal(events.length, 0, 'no-op gap == from produces no reorder event');

        document.body.removeChild(el);
    });

    it('places the insertion-edge indicator on dragover', async () => {
        const el = await ready(mountList({ reorderable: true }));

        fireDrag(rowOf(el, 2), 'dragstart', 'upper');

        fireDrag(rowOf(el, 5), 'dragover', 'upper');   // before row 5
        assert.ok(rowOf(el, 5).classList.contains('drag-over'), 'upper half -> before edge');

        fireDrag(rowOf(el, 5), 'dragover', 'lower');   // after row 5
        assert.ok(rowOf(el, 5).classList.contains('drag-over-below'), 'lower half -> after edge');
        assert.ok(!rowOf(el, 5).classList.contains('drag-over'), 'before edge cleared');

        fireDrag(rowOf(el, 2), 'dragend', 'upper');
        assert.equal(el.querySelectorAll('.drag-over, .drag-over-below').length, 0,
            'dragend clears indicators');

        document.body.removeChild(el);
    });

    it('renders a drag handle only when reorderable', async () => {
        const on = await ready(mountList({ reorderable: true }));
        assert.ok(on.querySelector('.drag-handle'), 'drag handle rendered when reorderable');
        // rows are whole-row draggable on non-touch
        const row = on.querySelector('.virtual-list-item');
        assert.ok(row.hasAttribute('draggable'), 'reorderable rows carry a draggable attribute');
        assert.ok(row.hasAttribute('data-index'), 'reorderable rows carry data-index');
        document.body.removeChild(on);

        const off = await ready(mountList({ reorderable: false }));
        assert.equal(off.querySelector('.drag-handle'), null,
            'no drag handle when reorderable is false');
        assert.ok(!off.querySelector('.virtual-list-item').hasAttribute('draggable'),
            'non-reorderable rows are not draggable');
        document.body.removeChild(off);
    });
});
