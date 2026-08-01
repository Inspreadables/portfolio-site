#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
// List all pages in the library manifest, grouped by category, with
// their ids — use these ids in a sites/<name>.json "pages" array.
//
// Usage:
//   node list-pages.js               — list everything
//   node list-pages.js ai-tools-veiligheid   — filter to one category
// ════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, 'library-manifest.json');

function main() {
  const filterCat = process.argv[2];
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  const grouped = new Map();
  manifest.pages.forEach(p => {
    if (filterCat && p.category !== filterCat) return;
    if (!grouped.has(p.category)) grouped.set(p.category, []);
    grouped.get(p.category).push(p);
  });

  if (grouped.size === 0) {
    console.log(`No pages found${filterCat ? ` for category "${filterCat}"` : ''}.`);
    console.log(`Known categories: ${Object.keys(manifest.categories).join(', ')}`);
    return;
  }

  for (const [cat, pages] of grouped) {
    console.log(`\n${manifest.categories[cat] || cat}  (${cat})`);
    pages.forEach(p => console.log(`  ${p.id.padEnd(38)} ${p.title}`));
  }
}

main();
