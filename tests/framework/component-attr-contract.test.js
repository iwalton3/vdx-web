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
import { defineComponent, html, Component, flushSync } from '../../lib/framework.js';

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

    it('a lazily-registered component receives its props with the type intact', () => {
        // Registration timing must not change what a prop IS. Routing the value
        // through the attribute cannot do that - an attribute holds a string -
        // so the real value goes through a side channel that _parseAttributes
        // drains on upgrade (lib/core/pending-props.js).
        //
        // The attribute stays as a devtools mirror for primitives, and is NOT
        // written for an object or a function: String()-ing those put
        // "[object Object]" and a whole function body into the DOM, and handed
        // the component that text as its prop.
        const cfg = { retries: 3 };
        const onPick = function onPick() { return 'PICKED'; };

        class CacLazyHost extends Component {
            constructor(p) {
                super(p);
                this.state = { n: 5, f: false, s: 'hi', c: cfg, h: onPick };
            }
            template() {
                return html`<cac-lazy count="${this.state.n}" flag="${this.state.f}"
                                      label="${this.state.s}" config="${this.state.c}"
                                      handler="${this.state.h}"></cac-lazy>`;
            }
        }
        defineComponent('cac-lazy-host', CacLazyHost);
        const el = mount('cac-lazy-host');
        const recv = el.querySelector('cac-lazy');

        assert.equal(recv.getAttribute('count'), '5',
            'a primitive still mirrors to the attribute while the tag is unregistered');
        assert.equal(recv.getAttribute('config'), null,
            'an object does NOT reach the DOM as "[object Object]"');
        assert.equal(recv.getAttribute('handler'), null,
            'nor a function as its source text');

        class CacLazy extends Component {
            static props = { count: null, flag: null, label: null, config: null, handler: null };
            template() { return html`<i></i>`; }
        }
        defineComponent('cac-lazy', CacLazy);   // upgrade

        assert.equal(recv.props.count, 5, 'a number arrives as a number, not "5"');
        assert.equal(recv.props.flag, false,
            'false arrives as false - it removes the attribute, so the attribute ' +
            'alone could not tell it from an omitted prop');
        assert.equal(recv.props.label, 'hi', 'alongside the string');
        // Against the host's own read, not the raw literal: state hands back a
        // reactive proxy, so `cfg !== el.state.c` by design. The claim that
        // matters is that the child got exactly what the parent passed.
        assert.equal(recv.props.config, el.state.c,
            'the object itself, not a stringification');
        assert.equal(recv.props.config.retries, 3, 'with its contents intact');
        assert.equal(typeof recv.props.handler, 'function', 'the function is callable');
        assert.equal(recv.props.handler(), 'PICKED', 'and reaches the real one');

        document.body.removeChild(el);
    });

    it('a camelCase prop survives registration through its kebab attribute', () => {
        // The side channel records under the name the TEMPLATE used, which is
        // the kebab form. _parseAttributes iterates camelCase prop names, so it
        // has to map back through propAttrNames - and a prop whose value is a
        // number or an object has no other way home.
        const cfg = { unit: 'litres' };
        class CacKebabHost extends Component {
            constructor(p) { super(p); this.state = { u: cfg, n: 42 }; }
            template() {
                return html`<cac-kebab from-unit="${this.state.u}"
                                       max-rows="${this.state.n}"></cac-kebab>`;
            }
        }
        defineComponent('cac-kebab-host', CacKebabHost);
        const el = mount('cac-kebab-host');
        const recv = el.querySelector('cac-kebab');

        class CacKebab extends Component {
            static props = { fromUnit: 'DEF', maxRows: 'DEF' };
            template() { return html`<i></i>`; }
        }
        defineComponent('cac-kebab', CacKebab);   // upgrade

        assert.equal(recv.props.fromUnit, el.state.u, 'the object reached the camelCase prop');
        assert.equal(recv.props.maxRows, 42, 'and the number stayed a number');

        document.body.removeChild(el);
    });

    it('registration timing does not change what a prop is', () => {
        // The control for the test above, and the contract stated in
        // registration-timing.test.js: byte-identical markup either side of
        // registration must behave identically. Every non-string value
        // disagreed before the side channel existed - a number arrived as
        // "7", false and null arrived as the declared default.
        const cases = [['number', 7], ['false', false], ['true', true],
                       ['null', null], ['string', 'x'], ['object', { k: 1 }]];

        cases.forEach(([label, value], i) => {
            const earlyTag = `cac-rt-early-${i}`;
            const lateTag = `cac-rt-late-${i}`;
            const probe = () => class extends Component {
                static props = { v: 'THE-DEFAULT' };
                template() { return html`<i></i>`; }
            };
            // Compiled next to the render that uses it. A template compiled at
            // module scope is evicted by the 500-entry LRU and silently
            // recompiled later - after registration, which is the state this
            // test exists to exclude.
            const hostFor = (tag) => {
                const strings = [`<${tag} v="`, `"></${tag}>`];
                return class extends Component {
                    constructor(p) { super(p); this.state = { v: value }; }
                    template() { return html(strings, this.state.v); }
                };
            };

            // early: the host renders while the tag is still unknown, and the
            // class arrives afterwards - what a lazy import() does.
            defineComponent(`cac-rt-eh-${i}`, hostFor(earlyTag));
            const eh = mount(`cac-rt-eh-${i}`);
            defineComponent(earlyTag, probe());

            // late: registered first. The control.
            defineComponent(lateTag, probe());
            defineComponent(`cac-rt-lh-${i}`, hostFor(lateTag));
            const lh = mount(`cac-rt-lh-${i}`);

            assert.equal(eh.querySelector(earlyTag).props.v,
                         lh.querySelector(lateTag).props.v,
                         `${label}: same markup, same prop either side of registration`);

            document.body.removeChild(eh);
            document.body.removeChild(lh);
        });
    });

    it('an object on an inherited name clears it rather than stringifying it', () => {
        // `title` is not a declared prop and the class does not own it, so it
        // keeps native DOM semantics - and a DOM property can only stringify an
        // object. Writing it put "[object Object]" in the tooltip; skipping the
        // write left the PREVIOUS title showing, which is worse than either.
        class CacStale extends Component {
            static props = {};
            template() { return html`<i></i>`; }
        }
        defineComponent('cac-stale', CacStale);

        class CacStaleHost extends Component {
            constructor(p) { super(p); this.state = { t: 'first' }; }
            template() { return html`<cac-stale title="${this.state.t}"></cac-stale>`; }
        }
        defineComponent('cac-stale-host', CacStaleHost);

        const el = mount('cac-stale-host');
        const child = el.querySelector('cac-stale');
        assert.equal(child.title, 'first', 'a string reaches the inherited property');

        flushSync(() => { el.state.t = { any: 'object' }; });
        assert.equal(child.title, '', 'the stale title is gone');
        assert.equal(child.getAttribute('title'), null, 'and nothing was stringified into the DOM');

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
