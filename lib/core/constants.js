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
    'formnovalidate', 'itemscope'
]);
