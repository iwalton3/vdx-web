/**
 * Shared constants for the VDX framework core
 * @module core/constants
 */

// Boolean attributes that should be set as properties (not string attributes)
export const BOOLEAN_ATTRS = new Set([
    'disabled', 'checked', 'selected', 'readonly', 'required',
    'multiple', 'autofocus', 'autoplay', 'controls', 'loop',
    'muted', 'open', 'reversed', 'hidden', 'async', 'defer',
    'ismap', 'declare', 'noresize', 'nowrap', 'noshade', 'compact',
    'default', 'scoped', 'seamless', 'sortable', 'novalidate',
    'formnovalidate', 'itemscope'
]);
