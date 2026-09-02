/**
 * Attribute-contract matrix: MEASUREMENT ONLY.
 *
 * Enumerates the cross product of element kind x attribute x value source and
 * reports, per cell, what VDX produced against what the contract says it should
 * produce. It changes nothing in lib/ and asserts nothing - the output is a
 * triage list to rule on, because for interpolated values the contract is a
 * design opinion, not a fact anyone can look up.
 *
 * Two different questions, two different sources of truth:
 *
 *   literal template text  - VDX defines this as HTML source, so the HTML parser
 *                            IS the oracle. Built with ref.innerHTML and compared
 *                            directly. Nothing is transcribed.
 *   interpolated ${} value - a design decision (see RULE below). The matrix can
 *                            only show completeness and self-consistency here;
 *                            correctness is a ratification question.
 *
 * How an attribute spells "off" is derived from the live DOM rather than from a
 * hand-kept list, so names nobody enumerated are covered and a browser change
 * shows up as a classification diff instead of silence.
 */

import { defineComponent, html, Component } from '/lib/framework.js';

/* ---------------------------------------------------------------- IDL names */

// Attribute name -> IDL property, where they differ. Anything absent is assumed
// to reflect under its own name.
const IDL_NAME = {
    'readonly': 'readOnly',
    'class': 'className',
    'for': 'htmlFor',
    'contenteditable': 'contentEditable',
    'tabindex': 'tabIndex',
    'itemscope': 'itemScope',
    'maxlength': 'maxLength',
    'rowspan': 'rowSpan',
    'colspan': 'colSpan',
    'accesskey': 'accessKey',
    'crossorigin': 'crossOrigin',
    'datetime': 'dateTime',
    'novalidate': 'noValidate',
    'autocomplete': 'autocomplete'
};

function idlName(attr) {
    return IDL_NAME[attr] || attr;
}

function readIdl(el, attr) {
    const p = idlName(attr);
    if (!(p in el)) return { has: false, value: undefined };
    let v;
    try { v = el[p]; } catch { return { has: true, value: '<throws>' }; }
    if (typeof v === 'object' && v !== null) v = '<object>';
    if (typeof v === 'function') v = '<function>';
    return { has: true, value: v };
}

/* ------------------------------------------------- empirical classification */

// Probed as PAIRS, never independently. An invalid value falls back to the
// attribute's default, so for translate (which defaults to on) the word 'true'
// reads as the on-word when it is really just invalid. Requiring one word to
// produce true AND its partner to produce false removes the ambiguity.
const VOCAB_PAIRS = [['true', 'false'], ['yes', 'no'], ['on', 'off']];

/**
 * How does this attribute behave on this element, according to the DOM itself?
 *
 *   presence - any value means ON; only removal turns it off (a real HTML
 *              boolean attribute: disabled, hidden, ...)
 *   value    - the attribute carries a literal off-value; REMOVING it does not
 *              mean off, it means "inherit the default", which is why
 *              spellcheck="${false}" currently turns spellcheck ON
 *   plain    - no boolean-ish reflection at all
 */
function classify(tag, attr, ns) {
    const make = () => ns
        ? document.createElementNS(ns, tag)
        : document.createElement(tag);

    const bare = make();
    const idl = readIdl(bare, attr);
    if (!idl.has || idl.value === '<object>' || idl.value === '<function>') {
        return { kind: 'plain', hasIdl: idl.has, offValue: null, defaultIdl: idl.value };
    }
    const defaultIdl = idl.value;

    // Free-string test FIRST. An arbitrary value that survives the round trip
    // means the attribute has no vocabulary of its own - it is a plain string
    // slot. Without this, `id="false"` reads back the string "false" and looks
    // exactly like an enumerated attribute spelling its own off-value.
    const nonsense = make();
    nonsense.setAttribute(attr, 'zzqq');
    if (readIdl(nonsense, attr).value === 'zzqq') {
        return { kind: 'plain', hasIdl: true, offValue: null, defaultIdl };
    }

    // Presence: any value means on, only removal means off.
    const present = make();
    present.setAttribute(attr, '');
    if (readIdl(present, attr).value === true && defaultIdl === false) {
        return { kind: 'presence', hasIdl: true, offValue: null, defaultIdl };
    }

    // Enumerated: find the on/off word pair this attribute actually speaks.
    for (const [on, off] of VOCAB_PAIRS) {
        const a = make(); a.setAttribute(attr, on);
        const b = make(); b.setAttribute(attr, off);
        const av = readIdl(a, attr).value;
        const bv = readIdl(b, attr).value;
        if ((av === true || av === 'true') && (bv === false || bv === 'false')) {
            return { kind: 'value', hasIdl: true, onValue: on, offValue: off, defaultIdl };
        }
    }
    // Enumerated but with no boolean vocabulary (autocapitalize: none/sentences/
    // words/characters). Treated as plain: strings pass through, and whatever
    // the DOM does with an invalid one is the DOM's business, not VDX's.
    return { kind: 'plain', hasIdl: true, offValue: null, onValue: null, defaultIdl };
}

/* ------------------------------------------------------------------ the rule */

/**
 * THE CONTRACT (ratified).
 *
 * Native elements - "what would a VDX component do, given what this DOM node
 * means?"
 *
 *   pure boolean (presence) - plain JS Boolean coercion. A non-empty string is
 *       truthy, so disabled="${'false'}" is disabled; ${0} and ${''} are off.
 *   enumerated (value-typed) - nullish means "do not set the attribute" (the
 *       node keeps its inherited/default behaviour). A string passes through
 *       verbatim, because the string IS that attribute's own vocabulary.
 *       Anything else coerces onto the attribute's on/off words.
 *   plain - nullish removes; null/undefined are NEVER stringified into the DOM.
 *
 * VDX components - the prop is the contract, the attribute is only a devtools
 * hint. The ${} value reaches the component losslessly, always. The attribute
 * mirrors it only when it is a string; a non-string shows no attribute, because
 * a lossy string form in the DOM would be worse than looking at the node.
 * `class` and `style` are carved out: they affect the host element rather than
 * informing the component, so they are not ordinary props.
 *
 * Returns a list of {channel, value} checks, or null for "no opinion".
 */
// Names that act on the HOST element rather than informing the component, so
// they keep DOM semantics instead of the lossless-prop contract: class/style
// (styling), aria-*/data-* (accessibility tree and CSS/test hooks, both
// string-typed by nature), and the global booleans, which must still hide or
// disable a component that has not registered yet.
const HOST_GLOBAL_BOOLEANS = new Set(['hidden', 'itemscope', 'autofocus', 'inert']);
function isHostApplied(attr) {
    return attr === 'class' || attr === 'style' ||
        attr.startsWith('aria-') || attr.startsWith('data-') ||
        HOST_GLOBAL_BOOLEANS.has(attr) || attr in ENUMERATED_NAMES;
}
// Enumerated attributes act on the host as well: a contenteditable custom
// element really is editable, so they follow DOM semantics everywhere.
const ENUMERATED_NAMES = { spellcheck: 1, draggable: 1, translate: 1, contenteditable: 1 };

function ruleFor(kind, attr, cls, v) {
    const val = v.value;

    if (kind === 'component' || kind === 'unregistered') {
        if (isHostApplied(attr)) {
            // Falls through to the native rules below: these act on the host
            // element, so they mean the same thing on a component as anywhere.
        } else {
            const checks = [{ channel: 'attr', value: typeof val === 'string' ? val : null }];
            // An unregistered tag has no component behind it yet, so there is
            // no prop to check - only the attribute it will read on upgrade.
            if (kind === 'component') checks.unshift({ channel: 'prop', value: val });
            return checks;
        }
    }

    if (cls.kind === 'presence') {
        return [{ channel: 'idl', value: Boolean(val) }];
    }

    if (cls.kind === 'value') {
        if (val === null || val === undefined) return [{ channel: 'attr', value: null }];
        // Every string is this attribute's own vocabulary and passes through,
        // '' included: a valueless attribute parses to '', and for
        // contenteditable that means ON. Coercing it would also split the two
        // sinks, since the compiler's static path writes literals untouched.
        if (typeof val === 'string') return [{ channel: 'attr', value: val }];
        const word = Boolean(val) ? cls.onValue : cls.offValue;
        return word === null ? null : [{ channel: 'attr', value: word }];
    }

    // plain
    if (val === null || val === undefined) return [{ channel: 'attr', value: null }];
    if (typeof val === 'string' || typeof val === 'number') {
        // Compare the attribute VDX wrote, not the DOM's normalisation of it -
        // autocapitalize="xyz" reflecting as "sentences" is the DOM rejecting an
        // invalid value, not VDX getting it wrong. The exception is a form
        // control, where the property is live state and the attribute is only
        // the default.
        const live = FORM_LIVE.has(attr) && cls.hasIdl;
        return [{ channel: live ? 'idl' : 'attr', value: String(val) }];
    }
    return null;
}

const FORM_LIVE = new Set(['value', 'checked']);

/* ---------------------------------------------------------------- rendering */

let CURRENT = null;

class AmCell extends Component {
    template() { return CURRENT(); }
}
defineComponent('am-cell', AmCell);

// Every attribute the matrix tries must be a declared prop, or it never
// reaches props and every component cell reports undefined.
const PROBE_PROPS = ['disabled', 'hidden', 'spellcheck', 'draggable', 'translate',
                     'id', 'class', 'style', 'aria-hidden', 'data-x', 'value'];

class AmProbe extends Component {
    static props = PROBE_PROPS.reduce((acc, n) => { acc[n] = null; return acc; }, {});
    template() { return html`<i></i>`; }
}
defineComponent('am-probe', AmProbe);

function renderCell(factory) {
    CURRENT = factory;
    const host = document.createElement('am-cell');
    document.body.appendChild(host);
    return host;
}

/** Build a compiled template for one cell, bypassing the tagged-literal form. */
function cellTemplate(open, close, value, hasInterp) {
    if (!hasInterp) {
        const strings = [open + close];
        return () => html(strings);
    }
    const strings = [open, close];
    return () => html(strings, value);
}

/* ------------------------------------------------------------------ oracle */

/** What the HTML parser makes of the identical literal markup. */
function parserOracle(markup, sel, attr) {
    const ref = document.createElement('div');
    ref.innerHTML = markup;
    const el = sel ? ref.querySelector(sel) : ref.firstElementChild;
    if (!el) return null;
    return {
        attr: el.getAttribute(attr),
        idl: readIdl(el, attr).value
    };
}

export { classify, ruleFor, renderCell, cellTemplate, parserOracle, readIdl, idlName };
