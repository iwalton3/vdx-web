/**
 * Tests for class-authored components (defineComponent with a class)
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, Component, html, flushSync, createStore } from '../lib/framework.js';

/** Capture console.warn calls while fn runs, returns the messages */
function captureWarns(fn) {
    const warns = [];
    const original = console.warn;
    console.warn = (...args) => { warns.push(args.join(' ')); };
    try {
        fn();
    } finally {
        console.warn = original;
    }
    return warns;
}

describe('Class components: basics', function(it) {
    it('renders template, binds methods, and reacts to state changes', () => {
        class TcBasic extends Component {
            static props = { label: 'World' };
            constructor(props) {
                super(props);
                this.state = { count: 0 };
            }
            increment() { this.state.count++; }
            template() {
                return html`<div><span id="l">${this.props.label}</span><span id="c">${this.state.count}</span></div>`;
            }
        }
        defineComponent('tc-basic', TcBasic);

        const el = document.createElement('tc-basic');
        document.body.appendChild(el);

        assert.equal(el.querySelector('#l').textContent, 'World', 'Should render default prop');
        assert.equal(el.querySelector('#c').textContent, '0', 'Should render initial state');

        // Methods are bound - callable detached from the element
        const inc = el.increment;
        flushSync(() => inc());
        assert.equal(el.querySelector('#c').textContent, '1', 'Bound method should update state and DOM');

        document.body.removeChild(el);
    });

    it('constructor receives real prop values (attribute set before mount)', () => {
        let seenInCtor = null;
        class TcCtorProps extends Component {
            static props = { label: 'default' };
            constructor(props) {
                super(props);
                seenInCtor = props.label;
                this.state = { copied: props.label };
            }
            template() { return html`<div id="v">${this.state.copied}</div>`; }
        }
        defineComponent('tc-ctor-props', TcCtorProps);

        const el = document.createElement('tc-ctor-props');
        el.setAttribute('label', 'from-attribute');
        document.body.appendChild(el);

        assert.equal(seenInCtor, 'from-attribute', 'Constructor should see attribute value');
        assert.equal(el.querySelector('#v').textContent, 'from-attribute', 'State copied from props should render');

        document.body.removeChild(el);

        // Same for props set as properties before mount
        const el2 = document.createElement('tc-ctor-props');
        el2.label = 'from-property';
        document.body.appendChild(el2);
        assert.equal(seenInCtor, 'from-property', 'Constructor should see property value');
        document.body.removeChild(el2);
    });

    it('supports field-style state reading this.props', () => {
        class TcField extends Component {
            static props = { start: '5' };
            state = { n: Number(this.props.start) * 2 };
            template() { return html`<div id="n">${this.state.n}</div>`; }
        }
        defineComponent('tc-field', TcField);

        const el = document.createElement('tc-field');
        el.setAttribute('start', '21');
        document.body.appendChild(el);

        assert.equal(el.querySelector('#n').textContent, '42', 'Field initializer should see real props');

        flushSync(() => { el.state.n = 7; });
        assert.equal(el.querySelector('#n').textContent, '7', 'Field-style state should be reactive');

        document.body.removeChild(el);
    });

    it('binds arrow-function fields to the element, not a throwaway instance', () => {
        class TcArrow extends Component {
            state = { hits: 0 };
            hit = () => { this.state.hits++; };
            template() { return html`<div id="h">${this.state.hits}</div>`; }
        }
        defineComponent('tc-arrow', TcArrow);

        const el = document.createElement('tc-arrow');
        document.body.appendChild(el);

        const detached = el.hit;
        flushSync(() => detached());
        assert.equal(el.state.hits, 1, 'Arrow field should close over the element state');
        assert.equal(el.querySelector('#h').textContent, '1', 'DOM should reflect the update');

        document.body.removeChild(el);
    });

    it('runs mounted and unmounted hooks with element as this', (done) => {
        let mountedTag = null;
        let unmountedCalled = false;
        class TcLifecycle extends Component {
            state = { ready: false };
            mounted() {
                mountedTag = this.tagName.toLowerCase();
                this.state.ready = true;
            }
            unmounted() { unmountedCalled = true; }
            template() { return html`<div id="r">${this.state.ready}</div>`; }
        }
        defineComponent('tc-lifecycle', TcLifecycle);

        const el = document.createElement('tc-lifecycle');
        document.body.appendChild(el);

        setTimeout(() => {
            assert.equal(mountedTag, 'tc-lifecycle', 'mounted() should run with element as this');
            assert.equal(el.querySelector('#r').textContent, 'true', 'State set in mounted should render');

            document.body.removeChild(el);
            assert.ok(unmountedCalled, 'unmounted() should run on removal');
            done();
        }, 50);
    });
});

describe('Class components: getters and inheritance', function(it) {
    it('exposes getters as cached computed properties', () => {
        let calls = 0;
        class TcGetter extends Component {
            state = { a: 2, b: 3 };
            get sum() {
                calls++;
                return this.state.a + this.state.b;
            }
            template() { return html`<div id="s">${this.sum}</div>`; }
        }
        defineComponent('tc-getter', TcGetter);

        const el = document.createElement('tc-getter');
        document.body.appendChild(el);

        assert.equal(el.querySelector('#s').textContent, '5', 'Should render computed value');
        const callsAfterMount = calls;
        assert.equal(el.sum, 5, 'Getter readable on the element');
        assert.equal(el.sum, 5, 'Getter readable repeatedly');
        assert.equal(calls, callsAfterMount, 'Repeated reads should hit the cache');

        flushSync(() => { el.state.a = 10; });
        assert.equal(el.querySelector('#s').textContent, '13', 'DOM should update when computed deps change');

        document.body.removeChild(el);
    });

    it('re-evaluates dependency-free getters on every read (no stale cache)', () => {
        let externalValue = 1; // not reactive, not props
        class TcVolatile extends Component {
            get external() { return externalValue; }
            template() { return html`<div></div>`; }
        }
        defineComponent('tc-volatile', TcVolatile);

        const el = document.createElement('tc-volatile');
        document.body.appendChild(el);

        assert.equal(el.external, 1, 'Should read initial value');
        externalValue = 2;
        assert.equal(el.external, 2, 'Dependency-free getter should not cache');

        document.body.removeChild(el);
    });

    it('caches props-only getters and invalidates them on prop change', () => {
        let calls = 0;
        class TcPropGetter extends Component {
            static props = { word: 'hi' };
            get shouted() {
                calls++;
                return this.props.word.toUpperCase();
            }
            template() { return html`<div id="w">${this.shouted}</div>`; }
        }
        defineComponent('tc-prop-getter', TcPropGetter);

        const el = document.createElement('tc-prop-getter');
        document.body.appendChild(el);

        assert.equal(el.querySelector('#w').textContent, 'HI', 'Should render derived value');
        const callsAfterMount = calls;
        assert.equal(el.shouted, 'HI', 'Getter readable');
        assert.equal(el.shouted, 'HI', 'Getter readable repeatedly');
        assert.equal(calls, callsAfterMount, 'Props-only getter should stay cached across reads');

        flushSync(() => { el.word = 'bye'; });
        assert.equal(el.querySelector('#w').textContent, 'BYE', 'Prop change should invalidate the cache');

        document.body.removeChild(el);
    });

    it('supports inheritance: merged static props and super method calls', () => {
        class TcGreeterBase extends Component {
            static props = { punctuation: '!' };
            greeting() { return 'hello'; }
            template() { return html`<div id="g">${this.greeting()}${this.props.punctuation}</div>`; }
        }
        class TcGreeterSub extends TcGreeterBase {
            static props = { loud: 'yes' };
            greeting() {
                const base = super.greeting();
                return this.props.loud === 'yes' ? base.toUpperCase() : base;
            }
        }
        // Only the subclass is registered - the base is just a class
        defineComponent('tc-greeter-sub', TcGreeterSub);

        const el = document.createElement('tc-greeter-sub');
        document.body.appendChild(el);

        assert.equal(el.props.punctuation, '!', 'Parent static props should merge in');
        assert.equal(el.props.loud, 'yes', 'Child static props should merge in');
        assert.equal(el.querySelector('#g').textContent, 'HELLO!', 'super.method() should work on the element');

        document.body.removeChild(el);
    });

    it('wires static stores', () => {
        const tcStore = createStore({ msg: 'hello' });
        class TcStore extends Component {
            static stores = { box: tcStore };
            template() { return html`<div id="m">${this.stores.box.msg}</div>`; }
        }
        defineComponent('tc-store', TcStore);

        const el = document.createElement('tc-store');
        document.body.appendChild(el);

        assert.equal(el.querySelector('#m').textContent, 'hello', 'Should render store state');
        flushSync(() => { tcStore.state.msg = 'bye'; });
        assert.equal(el.querySelector('#m').textContent, 'bye', 'Should react to store changes');

        document.body.removeChild(el);
    });
});

describe('Class components: guardrails', function(it) {
    it('removes prop-named class fields and warns (accessor keeps working)', () => {
        class TcShadow extends Component {
            static props = { title: 'proper-default' };
            title = 'field-value';
            template() { return html`<div id="t">${this.props.title}</div>`; }
        }
        defineComponent('tc-shadow', TcShadow);

        const el = document.createElement('tc-shadow');
        let warns;
        try {
            warns = captureWarns(() => document.body.appendChild(el));

            assert.ok(warns.some(w => w.includes('"title"')), 'Should warn about the shadowing field');
            assert.ok(!Object.prototype.hasOwnProperty.call(el, 'title'),
                'Own field should be removed so the prototype accessor works');
            assert.equal(el.title, 'proper-default', 'Accessor should read the prop, not the field');

            let observed = null;
            el.propsChanged = (prop, val) => { observed = `${prop}=${val}`; };
            el.title = 'via-accessor';
            assert.equal(observed, 'title=via-accessor', 'Prop setter should still notify propsChanged');
        } finally {
            document.body.removeChild(el);
        }
    });

    it('does not re-run the constructor on reconnection', () => {
        let ctorRuns = 0;
        class TcReconnect extends Component {
            constructor(props) {
                super(props);
                ctorRuns++;
                this.state = { v: 1 };
            }
            template() { return html`<div></div>`; }
        }
        defineComponent('tc-reconnect', TcReconnect);

        const el = document.createElement('tc-reconnect');
        document.body.appendChild(el);
        el.state.v = 42;

        // Moving an element disconnects and reconnects it synchronously
        const other = document.createElement('div');
        document.body.appendChild(other);
        other.appendChild(el);

        assert.equal(ctorRuns, 1, 'Constructor should run exactly once');
        assert.equal(el.state.v, 42, 'State should survive the move');

        document.body.removeChild(other);
    });

    it('warns on tag name collision and returns the registered class', () => {
        const First = defineComponent('tc-collision', class extends Component {
            template() { return html`<i>first</i>`; }
        });

        let Second;
        const warns = captureWarns(() => {
            Second = defineComponent('tc-collision', class extends Component {
                template() { return html`<i>second</i>`; }
            });
        });

        assert.ok(warns.some(w => w.includes('tc-collision')), 'Should warn about the collision');
        assert.equal(Second, First, 'Should return the class that is actually registered');

        const el = document.createElement('tc-collision');
        document.body.appendChild(el);
        assert.equal(el.querySelector('i').textContent, 'first', 'First registration should win');
        document.body.removeChild(el);
    });

    it('re-registering the same definition is silent and idempotent', () => {
        class TcIdem extends Component {
            template() { return html`<div></div>`; }
        }
        const First = defineComponent('tc-idem', TcIdem);

        let Second;
        const warns = captureWarns(() => {
            Second = defineComponent('tc-idem', TcIdem);
        });
        assert.equal(warns.length, 0, 'Same class re-registered should not warn');
        assert.equal(Second, First, 'Should return the registered class');

        // Same for a re-passed options object
        const opts = { template() { return html`<div></div>`; } };
        const OptFirst = defineComponent('tc-idem-opts', opts);
        let OptSecond;
        const optWarns = captureWarns(() => {
            OptSecond = defineComponent('tc-idem-opts', opts);
        });
        assert.equal(optWarns.length, 0, 'Same options object re-registered should not warn');
        assert.equal(OptSecond, OptFirst, 'Should return the registered class');
    });

    it('rejects direct instantiation and non-Component classes', () => {
        class TcDirect extends Component {
            template() { return html`<div></div>`; }
        }
        defineComponent('tc-direct', TcDirect);

        let directError = null;
        try {
            new TcDirect();
        } catch (e) {
            directError = e;
        }
        assert.ok(directError && directError.message.includes('defineComponent'),
            'Direct instantiation should throw with guidance');

        let plainError = null;
        try {
            defineComponent('tc-plain-class', class { template() { return html`<div></div>`; } });
        } catch (e) {
            plainError = e;
        }
        assert.ok(plainError && plainError.message.includes('extend Component'),
            'Classes not extending Component should be rejected');
    });
});
