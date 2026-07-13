// T7 fixture: Lit/Vue-style binding syntax (?attr / .prop / @event / :attr) is
// not supported by VDX. The runtime parser throws on these sigils; the linter
// parses in tolerant mode and reports them here. Applies to any element -
// native or component.
import { Component, defineComponent, html } from '../../../lib/framework.js';

class LitWidget extends Component {
    static props = { disabled: false, count: 0 };
    onClick() {}
    template() {
        return html`
            <button ?disabled="${this.props.disabled}">boolean sugar</button> <!-- LINT-EXPECT: t7-binding -->
            <button @click="${() => this.onClick()}">event sugar</button> <!-- LINT-EXPECT: t7-binding -->
            <input .value="${this.props.count}"> <!-- LINT-EXPECT: t7-binding -->
            <a :href="${this.props.count}">vue bind</a> <!-- LINT-EXPECT: t7-binding -->

            <!-- Correct VDX idioms - must stay silent -->
            <button disabled="${this.props.disabled}" on-click="onClick">ok</button>
            <a href="?q=${this.props.count}">query string in a value, not a binding</a>
        `;
    }
}
defineComponent('lit-widget', LitWidget);
