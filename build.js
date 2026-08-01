#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
// Multi-site builder
//
// Reads:
//   library/                  — the canonical HTML pages (source of truth)
//   library-manifest.json     — id/title/description/category for each page
//   sites/*.json              — one file per site: which pages it includes
//
// Writes:
//   dist/<site-id>/index.html      — generated overview page for that site
//   dist/<site-id>/<page-file>     — copies of the referenced library pages
//   dist/index.html                — root page listing all sites
//
// Usage:
//   node build.js              — build all sites
//   node build.js site-a       — build just one site (faster while testing)
// ════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const LIBRARY_DIR = path.join(ROOT, 'library');
const SITES_DIR = path.join(ROOT, 'sites');
const DIST_DIR = path.join(ROOT, 'dist');
const MANIFEST_PATH = path.join(ROOT, 'library-manifest.json');

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`Missing ${MANIFEST_PATH}`);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const byId = new Map(manifest.pages.map(p => [p.id, p]));
  return { manifest, byId };
}

function loadSiteConfigs(onlySiteId) {
  if (!fs.existsSync(SITES_DIR)) {
    console.error(`Missing ${SITES_DIR}/ — create at least one sites/<name>.json`);
    process.exit(1);
  }
  const files = fs.readdirSync(SITES_DIR).filter(f => f.endsWith('.json'));
  const configs = [];
  for (const f of files) {
    const id = f.replace(/\.json$/, '');
    if (onlySiteId && id !== onlySiteId) continue;
    const cfg = JSON.parse(fs.readFileSync(path.join(SITES_DIR, f), 'utf8'));
    configs.push({ id, ...cfg });
  }
  return configs;
}

function pageIndexHtml(site, pages) {
  const grouped = new Map();
  pages.forEach(p => {
    const cat = p.category || 'overig';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat).push(p);
  });

  let sections = '';
  for (const [catId, catPages] of grouped) {
    sections += `
    <section class="cat">
      <h2>${esc(catId)}</h2>
      <ul>
        ${catPages.map(p => `
        <li>
          <a href="${esc(p.file)}" target="_blank">${esc(p.title)}</a>
          <p>${esc(p.description || '')}</p>
        </li>`).join('')}
      </ul>
    </section>`;
  }

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(site.title || site.id)} — De Baak</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 24px; color: #1a1a2e; }
  h1 { color: #005ADC; }
  .cat { margin-bottom: 40px; }
  .cat h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .08em; color: #4A5568; border-bottom: 1px solid #D6E4FA; padding-bottom: 8px; }
  ul { list-style: none; padding: 0; }
  li { padding: 12px 0; border-bottom: 1px solid #F5F5EB; }
  a { color: #005ADC; font-weight: 600; text-decoration: none; }
  a:hover { text-decoration: underline; }
  p { margin: 4px 0 0; font-size: 13px; color: #4A5568; }
</style>
</head>
<body>
  <h1>${esc(site.title || site.id)}</h1>
  ${site.description ? `<p>${esc(site.description)}</p>` : ''}
  ${sections}
</body>
</html>`;
}

function rootIndexHtml(builtSites) {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>De Baak — Sites overzicht</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px 24px; color: #1a1a2e; }
  h1 { color: #005ADC; }
  ul { list-style: none; padding: 0; }
  li { padding: 10px 0; border-bottom: 1px solid #F5F5EB; }
  a { color: #005ADC; font-weight: 600; text-decoration: none; font-size: 16px; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
  <h1>Sites</h1>
  <ul>
    ${builtSites.map(s => `<li><a href="./${esc(s.id)}/">${esc(s.title || s.id)}</a> — ${s.pageCount} pagina's</li>`).join('')}
  </ul>
</body>
</html>`;
}

function build() {
  const onlySiteId = process.argv[2];
  const { byId } = loadManifest();
  const siteConfigs = loadSiteConfigs(onlySiteId);

  if (siteConfigs.length === 0) {
    console.error(onlySiteId ? `No site config found for "${onlySiteId}"` : 'No site configs found in sites/');
    process.exit(1);
  }

  fs.mkdirSync(DIST_DIR, { recursive: true });
  const builtSites = [];

  for (const site of siteConfigs) {
    const outDir = path.join(DIST_DIR, site.id);
    fs.mkdirSync(outDir, { recursive: true });

    const pages = [];
    for (const pageId of site.pages || []) {
      const p = byId.get(pageId);
      if (!p) {
        console.warn(`  ⚠ site "${site.id}": unknown page id "${pageId}" — skipping`);
        continue;
      }
      const srcPath = path.join(LIBRARY_DIR, p.file);
      if (!fs.existsSync(srcPath)) {
        console.warn(`  ⚠ site "${site.id}": library file missing on disk: "${p.file}" — skipping`);
        continue;
      }
      fs.copyFileSync(srcPath, path.join(outDir, p.file));
      pages.push(p);
    }

    fs.writeFileSync(path.join(outDir, 'index.html'), pageIndexHtml(site, pages));
    builtSites.push({ id: site.id, title: site.title, pageCount: pages.length });
    console.log(`✓ built "${site.id}" — ${pages.length} pages`);
  }

  if (!onlySiteId) {
    fs.writeFileSync(path.join(DIST_DIR, 'index.html'), rootIndexHtml(builtSites));
    console.log(`✓ built root index — ${builtSites.length} sites`);
  }
}

build();
