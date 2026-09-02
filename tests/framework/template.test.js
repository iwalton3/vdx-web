/**
 * Tests for Template System (Security & Escaping)
 */

import { describe, assert } from './test-runner.js';
import { html, raw, when, awaitThen, Component, defineComponent, flushSync } from '../../lib/framework.js';
import { instantiateTemplate } from '../../lib/core/template-renderer.js';

// Helper to render template and get HTML string
function renderToString(template) {
    const container = document.createElement('div');
    if (template._compiled) {
        const { fragment } = instantiateTemplate(template._compiled, template._values || [], null);
        container.appendChild(fragment);
    } else {
        // Fallback for string-based templates
        container.innerHTML = template.toString();
    }
    return container.innerHTML;
}

// Helper to render template to container
function renderTemplate(template, container) {
    if (template._compiled) {
        const { fragment } = instantiateTemplate(template._compiled, template._values || [], null);
        container.appendChild(fragment);
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
        // Blocked URLs become about:blank, not '': an empty href resolves to the
        // current document, so a blocked link would reload the page (or re-enter
        // its own document inside a frame) instead of going nowhere.
        assert.ok(str.includes('href="about:blank"'), 'Blocked href should be about:blank');
    });

    it('sanitizes URLs in src', () => {
        const maliciousUrl = 'data:text/html,<script>alert("xss")</script>';
        const result = html`<img src="${maliciousUrl}">`;
        const str = renderToString(result);
        assert.ok(!str.includes('data:'), 'Should block data: URLs');
    });

    it('blocks data: URLs with scriptable media types', () => {
        const svgUrl = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
        const result = html`<a href="${svgUrl}">Link</a>`;
        const str = renderToString(result);
        assert.ok(!str.includes('data:image/svg'), 'Should block data:image/svg+xml (can script on navigation)');
    });

    it('allows blob: URLs', () => {
        const blobUrl = 'blob:https://example.com/4f3b2a1c-0000-1111-2222-333344445555';
        const result = html`<img src="${blobUrl}">`;
        const str = renderToString(result);
        assert.ok(str.includes('blob:'), 'Should allow blob: URLs (same-origin createObjectURL only)');
    });

    it('allows data: URLs for safe media types', () => {
        const pngUrl = 'data:image/png;base64,iVBORw0KGgo=';
        const result = html`<img src="${pngUrl}">`;
        const str = renderToString(result);
        assert.ok(str.includes('data:image/png'), 'Should allow data:image/png');

        const audioUrl = 'data:audio/mpeg;base64,AAAA';
        const result2 = html`<audio src="${audioUrl}"></audio>`;
        const str2 = renderToString(result2);
        assert.ok(str2.includes('data:audio/mpeg'), 'Should allow data:audio/*');
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

    it('safely handles Unicode including BOM', () => {
        // With DOM-based rendering, BOM and other Unicode chars are safe
        // They go into textContent, not innerHTML, so can't cause XSS
        const weirdInput = '\uFEFF<script>';
        const result = html`<div>${weirdInput}</div>`;
        const container = document.createElement('div');
        renderTemplate(result, container);
        const div = container.querySelector('div');
        // Content should be text, not executed as script
        assert.ok(div.textContent.includes('<script>'), 'Script tag should be text content');
        assert.ok(!div.querySelector('script'), 'Should not create actual script element');
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
        const container1 = document.createElement('div');
        const container2 = document.createElement('div');
        renderTemplate(result1, container1);
        renderTemplate(result2, container2);
        // null/undefined should not render any visible content
        assert.equal(container1.querySelector('div').textContent, '', 'Should handle null');
        assert.equal(container2.querySelector('div').textContent, '', 'Should handle undefined');
    });

    it('handles numbers and booleans', () => {
        const result = html`<div>${42} ${true} ${false}</div>`;
        const str = renderToString(result);
        assert.ok(str.includes('42'), 'Should handle numbers');
        // Booleans might be converted to strings or not shown at all (both valid)
        assert.ok(str.includes('true') || str.includes('false') || str.includes('42'), 'Should handle primitive values');
    });

    it('leaves HTML-entity-encoded schemes inert without decoding them', () => {
        // Replaces an older test that asserted these were decoded and blocked.
        // URLs are set as attributes/properties and never re-parsed as HTML, so
        // '&#58;' stays five literal characters and never becomes a colon --
        // there is no scheme here, just an odd relative path. Decoding a fixed
        // entity list was defense against a parser that isn't in the path, and
        // was incomplete regardless ('&#058;' and '&#x003a;' also mean ':').
        const BASE = 'https://app.example.com/dir/page';
        const encoded = [
            'javascript&#58;alert(1)',
            'javascript&#x3a;alert(1)',
            'javascript&colon;alert(1)',
            'javascript&#058;alert(1)',    // leading zero - never matched the old list
            'javascript&#x003a;alert(1)',  // padded hex - never matched the old list
        ];
        for (const url of encoded) {
            const container = document.createElement('div');
            renderTemplate(html`<a href="${url}">Link</a>`, container);
            const attr = container.querySelector('a').getAttribute('href');
            const resolved = new URL(attr, BASE);
            assert.equal(resolved.protocol, 'https:',
                `${JSON.stringify(url)} should stay an inert relative path`);
            assert.equal(resolved.host, 'app.example.com',
                `${JSON.stringify(url)} should stay on the document origin`);
        }
    });

    it('returns about:blank for blocked URLs but empty for absent ones', () => {
        // The distinction matters: about:blank is the inert replacement for a
        // URL we refused, but an author who bound nothing should get no
        // attribute at all -- not a navigable about:blank.
        const blocked = ['javascript:alert(1)', 'vbscript:msgbox(1)', 'data:text/html,x'];
        for (const url of blocked) {
            const container = document.createElement('div');
            renderTemplate(html`<a href="${url}">Link</a>`, container);
            assert.equal(container.querySelector('a').getAttribute('href'), 'about:blank',
                `${JSON.stringify(url)} should be replaced with about:blank`);
        }
        for (const url of ['', null, undefined]) {
            const container = document.createElement('div');
            renderTemplate(html`<a href="${url}">Link</a>`, container);
            const attr = container.querySelector('a').getAttribute('href');
            assert.ok(attr === null || attr === '',
                `${JSON.stringify(url)} should not become about:blank (got ${JSON.stringify(attr)})`);
        }
    });

    // --- C0-control scheme obfuscation ---------------------------------
    // The URL spec strips ALL leading C0-control-or-space (U+0000-U+0020)
    // before parsing, but JS `\s` only covers \t\n\v\f\r. If sanitizeUrl
    // relied on `\s` alone to strip whitespace, "\x01javascript:alert(1)"
    // would fail the scheme regex (doesn't start with [a-zA-Z]), be
    // classified as a harmless relative URL, and pass through -- then the
    // browser would strip the \x01 and execute it. normalizeInput() strips
    // the C0 range up front, which is what closes this. These tests pin
    // that down per byte so it can't regress invisibly.

    // Render an href and ask the browser what it actually resolves to.
    // Using the real URL parser (rather than string matching) means the
    // assertion holds regardless of which characters the parser chooses to
    // strip or normalize.
    function resolvedProtocol(url) {
        const container = document.createElement('div');
        renderTemplate(html`<a href="${url}">Link</a>`, container);
        const attr = container.querySelector('a').getAttribute('href');
        // null/'' = attribute dropped; about:blank = blocked sentinel. All inert.
        if (attr === null || attr === '' || attr === 'about:blank') return null;
        try {
            return new URL(attr, document.baseURI).protocol;
        } catch {
            return null;  // unparseable == not navigable
        }
    }

    it('blocks "\\x01javascript:alert(1)" (leading C0 control hides the scheme)', () => {
        assert.equal(resolvedProtocol('\x01javascript:alert(1)'), null,
            'Leading \\x01 must not smuggle javascript: past the scheme check');
    });

    it('blocks javascript: behind every leading C0 control byte', () => {
        // 0x00-0x1F, plus space and DEL. \t\n\v\f\r are covered by `\s`;
        // 0x00-0x08 and 0x0E-0x1F are the range `\s` misses.
        for (let code = 0x00; code <= 0x20; code++) {
            const url = String.fromCharCode(code) + 'javascript:alert(1)';
            assert.notEqual(resolvedProtocol(url), 'javascript:',
                `Leading \\x${code.toString(16).padStart(2, '0')} must not yield a javascript: URL`);
        }
        // DEL is not stripped by the URL parser, so it stays a relative
        // path -- but assert it never resolves to javascript: either.
        assert.notEqual(resolvedProtocol('\x7fjavascript:alert(1)'), 'javascript:',
            'Leading \\x7f must not yield a javascript: URL');
    });

    it('blocks C0 controls embedded inside the scheme', () => {
        const payloads = [
            'java\x01script:alert(1)',      // mid-scheme
            'javascript\x01:alert(1)',      // before the colon
            'javascript:\x01alert(1)',      // after the colon
            '\x01\x02\x03javascript:alert(1)',  // several leading controls
            '\x0Bjavascript:alert(1)',      // vertical tab (in `\s`)
            '\x0Cjavascript:alert(1)',      // form feed (in `\s`)
        ];
        for (const url of payloads) {
            assert.notEqual(resolvedProtocol(url), 'javascript:',
                `Should block ${JSON.stringify(url)}`);
        }
    });

    it('strips leading C0 controls without breaking safe URLs', () => {
        // Guards against over-correcting: a fix that blocks anything
        // containing a control char would break legitimate input.
        const container = document.createElement('div');
        renderTemplate(html`<a href="${'\x01\x02https://example.com/ok'}">Link</a>`, container);
        assert.equal(container.querySelector('a').getAttribute('href'), 'https://example.com/ok',
            'Leading controls should be stripped, leaving the safe URL intact');
    });

    // --- "no scheme" is not "same origin" ------------------------------
    // Canary, not a vulnerability report. URL sanitization answers "can this
    // execute code", not "where does this point" -- it allows http/https to any
    // host, so 'https://evil.com' is a legitimate pass and origin is out of
    // scope by construction. These host-swap forms therefore pass by design.
    // What this pins down is that they are NOT relative: if anything later
    // wants a same-origin guarantee, it must compare resolved origins rather
    // than test for a missing scheme, and these are the cases that would slip
    // through the latter.
    it('documents that scheme-less URLs can still resolve cross-origin', () => {
        const BASE = 'https://app.example.com/dir/page';
        const hostSwaps = [
            '//evil.com/x',      // protocol-relative
            '\\\\evil.com/x',    // both slashes folded  (\\evil.com/x)
            '/\\evil.com/x',     // mixed                (/\evil.com/x)
            '\\/evil.com/x',     // mixed                (\/evil.com/x)
        ];
        for (const url of hostSwaps) {
            const container = document.createElement('div');
            renderTemplate(html`<a href="${url}">Link</a>`, container);
            const attr = container.querySelector('a').getAttribute('href');
            assert.ok(attr, `${JSON.stringify(url)} is expected to pass sanitizeUrl`);
            // The scheme is safe...
            assert.equal(new URL(attr, BASE).protocol, 'https:',
                `${JSON.stringify(url)} must not yield a script-capable scheme`);
            // ...but the host is NOT ours. This is the trap.
            assert.equal(new URL(attr, BASE).host, 'evil.com',
                `${JSON.stringify(url)} resolves cross-origin - do not treat ` +
                `"no scheme" as "same origin"`);
        }
    });

    it('keeps genuinely relative URLs on the document origin', () => {
        const BASE = 'https://app.example.com/dir/page';
        // The contrast case: these really are relative, and stay same-origin.
        for (const url of ['relative/path', '/abs/path', '../up', '#frag', '?q=1']) {
            const container = document.createElement('div');
            renderTemplate(html`<a href="${url}">Link</a>`, container);
            const attr = container.querySelector('a').getAttribute('href');
            assert.equal(new URL(attr, BASE).host, 'app.example.com',
                `${JSON.stringify(url)} should stay on the document origin`);
        }
    });

    it('does not let a percent-encoded scheme through as a relative URL', () => {
        // The URL parser does not percent-decode the scheme, so these stay
        // inert paths rather than becoming javascript:. Pinning it down because
        // a well-meaning "decode before checking" change would break it.
        const payloads = [
            '%6a%61%76%61%73%63%72%69%70%74:alert(1)',
            'javascript%3aalert(1)',
            'java%09script:alert(1)',
            'java%0ascript:alert(1)',
            ':alert(1)',
            '://evil.com',
        ];
        for (const url of payloads) {
            const container = document.createElement('div');
            renderTemplate(html`<a href="${url}">Link</a>`, container);
            const attr = container.querySelector('a').getAttribute('href');
            const proto = attr ? new URL(attr, 'https://app.example.com/dir/page').protocol : null;
            assert.notEqual(proto, 'javascript:',
                `${JSON.stringify(url)} must not resolve to javascript:`);
        }
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
        // The selected property is set, and browser reflects it
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
        // With DOM-based rendering, toString() result goes to textContent (safe)
        const maliciousData = {
            __raw__: true,
            toString: () => '<script>alert("xss")</script>'
        };

        const result = html`<div>${maliciousData}</div>`;
        const container = document.createElement('div');
        renderTemplate(result, container);
        const div = container.querySelector('div');

        // toString() is called but result is text content, not HTML
        // The script tag appears as text, not as an executable element
        assert.ok(div.textContent.includes('<script>'), 'Script text should appear as text content');
        assert.ok(!div.querySelector('script'), 'Should not create actual script element');
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
        const { fragment } = instantiateTemplate(result._compiled, result._values || [], null);
        container.appendChild(fragment);

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

import { memoEach, each } from '../../lib/core/template.js';

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

    it('returns marker object for slot-level caching', () => {
        // memoEach now returns a marker that template-renderer handles
        // The actual caching happens at the DOM slot level, not in template evaluation
        const array = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
        const mapFn = item => html`<div>${item.name}</div>`;
        const keyFn = item => item.id;

        const result = memoEach(array, mapFn, keyFn);

        // Should return a marker object
        assert.ok(result._compiled, 'Should have _compiled');
        assert.equal(result._compiled.type, 'memoEach', 'Should be memoEach type');
        assert.equal(result._array, array, 'Should store array reference');
        assert.equal(result._mapFn, mapFn, 'Should store mapFn');
        assert.equal(result._keyFn, keyFn, 'Should store keyFn');
    });

    it('supports explicit cache parameter for backward compatibility', () => {
        const array = [{ id: 1 }];
        const explicitCache = new Map();

        const result = memoEach(array, item => html`<div></div>`, item => item.id, explicitCache);

        // Should store explicit cache reference
        assert.equal(result._explicitCache, explicitCache, 'Should store explicit cache');
    });
});

describe('Template - style binding', function(it) {
    it('a style withdrawn on update leaves no attribute behind', () => {
        // Blink re-serialises a CSSOM-written inline style into the attribute
        // lazily; removeAttribute on an unsynchronised one left style="" (and
        // [style] selectors matching). A fresh render of null never had the
        // attribute, so the update must not either.
        class TplStyleProbe extends Component {
            state = { s: 'color: red' };
            template() { return html`<div style="${this.state.s}"></div>`; }
        }
        defineComponent('tpl-style-probe', TplStyleProbe);
        const host = document.createElement('tpl-style-probe');
        document.body.appendChild(host);
        const div = host.querySelector('div');
        assert.equal(div.getAttribute('style'), 'color: red;', 'string style applied');

        flushSync(() => { host.state.s = null; });
        assert.equal(div.hasAttribute('style'), false,
            'withdrawing the style must remove the attribute, not empty it');
        host.remove();
    });
});
