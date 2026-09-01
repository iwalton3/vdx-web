/**
 * Boolean attribute semantics.
 *
 * One rule, two halves: literal template text is HTML source, so a native
 * boolean attribute is on whenever it is present (disabled="false" is still
 * disabled); an interpolated ${} value is a JS value and follows JS
 * truthiness. On a component the name is just a prop name, never coerced -
 * literal text arrives as the author's string, ${} keeps its type.
 *
 * Both sinks are covered deliberately. A subtree with no interpolation is
 * pre-built by the compiler (buildStaticDOM); adding a dynamic child routes
 * the same literal through the renderer instead. They used to disagree.
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, Component, boolProp } from '../../lib/framework.js';

class BAttrProbe extends Component {
    static props = { disabled: null, checked: null };
    template() { return html`<i></i>`; }
}
defineComponent('battr-probe', BAttrProbe);

function mount(tag) {
    const el = document.createElement(tag);
    document.body.appendChild(el);
    return el;
}

describe('Boolean Attributes', function(it) {
    it('native: literal text follows HTML in both sinks', () => {
        class BAttrNativeLiteral extends Component {
            template() {
                return html`<div>
                    <div><button id="bare" disabled></button></div>
                    <div><button id="bare-dyn" disabled>${''}</button></div>
                    <div><button id="false" disabled="false"></button></div>
                    <div><button id="false-dyn" disabled="false">${''}</button></div>
                </div>`;
            }
        }
        defineComponent('battr-native-literal', BAttrNativeLiteral);
        const el = mount('battr-native-literal');

        assert.equal(el.querySelector('#bare').disabled, true, 'bare disabled, static subtree');
        assert.equal(el.querySelector('#bare-dyn').disabled, true, 'bare disabled, dynamic subtree');
        assert.equal(el.querySelector('#false').disabled, true,
            'disabled="false" is literal HTML text - presence wins, static subtree');
        assert.equal(el.querySelector('#false-dyn').disabled, true,
            'disabled="false" is literal HTML text - presence wins, dynamic subtree');

        document.body.removeChild(el);
    });

    it('native: interpolated values follow JS truthiness', () => {
        class BAttrNativeInterp extends Component {
            constructor(props) { super(props); this.state = { off: false, on: true }; }
            template() {
                return html`<div>
                    <button id="off" disabled="${this.state.off}"></button>
                    <button id="on" disabled="${this.state.on}"></button>
                </div>`;
            }
        }
        defineComponent('battr-native-interp', BAttrNativeInterp);
        const el = mount('battr-native-interp');

        assert.equal(el.querySelector('#off').disabled, false, '${false} clears a boolean attribute');
        assert.equal(el.querySelector('#on').disabled, true, '${true} sets a boolean attribute');
        assert.equal(el.querySelector('#off').getAttribute('disabled'), null,
            '${false} removes the attribute, not just the property');

        document.body.removeChild(el);
    });

    it('component: a boolean-attribute name is an ordinary prop, never coerced', () => {
        class BAttrHost extends Component {
            constructor(props) { super(props); this.state = { off: false, on: true }; }
            template() {
                return html`<div>
                    <battr-probe id="lit" disabled="false"></battr-probe>
                    <battr-probe id="lit-dyn" disabled="false">${''}</battr-probe>
                    <battr-probe id="off" disabled="${this.state.off}"></battr-probe>
                    <battr-probe id="on" disabled="${this.state.on}"></battr-probe>
                    <battr-probe id="chk" checked="false"></battr-probe>
                </div>`;
            }
        }
        defineComponent('battr-host', BAttrHost);
        const el = mount('battr-host');

        assert.equal(el.querySelector('#lit').props.disabled, 'false',
            'literal text reaches the component as the author wrote it');
        assert.equal(el.querySelector('#lit-dyn').props.disabled, 'false',
            'same literal, dynamic subtree - the two sinks must agree');
        assert.equal(el.querySelector('#off').props.disabled, false, '${false} arrives as boolean false');
        assert.equal(el.querySelector('#on').props.disabled, true, '${true} arrives as boolean true');
        // `checked` is special-cased ahead of the boolean branch for native
        // inputs; that shortcut must not swallow a component's prop.
        assert.equal(el.querySelector('#chk').props.checked, 'false',
            'checked is not coerced on a component either');

        document.body.removeChild(el);
    });

    it('boolProp() collapses both forms the way an HTML author expects', () => {
        assert.equal(boolProp(''), true, 'bare attribute (empty string) is present, so true');
        assert.equal(boolProp('disabled'), true, 'bare attribute echoed as its own name is true');
        assert.equal(boolProp('true'), true, '"true" is true');
        assert.equal(boolProp('false'), false, '"false" is the one string that is false');
        assert.equal(boolProp(true), true, 'boolean true');
        assert.equal(boolProp(false), false, 'boolean false');
        assert.equal(boolProp(null), false, 'absent prop');
        assert.equal(boolProp(undefined), false, 'absent prop');
    });
});
