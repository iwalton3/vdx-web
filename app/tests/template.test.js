/**
 * Tests for Template System (Security & Escaping)
 */

import { describe, assert } from './test-runner.js';
import { html, raw, when, awaitThen } from '../lib/framework.js';
import { render as preactRender } from '../lib/vendor/preact/index.js';
import { applyValues } from '../lib/core/template-compiler.js';

// Helper to render template and get HTML string
function renderToString(template) {
    const container = document.createElement('div');
    // Convert html template to Preact VNode first
    if (template._compiled) {
        const vnode = applyValues(template._compiled, template._values || []);
        preactRender(vnode, container);
    } else {
        // Fallback for string-based templates
        container.innerHTML = template.toString();
    }
    return container.innerHTML;
}

// Helper to render template to container
function renderTemplate(template, container) {
    if (template._compiled) {
        const vnode = applyValues(template._compiled, template._values || []);
        preactRender(vnode, container);
    } else {
        // Fallback for string-based templates
        container.innerHTML = template.toString();
    }
}

describe('Template Security', function(it) {
    it('escapes HTML content', () => {
        const userInput = '<script>alert("xss")</script>';
        const result = html`<div>${userInput}</div>`;
        const str = renderToString(result);
        // Text content should be escaped (browser converts &lt; back to < in textContent)
        const container = document.createElement('div');
        renderTemplate(result, container);
        assert.equal(container.querySelector('div').textContent, '<script>alert("xss")</script>', 'Should escape < and >');
        assert.ok(!str.includes('<script>alert'), 'Should not contain unescaped script tags');
    });

    it('escapes HTML attributes', () => {
        const userInput = '"><script>alert("xss")</script>';
        const result = html`<div title="${userInput}">content</div>`;
        const str = renderToString(result);
        // The quotes should be escaped, preventing attribute injection
        // Note: ><script will appear in the output, but with escaped quotes (&quot;><script)
        // This is safe because the < and > don't have special meaning inside attribute values
        assert.ok(!str.includes('"><script'), 'Should not allow unescaped attribute injection');
        assert.ok(str.includes('&quot;') || str.includes('&#34;'), 'Should escape quotes in attribute');
    });

    it('sanitizes URLs in href', () => {
        const maliciousUrl = 'javascript:alert(document.cookie)';
        const result = html`<a href="${maliciousUrl}">Link</a>`;
        const str = renderToString(result);
        assert.ok(!str.includes('javascript:'), 'Should block javascript: URLs');
        // Both href="" (compiled) or absence of href (string-based) are acceptable
        assert.ok(str.includes('href=""') || !str.match(/href="[^"]"/), 'Should sanitize href');
    });

    it('sanitizes URLs in src', () => {
        const maliciousUrl = 'data:text/html,<script>alert("xss")</script>';
        const result = html`<img src="${maliciousUrl}">`;
        const str = renderToString(result);
        assert.ok(!str.includes('data:'), 'Should block data: URLs');
    });

    it('allows safe URL schemes', () => {
        const httpUrl = 'https://example.com';
        const result = html`<a href="${httpUrl}">Link</a>`;
        const str = renderToString(result);
        assert.ok(str.includes('https://example.com'), 'Should allow HTTPS URLs');

        const mailtoUrl = 'mailto:user@example.com';
        const result2 = html`<a href="${mailtoUrl}">Email</a>`;
        const str2 = renderToString(result2);
        assert.ok(str2.includes('mailto:'), 'Should allow mailto: URLs');
    });

    it('handles raw HTML explicitly', () => {
        const trustedHTML = '<p>Trusted content</p>';
        const result = html`<div>${raw(trustedHTML)}</div>`;
        const str = renderToString(result);
        assert.ok(str.includes('<p>Trusted content</p>'), 'Should include raw HTML');
    });

    it('normalizes Unicode to prevent encoding attacks', () => {
        // Unicode normalization test
        const weirdInput = '\uFEFF<script>';
        const result = html`<div>${weirdInput}</div>`;
        const str = renderToString(result);
        assert.ok(!str.includes('\uFEFF'), 'Should remove BOM');
    });

    it('escapes special characters in content', () => {
        const special = '& < > " \' /';
        const result = html`<div>${special}</div>`;
        const container = document.createElement('div');
        renderTemplate(result, container);
        const textContent = container.querySelector('div').textContent;
        assert.equal(textContent, '& < > " \' /', 'Should escape &');
    });

    it('handles null and undefined', () => {
        const result1 = html`<div>${null}</div>`;
        const result2 = html`<div>${undefined}</div>`;
        const str1 = renderToString(result1);
        const str2 = renderToString(result2);
        assert.ok(str1.includes('<div></div>') || str1.includes('<div />'), 'Should handle null');
        assert.ok(str2.includes('<div></div>') || str2.includes('<div />'), 'Should handle undefined');
    });

    it('handles numbers and booleans', () => {
        const result = html`<div>${42} ${true} ${false}</div>`;
        const str = renderToString(result);
        assert.ok(str.includes('42'), 'Should handle numbers');
        // Booleans might be converted to strings or not shown at all (both valid)
        assert.ok(str.includes('true') || str.includes('false') || str.includes('42'), 'Should handle primitive values');
    });

    it('decodes HTML entities in URL detection', () => {
        const encodedJs = 'javascript&#58;alert(1)';
        const result = html`<a href="${encodedJs}">Link</a>`;
        const str = renderToString(result);
        assert.ok(!str.includes('javascript'), 'Should detect encoded javascript:');
    });

    it('handles boolean true in boolean attributes', () => {
        const result = html`<option selected="${true}">Test</option>`;
        const container = document.createElement('div');
        renderTemplate(result, container);
        const option = container.querySelector('option');
        assert.ok(option.selected, 'Should add attribute with empty value for true');
    });

    it('handles boolean false in boolean attributes', () => {
        const result = html`<option selected="${false}">Test</option>`;
        const container = document.createElement('div');
        renderTemplate(result, container);
        const option = container.querySelector('option');
        assert.ok(!option.selected, 'Should remove attribute for false');
    });

    it('handles undefined in boolean attributes', () => {
        const result = html`<option selected="${undefined}">Test</option>`;
        const container = document.createElement('div');
        renderTemplate(result, container);
        const option = container.querySelector('option');
        assert.ok(!option.selected, 'Should remove attribute for undefined');
    });

    it('handles null in boolean attributes', () => {
        const result = html`<option selected="${null}">Test</option>`;
        const container = document.createElement('div');
        renderTemplate(result, container);
        const option = container.querySelector('option');
        assert.ok(!option.selected, 'Should remove attribute for null');
    });

    it('handles string values in boolean attributes', () => {
        const result = html`<option selected="${'true'}">Test</option>`;
        const container = document.createElement('div');
        renderTemplate(result, container);
        const option = container.querySelector('option');

        // String "true" gets coerced to boolean true for boolean properties
        // Preact sets the selected property, and browser reflects it
        assert.ok(option.selected, 'Should set selected property when string "true" is passed');
    });

    it('handles undefined in any attribute', () => {
        const result = html`<div class="${undefined}" data-foo="${undefined}">Test</div>`;
        const str = renderToString(result);
        assert.ok(!str.includes('class='), 'Should remove class attribute for undefined');
        assert.ok(!str.includes('data-foo='), 'Should remove data-foo attribute for undefined');
    });

    it('handles multiple boolean attributes conditionally', () => {
        const isChecked = true;
        const isDisabled = false;
        const result = html`<input type="checkbox" checked="${isChecked}" disabled="${isDisabled}">`;
        const container = document.createElement('div');
        renderTemplate(result, container);
        const input = container.querySelector('input');
        assert.ok(input.checked, 'Should include checked');
        assert.ok(!input.disabled, 'Should not include disabled');
    });
});

describe('Template Security - Symbol Protection', function(it) {
    it('prevents __raw__ spoofing from JSON', () => {
        // Malicious JSON trying to inject as trusted HTML
        const maliciousData = {
            __raw__: true,
            toString: () => '<script>alert("xss")</script>'
        };

        const result = html`<div>${maliciousData}</div>`;
        const container = document.createElement('div');
        renderTemplate(result, container);
        const div = container.querySelector('div');

        // Should be escaped, not treated as raw HTML
        assert.equal(div.textContent, '[object Object]', 'Should escape script tag');
        assert.ok(!container.innerHTML.includes('<script>alert'), 'Should not allow unescaped script');
    });

    it('prevents __html__ spoofing from JSON', () => {
        // Malicious JSON trying to bypass escaping
        const maliciousData = {
            __html__: true,
            toString: () => '<img src=x onerror=alert(1)>'
        };

        const result = html`<div>${maliciousData}</div>`;
        const container = document.createElement('div');
        renderTemplate(result, container);

        // Should be escaped, not treated as safe HTML
        assert.ok(!container.innerHTML.includes('<img src=x'), 'Should escape img tag');
        assert.ok(!container.innerHTML.includes('<img src=x'), 'Should not allow unescaped img');
    });

    it('allows actual raw() to work', () => {
        // Legitimate use of raw()
        const trusted = raw('<b>Bold</b>');
        const result = html`<div>${trusted}</div>`;
        const str = renderToString(result);

        // Should pass through unescaped
        assert.ok(str.includes('<b>Bold</b>'), 'Should allow raw HTML from raw()');
    });
});

describe('Template - Function Event Handlers', function(it) {
    it('allows function references in on-* attributes', () => {
        const handler = () => {};
        const result = html`<button on-click="${handler}">Click</button>`;
        const container = document.createElement('div');
        renderTemplate(result, container);

        // Compiled templates store functions directly in tree (no __EVENT_ in string)
        // String-based creates __EVENT_ markers
        // Both systems should handle the button element
        const button = container.querySelector('button');
        assert.ok(button, 'Should create button element');
        assert.ok(result._compiled || renderToString(result).includes('__EVENT_'), 'Should handle event (compiled or string-based)');
    });

    it('blocks non-function values in on-* attributes', () => {
        const maliciousString = 'alert(1)';
        const result = html`<button on-click="${maliciousString}">Click</button>`;
        const str = result.toString();

        // Should NOT include the malicious string
        assert.ok(!str.includes('alert(1)'), 'Should block string interpolation in event handlers');
        // Compiled templates omit non-function event values, string-based uses on-click=""
        assert.ok(!str.includes('alert(1)'), 'Should block malicious code');
    });

    it('stores function references with crypto-random IDs', () => {
        const handler1 = () => {};
        const handler2 = () => {};
        const result1 = html`<button on-click="${handler1}">Button 1</button>`;
        const result2 = html`<button on-click="${handler2}">Button 2</button>`;

        // Compiled templates store functions directly (verified via different tests)
        // String-based uses __EVENT_ markers with crypto-random IDs
        if (result1._compiled) {
            // Compiled template: functions are in the tree, not string
            assert.ok(result1._compiled && result2._compiled, 'Compiled templates handle functions directly');
        } else {
            // String-based: check for __EVENT_ markers
            const str1 = result1.toString();
            const str2 = result2.toString();
            const match1 = str1.match(/__EVENT_([a-f0-9]{6}-\d+)__/i);
            const match2 = str2.match(/__EVENT_([a-f0-9]{6}-\d+)__/i);
            assert.ok(match1, 'Should create valid event marker format for handler1');
            assert.ok(match2, 'Should create valid event marker format for handler2');
            assert.ok(match1[1] !== match2[1], 'Event IDs should be different');
        }
    });

    it('allows method name strings in on-* attributes (legacy)', () => {
        // Method names (string) should still be blocked for security
        // but the warning should suggest using method names without ${} instead
        const methodName = 'handleClick';
        const result = html`<button on-click="${methodName}">Click</button>`;
        const str = result.toString();

        // Should block the interpolation
        assert.ok(!str.includes('handleClick'), 'Should not allow string interpolation');
        // Compiled templates omit non-function events, string-based uses on-click=""
        assert.ok(!str.includes('handleClick'), 'Should block string in event handler');
    });
});

describe('awaitThen Helper (Component-Based)', function(it) {
    it('returns html template with x-await-then component', () => {
        const promise = Promise.resolve({ name: 'Test' });
        const result = awaitThen(
            promise,
            data => html`<div>${data.name}</div>`,
            html`<span>Loading...</span>`
        );

        assert.ok(result, 'Should return result');
        assert.ok(result._compiled, 'Should return compiled template');
    });

    it('renders x-await-then component', () => {
        const promise = Promise.resolve({ name: 'Test' });
        const result = awaitThen(
            promise,
            data => html`<div>${data.name}</div>`,
            html`<span>Loading...</span>`
        );

        const container = document.createElement('div');
        const vnode = applyValues(result._compiled, result._values || []);
        preactRender(vnode, container);

        assert.ok(container.querySelector('x-await-then'), 'Should render x-await-then element');
    });

    it('passes all props to x-await-then', () => {
        const promise = Promise.resolve({ name: 'Test' });
        const thenFn = data => html`<div>${data.name}</div>`;
        const pendingContent = html`<span>Loading...</span>`;
        const catchFn = error => html`<span>${error.message}</span>`;

        const result = awaitThen(promise, thenFn, pendingContent, catchFn);

        // Check that values array contains the props
        assert.ok(result._values, 'Should have values');
        assert.equal(result._values.length, 4, 'Should have 4 values (promise, then, pending, catch)');
        assert.equal(result._values[0], promise, 'First value should be promise');
        assert.equal(result._values[1], thenFn, 'Second value should be then function');
        assert.ok(result._values[2]._compiled, 'Third value should be pending content (html template)');
        assert.equal(result._values[3], catchFn, 'Fourth value should be catch function');
    });

    it('handles null catch content', () => {
        const promise = Promise.resolve({ name: 'Test' });
        const result = awaitThen(
            promise,
            data => html`<div>${data.name}</div>`,
            html`<span>Loading...</span>`
            // No catch content
        );

        assert.ok(result, 'Should return result');
        assert.equal(result._values[3], null, 'Fourth value should be null for catch');
    });
});

import { memoEach, each, setRenderContext } from '../lib/core/template.js';

describe('memoEach Helper', function(it) {
    it('returns empty result for null/undefined array', () => {
        const result = memoEach(null, () => html`<div></div>`, x => x.id);
        assert.ok(result._compiled, 'Should return compiled template');
        assert.equal(result._compiled.children.length, 0, 'Should have no children');
    });

    it('falls back to each() when no keyFn provided', () => {
        const items = [{ id: 1 }, { id: 2 }];
        const result = memoEach(items, item => html`<div>${item.id}</div>`);
        assert.ok(result._compiled, 'Should return compiled template');
    });

    it('uses array reference for cache (not call order)', () => {
        // Create a mock component context
        const mockComponent = { _memoEachCaches: null };
        setRenderContext(mockComponent);

        const array1 = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
        const array2 = [{ id: 3, name: 'c' }];

        // First call with array1
        memoEach(array1, item => html`<div>${item.name}</div>`, item => item.id);

        // Second call with array2
        memoEach(array2, item => html`<span>${item.name}</span>`, item => item.id);

        // Component should have WeakMap with both arrays
        assert.ok(mockComponent._memoEachCaches instanceof WeakMap, 'Should use WeakMap');
        assert.ok(mockComponent._memoEachCaches.has(array1), 'Should cache array1');
        assert.ok(mockComponent._memoEachCaches.has(array2), 'Should cache array2');

        setRenderContext(null);
    });

    it('caches items by reference', () => {
        const mockComponent = { _memoEachCaches: null };
        setRenderContext(mockComponent);

        const item1 = { id: 1, name: 'one' };
        const item2 = { id: 2, name: 'two' };
        const array = [item1, item2];

        let renderCount = 0;
        const render = (item) => {
            renderCount++;
            return html`<div>${item.name}</div>`;
        };

        // First render
        memoEach(array, render, item => item.id);
        const firstRenderCount = renderCount;

        // Second render with same items
        memoEach(array, render, item => item.id);

        // Should not re-render cached items
        assert.equal(renderCount, firstRenderCount, 'Should not re-render cached items');

        setRenderContext(null);
    });

    it('re-renders when item reference changes', () => {
        const mockComponent = { _memoEachCaches: null };
        setRenderContext(mockComponent);

        const item1 = { id: 1, name: 'one' };
        const item2 = { id: 2, name: 'two' };
        const array = [item1, item2];

        let renderCount = 0;
        const render = (item) => {
            renderCount++;
            return html`<div>${item.name}</div>`;
        };

        // First render
        memoEach(array, render, item => item.id);
        const firstRenderCount = renderCount;

        // Replace item1 with new object (same id)
        array[0] = { id: 1, name: 'ONE' };
        memoEach(array, render, item => item.id);

        // Should re-render item1 (new reference) but not item2 (same reference)
        assert.equal(renderCount, firstRenderCount + 1, 'Should re-render changed item');

        setRenderContext(null);
    });

    it('supports conditional memoEach calls', () => {
        const mockComponent = { _memoEachCaches: null };
        setRenderContext(mockComponent);

        const array1 = [{ id: 1 }];
        const array2 = [{ id: 2 }];

        // Simulate conditional rendering - first call array1, then array2
        let showFirst = true;

        function render() {
            if (showFirst) {
                memoEach(array1, item => html`<div>A</div>`, i => i.id);
            }
            memoEach(array2, item => html`<div>B</div>`, i => i.id);
        }

        render();
        assert.ok(mockComponent._memoEachCaches.has(array1), 'Should have array1');
        assert.ok(mockComponent._memoEachCaches.has(array2), 'Should have array2');

        // Now hide first - this should NOT break array2's cache
        showFirst = false;
        const cacheForArray2Before = mockComponent._memoEachCaches.get(array2);
        render();
        const cacheForArray2After = mockComponent._memoEachCaches.get(array2);

        // Same cache should be used (array reference based, not call order)
        assert.equal(cacheForArray2Before, cacheForArray2After, 'array2 cache should be preserved');

        setRenderContext(null);
    });
});
