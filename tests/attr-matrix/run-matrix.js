/**
 * Walks the cross product and reports disagreements. See matrix.js for the
 * contract being checked and why the two halves have different oracles.
 *
 * Attributes are paired only with elements they actually exist on. Testing
 * `disabled` on a <div> generates cells with no meaning, and they drown the
 * findings that matter.
 */

import { classify, ruleFor, renderCell, cellTemplate, updateCell, parserOracle, readIdl, same, sameFor, probeFn } from './matrix.js';
import { runRelations } from './relations.js';
// The SAME resolution the renderer uses - reimplementing it here would let the
// instrument agree with a bug in lib/ by making the identical mistake.
import { kebabToCamel } from '/lib/core/constants.js';

/* -------------------------------------------------------------------- axes */

const SVG_NS = 'http://www.w3.org/2000/svg';

// Kinds whose tag is component-backed rather than a native element.
const COMPONENT_KIND_IDS = new Set(['component', 'component-bare', 'unregistered']);

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
    { attr: 'tabindex',        class: 'ordinary',       tags: ['div'] },
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
    // Three component-backed kinds, differing only in who owns the NAME -
    // which is the predicate applyAttributeDirect actually branches on.
    // am-probe declares every non-host-applied attribute below as a prop;
    // am-bare declares none; am-nope has not registered at all.
    { id: 'component',      tag: 'am-probe', wrap: null,  ns: null },
    { id: 'component-bare', tag: 'am-bare',  wrap: null,  ns: null },
    { id: 'unregistered',   tag: 'am-nope',  wrap: null,  ns: null },
    { id: 'svg',            tag: 'rect',     wrap: 'svg', ns: SVG_NS },
    { id: 'svg-hyphen',     tag: 'my-thing', wrap: 'svg', ns: SVG_NS }
];

// tabindex earns its place: an undeclared name that the DOM does not carry
// under that spelling either (the property is tabIndex), so it has nowhere to
// go but the attribute. Getting that wrong left elements unfocusable, and no
// cell in the old matrix could see it.
const OTHER_ATTRS = ['disabled', 'hidden', 'spellcheck', 'draggable', 'translate',
                     'id', 'title', 'tabindex', 'class', 'style', 'aria-hidden',
                     'data-x', 'value',
                     // Name SHAPES the sink branches on, which the HTML
                     // taxonomy has no way to reach.
                     'onpick', 'from-unit'];

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
    { label: '${1}',         value: 1 },
    // Non-string, non-primitive. The implementation branches on value TYPE -
    // object-form style, and the lossless-prop rule for components - and the
    // taxonomy of HTML attributes has no way to reach that axis.
    { label: '${object}',    value: { a: 1 } },
    { label: '${function}',  value: probeFn }
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
    { label: "${'margin: 0px'}",   value: 'margin: 0px' },
    { label: '${{color:red}}',     value: { color: 'red' } },
    // Two objects in a row, deliberately, and with DISJOINT keys. Only an
    // object following another object reaches the branch that clears the keys
    // the previous one set - and dropping `color` here is the failure that
    // branch exists to prevent.
    { label: '${{margin:0px}}',    value: { margin: '0px' } }
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
    // A template writes the kebab attribute form; the prop keeps its own name.
    const propKey = attr.includes('-') ? kebabToCamel(attr) : attr;
    if (channel === 'prop') {
        // Raw, not tokenised: the contract is that the ${} value arrives
        // intact, and same() compares objects by identity to check exactly
        // that. Tokenising here made every object equal to every other one.
        return { via: 'prop', value: el.props ? el.props[propKey] : undefined };
    }
    if (channel === 'prop-call') {
        const f = el.props ? el.props[propKey] : undefined;
        return { via: 'prop-call', value: typeof f === 'function' ? f() : '<not-callable>' };
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

/**
 * Compare one cell in its current state against the rule, recording any
 * disagreement. Shared by the initial-render and update passes: they differ
 * only in how the element reached this state, and that is precisely the part
 * that must not be written twice.
 *
 * Returns true when the rule had an opinion.
 */
function judge(ctx, label, threw, rows) {
    const { job, kind, c, host, el, oracle } = ctx;
    // The value the template interpolated, not the literal from the table. It
    // arrives through reactive state, which hands back a PROXY for an object -
    // so the raw one is a different reference by design (see "Reactive
    // Proxies" in CLAUDE.md) and comparing against it would report the
    // framework's documented behaviour as a defect.
    const applied = { label, value: host ? host.state.v : undefined };
    const checks = ruleFor(kind.id, job.attr, c, applied, kind.ns);
    if (!checks) return false;

    for (const chk of checks) {
        // Read the SAME channel the rule speaks about. Comparing an expected
        // attribute against a measured IDL property (or the reverse)
        // manufactures disagreements that are not there.
        const measured = (threw || !el)
            ? { via: 'threw', value: threw }
            : channelRead(el, job.attr, chk.channel);
        if (threw || !sameFor(job.attr, measured.value, chk.value, chk.channel)) {
            rows.push({
                kind: job.kindId, tag: job.tag, attr: job.attr, class: job.class,
                domKind: c.kind, source: label, oracle,
                got: `${measured.via}=${show(measured.value)}`,
                want: `${chk.channel}=${show(chk.value)}`
            });
        }
    }
    return true;
}

function findEl(host, kind) {
    const sel = kind.wrap ? `${kind.wrap} ${kind.tag}` : kind.tag;
    return host.querySelector(sel);
}

function show(v) {
    if (v === undefined) return '"<undefined>"';
    if (typeof v === 'function') return '"<function>"';
    if (typeof v === 'object' && v !== null) return '"<object>"';
    return JSON.stringify(v);
}

/* -------------------------------------------------------------------- run */

export function runMatrix() {
    const rows = [];
    const classifications = [];
    let cells = 0, noOpinion = 0;
    // Guards against an update pass that silently stopped updating anything.
    let transitions = 0, moved = 0;

    const jobs = [];
    for (const spec of ATTR_SPEC) {
        for (const tag of spec.tags) {
            jobs.push({ kindId: 'native', tag, wrap: null, ns: null, attr: spec.attr, class: spec.class });
        }
    }
    for (const k of OTHER_KINDS) {
        for (const attr of OTHER_ATTRS) {
            const spec = ATTR_SPEC.find(s => s.attr === attr);
            jobs.push({ kindId: k.id, tag: k.tag, wrap: k.wrap, ns: k.ns, attr, class: spec ? spec.class : '?',
                        registered: k.id === 'component' || k.id === 'component-bare' });
        }
    }

    for (const job of jobs) {
        const kind = { id: job.kindId, tag: job.tag, wrap: job.wrap, ns: job.ns };
        // Host-applied names must be classified against a NATIVE element. A
        // component declaring `hidden` or `spellcheck` as a prop installs its
        // own accessor, which shadows the DOM one and makes the probe read the
        // attribute back as a free string.
        const classifyTag = COMPONENT_KIND_IDS.has(job.kindId) ? 'div' : job.tag;
        const classifyNs = (classifyTag === 'div') ? null : job.ns;
        const c = classify(classifyTag, job.attr, classifyNs);
        classifications.push({
            kind: job.kindId, tag: job.tag, attr: job.attr, class: job.class,
            domKind: c.kind, offValue: c.offValue, defaultIdl: c.defaultIdl
        });

        const open = (kind.wrap ? `<${kind.wrap}>` : '') + `<${kind.tag} ${job.attr}="`;
        const close = `"></${kind.tag}>` + (kind.wrap ? `</${kind.wrap}>` : '');
        const seq = job.attr === 'style' ? STYLE_INTERP : INTERP;

        /* ---- interpolated: the rule, on an initial render --------------- */
        for (const v of seq) {
            cells++;
            let threw = null, el = null, host = null;
            try {
                host = renderCell(cellTemplate(open, close, true), v.value);
                el = findEl(host, kind);
            } catch (e) { threw = e.message; }

            if (!judge({ job, kind, c, host, el, oracle: 'rule' }, v.label, threw, rows)) {
                noOpinion++;
            }
            if (host) host.remove();
        }

        /* ---- transition: the same rule, reached by UPDATE --------------- */
        // applyAttributeDirect runs on the first render; every later change
        // goes through applyAttribute and a deferred commit. Walking the value
        // list on ONE element measures every value again with a real prior
        // value behind it - the only way to reach the branches that compare
        // against what is already there (a form control's applied value, the
        // keys the previous style object set).
        let thost = null, tel = null;
        try {
            thost = renderCell(cellTemplate(open, close, true), seq[0].value);
            tel = findEl(thost, kind);
        } catch { /* the initial pass above already recorded this */ }

        if (tel) {
            // Nullish last as well as wherever it falls in seq. seq happens to
            // contain ${null} at index 2 today, but the "value applied, then
            // withdrawn" transition is the whole point of this pass and must
            // not depend on the order of a table someone may reorder.
            const steps = seq.slice(1).concat([
                { label: '${null}', value: null },
                { label: '${undefined}', value: undefined }
            ]);
            for (const v of steps) {
                cells++;
                transitions++;
                const before = observable(tel, job.attr, c).value;
                let threw = null;
                try { updateCell(thost, v.value); } catch (e) { threw = e.message; }
                if (!same(before, observable(tel, job.attr, c).value)) moved++;

                if (!judge({ job, kind, c, host: thost, el: tel, oracle: 'update' },
                           `-> ${v.label}`, threw, rows)) {
                    noOpinion++;
                }
            }
        }
        if (thost) thost.remove();

        /* ---- literal: the HTML parser is the oracle --------------------- */
        if (COMPONENT_KIND_IDS.has(kind.id)) continue;
        for (const lit of (job.attr === 'style' ? STYLE_LITERAL : LITERAL)) {
            cells++;
            const attrText = lit === null ? job.attr : `${job.attr}="${esc(lit)}"`;
            const markup = (kind.wrap ? `<${kind.wrap}>` : '') +
                `<${kind.tag} ${attrText}></${kind.tag}>` +
                (kind.wrap ? `</${kind.wrap}>` : '');

            let got;
            try {
                const host = renderCell(cellTemplate(markup, '', false), null);
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

            // The parser stays the oracle for the whole literal half, `on*`
            // included: the render-time guard only sees INTERPOLATED values.
            // Literal inline-handler text reaches the DOM by design and is
            // caught statically instead, by the t10-inline-events lint - see
            // "Banned Patterns" in CLAUDE.md.
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

    // A cell that cannot change state cannot test a transition. The first draft
    // of this pass silently updated nothing, which would have looked like a
    // clean run forever - the same shape as the registration-timing test that
    // recompiled after the fact (ATTR-CONTRACT-HANDOFF.md, "a test that could
    // not fail").
    if (transitions > 0 && moved === 0) {
        throw new Error(
            `update pass is inert: ${transitions} updates, none changed the DOM`);
    }

    // The relations need no ruleFor opinion; their rows join the same list so
    // the baseline diff and the exit code treat them as cells.
    const rel = runRelations(jobs, OTHER_ATTRS,
        job => job.attr === 'style' ? STYLE_INTERP : INTERP);
    rows.push(...rel.rows);

    return { cells, noOpinion, rows, classifications, transitions, moved, relations: rel.counts };
}
