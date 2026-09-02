/**
 * Second-round review findings (docs/tasklists/CODEX-AUDIT-WORKLIST.md).
 *
 * These are the cases the first pass missed: each one is a corner of a fix
 * rather than a fresh area, which is why they survived the first set of tests.
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, contain, Component, flushSync } from '../../lib/framework.js';
import { reactive, computed, createEffect, flushEffects, setEffectErrorHandler } from '../../lib/core/reactivity.js';

function mount(tag) {
    const el = document.createElement(tag);
    document.body.appendChild(el);
    return el;
}

describe('Review Round 2', function(it) {
    it('computed wakes dependents when a healed getter throws again', () => {
        // The lazy get() has to CLEAR `failed` on success as well as set it on
        // throw. Left true, the next dependency write takes the eager healing
        // branch instead of ordinary invalidation - and that branch never
        // reaches trigger(), so dependents keep the stale value silently.
        const prev = setEffectErrorHandler(() => {});
        try {
            const state = reactive({ n: 0 });
            let throwNow = false;
            const c = computed(() => {
                const n = state.n;
                if (throwNow) throw new Error('transient');
                return n;
            });

            state.n = 1;
            throwNow = true;
            try { c.get(); } catch { /* lazy read throws, sets failed */ }
            throwNow = false;

            const seen = [];
            createEffect(() => seen.push(c.get()), { onError: e => seen.push(e.message) });

            throwNow = true;
            state.n = 2;
            flushEffects();

            assert.deepEqual(seen, [1, 'transient'], 'dependent is told the getter threw again');
        } finally {
            setEffectErrorHandler(typeof prev === 'function' ? prev : null);
        }
    });

    it('a function prop keeps one identity but can still stop being a function', () => {
        class R2Child extends Component {
            static props = { callback: null };
            constructor(props) { super(props); this.changes = []; }
            propsChanged(name) { this.changes.push(name); }
            template() { return html`<i></i>`; }
        }
        defineComponent('r2-fn-child', R2Child);

        class R2Host extends Component {
            constructor(props) { super(props); this.state = { cb: () => 42 }; }
            template() { return html`<r2-fn-child callback="${this.state.cb}"></r2-fn-child>`; }
        }
        defineComponent('r2-fn-host', R2Host);

        const el = mount('r2-fn-host');
        const child = el.querySelector('r2-fn-child');
        const first = child.props.callback;

        flushSync(() => { el.state.cb = () => 99; });
        assert.equal(child.props.callback, first, 'identity is stable across renders');
        assert.equal(child.props.callback(), 99, 'but the call reaches the latest closure');

        // Choosing the strategy once from the initial value left the child
        // holding a live wrapper - a silent no-op - with no propsChanged.
        child.changes.length = 0;
        flushSync(() => { el.state.cb = null; });
        assert.equal(child.props.callback, null, 'a slot that stops being a function says so');
        assert.deepEqual(child.changes, ['callback'], 'and the child is told');

        document.body.removeChild(el);
    });

    it('the boolean contract does not depend on registration order', () => {
        // Compiled BEFORE defineComponent: isCustomElement is registry-based and
        // would freeze this element as native, coercing the authored string.
        const compiledEarly = html`<r2-late-probe disabled="false">${''}</r2-late-probe>`;

        class R2Late extends Component {
            static props = { disabled: null };
            template() { return html`<i></i>`; }
        }
        defineComponent('r2-late-probe', R2Late);

        class R2LateHost extends Component {
            template() { return compiledEarly; }
        }
        defineComponent('r2-late-host', R2LateHost);

        const el = mount('r2-late-host');
        assert.equal(el.querySelector('r2-late-probe').props.disabled, 'false',
            'the component still receives the authored string');
        document.body.removeChild(el);
    });

    it('nullish on a component prop writes once, not false-then-null', () => {
        class R2NullProbe extends Component {
            static props = { disabled: true };
            constructor(props) { super(props); this.changes = []; }
            propsChanged(name, value) { if (name === 'disabled') this.changes.push(value); }
            template() { return html`<i></i>`; }
        }
        defineComponent('r2-null-probe', R2NullProbe);

        class R2NullHost extends Component {
            constructor(props) { super(props); this.state = { v: true }; }
            template() { return html`<r2-null-probe disabled="${this.state.v}"></r2-null-probe>`; }
        }
        defineComponent('r2-null-host', R2NullHost);

        const el = mount('r2-null-host');
        const probe = el.querySelector('r2-null-probe');
        probe.changes.length = 0;
        flushSync(() => { el.state.v = null; });

        assert.deepEqual(probe.changes, [null],
            'a transient false the author never wrote must not reach propsChanged');
        document.body.removeChild(el);
    });

    it('SVG has no boolean attributes, in either sink', () => {
        class R2Svg extends Component {
            template() {
                return html`<div>
                    <svg><g id="s" disabled="false"></g></svg>
                    <svg><g id="d" disabled="false">${''}</g></svg>
                </div>`;
            }
        }
        defineComponent('r2-svg-host', R2Svg);
        const el = mount('r2-svg-host');
        assert.equal(el.querySelector('#s').getAttribute('disabled'), 'false', 'static SVG keeps the value');
        assert.equal(el.querySelector('#d').getAttribute('disabled'), 'false', 'and so does the renderer path');
        document.body.removeChild(el);
    });

    it('a DocumentFragment in an array contributes its children, not itself', () => {
        // A fragment empties on insert, so it can be neither the next insertion
        // point nor a cleanup record: .after() and .remove() do not exist on it.
        class R2Frag extends Component {
            constructor(props) { super(props); this.state = { n: 1 }; }
            template() {
                return html`<div id="out">${contain(() => {
                    const f = document.createDocumentFragment();
                    f.append(document.createTextNode('A' + this.state.n));
                    return [f, 'B'];
                })}</div>`;
            }
        }
        defineComponent('r2-frag-host', R2Frag);
        const el = mount('r2-frag-host');
        assert.equal(el.querySelector('#out').textContent, 'A1B', 'the item after a fragment still renders');
        flushSync(() => { el.state.n = 2; });
        assert.equal(el.querySelector('#out').textContent, 'A2B', 'and the rerun cleans up and re-renders');
        document.body.removeChild(el);
    });
});
