/**
 * Shared constants for the VDX framework core
 * @module core/constants
 */

// SECURITY: property names that could enable prototype-pollution if assigned
// from untrusted data. Shared by the template renderer (attribute/x-model
// paths) and the store system so there is one source of truth.
export const DANGEROUS_KEYS = new Set([
    '__proto__', 'prototype', 'constructor',
    '__defineGetter__', '__defineSetter__',
    '__lookupGetter__', '__lookupSetter__'
]);

// SVG element names are case-SENSITIVE, but the HTML parser lowercases all
// tag names (HTML semantics). Map the lowercased forms back to the correct
// camelCase names at createElementNS time - without this, <linearGradient>,
// <clipPath>, <feGaussianBlur> etc. silently become unknown SVG elements.
export const SVG_TAG_CASE = new Map([
    'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animateColor', 'animateMotion',
    'animateTransform', 'clipPath', 'feBlend', 'feColorMatrix',
    'feComponentTransfer', 'feComposite', 'feConvolveMatrix',
    'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feDropShadow',
    'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur',
    'feImage', 'feMerge', 'feMergeNode', 'feMorphology', 'feOffset',
    'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile',
    'feTurbulence', 'foreignObject', 'glyphRef', 'linearGradient',
    'radialGradient', 'textPath'
].map(name => [name.toLowerCase(), name]));

// Boolean attributes that should be set as properties (not string attributes)
export const BOOLEAN_ATTRS = new Set([
    'disabled', 'checked', 'selected', 'readonly', 'required',
    'multiple', 'autofocus', 'autoplay', 'controls', 'loop',
    'muted', 'open', 'reversed', 'hidden', 'async', 'defer',
    'ismap', 'declare', 'noresize', 'nowrap', 'noshade', 'compact',
    'default', 'scoped', 'seamless', 'sortable', 'novalidate',
    'formnovalidate', 'itemscope', 'inert'
]);

/**
 * Whether `name` is a native HTML boolean attribute *on this element*.
 *
 * Custom elements are excluded deliberately: `disabled` on a component is an
 * ordinary prop name that happens to collide with an HTML boolean attribute,
 * not a boolean attribute. Coercing it there hands the component `true` where
 * the template said `"false"`.
 */
/**
 * Boolean attributes the UA acts on for ANY element, custom tags included.
 * `hidden` is the one that bites: the UA stylesheet hides the element whatever
 * the value, so treating it as an ordinary prop makes `hidden="false"` vanish
 * the component. These stay native everywhere - see the reserved host
 * attributes in FRAMEWORK.md, alongside class, style, aria- and data- names.
 */
export const GLOBAL_BOOLEAN_ATTRS = new Set(['hidden', 'itemscope', 'autofocus', 'inert']);

export function isBooleanAttr(name, isCustomElement) {
    if (GLOBAL_BOOLEAN_ATTRS.has(name)) return BOOLEAN_ATTRS.has(name);
    return !isCustomElement && BOOLEAN_ATTRS.has(name);
}

/**
 * Normalize a *literal* template attribute value before it reaches a DOM sink.
 *
 * Literal text is HTML source, so a native boolean attribute follows HTML: its
 * presence is what counts and `disabled="false"` is still disabled. Everything
 * else passes through unchanged, which is what lets a component receive the
 * exact string the template author wrote.
 *
 * Interpolated ${} values follow JS semantics instead (`${false}` clears the
 * attribute) and must NOT be routed through here.
 */
export function literalAttrValue(name, value, isCustomElement) {
    return isBooleanAttr(name, isCustomElement) ? true : value;
}

/**
 * Normalize a boolean-ish prop value inside a component.
 *
 * The same prop reaches a component in either of two forms: literal template
 * text arrives as a string ("", "true", "false", or the attribute's own name),
 * while an interpolated ${} value keeps its JS type. This collapses both the
 * way an HTML author would expect - a bare `disabled` (empty string, or the
 * attribute name) is true, and only an explicit "false" or a falsy JS value
 * is false.
 *
 * Components must not hand-roll this: `props.x === true` silently fails for
 * every literal, and a bare truthiness test makes the string "false" true.
 */
export function boolProp(value) {
    if (typeof value === 'string') return value !== 'false';
    return !!value;
}
