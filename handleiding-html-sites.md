# De Baak HTML Sites — Handleiding

Dit systeem laat je één bibliotheek van HTML-publicaties gebruiken om onbeperkt veel
verschillende sites samen te stellen — elke site toont een eigen selectie pagina's,
zonder dat je bestanden hoeft te kopiëren of te verplaatsen.

---

## Hoe het in elkaar zit

```
mijn-webplatform/
├── library/                  ← alle .html-publicaties, elk bestand bestaat maar 1x
├── library-manifest.json     ← register: elke pagina krijgt een id, titel, categorie
├── sites/
│   ├── strategie-site.json   ← "welke pagina's hoort deze site" (verwijst naar ids)
│   ├── ai-tools-site.json
│   └── ...
├── build.js                  ← bouwt dist/<site>/ voor elke site in sites/
├── add-page.js                ← helper: nieuwe pagina toevoegen aan de bibliotheek
├── new-site.js                ← helper: nieuwe site aanmaken
├── list-pages.js               ← helper: alle beschikbare pagina-ids opzoeken
├── diagnose-library.js         ← helper: check of manifest en bestanden matchen
└── dist/                      ← gegenereerde output (niet in git, wordt elke build opnieuw gemaakt)
```

**De kerngedachte:** een site is geen map met bestanden — het is een lijstje van
pagina-ids uit de bibliotheek. Een pagina toevoegen of verwijderen van een site is
dus altijd: één regel aanpassen in een `.json`-bestand, nooit bestanden verplaatsen.

---

## 1. Een site bouwen (lokaal testen)

```bash
cd ~/mijn-webplatform
node build.js
```

Dit bouwt **alle** sites in `sites/` naar `dist/<site-id>/`, plus een `dist/index.html`
die alle sites op een rij zet.

Wil je maar één site bouwen (sneller tijdens testen)?
```bash
node build.js strategie-site
```

**Lokaal bekijken:**
```bash
cd dist
python3 -m http.server 8080
```
Open dan `http://localhost:8080` in je browser.

---

## 2. Een pagina toevoegen aan de bibliotheek

**Stap 1 — zet het bestand in `library/`:**
```bash
cp ~/Downloads/nieuwe-infographic.html library/
```

**Stap 2 — registreer het in de manifest:**
```bash
node add-page.js "nieuwe-infographic.html" "Titel van de pagina" "Korte omschrijving" strategie-positionering
```

Dit script:
- genereert automatisch een korte id (bijv. `titel-van-de-pagina`)
- voegt de pagina toe aan `library-manifest.json`
- toont je de id die je nu kan gebruiken in een site-config

**Beschikbare categorieën:** `strategie-positionering`, `kennismanagement-ai`,
`mt-briefings-pilots`, `ld-trainingsontwerp`, `document-management-werkproces`,
`ai-tools-veiligheid`, `headshots-media`, `overig`

Ken je de precieze categorienaam niet meer? Run:
```bash
node list-pages.js
```
Dit toont alle bestaande pagina's gegroepeerd per categorie — handig als voorbeeld,
en om te zien welke ids al bestaan.

---

## 3. Een pagina toevoegen of verwijderen bij een site

Open het bestand van de site, bijvoorbeeld `sites/strategie-site.json`:

```json
{
  "title": "Strategie & Positionering",
  "description": "Alle strategische briefings...",
  "pages": [
    "mt-briefing",
    "kennishub-uit-het-midden",
    "authority-network"
  ]
}
```

- **Toevoegen:** zet de id van de pagina (uit `node list-pages.js`) ergens in de
  `pages`-lijst.
- **Verwijderen:** haal de id weg uit de lijst. Het bestand blijft gewoon in
  `library/` staan — het is alleen niet meer onderdeel van déze site.

Sla op, run `node build.js` opnieuw, klaar.

---

## 4. Een compleet nieuwe site aanmaken

```bash
node new-site.js mijn-nieuwe-site "Titel van de Site" "Korte omschrijving"
```

Dit maakt `sites/mijn-nieuwe-site.json` aan met een lege `pages`-lijst. Open het
bestand, voeg pagina-ids toe (zie stap 3), en bouw:
```bash
node build.js mijn-nieuwe-site
```

Er is geen limiet aan het aantal sites — of het er nu 3 of 50 zijn, elke site is
gewoon één extra `.json`-bestand in `sites/`.

---

## 5. Alles klopt? Diagnose vóór het bouwen

Als je een bestand hernoemt, verplaatst, of de manifest handmatig bewerkt, kan de
inhoud uit sync raken. Check dat in één keer:

```bash
node diagnose-library.js
```

Dit toont:
- welke manifest-regels geen bijbehorend bestand in `library/` vinden (met een
  gok naar het juiste bestand, als die er is)
- welke bestanden in `library/` nog nergens aan gekoppeld zijn (nuttig om te zien
  wat je nog kan toevoegen aan een site)

**Waarom bestandsnamen soms niet matchen:** sommige oude bestanden zijn ooit
geëxporteerd met kapotte tekens (bijv. `#U00b7` in plaats van `·`). Dat is geen
bug in het systeem — het betekent alleen dat de manifest-entry het exacte
bestandsnaam op schijf moet overnemen, karakter voor karakter.

---

## 6. Live zetten (Cloudflare Pages)

Dit project is gekoppeld aan Cloudflare Pages via de GitHub-integratie
(`Inspreadables/portfolio-site`). Elke push naar `master` bouwt en deployt
automatisch.

```bash
git add -A
git commit -m "Beschrijf wat je hebt toegevoegd/aangepast"
git push
```

**Build-instellingen (al ingesteld, alleen ter referentie):**
- Build command: `node build.js`
- Build output directory: `dist`
- `dist/` staat in `.gitignore` — dit wordt bij elke deploy opnieuw gegenereerd,
  je hoeft het nooit zelf te committen.

**Live site:** `https://portfolio-site-2gm.pages.dev`
Elke site is bereikbaar op `/‹site-id›/`, bijvoorbeeld
`https://portfolio-site-2gm.pages.dev/strategie-site/`.

---

## 7. Landingpagina-ontwerp — hoe dat werkt

Elke site krijgt automatisch een landingpagina in de **De Baak-huisstijl**:
een blauw-verlopende hero met titel en omschrijving, categorie-secties met
kaarten (elke kaart = één publicatie), en een merkfooter — allemaal
gegenereerd door `build.js`, dus je hoeft daar zelf niets voor te ontwerpen.

**Wil je het ontwerp aanpassen?**
Open `build.js` en zoek de functies `pageIndexHtml()` (per-site landingpagina)
en `rootIndexHtml()` (overzicht van alle sites). De CSS staat er direct in als
template-string — pas kleuren, lettergroottes of layout daar aan.

**Belangrijk:** dit project volgt de **De Baak Visual Design Guardrails**
(huisstijl-skill). Kernregels, mocht je zelf iets aanpassen:
- Kleuren alleen uit: `#005ADC` (blauw), `#00A555` (groen), `#FFE100` (geel,
  nooit als tekst), `#F5F5EB` (achtergrond), `#003A8C` (donkerblauw)
- Alleen **Arial** — geen Google Fonts
- Kaarten: `border-top: 4px solid` + subtiele schaduw
- Hero en footer hebben altijd de kenmerkende gradient-balk (blauw→groen→geel)

Zo blijft elke nieuwe site die je bouwt er automatisch merk-consistent uit zien,
zonder dat je daar telkens over hoeft na te denken.

---

## Snelle referentie — alle commando's

| Actie | Commando |
|---|---|
| Alle sites bouwen | `node build.js` |
| Eén site bouwen | `node build.js <site-id>` |
| Pagina toevoegen aan bibliotheek | `node add-page.js "<file>" "<titel>" "<omschrijving>" <categorie>` |
| Nieuwe site aanmaken | `node new-site.js <site-id> "<titel>" "<omschrijving>"` |
| Beschikbare pagina's opzoeken | `node list-pages.js` (optioneel: `node list-pages.js <categorie>`) |
| Bibliotheek checken op mismatches | `node diagnose-library.js` |
| Lokaal bekijken | `cd dist && python3 -m http.server 8080` |
| Live zetten | `git add -A && git commit -m "..." && git push` |
