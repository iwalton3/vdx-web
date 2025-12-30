#!/usr/bin/env node
/**
 * Source Map Validation Tool
 *
 * Validates that source maps correctly map minified code back to original source.
 * Checks structure, names array, mapping validity, and sample positions.
 *
 * Usage:
 *   node validate-sourcemaps.js                    # Validate all dist/ files
 *   node validate-sourcemaps.js file.js            # Validate specific file
 *   node validate-sourcemaps.js --verbose file.js  # Show detailed info
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// VLQ decoding
const VLQ_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const VLQ_LOOKUP = {};
for (let i = 0; i < VLQ_CHARS.length; i++) {
    VLQ_LOOKUP[VLQ_CHARS[i]] = i;
}

function vlqDecode(encoded) {
    const values = [];
    let i = 0;

    while (i < encoded.length) {
        let value = 0;
        let shift = 0;
        let continuation = true;

        while (continuation && i < encoded.length) {
            const char = encoded[i++];
            const digit = VLQ_LOOKUP[char];
            if (digit === undefined) {
                throw new Error(`Invalid VLQ character: ${char}`);
            }

            continuation = (digit & 0x20) !== 0;
            value += (digit & 0x1f) << shift;
            shift += 5;
        }

        // Convert from VLQ signed format
        const isNegative = (value & 1) === 1;
        value = value >> 1;
        if (isNegative) value = -value;

        values.push(value);
    }

    return values;
}

function decodeMappingLine(line) {
    if (!line) return [];

    const segments = line.split(',');
    const decoded = [];

    for (const segment of segments) {
        if (!segment) continue;

        try {
            const values = vlqDecode(segment);
            decoded.push({
                outputColumn: values[0],
                sourceIndex: values.length > 1 ? values[1] : null,
                sourceLine: values.length > 2 ? values[2] : null,
                sourceColumn: values.length > 3 ? values[3] : null,
                nameIndex: values.length > 4 ? values[4] : null,
                raw: segment
            });
        } catch (e) {
            decoded.push({ error: e.message, raw: segment });
        }
    }

    return decoded;
}

function validateSourceMap(jsFile, verbose = false) {
    const issues = [];
    const warnings = [];
    const info = [];

    // Check if JS file exists
    if (!fs.existsSync(jsFile)) {
        return { issues: [`File not found: ${jsFile}`], warnings, info };
    }

    const jsContent = fs.readFileSync(jsFile, 'utf8');

    // Check for sourceMappingURL
    const urlMatch = jsContent.match(/\/\/[#@]\s*sourceMappingURL\s*=\s*(\S+)/);
    if (!urlMatch) {
        return { issues: [`No sourceMappingURL found in ${jsFile}`], warnings, info };
    }

    const mapFile = path.join(path.dirname(jsFile), urlMatch[1]);
    if (!fs.existsSync(mapFile)) {
        return { issues: [`Source map not found: ${mapFile}`], warnings, info };
    }

    let map;
    try {
        map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
    } catch (e) {
        return { issues: [`Failed to parse source map: ${e.message}`], warnings, info };
    }

    // 1. Check version
    if (map.version !== 3) {
        issues.push(`Invalid version: ${map.version} (expected 3)`);
    } else {
        info.push(`Version: 3`);
    }

    // 2. Check sources exist
    if (!map.sources || map.sources.length === 0) {
        issues.push('No sources defined');
    } else {
        info.push(`Sources: ${map.sources.length} file(s)`);
        if (verbose) {
            for (const src of map.sources) {
                info.push(`  - ${src}`);
            }
        }
    }

    // 3. Check sourcesContent present
    if (!map.sourcesContent || map.sourcesContent.length === 0) {
        warnings.push('No sourcesContent - debugging experience may be degraded');
    } else {
        info.push(`Sources content: ${map.sourcesContent.length} embedded`);
    }

    // 4. Check names array (CRITICAL for "original names" issue)
    if (!map.names || map.names.length === 0) {
        warnings.push('Names array is empty - original variable names will not show in debugger');
    } else {
        info.push(`Names: ${map.names.length} identifier(s)`);
        if (verbose && map.names.length <= 20) {
            info.push(`  Sample: ${map.names.slice(0, 10).join(', ')}...`);
        }
    }

    // 5. Validate mappings structure
    if (!map.mappings) {
        issues.push('No mappings field');
    } else {
        const mappingLines = map.mappings.split(';');
        info.push(`Mapping lines: ${mappingLines.length}`);

        let totalSegments = 0;
        let segmentsWithNames = 0;
        let decodeErrors = 0;
        let invalidSourceRefs = 0;
        let invalidNameRefs = 0;

        // Track absolute positions (mappings are relative)
        let absOutputCol = 0;
        let absSourceIdx = 0;
        let absSourceLine = 0;
        let absSourceCol = 0;
        let absNameIdx = 0;

        for (let lineNum = 0; lineNum < mappingLines.length; lineNum++) {
            const line = mappingLines[lineNum];
            if (!line) continue;

            absOutputCol = 0; // Reset for each output line

            const decoded = decodeMappingLine(line);

            for (const seg of decoded) {
                totalSegments++;

                if (seg.error) {
                    decodeErrors++;
                    if (verbose) {
                        issues.push(`Line ${lineNum}: Decode error - ${seg.error} (${seg.raw})`);
                    }
                    continue;
                }

                // Update absolute positions
                absOutputCol += seg.outputColumn;
                if (seg.sourceIndex !== null) absSourceIdx += seg.sourceIndex;
                if (seg.sourceLine !== null) absSourceLine += seg.sourceLine;
                if (seg.sourceColumn !== null) absSourceCol += seg.sourceColumn;
                if (seg.nameIndex !== null) {
                    absNameIdx += seg.nameIndex;
                    segmentsWithNames++;
                }

                // Validate source index
                if (seg.sourceIndex !== null && absSourceIdx >= map.sources.length) {
                    invalidSourceRefs++;
                    if (verbose) {
                        issues.push(`Line ${lineNum}: Source index ${absSourceIdx} out of range (max: ${map.sources.length - 1})`);
                    }
                }

                // Validate name index
                if (seg.nameIndex !== null && absNameIdx >= map.names.length) {
                    invalidNameRefs++;
                    if (verbose) {
                        issues.push(`Line ${lineNum}: Name index ${absNameIdx} out of range (max: ${map.names.length - 1})`);
                    }
                }
            }
        }

        info.push(`Total segments: ${totalSegments}`);
        info.push(`Segments with names: ${segmentsWithNames} (${((segmentsWithNames / totalSegments) * 100).toFixed(1)}%)`);

        if (decodeErrors > 0) {
            issues.push(`${decodeErrors} segment(s) failed to decode`);
        }

        if (invalidSourceRefs > 0) {
            issues.push(`${invalidSourceRefs} segment(s) reference invalid source index`);
        }

        if (invalidNameRefs > 0) {
            issues.push(`${invalidNameRefs} segment(s) reference invalid name index`);
        }
    }

    // 6. Spot-check first few mappings point to valid source locations
    if (map.sourcesContent && map.sourcesContent.length > 0 && map.mappings) {
        const firstLine = map.mappings.split(';')[0];
        if (firstLine) {
            const firstSegments = decodeMappingLine(firstLine);
            if (firstSegments.length > 0 && !firstSegments[0].error) {
                const seg = firstSegments[0];
                const sourceContent = map.sourcesContent[0];
                if (sourceContent) {
                    const sourceLines = sourceContent.split('\n');
                    if (seg.sourceLine !== null && seg.sourceLine >= sourceLines.length) {
                        issues.push(`First mapping points beyond source (line ${seg.sourceLine}, source has ${sourceLines.length} lines)`);
                    } else {
                        info.push(`First mapping validated: points to line ${seg.sourceLine + 1}`);
                    }
                }
            }
        }
    }

    return { issues, warnings, info };
}

function main() {
    const args = process.argv.slice(2);
    let verbose = false;
    const files = [];

    for (const arg of args) {
        if (arg === '--verbose' || arg === '-v') {
            verbose = true;
        } else if (arg === '--help' || arg === '-h') {
            console.log(`
Source Map Validation Tool

Usage:
  node validate-sourcemaps.js                    # Validate all dist/ files
  node validate-sourcemaps.js file.js            # Validate specific file
  node validate-sourcemaps.js --verbose file.js  # Show detailed info

Options:
  --verbose, -v   Show detailed information
  --help, -h      Show this help message

Exit codes:
  0   All validations passed
  1   Warnings found (names array empty, etc.)
  2   Errors found (invalid mappings, missing files, etc.)
`);
            process.exit(0);
        } else {
            files.push(arg);
        }
    }

    // Default to dist/ files if none specified
    if (files.length === 0) {
        const distDir = path.join(__dirname, 'app/dist');
        if (fs.existsSync(distDir)) {
            const distFiles = fs.readdirSync(distDir)
                .filter(f => f.endsWith('.js') && !f.endsWith('.map'))
                .map(f => path.join(distDir, f));
            files.push(...distFiles);
        }

        if (files.length === 0) {
            console.log('No files to validate. Specify files or ensure app/dist/ contains .js files.');
            process.exit(0);
        }
    }

    console.log(`Validating ${files.length} file(s)...\n`);

    let hasErrors = false;
    let hasWarnings = false;

    for (const file of files) {
        const baseName = path.basename(file);
        const { issues, warnings, info } = validateSourceMap(file, verbose);

        if (issues.length === 0 && warnings.length === 0) {
            console.log(`✓ ${baseName}`);
        } else if (issues.length === 0) {
            console.log(`⚠ ${baseName}`);
            hasWarnings = true;
        } else {
            console.log(`✗ ${baseName}`);
            hasErrors = true;
        }

        if (verbose) {
            for (const i of info) {
                console.log(`    ${i}`);
            }
        }

        for (const w of warnings) {
            console.log(`    ⚠ ${w}`);
        }

        for (const e of issues) {
            console.log(`    ✗ ${e}`);
        }

        if (issues.length > 0 || warnings.length > 0 || verbose) {
            console.log();
        }
    }

    if (hasErrors) {
        console.log('\n❌ Validation failed with errors');
        process.exit(2);
    } else if (hasWarnings) {
        console.log('\n⚠️  Validation passed with warnings');
        process.exit(1);
    } else {
        console.log('\n✅ All validations passed');
        process.exit(0);
    }
}

main();
