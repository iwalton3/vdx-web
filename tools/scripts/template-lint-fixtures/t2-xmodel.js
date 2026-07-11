// T2 fixture: x-model root keys against harvested state, both formats,
// dot-paths, dynamic-state downgrades, custom elements vs native inputs.
import { Component, defineComponent, html } from '../../../lib/framework.js';

class FilterPanel extends Component {
    static props = { title: '' };
    state = { query: '', filters: { status: 'open' }, page: 1 };
    apply() {}
    template() {
        return html`
            <input x-model="query">
            <input x-model="filters.status">
            <input type="checkbox" x-model="page">
            <cl-input x-model="query"></cl-input>
            <input x-model="serchQuery"> <!-- LINT-EXPECT: t2-xmodel -->
            <input x-model="filter.status"> <!-- LINT-EXPECT: t2-xmodel -->
            <button on-click="apply">go</button>
        `;
    }
}
defineComponent('filter-panel', FilterPanel);

// Dynamic state assignment anywhere => stateKeys unknowable, T2 bails
class DynamicState extends Component {
    load(key) { this.state[key] = true; }
    constructor(props) {
        super(props);
        this.state = { known: 1 };
    }
    template() {
        return html`<input x-model="anythingGoes">`;
    }
}
defineComponent('dynamic-state', DynamicState);

// Options format: state comes from data()'s returned literal
defineComponent('fx-search', {
    data() {
        return { term: '', results: [] };
    },
    methods: { run() {} },
    template() {
        return html`
            <input x-model="term">
            <input x-model="trem"> <!-- LINT-EXPECT: t2-xmodel -->
        `;
    }
});

// Non-literal state: bail
class ComputedInit extends Component {
    constructor(props) {
        super(props);
        this.state = makeInitialState(props);
    }
    template() {
        return html`<input x-model="whoKnows">`;
    }
}
function makeInitialState(props) { return { whoKnows: 1 }; }
defineComponent('computed-init', ComputedInit);
