const fs = require('fs');
const path = require('path');

const publicDir = './public';
const configPath = './site-config.json';

// ----- 1. LAAD CONFIGURATIE -----
let config = { siteTitle: 'Portaal', projects: [] };
if (fs.existsSync(configPath)) {
    try {
        const raw = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(raw);
        console.log('? Configuratie geladen met ' + config.projects.length + ' project(en)');
    } catch (e) {
        console.warn('?? Configuratie ongeldig. Gebruik standaard.');
    }
} else {
    console.warn('?? Geen configuratiebestand gevonden.');
}

// ----- 2. FUNCTIE: Bestanden ophalen (alle types) -----
function getAllFiles(dir, baseDir = '') {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        const relativePath = path.join(baseDir, item.name);
        if (item.isDirectory()) {
            results.push(...getAllFiles(fullPath, relativePath));
        } else if (item.isFile() && item.name !== 'index.html') {
            results.push(relativePath.replace(/\\/g, '/'));
        }
    }
    return results;
}

// ----- 3. FUNCTIE: Genereer HTML voor een project -----
function generateProjectHtml(project, files) {
    const projectFiles = files.filter(f => f.startsWith(project.path + '/'));
    if (projectFiles.length === 0) {
        console.log('?? Geen bestanden gevonden voor project: ' + project.name);
        return null;
    }

    const projectDir = path.join(publicDir, project.path);
    if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
    }

    // ----- 3a. GROEPEER BESTANDEN PER SECTIE -----
    const sectionMap = {};
    const uncategorizedFiles = [];

    // Groepeer volgens configuratie
    if (project.sections && Array.isArray(project.sections)) {
        project.sections.forEach(section => {
            sectionMap[section.name] = [];
            section.items.forEach(item => {
                const matchedFile = projectFiles.find(f => f.endsWith(item));
                if (matchedFile) {
                    sectionMap[section.name].push(matchedFile);
                }
            });
        });
    }

    // Bepaal welke bestanden niet in een sectie zitten
    const allConfigured = Object.values(sectionMap).flat();
    projectFiles.forEach(f => {
        if (!allConfigured.includes(f)) {
            uncategorizedFiles.push(f);
        }
    });

    // ----- 3b. GENEREER HTML -----
    let sectionsHtml = '';

    // Eerst de geconfigureerde secties
    for (const [sectionName, sectionFiles] of Object.entries(sectionMap)) {
        if (sectionFiles.length === 0) continue;
        const links = sectionFiles.map(f => {
            const fileName = path.basename(f);
            const fileExt = path.extname(f).toLowerCase();
            let icon = '??';
            if (fileExt === '.pdf') icon = '??';
            else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fileExt)) icon = '???';
            else if (['.docx', '.doc'].includes(fileExt)) icon = '??';
            else if (['.xlsx', '.xls'].includes(fileExt)) icon = '??';
            return '<li><a href="' + f + '">' + icon + ' ' + fileName + '</a></li>';
        }).join('\n');
        sectionsHtml += '<h2>' + sectionName + '</h2><ul>' + links + '</ul>';
    }

    // Daarna de niet-geconfigureerde bestanden
    if (uncategorizedFiles.length > 0) {
        const links = uncategorizedFiles.map(f => {
            const fileName = path.basename(f);
            return '<li><a href="' + f + '">?? ' + fileName + '</a></li>';
        }).join('\n');
        sectionsHtml += '<h2>Overige bestanden</h2><ul>' + links + '</ul>';
    }

    // Als er helemaal niets is
    if (!sectionsHtml) {
        sectionsHtml = '<p>Er zijn nog geen bestanden in dit project.</p>';
    }

    // ----- 3c. HTML SJABLOON -----
    const html = '<!DOCTYPE html>\n' +
'<html lang="nl">\n' +
'<head>\n' +
'    <meta charset="UTF-8">\n' +
'    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'    <title>' + project.name + ' ? ' + config.siteTitle + '</title>\n' +
'    <style>\n' +
'        body { font-family: "Segoe UI", system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1.5rem; background: #f8fafc; color: #1e293b; }\n' +
'        h1 { color: #0f2b4a; border-bottom: 3px solid #1e88e5; padding-bottom: 0.5rem; }\n' +
'        h2 { color: #1e3a5f; margin-top: 1.8rem; font-size: 1.3rem; }\n' +
'        ul { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; }\n' +
'        li { background: white; padding: 0.3rem 0.8rem; border-radius: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }\n' +
'        a { text-decoration: none; color: #1e88e5; font-weight: 500; }\n' +
'        a:hover { text-decoration: underline; color: #0d47a1; }\n' +
'        .meta { color: #64748b; font-size: 0.9rem; margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1rem; }\n' +
'        .project-nav { margin-bottom: 2rem; }\n' +
'        .project-nav a { margin-right: 1rem; }\n' +
'    </style>\n' +
'</head>\n' +
'<body>\n' +
'    <div class="project-nav"><a href="/">? Terug naar portaal</a></div>\n' +
'    <h1>?? ' + project.name + '</h1>\n' +
'    ' + sectionsHtml + '\n' +
'    <div class="meta">' + projectFiles.length + ' bestanden</div>\n' +
'</body>\n' +
'</html>';

    const projectIndexPath = path.join(projectDir, 'index.html');
    fs.writeFileSync(projectIndexPath, html);
    console.log('? Index gegenereerd voor project: ' + project.name);
    return projectIndexPath;
}

// ----- 4. FUNCTIE: Genereer hoofdportaal (index.html) -----
function generatePortalHtml(projects) {
    const projectLinks = projects.map(p => {
        return '<li><a href="' + p.path + '/">?? ' + p.name + '</a></li>';
    }).join('\n');

    const html = '<!DOCTYPE html>\n' +
'<html lang="nl">\n' +
'<head>\n' +
'    <meta charset="UTF-8">\n' +
'    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'    <title>' + config.siteTitle + '</title>\n' +
'    <style>\n' +
'        body { font-family: "Segoe UI", system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1.5rem; background: #f8fafc; color: #1e293b; }\n' +
'        h1 { color: #0f2b4a; border-bottom: 3px solid #1e88e5; padding-bottom: 0.5rem; }\n' +
'        ul { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; }\n' +
'        li { background: white; padding: 0.8rem 1.5rem; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }\n' +
'        a { text-decoration: none; color: #1e88e5; font-weight: 500; font-size: 1.1rem; }\n' +
'        a:hover { text-decoration: underline; color: #0d47a1; }\n' +
'        .meta { color: #64748b; font-size: 0.9rem; margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1rem; }\n' +
'    </style>\n' +
'</head>\n' +
'<body>\n' +
'    <h1>?? ' + config.siteTitle + '</h1>\n' +
'    <p>Welkom op het portaal. Kies een project:</p>\n' +
'    <ul>' + projectLinks + '</ul>\n' +
'    <div class="meta">' + projects.length + ' project(en)</div>\n' +
'</body>\n' +
'</html>';

    const portalPath = path.join(publicDir, 'index.html');
    fs.writeFileSync(portalPath, html);
    console.log('? Hoofdportaal gegenereerd met ' + projects.length + ' projecten.');
}

// ----- 5. HOOFDPROGRAMMA -----
console.log('?? Start build proces...');

if (!config.projects || config.projects.length === 0) {
    console.warn('?? Geen projecten gevonden in configuratie.');
    process.exit(0);
}

const allFiles = getAllFiles(publicDir);
console.log('?? ' + allFiles.length + ' bestanden gevonden in public/');

const generatedProjects = [];
for (const project of config.projects) {
    const result = generateProjectHtml(project, allFiles);
    if (result) generatedProjects.push(project);
}

if (generatedProjects.length > 0) {
    generatePortalHtml(generatedProjects);
}

console.log('? Build proces voltooid!');
