// T9 fixture: contain()/memoEach() (or a bare string) returned as a whole
// each()/memoEach() item template. Their state belongs to the slot they sit
// in, and a list item root is not a slot - toKeyedChild throws. when() as a
// whole item is fine (each() resolves it to the branch template), and a
// directive nested inside an item's html`` has a slot and is fine too.
import { Component, defineComponent, html, each, memoEach, when, contain } from '../../../lib/framework.js';

class ListItem extends Component {
    static props = { rows: null };
    state = { sections: [], rows: [], tick: 0 };
    renderRow(r) { return html`<li>${r.id}</li>`; }
    template() {
        return html`
            <!-- Footguns - must be flagged -->
            <ul>${each(this.state.sections, s => memoEach(s.rows, r => html`<li>${r}</li>`, r => r), s => s.id)}</ul> <!-- LINT-EXPECT: t9-list-item -->
            <ul>${each(this.state.rows, r => contain(() => html`<li>${r.id}</li>`), r => r.id)}</ul> <!-- LINT-EXPECT: t9-list-item -->
            <ul>${memoEach(this.state.rows, r => contain(() => html`<li>${r.id}</li>`), r => r.id)}</ul> <!-- LINT-EXPECT: t9-list-item -->
            <ul>${each(this.state.rows, r => 'plain text', r => r.id)}</ul> <!-- LINT-EXPECT: t9-list-item -->
            <!-- Inside a nested template: reported once, not once per enclosing template -->
            <div>${when(this.state.tick, () => html`<ul>${each(this.state.rows, r => contain(() => html`<li>${r.id}</li>`), r => r.id)}</ul>`)}</div> <!-- LINT-EXPECT: t9-list-item -->

            <!-- Correct idioms - must stay silent -->
            <ul>${each(this.state.sections, s => html`<li>${memoEach(s.rows, r => html`<b>${r}</b>`, r => r)}</li>`, s => s.id)}</ul>
            <ul>${each(this.state.rows, r => html`<li>${contain(() => html`<b>${this.state.tick}</b>`)}</li>`, r => r.id)}</ul>
            <ul>${each(this.state.rows, r => when(r.hot, () => html`<li class="hot">${r.id}</li>`, () => html`<li>${r.id}</li>`), r => r.id)}</ul>
            <ul>${each(this.state.rows, r => this.renderRow(r), r => r.id)}</ul>
            <div>${contain(() => html`<b>${this.state.tick}</b>`)}</div>
            <ul>${memoEach(this.state.rows, r => html`<li>${r.id}</li>`, r => r.id, { trustKey: true })}</ul>
        `;
    }
}
defineComponent('list-item', ListItem);
