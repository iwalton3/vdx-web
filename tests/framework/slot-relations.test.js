/**
 * Metamorphic relation over slot values: contain(() => v) == v.
 *
 * Ordinary slots and containment classify the value they are handed in two
 * separate dispatchers (instantiateSlot), and the structural review found them
 * disagreeing on raw(). This does not say what any value should render as - it
 * says both dispatchers must say the same thing, for every kind of value a
 * slot can legally hold.
 *
 * Kinds listed in KNOWN_DIVERGENT are asserted to diverge TODAY, so the fix
 * that unifies the dispatchers is told to delete the entry rather than leaving
 * a stale exemption behind.
 */

import { describe, assert } from './test-runner.js';
import { defineComponent, html, raw, when, each, contain, Component, flushSync } from '../../lib/framework.js';

// Value factories, not values: a Node can be inserted once, and an html``
// result is consumed by the render that receives it.
const KINDS = {
    'string':            () => 'text',
    'string with markup': () => '<b>esc</b>',
    'empty string':      () => '',
    'number 0':          () => 0,
    'number':            () => 42,
    'true':              () => true,
    'false':             () => false,
    'null':              () => null,
    'undefined':         () => undefined,
    'html':              () => html`<b>H</b>`,
    'raw':               () => raw('<b>R</b>'),
    'text node':         () => document.createTextNode('T'),
    'element':           () => Object.assign(document.createElement('u'), { textContent: 'E' }),
    'fragment':          () => {
        const f = document.createDocumentFragment();
        f.append(document.createElement('s'), document.createTextNode('F'));
        return f;
    },
    'array of strings':  () => ['a', 'b'],
    'array of raw':      () => [raw('<b>r1</b>'), raw('<b>r2</b>')],
    'when true':         () => when(true, () => html`<em>W</em>`),
    'when false':        () => when(false, () => html`<em>W</em>`),
    'each':              () => each([1, 2], i => html`<li>${i}</li>`),
    'nested contain':    () => contain(() => 'inner'),
    'object':            () => ({ a: 1 })
    // Not listed: an array holding html`` results is banned in an ordinary
    // slot (t8-list-control), and a bare function in text position has no
    // meaning (function-valued slots are for prop positions). A banned or
    // meaningless value has no behaviour to relate.
};

// kind -> why the two sides differ today. The containment dispatcher handles
// a Node inside an ARRAY (template-renderer.js, "Handle arrays") but
// stringifies a bare one, and does not unwrap a contain() marker its own
// render function returned. Scheduled for the value-classifier unification
// (STRUCTURAL-REFACTORING-REVIEW.md item 6). A passing kind here means that
// work landed - remove the entry.
const KNOWN_DIVERGENT = {
    'text node':      'containment stringifies a bare Node to "[object Text]"',
    'element':        'containment stringifies a bare Node to "[object HTMLElement]"',
    'fragment':       'containment stringifies a bare Node to "[object DocumentFragment]"',
    'nested contain': 'containment renders a nested contain() marker as nothing'
};

let CURRENT = null;
class SrPlain extends Component {
    tpl = CURRENT;
    template() { return html`<div class="p">${this.tpl()}</div>`; }
}
class SrContain extends Component {
    tpl = CURRENT;
    template() { return html`<div class="p">${contain(() => this.tpl())}</div>`; }
}
defineComponent('sr-plain', SrPlain);
defineComponent('sr-contain', SrContain);

async function render(tag, factory) {
    CURRENT = factory;
    const host = document.createElement(tag);
    let threw = null;
    try {
        document.body.appendChild(host);
        flushSync(() => {});
        await new Promise(r => requestAnimationFrame(r));
    } catch (e) { threw = e.message; }
    const out = threw ? `threw: ${threw}` : host.querySelector('.p').innerHTML;
    host.remove();
    return out;
}

describe('Slot Relations', function(it) {
    for (const [kind, factory] of Object.entries(KINDS)) {
        it(`contain(() => v) == v for ${kind}`, async () => {
            const plain = await render('sr-plain', factory);
            const contained = await render('sr-contain', factory);
            if (KNOWN_DIVERGENT[kind]) {
                assert.notEqual(contained, plain,
                    `${kind} agrees now - delete its KNOWN_DIVERGENT entry (${KNOWN_DIVERGENT[kind]})`);
            } else {
                assert.equal(contained, plain, `contain() must render ${kind} the way a plain slot does`);
            }
        });
    }
});
