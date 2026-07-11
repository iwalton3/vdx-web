/**
 * VDX-aware syntax highlighter
 *
 * A zero-dependency tokenizer that highlights VDX source code the way off-the-
 * shelf highlighters can't: it understands tagged `html\`\`` templates and
 * `/*css*​/\`\`` style blocks, recursing into `${...}` interpolations and back
 * out to JavaScript. The lexing strategy mirrors template-lint.js' walkCode /
 * scanTemplateLiteral / scanExprBrace / skipRegex - proven code that already
 * disambiguates regex from division and tracks template/expression nesting.
 *
 * Output is an HTML string of <span class="tok-*"> elements, safe to drop into
 * a <pre> behind a transparent <textarea> (see cl-code-editor). Every literal
 * character is HTML-escaped; token widths are preserved exactly so the overlay
 * stays aligned with the textarea caret.
 *
 * @module componentlib/form/vdx-highlight
 */

const KEYWORDS = new Set([
    'const', 'let', 'var', 'function', 'class', 'extends', 'return', 'if', 'else',
    'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'new',
    'delete', 'typeof', 'instanceof', 'in', 'of', 'void', 'yield', 'await', 'async',
    'throw', 'try', 'catch', 'finally', 'import', 'export', 'from', 'as', 'static',
    'get', 'set', 'super', 'this'
]);
const LITERALS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);

// Contexts after which a `/` begins a regex literal (not division).
const REGEX_PREV_CHARS = new Set(['(', '[', '{', ',', ';', ':', '=', '!', '&', '|', '?', '+', '-', '*', '/', '%', '^', '~', '<', '>']);
const KEYWORDS_BEFORE_REGEX = new Set([
    'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
    'do', 'else', 'case', 'yield', 'await', 'throw'
]);

function esc(s) {
    return s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}

function span(type, text) {
    return `<span class="tok-${type}">${esc(text)}</span>`;
}

/**
 * Matching close brace for the `{` at braceIdx, over raw source. Aware of
 * strings, template literals, comments, and regex so braces inside them don't
 * miscount. Returns the index of the matching `}` (or src.length - 1).
 * Ported from template-lint.js scanExprBrace.
 */
function scanExprEnd(src, braceIdx) {
    let depth = 0;
    let i = braceIdx;
    const n = src.length;
    let lastSig = '(';
    let lastWord = '';
    while (i < n) {
        const c = src[i];
        if (c === '/' && src[i + 1] === '/') {
            const nl = src.indexOf('\n', i);
            i = nl === -1 ? n : nl;
            continue;
        }
        if (c === '/' && src[i + 1] === '*') {
            const e = src.indexOf('*/', i + 2);
            i = e === -1 ? n : e + 2;
            continue;
        }
        if (c === '"' || c === "'") {
            i++;
            while (i < n) {
                if (src[i] === '\\') { i += 2; continue; }
                if (src[i] === c) { i++; break; }
                i++;
            }
            lastSig = c; lastWord = '';
            continue;
        }
        if (c === '`') {
            i = skipTemplate(src, i) + 1;
            lastSig = '`'; lastWord = '';
            continue;
        }
        if (c === '/') {
            if (REGEX_PREV_CHARS.has(lastSig) || KEYWORDS_BEFORE_REGEX.has(lastWord)) {
                i = skipRegex(src, i);
            } else {
                i++;
            }
            lastSig = '/'; lastWord = '';
            continue;
        }
        if (c === '{' || c === '(' || c === '[') { depth++; lastSig = c; lastWord = ''; i++; continue; }
        if (c === '}' || c === ')' || c === ']') {
            depth--;
            if (depth === 0) return i;
            lastSig = c; lastWord = '';
            i++;
            continue;
        }
        if (/\s/.test(c)) { i++; continue; }
        if (/[A-Za-z_$]/.test(c)) {
            let j = i;
            while (j < n && /[\w$]/.test(src[j])) j++;
            lastWord = src.slice(i, j);
            lastSig = src[j - 1];
            i = j;
            continue;
        }
        lastSig = c; lastWord = '';
        i++;
    }
    return n - 1;
}

/** Index of the closing backtick for the template starting at backtickIdx. */
function skipTemplate(src, backtickIdx) {
    let i = backtickIdx + 1;
    const n = src.length;
    while (i < n) {
        const c = src[i];
        if (c === '\\') { i += 2; continue; }
        if (c === '`') return i;
        if (c === '$' && src[i + 1] === '{') {
            i = scanExprEnd(src, i + 1) + 1;
            continue;
        }
        i++;
    }
    return n - 1;
}

/** Skip a regex literal body + flags; returns index after it. */
function skipRegex(src, i) {
    i++;
    let inClass = false;
    const n = src.length;
    while (i < n) {
        const d = src[i];
        if (d === '\\') { i += 2; continue; }
        if (d === '[') inClass = true;
        else if (d === ']') inClass = false;
        else if (d === '/' && !inClass) { i++; break; }
        else if (d === '\n') break;
        i++;
    }
    while (i < n && /[a-z]/i.test(src[i])) i++;
    return i;
}

/**
 * Highlight a run of JavaScript. Recurses into html`` and /*css*​/`` templates.
 */
function hlJs(src) {
    let out = '';
    let i = 0;
    const n = src.length;
    let lastSig = '(';
    let lastWord = '';
    let tagHtml = false;   // previous identifier was a bare `html` tag
    let cssNext = false;   // previous comment was /*css*/

    while (i < n) {
        const c = src[i];

        // Line comment
        if (c === '/' && src[i + 1] === '/') {
            let e = src.indexOf('\n', i);
            if (e === -1) e = n;
            out += span('comment', src.slice(i, e));
            i = e;
            continue;
        }
        // Block comment
        if (c === '/' && src[i + 1] === '*') {
            let e = src.indexOf('*/', i + 2);
            e = e === -1 ? n : e + 2;
            const text = src.slice(i, e);
            out += span('comment', text);
            cssNext = text.replace(/\s/g, '') === '/*css*/';
            i = e;
            continue;
        }
        // String
        if (c === '"' || c === "'") {
            let j = i + 1;
            while (j < n) {
                if (src[j] === '\\') { j += 2; continue; }
                if (src[j] === c) { j++; break; }
                j++;
            }
            out += span('string', src.slice(i, j));
            lastSig = c; lastWord = ''; tagHtml = false; cssNext = false;
            i = j;
            continue;
        }
        // Template literal
        if (c === '`') {
            const end = skipTemplate(src, i);
            const body = src.slice(i + 1, end);
            let inner;
            if (cssNext) inner = hlCss(body);
            else if (tagHtml) inner = hlHtml(body);
            else inner = hlTemplate(body);
            out += '<span class="tok-tpl">`</span>' + inner + '<span class="tok-tpl">`</span>';
            lastSig = '`'; lastWord = ''; tagHtml = false; cssNext = false;
            i = end + 1;
            continue;
        }
        // Regex vs division
        if (c === '/') {
            if (REGEX_PREV_CHARS.has(lastSig) || KEYWORDS_BEFORE_REGEX.has(lastWord)) {
                const e = skipRegex(src, i);
                out += span('regex', src.slice(i, e));
                i = e;
            } else {
                out += esc(c);
                i++;
            }
            lastSig = '/'; lastWord = ''; tagHtml = false; cssNext = false;
            continue;
        }
        // Number
        if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
            const m = /^(0[xXbBoO][0-9a-fA-F_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?)n?/.exec(src.slice(i));
            const num = m ? m[0] : c;
            out += span('number', num);
            lastSig = num[num.length - 1]; lastWord = ''; tagHtml = false; cssNext = false;
            i += num.length;
            continue;
        }
        // Identifier / keyword
        if (/[A-Za-z_$]/.test(c)) {
            let j = i;
            while (j < n && /[\w$]/.test(src[j])) j++;
            const word = src.slice(i, j);
            const prev = i > 0 ? src[i - 1] : '';
            if (KEYWORDS.has(word)) out += span('keyword', word);
            else if (LITERALS.has(word)) out += span('literal', word);
            else if (prev !== '.' && /^[A-Z]/.test(word)) out += span('type', word);
            else if (src[j] === '(') out += span('fn', word);
            else out += esc(word);
            lastWord = word; lastSig = src[j - 1];
            tagHtml = (word === 'html' && prev !== '.');
            cssNext = false;
            i = j;
            continue;
        }
        // Whitespace - preserve, keep pending tagHtml/cssNext alive
        if (/\s/.test(c)) { out += c; i++; continue; }
        // Punctuation
        out += esc(c);
        lastSig = c; lastWord = ''; tagHtml = false; cssNext = false;
        i++;
    }
    return out;
}

/** Plain (untagged) template literal: static text + ${} JS interpolations. */
function hlTemplate(body) {
    let out = '';
    let i = 0;
    const n = body.length;
    let text = '';
    while (i < n) {
        if (body[i] === '\\') { text += body[i] + (body[i + 1] || ''); i += 2; continue; }
        if (body[i] === '$' && body[i + 1] === '{') {
            if (text) { out += span('string', text); text = ''; }
            out += renderInterp(body, i);
            i = scanExprEnd(body, i + 1) + 1;
            continue;
        }
        text += body[i];
        i++;
    }
    if (text) out += span('string', text);
    return out;
}

/** Render a `${ ... }` interpolation (delimiters styled, inner as JS). */
function renderInterp(body, dollarIdx) {
    const end = scanExprEnd(body, dollarIdx + 1);
    const inner = body.slice(dollarIdx + 2, end);
    return '<span class="tok-interp">${</span>' + hlJs(inner) + '<span class="tok-interp">}</span>';
}

/** Highlight the body of an html`` template. */
function hlHtml(body) {
    let out = '';
    let i = 0;
    const n = body.length;
    let text = '';
    const flush = () => { if (text) { out += esc(text); text = ''; } };
    while (i < n) {
        const c = body[i];
        if (c === '$' && body[i + 1] === '{') {
            flush();
            out += renderInterp(body, i);
            i = scanExprEnd(body, i + 1) + 1;
            continue;
        }
        if (c === '<') {
            flush();
            if (body.startsWith('<!--', i)) {
                let e = body.indexOf('-->', i);
                e = e === -1 ? n : e + 3;
                out += span('comment', body.slice(i, e));
                i = e;
                continue;
            }
            const res = hlTag(body, i);
            out += res.html;
            i = res.end;
            continue;
        }
        text += c;
        i++;
    }
    flush();
    return out;
}

/** Highlight a single HTML tag beginning at `<` (body[start] === '<'). */
function hlTag(body, start) {
    const n = body.length;
    let i = start + 1;
    let out = '<span class="tok-punct">&lt;</span>';
    if (body[i] === '/') { out += '<span class="tok-punct">/</span>'; i++; }
    let j = i;
    while (j < n && /[\w:-]/.test(body[j])) j++;
    const name = body.slice(i, j);
    if (name) out += `<span class="tok-tagname">${esc(name)}</span>`;
    i = j;

    while (i < n) {
        const c = body[i];
        if (c === '>') { out += '<span class="tok-punct">&gt;</span>'; i++; break; }
        if (c === '/' && body[i + 1] === '>') { out += '<span class="tok-punct">/&gt;</span>'; i += 2; break; }
        if (c === '$' && body[i + 1] === '{') {
            out += renderInterp(body, i);
            i = scanExprEnd(body, i + 1) + 1;
            continue;
        }
        if (/\s/.test(c)) { out += c; i++; continue; }
        // Attribute name
        if (/[A-Za-z_@:-]/.test(c)) {
            let k = i;
            while (k < n && /[\w@:.-]/.test(body[k])) k++;
            const attr = body.slice(i, k);
            const dyn = attr.startsWith('on-') || attr === 'x-model' || attr === 'ref' || attr.startsWith('x-');
            out += `<span class="tok-attr${dyn ? '-dyn' : ''}">${esc(attr)}</span>`;
            i = k;
            if (body[i] === '=') {
                out += '<span class="tok-punct">=</span>';
                i++;
                i = hlAttrValue(body, i, (s) => { out += s; });
            }
            continue;
        }
        out += esc(c);
        i++;
    }
    return { html: out, end: i };
}

/** Highlight an attribute value; returns the new index. `emit` appends HTML. */
function hlAttrValue(body, i, emit) {
    const n = body.length;
    const q = body[i];
    if (q === '"' || q === "'") {
        emit(`<span class="tok-string">${esc(q)}</span>`);
        i++;
        let seg = '';
        while (i < n && body[i] !== q) {
            if (body[i] === '$' && body[i + 1] === '{') {
                if (seg) { emit(`<span class="tok-string">${esc(seg)}</span>`); seg = ''; }
                emit(renderInterp(body, i));
                i = scanExprEnd(body, i + 1) + 1;
                continue;
            }
            seg += body[i];
            i++;
        }
        if (seg) emit(`<span class="tok-string">${esc(seg)}</span>`);
        if (body[i] === q) { emit(`<span class="tok-string">${esc(q)}</span>`); i++; }
        return i;
    }
    if (q === '$' && body[i + 1] === '{') {
        emit(renderInterp(body, i));
        return scanExprEnd(body, i + 1) + 1;
    }
    // Bare value
    let k = i;
    while (k < n && !/[\s>]/.test(body[k])) k++;
    emit(`<span class="tok-string">${esc(body.slice(i, k))}</span>`);
    return k;
}

/** Lightweight CSS highlighting for /*css*​/`` blocks. */
function hlCss(body) {
    let out = '';
    let i = 0;
    const n = body.length;
    let depth = 0;
    let expectProp = true;
    let buf = '';
    const flush = (cls) => { if (buf) { out += cls ? `<span class="tok-${cls}">${esc(buf)}</span>` : esc(buf); buf = ''; } };
    const bufCls = () => (depth === 0 ? 'css-selector' : (expectProp ? 'css-prop' : 'css-value'));

    while (i < n) {
        const c = body[i];
        if (c === '/' && body[i + 1] === '*') {
            flush(bufCls());
            let e = body.indexOf('*/', i + 2);
            e = e === -1 ? n : e + 2;
            out += span('comment', body.slice(i, e));
            i = e;
            continue;
        }
        if (c === '$' && body[i + 1] === '{') {
            flush(bufCls());
            out += renderInterp(body, i);
            i = scanExprEnd(body, i + 1) + 1;
            continue;
        }
        if (c === '{') { flush(bufCls()); out += '<span class="tok-punct">{</span>'; depth++; expectProp = true; i++; continue; }
        if (c === '}') { flush(bufCls()); out += '<span class="tok-punct">}</span>'; depth = Math.max(0, depth - 1); expectProp = true; i++; continue; }
        if (depth > 0 && c === ';') { flush(bufCls()); out += '<span class="tok-punct">;</span>'; expectProp = true; i++; continue; }
        if (depth > 0 && c === ':' && expectProp) { flush('css-prop'); out += '<span class="tok-punct">:</span>'; expectProp = false; i++; continue; }
        buf += c;
        i++;
    }
    flush(bufCls());
    return out;
}

/**
 * Highlight VDX source code. Returns an HTML string of <span class="tok-*">
 * tokens. Falls back to escaped plain text if anything unexpected throws, so a
 * malformed snippet never breaks the editor overlay.
 *
 * @param {string} code
 * @param {'auto'|'js'|'html'|'css'} [language='auto'] - 'auto' detects a raw
 *   HTML fragment (first non-whitespace char is `<`) and highlights it as HTML;
 *   otherwise it treats the input as JavaScript (which still recurses into
 *   html`` / /*css*​/`` templates internally). 'vdx' is accepted as an alias
 *   for 'auto'.
 */
export function highlightVdx(code, language = 'auto') {
    const src = String(code);
    try {
        let mode = language;
        if (mode === 'auto' || mode === 'vdx') {
            const first = src.match(/\S/);
            mode = first && first[0] === '<' ? 'html' : 'js';
        }
        if (mode === 'html') return hlHtml(src);
        if (mode === 'css') return hlCss(src);
        return hlJs(src);
    } catch (e) {
        return esc(src);
    }
}

export default highlightVdx;
