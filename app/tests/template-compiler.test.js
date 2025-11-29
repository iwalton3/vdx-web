/**
 * Tests for Template Compiler System
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
        assert.equal(compiled.type, 'fragment', 'Should be a fragment');
        assert.ok(compiled.children.length > 0, 'Should have children');
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

        const element = compiled.children[0];
        assert.equal(element.type, 'element', 'Should have element');
        assert.equal(element.tag, 'div', 'Should be div');
        assert.ok(element.children.length > 0, 'Should have text child');

        const textNode = element.children[0];
        assert.equal(textNode.type, 'text', 'Should be text node');
        assert.equal(textNode.slot, 0, 'Should have slot 0');
    });

    it('compiles template with attribute slot', () => {
        const strings = ['<div class="', '">Content</div>'];
        const compiled = compileTemplate(strings);

        const element = compiled.children[0];
        assert.ok(element.attrs.class, 'Should have class attribute');
        assert.equal(element.attrs.class.slot, 0, 'Should have slot reference');
        assert.equal(element.attrs.class.context, 'attribute', 'Should have attribute context');
    });

    it('compiles template with multiple slots', () => {
        const strings = ['<div id="', '" class="', '">', '</div>'];
        const compiled = compileTemplate(strings);

        const element = compiled.children[0];
        assert.equal(element.attrs.id.slot, 0, 'First slot in id');
        assert.equal(element.attrs.class.slot, 1, 'Second slot in class');
        assert.equal(element.children[0].slot, 2, 'Third slot in content');
    });

    it('detects URL context for href attribute', () => {
        const strings = ['<a href="', '">Link</a>'];
        const compiled = compileTemplate(strings);

        const element = compiled.children[0];
        assert.equal(element.attrs.href.context, 'url', 'Should detect URL context');
    });

    it('detects custom element attributes', () => {
        const strings = ['<x-component data="', '"></x-component>'];
        const compiled = compileTemplate(strings);

        const element = compiled.children[0];
        assert.equal(element.tag, 'x-component', 'Should be custom element');
        assert.equal(element.attrs.data.context, 'custom-element-attr', 'Should detect custom element context');
    });

    it('compiles event handler attribute', () => {
        const strings = ['<button on-click="', '">Click</button>'];
        const compiled = compileTemplate(strings);

        const element = compiled.children[0];
        assert.ok(element.events.click, 'Should have click event');
        assert.equal(element.events.click.slot, 0, 'Should have slot for handler');
    });

    it('compiles nested elements', () => {
        const strings = ['<div><span>', '</span></div>'];
        const compiled = compileTemplate(strings);

        const div = compiled.children[0];
        assert.equal(div.tag, 'div', 'Should have div');

        const span = div.children[0];
        assert.equal(span.type, 'element', 'Should have span');
        assert.equal(span.tag, 'span', 'Should be span tag');
        assert.ok(span.children.length > 0, 'Span should have text child');
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
        const applied = applyValues(compiled, ['"><script>alert(1)</script>']);

        preactRender(applied, container);

        const div = container.querySelector('div');
        // Preact/browser should escape quotes in attributes
        // The output will contain "><script with escaped quotes: &quot;><script
        // This is safe - the quotes prevent breaking out of the attribute context
        assert.ok(!div.outerHTML.includes('"><script'), 'Should not allow unescaped attribute injection');
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
        assert.equal(compiled.type, 'fragment', 'Should be fragment');
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
    });

    it('handles self-closing tags', () => {
        const strings = ['<img src="', '" />'];
        const compiled = compileTemplate(strings);

        const element = compiled.children[0];
        assert.equal(element.tag, 'img', 'Should parse img tag');
        assert.ok(element.attrs.src, 'Should have src attribute');
    });

    it('handles deeply nested structure', () => {
        const strings = ['<div><ul><li><a href="', '">Link</a></li></ul></div>'];
        const compiled = compileTemplate(strings);

        const div = compiled.children[0];
        const ul = div.children[0];
        const li = ul.children[0];
        const a = li.children[0];

        assert.equal(a.tag, 'a', 'Should parse deeply nested structure');
        assert.ok(a.attrs.href, 'Should have href with slot');
    });

    it('handles multiple root elements', () => {
        const strings = ['<div>First</div><div>Second</div>'];
        const compiled = compileTemplate(strings);

        assert.equal(compiled.type, 'fragment', 'Should be fragment');
        assert.equal(compiled.children.length, 2, 'Should have 2 children');
        assert.equal(compiled.children[0].tag, 'div', 'First should be div');
        assert.equal(compiled.children[1].tag, 'div', 'Second should be div');
    });

    it('handles comments', () => {
        const strings = ['<div><!-- comment -->', '</div>'];
        const compiled = compileTemplate(strings);

        // Comments should be stripped during parsing
        const element = compiled.children[0];
        assert.equal(element.tag, 'div', 'Should parse div');
    });
});

describe('Template Compiler Performance', function(it) {
    it('caches identical templates', () => {
        clearTemplateCache();

        const strings1 = ['<div>', '</div>'];
        const strings2 = ['<div>', '</div>'];

        compileTemplate(strings1);
        compileTemplate(strings2);

        assert.equal(getTemplateCacheSize(), 1, 'Should cache identical templates');
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
});
