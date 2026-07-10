// T1 fixture: same-file inheritance chains and unresolvable imported bases.
import { Component, defineComponent, html } from '../../app/lib/framework.js';
import { RemoteBase } from './external-base.js';

class BaseCard extends Component {
    static props = { title: '' };
    close() {}
    get summary() { return this.props.title; }
}

class DetailCard extends BaseCard {
    static props = { body: '' };
    summary() { return 'overrides the parent getter with a method'; }
    template() {
        return html`
            <button on-click="close">ok inherited method</button>
            <button on-click="summary">ok child method overrides parent getter</button>
            <button on-click="expand">bad</button> <!-- LINT-EXPECT: t1-handler -->
        `;
    }
}
defineComponent('detail-card', DetailCard);

// Chain never reaches Component inside this file: harvest is incomplete,
// so nothing here may be reported.
class MysteryCard extends RemoteBase {
    template() {
        return html`<button on-click="whoKnows">not checked</button>`;
    }
}
defineComponent('mystery-card', MysteryCard);

// defineComponent with an imported definition: opaque tag, no template here.
defineComponent('imported-thing', RemoteBase);
