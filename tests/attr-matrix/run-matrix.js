/**
 * Walks the cross product and reports disagreements. See matrix.js for the
 * contract being checked and why the two halves have different oracles.
 *
 * Attributes are paired only with elements they actually exist on. Testing
 * `disabled` on a <div> generates cells with no meaning, and they drown the
 * findings that matter.
 */

import { classify, ruleFor, renderCell, cellTemplate, parserOracle, readIdl, sameFor } from './matrix.js';

/* -------------------------------------------------------------------- axes */

const SVG_NS = 'http://www.w3.org/2000/svg';

// attr -> the native elements it is meaningful on.
const ATTR_SPEC = [
    { attr: 'disabled',        class: 'html-boolean',   tags: ['button', 'input', 'select'] },
    { attr: 'readonly',        class: 'html-boolean',   tags: ['input', 'textarea'] },
    { attr: 'required',        class: 'html-boolean',   tags: ['input'] },
    { attr: 'multiple',        class: 'html-boolean',   tags: ['select'] },
    { attr: 'checked',         class: 'html-boolean',   tags: ['input'] },
    { attr: 'hidden',          class: 'global-boolean', tags: ['div', 'span'] },
    { attr: 'inert',           class: 'global-boolean', tags: ['div'] },
    { attr: 'autofocus',       class: 'global-boolean', tags: ['input', 'div'] },
    { attr: 'itemscope',       class: 'global-boolean', tags: ['div'] },
    { attr: 'spellcheck',      class: 'enumerated',     tags: ['div', 'input'] },
    { attr: 'draggable',       class: 'enumerated',     tags: ['div'] },
    { attr: 'translate',       class: 'enumerated',     tags: ['div'] },
    { attr: 'contenteditable', class: 'enumerated',     tags: ['div'] },
    { attr: 'autocapitalize',  class: 'enumerated',     tags: ['div'] },
    { attr: 'id',              class: 'ordinary',       tags: ['div'] },
    { attr: 'title',           class: 'ordinary',       tags: ['div'] },
    { attr: 'placeholder',     class: 'ordinary',       tags: ['input'] },
    { attr: 'aria-hidden',     class: 'aria',           tags: ['div'] },
    { attr: 'aria-label',      class: 'aria',           tags: ['div'] },
    { attr: 'data-x',          class: 'data',           tags: ['div'] },
    { attr: 'class',           class: 'special',        tags: ['div'] },
    { attr: 'style',           class: 'special',        tags: ['div'] },
    { attr: 'value',           class: 'form-value',     tags: ['input'] }
];

// Non-native element kinds. Every attribute is tried on these, since on a
// component a name is just a prop name and on SVG the question is namespace
// handling rather than per-element validity.
const OTHER_KINDS = [
    { id: 'component',    tag: 'am-probe',  wrap: null,  ns: null },
    { id: 'unregistered', tag: 'am-nope',   wrap: null,  ns: null },
    { id: 'svg',          tag: 'rect',      wrap: 'svg', ns: SVG_NS },
    { id: 'svg-hyphen',   tag: 'my-thing',  wrap: 'svg', ns: SVG_NS }
];

const OTHER_ATTRS = ['disabled', 'hidden', 'spellcheck', 'draggable', 'translate',
                     'id', 'class', 'style', 'aria-hidden', 'data-x', 'value'];

const INTERP = [
    { label: '${true}',      value: true },
    { label: '${false}',     value: false },
    { label: '${null}',      value: null },
    { label: '${undefined}', value: undefined },
    { label: "${''}",        value: '' },
    { label: "${'false'}",   value: 'false' },
    { label: "${'true'}",    value: 'true' },
    { label: "${'no'}",      value: 'no' },
    { label: "${'xyz'}",     value: 'xyz' },
    { label: '${0}',         value: 0 },
    { label: '${1}',         value: 1 }
];

const LITERAL = [null, '', 'true', 'false', 'no', 'xyz'];

// `style` needs values that are actually CSS. VDX routes a string style through
// cssText, which silently drops anything invalid - feeding it 'xyz' measures
// CSS validity, not the attribute contract.
const STYLE_INTERP = [
    { label: '${true}',            value: true },
    { label: '${false}',           value: false },
    { label: '${null}',            value: null },
    { label: '${undefined}',       value: undefined },
    { label: "${''}",              value: '' },
    { label: "${'color: red'}",    value: 'color: red' },
    { label: "${'margin: 0px'}",   value: 'margin: 0px' }
];
const STYLE_LITERAL = [null, '', 'color: red'];

/* ----------------------------------------------------------------- helpers */

function esc(s) { return String(s).replace(/"/g, '&quot;'); }

/**
 * The observable that matters. Where an attribute reflects to an IDL property,
 * behaviour is the property - the attribute text can differ harmlessly (VDX
 * normalises a literal boolean to ""). Where it does not reflect, or reflects
 * to an object (style), the attribute text is the observable.
 */
function observable(el, attr, cls) {
    if (attr === 'style' || attr === 'class') return { via: 'attr', value: el.getAttribute(attr) };
    const idl = readIdl(el, attr);
    if (idl.has && idl.value !== '<object>' && idl.value !== '<function>') {
        return { via: 'idl', value: idl.value };
    }
    // Nothing to read. For an attribute whose meaning IS presence, the text is
    // not the observable - <div itemscope="false"> is an item scope - so
    // comparing text made VDX's deliberate normalisation to "" look like a
    // disagreement with the parser on every literal cell.
    if (cls && cls.kind === 'presence') return { via: 'presence', value: el.hasAttribute(attr) };
    return { via: 'attr', value: el.getAttribute(attr) };
}

/** Read exactly the channel the rule expressed an opinion about. */
function channelRead(el, attr, channel) {
    if (!el) return { via: 'missing', value: undefined };
    if (channel === 'prop') {
        let p = el.props ? el.props[attr] : undefined;
        if (typeof p === 'object' && p !== null) p = '<object>';
        if (typeof p === 'function') p = '<function>';
        return { via: 'prop', value: p };
    }
    if (channel === 'presence') {
        return { via: 'presence', value: el.hasAttribute(attr) };
    }
    if (channel === 'idl') {
        // class and style reflect to objects (SVGAnimatedString,
        // CSSStyleDeclaration), so the attribute text is the only readable
        // observable for them.
        const v = readIdl(el, attr).value;
        if (v === '<object>' || v === '<function>' || attr === 'class' || attr === 'style') {
            return { via: 'attr', value: el.getAttribute(attr) };
        }
        return { via: 'idl', value: v };
    }
    return { via: 'attr', value: el.getAttribute(attr) };
}

function findEl(host, kind) {
    const sel = kind.wrap ? `${kind.wrap} ${kind.tag}` : kind.tag;
    return host.querySelector(sel);
}

function show(v) { return JSON.stringify(v === undefined ? '<undefined>' : v); }

/* -------------------------------------------------------------------- run */

export function runMatrix() {
    const rows = [];
    const classifications = [];
    let cells = 0, noOpinion = 0;

    const jobs = [];
    for (const spec of ATTR_SPEC) {
        for (const tag of spec.tags) {
            jobs.push({ kindId: 'native', tag, wrap: null, ns: null, attr: spec.attr, class: spec.class });
        }
    }
    for (const k of OTHER_KINDS) {
        for (const attr of OTHER_ATTRS) {
            const spec = ATTR_SPEC.find(s => s.attr === attr);
            jobs.push({ kindId: k.id, tag: k.tag, wrap: k.wrap, ns: k.ns, attr, class: spec ? spec.class : '?' });
        }
    }

    for (const job of jobs) {
        const kind = { id: job.kindId, tag: job.tag, wrap: job.wrap, ns: job.ns };
        // Host-applied names must be classified against a NATIVE element. A
        // component declaring `hidden` or `spellcheck` as a prop installs its
        // own accessor, which shadows the DOM one and makes the probe read the
        // attribute back as a free string.
        const classifyTag = (job.kindId === 'component' || job.kindId === 'unregistered')
            ? 'div' : job.tag;
        const classifyNs = (classifyTag === 'div') ? null : job.ns;
        const c = classify(classifyTag, job.attr, classifyNs);
        classifications.push({
            kind: job.kindId, tag: job.tag, attr: job.attr, class: job.class,
            domKind: c.kind, offValue: c.offValue, defaultIdl: c.defaultIdl
        });

        /* ---- interpolated: the rule ------------------------------------ */
        for (const v of (job.attr === 'style' ? STYLE_INTERP : INTERP)) {
            cells++;
            const open = (kind.wrap ? `<${kind.wrap}>` : '') + `<${kind.tag} ${job.attr}="`;
            const close = `"></${kind.tag}>` + (kind.wrap ? `</${kind.wrap}>` : '');

            let got, threw = null, lastEl = null, host = null;
            try {
                host = renderCell(cellTemplate(open, close, v.value, true));
                lastEl = findEl(host, kind);
                got = lastEl ? observable(lastEl, job.attr, c) : { via: 'missing', value: undefined };
            } catch (e) { threw = e.message; got = { via: 'threw', value: e.message }; }

            const checks = ruleFor(kind.id === 'component' ? 'component' : 'native', job.attr, c, v, kind.ns);
            if (!checks) { noOpinion++; if (host) host.remove(); continue; }

            for (const chk of checks) {
                // Read the SAME channel the rule speaks about. Comparing an
                // expected attribute against a measured IDL property (or the
                // reverse) manufactures disagreements that are not there.
                const measured = (threw || !lastEl)
                    ? got
                    : channelRead(lastEl, job.attr, chk.channel);
                if (threw || !sameFor(job.attr, measured.value, chk.value)) {
                    rows.push({
                        kind: job.kindId, tag: job.tag, attr: job.attr, class: job.class,
                        domKind: c.kind, source: v.label, oracle: 'rule',
                        got: `${measured.via}=${show(measured.value)}`,
                        want: `${chk.channel}=${show(chk.value)}`
                    });
                }
            }
            if (host) host.remove();
        }

        /* ---- literal: the HTML parser is the oracle --------------------- */
        if (kind.id === 'component' || kind.id === 'unregistered') continue;
        for (const lit of (job.attr === 'style' ? STYLE_LITERAL : LITERAL)) {
            cells++;
            const attrText = lit === null ? job.attr : `${job.attr}="${esc(lit)}"`;
            const markup = (kind.wrap ? `<${kind.wrap}>` : '') +
                `<${kind.tag} ${attrText}></${kind.tag}>` +
                (kind.wrap ? `</${kind.wrap}>` : '');

            let got;
            try {
                const host = renderCell(cellTemplate(markup, '', null, false));
                const el = findEl(host, kind);
                got = el ? observable(el, job.attr, c) : { via: 'missing', value: undefined };
                host.remove();
            } catch (e) { got = { via: 'threw', value: e.message }; }

            const sel = kind.wrap ? `${kind.wrap} ${kind.tag}` : kind.tag;
            const refEl = (() => {
                const d = document.createElement('div');
                d.innerHTML = markup;
                return d.querySelector(sel);
            })();
            if (!refEl) continue;
            const ref = observable(refEl, job.attr, c);

            if (!sameFor(job.attr, got.value, ref.value)) {
                rows.push({
                    kind: job.kindId, tag: job.tag, attr: job.attr, class: job.class,
                    domKind: c.kind,
                    source: lit === null ? '<bare>' : `="${lit}"`,
                    oracle: 'parser',
                    got: `${got.via}=${show(got.value)}`,
                    want: `${ref.via}=${show(ref.value)}`
                });
            }
        }
    }

    return { cells, noOpinion, rows, classifications };
}
