import { defineComponent, Component, html, when, memoEach } from 'vdx/lib/framework.js';
import { createWindowing } from 'vdx/lib/windowing.js';
import { createRowGestures } from 'vdx/lib/gestures.js';

// A windowed list: only the rows on screen exist in the DOM. It owns no data -
// it renders `tracks` + `selectedIds` and emits events; the parent applies
// every change. createWindowing does the scroll math, createRowGestures does
// drag-reorder (mouse and touch), tap and long-press.
class QueueList extends Component {
    static props = { tracks: [], selectedIds: [], selecting: false };

    constructor(props) {
        super(props);
        const rowHeight = 52;
        const count = () => (this.props.tracks || []).length;
        this._win = createWindowing(this, { itemHeight: rowHeight, count, fallbackHeight: () => 360 });
        this._g = createRowGestures(this, {
            itemHeight: rowHeight,
            windowing: this._win,
            count,
            scrollContainer: () => this,
            excludeSelector: '.check',
            // Dragging a selected row moves the whole selection.
            selection: {
                isSelected: (i) => this._selected().has(this.props.tracks[i]?.id),
                indices: () => {
                    const sel = this._selected();
                    const out = [];
                    this.props.tracks.forEach((t, i) => { if (sel.has(t.id)) out.push(i); });
                    return out;
                }
            },
            onReorder: (fromIndices, gap) => this._emit('reorder', { fromIndices, gap }),
            onTap: (i) => this._emit('row-tap', { id: this.props.tracks[i]?.id }),
            onLongPress: (i) => {
                const pt = this._lastTouch || { x: 0, y: 0 };
                this._emit('row-menu', { id: this.props.tracks[i]?.id, x: pt.x, y: pt.y });
            }
        });
    }

    mounted() {
        this._win.attach();
        this._win.setScrollContainer('self');
    }

    unmounted() {
        this._win.detach();
        this._g.cancel();
    }

    propsChanged(prop) {
        if (prop === 'tracks') this._win.refresh();
    }

    _selected() { return new Set(this.props.selectedIds || []); }

    _emit(name, detail) {
        this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
    }

    _row(track, index, isSelected, selecting) {
        const g = this._g;
        const isHandle = !selecting || isSelected;
        return html`
            <div class="row ${isSelected ? 'selected' : ''}" data-index="${index}"
                draggable="${!g.isTouchDevice() && isHandle}"
                on-click="${(e) => g.click(index, e)}"
                on-contextmenu="${(e) => { e.preventDefault(); this._emit('row-menu', { id: track.id, x: e.clientX, y: e.clientY }); }}"
                on-touchstart-passive="${(e) => { const t = e.touches[0]; if (t) this._lastTouch = { x: t.clientX, y: t.clientY }; g.touchStart(index, e); }}"
                on-touchmove-passive="${(e) => g.touchMove(e)}"
                on-touchend="${(e) => g.touchEnd(index, e)}"
                on-dragstart="${(e) => g.dragStart(index, e)}"
                on-dragover="${(e) => g.dragOver(index, e)}"
                on-dragleave="${(e) => g.dragLeave(e)}"
                on-drop="${(e) => g.drop(index, e)}"
                on-dragend="${(e) => g.dragEnd(e)}">
                ${when(selecting, () => html`
                    <input type="checkbox" class="check" checked="${isSelected}"
                        on-click="${(e) => { e.stopPropagation(); this._emit('toggle', { id: track.id }); }}">
                `)}
                ${when(isHandle, () => html`
                    <span class="handle" aria-hidden="true"
                        on-touchstart="${(e) => g.handleTouchStart(index, e)}"
                        on-touchmove="${(e) => g.handleTouchMove(e)}"
                        on-touchend="${(e) => g.handleTouchEnd(e)}">⣿</span>
                `)}
                <span class="num">${index + 1}</span>
                <span class="title">${track.title}</span>
                <span class="len">${track.length}</span>
            </div>
        `;
    }

    template() {
        const win = this._win;
        const tracks = this.props.tracks || [];
        const sel = this._selected();
        const selecting = !!this.props.selecting;
        if (tracks.length === 0) return html`<div class="empty">Queue is empty</div>`;
        return html`
            <div class="box">
            <div class="spacer" style="height: ${win.totalHeight}px;"></div>
            <div class="window" style="transform: translateY(${win.offsetY}px);">
                ${memoEach(tracks.slice(win.visibleStart, win.visibleEnd),
                    (t, i) => this._row(t, win.visibleStart + i, sel.has(t.id), selecting),
                    // The key carries everything a row renders from outside the
                    // item: selection, mode, and position.
                    (t, i) => `${t.id}-${sel.has(t.id) ? 's' : 'n'}-${selecting ? 'm' : 'x'}-${win.visibleStart + i}`,
                    { trustKey: true })}
            </div>
            </div>
        `;
    }

    static styles = /*css*/`
        :host { display: block; position: relative; height: 360px; overflow-y: auto;
            border: 1px solid var(--border-color, #ddd); border-radius: 8px; background: var(--card-bg, #fff); }
        .box { position: relative; width: 100%; }
        .spacer { pointer-events: none; }
        .window { position: absolute; top: 0; left: 0; right: 0; }
        .row { height: 52px; display: flex; align-items: center; gap: 10px; padding: 0 12px;
            border-bottom: 1px solid var(--border-color, #eee); box-sizing: border-box; cursor: pointer; }
        .row:hover { background: var(--hover-bg, #f5f5f5); }
        .row.selected { background: var(--selected-bg, #e7f3ff); }
        .row.dragging, .row.group-dragging { opacity: .5; }
        .row.drag-over { box-shadow: inset 0 2px 0 0 var(--primary-color, #0969da); }
        .row.drag-over-below { box-shadow: inset 0 -2px 0 0 var(--primary-color, #0969da); }
        .check { width: 18px; height: 18px; }
        .handle { min-width: 24px; min-height: 32px; display: inline-flex; align-items: center;
            justify-content: center; color: var(--text-muted, #999); cursor: grab; touch-action: none; user-select: none; }
        .num { width: 3.5em; color: var(--text-muted, #888); font-variant-numeric: tabular-nums; font-size: 13px; }
        .title { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px; }
        .len { color: var(--text-muted, #888); font-variant-numeric: tabular-nums; font-size: 13px; }
        .empty { padding: 40px; text-align: center; color: var(--text-muted, #888); }
    `;
}

defineComponent('queue-list', QueueList);
