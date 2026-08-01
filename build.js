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

  const catLabels = {
    'strategie-positionering': 'Strategie & Positionering',
    'kennismanagement-ai': 'Kennismanagement & AI',
    'mt-briefings-pilots': 'MT Briefings & Pilots',
    'ld-trainingsontwerp': 'L&D & Trainingsontwerp',
    'document-management-werkproces': 'Document Management & Werkproces',
    'ai-tools-veiligheid': 'AI Tools & Veiligheid',
    'headshots-media': 'Headshots & Media',
    'overig': 'Overig'
  };

  const borderColors = ['var(--primary)', 'var(--secondary)', 'var(--primary-d)'];
  let catIndex = 0;
  let sections = '';
  for (const [catId, catPages] of grouped) {
    const border = borderColors[catIndex++ % borderColors.length];
    sections += `
    <section class="cat-block reveal">
      <div class="cat-hd">
        <span class="section-rule"></span>
        <h2>${esc(catLabels[catId] || catId)}</h2>
      </div>
      <div class="g3">
        ${catPages.map(p => `
        <a class="card" href="${esc(p.file)}" target="_blank" style="border-top-color:${border}">
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.description || '')}</p>
        </a>`).join('')}
      </div>
    </section>`;
  }

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(site.title || site.id)} — De Baak</title>
<style>
  :root {
    --primary:   #005ADC;
    --secondary: #00A555;
    --accent:    #FFE100;
    --bg:        #F5F5EB;
    --white:     #FFFFFF;
    --text:      #1A1A2E;
    --grey-mid:  #4A5568;
    --primary-d: #003A8C;
    --shadow:    0 4px 20px rgba(0,90,220,.12);
    --r: 16px;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }

  #progress { position:fixed; top:0; left:0; height:3px; width:0; background:linear-gradient(90deg,#00A555,#FFE100); z-index:100; transition:width .2s; }

  .hero {
    background: linear-gradient(135deg, #005ADC 0%, #003A8C 100%);
    color: #fff; position: relative; overflow: hidden;
    padding: 72px 40px 88px;
  }
  .hero::after {
    content: ""; position: absolute; bottom: 0; left: 0; right: 0; height: 6px;
    background: linear-gradient(90deg, #00A555 0%, #FFE100 50%, #00A555 100%);
  }
  .hero-in { max-width: 1100px; margin: 0 auto; }
  .eyebrow {
    display: inline-block; font-size: .68rem; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase;
    background: rgba(255,225,0,.12); color: #FFE100;
    border: 1px solid rgba(255,225,0,.35); border-radius: 100px;
    padding: 6px 18px; margin-bottom: 20px;
  }
  .hero h1 { font-size: 2.6rem; font-weight: 900; letter-spacing: -.01em; max-width: 760px; }
  .hero p.lead { margin-top: 14px; font-size: 1.05rem; color: rgba(255,255,255,.85); max-width: 620px; }
  .hero-rule { width: 56px; height: 3px; background: linear-gradient(90deg, #FFE100, #00A555); border: none; border-radius: 2px; margin-top: 26px; }

  main { max-width: 1100px; margin: -40px auto 0; padding: 0 40px 100px; position: relative; z-index: 1; }

  .cat-block { margin-bottom: 56px; }
  .cat-hd { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; }
  .section-rule { width: 32px; height: 3px; background: var(--secondary); border-radius: 2px; }
  .cat-hd h2 { font-size: 1.05rem; font-weight: 700; color: var(--primary-d); }

  .g3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.3rem; }
  @media (max-width: 900px) { .g3 { grid-template-columns: 1fr; gap: .85rem; } }

  .card {
    display: block; background: #fff; border-radius: var(--r);
    border-top: 4px solid var(--primary); box-shadow: var(--shadow);
    padding: 1.3rem 1.4rem; text-decoration: none; color: inherit;
    transition: transform .15s ease, box-shadow .15s ease;
  }
  .card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,90,220,.18); }
  .card h3 { font-size: 1rem; font-weight: 700; color: var(--primary-d); margin-bottom: 8px; }
  .card p { font-size: .88rem; color: var(--grey-mid); }

  footer { background: var(--primary); color: #fff; padding: 2.5rem 3rem; position: relative; overflow: hidden; }
  footer::before { content:""; position:absolute; top:0; left:0; right:0; height:6px; background:linear-gradient(90deg,#00A555 0%,#FFE100 50%,#00A555 100%); }
  footer::after { content:""; position:absolute; top:0; right:0; border-style:solid; border-width:0 200px 200px 0; border-color: transparent rgba(255,255,255,.07) transparent transparent; }
  .footer-brand { font-size: 1.8rem; font-weight: 900; }
  .footer-tag { color: rgba(255,255,255,.75); margin-top: .3rem; font-size: .95rem; }

  .reveal { opacity: 0; transform: translateY(20px); transition: opacity .5s ease, transform .5s ease; }
  .reveal.visible { opacity: 1; transform: none; }
</style>
</head>
<body>
  <div id="progress"></div>
  <section class="hero">
    <div class="hero-in">
      <span class="eyebrow">De Baak · Publicatiebibliotheek</span>
      <h1>${esc(site.title || site.id)}</h1>
      ${site.description ? `<p class="lead">${esc(site.description)}</p>` : ''}
      <hr class="hero-rule">
    </div>
  </section>
  <main>
    ${sections}
  </main>
  <footer>
    <div class="footer-brand">De Baak</div>
    <div class="footer-tag">Training · Ontwikkeling · Leiderschap · Sinds 1947 · debaak.nl</div>
  </footer>
  <script>
    window.addEventListener('scroll', () => {
      const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100;
      document.getElementById('progress').style.width = pct + '%';
    });
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  </script>
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
  :root {
    --primary: #005ADC; --secondary: #00A555; --primary-d: #003A8C;
    --bg: #F5F5EB; --text: #1A1A2E; --grey-mid: #4A5568;
    --shadow: 0 4px 20px rgba(0,90,220,.12); --r: 16px;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }

  .hero {
    background: linear-gradient(135deg, #005ADC 0%, #003A8C 100%);
    color: #fff; position: relative; overflow: hidden; padding: 72px 40px 88px;
  }
  .hero::after {
    content: ""; position: absolute; bottom: 0; left: 0; right: 0; height: 6px;
    background: linear-gradient(90deg, #00A555 0%, #FFE100 50%, #00A555 100%);
  }
  .hero-in { max-width: 900px; margin: 0 auto; }
  .eyebrow {
    display: inline-block; font-size: .68rem; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; background: rgba(255,225,0,.12); color: #FFE100;
    border: 1px solid rgba(255,225,0,.35); border-radius: 100px; padding: 6px 18px; margin-bottom: 20px;
  }
  .hero h1 { font-size: 2.6rem; font-weight: 900; letter-spacing: -.01em; }
  .hero-rule { width: 56px; height: 3px; background: linear-gradient(90deg, #FFE100, #00A555); border: none; border-radius: 2px; margin-top: 26px; }

  main { max-width: 900px; margin: -40px auto 0; padding: 0 40px 100px; position: relative; z-index: 1; }
  .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.3rem; }
  @media (max-width: 700px) { .g2 { grid-template-columns: 1fr; } }

  .card {
    display: block; background: #fff; border-radius: var(--r);
    border-top: 4px solid var(--primary); box-shadow: var(--shadow);
    padding: 1.4rem 1.5rem; text-decoration: none; color: inherit;
    transition: transform .15s ease, box-shadow .15s ease;
  }
  .card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,90,220,.18); }
  .card h2 { font-size: 1.1rem; font-weight: 700; color: var(--primary-d); }
  .card p { font-size: .85rem; color: var(--grey-mid); margin-top: 6px; }

  footer { background: var(--primary); color: #fff; padding: 2.5rem 3rem; position: relative; overflow: hidden; }
  footer::before { content:""; position:absolute; top:0; left:0; right:0; height:6px; background:linear-gradient(90deg,#00A555 0%,#FFE100 50%,#00A555 100%); }
  footer::after { content:""; position:absolute; top:0; right:0; border-style:solid; border-width:0 200px 200px 0; border-color: transparent rgba(255,255,255,.07) transparent transparent; }
  .footer-brand { font-size: 1.8rem; font-weight: 900; }
  .footer-tag { color: rgba(255,255,255,.75); margin-top: .3rem; font-size: .95rem; }
</style>
</head>
<body>
  <section class="hero">
    <div class="hero-in">
      <span class="eyebrow">De Baak · Kennisplatform</span>
      <h1>Sites</h1>
      <hr class="hero-rule">
    </div>
  </section>
  <main>
    <div class="g2">
      ${builtSites.map(s => `
      <a class="card" href="./${esc(s.id)}/">
        <h2>${esc(s.title || s.id)}</h2>
        <p>${s.pageCount} publicaties</p>
      </a>`).join('')}
    </div>
  </main>
  <footer>
    <div class="footer-brand">De Baak</div>
    <div class="footer-tag">Training · Ontwikkeling · Leiderschap · Sinds 1947 · debaak.nl</div>
  </footer>
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
