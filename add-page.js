#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
// Add a new page to the library manifest.
//
// Usage:
//   node add-page.js <file.html> "<title>" "<description>" <category-id>
//
// Example:
//   node add-page.js "nieuwe-infographic.html" "Nieuwe Infographic" \
//     "Korte omschrijving" strategie-positionering
//
// The .html file itself must already exist in library/ — this script
// only registers it in library-manifest.json so it can be referenced
// by id in a sites/*.json config. Run `node list-pages.js` afterward
// to see the generated id.
// ════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, 'library-manifest.json');
const LIBRARY_DIR = path.join(__dirname, 'library');

function slugify(s) {
  return s.toLowerCase()
    .replace(/\.html$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function main() {
  const [file, title, description, category] = process.argv.slice(2);

  if (!file || !title) {
    console.error('Usage: node add-page.js <file.html> "<title>" "<description>" <category-id>');
    process.exit(1);
  }

  const srcPath = path.join(LIBRARY_DIR, file);
  if (!fs.existsSync(srcPath)) {
    console.error(`⚠ "${file}" not found in library/ — copy the .html file there first, then run this again.`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  let id = slugify(title);
  let suffix = 2;
  const existingIds = new Set(manifest.pages.map(p => p.id));
  while (existingIds.has(id)) {
    id = `${slugify(title)}-${suffix++}`;
  }

  const cat = category && manifest.categories[category] ? category : 'overig';
  if (category && cat !== category) {
    console.warn(`⚠ unknown category "${category}", falling back to "overig". Known categories: ${Object.keys(manifest.categories).join(', ')}`);
  }

  manifest.pages.push({ id, file, title, description: description || '', category: cat });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`✓ added "${title}" as id "${id}" (category: ${cat})`);
  console.log(`  Reference it in any sites/<name>.json "pages" array as: "${id}"`);
}

main();
