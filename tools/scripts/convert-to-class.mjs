#!/usr/bin/env node
/**
 * Codemod: options-format defineComponent -> class-based Component.
 *
 * Usage:
 *   node scripts/convert-to-class.mjs [--dry-run] <files-or-directories...>
 *
 * Directories are walked recursively for .js/.mjs files. Files without a
 * defineComponent('tag', {...}) call are skipped. With --dry-run, transformed
 * output is validated and reported but nothing is written.
 *
 * Transform mapping (see docs/components.md "Class Components"):
 *   props/stores/styles     -> static class fields
 *   data()                  -> constructor(props) { super(props); this.state = ... }
 *   methods: {...}          -> class methods (template-literal-aware dedent)
 *   computed: {...}         -> get accessors
 *   template/mounted/...    -> same-named class methods
 *   defineComponent('x-y', {...}) -> class XY extends Component + defineComponent('x-y', XY)
 *   (export prefix on the call is preserved; Component added to the framework import)
 *
 * Safety properties:
 *   - Structure-aware scanner (strings, template literals w/ ${} nesting,
 *     line/block comments, regex literals) so method bodies are never mangled
 *   - Unknown option keys abort the file (FAIL) instead of guessing
 *   - data() with multiple top-level returns aborts the file (manual conversion)
 *   - Every transformed file is syntax-validated in MODULE goal before writing.
 *     (Plain `node --check file.js` parses script goal and will false-green
 *     invalid class bodies - this validation catches what that misses.)
 *
 * MANUAL REVIEW still required for:
 *   - data() reading this.props: the class constructor sees REAL prop values,
 *     data() saw defaults - audit propsChanged/mounted for double-application
 *   - computed getters that read refs/DOM/non-reactive fields (cache staleness)
 *   - inline components in HTML files (this tool only handles .js/.mjs)
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

const KEYWORDS_BEFORE_REGEX = new Set([
    'return','typeof','instanceof','in','of','new','delete','void','do','else',
    'case','yield','await','throw'
]);
const REGEX_PREV_CHARS = new Set(['(','[','{',',',';',':','=','!','&','|','?','+','-','*','/','%','^','~','<','>']);

// Scan starting at index of an open bracket char; return index of its matching close.
// Also can collect top-level comma positions when collectCommas is provided (array).
function scan(src, openIdx, collectCommas) {
    const open = src[openIdx];
    const close = open === '{' ? '}' : open === '(' ? ')' : ']';
    // stack frames: 'code' depth tracked via counters; we use an explicit stack.
    // frame types: {b:'{'} etc for brackets, {t:true} for template literal, {te:true} template expr (${...})
    const stack = [{ br: open }];
    let i = openIdx + 1;
    let lastSig = open; // last significant char for regex detection
    let lastWord = '';
    const commas = [];
    while (i < src.length && stack.length) {
        const c = src[i];
        const top = stack[stack.length - 1];
        // Inside a template literal (raw text) until backtick or ${
        if (top.t) {
            if (c === '\\') { i += 2; continue; }
            if (c === '`') { stack.pop(); i++; lastSig='`'; lastWord=''; continue; }
            if (c === '$' && src[i+1] === '{') { stack.push({ te: true, depth: 0 }); i += 2; lastSig='{'; lastWord=''; continue; }
            i++; continue;
        }
        // code context (either top-level bracket frame or template-expr frame)
        // comments
        if (c === '/' && src[i+1] === '/') { const nl = src.indexOf('\n', i); i = nl === -1 ? src.length : nl; continue; }
        if (c === '/' && src[i+1] === '*') { const e = src.indexOf('*/', i+2); i = e === -1 ? src.length : e+2; continue; }
        // strings
        if (c === '"' || c === "'") {
            i++;
            while (i < src.length) { if (src[i]==='\\'){i+=2;continue;} if (src[i]===c){i++;break;} i++; }
            lastSig = c; lastWord=''; continue;
        }
        // template literal start
        if (c === '`') { stack.push({ t: true }); i++; lastSig='`'; lastWord=''; continue; }
        // whitespace
        if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
        // regex vs division
        if (c === '/') {
            const isRegex = (REGEX_PREV_CHARS.has(lastSig)) || KEYWORDS_BEFORE_REGEX.has(lastWord);
            if (isRegex) {
                i++; let inClass = false;
                while (i < src.length) {
                    const d = src[i];
                    if (d === '\\') { i += 2; continue; }
                    if (d === '[') inClass = true;
                    else if (d === ']') inClass = false;
                    else if (d === '/' && !inClass) { i++; break; }
                    else if (d === '\n') break;
                    i++;
                }
                while (i < src.length && /[a-z]/i.test(src[i])) i++; // flags
                lastSig = '/'; lastWord=''; continue;
            }
            // division
            lastSig = '/'; lastWord=''; i++; continue;
        }
        // brackets
        if (c === '{' || c === '(' || c === '[') {
            if (top.te) top.depth++;
            stack.push({ br: c });
            lastSig = c; lastWord=''; i++; continue;
        }
        if (c === '}' || c === ')' || c === ']') {
            // closing a template-expr's own ${ } ?
            if (c === '}' && top.te && top.depth === 0) { stack.pop(); i++; lastSig='}'; lastWord=''; continue; }
            stack.pop();
            if (stack.length === 0) { return { end: i, commas }; }
            const nt = stack[stack.length - 1];
            if (nt.te && (c === '}' || c === ')' || c === ']')) nt.depth--;
            lastSig = c; lastWord=''; i++; continue;
        }
        if (c === ',') {
            if (collectCommas && stack.length === 1 && stack[0].br === open) commas.push(i);
            lastSig = ','; lastWord=''; i++; continue;
        }
        // word / identifier
        if (/[A-Za-z_$]/.test(c)) {
            let j = i; while (j < src.length && /[A-Za-z0-9_$]/.test(src[j])) j++;
            lastWord = src.slice(i, j); lastSig = src[j-1]; i = j; continue;
        }
        // other punctuation
        lastSig = c; lastWord=''; i++;
    }
    throw new Error('unbalanced from ' + openIdx);
}

// Split an object literal (given index of its open brace) into member text slices.
function objectMembers(src, openIdx) {
    const { end, commas } = scan(src, openIdx, true);
    const members = [];
    let start = openIdx + 1;
    const bounds = [...commas, end];
    for (const b of bounds) {
        const text = src.slice(start, b);
        if (text.trim() !== '') members.push({ raw: text });
        start = b + 1;
    }
    // Guard: the scanner does not understand TypeScript generics, so a comma
    // inside a signature-level annotation like `counts(): Record<A, B> {...}`
    // would mis-split the member and mangle the output. Detect the symptom
    // (unbalanced <> in the pre-body part of a fragment) and abort loudly.
    for (const m of members) {
        const braceIdx = m.raw.indexOf('{');
        const sig = (braceIdx === -1 ? m.raw : m.raw.slice(0, braceIdx)).replace(/=>/g, '');
        const lt = (sig.match(/</g) || []).length;
        const gt = (sig.match(/>/g) || []).length;
        if (lt !== gt) {
            throw new Error(
                'member signature contains a generic type annotation with a comma ' +
                '(e.g. Record<A, B>) which the splitter cannot parse - alias the ' +
                'type (type X = Record<A, B>) or convert this component manually'
            );
        }
    }
    return { end, members };
}

// Given a member raw text (may have leading trivia/comments), return
// { lead, key, isMethod, afterKey } where afterKey is text after the key token
// (starting at ':' for props or '(' for methods).
function parseMember(raw) {
    // find first identifier token, skipping leading whitespace and comments
    let i = 0;
    while (i < raw.length) {
        if (/\s/.test(raw[i])) { i++; continue; }
        if (raw[i] === '/' && raw[i+1] === '/') { const nl = raw.indexOf('\n', i); i = nl===-1?raw.length:nl; continue; }
        if (raw[i] === '/' && raw[i+1] === '*') { const e = raw.indexOf('*/', i+2); i = e===-1?raw.length:e+2; continue; }
        break;
    }
    const lead = raw.slice(0, i);
    // skip method modifiers: async, generator '*', (get/set handled elsewhere)
    let mi = i;
    const wordAt = (p) => { let q = p; while (q < raw.length && /[A-Za-z0-9_$]/.test(raw[q])) q++; return raw.slice(p, q); };
    if (wordAt(mi) === 'async') {
        mi += 5; while (mi < raw.length && /\s/.test(raw[mi])) mi++;
    }
    while (raw[mi] === '*' || /\s/.test(raw[mi] || '')) mi++;
    i = mi;
    let j = i; while (j < raw.length && /[A-Za-z0-9_$]/.test(raw[j])) j++;
    const key = raw.slice(i, j);
    // skip whitespace after key
    let k = j; while (k < raw.length && /\s/.test(raw[k])) k++;
    const isMethod = raw[k] === '(';
    return { lead, key, isMethod, keyEnd: j, body: raw.slice(j) };
}

function pascal(tag) {
    return tag.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

// Dedent a block of code text by up to `n` spaces per line, but ONLY on lines
// whose start is in normal code context (not inside a multiline template/string).
function contextAwareDedent(text, n) {
    // Track template/string context across lines using a lightweight scan.
    const lines = text.split('\n');
    let inTemplate = 0; // backtick template nesting for raw text
    // We need to know at each line START whether we're inside a template raw region.
    // Do a scan over the whole text recording context at each newline.
    const startInTemplate = [];
    {
        // stack of 't' (template raw) and 'te' (template expr)
        const stack = [];
        let atLineStartTemplate = false;
        startInTemplate.push(false);
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            const top = stack[stack.length-1];
            if (top === 't') {
                if (c === '\\') { i++; }
                else if (c === '`') stack.pop();
                else if (c === '$' && text[i+1] === '{') { stack.push('te0'); i++; }
            } else {
                if (c === '`') stack.push('t');
                else if (c === '"' || c === "'") {
                    const q = c; i++;
                    while (i < text.length) { if (text[i]==='\\'){i+=2;continue;} if(text[i]===q){break;} i++; }
                } else if (c === '/' && text[i+1] === '/') { const nl=text.indexOf('\n',i); i = nl===-1?text.length-1:nl-1; }
                else if (c === '/' && text[i+1] === '*') { const e=text.indexOf('*/',i+2); i = e===-1?text.length-1:e+1; }
                else if (top && top.startsWith('te')) {
                    if (c === '{') stack[stack.length-1] = 'te' + (parseInt(top.slice(2))+1);
                    else if (c === '}') {
                        const d = parseInt(top.slice(2));
                        if (d === 0) stack.pop(); else stack[stack.length-1] = 'te' + (d-1);
                    }
                }
            }
            if (c === '\n') {
                const t = stack[stack.length-1];
                startInTemplate.push(t === 't');
            }
        }
    }
    const out = lines.map((line, idx) => {
        if (startInTemplate[idx]) return line; // inside multiline template raw text
        // strip up to n leading spaces
        let removed = 0; let p = 0;
        while (p < line.length && line[p] === ' ' && removed < n) { p++; removed++; }
        return line.slice(removed);
    });
    return out.join('\n');
}

const LIFECYCLE = new Set(['template','mounted','unmounted','afterRender','propsChanged','renderError']);

function transformDataToConstructor(memberRaw) {
    // memberRaw is like: `data() {\n ...body... \n    }` possibly with lead trivia (none for data)
    const { lead, body } = parseMember(memberRaw);
    // body starts with `data` already consumed? No: parseMember returns body = raw.slice(keyEnd) i.e. from '(' onwards.
    // Find the method body braces.
    const openBrace = memberRaw.indexOf('{', memberRaw.indexOf('data'));
    const { end } = scan(memberRaw, openBrace, false);
    const inner = memberRaw.slice(openBrace + 1, end); // between braces
    const after = memberRaw.slice(end + 1); // usually empty/whitespace
    // find top-level `return` within inner
    const returns = findTopLevelReturns(inner);
    if (returns.length > 1) {
        // Multiple top-level returns: rewriting only one would silently break
        // the others - this data() needs a human
        throw new Error('data() has multiple top-level returns - convert manually');
    }
    const retIdx = returns.length ? returns[0] : -1;
    let newInner;
    if (retIdx === -1) {
        newInner = inner; // no return (rare) - leave, state stays default
    } else {
        newInner = inner.slice(0, retIdx) + 'this.state =' + inner.slice(retIdx + 'return'.length);
    }
    // Build constructor. Keep at 4-space member indent.
    return `${lead}constructor(props) {\n        super(props);\n${newInner.replace(/\s+$/, '')}\n    }${after}`;
}

// Find indices of ALL top-level (depth 0) `return` keywords within code text.
function findTopLevelReturns(text) {
    const found = [];
    const stack = [];
    let i = 0;
    while (i < text.length) {
        const c = text[i];
        const top = stack[stack.length-1];
        if (top === 't') {
            if (c === '\\'){i+=2;continue;}
            if (c === '`'){stack.pop();i++;continue;}
            if (c === '$' && text[i+1]==='{'){stack.push('te0');i+=2;continue;}
            i++; continue;
        }
        if (c === '/' && text[i+1]==='/'){const nl=text.indexOf('\n',i);i=nl===-1?text.length:nl;continue;}
        if (c === '/' && text[i+1]==='*'){const e=text.indexOf('*/',i+2);i=e===-1?text.length:e+2;continue;}
        if (c === '"' || c === "'"){const q=c;i++;while(i<text.length){if(text[i]==='\\'){i+=2;continue;}if(text[i]===q){i++;break;}i++;}continue;}
        if (c === '`'){stack.push('t');i++;continue;}
        if (c === '{'||c==='('||c==='['){stack.push('b');i++;continue;}
        if (c === '}'||c===')'||c===']'){stack.pop();i++;continue;}
        if (/[A-Za-z_$]/.test(c)){
            let j=i;while(j<text.length&&/[A-Za-z0-9_$]/.test(text[j]))j++;
            if (text.slice(i,j)==='return' && stack.length===0) found.push(i);
            i=j; continue;
        }
        i++;
    }
    return found;
}

function convertObject(src, openIdx, tag) {
    const { end, members } = objectMembers(src, openIdx);
    const classMembers = []; // array of text blocks (each a full member incl lead)
    for (const m of members) {
        const pm = parseMember(m.raw);
        const { key, lead, isMethod } = pm;
        if (key === 'props' || key === 'stores') {
            // replace `key:` with `static key =`
            const idx = m.raw.indexOf(key);
            const colon = m.raw.indexOf(':', idx + key.length);
            const val = m.raw.slice(colon + 1);
            classMembers.push(`${lead}static ${key} =${val}`);
        } else if (key === 'styles') {
            const idx = m.raw.indexOf(key);
            const colon = m.raw.indexOf(':', idx + key.length);
            const val = m.raw.slice(colon + 1);
            classMembers.push(`${lead}static styles =${val}`);
        } else if (key === 'data' && isMethod) {
            classMembers.push(transformDataToConstructor(m.raw));
        } else if (key === 'methods' && !isMethod) {
            // splice inner methods
            const braceIdx = m.raw.indexOf('{', m.raw.indexOf(':'));
            const innerObjOpen = braceIdx;
            const { members: inner } = objectMembers(m.raw, innerObjOpen);
            for (const im of inner) {
                classMembers.push(contextAwareDedent(im.raw, 4));
            }
        } else if (key === 'computed' && !isMethod) {
            const braceIdx = m.raw.indexOf('{', m.raw.indexOf(':'));
            const { members: inner } = objectMembers(m.raw, braceIdx);
            for (const im of inner) {
                const ipm = parseMember(im.raw);
                // turn `name(...) {...}` into `get name() {...}`
                // find the '(' and its matching ')'
                const nameIdx = im.raw.indexOf(ipm.key, ipm.lead.length);
                const parenOpen = im.raw.indexOf('(', nameIdx);
                const { end: parenClose } = scan(im.raw, parenOpen, false);
                const rebuilt = im.raw.slice(0, nameIdx) + 'get ' + ipm.key + '()' + im.raw.slice(parenClose + 1);
                classMembers.push(contextAwareDedent(rebuilt, 4));
            }
        } else if (LIFECYCLE.has(key) && isMethod) {
            classMembers.push(m.raw);
        } else {
            throw new Error(`Unknown member "${key}" in ${tag}`);
        }
    }
    return { end, classMembers };
}

// Mark indices that are in real code context (not string/comment/template-raw/regex).
function buildCodeMask(src) {
    const mask = new Uint8Array(src.length); // 1 = code
    const stack = []; // 't' template-raw, 'teN' template-expr depth
    let lastSig = '', lastWord = '';
    let i = 0;
    while (i < src.length) {
        const c = src[i];
        const top = stack[stack.length - 1];
        if (top === 't') {
            if (c === '\\') { i += 2; continue; }
            if (c === '`') { stack.pop(); i++; continue; }
            if (c === '$' && src[i+1] === '{') { stack.push('te0'); mask[i]=1; mask[i+1]=1; i += 2; lastSig='{'; lastWord=''; continue; }
            i++; continue; // template raw text: leave 0
        }
        if (c === '/' && src[i+1] === '/') { const nl = src.indexOf('\n', i); i = nl===-1?src.length:nl; continue; }
        if (c === '/' && src[i+1] === '*') { const e = src.indexOf('*/', i+2); i = e===-1?src.length:e+2; continue; }
        if (c === '"' || c === "'") { i++; while (i<src.length){ if(src[i]==='\\'){i+=2;continue;} if(src[i]===c){i++;break;} i++; } lastSig=c; lastWord=''; continue; }
        if (c === '`') { stack.push('t'); i++; continue; }
        if (c === '/') {
            const isRegex = REGEX_PREV_CHARS.has(lastSig) || KEYWORDS_BEFORE_REGEX.has(lastWord) || lastSig === '';
            if (isRegex) {
                i++; let inClass=false;
                while (i<src.length){ const d=src[i]; if(d==='\\'){i+=2;continue;} if(d==='[')inClass=true; else if(d===']')inClass=false; else if(d==='/'&&!inClass){i++;break;} else if(d==='\n')break; i++; }
                while (i<src.length && /[a-z]/i.test(src[i])) i++;
                lastSig='/'; lastWord=''; continue;
            }
            mask[i]=1; lastSig='/'; lastWord=''; i++; continue;
        }
        if (/\s/.test(c)) { mask[i]=1; i++; continue; }
        if (top && top.startsWith('te')) {
            if (c === '{') stack[stack.length-1] = 'te' + (parseInt(top.slice(2))+1);
            else if (c === '}') { const d=parseInt(top.slice(2)); if(d===0)stack.pop(); else stack[stack.length-1]='te'+(d-1); }
        }
        if (/[A-Za-z_$]/.test(c)) { let j=i; while(j<src.length&&/[A-Za-z0-9_$]/.test(src[j]))j++; for(let k=i;k<j;k++)mask[k]=1; lastWord=src.slice(i,j); lastSig=src[j-1]; i=j; continue; }
        mask[i]=1; lastSig=c; lastWord=''; i++;
    }
    return mask;
}

function processFile(filePath) {
    let src = fs.readFileSync(filePath, 'utf8');
    const codeMask = buildCodeMask(src);
    // find all defineComponent( occurrences (top-level, in real code)
    const sites = [];
    const re = /defineComponent\s*\(\s*(['"])([^'"]+)\1\s*,\s*\{/g;
    let match;
    while ((match = re.exec(src)) !== null) {
        if (!codeMask[match.index]) continue; // inside comment/string/template-raw
        const tag = match[2];
        const braceIdx = src.indexOf('{', match.index + match[0].length - 1);
        sites.push({ callStart: match.index, tag, braceIdx });
    }
    if (sites.length === 0) return null;
    // process from last to first so indices stay valid
    for (let s = sites.length - 1; s >= 0; s--) {
        const site = sites[s];
        const { end, classMembers } = convertObject(src, site.braceIdx, site.tag);
        // find the statement prefix (start of line for the call)
        const lineStart = src.lastIndexOf('\n', site.callStart) + 1;
        const prefix = src.slice(lineStart, site.callStart); // e.g. "export default " or "export const X = " or ""
        const isExported = /\bexport\b/.test(prefix);
        const className = pascal(site.tag);
        const classKw = isExported ? 'export class ' : 'class ';
        const body = classMembers
            .map(s => s.replace(/^\n+/, '').replace(/\s+$/, ''))
            .join('\n\n');
        const classDecl = `${classKw}${className} extends Component {\n${body}\n}`;
        // The object spans site.braceIdx .. end (inclusive). Replace with className.
        const before = src.slice(0, site.braceIdx);
        const afterObj = src.slice(end + 1); // starts with `)` ...
        // Insert class decl before the statement line, then the statement with object replaced by className.
        const beforeLine = src.slice(0, lineStart);
        const stmtToObj = src.slice(lineStart, site.braceIdx); // prefix + defineComponent('tag',<ws>
        src = beforeLine + classDecl + '\n\n' + stmtToObj + className + afterObj;
    }
    // ensure Component imported
    src = src.replace(/import\s*\{([^}]*)\}\s*from\s*(['"][^'"]*framework\.js['"])/, (full, names, from) => {
        if (/\bComponent\b/.test(names)) return full;
        const trimmed = names.trim().replace(/,\s*$/, '');
        return `import { ${trimmed}, Component } from ${from}`;
    });
    return src;
}

// Syntax-validate code in MODULE goal (node --check on a .js parses script
// goal and false-greens comma-separated class members; a .mjs temp file
// forces module-goal parsing).
function validateModuleSyntax(code) {
    const tmp = path.join(os.tmpdir(), `vdx-codemod-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
    fs.writeFileSync(tmp, code);
    try {
        const res = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
        return res.status === 0 ? null : (res.stderr || 'unknown syntax error').trim();
    } finally {
        fs.unlinkSync(tmp);
    }
}

function collectFiles(args) {
    const files = [];
    for (const arg of args) {
        const stat = fs.statSync(arg);
        if (stat.isDirectory()) {
            for (const entry of fs.readdirSync(arg, { recursive: true })) {
                const p = path.join(arg, String(entry));
                if (/\.(js|mjs)$/.test(p) && fs.statSync(p).isFile()) files.push(p);
            }
        } else {
            files.push(arg);
        }
    }
    return files;
}

// --- CLI ---
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const inputs = args.filter(a => a !== '--dry-run');
if (inputs.length === 0) {
    console.error('Usage: node scripts/convert-to-class.mjs [--dry-run] <files-or-directories...>');
    process.exit(2);
}

let failures = 0;
for (const f of collectFiles(inputs)) {
    try {
        const output = processFile(f);
        if (output === null) {
            console.log('SKIP ' + f + ' (no options-format defineComponent)');
            continue;
        }
        // node can't parse TypeScript - .ts outputs are validated by tsc
        // instead (run your project's tsc after converting; note the
        // generated constructor(props) will need a type annotation in strict mode)
        const isTs = /\.ts$/.test(f);
        if (!isTs) {
            const syntaxError = validateModuleSyntax(output);
            if (syntaxError) {
                throw new Error('transformed output failed module-goal syntax check:\n' + syntaxError);
            }
        }
        if (!dryRun) fs.writeFileSync(f, output);
        console.log((dryRun ? 'OK (dry) ' : 'OK   ') + f + (isTs ? ' (TypeScript: validate with tsc)' : ''));
    } catch (e) {
        failures++;
        console.error('FAIL ' + f + ' :: ' + e.message);
    }
}
if (failures > 0) {
    console.error(`\n${failures} file(s) failed - convert those manually.`);
    process.exit(1);
}
