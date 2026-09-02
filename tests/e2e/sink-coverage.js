/**
 * V8 branch coverage for the attribute sinks, printed with the matrix run.
 *
 * The matrix is HTML-taxonomy-shaped: it enumerates attributes and element
 * kinds. The implementation branches on other things entirely - transitions,
 * value types, who owns a name - so cells can multiply without ever reaching
 * new code. Every regression this branch produced lived on an axis the matrix
 * did not have.
 *
 * Coverage is the stopping condition the taxonomy cannot give: an uncovered
 * range is either an axis still missing or a branch that cannot run.
 */

// Functions worth reporting on, by the source URL they live in. Named rather
// than whole-file so the numbers stay about the sinks and do not drown in the
// renderer's other 2000 lines.
const SINKS = {
    '/lib/core/template-renderer.js': ['applyAttributeDirect', 'isOwnElementProp'],
    '/lib/core/constants.js': ['isBooleanAttr', 'literalAttrValue']
};

/**
 * Blocks that do not run under the matrix and should not, with the reason.
 *
 * Keyed by the block's first line of source rather than its line number, so
 * the list does not rot when something above it moves. Anything NOT in here is
 * the actionable list: either an axis the matrix is missing, or dead code.
 *
 * This is not the accepted-disagreements list all over again. A row here says
 * "another test owns this", and that claim is checkable - each names the file.
 */
const EXPLAINED = {
    "const lname = typeof name === 'string' ? name.toLowerCase() : name;":
        'defensive - attribute names come from the compiler and are always strings',
    "(DANGEROUS_ATTR_PROPS.has(lname) || (!isCustomElement && /^on[a-z]/.test(lname)))) {":
        'security refusal - tests/framework/security.test.js "refuses innerHTML/srcdoc"',
    "const isSvgLink = lname === 'xlink:href' && el.namespaceURI === RENDERER_SVG_NS;":
        'xlink:href sanitisation - tests/framework/security.test.js "sanitizes javascript:"',
    "if ((urlTags && urlTags.has(el.tagName)) || isSvgLink) {":
        'URL sanitisation - tests/framework/security.test.js "sanitizes javascript:"',
    "} else if (DANGEROUS_CSS.test(String(value))) {":
        'CSS refusal - tests/framework/security.test.js "refuses @import and expression()"',
    "if (Object.prototype.hasOwnProperty.call(el, name)) return true;":
        'no element carries an own property for a prop name, by design - setting one ' +
        'shadows the prototype accessor forever (ATTR-CONTRACT-HANDOFF.md, "Do not")',
    "} catch {":
        'a native DOM setter that throws; no attribute in the matrix has one'
};

/**
 * A tiny function can report zero calls after TurboFan inlines it, because
 * precise coverage counts the interpreter's entries and inlined code never
 * makes one. Reporting that as dead is how a confident wrong signal gets into
 * a report, so name the ones whose behaviour a real test already pins.
 */
const UNMEASURABLE = {
    literalAttrValue:
        'one-liner, inlined - behaviour pinned by tests/framework/boolean-attrs.test.js'
};

function lineOf(text, offset) {
    let line = 1;
    for (let i = 0; i < offset && i < text.length; i++) if (text[i] === '\n') line++;
    return line;
}

/**
 * The whole source line the range starts on, trimmed.
 *
 * Not the range's own text: V8 anchors a conditional block at its `{`, so the
 * range starts mid-line and the first line of it is often just "{" - which
 * collides with every other block in the function. The containing line carries
 * the condition, which is what identifies the branch.
 */
function snippet(text, start) {
    const from = text.lastIndexOf('\n', start) + 1;
    let to = text.indexOf('\n', start);
    if (to === -1) to = text.length;
    return text.slice(from, to).trim().slice(0, 110);
}

/**
 * @param entries page.coverage.stopJSCoverage() output, taken with
 *                includeRawScriptCoverage - the cooked ranges lose the counts.
 */
function report(entries) {
    const out = [];
    for (const entry of entries) {
        const path = new URL(entry.url).pathname;
        const wanted = SINKS[path];
        if (!wanted) continue;
        const fns = entry.rawScriptCoverage && entry.rawScriptCoverage.functions;
        if (!fns) continue;

        for (const name of wanted) {
            // V8 reports one entry per function; the first range is the whole
            // body, the rest are the blocks inside it.
            const fn = fns.find(f => f.functionName === name);
            if (!fn || !fn.ranges.length) {
                out.push({ path, name, missing: true });
                continue;
            }
            const [body, ...blocks] = fn.ranges;
            const dead = blocks
                .filter(r => r.count === 0)
                .map(r => {
                    const code = snippet(entry.text, r.startOffset);
                    return { line: lineOf(entry.text, r.startOffset), code, why: EXPLAINED[code] };
                });
            out.push({
                path, name,
                calls: body.count,
                unmeasurable: body.count === 0 ? UNMEASURABLE[name] : undefined,
                blocks: blocks.length,
                covered: blocks.length - dead.length,
                dead
            });
        }
    }
    return out;
}

function print(rows, log) {
    log('--- sink branch coverage (V8) ---');
    let unexplained = 0;
    for (const r of rows) {
        if (r.missing) {
            // A sink that was not measured at all is the worst case, not a
            // neutral one: it used to print alongside "0 unexplained blocks",
            // which is the same "a checker that checked nothing reports clean"
            // defect this repo fixed in its own lint (bd02166).
            unexplained++;
            log(`  ${r.name.padEnd(22)} NOT MEASURED in ${r.path} - renamed, or coverage never started`);
            continue;
        }
        if (r.unmeasurable) {
            log(`  ${r.name.padEnd(22)} ${'-'.padStart(6)} calls   ${r.unmeasurable}`);
            continue;
        }
        log(`  ${r.name.padEnd(22)} ${String(r.calls).padStart(6)} calls   ` +
            `${r.covered}/${r.blocks} blocks`);
        for (const d of r.dead) {
            if (d.why) log(`      ok   ${r.path}:${d.line}  ${d.code}\n           ${d.why}`);
        }
        for (const d of r.dead) {
            if (d.why) continue;
            unexplained++;
            log(`      GAP  ${r.path}:${d.line}  ${d.code}`);
        }
    }
    // A gap is an axis the matrix does not have, or code nothing reaches.
    // Either way it is the list to work from - the taxonomy cannot tell you
    // when to stop, and this can.
    if (!rows.length) {
        // No rows at all means coverage never ran. Reporting "0 unexplained"
        // for that is a false pass.
        unexplained++;
        log('  NO SINKS MEASURED - coverage produced no rows at all');
    }
    log(`  ${unexplained} unexplained block(s) - each is a missing axis or dead code`);
    log('');
    return unexplained;
}

module.exports = { report, print };
