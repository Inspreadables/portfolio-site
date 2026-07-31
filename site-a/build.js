const fs = require('fs');
const path = require('path');

const publicDir = './public';
const configPath = './site-config.json';

// Check if manual index exists
if (fs.existsSync(path.join(publicDir, 'index.html'))) {
  console.log('Manual index.html found - not overwriting.');
  process.exit(0);
}

// Load config with fallback
let config = { 
  title: 'Overzicht', 
  sections: [], 
  autoInclude: true 
};

if (fs.existsSync(configPath)) {
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(raw);
  } catch (e) {
    console.warn('Config invalid - using defaults.');
  }
}

// Get all HTML files recursively
function getAllHtmlFiles(dir, baseDir) {
  if (baseDir === undefined) baseDir = '';
  const results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = path.join(baseDir, item.name);
    if (item.isDirectory()) {
      results.push(...getAllHtmlFiles(fullPath, relativePath));
    } else if (item.isFile() && item.name.endsWith('.html') && item.name !== 'index.html') {
      results.push(relativePath.replace(/\\/g, '/'));
    }
  }
  return results;
}

const allFiles = getAllHtmlFiles(publicDir);
console.log('Found ' + allFiles.length + ' HTML files.');

// Apply configuration
const configuredItems = [];
const sectionMap = {};

if (config.sections && Array.isArray(config.sections)) {
  config.sections.forEach(section => {
    sectionMap[section.name] = section.items || [];
    section.items.forEach(item => {
      if (allFiles.includes(item) && !configuredItems.includes(item)) {
        configuredItems.push(item);
      }
    });
  });
}

const remaining = allFiles.filter(f => !configuredItems.includes(f));

// Generate sections HTML
let sectionsHtml = '';

if (config.sections && Array.isArray(config.sections)) {
  config.sections.forEach(section => {
    const items = section.items.filter(f => allFiles.includes(f));
    if (items.length === 0) return;
    const links = items.map(f => {
      const label = path.basename(f, '.html').replace(/-/g, ' ');
      return '<li><a href="' + f + '">' + label + '</a></li>';
    }).join('');
    sectionsHtml += '<h2>' + section.name + '</h2><ul>' + links + '</ul>';
  });
}

if (config.autoInclude !== false && remaining.length > 0) {
  const links = remaining.sort().map(f => {
    const label = path.basename(f, '.html').replace(/-/g, ' ');
    return '<li><a href="' + f + '">' + label + '</a></li>';
  }).join('');
  sectionsHtml += '<h2>Overig</h2><ul>' + links + '</ul>';
}

if (!sectionsHtml) {
  sectionsHtml = '<p>No pages added yet.</p>';
}

// Generate HTML
const html = '<!DOCTYPE html>\n' +
'<html lang="nl">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'  <title>' + (config.title || 'Overzicht') + '</title>\n' +
'  <style>\n' +
'    body { font-family: "Segoe UI", system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1.5rem; background: #f8fafc; color: #1e293b; }\n' +
'    h1 { color: #0f2b4a; border-bottom: 3px solid #1e88e5; padding-bottom: 0.5rem; }\n' +
'    h2 { color: #1e3a5f; margin-top: 1.8rem; font-size: 1.3rem; }\n' +
'    ul { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; }\n' +
'    li { background: white; padding: 0.3rem 0.8rem; border-radius: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }\n' +
'    a { text-decoration: none; color: #1e88e5; font-weight: 500; }\n' +
'    a:hover { text-decoration: underline; color: #0d47a1; }\n' +
'    .meta { color: #64748b; font-size: 0.9rem; margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1rem; }\n' +
'  </style>\n' +
'</head>\n' +
'<body>\n' +
'  <h1>' + (config.title || 'Overzicht') + '</h1>\n' +
'  ' + sectionsHtml + '\n' +
'  <div class="meta">' + allFiles.length + ' pages - Auto generated</div>\n' +
'</body>\n' +
'</html>';

fs.writeFileSync(path.join(publicDir, 'index.html'), html);
console.log('Generated index.html with ' + allFiles.length + ' pages in ' + (Object.keys(sectionMap).length || 0) + ' section(s).');
