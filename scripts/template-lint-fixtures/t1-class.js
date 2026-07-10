// T1 fixture: class-format component - handler existence, getters, lifecycle,
// fields, props, modifiers-in-event-names, slot values, nested when() templates.
import { Component, defineComponent, html, when } from '../../app/lib/framework.js';

class TaskCard extends Component {
    static props = { task: null, onAction: null, compact: false };
    state = { open: false, count: 0 };

    get total() { return this.state.count * 2; }

    toggle() { this.state.open = !this.state.open; }
    handleSave() {}
    onStatusChange() {}

    quickAdd = () => { this.state.count++; };

    mounted() {
        this.lateBound = () => {};
    }

    template() {
        return html`
            <button on-click="toggle">ok method</button>
            <button on-click="handleSave">ok method</button>
            <button on-click="quickAdd">ok arrow field</button>
            <button on-click="lateBound">ok this.x= in mounted</button>
            <button on-click="onAction">ok declared prop (may hold a function)</button>
            <button on-click="focus">ok native element method</button>
            <button on-click="emitChange">ok framework member</button>
            <button on-click=${() => this.toggle()}>ok interpolated (tsc's job)</button>
            <button on-click="handleSace">bad typo</button> <!-- LINT-EXPECT: t1-handler -->
            <button on-click="total">bad getter</button> <!-- LINT-EXPECT: t1-handler -->
            <button on-click="mounted">bad lifecycle</button> <!-- LINT-EXPECT: t1-handler -->
            <div on-status-change-prevent="onStatusChange">ok modifier stripping</div>
            <div on-status-change-prevent="onStatusChang">bad</div> <!-- LINT-EXPECT: t1-handler -->
            <div on-click-outside="toggle">ok click-outside</div>
            ${when(this.state.open, () => html`
                <button on-click="toggle">ok in when() branch</button>
                <button on-click="missingNested">bad</button> <!-- LINT-EXPECT: t1-handler -->
            `)}
        `;
    }
}
export default defineComponent('task-card', TaskCard);
