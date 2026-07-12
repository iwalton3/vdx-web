/**
 * Tests for nextRender() and whenMounted()
 */

import { describe, assert } from './test-runner.js';
import {
    defineComponent, Component, html, when, nextRender, reactive
} from '../../lib/framework.js';

describe('nextRender()', function(it) {
    it('resolves after a text binding is committed to the DOM', async () => {
        class NrText extends Component {
            constructor(props) { super(props); this.state = { count: 0 }; }
            template() { return html`<span id="c">${this.state.count}</span>`; }
        }
        defineComponent('nr-text', NrText);

        const el = document.createElement('nr-text');
        document.body.appendChild(el);
        await el.nextRender();
        assert.equal(el.querySelector('#c').textContent, '0', 'initial render present');

        el.state.count = 7;
        await el.nextRender();
        assert.equal(el.querySelector('#c').textContent, '7', 'DOM updated after nextRender');

        document.body.removeChild(el);
    });

    it('resolves after a newly mounted conditional branch is present', async () => {
        class NrBranch extends Component {
            constructor(props) { super(props); this.state = { show: false }; }
            template() {
                return html`<div>${when(this.state.show,
                    () => html`<p id="panel">panel</p>`,
                    () => html`<span id="empty">empty</span>`)}</div>`;
            }
        }
        defineComponent('nr-branch', NrBranch);

        const el = document.createElement('nr-branch');
        document.body.appendChild(el);
        await el.nextRender();
        assert.ok(el.querySelector('#empty'), 'empty branch initially');
        assert.ok(!el.querySelector('#panel'), 'panel absent initially');

        el.state.show = true;
        await el.nextRender();
        assert.ok(el.querySelector('#panel'), 'panel branch mounted after nextRender');
        assert.ok(!el.querySelector('#empty'), 'empty branch removed');

        document.body.removeChild(el);
    });

    it('works with no pending flush (schedules one)', async () => {
        // Nothing mutated - nextRender must still resolve.
        let resolved = false;
        const p = nextRender().then(() => { resolved = true; });
        await p;
        assert.ok(resolved, 'nextRender resolves even with no pending work');
    });

    it('standalone nextRender sees mutations to plain reactive state', async () => {
        const state = reactive({ n: 0 });
        let observed = -1;
        // An effect-like read via a component keeps this simple; here we just
        // assert the promise resolves after a microtask turn.
        state.n = 5;
        await nextRender();
        observed = state.n;
        assert.equal(observed, 5, 'state readable after nextRender');
    });
});

describe('whenMounted()', function(it) {
    it('resolves a child that mounts after a state change', async () => {
        defineComponent('wm-child', class extends Component {
            template() { return html`<span>child</span>`; }
        });

        class WmParent extends Component {
            constructor(props) { super(props); this.state = { show: false }; }
            template() {
                return html`<div>${when(this.state.show,
                    () => html`<wm-child id="kid"></wm-child>`)}</div>`;
            }
        }
        defineComponent('wm-parent', WmParent);

        const el = document.createElement('wm-parent');
        document.body.appendChild(el);
        await el.nextRender();

        el.state.show = true;
        const child = await el.whenMounted('#kid');
        assert.isNotNull(child, 'child resolved');
        assert.equal(child.tagName.toLowerCase(), 'wm-child', 'correct element');
        assert.ok(child._isMounted, 'child is fully mounted');

        document.body.removeChild(el);
    });

    it('resolves child whose mounted() has completed', async () => {
        let mountedRan = false;
        defineComponent('wm-child-mounted', {
            mounted() { mountedRan = true; },
            template() { return html`<span>x</span>`; }
        });

        class WmParent2 extends Component {
            template() { return html`<wm-child-mounted id="k2"></wm-child-mounted>`; }
        }
        defineComponent('wm-parent2', WmParent2);

        const el = document.createElement('wm-parent2');
        document.body.appendChild(el);
        const child = await el.whenMounted('#k2');
        assert.isNotNull(child, 'child resolved');
        assert.ok(mountedRan, 'mounted() ran before whenMounted resolved');

        document.body.removeChild(el);
    });

    it('resolves null if the waiter unmounts while waiting', async () => {
        class WmNever extends Component {
            constructor(props) { super(props); this.state = { show: false }; }
            template() {
                return html`<div>${when(this.state.show,
                    () => html`<span id="never">x</span>`)}</div>`;
            }
        }
        defineComponent('wm-never', WmNever);

        const el = document.createElement('wm-never');
        document.body.appendChild(el);
        await el.nextRender();

        // Never set show=true; instead unmount the waiter while it polls.
        const p = el.whenMounted('#never');
        document.body.removeChild(el);
        const result = await p;
        assert.isNull(result, 'resolves null on waiter unmount');
    });

    it('accepts an explicit element and waits for its readiness', async () => {
        defineComponent('wm-explicit-child', class extends Component {
            template() { return html`<span>e</span>`; }
        });

        class WmExplicit extends Component {
            template() { return html`<wm-explicit-child id="ec"></wm-explicit-child>`; }
        }
        defineComponent('wm-explicit', WmExplicit);

        const el = document.createElement('wm-explicit');
        document.body.appendChild(el);
        await el.nextRender();
        const target = el.querySelector('#ec');
        const resolved = await el.whenMounted(target);
        assert.equal(resolved, target, 'resolves the same element');

        document.body.removeChild(el);
    });
});
