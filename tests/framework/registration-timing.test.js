/**
 * Registration timing must not change the contract.
 *
 * The compile cache is keyed on `strings` identity and is never invalidated by
 * defineComponent(), so any answer about registry membership that the compiler
 * freezes stays frozen. A lazy import() registering a component after its call
 * site was first evaluated is ordinary, not exotic - so identical markup either
 * side of registration must behave identically.
 *
 * Each case compiles its own template INSIDE the test body. `html` compiles
 * eagerly (buildOpTree runs inside compileTemplate), but the cache is a
 * 500-entry LRU: a template compiled at module scope is evicted long before the
 * suite reaches this file and is then silently recompiled - after registration,
 * which is the very state the test means to exclude. Keeping compile,
 * defineComponent and render adjacent is what makes these tests able to fail.
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, Component } from '../../lib/framework.js';

function mount(tag) {
    const el = document.createElement(tag);
    document.body.appendChild(el);
    return el;
}

describe('Registration Timing', function(it) {
    it('on-* handlers get detail.value regardless of compile order', () => {
        const seen = { early: 'UNSET', late: 'UNSET' };

        const early = (fn) => html`<tprobe-evt on-change="${fn}"></tprobe-evt>`;
        early(null);   // compiled while <tprobe-evt> is an unknown tag

        class TprobeEvt extends Component {
            template() { return html`<i></i>`; }
        }
        defineComponent('tprobe-evt', TprobeEvt);

        // Byte-identical markup, compiled after registration: the control.
        const late = (fn) => html`<tprobe-evt on-change="${fn}"></tprobe-evt>`;

        class TpEarlyEvt extends Component {
            template() { return early((e, v) => { seen.early = v; }); }
        }
        class TpLateEvt extends Component {
            template() { return late((e, v) => { seen.late = v; }); }
        }
        defineComponent('tp-early-evt', TpEarlyEvt);
        defineComponent('tp-late-evt', TpLateEvt);

        for (const tag of ['tp-early-evt', 'tp-late-evt']) {
            const host = mount(tag);
            host.querySelector('tprobe-evt').dispatchEvent(
                new CustomEvent('change', { detail: { value: 'DETAIL' } }));
            document.body.removeChild(host);
        }

        assert.equal(seen.late, 'DETAIL', 'compiled after registration (control)');
        assert.equal(seen.early, 'DETAIL',
            'compiled before registration must resolve the value the same way');
    });

    it('an on*-prefixed prop name is not refused as an event handler', () => {
        const early = (v) => html`<tprobe-prop online="${v}"></tprobe-prop>`;
        early(null);   // compiled while <tprobe-prop> is an unknown tag

        class TprobeProp extends Component {
            static props = { online: null };
            template() { return html`<i></i>`; }
        }
        defineComponent('tprobe-prop', TprobeProp);

        const late = (v) => html`<tprobe-prop online="${v}"></tprobe-prop>`;

        class TpEarlyProp extends Component {
            template() { return early('yes'); }
        }
        class TpLateProp extends Component {
            template() { return late('yes'); }
        }
        defineComponent('tp-early-prop', TpEarlyProp);
        defineComponent('tp-late-prop', TpLateProp);

        const earlyHost = mount('tp-early-prop');
        const lateHost = mount('tp-late-prop');

        assert.equal(lateHost.querySelector('tprobe-prop').props.online, 'yes',
            'compiled after registration (control)');
        // The inline-handler guard refuses /^on[a-z]/ only on NATIVE elements,
        // where such an attribute really is an event handler. On a component it
        // is an ordinary prop name, and a frozen "native" answer swallowed it.
        assert.equal(earlyHost.querySelector('tprobe-prop').props.online, 'yes',
            'compiled before registration must not hit the inline-handler guard');

        document.body.removeChild(earlyHost);
        document.body.removeChild(lateHost);
    });

    it('a component registered after render resolves values at dispatch', () => {
        let seen = 'UNSET';
        const tpl = (fn) => html`<tprobe-upgraded on-change="${fn}"></tprobe-upgraded>`;

        class TpUpgradeHost extends Component {
            template() { return tpl((e, v) => { seen = v; }); }
        }
        defineComponent('tp-upgrade-host', TpUpgradeHost);

        // Rendered while <tprobe-upgraded> is unknown: the handler is bound to
        // an element that is not a component yet.
        const host = mount('tp-upgrade-host');
        const target = host.querySelector('tprobe-upgraded');

        class TprobeUpgraded extends Component {
            template() { return html`<i></i>`; }
        }
        defineComponent('tprobe-upgraded', TprobeUpgraded);

        target.dispatchEvent(new CustomEvent('change', { detail: { value: 'V' } }));
        assert.equal(seen, 'V',
            'registry is re-read at dispatch, so a late upgrade is honoured');

        document.body.removeChild(host);
    });
});
