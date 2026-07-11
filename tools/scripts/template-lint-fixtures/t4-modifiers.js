// T4 fixture: contradictory modifiers - applies even without component
// context (detached helpers) and to interpolated handlers.
import { Component, defineComponent, html } from '../../../lib/framework.js';

class ScrollArea extends Component {
    onWheel() {}
    onTouch() {}
    template() {
        return html`
            <div on-wheel-passive="onWheel">ok passive</div>
            <div on-touchmove-prevent-stop="onTouch">ok prevent+stop</div>
            <div on-touchmove-passive-prevent="onTouch">bad</div> <!-- LINT-EXPECT: t4-modifiers -->
            <div on-scroll-passive=${() => this.onWheel()}>ok slot passive</div>
        `;
    }
}
defineComponent('scroll-area', ScrollArea);

// Detached helper template: T1 is skipped, T4 still applies
function scrollRow(item) {
    return html`
        <div class="row" on-touchstart-prevent-passive="notChecked">${item}</div> <!-- LINT-EXPECT: t4-modifiers -->
    `;
}
