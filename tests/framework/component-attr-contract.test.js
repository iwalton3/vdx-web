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
