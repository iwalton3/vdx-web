/**
 * What a component is handed, and what the attribute is for.
 *
 * The prop is the contract: an interpolated value reaches the component with
 * its type intact. The attribute is a devtools mirror, and a mirror can only
 * hold strings - a non-string shows no attribute rather than a lossy rendering
 * of one, because the place to inspect a non-string is the node itself.
 *
 * The trap this pins: roughly half of HTMLElement's surface (id, title, lang,
 * dir, slot, translate, spellcheck) collides with ordinary prop names, and
 * routing a prop through the inherited DOM property silently coerces it.
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, Component } from '../../lib/framework.js';

function mount(tag) {
    const el = document.createElement(tag);
    document.body.appendChild(el);
    return el;
}

describe('Component Attribute Contract', function(it) {
    it('a prop colliding with an inherited DOM property is not coerced', () => {
        const obj = { a: 1 };
        class CacRecv extends Component {
            static props = { title: null, lang: null };
            template() { return html`<i></i>`; }
        }
        defineComponent('cac-recv', CacRecv);

        class CacHost extends Component {
            constructor(p) { super(p); this.state = { o: obj, s: 'false' }; }
            template() {
                return html`<div>
                    <cac-recv id="o" title="${this.state.o}"></cac-recv>
                    <cac-recv id="s" lang="${this.state.s}"></cac-recv>
                </div>`;
            }
        }
        defineComponent('cac-host', CacHost);
        const el = mount('cac-host');

        const withObj = el.querySelector('#o');
        const withStr = el.querySelector('#s');
        // el.title = {a:1} would stringify to "[object Object]"; the prop must
        // carry the object itself.
        // deepEqual, not equal: reading a prop returns a reactive proxy, which
        // is never identical to the raw object that went in.
        assert.deepEqual(withObj.props.title, obj, 'an object reaches the prop unchanged');
        assert.equal(withObj.hasAttribute('title'), false,
            'and leaves no attribute, rather than a lossy rendering of one');
        assert.equal(withStr.props.lang, 'false', "the string 'false' stays a string");
        assert.equal(withStr.getAttribute('lang'), 'false', 'and is mirrored verbatim');

        document.body.removeChild(el);
    });

    it('the mirror never outlives the value it mirrors', () => {
        class CacSwap extends Component {
            static props = { data: null };
            template() { return html`<i></i>`; }
        }
        defineComponent('cac-swap', CacSwap);

        const arr = [1, 2, 3];
        class CacSwapHost extends Component {
            constructor(p) { super(p); this.state = { v: 'text' }; }
            template() { return html`<cac-swap data="${this.state.v}"></cac-swap>`; }
        }
        defineComponent('cac-swap-host', CacSwapHost);
        const el = mount('cac-swap-host');
        const recv = el.querySelector('cac-swap');
        assert.equal(recv.getAttribute('data'), 'text', 'a string is mirrored');

        // Writing the attribute fires attributeChangedCallback, which re-derives
        // the prop from the attribute's string form. The attribute is written
        // FIRST and the property second so the lossless value lands last.
        el.state.v = arr;
        return Promise.resolve().then(() => new Promise(r => requestAnimationFrame(r))).then(() => {
            assert.deepEqual(recv.props.data, arr, 'the array survives the mirror update');
            assert.equal(recv.hasAttribute('data'), false, 'and the stale string mirror is gone');
            document.body.removeChild(el);
        });
    });

    it('a third-party custom element still receives its declared properties', () => {
        // Not a VDX component - just an element with its own accessor. The
        // own-property test is what keeps this working while still refusing to
        // write inherited HTMLElement properties.
        if (!customElements.get('cac-vanilla')) {
            customElements.define('cac-vanilla', class extends HTMLElement {
                set items(v) { this._items = v; }
                get items() { return this._items; }
            });
        }
        const rows = ['a', 'b'];
        class CacVanillaHost extends Component {
            constructor(p) { super(p); this.state = { rows }; }
            template() { return html`<cac-vanilla items="${this.state.rows}"></cac-vanilla>`; }
        }
        defineComponent('cac-vanilla-host', CacVanillaHost);
        const el = mount('cac-vanilla-host');

        assert.deepEqual(el.querySelector('cac-vanilla').items, rows,
            'an own accessor receives the real value');

        document.body.removeChild(el);
    });

    it('inherited DOM attributes keep native semantics on a plain custom tag', () => {
        class CacIdHost extends Component {
            constructor(p) { super(p); this.state = { n: 5 }; }
            template() { return html`<cac-unknown id="${this.state.n}"></cac-unknown>`; }
        }
        defineComponent('cac-id-host', CacIdHost);
        const el = mount('cac-id-host');

        // id identifies the host element; it is not a prop for a component that
        // does not exist. A non-string must not make it vanish.
        assert.equal(el.querySelector('cac-unknown').id, '5',
            '${5} still produces id="5" on an unregistered tag');

        document.body.removeChild(el);
    });

    it('an attribute the component does not declare keeps native semantics', () => {
        // A registered component does not own every name that appears on it.
        // Treating "is a component" as "has a property channel for this name"
        // removed the mirror for undeclared names, and nothing carried them:
        // tabindex="${0}" left the element unfocusable.
        class CacUndeclared extends Component {
            static props = { declared: null };
            template() { return html`<i></i>`; }
        }
        defineComponent('cac-undeclared', CacUndeclared);

        class CacUndeclaredHost extends Component {
            constructor(p) { super(p); this.state = { z: 0 }; }
            template() {
                return html`<cac-undeclared tabindex="${this.state.z}"></cac-undeclared>`;
            }
        }
        defineComponent('cac-undeclared-host', CacUndeclaredHost);
        const el = mount('cac-undeclared-host');
        const recv = el.querySelector('cac-undeclared');

        assert.equal(recv.getAttribute('tabindex'), '0', 'the attribute survives');
        assert.equal(recv.tabIndex, 0, 'and the element is still focusable');

        document.body.removeChild(el);
    });

    it('a declared prop changes once, with no null in between', () => {
        const calls = [];
        class CacOnce extends Component {
            static props = { count: null };
            propsChanged(name, nv, ov) { calls.push([name, nv, ov]); }
            template() { return html`<i></i>`; }
        }
        defineComponent('cac-once', CacOnce);

        class CacOnceHost extends Component {
            constructor(p) { super(p); this.state = { c: '5' }; }
            template() { return html`<cac-once count="${this.state.c}"></cac-once>`; }
        }
        defineComponent('cac-once-host', CacOnceHost);
        const el = mount('cac-once-host');
        calls.length = 0;

        el.state.c = 6;
        return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))).then(() => {
            // The prop setter already mirrors the value to the attribute under
            // _suppressAttributeChange. Doing it again in the renderer fired
            // attributeChangedCallback, so propsChanged saw ('count', null, '5')
            // before ('count', 6, null) - and a component following the
            // documented `propsChanged(prop, newValue)` pattern processes null.
            assert.equal(calls.length, 1, 'exactly one propsChanged call');
            assert.equal(calls[0][1], 6, 'with the new value');
            assert.equal(calls[0][2], '5', 'and the old one');
            document.body.removeChild(el);
        });
    });

    it('nullish on an undeclared name is not stringified onto the host', () => {
        class CacNullish extends Component {
            static props = { declared: null };
            template() { return html`<i></i>`; }
        }
        defineComponent('cac-nullish', CacNullish);

        class CacNullishHost extends Component {
            constructor(p) { super(p); this.state = { n: null }; }
            template() { return html`<cac-nullish id="${this.state.n}"></cac-nullish>`; }
        }
        defineComponent('cac-nullish-host', CacNullishHost);
        const el = mount('cac-nullish-host');

        // `el.id = null` reflects the string "null". The rule says null and
        // undefined are never stringified into the DOM.
        assert.equal(el.querySelector('cac-nullish').hasAttribute('id'), false,
            'null does not become id="null"');

        document.body.removeChild(el);
    });

    it('a lazily-registered component still receives non-string props', () => {
        // The attribute is a mirror only when a property channel exists to
        // carry the real value. Before the tag registers there is none, so the
        // attribute is the ONLY transport - _parseAttributes reads it on
        // upgrade. Removing it because the value "is not a string" silently
        // dropped every numeric and boolean prop passed to a lazy() component.
        class CacLazyHost extends Component {
            constructor(p) { super(p); this.state = { n: 5, f: true, s: 'hi' }; }
            template() {
                return html`<cac-lazy count="${this.state.n}" flag="${this.state.f}"
                                      label="${this.state.s}"></cac-lazy>`;
            }
        }
        defineComponent('cac-lazy-host', CacLazyHost);
        const el = mount('cac-lazy-host');
        const recv = el.querySelector('cac-lazy');

        assert.equal(recv.getAttribute('count'), '5',
            'a number survives as an attribute while the tag is unregistered');
        assert.equal(recv.getAttribute('flag'), 'true', 'so does a boolean');

        class CacLazy extends Component {
            static props = { count: null, flag: null, label: null };
            template() { return html`<i></i>`; }
        }
        defineComponent('cac-lazy', CacLazy);   // upgrade

        assert.equal(recv.props.count, '5', 'and reaches props on upgrade');
        assert.equal(recv.props.flag, 'true', 'boolean too');
        assert.equal(recv.props.label, 'hi', 'alongside the string');

        document.body.removeChild(el);
    });

    it('host-affecting attributes keep DOM semantics on a component', () => {
        class CacHostAttr extends Component {
            static props = { spellcheck: null };
            template() { return html`<i></i>`; }
        }
        defineComponent('cac-host-attr', CacHostAttr);

        class CacHostAttrHost extends Component {
            constructor(p) { super(p); this.state = { off: false }; }
            template() {
                return html`<cac-host-attr spellcheck="${this.state.off}"></cac-host-attr>`;
            }
        }
        defineComponent('cac-host-attr-host', CacHostAttrHost);
        const el = mount('cac-host-attr-host');

        // A contenteditable or spellchecked custom element really is one, so
        // these act on the host wherever they appear - the same reason a
        // component must stay hideable before it registers.
        assert.equal(el.querySelector('cac-host-attr').getAttribute('spellcheck'), 'false',
            '${false} writes the off-word on a component too');

        document.body.removeChild(el);
    });
});
