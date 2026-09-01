/**
 * Regex-vs-division classification, shared by the tools that walk JavaScript
 * without a parser (template-lint's three walkers, convert-to-class's two).
 *
 * There is exactly one rule here on purpose. Every copy of it has drifted at
 * least once: the `n++ / 2` guard below was added twice to template-lint and
 * still missing from its third walker, which silently skipped the rest of any
 * line containing that shape - so templates on such a line were never linted.
 * Add new scanners by importing this, not by pasting it.
 */

export const KEYWORDS_BEFORE_REGEX = new Set([
    'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
    'do', 'else', 'case', 'yield', 'await', 'throw'
]);

export const REGEX_PREV_CHARS = new Set([
    '(', '[', '{', ',', ';', ':', '=', '!', '&', '|', '?', '+', '-', '*', '/',
    '%', '^', '~', '<', '>'
]);

/**
 * `n++ / 2` is division, not a regex. These scanners track only ONE previous
 * significant character, so `++` leaves a bare `+` behind - which is in
 * REGEX_PREV_CHARS. Look back for the pair instead of threading a second
 * character through every assignment site.
 *
 * @param {string} source
 * @param {number} slashIdx - index of the '/' being classified
 * @returns {boolean} true when the '/' follows a ++ or -- operator
 */
export function followsIncrementDecrement(source, slashIdx) {
    let k = slashIdx - 1;
    while (k >= 0 && /\s/.test(source[k])) k--;
    return k >= 1 && (source[k] === '+' || source[k] === '-') && source[k - 1] === source[k];
}

/**
 * Whether the '/' at `slashIdx` opens a regex literal rather than dividing.
 *
 * @param {string} source
 * @param {number} slashIdx
 * @param {string} lastSig - last significant character seen
 * @param {string} lastWord - last identifier/keyword seen
 * @returns {boolean}
 */
export function startsRegexLiteral(source, slashIdx, lastSig, lastWord) {
    return (REGEX_PREV_CHARS.has(lastSig) || KEYWORDS_BEFORE_REGEX.has(lastWord))
        && !followsIncrementDecrement(source, slashIdx);
}

/**
 * Skip a regex literal body and its flags.
 *
 * @param {string} source
 * @param {number} i - index of the opening '/'
 * @returns {number} index just past the literal
 */
export function skipRegex(source, i) {
    i++;
    let inClass = false;
    while (i < source.length) {
        const d = source[i];
        if (d === '\\') { i += 2; continue; }
        if (d === '[') inClass = true;
        else if (d === ']') inClass = false;
        else if (d === '/' && !inClass) { i++; break; }
        else if (d === '\n') break;
        i++;
    }
    while (i < source.length && /[a-z]/i.test(source[i])) i++;   // flags
    return i;
}
