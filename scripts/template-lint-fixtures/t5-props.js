// T5 fixture: attributes on registered component tags must map to declared
// props (kebab-case or legacy smushed-lowercase) or be globally allowed.
import { Component, defineComponent, html } from '../../app/lib/framework.js';

class UiBadge extends Component {
    static props = { label: '', variant: 'info', maxCount: 0 };
    template() {
        return html`<span class="badge">${this.props.label}</span>`;
    }
}
defineComponent('ui-badge', UiBadge);

// Zero declared props: T5 stays silent for this tag
class UiPlain extends Component {
    template() {
        return html`<div>plain</div>`;
    }
}
defineComponent('ui-plain', UiPlain);

class BadgeHost extends Component {
    state = { n: 3 };
    template() {
        return html`
            <ui-badge label="New" variant="ok"></ui-badge>
            <ui-badge max-count="9"></ui-badge>
            <ui-badge maxcount="9"></ui-badge>
            <ui-badge label=${this.state.n} class="pill" id="b1" data-test="x" aria-label="badge"></ui-badge>
            <ui-badge x-model="n"></ui-badge>
            <ui-badge ref="badge" title="tip" hidden></ui-badge>
            <ui-badge labl="typo"></ui-badge> <!-- LINT-EXPECT: t5-props -->
            <ui-badge max-cont="9"></ui-badge> <!-- LINT-EXPECT: t5-props -->
            <ui-plain anything-goes="1"></ui-plain>
            <not-registered-tag foo="1"></not-registered-tag>
        `;
    }
    mounted() { this.refs.badge.focus(); }
}
defineComponent('badge-host', BadgeHost);
