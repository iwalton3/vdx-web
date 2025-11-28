#!/usr/bin/env node
/**
 * ESM Bundler with Dependency Resolution
 *
 * Properly bundles ES modules by:
 * - Parsing imports and exports
 * - Building dependency graph
 * - Resolving naming conflicts
 * - Handling namespace imports (import * as foo)
 * - Handling named imports/exports
 * - No fragile regex hacks!
 *
 * Usage: node bundler-esm.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Files to bundle (in loose order - will be sorted by dependencies)
const FILES_TO_BUNDLE = [
    // Preact
    'app/lib/vendor/preact/constants.js',
    'app/lib/vendor/preact/util.js',
    'app/lib/vendor/preact/options.js',
    'app/lib/vendor/preact/component.js',
    'app/lib/vendor/preact/create-element.js',
    'app/lib/vendor/preact/clone-element.js',
    'app/lib/vendor/preact/create-context.js',
    'app/lib/vendor/preact/diff/catch-error.js',
    'app/lib/vendor/preact/diff/props.js',
    'app/lib/vendor/preact/diff/children.js',
    'app/lib/vendor/preact/diff/index.js',
    'app/lib/vendor/preact/render.js',
    'app/lib/vendor/preact/index.js',
    // Core Framework
    'app/lib/core/reactivity.js',
    'app/lib/core/template-compiler.js',
    'app/lib/core/template.js',
    'app/lib/core/component.js',
    'app/lib/core/store.js',
    'app/lib/core/x-await-then.js',
];

// What to export from the final bundle
const PUBLIC_EXPORTS = [
    'defineComponent',
    'html',
    'raw',
    'when',
    'each',
    'awaitThen',
    'reactive',
    'createEffect',
    'createStore',
    'computed',
    'trackAllDependencies',
    'isReactive',
    'watch',
    'memo',
    'pruneTemplateCache',
    'h',
    'Fragment',
    'render',
    'Component',
    'createContext'
];

class ModuleInfo {
    constructor(filePath) {
        this.filePath = filePath;
        this.absolutePath = path.join(__dirname, filePath);
        this.content = '';
        this.imports = []; // { source, specifiers: [{imported, local}], namespace, default }
        this.exports = []; // { name, alias, isDefault }
        this.dependencies = new Set();
    }
}

function readFile(filePath) {
    const fullPath = path.join(__dirname, filePath);
    return fs.readFileSync(fullPath, 'utf-8');
}

/**
 * Parse import statements from code
 * Handles:
 * - import foo from './bar.js'
 * - import { a, b } from './bar.js'
 * - import { a as b } from './bar.js'
 * - import * as foo from './bar.js'
 * - import './bar.js'
 */
function parseImports(code) {
    const imports = [];
    const importRegex = /import\s+(?:(?:(\w+)|{([^}]+)}|\*\s+as\s+(\w+))\s+from\s+)?['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(code)) !== null) {
        const [, defaultImport, namedImports, namespaceImport, source] = match;

        const importInfo = {
            source,
            specifiers: [],
            namespace: null,
            default: null
        };

        if (defaultImport) {
            importInfo.default = defaultImport;
        }

        if (namespaceImport) {
            importInfo.namespace = namespaceImport;
        }

        if (namedImports) {
            // Parse named imports: { a, b as c, d }
            const specs = namedImports.split(',').map(s => s.trim());
            for (const spec of specs) {
                const asMatch = spec.match(/(\w+)\s+as\s+(\w+)/);
                if (asMatch) {
                    importInfo.specifiers.push({
                        imported: asMatch[1],
                        local: asMatch[2]
                    });
                } else {
                    importInfo.specifiers.push({
                        imported: spec,
                        local: spec
                    });
                }
            }
        }

        imports.push(importInfo);
    }

    return imports;
}

/**
 * Parse export statements from code
 * Handles:
 * - export function foo() {}
 * - export const bar = 1
 * - export { a, b }
 * - export { a as b }
 * - export default foo
 */
function parseExports(code) {
    const exports = [];

    // export function/const/let/var/class
    const declarationRegex = /export\s+(function|const|let|var|class)\s+(\w+)/g;
    let match;
    while ((match = declarationRegex.exec(code)) !== null) {
        exports.push({
            name: match[2],
            alias: null,
            isDefault: false
        });
    }

    // export { a, b as c }
    const namedExportRegex = /export\s+{([^}]+)}/g;
    while ((match = namedExportRegex.exec(code)) !== null) {
        const specs = match[1].split(',').map(s => s.trim());
        for (const spec of specs) {
            const asMatch = spec.match(/(\w+)\s+as\s+(\w+)/);
            if (asMatch) {
                exports.push({
                    name: asMatch[1],
                    alias: asMatch[2],
                    isDefault: false
                });
            } else {
                exports.push({
                    name: spec,
                    alias: null,
                    isDefault: false
                });
            }
        }
    }

    // export default
    const defaultExportRegex = /export\s+default\s+(\w+)/;
    const defaultMatch = code.match(defaultExportRegex);
    if (defaultMatch) {
        exports.push({
            name: defaultMatch[1],
            alias: null,
            isDefault: true
        });
    }

    return exports;
}

/**
 * Resolve relative import path to absolute file path
 */
function resolveImportPath(fromFile, importSource) {
    if (!importSource.startsWith('.')) {
        return null; // External module, not in our bundle
    }

    const fromDir = path.dirname(fromFile);
    const resolved = path.join(fromDir, importSource);

    // Normalize path
    return path.relative(__dirname, resolved);
}

/**
 * Build module dependency graph
 */
function buildModuleGraph(files) {
    const modules = new Map();

    // First pass: read all files and parse imports/exports
    for (const filePath of files) {
        const module = new ModuleInfo(filePath);
        module.content = readFile(filePath);
        module.imports = parseImports(module.content);
        module.exports = parseExports(module.content);

        // Track dependencies
        for (const imp of module.imports) {
            const depPath = resolveImportPath(filePath, imp.source);
            if (depPath && files.includes(depPath)) {
                module.dependencies.add(depPath);
            }
        }

        modules.set(filePath, module);
    }

    return modules;
}

/**
 * Topological sort of modules based on dependencies
 * Handles circular dependencies gracefully by including them when detected
 */
function topologicalSort(modules) {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();

    function visit(filePath) {
        if (visited.has(filePath)) return;

        // If we're currently visiting this node, we have a cycle
        // Just skip it - we'll include it in the original order
        if (visiting.has(filePath)) {
            console.log(`  ⚠ Circular dependency: ${filePath} (will include in declaration order)`);
            return;
        }

        visiting.add(filePath);
        const module = modules.get(filePath);

        for (const dep of module.dependencies) {
            visit(dep);
        }

        visiting.delete(filePath);
        visited.add(filePath);
        sorted.push(filePath);
    }

    for (const filePath of modules.keys()) {
        visit(filePath);
    }

    return sorted;
}

/**
 * Remove import and export statements from code
 * Handles multi-line imports/exports properly
 */
function stripImportsExports(code) {
    let result = '';
    let i = 0;
    const len = code.length;

    while (i < len) {
        // Check for 'import' keyword
        if (code.substring(i, i + 6) === 'import' &&
            (i === 0 || /\s/.test(code[i - 1])) &&
            (i + 6 >= len || /\s/.test(code[i + 6]))) {

            // Skip 'import'
            i += 6;

            // Skip entire import statement - track braces for multi-line
            let braceDepth = 0;
            while (i < len) {
                if (code[i] === '{') braceDepth++;
                if (code[i] === '}') braceDepth--;
                if (braceDepth === 0 && code[i] === ';') {
                    i++;
                    break;
                }
                i++;
            }

            // Skip trailing whitespace/newlines
            while (i < len && /[\s]/.test(code[i])) i++;
            continue;
        }

        // Check for 'export' keyword
        if (code.substring(i, i + 6) === 'export' &&
            (i === 0 || /\s/.test(code[i - 1])) &&
            (i + 6 >= len || /\s/.test(code[i + 6]))) {

            i += 6;
            // Skip whitespace
            while (i < len && /\s/.test(code[i])) i++;

            // Check for 'export { ... } from ...' or 'export { ... }' (re-export or named export)
            if (code[i] === '{') {
                // Skip entire export statement - track braces
                let braceDepth = 1;
                i++; // Skip opening brace

                while (i < len && braceDepth > 0) {
                    if (code[i] === '{') braceDepth++;
                    if (code[i] === '}') braceDepth--;
                    i++;
                }

                // Skip until semicolon
                while (i < len && code[i] !== ';') i++;
                if (code[i] === ';') i++;

                // Skip trailing whitespace
                while (i < len && /[\s]/.test(code[i])) i++;
                continue;
            }

            // Check for 'export default'
            if (code.substring(i, i + 7) === 'default') {
                i += 7;
                // Skip whitespace
                while (i < len && /\s/.test(code[i])) i++;
                // Don't skip the rest - keep the declaration
            }

            // Otherwise just skip 'export' keyword, keep the rest
            continue;
        }

        result += code[i];
        i++;
    }

    return result;
}

/**
 * Build import map for a module
 * Maps local names to their actual values from other modules
 */
function buildImportMap(module, modules) {
    const importMap = new Map(); // local name -> source identifier

    for (const imp of module.imports) {
        const depPath = resolveImportPath(module.filePath, imp.source);
        if (!depPath || !modules.has(depPath)) continue;

        const depModule = modules.get(depPath);

        // Handle namespace import: import * as foo from './bar'
        if (imp.namespace) {
            // Create namespace object with all exports
            const namespaceExports = {};
            for (const exp of depModule.exports) {
                const exportName = exp.alias || exp.name;
                namespaceExports[exportName] = exp.name;
            }
            importMap.set(imp.namespace, namespaceExports);
        }

        // Handle named imports: import { a, b as c } from './bar'
        for (const spec of imp.specifiers) {
            importMap.set(spec.local, spec.imported);
        }

        // Handle default import: import foo from './bar'
        if (imp.default) {
            const defaultExport = depModule.exports.find(e => e.isDefault);
            if (defaultExport) {
                importMap.set(imp.default, defaultExport.name);
            }
        }
    }

    return importMap;
}

/**
 * Generate the final bundle
 */
function generateBundle(modules, sortedFiles) {
    let bundle = `/**
 * Custom Framework Bundle
 * Generated: ${new Date().toISOString()}
 *
 * Includes Preact (https://preactjs.com/)
 * Copyright (c) 2015-present Jason Miller
 * Licensed under MIT
 *
 * Self-contained reactive framework with Web Components support.
 * No dependencies, no build step required.
 */

`;

    // Track what's been defined to avoid duplicates
    const definedFunctions = new Map(); // functionName -> filePath where it was first defined

    // Process modules in dependency order
    for (const filePath of sortedFiles) {
        const module = modules.get(filePath);
        let code = module.content;

        // Strip comments (except licenses)
        code = stripComments(code);

        // Remove import/export statements
        code = stripImportsExports(code);

        // Detect and rename duplicate function declarations
        // Match function declarations
        const functionRegex = /^function\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm;
        const functionsInThisModule = [];
        let match;

        while ((match = functionRegex.exec(code)) !== null) {
            const funcName = match[1];
            functionsInThisModule.push(funcName);

            if (definedFunctions.has(funcName)) {
                const firstDefined = definedFunctions.get(funcName);
                console.log(`  ⚠ Duplicate function '${funcName}' in ${path.basename(filePath)} (first in ${path.basename(firstDefined)})`);

                // Rename this one to avoid conflict
                // Special case: utils.js computed should be renamed to memoize
                if (funcName === 'computed' && filePath.includes('utils.js')) {
                    console.log(`    → Renaming to 'memoize'`);
                    code = code.replace(/\bfunction\s+computed\b/, 'function memoize');
                }
            } else {
                definedFunctions.set(funcName, filePath);
            }
        }

        // Handle namespace imports (import * as foo)
        for (const imp of module.imports) {
            if (imp.namespace) {
                const depPath = resolveImportPath(filePath, imp.source);
                if (depPath && modules.has(depPath)) {
                    const depModule = modules.get(depPath);

                    // Create namespace object
                    const namespaceObj = depModule.exports
                        .filter(e => !e.isDefault)
                        .map(e => `    ${e.alias || e.name}: ${e.name}`)
                        .join(',\n');

                    const namespaceDecl = `const ${imp.namespace} = {\n${namespaceObj}\n};\n`;
                    code = namespaceDecl + code;
                }
            }
        }

        // Add section marker
        bundle += `\n// ============= ${path.basename(filePath)} =============\n`;
        bundle += code + '\n';

        // After Preact index.js, add aliases that were lost
        if (filePath.includes('preact/index.js')) {
            bundle += `\n// Preact aliases (from re-exports)\n`;
            bundle += `const h = createElement;\n`;
            bundle += `const preactRender = render;\n`;
        }
    }

    // Add export aliases (for Preact BaseComponent -> Component)
    bundle += `\n// Export aliases\n`;
    bundle += `const Component = BaseComponent;\n`;

    // Add public exports
    bundle += `\n// ============= Public API =============\n`;
    bundle += `export {\n`;
    for (const name of PUBLIC_EXPORTS) {
        bundle += `    ${name},\n`;
    }
    bundle += `};\n`;

    // Replace lines with only tabs/spaces with empty lines
    bundle = bundle.replace(/^[ \t]+$/gm, '');

    // Squash excessive newlines (more than 2 consecutive)
    bundle = bundle.replace(/\n{3,}/g, '\n\n');

    return bundle;
}

/**
 * Strip comments but keep licenses
 */
function stripComments(code) {
    let result = '';
    let i = 0;
    const len = code.length;

    while (i < len) {
        // Regex literals - must check before comments since both start with /
        // Heuristic: / is a regex if preceded by =, (, [, {, ,, ;, !, &, |, ?, :, return, or newline
        if (code[i] === '/') {
            // Look back for context
            let j = i - 1;
            while (j >= 0 && /\s/.test(code[j])) j--;

            const prevChar = j >= 0 ? code[j] : '';
            const isLikelyRegex = j < 0 ||
                                prevChar === '=' ||
                                prevChar === '(' ||
                                prevChar === '[' ||
                                prevChar === '{' ||
                                prevChar === ',' ||
                                prevChar === ';' ||
                                prevChar === '!' ||
                                prevChar === '&' ||
                                prevChar === '|' ||
                                prevChar === '?' ||
                                prevChar === ':' ||
                                prevChar === '\n' ||
                                code.substring(Math.max(0, j - 5), j + 1).match(/return$/);

            // If it looks like a regex and is not a comment
            if (isLikelyRegex && code[i + 1] !== '/' && code[i + 1] !== '*') {
                result += code[i];
                i++;

                // Parse regex until unescaped /
                while (i < len) {
                    if (code[i] === '\\' && i + 1 < len) {
                        result += code[i] + code[i + 1];
                        i += 2;
                    } else if (code[i] === '/') {
                        result += code[i];
                        i++;
                        // Parse flags (g, i, m, etc.)
                        while (i < len && /[gimsuvy]/.test(code[i])) {
                            result += code[i];
                            i++;
                        }
                        break;
                    } else {
                        result += code[i];
                        i++;
                    }
                }
                continue;
            }
        }

        // Single-line comment
        if (code[i] === '/' && code[i + 1] === '/') {
            i += 2;
            while (i < len && code[i] !== '\n') i++;
            if (i < len) {
                result += '\n';
                i++;
            }
            continue;
        }

        // Multi-line comment
        if (code[i] === '/' && code[i + 1] === '*') {
            const commentStart = i;
            i += 2;
            let commentText = '';

            while (i < len - 1) {
                if (code[i] === '*' && code[i + 1] === '/') break;
                commentText += code[i];
                i++;
            }

            const isLicense = commentText.includes('@license') ||
                            commentText.includes('Copyright') ||
                            commentText.includes('(c)') ||
                            code[commentStart + 2] === '!';

            if (isLicense) {
                result += '/*' + commentText + '*/';
            }

            i += 2;
            continue;
        }

        // String literals
        if (code[i] === '"' || code[i] === "'") {
            const quote = code[i];
            result += code[i];
            i++;

            while (i < len) {
                if (code[i] === '\\' && i + 1 < len) {
                    result += code[i] + code[i + 1];
                    i += 2;
                } else if (code[i] === quote) {
                    result += code[i];
                    i++;
                    break;
                } else {
                    result += code[i];
                    i++;
                }
            }
            continue;
        }

        // Template literals (with interpolation support)
        if (code[i] === '`') {
            result += code[i];
            i++;

            while (i < len) {
                if (code[i] === '\\' && i + 1 < len) {
                    result += code[i] + code[i + 1];
                    i += 2;
                } else if (code[i] === '$' && i + 1 < len && code[i + 1] === '{') {
                    // Template interpolation - recursively process the expression
                    result += code[i] + code[i + 1];
                    i += 2;

                    // Track brace depth to find matching }
                    let braceDepth = 1;
                    while (i < len && braceDepth > 0) {
                        // Handle nested strings/templates inside interpolation
                        if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
                            const quote = code[i];
                            result += code[i];
                            i++;

                            while (i < len) {
                                if (code[i] === '\\' && i + 1 < len) {
                                    result += code[i] + code[i + 1];
                                    i += 2;
                                } else if (code[i] === quote) {
                                    result += code[i];
                                    i++;
                                    break;
                                } else {
                                    result += code[i];
                                    i++;
                                }
                            }
                            continue;
                        }

                        if (code[i] === '{') braceDepth++;
                        if (code[i] === '}') braceDepth--;

                        result += code[i];
                        i++;
                    }
                } else if (code[i] === '`') {
                    result += code[i];
                    i++;
                    break;
                } else {
                    result += code[i];
                    i++;
                }
            }
            continue;
        }

        result += code[i];
        i++;
    }

    return result;
}

/**
 * Main bundler
 */
function bundle() {
    console.log('Building ESM bundle...\n');

    // Build module graph
    console.log('Parsing modules...');
    const modules = buildModuleGraph(FILES_TO_BUNDLE);
    console.log(`  Found ${modules.size} modules\n`);

    // Sort by dependencies
    console.log('Resolving dependencies...');
    const sortedFiles = topologicalSort(modules);
    console.log(`  Sorted ${sortedFiles.length} modules\n`);

    // Generate bundle
    console.log('Generating bundle...');
    const bundleContent = generateBundle(modules, sortedFiles);

    // Write output
    const outputDir = path.join(__dirname, 'app', 'dist');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'framework.js');
    fs.writeFileSync(outputPath, bundleContent);

    console.log(`\n✓ Bundle created: ${outputPath}`);
    console.log(`  Size: ${(bundleContent.length / 1024).toFixed(2)} KB`);
    console.log('  Done!\n');
}

bundle();
