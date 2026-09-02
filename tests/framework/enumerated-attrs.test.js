/**
 * Enumerated attributes carry a two-word vocabulary, and absence means
 * "inherit the default" rather than "off".
 *
 * That is the whole reason these need their own handling: removing `spellcheck`
 * does not disable spellcheck, it restores the inherited default, which is ON.
 * So `spellcheck="${false}"` has to write the off-word. The words are not
 * guessable from the name either - translate spells off as "no".
 *
 * Both sinks are covered: a subtree with no interpolation is pre-built by the
 * compiler, and adding a dynamic child routes the same literal through the
 * renderer instead.
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, Component } from '../../lib/framework.js';
import { ENUMERATED_ATTRS } from '../../lib/core/constants.js';

function mount(tag) {
    const el = document.createElement(tag);
    document.body.appendChild(el);
    return el;
}

describe('Enumerated Attributes', function(it) {
    it('an enumerated attribute is matched case-insensitively', () => {
        // HTML attribute names are case-insensitive, and the sink already
        // lowercases the name for every other decision it makes. Indexing the
        // vocabulary with the raw spelling meant <div SPELLCHECK="${false}">
        // missed the enumerated branch entirely, removed the attribute, and so
        // INHERITED spellcheck-on - the exact inversion this file exists for.
        class EaCaseHost extends Component {
            constructor(p) { super(p); this.state = { v: false }; }
            template() { return html`<div id="u" SPELLCHECK="${this.state.v}"></div>`; }
        }
        defineComponent('ea-case-host', EaCaseHost);
        const el = mount('ea-case-host');
        const div = el.querySelector('#u');

        assert.equal(div.getAttribute('spellcheck'), 'false',
            'the off-word was written, not the attribute removed');
        assert.equal(div.spellcheck, false, 'and spellcheck really is off');

        document.body.removeChild(el);
    });

    it('the vocabulary table matches what the DOM actually does', () => {
        // Anti-rot: the table is hand-written, so a browser that disagrees must
        // fail here rather than silently invert a value at a render site.
        for (const [name, { on, off }] of Object.entries(ENUMERATED_ATTRS)) {
            const a = document.createElement('div');
            a.setAttribute(name, on);
            const b = document.createElement('div');
            b.setAttribute(name, off);
            const prop = name === 'contenteditable' ? 'contentEditable' : name;

            assert.equal(String(a[prop]), 'true', `${name}="${on}" should read as on`);
            assert.equal(String(b[prop]), 'false', `${name}="${off}" should read as off`);
        }
    });

    it('${false} writes the off-word instead of removing the attribute', () => {
        class EnumFalse extends Component {
            constructor(props) { super(props); this.state = { off: false }; }
            template() {
                return html`<div>
                    <div id="sc" spellcheck="${this.state.off}"></div>
                    <div id="tr" translate="${this.state.off}"></div>
                    <div id="dr" draggable="${this.state.off}"></div>
                </div>`;
            }
        }
        defineComponent('enum-false', EnumFalse);
        const el = mount('enum-false');

        // The bug this pins: removing the attribute means inherit, and
        // spellcheck/translate both default to ON, so ${false} turned them on.
        assert.equal(el.querySelector('#sc').getAttribute('spellcheck'), 'false',
            '${false} writes spellcheck="false"');
        assert.equal(el.querySelector('#sc').spellcheck, false, 'and the element really is off');
        assert.equal(el.querySelector('#tr').getAttribute('translate'), 'no',
            'translate spells off as "no", not "false"');
        assert.equal(el.querySelector('#tr').translate, false, 'and reads as off');
        assert.equal(el.querySelector('#dr').getAttribute('draggable'), 'false',
            '${false} writes draggable="false"');

        document.body.removeChild(el);
    });

    it('a non-empty string is the vocabulary and passes through untouched', () => {
        class EnumStr extends Component {
            template() {
                return html`<div>
                    <div id="a" spellcheck="${'false'}"></div>
                    <div id="b" translate="${'no'}"></div>
                    <div id="c" draggable="${'xyz'}"></div>
                </div>`;
            }
        }
        defineComponent('enum-str', EnumStr);
        const el = mount('enum-str');

        // Routing these through the property setter is what inverted them: the
        // IDL is a boolean, so any non-empty string coerced to true.
        assert.equal(el.querySelector('#a').getAttribute('spellcheck'), 'false',
            "${'false'} stays the string 'false', not coerced to true");
        assert.equal(el.querySelector('#a').spellcheck, false, 'and reads as off');
        assert.equal(el.querySelector('#b').getAttribute('translate'), 'no', "${'no'} stays 'no'");
        assert.equal(el.querySelector('#c').getAttribute('draggable'), 'xyz',
            'an unrecognised string is passed through, not rewritten');

        document.body.removeChild(el);
    });

    it('nullish declines to specify, so the attribute is removed', () => {
        class EnumNullish extends Component {
            constructor(props) { super(props); this.state = { n: null, u: undefined }; }
            template() {
                return html`<div>
                    <div id="n" spellcheck="${this.state.n}"></div>
                    <div id="u" translate="${this.state.u}"></div>
                </div>`;
            }
        }
        defineComponent('enum-nullish', EnumNullish);
        const el = mount('enum-nullish');

        // Distinct from ${false}: not specifying is what inheriting means.
        assert.equal(el.querySelector('#n').hasAttribute('spellcheck'), false,
            'null removes the attribute rather than writing a word');
        assert.equal(el.querySelector('#u').hasAttribute('translate'), false,
            'undefined removes it too');

        document.body.removeChild(el);
    });

    it('other values coerce onto the vocabulary', () => {
        class EnumCoerce extends Component {
            template() {
                return html`<div>
                    <div id="t" spellcheck="${true}"></div>
                    <div id="z" spellcheck="${0}"></div>
                    <div id="e" spellcheck="${''}"></div>
                    <div id="o" translate="${true}"></div>
                </div>`;
            }
        }
        defineComponent('enum-coerce', EnumCoerce);
        const el = mount('enum-coerce');

        assert.equal(el.querySelector('#t').getAttribute('spellcheck'), 'true', '${true} is on');
        assert.equal(el.querySelector('#z').getAttribute('spellcheck'), 'false', '${0} is falsy, so off');
        assert.equal(el.querySelector('#e').getAttribute('spellcheck'), '',
            "${''} is a string and passes through, matching a valueless attribute");
        assert.equal(el.querySelector('#o').getAttribute('translate'), 'yes',
            "${true} uses this attribute's own on-word");

        document.body.removeChild(el);
    });

    it('a valueless attribute is the empty string, not its own name', () => {
        class BareAttr extends Component {
            template() {
                return html`<div>
                    <div id="a" class contenteditable></div>
                    <div id="b" class contenteditable>${''}</div>
                </div>`;
            }
        }
        defineComponent('bare-attr', BareAttr);
        const el = mount('bare-attr');

        for (const id of ['a', 'b']) {
            const node = el.querySelector('#' + id);
            // `<div class>` used to render class="class", adding a CSS class
            // literally named "class". Invisible on real boolean attributes,
            // which is why it survived.
            assert.equal(node.getAttribute('class'), '',
                `bare class is the empty string (${id === 'a' ? 'static' : 'dynamic'} subtree)`);
            assert.equal(node.isContentEditable, true,
                `bare contenteditable actually makes the element editable (${id})`);
        }

        document.body.removeChild(el);
    });

    it('nullish is never stringified into the DOM on an unregistered tag', () => {
        class NullishTag extends Component {
            constructor(props) { super(props); this.state = { u: undefined, n: null }; }
            template() {
                return html`<div>
                    <not-a-component id="${this.state.u}"></not-a-component>
                    <not-a-component spellcheck="${this.state.n}"></not-a-component>
                </div>`;
            }
        }
        defineComponent('nullish-tag', NullishTag);
        const el = mount('nullish-tag');
        const [first, second] = el.querySelectorAll('not-a-component');

        // These went through the inherited HTMLElement property: el.id =
        // undefined stringifies to "undefined", and el.spellcheck = null
        // reflects the attribute "false" - both the opposite of "unspecified".
        assert.equal(first.hasAttribute('id'), false, '${undefined} does not write id="undefined"');
        assert.equal(second.hasAttribute('spellcheck'), false,
            '${null} does not write spellcheck="false"');

        document.body.removeChild(el);
    });
});
