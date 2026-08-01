#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
// Diagnose mismatches between library-manifest.json's "file" fields
// and what's actually present in library/. Run this once after
// copying your real files in, to catch every filename mismatch at
// once instead of one build-warning at a time.
//
// Usage: node diagnose-library.js
// ════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const LIBRARY_DIR = path.join(__dirname, 'library');
const MANIFEST_PATH = path.join(__dirname, 'library-manifest.json');

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const actualFiles = new Set(fs.readdirSync(LIBRARY_DIR).filter(f => f.endsWith('.html')));

const missing = [];
const matched = [];
manifest.pages.forEach(p => {
  if (actualFiles.has(p.file)) {
    matched.push(p);
  } else {
    missing.push(p);
  }
});

const referencedFiles = new Set(manifest.pages.map(p => p.file));
const unreferenced = [...actualFiles].filter(f => !referencedFiles.has(f));

console.log(`\n✓ ${matched.length} manifest entries match an actual file`);
console.log(`⚠ ${missing.length} manifest entries have NO matching file on disk:\n`);
missing.forEach(p => {
  // try to suggest a close match by normalizing both sides
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = norm(p.file);
  const suggestion = [...actualFiles].find(f => norm(f) === target || norm(f).includes(target.slice(0, 15)));
  console.log(`  id: ${p.id}`);
  console.log(`    manifest says : "${p.file}"`);
  console.log(`    closest match : ${suggestion ? `"${suggestion}"` : '(none found — check manually)'}`);
  console.log('');
});

if (unreferenced.length) {
  console.log(`\nℹ ${unreferenced.length} files in library/ are not referenced by any manifest entry:`);
  unreferenced.forEach(f => console.log(`  "${f}"`));
}
