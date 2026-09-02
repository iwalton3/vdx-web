/**
 * Regressions from the codex audit (docs/tasklists/CODEX-AUDIT-WORKLIST.md).
 * Each one rendered silently wrong output rather than throwing, which is why
 * they survived a full green suite.
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, when, each, memoEach, contain, raw, Component, flushSync } from '../../lib/framework.js';
import { EMPTY_WHEN_RESULT } from '../../lib/core/template.js';
import { reactive, computed, createEffect, flushEffects } from '../../lib/core/reactivity.js';

function mount(tag) {
    const el = document.createElement(tag);
    document.body.appendChild(el);
    return el;
}

describe('Audit Fixes', function(it) {
    it('computed notifies dependents again after a throwing getter heals', () => {
        const state = reactive({ bad: false, n: 1 });
        const value = computed(() => {
            const n = state.n;
            if (state.bad) throw new Error('transient');
            return n;
        });
        const seen = [];
        createEffect(() => seen.push(value.get()), { onError: e => seen.push(e.message) });

        state.bad = true;
        flushEffects();
        state.bad = false;
        flushEffects();

        // The lazy get() recompute has to set `failed` the way the effect body
        // does; otherwise the computed stays dirty-but-not-failed and the next
        // dependency change reaches neither branch.
        assert.deepEqual(seen, [1, 'transient', 1], 'dependent re-runs once the getter stops throwing');
    });

    it('contain() renders an array in order', () => {
        class ContainOrder extends Component {
            constructor(props) { super(props); this.state = { n: 1 }; }
            template() {
                return html`<div id="out">${contain(() => {
                    void this.state.n;
                    return ['A', 'B', 'C'];
                })}</div>`;
            }
        }
        defineComponent('audit-contain-order', ContainOrder);
        const el = mount('audit-contain-order');

        assert.equal(el.querySelector('#out').textContent, 'ABC',
            'every item inserted after the same placeholder would render CBA');

        flushSync(() => { el.state.n = 2; });
        assert.equal(el.querySelector('#out').textContent, 'ABC', 'still ordered after a re-run');

        document.body.removeChild(el);
    });

    it('object-form styles drop keys the next value omits', () => {
        class StyleKeys extends Component {
            constructor(props) { super(props); this.state = { style: { color: 'red', backgroundColor: 'blue' } }; }
            template() { return html`<div id="s" style="${this.state.style}"></div>`; }
        }
        defineComponent('audit-style-keys', StyleKeys);
        const el = mount('audit-style-keys');
        assert.equal(el.querySelector('#s').style.backgroundColor, 'blue', 'initial style applied');

        flushSync(() => { el.state.style = { color: 'green' }; });
        const style = el.querySelector('#s').style;
        assert.equal(style.color, 'green', 'kept key updated');
        assert.equal(style.backgroundColor, '', 'omitted key cleared, not left from the previous object');

        document.body.removeChild(el);
    });

    it('a top-level event handler sees the closure from the latest render', () => {
        class HandlerFreshness extends Component {
            constructor(props) { super(props); this.state = { n: 1 }; this.seen = []; }
            template() {
                const captured = this.state.n;
                return html`<button on-click="${() => this.seen.push(captured)}">go</button>`;
            }
        }
        defineComponent('audit-handler-freshness', HandlerFreshness);
        const el = mount('audit-handler-freshness');

        const before = el.querySelector('button');
        el.querySelector('button').click();
        flushSync(() => { el.state.n = 2; });
        el.querySelector('button').click();

        assert.deepEqual(el.seen, [1, 2], 'second click runs the re-rendered closure, not the first one');
        assert.equal(el.querySelector('button'), before, 'and the element was not replaced to achieve it');

        document.body.removeChild(el);
    });

    it('contain() parses raw() instead of escaping it', () => {
        class ContainRaw extends Component {
            template() {
                return html`<div>
                    <span id="one">${contain(() => raw('<b>R</b>'))}</span>
                    <span id="many">${contain(() => [raw('<b>A</b>'), raw('<i>B</i>')])}</span>
                </div>`;
            }
        }
        defineComponent('audit-contain-raw', ContainRaw);
        const el = mount('audit-contain-raw');

        // raw() is the trusted-HTML escape hatch; containment used to stringify
        // the marker because it is not an html`` marker, so the tags escaped.
        assert.ok(el.querySelector('#one b'), 'contained raw() creates a real element');
        assert.equal(el.querySelector('#one').textContent, 'R', 'and not escaped text');
        assert.ok(el.querySelector('#many b') && el.querySelector('#many i'),
            'raw() items inside a contained array too');
        assert.equal(el.querySelector('#many').textContent, 'AB', 'in order');

        document.body.removeChild(el);
    });

    it('nullish clears a native input but reaches a component as null', async () => {
        class NullProbe extends Component {
            static props = { label: 'DEFAULT' };
            template() { return html`<i></i>`; }
        }
        defineComponent('audit-null-probe', NullProbe);

        class NullHost extends Component {
            constructor(props) { super(props); this.state = { v: 'filled', n: null }; }
            template() {
                return html`<div>
                    <input id="i" value="${this.state.v}">
                    <audit-null-probe id="p" label="${this.state.n}"></audit-null-probe>
                </div>`;
            }
        }
        defineComponent('audit-null-host', NullHost);
        const el = mount('audit-null-host');
        assert.equal(el.querySelector('#i').value, 'filled', 'initial value applied');

        flushSync(() => { el.state.v = null; });
        await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

        // A form control's live value does not track its attribute, so removing
        // the attribute alone left the old text on screen.
        assert.equal(el.querySelector('#i').value, '', 'nullish empties the live value, not just the attribute');
        assert.equal(el.querySelector('#i').getAttribute('value'), null, 'attribute removed too');
        assert.equal(el.querySelector('#p').props.label, null, 'a component gets the null itself, not ""');

        document.body.removeChild(el);
    });

    it('invalid list input returns the shared empty result, an empty list does not', () => {
        // Both used to allocate an equivalent fresh object. The distinction that
        // matters: each([]) must stay a fromEach fragment so an already-rendered
        // list can reconcile down to empty.
        assert.equal(each(null, x => x), EMPTY_WHEN_RESULT, 'each(null) is the shared empty');
        assert.equal(each('nope', x => x), EMPTY_WHEN_RESULT, 'each(non-array) is the shared empty');
        assert.equal(memoEach(null, x => x, x => x), EMPTY_WHEN_RESULT, 'memoEach(null) too');
        assert.equal(each([], x => x) === EMPTY_WHEN_RESULT, false, 'each([]) is NOT the shared empty');
        assert.ok(each([], x => x)._compiled.fromEach, 'each([]) stays a fromEach fragment');
    });

    it('an array of html`` templates: rejected in a slot, rendered inside contain()', () => {
        // Deliberately different, not an oversight. A bare array in a slot has no
        // keyed placeholders, so it desyncs the moment the list changes - hence the
        // guard. contain() replaces its whole boundary on every run, so the desync
        // it guards against cannot happen there.
        class ArrayContract extends Component {
            template() {
                return html`<div id="c">${contain(() => [html`<b>A</b>`, html`<i>B</i>`])}</div>`;
            }
        }
        defineComponent('audit-array-contract', ArrayContract);
        const el = mount('audit-array-contract');
        assert.ok(el.querySelector('#c b') && el.querySelector('#c i'),
            'contain() instantiates html`` array items');
        assert.equal(el.querySelector('#c').textContent, 'AB', 'in order');
        document.body.removeChild(el);

        class ArraySlot extends Component {
            template() { return html`<div>${[html`<b>A</b>`]}</div>`; }
        }
        defineComponent('audit-array-slot', ArraySlot);
        let threw = false;
        const prev = window.onerror;
        try {
            const bad = document.createElement('audit-array-slot');
            document.body.appendChild(bad);
            threw = !bad.querySelector('b');
            document.body.removeChild(bad);
        } catch { threw = true; } finally { window.onerror = prev; }
        assert.equal(threw, true, 'a bare html`` array in an ordinary slot is refused');
    });

    it('no queued DOM write reaches a binding disposed before the commit', async () => {
        const writes = [];
        const tag = 'audit-dispose-probe';
        if (!customElements.get(tag)) {
            customElements.define(tag, class extends HTMLElement {
                set value(v) { writes.push({ value: v, connected: this.isConnected }); }
            });
        }

        class DisposeHost extends Component {
            constructor(props) { super(props); this.state = { show: true, value: 'a' }; }
            template() {
                return html`${when(this.state.show,
                    html`<audit-dispose-probe value="${this.state.value}"></audit-dispose-probe>`,
                    null)}`;
            }
        }
        defineComponent('audit-dispose-host', DisposeHost);
        const el = mount('audit-dispose-host');

        writes.length = 0;
        // Attribute-only change: queued for the rAF commit rather than applied.
        el.state.value = 'b';
        await Promise.resolve();
        // Branch torn down before that commit runs.
        flushSync(() => { el.state.show = false; });

        assert.equal(writes.length, 0,
            'the disposed binding\'s setter must not run against its detached element');

        document.body.removeChild(el);
    });
});
