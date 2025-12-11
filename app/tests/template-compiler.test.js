/**
 * Tests for Template Compiler System
 *
 * Note: These tests focus on BEHAVIOR (correct output) rather than internal structure.
 * The compiler's internal representation is an implementation detail that may change.
 */

import { describe, assert } from './test-runner.js';
import { compileTemplate, applyValues, clearTemplateCache, getTemplateCacheSize } from '../lib/core/template-compiler.js';
import { defineComponent, html } from '../lib/framework.js';
import { render as preactRender } from '../lib/vendor/preact/index.js';

// Define a simple test custom element
defineComponent('x-component', {
    props: {
        data: {}
    },
    template() {
        return html`<div>Data Component</div>`;
    }
});

// Helper to render template to container
function renderTemplate(template, container) {
    if (template._compiled) {
        const vnode = applyValues(template._compiled, template._values || []);
        preactRender(vnode, container);
    } else if (template && typeof template === 'object' && template.toString) {
        // Fallback for string-based templates
        container.innerHTML = template.toString();
    }
}

describe('Template Compiler', function(it) {
    it('compiles static template', () => {
        clearTemplateCache();
        const strings = ['<div>Hello World</div>'];
        const compiled = compileTemplate(strings);

        assert.ok(compiled, 'Should return compiled template');

        // Test behavior: renders correctly
        const container = document.createElement('div');
        const vnode = applyValues(compiled, []);
        preactRender(vnode, container);
        assert.equal(container.textContent, 'Hello World', 'Should render Hello World');
    });

    it('caches compiled templates', () => {
        clearTemplateCache();
        const strings = ['<div>Test</div>'];

        const compiled1 = compileTemplate(strings);
        const compiled2 = compileTemplate(strings);

        assert.equal(compiled1, compiled2, 'Should return same cached instance');
        assert.equal(getTemplateCacheSize(), 1, 'Should have 1 cached template');
    });

    it('compiles template with text slot', () => {
        const strings = ['<div>', '</div>'];
        const compiled = compileTemplate(strings);

        assert.ok(compiled, 'Should compile');

        // Test behavior: slot value is interpolated
        const container = document.createElement('div');
        const vnode = applyValues(compiled, ['Hello Slot']);
        preactRender(vnode, container);
        assert.equal(container.textContent, 'Hello Slot', 'Should render slot value');
    });

    it('compiles template with attribute slot', () => {
        const strings = ['<div class="', '">Content</div>'];
        const compiled = compileTemplate(strings);

        // Test behavior: attribute is applied
        const container = document.createElement('div');
        const vnode = applyValues(compiled, ['my-class']);
        preactRender(vnode, container);

        const div = container.querySelector('div');
        assert.equal(div.className, 'my-class', 'Should apply class attribute');
    });

    it('compiles template with multiple slots', () => {
        const strings = ['<div id="', '" class="', '">', '</div>'];
        const compiled = compileTemplate(strings);

        // Test behavior: all slots are applied correctly
        const container = document.createElement('div');
        const vnode = applyValues(compiled, ['my-id', 'my-class', 'Content']);
        preactRender(vnode, container);

        const div = container.querySelector('div');
        assert.equal(div.id, 'my-id', 'Should apply id');
        assert.equal(div.className, 'my-class', 'Should apply class');
        assert.equal(div.textContent, 'Content', 'Should apply content');
    });

    it('detects URL context for href attribute', () => {
        const strings = ['<a href="', '">Link</a>'];
        const compiled = compileTemplate(strings);

        // Test behavior: dangerous URLs are sanitized
        const container = document.createElement('div');
        const vnode = applyValues(compiled, ['javascript:alert(1)']);
        preactRender(vnode, container);

        const a = container.querySelector('a');
        assert.equal(a.getAttribute('href'), '', 'Should sanitize javascript: URL');
    });

    it('detects custom element attributes', () => {
        const strings = ['<x-component data="', '"></x-component>'];
        const compiled = compileTemplate(strings);

        // Test behavior: object props passed to custom element
        const container = document.createElement('div');
        const data = { foo: 'bar' };
        const vnode = applyValues(compiled, [data]);
        preactRender(vnode, container);

        const el = container.querySelector('x-component');
        assert.equal(el.data, data, 'Should pass object to custom element');
    });

    it('compiles event handler attribute', () => {
        const strings = ['<button on-click="', '">Click</button>'];
        const compiled = compileTemplate(strings);

        // Test behavior: event handler is called
        let clicked = false;
        const handler = () => { clicked = true; };
        const container = document.createElement('div');
        const vnode = applyValues(compiled, [handler]);
        preactRender(vnode, container);

        const button = container.querySelector('button');
        button.click();
        assert.ok(clicked, 'Should call event handler');
    });

    it('compiles nested elements', () => {
        const strings = ['<div><span>', '</span></div>'];
        const compiled = compileTemplate(strings);

        // Test behavior: nested structure renders correctly
        const container = document.createElement('div');
        const vnode = applyValues(compiled, ['Nested']);
        preactRender(vnode, container);

        const span = container.querySelector('div span');
        assert.ok(span, 'Should have nested span');
        assert.equal(span.textContent, 'Nested', 'Should have slot content');
    });
});

describe('Template Value Application', function(it) {
    it('applies text value', () => {
        const container = document.createElement('div');
        const strings = ['<div>', '</div>'];
        const compiled = compileTemplate(strings);
        const applied = applyValues(compiled, ['Hello']);

        preactRender(applied, container);

        const div = container.querySelector('div');
        assert.equal(div.textContent, 'Hello', 'Should render Hello');
    });

    it('escapes HTML in text values', () => {
        const container = document.createElement('div');
        const strings = ['<div>', '</div>'];
        const compiled = compileTemplate(strings);
        const applied = applyValues(compiled, ['<script>alert(1)</script>']);

        preactRender(applied, container);

        const div = container.querySelector('div');
        assert.equal(div.textContent, '<script>alert(1)</script>', 'Should escape script tags');
        assert.ok(!div.innerHTML.includes('<script>'), 'Should not contain unescaped script tag');
    });

    it('applies attribute value', () => {
        const container = document.createElement('div');
        const strings = ['<div class="', '">Content</div>'];
        const compiled = compileTemplate(strings);
        const applied = applyValues(compiled, ['my-class']);

        preactRender(applied, container);

        const div = container.querySelector('div');
        assert.equal(div.className, 'my-class', 'Should apply class value');
    });

    it('escapes attribute values', () => {
        const container = document.createElement('div');
        const strings = ['<div title="', '">Content</div>'];
        const compiled = compileTemplate(strings);
        const applied = applyValues(compiled, ['\"><script>alert(1)</script>']);

        preactRender(applied, container);

        const div = container.querySelector('div');
        // Preact/browser should escape quotes in attributes
        // The output will contain "><script with escaped quotes: &quot;><script
        // This is safe - the quotes prevent breaking out of the attribute context
        assert.ok(!div.outerHTML.includes('\"><script'), 'Should not allow unescaped attribute injection');
        assert.ok(div.outerHTML.includes('&quot;') || div.outerHTML.includes('&#34;'), 'Should escape quotes');
    });

    it('handles boolean true in attribute', () => {
        const container = document.createElement('div');
        const strings = ['<option selected="', '">Test</option>'];
        const compiled = compileTemplate(strings);
        const applied = applyValues(compiled, [true]);

        preactRender(applied, container);

        const option = container.querySelector('option');
        assert.ok(option.selected, 'Boolean true should set selected');
    });

    it('removes attribute for boolean false', () => {
        const container = document.createElement('div');
        const strings = ['<option selected="', '">Test</option>'];
        const compiled = compileTemplate(strings);
        const applied = applyValues(compiled, [false]);

        preactRender(applied, container);

        const option = container.querySelector('option');
        assert.ok(!option.selected, 'Boolean false should not set selected');
    });

    it('removes attribute for undefined', () => {
        const container = document.createElement('div');
        const strings = ['<div class="', '">Content</div>'];
        const compiled = compileTemplate(strings);
        const applied = applyValues(compiled, [undefined]);

        preactRender(applied, container);

        const div = container.querySelector('div');
        assert.ok(!div.className, 'Undefined should not set class');
    });

    it('sanitizes URL values', () => {
        const container = document.createElement('div');
        const strings = ['<a href="', '">Link</a>'];
        const compiled = compileTemplate(strings);
        const applied = applyValues(compiled, ['javascript:alert(1)']);

        preactRender(applied, container);

        const a = container.querySelector('a');
        assert.equal(a.getAttribute('href'), '', 'Should block javascript: URL');
    });

    it('allows safe URL schemes', () => {
        const container = document.createElement('div');
        const strings = ['<a href="', '">Link</a>'];
        const compiled = compileTemplate(strings);
        const applied = applyValues(compiled, ['https://example.com']);

        preactRender(applied, container);

        const a = container.querySelector('a');
        assert.equal(a.getAttribute('href'), 'https://example.com', 'Should allow HTTPS');
    });

    it('applies function to event handler', () => {
        const container = document.createElement('div');
        let clicked = false;
        const handler = () => { clicked = true; };
        const strings = ['<button on-click="', '">Click</button>'];
        const compiled = compileTemplate(strings);
        const applied = applyValues(compiled, [handler]);

        preactRender(applied, container);

        const button = container.querySelector('button');
        button.click();
        assert.ok(clicked, 'Should call event handler');
    });

    it('handles object props for custom elements', async () => {
        const container = document.createElement('div');
        const data = { foo: 'bar' };
        const strings = ['<x-component data="', '"></x-component>'];
        const compiled = compileTemplate(strings);
        const applied = applyValues(compiled, [data]);

        preactRender(applied, container);

        const el = container.querySelector('x-component');
        assert.equal(el.data, data, 'Should pass object to custom element');
        assert.ok(!el.getAttribute('data'), 'Should not set attribute for object prop');
    });

    it('handles props setting for custom elements', async () => {
        const container = document.createElement('div');
        const data = "Test!";
        const strings = ['<x-component data="', '"></x-component>'];
        const compiled = compileTemplate(strings);
        const applied = applyValues(compiled, [data]);

        preactRender(applied, container);

        const el = container.querySelector('x-component');
        assert.equal(el.data, "Test!", 'Should pass string to custom element');
        assert.equal(el.getAttribute('data'), "Test!", 'Should set attribute for string prop');
    });

    it('applies multiple values', () => {
        const container = document.createElement('div');
        const strings = ['<div id="', '" class="', '">', '</div>'];
        const compiled = compileTemplate(strings);
        const applied = applyValues(compiled, ['my-id', 'my-class', 'Content']);

        preactRender(applied, container);

        const div = container.querySelector('div');
        assert.equal(div.id, 'my-id', 'Should apply id');
        assert.equal(div.className, 'my-class', 'Should apply class');
        assert.equal(div.textContent, 'Content', 'Should apply content');
    });

    it('handles nested html() templates', () => {
        const container = document.createElement('div');
        const inner = html`<span>Inner</span>`;
        const outer = html`<div>${inner}</div>`;

        renderTemplate(outer, container);

        const div = container.querySelector('div');
        const span = div.querySelector('span');
        assert.ok(span, 'Should render nested template');
        assert.equal(span.textContent, 'Inner', 'Should contain inner content');
    });
});

describe('Template Compiler Edge Cases', function(it) {
    it('handles empty template', () => {
        const strings = [''];
        const compiled = compileTemplate(strings);

        assert.ok(compiled, 'Should compile');

        // Should produce valid (empty or null) output
        const vnode = applyValues(compiled, []);
        // Empty templates should not crash
    });

    it('handles whitespace-only template', () => {
        const strings = ['   \n  \t  '];
        const compiled = compileTemplate(strings);

        assert.ok(compiled, 'Should compile');
    });

    it('handles template with only slots', () => {
        const strings = ['', ''];
        const compiled = compileTemplate(strings);

        assert.ok(compiled, 'Should compile');

        // Test behavior: slot value is rendered
        const container = document.createElement('div');
        const vnode = applyValues(compiled, ['Just a slot']);
        preactRender(vnode, container);
        assert.equal(container.textContent, 'Just a slot', 'Should render slot value');
    });

    it('handles self-closing tags', () => {
        const strings = ['<img src="', '" />'];
        const compiled = compileTemplate(strings);

        // Test behavior: img is rendered with src
        const container = document.createElement('div');
        const vnode = applyValues(compiled, ['test.png']);
        preactRender(vnode, container);

        const img = container.querySelector('img');
        assert.ok(img, 'Should render img');
        assert.equal(img.getAttribute('src'), 'test.png', 'Should have src attribute');
    });

    it('handles deeply nested structure', () => {
        const strings = ['<div><ul><li><a href="', '">Link</a></li></ul></div>'];
        const compiled = compileTemplate(strings);

        // Test behavior: deeply nested slot is applied
        const container = document.createElement('div');
        const vnode = applyValues(compiled, ['https://example.com']);
        preactRender(vnode, container);

        const a = container.querySelector('div ul li a');
        assert.ok(a, 'Should render deeply nested a');
        assert.equal(a.getAttribute('href'), 'https://example.com', 'Should apply href');
    });

    it('handles multiple root elements', () => {
        const strings = ['<div>First</div><div>Second</div>'];
        const compiled = compileTemplate(strings);

        // Test behavior: both elements are rendered
        const container = document.createElement('div');
        const vnode = applyValues(compiled, []);
        preactRender(vnode, container);

        const divs = container.querySelectorAll('div');
        assert.equal(divs.length, 2, 'Should have 2 divs');
        assert.equal(divs[0].textContent, 'First', 'First div content');
        assert.equal(divs[1].textContent, 'Second', 'Second div content');
    });

    it('handles comments', () => {
        const strings = ['<div><!-- comment -->', '</div>'];
        const compiled = compileTemplate(strings);

        // Comments should be stripped, slot should work
        const container = document.createElement('div');
        const vnode = applyValues(compiled, ['Content']);
        preactRender(vnode, container);

        const div = container.querySelector('div');
        assert.equal(div.textContent, 'Content', 'Should render content after comment');
    });
});

describe('Template Compiler Performance', function(it) {
    it('caches same reference templates (HTM-style optimization)', () => {
        clearTemplateCache();

        // HTM-style: Same array reference = cache hit (O(1) lookup)
        const strings = ['<div>', '</div>'];

        compileTemplate(strings);
        compileTemplate(strings);  // Same reference = cache hit

        assert.equal(getTemplateCacheSize(), 1, 'Should cache same-reference templates');
    });

    it('creates separate cache entries for different references', () => {
        clearTemplateCache();

        // Different array objects get different cache entries (even with same content)
        // This is correct behavior for HTM-style reference-based caching
        const strings1 = ['<div>', '</div>'];
        const strings2 = ['<div>', '</div>'];

        compileTemplate(strings1);
        compileTemplate(strings2);

        assert.equal(getTemplateCacheSize(), 2, 'Different references = different cache entries');
    });

    it('distinguishes different templates', () => {
        clearTemplateCache();

        const strings1 = ['<div>', '</div>'];
        const strings2 = ['<span>', '</span>'];

        compileTemplate(strings1);
        compileTemplate(strings2);

        assert.equal(getTemplateCacheSize(), 2, 'Should distinguish different templates');
    });

    it('clears cache', () => {
        const strings = ['<div>Test</div>'];
        compileTemplate(strings);

        assert.ok(getTemplateCacheSize() > 0, 'Should have cached templates');

        clearTemplateCache();

        assert.equal(getTemplateCacheSize(), 0, 'Should clear cache');
    });

    it('returns pre-built VNode for static templates', () => {
        clearTemplateCache();
        const strings = ['<div>Static Content</div>'];
        const compiled = compileTemplate(strings);

        // Static templates should have isStatic flag
        assert.ok(compiled.isStatic, 'Static template should be marked as static');

        // Applying values multiple times should return same reference for static
        const vnode1 = applyValues(compiled, []);
        const vnode2 = applyValues(compiled, []);
        assert.equal(vnode1, vnode2, 'Static VNode should be reused');
    });
});

describe('Entity Preprocessing', function(it) {
    it('handles bare ampersands in text', () => {
        clearTemplateCache();
        const strings = ['<div>Tom & Jerry</div>'];
        const compiled = compileTemplate(strings);

        const container = document.createElement('div');
        const vnode = applyValues(compiled, []);
        preactRender(vnode, container);
        assert.equal(container.textContent, 'Tom & Jerry', 'Should render bare ampersand correctly');
    });

    it('handles multiple bare ampersands', () => {
        clearTemplateCache();
        const strings = ['<div>A & B & C & D</div>'];
        const compiled = compileTemplate(strings);

        const container = document.createElement('div');
        const vnode = applyValues(compiled, []);
        preactRender(vnode, container);
        assert.equal(container.textContent, 'A & B & C & D', 'Should render multiple ampersands');
    });

    it('handles &nbsp; entity', () => {
        clearTemplateCache();
        const strings = ['<div>Hello\u00A0World</div>']; // Using actual non-breaking space for comparison
        const stringsWithEntity = ['<div>Hello&nbsp;World</div>'];
        const compiled = compileTemplate(stringsWithEntity);

        const container = document.createElement('div');
        const vnode = applyValues(compiled, []);
        preactRender(vnode, container);
        // Non-breaking space is Unicode 160
        assert.ok(container.textContent.includes('\u00A0'), 'Should render non-breaking space');
    });

    it('handles &copy; entity', () => {
        clearTemplateCache();
        const strings = ['<div>&copy; 2024</div>'];
        const compiled = compileTemplate(strings);

        const container = document.createElement('div');
        const vnode = applyValues(compiled, []);
        preactRender(vnode, container);
        assert.equal(container.textContent, '© 2024', 'Should render copyright symbol');
    });

    it('preserves XML predefined entities', () => {
        clearTemplateCache();
        const strings = ['<div>&lt;tag&gt; &amp; &quot;text&quot;</div>'];
        const compiled = compileTemplate(strings);

        const container = document.createElement('div');
        const vnode = applyValues(compiled, []);
        preactRender(vnode, container);
        assert.equal(container.textContent, '<tag> & "text"', 'Should decode XML entities correctly');
    });

    it('handles numeric decimal entities', () => {
        clearTemplateCache();
        const strings = ['<div>&#169; &#8212;</div>']; // copyright and mdash
        const compiled = compileTemplate(strings);

        const container = document.createElement('div');
        const vnode = applyValues(compiled, []);
        preactRender(vnode, container);
        assert.equal(container.textContent, '© —', 'Should render numeric entities');
    });

    it('handles numeric hex entities', () => {
        clearTemplateCache();
        const strings = ['<div>&#xA9; &#x2014;</div>']; // copyright and mdash in hex
        const compiled = compileTemplate(strings);

        const container = document.createElement('div');
        const vnode = applyValues(compiled, []);
        preactRender(vnode, container);
        assert.equal(container.textContent, '© —', 'Should render hex entities');
    });

    it('handles entities in attributes', () => {
        clearTemplateCache();
        const strings = ['<div title="Tom &amp; Jerry">Content</div>'];
        const compiled = compileTemplate(strings);

        const container = document.createElement('div');
        const vnode = applyValues(compiled, []);
        preactRender(vnode, container);
        assert.equal(container.firstChild.getAttribute('title'), 'Tom & Jerry', 'Should handle entities in attributes');
    });

    it('handles bare ampersand in attributes', () => {
        clearTemplateCache();
        const strings = ['<div title="R&D">Content</div>'];
        const compiled = compileTemplate(strings);

        const container = document.createElement('div');
        const vnode = applyValues(compiled, []);
        preactRender(vnode, container);
        assert.equal(container.firstChild.getAttribute('title'), 'R&D', 'Should escape bare ampersand in attributes');
    });

    it('handles mixed entities and ampersands', () => {
        clearTemplateCache();
        const strings = ['<div>&copy; Tom & Jerry &mdash; 2024</div>'];
        const compiled = compileTemplate(strings);

        const container = document.createElement('div');
        const vnode = applyValues(compiled, []);
        preactRender(vnode, container);
        assert.equal(container.textContent, '© Tom & Jerry — 2024', 'Should handle mixed entities');
    });

    it('handles unknown entities gracefully', () => {
        clearTemplateCache();
        // Unknown entity should have its ampersand escaped
        const strings = ['<div>&unknownentity;</div>'];
        const compiled = compileTemplate(strings);

        const container = document.createElement('div');
        const vnode = applyValues(compiled, []);
        preactRender(vnode, container);
        // Unknown entity gets escaped, so it renders as literal text
        assert.equal(container.textContent, '&unknownentity;', 'Should escape unknown entities');
    });

    it('handles Greek letter entities', () => {
        clearTemplateCache();
        const strings = ['<div>&alpha; &beta; &gamma;</div>'];
        const compiled = compileTemplate(strings);

        const container = document.createElement('div');
        const vnode = applyValues(compiled, []);
        preactRender(vnode, container);
        assert.equal(container.textContent, 'α β γ', 'Should render Greek letters');
    });

    it('handles arrow entities', () => {
        clearTemplateCache();
        const strings = ['<div>&larr; &rarr; &uarr; &darr;</div>'];
        const compiled = compileTemplate(strings);

        const container = document.createElement('div');
        const vnode = applyValues(compiled, []);
        preactRender(vnode, container);
        assert.equal(container.textContent, '← → ↑ ↓', 'Should render arrow entities');
    });

    it('handles entities with dynamic slots', () => {
        clearTemplateCache();
        const strings = ['<div>&copy; ', ' &mdash; All rights reserved</div>'];
        const compiled = compileTemplate(strings);

        const container = document.createElement('div');
        const vnode = applyValues(compiled, ['2024']);
        preactRender(vnode, container);
        assert.equal(container.textContent, '© 2024 — All rights reserved', 'Should work with slots');
    });
});
