#!/usr/bin/env node
/**
 * Open Inventor / VRML 1.0 to VRML 2.0 Converter
 * Converts SGI Open Inventor (.iv) and VRML 1.0 files to VRML 2.0/97 format
 */

const fs = require('fs');
const path = require('path');

function normalizeLineEndings(content) {
    // Handle old Mac (\r), Windows (\r\n), and Unix (\n)
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function parseSeparators(content) {
    const shapes = [];

    // Find all Separator blocks, then only process those that don't
    // contain nested Separators (leaf separators own their geometry directly)
    const separators = findAllSeparators(content);

    for (const sepContent of separators) {
        // Check if this separator contains nested Separator blocks
        // by removing them and seeing if geometry nodes remain at this level
        const stripped = stripNestedSeparators(sepContent);

        const hasGeometry = /\b(IndexedLineSet|IndexedFaceSet|PointSet|Sphere|Cylinder|Cube|Cone)\s*\{/.test(stripped);
        if (!hasGeometry) continue;

        // Parse only the content at this separator level (without nested separators)
        parseSeparatorContent(stripped, shapes);
    }

    return { shapes };
}

function stripNestedSeparators(content) {
    // Remove nested Separator { ... } blocks to get only this level's content
    let result = content;
    const regex = /(?:DEF\s+\w+\s+)?Separator\s*\{/g;
    let match;

    // Collect ranges to remove (nested separator blocks)
    const ranges = [];
    while ((match = regex.exec(content)) !== null) {
        const startBrace = match.index + match[0].length - 1;
        const block = extractBraceBlock(content, startBrace);
        if (block !== null) {
            // Remove from the start of the match to the closing brace
            const endPos = startBrace + block.length + 2; // +2 for { and }
            ranges.push([match.index, endPos]);
        }
    }

    // Remove ranges in reverse order to preserve indices
    for (let i = ranges.length - 1; i >= 0; i--) {
        result = result.substring(0, ranges[i][0]) + result.substring(ranges[i][1]);
    }

    return result;
}

function findAllSeparators(content) {
    const results = [];
    const regex = /(?:DEF\s+\w+\s+)?Separator\s*\{/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
        const startBrace = match.index + match[0].length - 1;
        const block = extractBraceBlock(content, startBrace);
        if (block !== null) {
            results.push(block);
        }
    }

    return results;
}

function extractBraceBlock(content, openBraceIndex) {
    let depth = 1;
    let i = openBraceIndex + 1;
    while (i < content.length && depth > 0) {
        if (content[i] === '{') depth++;
        else if (content[i] === '}') depth--;
        i++;
    }
    if (depth === 0) {
        return content.substring(openBraceIndex + 1, i - 1);
    }
    return null;
}

function parseSeparatorContent(content, shapes) {
    // VRML 1.0 uses sequential state: each Coordinate3 sets current coords,
    // each Material sets current material, geometry nodes use current state.
    // We scan for all nodes in order and track state.

    const nodeRegex = /\b(Material|Coordinate3|IndexedLineSet|IndexedFaceSet|Sphere|Cylinder|Cube|Cone)\s*\{/g;
    let currentMaterial = { diffuseColor: [0.8, 0.8, 0.8] };
    let currentPoints = [];
    let nodeMatch;

    while ((nodeMatch = nodeRegex.exec(content)) !== null) {
        const nodeType = nodeMatch[1];
        const braceStart = nodeMatch.index + nodeMatch[0].length - 1;
        const block = extractBraceBlock(content, braceStart);
        if (block === null) continue;

        // Advance regex past this block to avoid matching inside it
        nodeRegex.lastIndex = braceStart + block.length + 2;

        if (nodeType === 'Material') {
            const diffuseMatch = block.match(/diffuseColor\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
            if (diffuseMatch) {
                currentMaterial = { diffuseColor: [parseFloat(diffuseMatch[1]), parseFloat(diffuseMatch[2]), parseFloat(diffuseMatch[3])] };
            }
            const emissiveMatch = block.match(/emissiveColor\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
            if (emissiveMatch) {
                currentMaterial.emissiveColor = [parseFloat(emissiveMatch[1]), parseFloat(emissiveMatch[2]), parseFloat(emissiveMatch[3])];
            }
        } else if (nodeType === 'Coordinate3') {
            const pointsStr = block.match(/point\s*\[\s*([\s\S]*?)\s*\]/);
            if (pointsStr) {
                currentPoints = [];
                const pointMatches = pointsStr[1].matchAll(/([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g);
                for (const pm of pointMatches) {
                    currentPoints.push([parseFloat(pm[1]), parseFloat(pm[2]), parseFloat(pm[3])]);
                }
            }
        } else if (nodeType === 'IndexedLineSet' || nodeType === 'IndexedFaceSet') {
            const indexStr = block.match(/coordIndex\s*\[\s*([\s\S]*?)\s*\]/);
            if (indexStr && currentPoints.length > 0) {
                const indices = [];
                const indexMatches = indexStr[1].matchAll(/-?\d+/g);
                for (const im of indexMatches) {
                    indices.push(parseInt(im[0]));
                }
                if (indices.length > 0) {
                    shapes.push({ type: nodeType, points: currentPoints, indices, material: currentMaterial });
                }
            }
        } else if (nodeType === 'Sphere') {
            const radiusMatch = block.match(/radius\s+([\d.eE+]+)/);
            shapes.push({
                type: 'Sphere',
                radius: radiusMatch ? parseFloat(radiusMatch[1]) : 1,
                material: currentMaterial
            });
        } else if (nodeType === 'Cylinder') {
            const radiusMatch = block.match(/radius\s+([\d.eE+]+)/);
            const heightMatch = block.match(/height\s+([\d.eE+]+)/);
            shapes.push({
                type: 'Cylinder',
                radius: radiusMatch ? parseFloat(radiusMatch[1]) : 1,
                height: heightMatch ? parseFloat(heightMatch[1]) : 2,
                material: currentMaterial
            });
        } else if (nodeType === 'Cube') {
            const widthMatch = block.match(/width\s+([\d.eE+]+)/);
            const heightMatch = block.match(/height\s+([\d.eE+]+)/);
            const depthMatch = block.match(/depth\s+([\d.eE+]+)/);
            shapes.push({
                type: 'Box',
                width: widthMatch ? parseFloat(widthMatch[1]) : 2,
                height: heightMatch ? parseFloat(heightMatch[1]) : 2,
                depth: depthMatch ? parseFloat(depthMatch[1]) : 2,
                material: currentMaterial
            });
        } else if (nodeType === 'Cone') {
            const radiusMatch = block.match(/bottomRadius\s+([\d.eE+]+)/);
            const heightMatch = block.match(/height\s+([\d.eE+]+)/);
            shapes.push({
                type: 'Cone',
                bottomRadius: radiusMatch ? parseFloat(radiusMatch[1]) : 1,
                height: heightMatch ? parseFloat(heightMatch[1]) : 2,
                material: currentMaterial
            });
        }
    }
}

function generateVRML2(parsed) {
    const lines = [];

    lines.push('#VRML V2.0 utf8');
    lines.push('');
    lines.push('# Converted from Open Inventor / VRML 1.0 format');
    lines.push('# Generated by convert-inventor-to-vrml2.js');
    lines.push('');

    // Wrap all shapes in a Transform to orient Y-up (poles on Y axis)
    lines.push('Transform {');
    lines.push('  rotation 1 0 0 -1.5708');
    lines.push('  children [');
    lines.push('');

    // Convert each shape
    parsed.shapes.forEach((shape, index) => {
        lines.push(`# Shape ${index + 1}: ${shape.type}`);
        lines.push('Shape {');

        // Appearance
        lines.push('  appearance Appearance {');
        lines.push('    material Material {');
        const color = shape.material.diffuseColor || [0.8, 0.8, 0.8];
        if (shape.type === 'IndexedLineSet') {
            lines.push(`      emissiveColor ${color.join(' ')}`);
        } else {
            lines.push(`      diffuseColor ${color.join(' ')}`);
            if (shape.type === 'Sphere') {
                lines.push('      transparency 0.5');
            }
        }
        lines.push('    }');
        lines.push('  }');

        // Geometry based on type
        if (shape.type === 'IndexedLineSet' || shape.type === 'IndexedFaceSet') {
            lines.push(`  geometry ${shape.type} {`);
            lines.push('    coord Coordinate {');
            lines.push('      point [');
            shape.points.forEach((p, i) => {
                const comma = i < shape.points.length - 1 ? ',' : '';
                lines.push(`        ${p[0]} ${p[1]} ${p[2]}${comma}`);
            });
            lines.push('      ]');
            lines.push('    }');
            lines.push('    coordIndex [');
            const indexRows = [];
            for (let i = 0; i < shape.indices.length; i += 10) {
                const row = shape.indices.slice(i, i + 10);
                indexRows.push('      ' + row.join(', '));
            }
            lines.push(indexRows.join(',\n'));
            lines.push('    ]');
            lines.push('  }');
        } else if (shape.type === 'Cylinder') {
            lines.push(`  geometry Cylinder { radius ${shape.radius} height ${shape.height} }`);
        } else if (shape.type === 'Sphere') {
            lines.push(`  geometry Sphere { radius ${shape.radius} }`);
        } else if (shape.type === 'Box') {
            lines.push(`  geometry Box { size ${shape.width} ${shape.height} ${shape.depth} }`);
        } else if (shape.type === 'Cone') {
            lines.push(`  geometry Cone { bottomRadius ${shape.bottomRadius} height ${shape.height} }`);
        }

        lines.push('}');
        lines.push('');
    });

    // Close Transform
    lines.push('  ] # end children');
    lines.push('} # end Transform');

    return lines.join('\n');
}

// Main execution
const inputFile = process.argv[2] || 'vrml-files/ch.wrl';
const outputFile = process.argv[3] || inputFile.replace('.wrl', '-v2.wrl');

console.log(`Converting: ${inputFile} -> ${outputFile}`);

try {
    let content = fs.readFileSync(inputFile, 'utf8');
    content = normalizeLineEndings(content);

    // Check if already VRML 2.0
    if (content.startsWith('#VRML V2.0')) {
        console.log('File is already VRML 2.0 format.');
        process.exit(0);
    }

    // Check if Open Inventor or VRML 1.0 format
    if (!content.startsWith('#Inventor') && !content.startsWith('#VRML V1.0')) {
        console.log('Warning: File does not appear to be Open Inventor or VRML 1.0 format.');
    }

    const parsed = parseSeparators(content);
    console.log(`Found ${parsed.shapes.length} shapes`);

    if (parsed.shapes.length === 0) {
        console.error('No shapes found in file. Check file format.');
        process.exit(1);
    }

    const vrml2 = generateVRML2(parsed);
    fs.writeFileSync(outputFile, vrml2);

    console.log(`Successfully converted to VRML 2.0: ${outputFile}`);
    console.log(`Output size: ${(vrml2.length / 1024).toFixed(2)} KB`);
} catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
}
