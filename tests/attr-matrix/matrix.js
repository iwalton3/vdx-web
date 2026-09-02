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

const OFF_CANDIDATES = ['false', 'no', 'off'];

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

    // Enumerated: constrained vocabulary. Find how it spells off, if it can.
    let offValue = null;
    for (const cand of OFF_CANDIDATES) {
        const el = make();
        el.setAttribute(attr, cand);
        const v = readIdl(el, attr).value;
        if (v === false || v === 'false') { offValue = cand; break; }
    }
    return { kind: offValue === null ? 'plain' : 'value', hasIdl: true, offValue, defaultIdl };
}

/* ------------------------------------------------------------------ the rule */

/**
 * THE CONTRACT, stated as opinion rather than borrowed from another framework.
 *
 *   literal text   -> HTML source; the parser decides (handled by the oracle).
 *   ${null/undef}  -> off / absent.
 *   ${true}        -> ON, however this attribute spells on.
 *   ${false}       -> OFF, however this attribute spells off. For a `value`-kind
 *                     attribute that is the literal off-value, NOT removal:
 *                     removal means inherit, which is the opposite of what the
 *                     author wrote. This is the opinionated clause.
 *   ${'' , 0}      -> falsy JS value, so off, same as ${false}.
 *   ${string|num}  -> that literal value, set as an attribute. Never routed
 *                     through a property setter that coerces it.
 *
 * On a component every name is an ordinary prop name and nothing is coerced.
 *
 * Returns { idl } where the attribute reflects (behaviour is what matters, not
 * the attribute text), { attr } where it does not, or **null for "no opinion"** -
 * a cell the contract genuinely does not speak to. Those are counted separately
 * rather than guessed at, because a guessed expectation is noise in a triage
 * list.
 */
function ruleFor(kind, attr, cls, v) {
    if (kind === 'component') {
        return { prop: v.value };
    }

    const val = v.value;
    const flag = cls.kind === 'presence' || cls.kind === 'value';

    if (val === null || val === undefined) {
        return flag ? { idl: offIdl(cls) } : { attr: null };
    }

    if (flag) {
        if (val === true) return { idl: onIdl(cls) };
        if (val === false || val === '' || val === 0) return { idl: offIdl(cls) };

        // A non-empty string or number aimed at a flag. For a value-kind
        // attribute the string IS that attribute's own vocabulary, so it must
        // land verbatim - this is exactly where a coercing property setter
        // turns 'false' into true. For a presence attribute the author is
        // passing a value to something that only understands present/absent,
        // and the contract does not say which reading wins: no opinion.
        if (cls.kind === 'value') return { attr: String(val) };
        return null;
    }

    if (typeof val === 'string' || typeof val === 'number') {
        // Where a plain attribute reflects, behaviour lives in the property -
        // a form control's `value` deliberately sets the property and leaves
        // the attribute (the *default* value) alone, and comparing attribute
        // text there would report that correct behaviour as a defect.
        return cls.hasIdl ? { idl: String(val) } : { attr: String(val) };
    }
    return null;
}

/** The IDL reading that means "on" / "off" for a classified flag attribute. */
function onIdl(cls) {
    return typeof cls.defaultIdl === 'string' ? 'true' : true;
}
function offIdl(cls) {
    return typeof cls.defaultIdl === 'string' ? 'false' : false;
}

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
