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

// Boolean attributes that should be set as properties (not string attributes)
export const BOOLEAN_ATTRS = new Set([
    'disabled', 'checked', 'selected', 'readonly', 'required',
    'multiple', 'autofocus', 'autoplay', 'controls', 'loop',
    'muted', 'open', 'reversed', 'hidden', 'async', 'defer',
    'ismap', 'declare', 'noresize', 'nowrap', 'noshade', 'compact',
    'default', 'scoped', 'seamless', 'sortable', 'novalidate',
    'formnovalidate', 'itemscope'
]);
