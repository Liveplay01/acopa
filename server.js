require('dotenv').config({ path: './config/.env' });
const express    = require('express');
const session    = require('express-session');
const bcrypt     = require('bcryptjs');
const helmet     = require('helmet');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

// ─── Mailer setup ─────────────────────────────────────────────────────────────
const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
const mailer = smtpConfigured
  ? nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const app = express();
const PORT = process.env.PORT || 3000;
const POSTS_FILE    = path.join(__dirname, 'data', 'posts.json');
const JOBS_FILE     = path.join(__dirname, 'data', 'jobs.json');
const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');
const PAGES_FILE    = path.join(__dirname, 'data', 'pages.json');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Password hash — loaded from settings.json if changed via admin, else from env
function loadPasswordHash() {
  try {
    const s = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    if (s.auth && s.auth.passwordHash) return s.auth.passwordHash;
  } catch {}
  return bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'acopa2026', 10);
}
let passwordHash = loadPasswordHash();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "images.unsplash.com", "*.unsplash.com", "picsum.photos"],
      connectSrc: ["'self'"],
    },
  },
}));
app.set('trust proxy', 1);
app.use(cors({ origin: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: false, maxAge: 8 * 60 * 60 * 1000 },
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.locals.pages    = readPages();
  res.locals.settings = readSettings();
  next();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function readPosts() {
  try {
    const raw = fs.readFileSync(POSTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { posts: [] };
  }
}

function writePosts(data) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function readJobs() {
  try { return JSON.parse(fs.readFileSync(JOBS_FILE, 'utf-8')); }
  catch { return { jobs: [] }; }
}
function writeJobs(data) {
  fs.writeFileSync(JOBS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function readSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')); }
  catch { return { company: {}, social: {} }; }
}
function writeSettings(data) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function readPages() {
  try { return JSON.parse(fs.readFileSync(PAGES_FILE, 'utf-8')); }
  catch { return { homepage: {}, footer: {} }; }
}
function writePages(data) {
  fs.writeFileSync(PAGES_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  res.redirect('/admin/login');
}

// ─── Rate limiter (in-memory, per IP) ────────────────────────────────────────
const _rl = new Map();
function rateLimit(ip, max = 5, windowMs = 60_000) {
  const now = Date.now();
  const hits = (_rl.get(ip) || []).filter(t => now - t < windowMs);
  hits.push(now);
  _rl.set(ip, hits);
  return hits.length > max;
}

// ─── Public API ───────────────────────────────────────────────────────────────
app.get('/api/posts', (req, res) => {
  const data = readPosts();
  res.json(data);
});

app.get('/api/posts/:id', (req, res) => {
  const data = readPosts();
  const post = data.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json(post);
});

app.post('/api/contact', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress;
  if (rateLimit(ip)) return res.status(429).json({ error: 'Zu viele Anfragen. Bitte warten.' });
  if (req.body.website) return res.json({ success: true }); // honeypot
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const toEmail = process.env.CONTACT_TO_EMAIL || 'info@acopa.de';

  if (mailer) {
    try {
      await mailer.sendMail({
        from:    `"ACOPA Kontaktformular" <${process.env.SMTP_USER}>`,
        to:      toEmail,
        replyTo: `"${name}" <${email}>`,
        subject: `[Kontakt] ${subject || 'Neue Anfrage von ' + name}`,
        text: `Name: ${name}\nE-Mail: ${email}\n\n${message}`,
        html: `<p><strong>Name:</strong> ${name}<br><strong>E-Mail:</strong> ${email}</p><hr><p>${message.replace(/\n/g, '<br>')}</p>`,
      });
    } catch (err) {
      console.error('[Contact] Mail error:', err.message);
      return res.status(500).json({ error: 'Mail konnte nicht gesendet werden.' });
    }
  } else {
    console.log('[Contact] SMTP nicht konfiguriert –', { name, email, subject, date: new Date().toISOString() });
  }

  res.json({ success: true });
});

// ─── Admin Auth ───────────────────────────────────────────────────────────────
app.get('/admin', (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.redirect('/admin/dashboard');
  }
  res.redirect('/admin/login');
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (bcrypt.compareSync(password, passwordHash)) {
    req.session.authenticated = true;
    return res.redirect('/admin/dashboard');
  }
  res.redirect('/admin/login?error=1');
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

app.get('/admin/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

// ─── Admin API (CRUD) ─────────────────────────────────────────────────────────
app.post('/api/admin/posts', requireAuth, (req, res) => {
  const { title, content, excerpt, category, author, imageUrl, published } = req.body;
  if (!title?.de || !title?.en) {
    return res.status(400).json({ error: 'Title in both languages is required' });
  }
  const data = readPosts();
  const post = {
    id: uuidv4(),
    title: { de: title.de, en: title.en },
    content: { de: content?.de || '', en: content?.en || '' },
    excerpt: { de: excerpt?.de || '', en: excerpt?.en || '' },
    category: category || 'Allgemein',
    author: author || 'ACOPA Team',
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    date: new Date().toISOString().split('T')[0],
    published: published === true || published === 'true',
    slug: title.de.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  };
  data.posts.unshift(post);
  writePosts(data);
  res.json(post);
});

app.put('/api/admin/posts/:id', requireAuth, (req, res) => {
  const data = readPosts();
  const idx = data.posts.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const { title, content, excerpt, category, author, imageUrl, published } = req.body;
  data.posts[idx] = {
    ...data.posts[idx],
    title: title || data.posts[idx].title,
    content: content || data.posts[idx].content,
    excerpt: excerpt || data.posts[idx].excerpt,
    category: category || data.posts[idx].category,
    author: author || data.posts[idx].author,
    imageUrl: imageUrl || data.posts[idx].imageUrl,
    published: published === true || published === 'true',
  };
  writePosts(data);
  res.json(data.posts[idx]);
});

app.delete('/api/admin/posts/:id', requireAuth, (req, res) => {
  const data = readPosts();
  const idx = data.posts.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.posts.splice(idx, 1);
  writePosts(data);
  res.json({ success: true });
});

app.get('/api/admin/posts', requireAuth, (req, res) => {
  const data = readPosts();
  res.json(data);
});

// ─── Admin Jobs API ───────────────────────────────────────────────────────────
app.get('/api/admin/jobs', requireAuth, (req, res) => res.json(readJobs()));

app.post('/api/admin/jobs', requireAuth, (req, res) => {
  const { title, badge, location, type, start, description, tags, emailSubject, published } = req.body;
  if (!title) return res.status(400).json({ error: 'Titel erforderlich' });
  const data = readJobs();
  const job = {
    id: uuidv4(),
    title,
    badge: badge || 'Vollzeit',
    location: location || 'Wuppertal / Remote',
    type: type || 'Vollzeit',
    start: start || 'Ab sofort',
    description: description || '',
    tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []),
    emailSubject: emailSubject || `Bewerbung ${title}`,
    published: published === true || published === 'true',
  };
  data.jobs.push(job);
  writeJobs(data);
  res.json(job);
});

app.put('/api/admin/jobs/:id', requireAuth, (req, res) => {
  const data = readJobs();
  const idx = data.jobs.findIndex(j => j.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const { title, badge, location, type, start, description, tags, emailSubject, published } = req.body;
  data.jobs[idx] = {
    ...data.jobs[idx],
    ...(title && { title }),
    ...(badge && { badge }),
    ...(location && { location }),
    ...(type && { type }),
    ...(start && { start }),
    ...(description !== undefined && { description }),
    ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean) }),
    ...(emailSubject && { emailSubject }),
    published: published === true || published === 'true',
  };
  writeJobs(data);
  res.json(data.jobs[idx]);
});

app.delete('/api/admin/jobs/:id', requireAuth, (req, res) => {
  const data = readJobs();
  const idx = data.jobs.findIndex(j => j.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.jobs.splice(idx, 1);
  writeJobs(data);
  res.json({ success: true });
});

// ─── Admin Settings API ───────────────────────────────────────────────────────
app.get('/api/admin/settings', requireAuth, (req, res) => res.json(readSettings()));

app.put('/api/admin/settings', requireAuth, (req, res) => {
  const current = readSettings();
  const updated = {
    ...current,
    company: { ...current.company, ...(req.body.company || {}) },
    social:  { ...current.social,  ...(req.body.social  || {}) },
  };
  writeSettings(updated);
  res.json(updated);
});

app.post('/api/admin/change-password', requireAuth, (req, res) => {
  const { current, next } = req.body;
  if (!current || !next || next.length < 8) {
    return res.status(400).json({ error: 'Ungültige Eingabe (mind. 8 Zeichen).' });
  }
  if (!bcrypt.compareSync(current, passwordHash)) {
    return res.status(401).json({ error: 'Aktuelles Passwort falsch.' });
  }
  const newHash = bcrypt.hashSync(next, 10);
  passwordHash = newHash;
  const settings = readSettings();
  settings.auth = { passwordHash: newHash };
  writeSettings(settings);
  res.json({ success: true });
});

// ─── Admin Pages API ──────────────────────────────────────────────────────────
app.get('/api/admin/pages', requireAuth, (req, res) => res.json(readPages()));

app.put('/api/admin/pages', requireAuth, (req, res) => {
  const current = readPages();
  const updated = {
    homepage: { ...current.homepage, ...(req.body.homepage || {}) },
    footer:   { ...current.footer,   ...(req.body.footer   || {}) },
  };
  writePages(updated);
  res.json(updated);
});

// ─── Page Routes ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.render('index'));

app.get('/service',                   (req, res) => res.render('service/index'));
app.get('/service/sap-beratung',      (req, res) => res.render('service/sap-beratung'));
app.get('/service/digitalisierung',   (req, res) => res.render('service/digitalisierung'));
app.get('/service/supply-chain',      (req, res) => res.render('service/supply-chain'));
app.get('/service/cybersecurity',     (req, res) => res.render('service/cybersecurity'));
app.get('/service/sustainability',    (req, res) => res.render('service/sustainability'));

app.get('/acopa',                     (req, res) => res.render('acopa/index'));
app.get('/acopa/netzwerk',            (req, res) => res.render('acopa/netzwerk'));
app.get('/acopa/erfolgsgeschichte',   (req, res) => res.render('acopa/erfolgsgeschichte'));
app.get('/acopa/referenzen',          (req, res) => res.render('acopa/referenzen'));

app.get('/karriere',                  (req, res) => res.render('karriere/index'));
app.get('/karriere/offene-stellen', (req, res) => {
  const data = readJobs();
  const jobs = (data.jobs || []).filter(j => j.published);
  res.render('karriere/offene-stellen', { jobs });
});

app.get('/news', (req, res) => {
  const data = readPosts();
  const posts = (data.posts || []).filter(p => p.published);
  res.render('news/index', { posts });
});

app.get('/news/:slug', (req, res) => {
  const data = readPosts();
  const post = (data.posts || []).find(p => p.slug === req.params.slug && p.published);
  if (!post) return res.status(404).render('404', { title: 'Nicht gefunden' });
  res.render('news/post', { post });
});

app.get('/kontakt',    (req, res) => res.render('kontakt'));
app.get('/impressum',  (req, res) => res.render('impressum'));
app.get('/datenschutz',(req, res) => res.render('datenschutz'));

// ─── Start ────────────────────────────────────────────────────────────────────
process.on('uncaughtException', err => console.error('[Fatal]', err));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ACOPA Website running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
