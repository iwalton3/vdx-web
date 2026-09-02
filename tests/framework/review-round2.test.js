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
        const prev = setEffectErrorHandler(() => {});   // returns the one it replaced
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
            setEffectErrorHandler(prev ?? null);
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

    it('a nullish binding clears only a value this renderer set', () => {
        // Every dynamic prop effect re-runs on every render, so clearing
        // unconditionally wiped whatever the user had typed into an
        // uncontrolled input the next time any unrelated state changed.
        class R2Value extends Component {
            static props = { val: undefined };
            constructor(props) { super(props); this.state = { tick: 0, real: 'seed' }; }
            template() {
                return html`<div>
                    <input id="free" value="${this.props.val}">
                    <input id="bound" value="${this.state.real}">
                    <span>${this.state.tick}</span>
                </div>`;
            }
        }
        defineComponent('r2-value-host', R2Value);
        const el = mount('r2-value-host');

        el.querySelector('#free').value = 'user typed this';
        flushSync(() => { el.state.tick = 1; });
        assert.equal(el.querySelector('#free').value, 'user typed this',
            'an uncontrolled input keeps what the user typed across unrelated renders');

        flushSync(() => { el.state.real = null; });
        assert.equal(el.querySelector('#bound').value, '',
            'but a value this binding did set is still cleared on nullish');

        document.body.removeChild(el);
    });

    it('a healed computed wakes dependents even when healed by a manual read', () => {
        // The eager branch triggers dependents after healing; the lazy get()
        // cleared the flag but never told anyone, so whoever observed the throw
        // stayed stranded on it.
        const prev = setEffectErrorHandler(() => {});
        try {
            const state = reactive({ n: 0 });
            let bad = false;
            const c = computed(() => { const n = state.n; if (bad) throw new Error('transient'); return n; });
            const seen = [];
            createEffect(() => seen.push(c.get()), { onError: e => seen.push(e.message) });

            bad = true; state.n = 1; flushEffects();
            bad = false;
            c.get();                 // heals through a manual read, not a dep write
            flushEffects();

            assert.deepEqual(seen, [0, 'transient', 1], 'the dependent is given the healed value');
        } finally {
            setEffectErrorHandler(prev ?? null);
        }
    });

    it('setEffectErrorHandler returns the handler it replaced', () => {
        const mine = () => {};
        const a = setEffectErrorHandler(mine);
        const b = setEffectErrorHandler(a ?? null);
        assert.equal(b, mine, 'so a caller can actually restore what it replaced');
    });

    it('a bound class is not wrapped, but a frozen-prototype function still is', () => {
        class Thing {}
        class R3Child extends Component { static props = { fn: null }; template() { return html`<i></i>`; } }
        defineComponent('r3-fn-child', R3Child);

        const Bound = Thing.bind(null);
        class R3BoundHost extends Component {
            constructor(props) { super(props); this.state = { fn: Bound }; }
            template() { return html`<r3-fn-child fn="${this.state.fn}"></r3-fn-child>`; }
        }
        defineComponent('r3-bound-host', R3BoundHost);
        const bh = mount('r3-bound-host');
        // A bound class refuses .apply() exactly as a class does, and has no own
        // `prototype` - which is why the descriptor test could not see it.
        assert.ok(Reflect.construct(bh.querySelector('r3-fn-child').props.fn, []),
            'a bound class is still constructable');
        document.body.removeChild(bh);

        class R3FrozenHost extends Component {
            constructor(props) { super(props); this.state = { n: 1 }; }
            template() {
                const n = this.state.n;
                const fn = function () { return n; };
                Object.defineProperty(fn, 'prototype', { writable: false });
                return html`<r3-fn-child fn="${fn}"></r3-fn-child>`;
            }
        }
        defineComponent('r3-frozen-host', R3FrozenHost);
        const fh = mount('r3-frozen-host');
        const child = fh.querySelector('r3-fn-child');
        const first = child.props.fn;
        flushSync(() => { fh.state.n = 2; });
        assert.equal(child.props.fn, first, 'a callable function keeps its stable wrapper');
        assert.equal(child.props.fn(), 2, 'and still dispatches to the latest closure');
        document.body.removeChild(fh);
    });

    it('a template compiled before registration still delivers nullish updates', () => {
        const tpl = v => html`<r3-early payload="${v}"></r3-early>`;
        tpl(0);   // compiled before defineComponent
        class R3Early extends Component { static props = { payload: null }; template() { return html`<i></i>`; } }
        defineComponent('r3-early', R3Early);
        class R3EarlyHost extends Component {
            constructor(props) { super(props); this.state = { v: 42 }; }
            template() { return tpl(this.state.v); }
        }
        defineComponent('r3-early-host', R3EarlyHost);

        const el = mount('r3-early-host');
        const child = el.querySelector('r3-early');
        assert.equal(child.props.payload, 42, 'initial value arrives');
        flushSync(() => { el.state.v = null; });
        assert.equal(child.props.payload, null, 'and so does the nullish update');
        document.body.removeChild(el);
    });

    it('a DocumentFragment returned straight into a slot is tracked by its children', () => {
        class R3Frag extends Component {
            constructor(props) { super(props); this.state = { n: 1 }; }
            template() {
                const f = document.createDocumentFragment();
                f.append(document.createTextNode('A' + this.state.n));
                return html`<div id="out">${f}</div>`;
            }
        }
        defineComponent('r3-scalar-frag', R3Frag);
        const el = mount('r3-scalar-frag');
        assert.equal(el.querySelector('#out').textContent, 'A1');
        // Cleanup called .remove() on the emptied fragment, which has none.
        flushSync(() => { el.state.n = 2; });
        assert.equal(el.querySelector('#out').textContent, 'A2', 'the rerun cleans up and re-renders');
        document.body.removeChild(el);
    });

    it('a hyphenated tag inside SVG is an SVG element, not a component', () => {
        class R3Svg extends Component {
            template() {
                return html`<svg>
                    <g id="n" disabled="${true}"></g>
                    <x-piece id="h" disabled="${true}"></x-piece>
                </svg>`;
            }
        }
        defineComponent('r3-svg-hyphen', R3Svg);
        const el = mount('r3-svg-hyphen');
        assert.equal(el.querySelector('#h').getAttribute('disabled'),
            el.querySelector('#n').getAttribute('disabled'),
            'the hyphen rule is an HTML-namespace rule');
        document.body.removeChild(el);
    });

    it('inert reaches the host even when a component declares it', () => {
        class R3Inert extends Component { static props = { inert: false }; template() { return html`<i></i>`; } }
        defineComponent('r3-inert-child', R3Inert);
        class R3InertHost extends Component {
            constructor(props) { super(props); this.state = { inert: false }; }
            template() { return html`<r3-inert-child inert="${this.state.inert}"></r3-inert-child>`; }
        }
        defineComponent('r3-inert-host', R3InertHost);
        const el = mount('r3-inert-host');
        const child = el.querySelector('r3-inert-child');
        flushSync(() => { el.state.inert = true; });
        // The component's own accessor shadows HTMLElement.prototype.inert, so
        // only the attribute can activate host inertness.
        assert.equal(child.getAttribute('inert'), '', 'the attribute is set');
        document.body.removeChild(el);
    });

    it('a class passed as a prop is handed over unwrapped', () => {
        class Thing { constructor() { this.ok = true; } }
        class R2ClsProbe extends Component {
            static props = { cls: null };
            template() { return html`<i></i>`; }
        }
        defineComponent('r2-cls-probe', R2ClsProbe);
        class R2ClsHost extends Component {
            constructor(props) { super(props); this.state = { c: Thing }; }
            template() { return html`<r2-cls-probe cls="${this.state.c}"></r2-cls-probe>`; }
        }
        defineComponent('r2-cls-host', R2ClsHost);

        const el = mount('r2-cls-host');
        const cls = el.querySelector('r2-cls-probe').props.cls;
        // The dispatch wrapper calls through .apply(), which a constructor refuses.
        assert.equal(new cls().ok, true, 'the child can still construct it');
        assert.equal(cls, Thing, 'and it is the class itself, so name/statics/instanceof hold');
        document.body.removeChild(el);
    });

    it('an object style binding clears a preceding cssText string', () => {
        class R2Style extends Component {
            constructor(props) { super(props); this.state = { s: { color: 'red', fontWeight: 'bold' } }; }
            template() { return html`<div id="s" style="${this.state.s}"></div>`; }
        }
        defineComponent('r2-style-host', R2Style);
        const el = mount('r2-style-host');
        flushSync(() => { el.state.s = 'text-decoration: underline'; });
        flushSync(() => { el.state.s = { color: 'green' }; });
        const style = el.querySelector('#s').style;
        assert.equal(style.textDecoration, '', 'the string form\'s declarations do not leak');
        assert.equal(style.color, 'green', 'and the new object still applies');
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
