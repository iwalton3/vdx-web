// Cross-file resolution fixture: superclass and defineComponent argument
// imported from shared-base.js - chains resolve, checks apply.
import { Component, defineComponent, html } from '../../../lib/framework.js';
import SharedDefault from './shared-base.js';
import { SharedBase } from './shared-base.js';

class ImportedChild extends SharedBase {
    state = { open: false };
    toggle() { this.state.open = !this.state.open; }
    template() {
        return html`
            <button on-click="closeAll">ok inherited from imported base</button>
            <button on-click="toggle">ok own</button>
            <button on-click="badgeText">bad getter from imported base</button> <!-- LINT-EXPECT: t1-handler -->
            <button on-click="closeAl">bad typo</button> <!-- LINT-EXPECT: t1-handler -->
        `;
    }
}
defineComponent('imported-child', ImportedChild);

// defineComponent with imported classes: tags register with real harvests,
// so T5 sees their props
defineComponent('shared-base-el', SharedBase);
defineComponent('shared-default-el', SharedDefault);

class ImportedHost extends Component {
    template() {
        return html`
            <shared-base-el compact="true"></shared-base-el>
            <shared-default-el level="2"></shared-default-el>
            <shared-base-el compat="true"></shared-base-el> <!-- LINT-EXPECT: t5-props -->
        `;
    }
}
defineComponent('imported-host', ImportedHost);
