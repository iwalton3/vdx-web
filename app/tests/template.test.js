/**
 * Tests for Template System (Security & Escaping)
 */

import { describe, assert } from './test-runner.js';
import { html, raw } from '../core/template.js';

describe('Template Security', function(it) {
    it('escapes HTML content', () => {
        const userInput = '<script>alert("xss")</script>';
        const result = html`<div>${userInput}</div>`;
        assert.ok(result.toString().includes('&lt;script&gt;'), 'Should escape < and >');
        assert.ok(!result.toString().includes('<script>'), 'Should not contain unescaped script tags');
    });

    it('escapes HTML attributes', () => {
        const userInput = '"><script>alert("xss")</script>';
        const result = html`<div title="${userInput}">content</div>`;
        assert.ok(result.toString().includes('&quot;'), 'Should escape quotes');
        assert.ok(!result.toString().includes('"><script'), 'Should not allow attribute injection');
    });

    it('sanitizes URLs in href', () => {
        const maliciousUrl = 'javascript:alert(document.cookie)';
        const result = html`<a href="${maliciousUrl}">Link</a>`;
        assert.ok(!result.toString().includes('javascript:'), 'Should block javascript: URLs');
        assert.ok(result.toString().includes('href=""'), 'Should result in empty href');
    });

    it('sanitizes URLs in src', () => {
        const maliciousUrl = 'data:text/html,<script>alert("xss")</script>';
        const result = html`<img src="${maliciousUrl}">`;
        assert.ok(!result.toString().includes('data:'), 'Should block data: URLs');
    });

    it('allows safe URL schemes', () => {
        const httpUrl = 'https://example.com';
        const result = html`<a href="${httpUrl}">Link</a>`;
        assert.ok(result.toString().includes('https://example.com'), 'Should allow HTTPS URLs');

        const mailtoUrl = 'mailto:user@example.com';
        const result2 = html`<a href="${mailtoUrl}">Email</a>`;
        assert.ok(result2.toString().includes('mailto:'), 'Should allow mailto: URLs');
    });

    it('handles raw HTML explicitly', () => {
        const trustedHTML = '<p>Trusted content</p>';
        const result = html`<div>${raw(trustedHTML)}</div>`;
        assert.ok(result.toString().includes('<p>Trusted content</p>'), 'Should include raw HTML');
    });

    it('normalizes Unicode to prevent encoding attacks', () => {
        // Unicode normalization test
        const weirdInput = '\uFEFF<script>';
        const result = html`<div>${weirdInput}</div>`;
        assert.ok(!result.toString().includes('\uFEFF'), 'Should remove BOM');
    });

    it('escapes special characters in content', () => {
        const special = '& < > " \' /';
        const result = html`<div>${special}</div>`;
        assert.ok(result.toString().includes('&amp;'), 'Should escape &');
        assert.ok(result.toString().includes('&lt;'), 'Should escape <');
        assert.ok(result.toString().includes('&gt;'), 'Should escape >');
        assert.ok(result.toString().includes('&quot;'), 'Should escape "');
    });

    it('handles null and undefined', () => {
        const result1 = html`<div>${null}</div>`;
        const result2 = html`<div>${undefined}</div>`;
        assert.ok(result1.toString().includes('<div></div>'), 'Should handle null');
        assert.ok(result2.toString().includes('<div></div>'), 'Should handle undefined');
    });

    it('handles numbers and booleans', () => {
        const result = html`<div>${42} ${true} ${false}</div>`;
        assert.ok(result.toString().includes('42'), 'Should handle numbers');
        assert.ok(result.toString().includes('true'), 'Should handle booleans');
    });

    it('decodes HTML entities in URL detection', () => {
        const encodedJs = 'javascript&#58;alert(1)';
        const result = html`<a href="${encodedJs}">Link</a>`;
        assert.ok(!result.toString().includes('javascript'), 'Should detect encoded javascript:');
    });

    it('handles boolean true in boolean attributes', () => {
        const result = html`<option selected="${true}">Test</option>`;
        const str = result.toString();
        assert.ok(str.includes('selected=""'), 'Should add attribute with empty value for true');
        assert.ok(!str.includes('selected="true"'), 'Should not stringify boolean true');
    });

    it('handles boolean false in boolean attributes', () => {
        const result = html`<option selected="${false}">Test</option>`;
        const str = result.toString();
        assert.ok(!str.includes('selected'), 'Should remove attribute for false');
    });

    it('handles undefined in boolean attributes', () => {
        const result = html`<option selected="${undefined}">Test</option>`;
        const str = result.toString();
        assert.ok(!str.includes('selected'), 'Should remove attribute for undefined');
    });

    it('handles null in boolean attributes', () => {
        const result = html`<option selected="${null}">Test</option>`;
        const str = result.toString();
        assert.ok(!str.includes('selected'), 'Should remove attribute for null');
    });

    it('handles string values in boolean attributes', () => {
        const result = html`<option selected="${'true'}">Test</option>`;
        const str = result.toString();
        assert.ok(str.includes('selected="true"'), 'Should keep string "true" as-is');
    });

    it('handles undefined in any attribute', () => {
        const result = html`<div class="${undefined}" data-foo="${undefined}">Test</div>`;
        const str = result.toString();
        assert.ok(!str.includes('class='), 'Should remove class attribute for undefined');
        assert.ok(!str.includes('data-foo='), 'Should remove data-foo attribute for undefined');
    });

    it('handles multiple boolean attributes conditionally', () => {
        const isChecked = true;
        const isDisabled = false;
        const result = html`<input type="checkbox" checked="${isChecked}" disabled="${isDisabled}">`;
        const str = result.toString();
        assert.ok(str.includes('checked=""'), 'Should include checked');
        assert.ok(!str.includes('disabled'), 'Should not include disabled');
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
        const str = result.toString();

        // Should be escaped, not treated as raw HTML
        assert.ok(str.includes('&lt;script'), 'Should escape script tag');
        assert.ok(!str.includes('<script>'), 'Should not allow unescaped script');
    });

    it('prevents __html__ spoofing from JSON', () => {
        // Malicious JSON trying to bypass escaping
        const maliciousData = {
            __html__: true,
            toString: () => '<img src=x onerror=alert(1)>'
        };

        const result = html`<div>${maliciousData}</div>`;
        const str = result.toString();

        // Should be escaped, not treated as safe HTML
        assert.ok(str.includes('&lt;img'), 'Should escape img tag');
        assert.ok(!str.includes('<img src=x'), 'Should not allow unescaped img');
    });

    it('allows actual raw() to work', () => {
        // Legitimate use of raw()
        const trusted = raw('<b>Bold</b>');
        const result = html`<div>${trusted}</div>`;
        const str = result.toString();

        // Should pass through unescaped
        assert.ok(str.includes('<div><b>Bold</b></div>'), 'Should allow raw HTML from raw()');
    });
});

describe('Template - Function Event Handlers', function(it) {
    it('allows function references in on-* attributes', () => {
        const handler = () => {};
        const result = html`<button on-click="${handler}">Click</button>`;
        const str = result.toString();

        // Should create an event marker
        assert.ok(str.includes('__EVENT_'), 'Should create event marker');
        assert.ok(str.includes('on-click='), 'Should preserve on-click attribute');
    });

    it('blocks non-function values in on-* attributes', () => {
        const maliciousString = 'alert(1)';
        const result = html`<button on-click="${maliciousString}">Click</button>`;
        const str = result.toString();

        // Should NOT include the malicious string
        assert.ok(!str.includes('alert(1)'), 'Should block string interpolation in event handlers');
        assert.ok(str.includes('on-click=""'), 'Should result in empty attribute value');
    });

    it('stores function references with crypto-random IDs', () => {
        const handler1 = () => {};
        const handler2 = () => {};
        const result1 = html`<button on-click="${handler1}">Button 1</button>`;
        const result2 = html`<button on-click="${handler2}">Button 2</button>`;
        const str1 = result1.toString();
        const str2 = result2.toString();

        // Should have different event IDs
        assert.ok(str1 !== str2, 'Different functions should get different IDs');

        // Extract the IDs
        const match1 = str1.match(/__EVENT_([a-f0-9]{6}-\d+)__/i);
        const match2 = str2.match(/__EVENT_([a-f0-9]{6}-\d+)__/i);

        assert.ok(match1, 'Should create valid event marker format for handler1');
        assert.ok(match2, 'Should create valid event marker format for handler2');
        assert.ok(match1[1] !== match2[1], 'Event IDs should be different');
    });

    it('allows method name strings in on-* attributes (legacy)', () => {
        // Method names (string) should still be blocked for security
        // but the warning should suggest using method names without ${} instead
        const methodName = 'handleClick';
        const result = html`<button on-click="${methodName}">Click</button>`;
        const str = result.toString();

        // Should block the interpolation
        assert.ok(!str.includes('handleClick'), 'Should not allow string interpolation');
        assert.ok(str.includes('on-click=""'), 'Should result in empty attribute');
    });
});
