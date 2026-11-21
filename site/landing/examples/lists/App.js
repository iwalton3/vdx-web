import { defineComponent, Component, html, untracked } from 'vdx/lib/framework.js';
import { groupReorderTargets } from 'vdx/lib/gestures.js';
import 'vdx/ui/overlay/context-menu.js';
import './QueueList.js';

// A 10,000-track queue. Drag a row (or its ⣿ handle on touch) to move it,
// right-click or long-press for a menu, and turn on "Select" to move or
// remove several tracks at once.
class PlayQueue extends Component {
    constructor(props) {
        super(props);
        const tracks = [];
        for (let i = 1; i <= 10000; i++) {
            const s = 120 + (i * 37) % 240;
            tracks.push({ id: i, title: `Track ${i}`, length: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` });
        }
        this.state = {
            // untracked: 10,000 rows don't need per-item tracking; every change
            // assigns a new array.
            tracks: untracked(tracks),
            selectedIds: [],
            selecting: false,
            last: 'Nothing yet',
            menu: [
                { label: 'Play next', action: (ctx) => this.moveToTop(ctx.ids) },
                { label: 'Remove', danger: true, action: (ctx) => this.removeTracks(ctx.ids) }
            ]
        };
    }

    toggleSelecting() {
        this.state.selecting = !this.state.selecting;
        if (!this.state.selecting) this.state.selectedIds = [];
    }

    toggle(id) {
        const s = new Set(this.state.selectedIds);
        if (s.has(id)) s.delete(id); else s.add(id);
        this.state.selectedIds = [...s];
    }

    onRowTap(e) { if (this.state.selecting) this.toggle(e.detail.id); }

    onReorder(e) {
        const sorted = [...e.detail.fromIndices].sort((a, b) => a - b);
        const tracks = this.state.tracks.slice();
        const moving = sorted.map((i) => tracks[i]);
        for (let k = sorted.length - 1; k >= 0; k--) tracks.splice(sorted[k], 1);
        const { target } = groupReorderTargets(sorted, e.detail.gap);
        tracks.splice(target, 0, ...moving);
        this.state.tracks = tracks;
        this.state.last = `Moved ${moving.length === 1 ? moving[0].title : moving.length + ' tracks'} to position ${target + 1}`;
    }

    onRowMenu(e) {
        const { id, x, y } = e.detail;
        const sel = new Set(this.state.selectedIds);
        this.refs.menu.open(x, y, { ids: sel.has(id) ? [...sel] : [id] });
    }

    moveToTop(ids) {
        const set = new Set(ids);
        this.state.tracks = [...this.state.tracks.filter((t) => set.has(t.id)), ...this.state.tracks.filter((t) => !set.has(t.id))];
        this.state.last = `Moved ${ids.length} to the top`;
    }

    removeTracks(ids) {
        const set = new Set(ids);
        this.state.tracks = this.state.tracks.filter((t) => !set.has(t.id));
        this.state.selectedIds = this.state.selectedIds.filter((id) => !set.has(id));
        this.state.last = `Removed ${ids.length}`;
    }

    template() {
        return html`
            <div class="bar">
                <button on-click="toggleSelecting">${this.state.selecting ? 'Done' : 'Select'}</button>
                <span>${this.state.tracks.length} tracks · ${this.state.selectedIds.length} selected</span>
            </div>
            <queue-list tracks="${this.state.tracks}" selectedIds="${this.state.selectedIds}"
                selecting="${this.state.selecting}"
                on-reorder="onReorder" on-row-tap="onRowTap"
                on-toggle="${(e) => this.toggle(e.detail.id)}" on-row-menu="onRowMenu"></queue-list>
            <p class="last">Last action: ${this.state.last}</p>
            <cl-context-menu ref="menu" items="${this.state.menu}"></cl-context-menu>
        `;
    }

    static styles = /*css*/`
        :host { display: block; font-family: system-ui, sans-serif; }
        .bar { display: flex; gap: 12px; align-items: center; margin-bottom: 10px; font-size: 14px; color: var(--text-muted, #666); }
        .bar button { font: inherit; padding: 5px 14px; border-radius: 6px; cursor: pointer;
            border: 1px solid var(--border-color, #ccc); background: var(--card-bg, #fff); color: var(--text-color, #222); }
        .last { margin: 10px 0 0; font-size: 13px; color: var(--text-muted, #666); }
    `;
}

defineComponent('play-queue', PlayQueue);
