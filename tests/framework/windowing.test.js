/**
 * Tests for the windowing (virtual scroll) controller
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, memoEach, untracked } from '../../lib/framework.js';
import { createWindowing } from '../../lib/windowing.js';

// Shared test component factory - each test gets a unique tag
function defineWindowedList(tag, itemCount, options = {}) {
    defineComponent(tag, {
        data() {
            this._win = createWindowing(this, {
                itemHeight: 50,
                buffer: 4,
                count: () => this.state.items.length,
                fallbackHeight: 200,
                ...options
            });
            return {
                items: untracked(Array.from({ length: itemCount }, (_, i) => ({ id: i, label: `Item ${i}` })))
            };
        },
        unmounted() {
            this._win.destroy();
        },
        template() {
            const win = this._win;
            return html`
                <div class="spacer" style="height: ${win.totalHeight}px;"></div>
                <div class="window" style="transform: translateY(${win.offsetY}px);">
                    ${memoEach(this.state.items.slice(win.visibleStart, win.visibleEnd),
                        item => html`<div class="row" style="height: 50px;">${item.label}</div>`,
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

// Scroll and wait for the rAF-throttled handler plus a render pass
function scrollAndSettle(el, top) {
    el.scrollTop = top;
    el.dispatchEvent(new Event('scroll'));
    return new Promise(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 30)));
    });
}

describe('Windowing Controller', function(it) {
    it('computes the initial window from container height and buffer', (done) => {
        const el = defineWindowedList('win-test-initial', 100);

        setTimeout(() => {
            const win = el._win;
            assert.equal(win.visibleStart, 0, 'Window starts at 0');
            // 200px viewport / 50px rows = 4 visible + 4 buffer = 8
            assert.equal(win.visibleEnd, 8, 'Window ends at visible + buffer');
            assert.equal(win.totalHeight, 5000, 'Spacer covers all items');
            assert.equal(win.offsetY, 0, 'No offset at top');
            assert.equal(el.querySelectorAll('.row').length, 8, 'Renders only the window');

            document.body.removeChild(el);
            done();
        }, 150);
    });

    it('updates the window on scroll', async () => {
        const el = defineWindowedList('win-test-scroll', 100);
        await new Promise(r => setTimeout(r, 150));

        await scrollAndSettle(el, 2500);   // row 50 at top

        const win = el._win;
        assert.equal(win.visibleStart, 46, 'Start = first visible - buffer');
        assert.equal(win.visibleEnd, 58, 'End = first + visible + buffer');
        assert.equal(win.offsetY, 46 * 50, 'Offset follows visibleStart');

        const rows = el.querySelectorAll('.row');
        assert.equal(rows.length, 12, 'Renders the moved window');
        assert.equal(rows[0].textContent, 'Item 46', 'First rendered row matches window');

        document.body.removeChild(el);
    });

    it('bottom-locks the window at the end of the list', async () => {
        const el = defineWindowedList('win-test-bottom', 100);
        await new Promise(r => setTimeout(r, 150));

        await scrollAndSettle(el, 5000 - 200);   // scrolled to the very bottom

        const win = el._win;
        assert.equal(win.visibleEnd, 100, 'Window ends at the last item');
        assert.ok(win.visibleStart <= 100 - (win.visibleEnd - win.visibleStart),
            'Start clamped so the window does not extend past the end');
        const rows = el.querySelectorAll('.row');
        assert.equal(rows[rows.length - 1].textContent, 'Item 99', 'Last item rendered');

        document.body.removeChild(el);
    });

    it('fires onRange when the window changes', async () => {
        const ranges = [];
        const el = defineWindowedList('win-test-onrange', 100, {
            onRange: (start, end) => ranges.push([start, end])
        });
        await new Promise(r => setTimeout(r, 150));

        const before = ranges.length;
        await scrollAndSettle(el, 2500);

        assert.ok(ranges.length > before, 'onRange fires on window change');
        const [start, end] = ranges[ranges.length - 1];
        assert.equal(start, 46, 'onRange receives the new start');
        assert.equal(end, 58, 'onRange receives the new end');

        document.body.removeChild(el);
    });

    it('refresh() picks up changes to an untracked item source', async () => {
        const el = defineWindowedList('win-test-refresh', 5);
        await new Promise(r => setTimeout(r, 150));

        assert.equal(el._win.visibleEnd, 5, 'Window clamped to short list');

        // Replace the untracked array - not reactive, so refresh() is required
        el.state.items = untracked(Array.from({ length: 50 }, (_, i) => ({ id: i, label: `Item ${i}` })));
        el._win.refresh();
        await new Promise(r => setTimeout(r, 100));

        assert.equal(el._win.visibleEnd, 8, 'Window re-expands after refresh');
        assert.equal(el._win.totalHeight, 2500, 'totalHeight reflects the new count');

        document.body.removeChild(el);
    });

    it('clamps the window to loadedCount for on-demand loading', async () => {
        const el = defineWindowedList('win-test-loaded', 100, {
            count: function() { return 1000; },      // sparse total
            loadedCount: function() { return 100; }  // actually loaded
        });
        await new Promise(r => setTimeout(r, 150));

        assert.equal(el._win.totalHeight, 50000, 'Spacer covers the full sparse count');

        // Scroll near the loaded frontier - window must clamp to loaded rows
        await scrollAndSettle(el, 100 * 50 - 200);
        assert.ok(el._win.visibleEnd <= 100, 'Window end clamped to loaded rows');
        assert.ok(el._win.visibleStart < el._win.visibleEnd, 'Window remains non-empty');

        document.body.removeChild(el);
    });

    it('scrollToIndex scrolls the host in self mode', async () => {
        const el = defineWindowedList('win-test-scrollto', 100);
        await new Promise(r => setTimeout(r, 150));

        el._win.scrollToIndex(40);
        el.dispatchEvent(new Event('scroll'));
        await new Promise(r => {
            requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30)));
        });

        assert.equal(el.scrollTop, 2000, 'Host scrolled to the item offset');
        assert.equal(el._win.visibleStart, 36, 'Window follows the scroll');

        document.body.removeChild(el);
    });

    it('refresh() re-measures a programmatic scroll that had no listener', async () => {
        const el = defineWindowedList('win-test-remeasure', 100);
        await new Promise(r => setTimeout(r, 150));

        // Simulate the mount-order race: a programmatic scroll lands while
        // the controller's listener is not wired (event goes unheard)
        el._win.detach();
        el.scrollTop = 2500;
        await new Promise(r => setTimeout(r, 60));
        assert.equal(el._win.visibleStart, 0, 'Cached position is stale while detached');

        // refresh() must re-measure from the DOM, not trust the cache
        el._win.refresh();
        assert.equal(el._win.visibleStart, 46, 'refresh() picks up the real scroll position');
        assert.equal(el._win.offsetY, 46 * 50, 'Offset follows the re-measured window');

        // (re)attach must also self-heal after scrolls that happened unwired
        el._win.detach();
        el.scrollTop = 0;
        await new Promise(r => setTimeout(r, 60));
        el._win.attach();
        assert.equal(el._win.visibleStart, 0, 'attach() re-measures too');

        document.body.removeChild(el);
    });

    it('destroy() stops responding to scroll', async () => {
        const el = defineWindowedList('win-test-destroy', 100);
        await new Promise(r => setTimeout(r, 150));

        el._win.destroy();
        await scrollAndSettle(el, 2500);

        assert.equal(el._win.visibleStart, 0, 'Window frozen after destroy');

        document.body.removeChild(el);
    });
});
