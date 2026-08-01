#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
// Scaffold a new site config.
//
// Usage:
//   node new-site.js <site-id> "<title>" "<description>"
//
// Creates sites/<site-id>.json with an empty pages list — open it
// afterward and add page ids (see list-pages.js for the full list of
// available ids), then run `node build.js` to generate the site.
// ════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const SITES_DIR = path.join(__dirname, 'sites');

function main() {
  const [siteId, title, description] = process.argv.slice(2);

  if (!siteId) {
    console.error('Usage: node new-site.js <site-id> "<title>" "<description>"');
    process.exit(1);
  }

  const outPath = path.join(SITES_DIR, `${siteId}.json`);
  if (fs.existsSync(outPath)) {
    console.error(`⚠ sites/${siteId}.json already exists — pick a different id or edit it directly.`);
    process.exit(1);
  }

  fs.mkdirSync(SITES_DIR, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({
    title: title || siteId,
    description: description || '',
    pages: []
  }, null, 2) + '\n');

  console.log(`✓ created sites/${siteId}.json`);
  console.log(`  Run "node list-pages.js" to see available page ids, add them to the "pages" array, then "node build.js ${siteId}".`);
}

main();
