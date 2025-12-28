#!/usr/bin/env node
/**
 * VDX Optimizer - Build-Time opt() Transformations
 *
 * Copies source files while applying fine-grained reactivity transformations.
 * Wraps ${...} expressions in html`` templates with html.contain() for
 * Solid-style fine-grained reactivity without runtime eval().
 *
 * Default mode: Optimizes ALL html`` templates (not just eval(opt()) wrapped)
 * --wrapped-only: Only optimize templates wrapped in eval(opt())
 *
 * Usage:
 *   node optimize.js --input ./src --output ./dist
 *   node optimize.js -i ./src -o ./dist --minify --sourcemap
 *   node optimize.js -i ./src -o ./dist --wrapped-only
 *
 * Options:
 *   --input, -i       Input directory (required)
 *   --output, -o      Output directory (required)
 *   --minify, -m      Minify JavaScript
 *   --sourcemap, -s   Generate source maps (implies --minify)
 *   --wrapped-only    Only optimize eval(opt()) wrapped templates (default: optimize all)
 *   --verbose, -v     Show processing details
 *   --dry-run         Preview without writing files
 *   --help, -h        Show help
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// =============================================================================
// CLI Argument Parsing
// =============================================================================

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        input: null,
        output: null,
        minify: false,
        sourcemap: false,
        wrappedOnly: false,
        verbose: false,
        dryRun: false
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--input':
            case '-i':
                options.input = args[++i];
                break;
            case '--output':
            case '-o':
                options.output = args[++i];
                break;
            case '--minify':
            case '-m':
                options.minify = true;
                break;
            case '--sourcemap':
            case '-s':
                options.sourcemap = true;
                options.minify = true;  // Source maps imply minify
                break;
            case '--wrapped-only':
                options.wrappedOnly = true;
                break;
            case '--verbose':
            case '-v':
                options.verbose = true;
                break;
            case '--dry-run':
                options.dryRun = true;
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
        }
    }

    return options;
}

function showHelp() {
    console.log(`
VDX Optimizer - Build-Time opt() Transformations

Copies source files while applying fine-grained reactivity transformations.
By default, optimizes ALL html\`\` templates for Solid-style fine-grained reactivity.

Usage:
  node optimize.js --input <dir> --output <dir> [options]

Examples:
  node optimize.js -i ./app/componentlib -o ./app/componentlib-opt
  node optimize.js -i ./src -o ./dist --minify --sourcemap
  node optimize.js -i ./src -o ./dist --wrapped-only

Options:
  --input, -i       Input directory (required)
  --output, -o      Output directory (required)
  --minify, -m      Minify JavaScript output
  --sourcemap, -s   Generate source maps (implies --minify)
  --wrapped-only    Only optimize templates wrapped in eval(opt())
                    Default: optimize ALL html\`\` templates
  --verbose, -v     Show detailed processing information
  --dry-run         Preview files that would be processed without writing
  --help, -h        Show this help message

What the optimizer does:
  1. Transforms \${expr} in html\`\` templates to \${html.contain(() => expr)}
  2. Strips eval(opt()) wrappers (they become redundant)
  3. Optionally minifies with source maps

This eliminates the need for 'unsafe-eval' CSP and runtime eval().
`);
}

// =============================================================================
// opt() Transformation Functions (ported from app/lib/opt.js)
// =============================================================================

/**
 * Check if character at position is escaped (odd number of preceding backslashes)
 */
function isEscaped(source, pos) {
    let count = 0;
    let p = pos - 1;
    while (p >= 0 && source[p] === '\\') {
        count++;
        p--;
    }
    return count % 2 === 1;
}

/**
 * Parse a single expression starting at position i (after the ${).
 * Returns the expression text and end position (after the closing }).
 */
function parseExpression(source, startPos) {
    let i = startPos;
    let depth = 1;
    let inString = false;
    let stringChar = null;
    let inTemplate = false;

    while (i < source.length && depth > 0) {
        const ch = source[i];
        const prev = i > 0 ? source[i - 1] : '';

        if (prev === '\\' && !isEscaped(source, i - 1)) {
            i++;
            continue;
        }

        // Handle comments (only when not in string or template)
        if (!inString && !inTemplate) {
            if (ch === '/' && source[i + 1] === '/') {
                while (i < source.length && source[i] !== '\n') i++;
                continue;
            }
            if (ch === '/' && source[i + 1] === '*') {
                i += 2;
                while (i < source.length - 1 && !(source[i] === '*' && source[i + 1] === '/')) i++;
                i += 2;
                continue;
            }
        }

        // Handle strings
        if (!inString && !inTemplate && (ch === '"' || ch === "'")) {
            inString = true;
            stringChar = ch;
            i++;
            continue;
        }
        if (inString && ch === stringChar && !isEscaped(source, i)) {
            inString = false;
            stringChar = null;
            i++;
            continue;
        }
        if (inString) {
            i++;
            continue;
        }

        // Handle nested template literals
        if (ch === '`' && !inTemplate) {
            inTemplate = true;
            i++;
            continue;
        }
        if (ch === '`' && inTemplate) {
            inTemplate = false;
            i++;
            continue;
        }

        // Handle ${ inside nested template
        if (inTemplate && ch === '$' && source[i + 1] === '{') {
            i += 2;
            const nested = parseExpression(source, i);
            i = nested.end;
            continue;
        }

        // Handle braces
        if (!inTemplate && ch === '{') {
            depth++;
            i++;
            continue;
        }
        if (!inTemplate && ch === '}') {
            depth--;
            if (depth === 0) {
                const text = source.slice(startPos, i);
                return { text, end: i + 1 };
            }
            i++;
            continue;
        }

        i++;
    }

    const text = source.slice(startPos, i);
    return { text, end: i };
}

/**
 * Extract all ${...} expressions from html`` template literals.
 */
function extractExpressions(source) {
    const expressions = [];
    let i = 0;

    while (i < source.length) {
        // Look for html` (start of html tagged template)
        if (source.slice(i, i + 4) === 'html' && source[i + 4] === '`') {
            i += 5;

            let templateDepth = 1;

            while (i < source.length && templateDepth > 0) {
                const ch = source[i];
                const prev = i > 0 ? source[i - 1] : '';

                if (prev === '\\' && !isEscaped(source, i - 1)) {
                    i++;
                    continue;
                }

                if (ch === '`') {
                    templateDepth--;
                    if (templateDepth === 0) {
                        i++;
                        break;
                    }
                    i++;
                    continue;
                }

                if (ch === '$' && source[i + 1] === '{') {
                    const start = i;
                    i += 2;
                    const expr = parseExpression(source, i);
                    i = expr.end;
                    expressions.push({
                        start,
                        end: i,
                        expr: expr.text
                    });
                    continue;
                }

                i++;
            }
        } else {
            i++;
        }
    }

    return expressions;
}

/**
 * Determine if an expression should be skipped (not wrapped in html.contain).
 */
function shouldSkipWrapping(expr) {
    const trimmed = expr.trim();

    // Skip already-isolated helpers
    if (/^(contain|raw|html\.contain|when|each|memoEach)\s*\(/.test(trimmed)) {
        return true;
    }

    // Skip arrow functions
    if (/^\([^)]*\)\s*=>/.test(trimmed) || /^\w+\s*=>/.test(trimmed)) {
        return true;
    }

    // Skip function expressions
    if (/^function\s*[\w]*\s*\(/.test(trimmed)) {
        return true;
    }

    // Skip async arrow functions
    if (/^async\s+\([^)]*\)\s*=>/.test(trimmed) || /^async\s+\w+\s*=>/.test(trimmed)) {
        return true;
    }

    // Skip async function expressions
    if (/^async\s+function\s*[\w]*\s*\(/.test(trimmed)) {
        return true;
    }

    // Skip slot/children access
    if (/^this\.props\.(children|slots)\b/.test(trimmed)) {
        return true;
    }

    return false;
}

/**
 * Apply opt() transformations to html`` templates.
 * Wraps ${expr} in ${html.contain(() => (expr))}.
 */
function applyOptTransformations(source) {
    const expressions = extractExpressions(source);

    // Build new source, replacing from end to start
    let result = source;
    for (let i = expressions.length - 1; i >= 0; i--) {
        const { start, end, expr } = expressions[i];

        if (shouldSkipWrapping(expr)) {
            continue;
        }

        const wrapped = '${html.contain(() => (' + expr + '))}';
        result = result.slice(0, start) + wrapped + result.slice(end);
    }

    return result;
}

// =============================================================================
// eval(opt()) Stripping
// =============================================================================

/**
 * Skip over a template literal starting at position i (pointing at opening backtick).
 * Returns the position after the closing backtick.
 */
function skipTemplateLiteral(source, i) {
    i++; // Skip opening backtick
    while (i < source.length && source[i] !== '`') {
        // Handle escape sequences
        if (source[i] === '\\') {
            i += 2;
            continue;
        }
        // Handle ${} expressions
        if (source[i] === '$' && source[i + 1] === '{') {
            i = skipTemplateExpression(source, i + 2);
            continue;
        }
        i++;
    }
    return i + 1; // Skip closing backtick
}

/**
 * Skip over a ${} expression starting at position i (pointing just after ${).
 * Returns the position after the closing }.
 */
function skipTemplateExpression(source, i) {
    let depth = 1;
    while (i < source.length && depth > 0) {
        const ch = source[i];

        // Handle braces
        if (ch === '{') { depth++; i++; continue; }
        if (ch === '}') { depth--; i++; continue; }

        // Handle line comments (// ...)
        if (ch === '/' && source[i + 1] === '/') {
            i += 2;
            while (i < source.length && source[i] !== '\n') i++;
            i++; // Skip newline
            continue;
        }

        // Handle block comments (/* ... */)
        if (ch === '/' && source[i + 1] === '*') {
            i += 2;
            while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++;
            i += 2; // Skip */
            continue;
        }

        // Handle strings
        if (ch === '"' || ch === "'") {
            const quote = ch;
            i++;
            while (i < source.length && source[i] !== quote) {
                if (source[i] === '\\') i++;
                i++;
            }
            i++; // Skip closing quote
            continue;
        }

        // Handle template literals (recursive)
        if (ch === '`') {
            i = skipTemplateLiteral(source, i);
            continue;
        }

        i++;
    }
    return i;
}

/**
 * Strip eval(opt()) wrappers from source.
 * Finds patterns like:
 *   template: eval(opt(function() { ... }))
 *   template: eval(opt(() => html`...`))
 *
 * Replaces with the inner function, optionally applying transformations.
 */
function stripEvalOptCalls(source, applyTransformations = false) {
    let result = source;

    // Pattern: eval(opt(...))
    // We need to find eval(opt( and then match the closing ))
    const evalOptStart = /eval\s*\(\s*opt\s*\(/g;

    let match;
    const replacements = [];

    while ((match = evalOptStart.exec(result)) !== null) {
        const startPos = match.index;
        const afterEvalOpt = match.index + match[0].length;

        // Parse the function argument to opt()
        let depth = 1;  // We're after opt(, so depth starts at 1
        let i = afterEvalOpt;
        let inString = false;
        let stringChar = null;

        while (i < result.length && depth > 0) {
            const ch = result[i];

            // Handle strings
            if (!inString && (ch === '"' || ch === "'")) {
                inString = true;
                stringChar = ch;
                i++;
                continue;
            }
            if (inString && ch === stringChar && result[i - 1] !== '\\') {
                inString = false;
                stringChar = null;
                i++;
                continue;
            }
            if (inString) {
                i++;
                continue;
            }

            // Handle template literals (use recursive helpers)
            if (ch === '`') {
                i = skipTemplateLiteral(result, i);
                continue;
            }

            // Handle parens (only when not in template - but templates are now skipped entirely)
            if (ch === '(') {
                depth++;
                i++;
                continue;
            }
            if (ch === ')') {
                depth--;
                i++;
                continue;
            }

            i++;
        }

        // After the loop: i points at the closing ) of eval
        // The function is between afterEvalOpt and (i - 1) - just before opt's closing )
        const innerFn = result.slice(afterEvalOpt, i - 1);

        // Convert arrow to regular function if needed
        let transformedFn = convertArrowToFunction(innerFn.trim());

        // Apply opt transformations if requested
        if (applyTransformations) {
            transformedFn = applyOptTransformations(transformedFn);
        }

        replacements.push({
            start: startPos,
            end: i + 1,  // Include both closing parens ))
            replacement: transformedFn
        });
    }

    // Apply replacements from end to start
    for (let i = replacements.length - 1; i >= 0; i--) {
        const { start, end, replacement } = replacements[i];
        result = result.slice(0, start) + replacement + result.slice(end);
    }

    return result;
}

/**
 * Convert arrow functions to regular functions for proper `this` binding.
 */
function convertArrowToFunction(source) {
    const trimmed = source.trim();

    // () => { body }  ->  function() { body }
    if (/^\(\s*\)\s*=>\s*\{/.test(trimmed)) {
        return trimmed.replace(/^\(\s*\)\s*=>\s*\{/, 'function() {');
    }

    // () => expr  ->  function() { return expr; }
    if (/^\(\s*\)\s*=>\s*/.test(trimmed)) {
        const expr = trimmed.replace(/^\(\s*\)\s*=>\s*/, '');
        return 'function() { return ' + expr + '; }';
    }

    return source;
}

// =============================================================================
// Minification (ported from bundler-esm.js)
// =============================================================================

const VLQ_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function vlqEncode(value) {
    let encoded = '';
    let vlq = value < 0 ? ((-value) << 1) | 1 : value << 1;

    do {
        let digit = vlq & 0x1f;
        vlq >>>= 5;
        if (vlq > 0) digit |= 0x20;
        encoded += VLQ_CHARS[digit];
    } while (vlq > 0);

    return encoded;
}

/**
 * Minify code and optionally generate source map.
 */
function minifyCode(code, generateMap = false, filename = 'source.js') {
    let result = '';
    let i = 0;
    const len = code.length;
    let lastChar = '';

    // Source map tracking
    let srcLine = 0, srcCol = 0;
    let outLine = 0, outCol = 0;
    let prevSrcLine = 0, prevSrcCol = 0, prevOutCol = 0;
    const mappings = [];
    let currentLineMappings = [];

    function addMapping() {
        if (!generateMap) return;
        currentLineMappings.push(
            vlqEncode(outCol - prevOutCol) +
            vlqEncode(0) +  // source index always 0
            vlqEncode(srcLine - prevSrcLine) +
            vlqEncode(srcCol - prevSrcCol)
        );
        prevOutCol = outCol;
        prevSrcLine = srcLine;
        prevSrcCol = srcCol;
    }

    function emit(char) {
        result += char;
        if (char === '\n') {
            outLine++;
            outCol = 0;
            prevOutCol = 0;
            if (generateMap) {
                mappings.push(currentLineMappings.join(','));
                currentLineMappings = [];
            }
        } else {
            outCol++;
        }
    }

    function advance() {
        if (code[i] === '\n') {
            srcLine++;
            srcCol = 0;
        } else {
            srcCol++;
        }
        i++;
    }

    addMapping();

    while (i < len) {
        const char = code[i];

        // Skip single-line comments
        if (char === '/' && code[i + 1] === '/') {
            while (i < len && code[i] !== '\n') advance();
            if (i < len) advance();
            continue;
        }

        // Skip multi-line comments (keep license /*!)
        if (char === '/' && code[i + 1] === '*') {
            const isLicense = code[i + 2] === '!';
            if (isLicense) {
                addMapping();
                while (i < len && !(code[i] === '*' && code[i + 1] === '/')) {
                    emit(code[i]);
                    advance();
                }
                if (i < len) {
                    emit('*'); advance();
                    emit('/'); advance();
                }
                emit('\n');
            } else {
                advance(); advance();
                while (i < len && !(code[i] === '*' && code[i + 1] === '/')) advance();
                if (i < len) { advance(); advance(); }
            }
            continue;
        }

        // Handle regex literals
        if (char === '/') {
            let j = result.length - 1;
            while (j >= 0 && /\s/.test(result[j])) j--;
            const prevResultChar = j >= 0 ? result[j] : '';
            const isLikelyRegex = j < 0 ||
                '=([{,;!&|?:\n'.includes(prevResultChar) ||
                result.substring(Math.max(0, j - 5), j + 1).match(/return$/);

            if (isLikelyRegex && code[i + 1] !== '/' && code[i + 1] !== '*') {
                addMapping();
                emit(char);
                advance();
                while (i < len) {
                    if (code[i] === '\\' && i + 1 < len) {
                        emit(code[i]); advance();
                        emit(code[i]); advance();
                    } else if (code[i] === '[') {
                        emit(code[i]); advance();
                        while (i < len && code[i] !== ']') {
                            if (code[i] === '\\' && i + 1 < len) {
                                emit(code[i]); advance();
                                emit(code[i]); advance();
                            } else {
                                emit(code[i]); advance();
                            }
                        }
                        if (i < len) { emit(code[i]); advance(); }
                    } else if (code[i] === '/') {
                        emit(code[i]); advance();
                        while (i < len && /[gimsuvy]/.test(code[i])) {
                            emit(code[i]); advance();
                        }
                        break;
                    } else {
                        emit(code[i]); advance();
                    }
                }
                lastChar = '/';
                continue;
            }
        }

        // Preserve string literals
        if (char === '"' || char === "'" || char === '`') {
            addMapping();
            emit(char);
            advance();
            const quote = char;

            while (i < len) {
                if (code[i] === '\\' && i + 1 < len) {
                    emit(code[i]); advance();
                    emit(code[i]); advance();
                    continue;
                }
                if (code[i] === quote && quote !== '`') {
                    emit(code[i]); advance();
                    break;
                }
                if (quote === '`' && code[i] === '$' && code[i + 1] === '{') {
                    emit(code[i]); advance();
                    emit(code[i]); advance();
                    let depth = 1;
                    while (i < len && depth > 0) {
                        if (code[i] === '{') depth++;
                        if (code[i] === '}') depth--;
                        emit(code[i]); advance();
                    }
                    continue;
                }
                if (quote === '`' && code[i] === '`') {
                    emit(code[i]); advance();
                    break;
                }
                emit(code[i]); advance();
            }
            lastChar = quote;
            continue;
        }

        // Collapse whitespace
        if (/\s/.test(char)) {
            while (i < len && /\s/.test(code[i])) advance();

            if (i < len) {
                const nextChar = code[i];
                const needsSpace =
                    (/[a-zA-Z0-9_$]/.test(lastChar) && /[a-zA-Z0-9_$]/.test(nextChar)) ||
                    (lastChar === ')' && /[a-zA-Z_$]/.test(nextChar)) ||
                    (/[a-zA-Z_$]/.test(lastChar) && nextChar === '(');

                if (needsSpace) {
                    emit(' ');
                    lastChar = ' ';
                }
            }
            continue;
        }

        // Regular character
        addMapping();
        emit(char);
        lastChar = char;
        advance();
    }

    if (generateMap && currentLineMappings.length > 0) {
        mappings.push(currentLineMappings.join(','));
    }

    const output = { code: result };

    if (generateMap) {
        output.map = {
            version: 3,
            sources: [filename],
            sourcesContent: [code],
            names: [],
            mappings: mappings.join(';')
        };
    }

    return output;
}

// =============================================================================
// HTML File Processing
// =============================================================================

/**
 * Process HTML file - find and transform inline <script> tags.
 */
function processHtmlFile(content, options) {
    const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi;

    return content.replace(scriptRegex, (match, attrs, scriptContent) => {
        // Skip external scripts
        if (/src\s*=/.test(attrs)) {
            return match;
        }

        // Skip non-JS scripts
        if (/type\s*=\s*["'](?!text\/javascript|module)/.test(attrs)) {
            return match;
        }

        // Transform the script content
        let transformed = scriptContent;

        if (!options.wrappedOnly) {
            transformed = applyOptTransformations(transformed);
        }
        transformed = stripEvalOptCalls(transformed, options.wrappedOnly);

        return `<script${attrs}>${transformed}</script>`;
    });
}

// =============================================================================
// File Processing
// =============================================================================

/**
 * Process a single JavaScript file.
 */
function processJsFile(inputPath, outputPath, options) {
    let content = fs.readFileSync(inputPath, 'utf-8');
    const originalSize = content.length;

    // Step 1: Apply opt() transformations to ALL html`` templates (unless --wrapped-only)
    if (!options.wrappedOnly) {
        content = applyOptTransformations(content);
    }

    // Step 2: Strip eval(opt()) calls
    // If --wrapped-only, this also applies transformations to wrapped templates
    content = stripEvalOptCalls(content, options.wrappedOnly);

    // Step 3: Minify if requested
    let sourceMap = null;
    if (options.minify) {
        const filename = path.basename(inputPath);
        const minified = minifyCode(content, options.sourcemap, filename);
        content = minified.code;
        sourceMap = minified.map;

        if (options.sourcemap && sourceMap) {
            sourceMap.file = path.basename(outputPath);
            content += `\n//# sourceMappingURL=${path.basename(outputPath)}.map\n`;
        }
    }

    if (!options.dryRun) {
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, content);

        if (sourceMap) {
            fs.writeFileSync(outputPath + '.map', JSON.stringify(sourceMap));
        }
    }

    return {
        originalSize,
        outputSize: content.length,
        hasSourceMap: !!sourceMap
    };
}

/**
 * Process a single HTML file.
 */
function processHtmlFile2(inputPath, outputPath, options) {
    let content = fs.readFileSync(inputPath, 'utf-8');
    const originalSize = content.length;

    content = processHtmlFile(content, options);

    if (!options.dryRun) {
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(outputPath, content);
    }

    return {
        originalSize,
        outputSize: content.length,
        hasSourceMap: false
    };
}

/**
 * Copy a file without processing.
 */
function copyFile(inputPath, outputPath, options) {
    if (!options.dryRun) {
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.copyFileSync(inputPath, outputPath);
    }

    const stats = fs.statSync(inputPath);
    return {
        originalSize: stats.size,
        outputSize: stats.size,
        hasSourceMap: false
    };
}

/**
 * Walk a directory recursively and return all file paths.
 */
function walkDirectory(dir, baseDir = dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            // Skip hidden directories and node_modules
            if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                continue;
            }
            files.push(...walkDirectory(fullPath, baseDir));
        } else if (entry.isFile()) {
            const relativePath = path.relative(baseDir, fullPath);
            files.push(relativePath);
        }
    }

    return files;
}

// =============================================================================
// Main Entry Point
// =============================================================================

function main() {
    const options = parseArgs();

    if (!options.input || !options.output) {
        console.error('Error: --input and --output are required');
        console.error('Run with --help for usage information');
        process.exit(1);
    }

    const inputDir = path.resolve(options.input);
    const outputDir = path.resolve(options.output);

    if (!fs.existsSync(inputDir)) {
        console.error(`Error: Input directory not found: ${inputDir}`);
        process.exit(1);
    }

    if (inputDir === outputDir) {
        console.error('Error: Input and output directories cannot be the same');
        console.error('The optimizer always copies files, never modifies in place');
        process.exit(1);
    }

    console.log('VDX Optimizer\n');
    console.log(`Input:  ${inputDir}`);
    console.log(`Output: ${outputDir}`);
    console.log(`Mode:   ${options.wrappedOnly ? 'Wrapped only (eval(opt()) templates)' : 'All html`` templates'}`);
    console.log(`Minify: ${options.minify ? 'Yes' : 'No'}`);
    if (options.sourcemap) console.log(`Source maps: Yes`);
    if (options.dryRun) console.log(`Dry run: Yes (no files will be written)`);
    console.log('');

    // Get all files
    const files = walkDirectory(inputDir);
    console.log(`Found ${files.length} files to process\n`);

    let jsCount = 0, htmlCount = 0, otherCount = 0;
    let totalOriginal = 0, totalOutput = 0;

    for (const relativePath of files) {
        const inputPath = path.join(inputDir, relativePath);
        const outputPath = path.join(outputDir, relativePath);
        const ext = path.extname(relativePath).toLowerCase();

        let result;

        if (ext === '.js' || ext === '.mjs') {
            result = processJsFile(inputPath, outputPath, options);
            jsCount++;
            if (options.verbose) {
                const saved = result.originalSize - result.outputSize;
                const percent = result.originalSize > 0 ? Math.round((saved / result.originalSize) * 100) : 0;
                console.log(`  JS: ${relativePath} (${percent}% saved${result.hasSourceMap ? ' +map' : ''})`);
            }
        } else if (ext === '.html' || ext === '.htm') {
            result = processHtmlFile2(inputPath, outputPath, options);
            htmlCount++;
            if (options.verbose) {
                console.log(`  HTML: ${relativePath}`);
            }
        } else {
            result = copyFile(inputPath, outputPath, options);
            otherCount++;
            if (options.verbose) {
                console.log(`  Copy: ${relativePath}`);
            }
        }

        totalOriginal += result.originalSize;
        totalOutput += result.outputSize;
    }

    console.log('\n=== Summary ===');
    console.log(`JavaScript files: ${jsCount}`);
    console.log(`HTML files: ${htmlCount}`);
    console.log(`Other files: ${otherCount}`);
    console.log(`Total input size: ${(totalOriginal / 1024).toFixed(2)} KB`);
    console.log(`Total output size: ${(totalOutput / 1024).toFixed(2)} KB`);
    if (totalOriginal > 0) {
        const saved = totalOriginal - totalOutput;
        const percent = Math.round((saved / totalOriginal) * 100);
        console.log(`Size reduction: ${(saved / 1024).toFixed(2)} KB (${percent}%)`);
    }
    console.log(`\n${options.dryRun ? 'Dry run complete (no files written)' : 'Done!'}\n`);
}

main();
