#!/usr/bin/env node
/**
 * spider-deps.js - Dependency Spider for PWA Cache Manifest
 *
 * Discovers all JavaScript dependencies by parsing import statements
 * and generates a versioned cache manifest for service worker caching.
 *
 * Usage: node spider-deps.js
 * Output: cache-manifest.json
 *
 * How it works:
 * 1. Starts from entry point (index.html)
 * 2. Recursively parses import statements from JS files and script tags
 * 3. Generates an MD5 hash of all file contents as the version
 * 4. Outputs manifest with version, timestamp, and file list
 *
 * The version hash ensures that any file change creates a new version,
 * preventing mismatched file loading.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { dirname, resolve, join, relative, extname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// Configuration - Modify these for your project
// =============================================================================

const CONFIG = {
    // Entry point HTML file
    entryPoint: 'index.html',

    // Output manifest file
    outputFile: 'cache-manifest.json',

    // App root (where entry point is located)
    appRoot: __dirname,

    // Project root (for calculating URL paths)
    // Files are cached with paths relative to this directory
    // Set this to your web server's document root
    projectRoot: resolve(__dirname, '../..'),  // /app directory

    // Files to always include (even if not discovered via imports)
    alwaysInclude: [
        'index.html',
        'manifest.json'
    ],

    // Directories to scan and include all files from (e.g., vendor libs)
    vendorDirs: [
        // 'vendor/some-library'
    ],

    // File extensions to cache
    cacheableExtensions: new Set([
        '.js', '.css', '.html', '.json',
        '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico',
        '.woff', '.woff2', '.ttf', '.eot'
    ])
};

// =============================================================================
// Dependency Spider
// =============================================================================

class DependencySpider {
    constructor(config) {
        this.config = config;
        this.discovered = new Set();
        this.visited = new Set();
        this.errors = [];
    }

    /**
     * Parse HTML file for script tags, link tags, and inline module imports
     */
    parseHtml(filePath) {
        const content = readFileSync(filePath, 'utf-8');
        const deps = [];

        // Find <script src="...">
        const scriptRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
        let match;
        while ((match = scriptRegex.exec(content)) !== null) {
            deps.push(match[1]);
        }

        // Find inline <script type="module">...</script> and parse imports
        const inlineScriptRegex = /<script[^>]*type=["']module["'][^>]*>([\s\S]*?)<\/script>/gi;
        while ((match = inlineScriptRegex.exec(content)) !== null) {
            const scriptContent = match[1];
            const importRegex = /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g;
            let importMatch;
            while ((importMatch = importRegex.exec(scriptContent)) !== null) {
                deps.push(importMatch[1]);
            }
        }

        // Find <link rel="stylesheet" href="...">
        const linkRegex = /<link[^>]+href=["']([^"']+)["'][^>]*>/gi;
        while ((match = linkRegex.exec(content)) !== null) {
            const href = match[1];
            if (!href.startsWith('http')) {
                deps.push(href);
            }
        }

        return deps;
    }

    /**
     * Parse JavaScript file for import statements
     */
    parseJs(filePath) {
        const content = readFileSync(filePath, 'utf-8');
        const deps = [];

        // Static imports: import ... from '...'
        const staticImportRegex = /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g;
        let match;
        while ((match = staticImportRegex.exec(content)) !== null) {
            deps.push(match[1]);
        }

        // Re-exports: export { ... } from '...'
        const reExportRegex = /export\s+\{[^}]*\}\s+from\s+['"]([^'"]+)['"]/g;
        while ((match = reExportRegex.exec(content)) !== null) {
            deps.push(match[1]);
        }

        // Export all: export * from '...'
        const exportAllRegex = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
        while ((match = exportAllRegex.exec(content)) !== null) {
            deps.push(match[1]);
        }

        // Dynamic imports: import('...')
        const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        while ((match = dynamicImportRegex.exec(content)) !== null) {
            deps.push(match[1]);
        }

        // Fetch calls for JSON/config files
        const fetchRegex = /fetch\s*\(\s*['"]([^'"]+\.json)['"]/g;
        while ((match = fetchRegex.exec(content)) !== null) {
            deps.push(match[1]);
        }

        return deps;
    }

    /**
     * Resolve a dependency path relative to the importing file
     */
    resolvePath(dep, fromFile) {
        // Skip external URLs
        if (dep.startsWith('http://') || dep.startsWith('https://') || dep.startsWith('//')) {
            return null;
        }

        const fromDir = dirname(fromFile);
        let resolved;

        if (dep.startsWith('./') || dep.startsWith('../')) {
            // Relative path
            resolved = resolve(fromDir, dep);
        } else if (dep.startsWith('/')) {
            // Absolute path from project root
            resolved = resolve(this.config.projectRoot, dep.slice(1));
        } else {
            // Bare specifier - try relative first
            resolved = resolve(fromDir, dep);
        }

        // Try adding .js extension if file doesn't exist
        if (!existsSync(resolved) && existsSync(resolved + '.js')) {
            resolved = resolved + '.js';
        }

        return existsSync(resolved) ? resolved : null;
    }

    /**
     * Recursively spider dependencies starting from a file
     */
    spider(filePath) {
        if (this.visited.has(filePath)) return;
        this.visited.add(filePath);

        if (!existsSync(filePath)) {
            this.errors.push(`File not found: ${filePath}`);
            return;
        }

        // Add to discovered files if cacheable
        const ext = extname(filePath).toLowerCase();
        if (this.config.cacheableExtensions.has(ext)) {
            this.discovered.add(filePath);
        }

        // Parse based on file type
        let deps = [];
        try {
            if (ext === '.html') {
                deps = this.parseHtml(filePath);
            } else if (ext === '.js') {
                deps = this.parseJs(filePath);
            }
        } catch (err) {
            this.errors.push(`Error parsing ${filePath}: ${err.message}`);
            return;
        }

        // Resolve and spider each dependency
        for (const dep of deps) {
            const resolved = this.resolvePath(dep, filePath);
            if (resolved) {
                this.spider(resolved);
            }
        }
    }

    /**
     * Add all files from a vendor directory
     */
    addVendorDir(vendorPath) {
        const fullPath = resolve(this.config.appRoot, vendorPath);
        if (!existsSync(fullPath)) {
            console.warn(`Vendor directory not found: ${vendorPath}`);
            return;
        }

        const addFilesRecursive = (dir) => {
            const entries = readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const entryPath = join(dir, entry.name);
                if (entry.isDirectory()) {
                    addFilesRecursive(entryPath);
                } else if (entry.isFile()) {
                    const ext = extname(entry.name).toLowerCase();
                    if (this.config.cacheableExtensions.has(ext)) {
                        this.discovered.add(entryPath);
                    }
                }
            }
        };

        addFilesRecursive(fullPath);
    }

    /**
     * Generate content hash for versioning
     * Any file change produces a new hash, preventing version mismatches
     */
    generateContentHash() {
        const hash = createHash('md5');
        const sortedFiles = [...this.discovered].sort();

        for (const file of sortedFiles) {
            try {
                const content = readFileSync(file);
                hash.update(content);
            } catch (err) {
                // Skip files that can't be read
            }
        }

        return hash.digest('hex').slice(0, 8);
    }

    /**
     * Convert absolute paths to URL paths relative to project root
     */
    toUrlPaths() {
        const urls = [];
        for (const file of this.discovered) {
            const relativePath = relative(this.config.projectRoot, file);
            // Ensure forward slashes and leading slash
            urls.push('/' + relativePath.replace(/\\/g, '/'));
        }
        return urls.sort();
    }

    /**
     * Run the spider and generate manifest
     */
    run() {
        console.log('Spidering dependencies...\n');

        // Start from entry point
        const entryPath = resolve(this.config.appRoot, this.config.entryPoint);
        this.spider(entryPath);

        // Add always-included files
        for (const file of this.config.alwaysInclude) {
            const filePath = resolve(this.config.appRoot, file);
            if (existsSync(filePath)) {
                this.discovered.add(filePath);
            }
        }

        // Add vendor directories
        for (const vendorDir of this.config.vendorDirs) {
            this.addVendorDir(vendorDir);
        }

        // Generate manifest
        const urls = this.toUrlPaths();
        const contentHash = this.generateContentHash();

        const manifest = {
            version: contentHash,
            timestamp: Date.now(),
            generatedAt: new Date().toISOString(),
            fileCount: urls.length,
            files: urls
        };

        // Write manifest
        const outputPath = resolve(this.config.appRoot, this.config.outputFile);
        writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

        // Report results
        console.log(`Discovered ${urls.length} files`);
        console.log(`Content hash: ${contentHash}`);
        console.log(`Manifest written to: ${this.config.outputFile}\n`);

        if (this.errors.length > 0) {
            console.log('Warnings:');
            for (const err of this.errors) {
                console.log(`  - ${err}`);
            }
            console.log('');
        }

        // Summary by file type
        const byType = {};
        for (const url of urls) {
            const ext = extname(url) || 'other';
            byType[ext] = (byType[ext] || 0) + 1;
        }

        console.log('Files by type:');
        for (const [ext, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
            console.log(`  ${ext}: ${count}`);
        }

        return manifest;
    }
}

// Run spider
const spider = new DependencySpider(CONFIG);
spider.run();
