# Webseiten-Bauanleitung für Claude Code

Dieses Dokument beschreibt den bewährten Build-Prozess für professionelle Node.js-Websites.
Kopiere es in neue Projekte — Claude liest es automatisch beim Start.

---

## Stack-Entscheidungen

| Was | Warum |
|-----|-------|
| Node.js + Express | Echter Server, volle Kontrolle, kein PHP-Overhead |
| EJS Templating | Shared Partials (Nav/Footer einmal pflegen), kein Duplikat-HTML |
| Flat JSON Files | Kein Datenbank-Setup, einfach zu deployen, direkt editierbar |
| GSAP ScrollTrigger | Professionelle Animationen, CDN, kein Build-Step |
| CSS Custom Properties | Design-Tokens zentral pflegen, kein Framework-Overhead |
| nodemailer | Kontaktformular → echte E-Mails, SMTP-agnostisch |
| bcryptjs + express-session | Sicheres Admin-Login ohne externe Auth-Services |

**Nicht verwenden:** Vercel/Netlify (kein persistentes Dateisystem), WordPress (Plugin-Chaos), React (Overkill für Marketing-Seiten).

---

## Dateistruktur

```
projekt/
├── server.js               ← Express-App, alle Routen, API-Endpoints
├── CLAUDE.md               ← Diese Datei
├── config/
│   ├── .env                ← Secrets (nie committen!)
│   └── .env.example        ← Dokumentation aller Variablen (committen)
├── data/
│   ├── posts.json          ← Blog/News CMS-Daten
│   ├── jobs.json           ← Stellenangebote
│   └── settings.json       ← Firmendaten, Social Links
├── views/
│   ├── index.ejs           ← Homepage
│   ├── partials/
│   │   ├── _head.ejs       ← <!DOCTYPE> bis <body>, Google Fonts, Meta-Tags
│   │   ├── _nav.ejs        ← Desktop-Dropdown + Mobile-Akkordeon
│   │   └── _footer.ejs     ← Footer, Cookie-Banner, GSAP CDN, Scripts
│   ├── service/            ← Leistungsseiten
│   ├── acopa/              ← Über-uns-Seiten
│   ├── karriere/           ← Karriere + Stellen
│   ├── news/               ← index.ejs + post.ejs
│   ├── impressum.ejs
│   ├── datenschutz.ejs
│   └── 404.ejs
├── public/
│   ├── css/main.css        ← Design-Tokens + alle Styles
│   ├── js/
│   │   ├── main.js         ← Sprache, Nav, News-Loader, Cookie-Banner
│   │   └── animations.js   ← GSAP ScrollTrigger (reveal-up etc.)
│   ├── assets/             ← Logo, Bilder
│   └── admin/
│       ├── login.html
│       └── dashboard.html  ← Admin-CMS (4 Tabs: News, Stellen, Einstellungen, Seiten)
└── package.json
```

---

## Design-System

### Fonts (Google Fonts)
```css
--font-display: 'DM Serif Display', serif;   /* Headlines */
--font-body:    'Plus Jakarta Sans', sans-serif; /* Fließtext */
--font-mono:    'JetBrains Mono', monospace;  /* Badges, Code, Datum */
```

### Farben
```css
--color-primary:     #A4C400;  /* Lime Green – Markenfarbe */
--color-foreground:  #1C1C1E;  /* Fast-Schwarz */
--color-bg:          #F5F5F0;  /* Warmes Off-White */
--color-surface:     #FFFFFF;
--color-gray-200:    #E2E4DA;
--color-gray-400:    #9A9B8E;
--color-gray-600:    #6B6C60;
```

### Wichtige CSS-Klassen
```
.page-hero              ← Hero für Unterseiten (50vh, Bild-BG, Overlay, Breadcrumb)
.content-section        ← Standard-Content-Block mit padding
.content-section--alt   ← Heller Hintergrund-Wechsel
.content-section--dark  ← Dunkler Hintergrund (Testimonials etc.)
.feature-grid           ← 3-spaltige Karten-Grid
.feature-card           ← Einzelne Feature-Karte mit Icon
.section-eyebrow        ← Kleiner grüner Label-Text über Headlines
.section-headline       ← H2 in DM Serif Display
.reveal-up              ← GSAP animiert beim Scrollen (automatisch)
.reveal-left/.right     ← Slide-in Animationen
.btn.btn-primary        ← Lime-Green Button
.btn.btn-ghost          ← Transparenter Button mit Border
.btn.btn-outline        ← Outline-Button
.value-tag              ← Kleine Technologie-Tags
.cta-section            ← Vollbreite CTA-Section am Seitenende
```

---

## Build-Reihenfolge (immer in dieser Reihenfolge)

### Phase 1: Server-Fundament
1. `npm init` + Pakete: `express ejs express-session bcryptjs helmet cors uuid dotenv nodemailer`
2. `server.js` aufsetzen: View Engine auf EJS, Static-Middleware, Session, Helmet
3. **KRITISCH:** Page-Routen (`app.get('/', ...)`) NACH `app.use(express.static(...))` definieren UND `public/index.html` löschen — sonst serviert static immer die alte HTML-Datei statt EJS

### Phase 2: Design-Tokens + Basis-CSS
- CSS Custom Properties (Farben, Fonts, Spacing, Radius, Transitions) als erstes definieren
- Reset, Base-Styles, Typography-Scale
- Dann Komponenten-Klassen

### Phase 3: Partials (shared einmal, überall genutzt)
1. `_head.ejs` — komplettes `<html>` bis `<body>`, dynamischer Title/Description
2. `_nav.ejs` — Desktop-Dropdown + Mobile-Akkordeon
3. `_footer.ejs` — Footer-Links, Cookie-Banner-HTML, GSAP CDN, Scripts

### Phase 4: Homepage → Content-Seiten → Legal
- Homepage zuerst — definiert den visuellen Ton
- Dann Service-Seiten (meistgeklickt, höchste Priorität)
- Über-uns-Seiten
- Karriere + Stellen (dynamisch aus jobs.json)
- News (server-side rendered mit posts-Array)
- Impressum + Datenschutz
- 404.ejs

### Phase 5: Admin CMS
- Tabbed Interface: News | Stellen | Einstellungen | Seiten-Links
- Alle CRUD-Routen hinter `requireAuth`-Middleware
- Jobs und Settings aus JSON-Files, gleiche Pattern wie Posts

### Phase 6: Deployment-Vorbereitung
- Cookie-Banner (DSGVO, localStorage-Consent)
- Kontaktformular → nodemailer (graceful fallback ohne SMTP-Config)
- `.env.example` mit Kommentaren für alle Variablen
- `.gitignore` prüfen: `config/.env`, `node_modules/`

---

## Häufige Fehler (unbedingt vermeiden)

### 1. Routing-Konflikt mit static middleware
**Problem:** `public/index.html` existiert → Express static serviert sie, `/`-Route in server.js wird nie erreicht.
**Fix:** `public/index.html` löschen nachdem `views/index.ejs` erstellt wurde.

### 2. Nav-Dropdown schließt beim Rüberfahren
**Problem:** Gap zwischen Nav-Link und Dropdown-Panel unterbricht den Hover-State.
**Fix:** `padding-bottom` auf `.nav-item` verlängert die Hover-Zone nach unten, Dropdown direkt auf `top: 100%` (nicht `calc(100% + gap)`):
```css
.nav-item { position: relative; padding-bottom: 0.65rem; }
.nav-dropdown { position: absolute; top: 100%; ... }
```
**NICHT** `::before` Pseudo-Element nehmen — das rendert über den Links und macht sie unklickbar.

### 3. Logo/Bild in Flex-Column-Container gestreckt
**Problem:** `align-items` defaultet auf `stretch` → Bild wird auf volle Container-Breite gezogen.
**Fix:** `align-self: flex-start` auf das `<img>` + `object-fit: contain`.

### 4. Mobile-Nav Akkordeon funktioniert nicht
**Problem:** `data-mobile-toggle` ohne Ziel-ID, oder Ziel-Element hat keine `id`.
**Fix:** Button braucht `data-mobile-toggle="target-id"`, Sub-Menü braucht `id="target-id"`.

### 5. JSON-Dateien gehen beim Deploy verloren
**Problem:** Platforms wie Railway/Render haben ephemeres Dateisystem — `data/*.json` bei Neustart weg.
**Fix:** Hetzner VPS + Coolify nutzen, Volume für `/app/data` mounten. Oder zu SQLite wechseln.

### 6. Kontaktformular sendet keine E-Mails
**Problem:** Häufig vergessen: API-Endpoint loggt nur ins Terminal, schickt keine echten Mails.
**Fix:** nodemailer von Anfang an einbauen, mit graceful fallback (kein SMTP → nur console.log).

### 7. Fehlende .env.example bei Kundenübergabe
**Problem:** Entwickler vergisst zu dokumentieren welche Env-Vars gesetzt werden müssen.
**Fix:** `.env.example` schon früh anlegen und bei jeder neuen Variable sofort ergänzen.

---

## Hosting (bewährt)

### Schritt 1: Demo beim Kunden → Render.com (kostenlos)

Bevor der Kunde bezahlt, die fertige Seite kostenlos online zeigen:

1. GitHub-Repo public stellen (oder Render als Collaborator einladen)
2. render.com → New Web Service → GitHub-Repo verbinden
3. Build Command: `npm install` / Start Command: `node server.js`
4. Env-Variablen aus `.env.example` eintragen
5. URL wie `https://projektname.onrender.com` → an Kunden schicken

**Einschränkung Free Tier:** Schläft nach 15 Min Inaktivität ein (erster Load ~30 Sek).
→ Kurz vor Kundenpräsentation selbst einmal aufrufen, dann ist sie wach.
**Wichtig:** JSON-Dateien gehen bei Render bei jedem Deploy verloren (ephemeres Filesystem). Nur für Demo, nicht für Produktion.

---

### Schritt 2: Übergabe an Kunden → Hetzner Cloud CX22 + Coolify

**ACHTUNG:** Hetzner hat zwei verschiedene Produkte:
- **Webhosting** (hetzner.com/webhosting) → nur PHP, kein Node.js ❌
- **Cloud/VPS** (hetzner.com/cloud) → volle Kontrolle, Node.js ✅ ← das hier nehmen

```
Kosten:       €4,50/Mo (Kunde zahlt direkt an Hetzner)
Setup-Zeit:   ~30 Minuten (einmalig)
Deployment:   GitHub Push → auto-deploy via Coolify
SSL:          kostenlos via Let's Encrypt (Coolify übernimmt das)
Datenschutz:  Deutsches Rechenzentrum → DSGVO by default
```

**Ablauf Kundenübergabe:**
1. Kunde erstellt Hetzner-Account mit seiner E-Mail + Zahlungsmethode
2. Kunde erstellt CX22 Server (Ubuntu 24.04) → gibt dir SSH-Zugang
3. Du installierst Coolify: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`
4. In Coolify: GitHub-Repo verbinden
5. Env-Variablen aus `.env.example` setzen
6. Volume für `/app/data` mounten (damit JSON-Dateien persist bleiben!)
7. Domain + SSL in Coolify konfigurieren (DNS beim Domain-Anbieter auf Server-IP zeigen)
8. Coolify-Login + Admin-Panel-URL + Passwort an Kunden übergeben → du bist raus

**Verkaufsargument gegenüber WordPress:**
- WP Managed Hosting: €15–30/Mo → Hetzner: €4,50/Mo
- Keine Plugin-Updates die die Seite kaputtmachen
- Admin-Panel zeigt nur was gebraucht wird
- Schneller (kein PHP-Overhead)

---

## Nützliche Claude-Skills für Webprojekte

Vor dem Start eines neuen Projekts diese Skills laden:

| Skill | Wann nutzen |
|-------|-------------|
| `/redesign-existing-projects` | Bestehendes Design upgraden, generische AI-Patterns entfernen |
| `/high-end-visual-design` | Neue Komponenten designen (verhindert "billig" wirkende Defaults) |
| `/full-output-enforcement` | Wenn große vollständige Dateien generiert werden müssen (kein Truncating) |
| `/simplify` | Nach Implementierung: Code auf Qualität und Wiederverwendung prüfen |

---

## Admin-CMS Muster

```javascript
// server.js Pattern für jede neue Datenentität:
const ENTITY_FILE = path.join(__dirname, 'data', 'entity.json');

function readEntity() {
  try { return JSON.parse(fs.readFileSync(ENTITY_FILE, 'utf-8')); }
  catch { return { items: [] }; }
}
function writeEntity(data) {
  fs.writeFileSync(ENTITY_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Public API (kein Auth)
app.get('/api/entity', (req, res) => res.json(readEntity()));

// Admin API (mit Auth)
app.get('/api/admin/entity',        requireAuth, (req, res) => res.json(readEntity()));
app.post('/api/admin/entity',       requireAuth, (req, res) => { /* create */ });
app.put('/api/admin/entity/:id',    requireAuth, (req, res) => { /* update */ });
app.delete('/api/admin/entity/:id', requireAuth, (req, res) => { /* delete */ });
```

---

## Checkliste vor Kundenübergabe

- [ ] `config/.env.example` vollständig und kommentiert
- [ ] Admin-Passwort in `.env` geändert (nicht `acopa2026`)
- [ ] `SESSION_SECRET` zufällig generiert (32+ Zeichen)
- [ ] SMTP-Variablen gesetzt → Kontaktformular sendet echte E-Mails
- [ ] Cookie-Banner aktiv und verlinkt auf Datenschutzseite
- [ ] Impressum: korrekte Firmendaten eingetragen
- [ ] Datenschutz: Hosting-Anbieter korrekt genannt
- [ ] Coolify Volume für `/app/data` gemountet
- [ ] Domain + SSL in Coolify konfiguriert
- [ ] `git push` → Auto-Deploy getestet
- [ ] Alle 404-Pfade zeigen eigene 404-Seite (nicht Server-Default)
