/**
 * Parser Benchmark
 *
 * Measures performance of the new HTML parser vs baseline operations.
 * Run with: node --experimental-vm-modules parser-benchmark.js
 */

import { htmlParse } from '../lib/core/html-parser.js';
import { compileTemplate, clearTemplateCache } from '../lib/core/template-compiler.js';

// Benchmark utilities
function benchmark(name, fn, iterations = 1000) {
    // Warmup
    for (let i = 0; i < 10; i++) fn();

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        fn();
    }
    const elapsed = performance.now() - start;

    return {
        name,
        iterations,
        totalMs: elapsed.toFixed(2),
        avgUs: ((elapsed / iterations) * 1000).toFixed(2),
        opsPerSec: Math.round(iterations / (elapsed / 1000))
    };
}

// Test templates of varying complexity
const templates = {
    simple: ['<div class="test">Hello World</div>'],

    withSlot: ['<div class="test">', '</div>'],

    multipleSlots: ['<div class="', '" id="', '">', '</div>'],

    nested: ['<div class="wrapper"><span class="label">Name:</span><input type="text" name="username"><button type="submit">Submit</button></div>'],

    withEvents: ['<button on-click="handleClick" on-mouseenter="handleHover">Click me</button>'],

    xModel: ['<input type="text" x-model="username" placeholder="Enter name">'],

    complex: [
        '<div class="card">' +
            '<header class="card-header">' +
                '<h2 class="title">',
        '</h2>' +
            '</header>' +
            '<div class="card-body">' +
                '<p class="description">',
        '</p>' +
                '<ul class="items">',
        '</ul>' +
            '</div>' +
            '<footer class="card-footer">' +
                '<button class="btn btn-primary" on-click="handleSave">Save</button>' +
                '<button class="btn btn-secondary" on-click="handleCancel">Cancel</button>' +
            '</footer>' +
        '</div>'
    ],

    entities: ['<div>&nbsp;&copy;&reg; &mdash; &lt;escaped&gt; &amp; more</div>'],

    customElements: [
        '<my-component foo="bar" items="',
        '" on-change="handleChange">' +
            '<child-component slot="header">Title</child-component>' +
            '<div slot="content">Content here</div>' +
        '</my-component>'
    ],

    largeForm: [
        '<form class="login-form" on-submit-prevent="handleSubmit">' +
            '<div class="form-group">' +
                '<label for="email">Email</label>' +
                '<input type="email" id="email" x-model="email" required>' +
            '</div>' +
            '<div class="form-group">' +
                '<label for="password">Password</label>' +
                '<input type="password" id="password" x-model="password" required>' +
            '</div>' +
            '<div class="form-group">' +
                '<label>' +
                    '<input type="checkbox" x-model="remember">' +
                    ' Remember me' +
                '</label>' +
            '</div>' +
            '<button type="submit" class="btn btn-primary" disabled="',
        '">Login</button>' +
        '</form>'
    ]
};

// Run benchmarks
console.log('='.repeat(70));
console.log('Parser Performance Benchmark');
console.log('='.repeat(70));
console.log('');

console.log('1. HTML Parser (htmlParse) - Raw parsing performance');
console.log('-'.repeat(70));

const parseResults = [];
for (const [name, strings] of Object.entries(templates)) {
    const result = benchmark(`parse:${name}`, () => htmlParse(strings), 5000);
    parseResults.push(result);
    console.log(`  ${name.padEnd(20)} ${result.avgUs} \u00b5s/op  (${result.opsPerSec.toLocaleString()} ops/sec)`);
}

console.log('');
console.log('2. Template Compiler (compileTemplate) - Including op tree building');
console.log('-'.repeat(70));

const compileResults = [];
for (const [name, strings] of Object.entries(templates)) {
    // Create unique string arrays each time to avoid cache
    const result = benchmark(`compile:${name}`, () => {
        clearTemplateCache();
        compileTemplate(strings);
    }, 2000);
    compileResults.push(result);
    console.log(`  ${name.padEnd(20)} ${result.avgUs} \u00b5s/op  (${result.opsPerSec.toLocaleString()} ops/sec)`);
}

console.log('');
console.log('3. Cache Hit Performance');
console.log('-'.repeat(70));

clearTemplateCache();
// Pre-compile to cache
compileTemplate(templates.complex);

const cacheResult = benchmark('cache:hit', () => compileTemplate(templates.complex), 100000);
console.log(`  Cache hit             ${cacheResult.avgUs} \u00b5s/op  (${cacheResult.opsPerSec.toLocaleString()} ops/sec)`);

console.log('');
console.log('4. Entity Decoding Overhead');
console.log('-'.repeat(70));

const noEntities = ['<div class="test">Hello World without entities</div>'];
const withEntities = ['<div class="test">&nbsp;&copy;&reg;&mdash;&hellip;&euro;&pound;&times;</div>'];

const noEntResult = benchmark('parse:no-entities', () => htmlParse(noEntities), 5000);
const withEntResult = benchmark('parse:with-entities', () => htmlParse(withEntities), 5000);

console.log(`  No entities           ${noEntResult.avgUs} \u00b5s/op`);
console.log(`  With entities         ${withEntResult.avgUs} \u00b5s/op`);
console.log(`  Overhead              ${(parseFloat(withEntResult.avgUs) - parseFloat(noEntResult.avgUs)).toFixed(2)} \u00b5s`);

console.log('');
console.log('5. Slot Handling Overhead');
console.log('-'.repeat(70));

const noSlots = ['<div class="test"><span>Static content</span></div>'];
const oneSlot = ['<div class="test"><span>', '</span></div>'];
const threeSlots = ['<div class="', '"><span>', '</span><p>', '</p></div>'];

const noSlotsResult = benchmark('parse:0-slots', () => htmlParse(noSlots), 5000);
const oneSlotResult = benchmark('parse:1-slot', () => htmlParse(oneSlot), 5000);
const threeSlotsResult = benchmark('parse:3-slots', () => htmlParse(threeSlots), 5000);

console.log(`  0 slots               ${noSlotsResult.avgUs} \u00b5s/op`);
console.log(`  1 slot                ${oneSlotResult.avgUs} \u00b5s/op`);
console.log(`  3 slots               ${threeSlotsResult.avgUs} \u00b5s/op`);

console.log('');
console.log('='.repeat(70));
console.log('Summary');
console.log('='.repeat(70));
console.log('');

// Calculate averages
const avgParse = parseResults.reduce((sum, r) => sum + parseFloat(r.avgUs), 0) / parseResults.length;
const avgCompile = compileResults.reduce((sum, r) => sum + parseFloat(r.avgUs), 0) / compileResults.length;

console.log(`Average parse time:     ${avgParse.toFixed(2)} \u00b5s`);
console.log(`Average compile time:   ${avgCompile.toFixed(2)} \u00b5s`);
console.log(`Cache hit time:         ${cacheResult.avgUs} \u00b5s`);
console.log('');
console.log('Key improvements over old XML-based parser:');
console.log('  - Single-pass parsing (no marker injection/extraction)');
console.log('  - Inline entity decoding (no preprocessing pass)');
console.log('  - Direct slot tracking from string array gaps');
console.log('  - Whitespace preservation for pre-wrap CSS');
console.log('');
