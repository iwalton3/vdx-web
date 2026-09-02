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

import { defineComponent, html, Component, flushSync } from '/lib/framework.js';

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
 * Boolean in the HTML spec, but exposing no IDL property in this browser - so
 * the probe below has nothing to read and would call them plain.
 *
 * That is the probe's blind spot, not a fact about the attribute. Presence is
 * what a boolean content attribute MEANS (HTML §2.3.2, "Boolean attributes"),
 * so `<div itemscope="false">` is an item scope and the attribute's text
 * carries nothing. Chrome ships no microdata IDL, hence no `itemScope`.
 *
 * Stated rather than derived because there is no DOM probe for it: a browser
 * with no reflection cannot tell us the attribute is boolean. Every other
 * classification on this page is measured.
 */
const SPEC_BOOLEAN_NO_IDL = new Set(['itemscope']);

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
    if (SPEC_BOOLEAN_NO_IDL.has(attr)) {
        return { kind: 'presence', hasIdl: idl.has, offValue: null, defaultIdl: idl.value };
    }
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

// Shared by ruleFor (object-form style) and the comparator below.
const CSS_SCRATCH = document.createElement('div');

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

/**
 * The check for an attribute whose meaning is presence.
 *
 * Where it reflects, the IDL property IS the behaviour and the attribute text
 * may differ harmlessly (VDX normalises a literal to ""). Where it does not
 * reflect, presence is the only thing carrying meaning, so comparing text
 * would measure punctuation.
 */
function presenceCheck(cls, val) {
    return cls.hasIdl
        ? { channel: 'idl', value: Boolean(val) }
        : { channel: 'presence', value: Boolean(val) };
}

/**
 * Global booleans keep HTML presence semantics in SVG too.
 *
 * `isBooleanAttr()` tests GLOBAL_BOOLEAN_ATTRS *before* its notHtmlElement
 * guard (constants.js), deliberately, so a component that has not registered
 * yet is still hideable. The DOM probe cannot see this - SVGElement has no
 * `hidden` IDL, so classify() calls it plain and every SVG cell disagrees.
 *
 * Restated here rather than imported from lib/: an oracle that reads the
 * implementation agrees with it by construction. If the two drift apart, that
 * shows up as a row, which is the point.
 *
 * Under review - deleting the early return collapses these cells but takes
 * hidden-on-a-component with it. See "Candidates for deletion" in
 * docs/tasklists/ATTR-CONTRACT-HANDOFF.md.
 */
const GLOBAL_BOOLEANS_IN_SVG = new Set(['hidden', 'itemscope', 'autofocus', 'inert']);

function ruleFor(kind, attr, cls, v, ns) {
    const val = v.value;

    if (ns && GLOBAL_BOOLEANS_IN_SVG.has(attr)) {
        return [presenceCheck(cls, val)];
    }

    if (kind === 'component' || kind === 'unregistered') {
        if (isHostApplied(attr)) {
            // Falls through to the native rules below: these act on the host
            // element, so they mean the same thing on a component as anywhere.
        } else {
            const checks = [{ channel: 'attr', value: typeof val === 'string' ? val : null }];
            // An unregistered tag has no component behind it yet, so there is
            // no prop to check - only the attribute it will read on upgrade.
            if (kind === 'component') {
                // A function prop is WRAPPED, deliberately: the child gets one
                // stable handler identity across renders while the wrapper
                // dispatches to whatever the slot currently holds
                // (component.js:1077-1110). Identity is therefore the wrong
                // question; whether a call reaches the real function is the
                // right one.
                checks.unshift(typeof val === 'function'
                    ? { channel: 'prop-call', value: FN_SENTINEL }
                    : { channel: 'prop', value: val });
            }
            return checks;
        }
    }

    if (cls.kind === 'presence') {
        return [presenceCheck(cls, val)];
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

    // Object-form style is the documented way to set styles, and the failure
    // mode is real - an object that misses this branch reaches the DOM as
    // "[object Object]". The expected text is built by the DOM from the same
    // object, so this asserts the declarations ARRIVED; it cannot check our
    // spelling of cssText, and is not meant to.
    if (attr === 'style' && val !== null && typeof val === 'object') {
        CSS_SCRATCH.style.cssText = '';
        Object.assign(CSS_SCRATCH.style, val);
        return [{ channel: 'attr', value: CSS_SCRATCH.style.cssText }];
    }

    // plain
    if (val === null || val === undefined) {
        // A form control's live value does not track its value attribute, so
        // removing the attribute is not enough: the old text stays on screen
        // and reachable through el.value. Nullish means empty for HTML, and
        // the property is the observable here for the same reason it is for a
        // string below - checking only the attribute passes whatever is left
        // in the field.
        if (FORM_LIVE.has(attr) && cls.hasIdl) return [{ channel: 'idl', value: '' }];
        return [{ channel: 'attr', value: null }];
    }
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

// What the matrix's ${function} value returns when called. The prop is a
// wrapper, so the only way to ask "did the real function arrive" is to call it.
const FN_SENTINEL = 'vdx-fn-probe';
function probeFn() { return FN_SENTINEL; }

/* -------------------------------------------------------------- comparator */

/**
 * Round-trip a style value through a real declaration block.
 *
 * VDX assigns `el.style.cssText = value` verbatim; the trailing ';' and the
 * property re-casing that come back are the BROWSER's normalisation, not ours.
 * Canonicalising both sides through the same block compares the CSS rather than
 * its punctuation, and a genuinely different declaration still differs.
 */
function canonicalCss(v) {
    if (v === null || v === undefined) return v;
    CSS_SCRATCH.style.cssText = '';
    CSS_SCRATCH.style.cssText = String(v);
    return CSS_SCRATCH.style.cssText;
}

function same(a, b) {
    if (a === null || a === undefined) return b === null || b === undefined;
    // Identity, not text, once either side is an object or a function. The
    // component contract is that the ${} value arrives INTACT, and String()
    // reports every object as '[object Object]' - which would pass whatever
    // actually landed on the prop.
    if (typeof a === 'object' || typeof a === 'function' ||
        typeof b === 'object' || typeof b === 'function') return Object.is(a, b);
    return Object.is(a, b) || String(a) === String(b);
}

/** same(), plus the per-attribute normalisation the DOM applies on its own. */
function sameFor(attr, a, b) {
    if (attr === 'style') return same(canonicalCss(a), canonicalCss(b));
    return same(a, b);
}

/* ---------------------------------------------------------------- rendering */

let CURRENT = null;
let PENDING;

/**
 * The cell host. Its template re-reads `this.state.v` on every render, so
 * writing to it re-renders with a new value in the same template - which is
 * exactly what `<div attr="${this.state.x}">` does in an application, and the
 * only way to reach the UPDATE path (`applyAttribute` and the deferred commit)
 * rather than a fresh initial render.
 *
 * Hand-marking a VALUE_GETTER does not work: the component wraps raw values in
 * getters of its own, and resolveDynamicProp unwraps exactly once - a
 * pre-marked getter arrives at the sink as a function.
 */
class AmCell extends Component {
    // Read from module scope rather than set after construction: a class
    // component's constructor runs on first connect, so there is no instance
    // to assign to between createElement and appendChild.
    state = { v: PENDING };
    template() { return CURRENT(this.state.v); }
}
defineComponent('am-cell', AmCell);

// Only the names the rule actually checks a PROP channel for, which is exactly
// the names that are not host-applied. Declaring a host-applied one installs a
// prototype accessor that shadows the DOM's own - so the probe read `hidden`
// back as a free string and reported two disagreements about its own probe.
// Declaring `hidden`/`class`/`style` as props is a bad idea in real components
// too, and nothing currently warns about it.
const PROBE_PROPS = ['disabled', 'id', 'value'];

class AmProbe extends Component {
    static props = PROBE_PROPS.reduce((acc, n) => { acc[n] = null; return acc; }, {});
    template() { return html`<i></i>`; }
}
defineComponent('am-probe', AmProbe);

function renderCell(factory, value) {
    CURRENT = factory;
    PENDING = value;
    const host = document.createElement('am-cell');
    document.body.appendChild(host);
    return host;
}

/**
 * Build a compiled template for one cell, bypassing the tagged-literal form.
 *
 * The returned factory takes the value from the host's state on each render,
 * so a cell can be re-rendered with a different one. `reactive` is false for
 * the literal half, which has no interpolation to move.
 */
function cellTemplate(open, close, hasInterp) {
    if (!hasInterp) {
        const strings = [open + close];
        return () => html(strings);
    }
    const strings = [open, close];
    return (v) => html(strings, v);
}

/**
 * Push a new value through an already-rendered cell and settle the DOM.
 *
 * flushSync drains the effect queue and the deferred attribute commits. It does
 * not synchronously mount a new conditional branch, which is irrelevant here -
 * the element exists already and only its attribute is moving.
 */
function updateCell(host, value) {
    // flushSync takes the mutation as a callback and drains the effect queue
    // and the deferred attribute commits around it. It does not synchronously
    // mount a new conditional branch, which is irrelevant here - the element
    // exists already and only its attribute is moving.
    flushSync(() => { host.state.v = value; });
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

export { classify, ruleFor, renderCell, cellTemplate, updateCell, parserOracle, readIdl, idlName, same, sameFor, probeFn, FN_SENTINEL };
