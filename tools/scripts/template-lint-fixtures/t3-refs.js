// T3 fixture: refs declared vs read, destructuring, bail-outs.
import { Component, defineComponent, html, when } from '../../../lib/framework.js';

class RefUser extends Component {
    state = { open: false };
    focusInput() {
        this.refs.input.focus();
        this.refs.contaner.scrollTop = 0; // LINT-EXPECT: t3-refs
    }
    measure() {
        const { panel } = this.refs;
        return panel.offsetHeight + (this.refs.input?.offsetHeight || 0);
    }
    template() {
        return html`
            <input ref="input">
            <div ref="container"></div>
            <div ref="panel"></div>
            <span ref="unused"></span> <!-- LINT-EXPECT: t3-refs -->
            ${when(this.state.open, () => html`<div ref="lazy"></div>`)}
        `;
    }
    mounted() {
        this.refs.lazy;
        this.refs.container.focus();
    }
}
defineComponent('ref-user', RefUser);

// Computed refs access: whole component bails
class RefDynamic extends Component {
    poke(name) { this.refs[name].focus(); }
    template() {
        return html`<div ref="a"></div>`;
    }
    mounted() { this.refs.notDeclaredButBailed.focus(); }
}
defineComponent('ref-dynamic', RefDynamic);

// this.refs handed off wholesale: bails
class RefWholesale extends Component {
    template() {
        return html`<div ref="x"></div>`;
    }
    mounted() { layoutHelper(this.refs); this.refs.alsoBailed.focus(); }
}
function layoutHelper(refs) { return refs; }
defineComponent('ref-wholesale', RefWholesale);
