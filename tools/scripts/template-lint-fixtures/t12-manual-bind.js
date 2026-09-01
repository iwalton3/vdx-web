// T12 fixture: manual .bind(this) on a component METHOD. defineComponent binds
// every method onto the element (class prototype methods included), so the copy
// is redundant AND a different function from this.X - identity-based removal
// has to hold on to it. A function-valued class FIELD is NOT auto-bound, so
// binding it is necessary; binding a non-member stays silent too.
import { Component, defineComponent, html } from '../../../lib/framework.js';

class ManualBind extends Component {
    state = { n: 0 };
    onTick = function () { return this.state.n; };   // plain function field: NOT auto-bound
    handleScroll() {}
    mounted() {
        this.addEventListener('scroll', this.handleScroll.bind(this)); // LINT-EXPECT: t12-manual-bind
        this.addEventListener('resize', this.handleScroll);
        window.addEventListener('tick', this.onTick.bind(this));
        const helper = function () {};
        window.addEventListener('blur', helper.bind(this));
    }
    unmounted() {
        this.removeEventListener('scroll', this.handleScroll);
    }
    template() {
        return html`<div>${this.state.n}</div>`;
    }
}
defineComponent('manual-bind', ManualBind);
