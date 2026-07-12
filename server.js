require('dotenv').config({ path: './config/.env' });
const express    = require('express');
const session    = require('express-session');
const bcrypt     = require('bcryptjs');
const helmet     = require('helmet');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const multer     = require('multer');
const compression = require('compression');

// ─── Startup safety checks ────────────────────────────────────────────────────
// Fehlende Secrets erlauben Session-Fälschung bzw. laden ein unsicheres Default-
// Passwort. Server bewusst nicht mit unsicheren Fallbacks starten lassen.
if (!process.env.SESSION_SECRET) {
  console.error('[Fatal] SESSION_SECRET fehlt in config/.env. Server wird nicht gestartet.');
  process.exit(1);
}

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
const POSTS_FILE         = path.join(__dirname, 'data', 'posts.json');
const JOBS_FILE          = path.join(__dirname, 'data', 'jobs.json');
const SETTINGS_FILE      = path.join(__dirname, 'data', 'settings.json');
const PAGES_FILE         = path.join(__dirname, 'data', 'pages.json');
const SUBSCRIBERS_FILE   = path.join(__dirname, 'data', 'subscribers.json');
const SUBMISSIONS_FILE   = path.join(__dirname, 'data', 'submissions.json');
const TESTIMONIALS_FILE  = path.join(__dirname, 'data', 'testimonials.json');
const UPLOADS_DIR        = path.join(__dirname, 'public', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Multer config: disk storage, images only, max 5 MB
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Nur JPEG, PNG oder WebP erlaubt.'));
  },
});

app.use(compression());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Password hash — loaded from settings.json if changed via admin, else from env
function loadPasswordHash() {
  try {
    const s = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    if (s.auth && s.auth.passwordHash) return s.auth.passwordHash;
  } catch {}
  if (!process.env.ADMIN_PASSWORD) {
    console.error('[Fatal] ADMIN_PASSWORD fehlt in config/.env und es existiert noch kein gespeichertes Admin-Passwort. Server wird nicht gestartet.');
    process.exit(1);
  }
  return bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
}
let passwordHash = loadPasswordHash();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "images.unsplash.com", "*.unsplash.com", "picsum.photos"],
      connectSrc: ["'self'"],
    },
  },
  hsts: { maxAge: 15552000, includeSubDomains: true, preload: false }, // 180 Tage
}));
app.set('trust proxy', 1);
app.use(cors({ origin: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  name: 'acopa.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  },
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

function readSubscribers() {
  try { return JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf-8')); }
  catch { return { subscribers: [] }; }
}
function writeSubscribers(data) {
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function readSubmissions() {
  try { return JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf-8')); }
  catch { return { submissions: [] }; }
}
function writeSubmissions(data) {
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function readTestimonials() {
  try { return JSON.parse(fs.readFileSync(TESTIMONIALS_FILE, 'utf-8')); }
  catch { return { items: [] }; }
}
function writeTestimonials(data) {
  fs.writeFileSync(TESTIMONIALS_FILE, JSON.stringify(data, null, 2), 'utf-8');
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

// ─── Login brute-force protection (in-memory, per IP) ────────────────────────
// Sperrt eine IP für 15 Minuten, nachdem 5 Login-Versuche fehlgeschlagen sind.
const _loginAttempts = new Map();
const LOGIN_MAX_FAILS   = 5;
const LOGIN_LOCK_MS     = 15 * 60_000;
function isLoginLocked(ip) {
  const entry = _loginAttempts.get(ip);
  return !!(entry && entry.lockedUntil && Date.now() < entry.lockedUntil);
}
function recordLoginFailure(ip) {
  const entry = _loginAttempts.get(ip) || { fails: 0, lockedUntil: 0 };
  entry.fails += 1;
  if (entry.fails >= LOGIN_MAX_FAILS) {
    entry.lockedUntil = Date.now() + LOGIN_LOCK_MS;
    entry.fails = 0;
  }
  _loginAttempts.set(ip, entry);
}
function clearLoginAttempts(ip) {
  _loginAttempts.delete(ip);
}

// ─── CSRF protection (session-bound token, for /api/admin/*) ────────────────
function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const token = req.headers['x-csrf-token'];
  if (!token || !req.session.csrfToken || token !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Ungültiges oder fehlendes CSRF-Token.' });
  }
  next();
}

// ─── Newsletter Subscribe API ─────────────────────────────────────────────────
app.post('/api/subscribe', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress;
  if (rateLimit(ip, 3, 60_000)) return res.status(429).json({ error: 'Zu viele Anfragen.' });
  if (req.body.website) return res.json({ success: true }); // honeypot
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Ungültige E-Mail-Adresse.' });
  }
  const data = readSubscribers();
  if (data.subscribers.some(s => s.email === email)) {
    return res.json({ success: true }); // silently accept duplicates
  }
  data.subscribers.push({ email, date: new Date().toISOString() });
  writeSubscribers(data);
  if (mailer) {
    try {
      await mailer.sendMail({
        from: `"ACOPA Newsletter" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Willkommen beim ACOPA Newsletter',
        text: 'Vielen Dank für Ihre Anmeldung zum ACOPA Newsletter. Sie erhalten ab sofort monatliche SAP & IT Insights.',
        html: '<p>Vielen Dank für Ihre Anmeldung zum <strong>ACOPA Newsletter</strong>.<br>Sie erhalten ab sofort monatliche SAP & IT Insights.</p><p><a href="https://www.acopa.de/datenschutz">Datenschutzerklärung</a></p>',
      });
    } catch (err) {
      console.error('[Subscribe] Mail error:', err.message);
    }
  }
  res.json({ success: true });
});

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

  // Always persist submission regardless of mail status
  const subData = readSubmissions();
  subData.submissions.unshift({
    id: uuidv4(),
    name,
    email,
    phone: req.body.phone || '',
    subject: subject || '',
    message,
    date: new Date().toISOString(),
    read: false,
  });
  writeSubmissions(subData);

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
  const ip = req.ip || req.socket.remoteAddress;
  if (isLoginLocked(ip)) {
    return res.redirect('/admin/login?error=locked');
  }
  const { password } = req.body;
  if (password && bcrypt.compareSync(password, passwordHash)) {
    clearLoginAttempts(ip);
    req.session.authenticated = true;
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    return res.redirect('/admin/dashboard');
  }
  recordLoginFailure(ip);
  res.redirect('/admin/login?error=1');
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

app.get('/admin/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

// Alle /api/admin/* State-Changing Requests benötigen ein gültiges CSRF-Token.
app.use('/api/admin', requireCsrf);

app.get('/api/admin/csrf-token', requireAuth, (req, res) => {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  res.json({ token: req.session.csrfToken });
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

// ─── Admin Subscribers API ────────────────────────────────────────────────────
app.get('/api/admin/subscribers', requireAuth, (req, res) => res.json(readSubscribers()));

app.delete('/api/admin/subscribers/:email', requireAuth, (req, res) => {
  const data = readSubscribers();
  const email = decodeURIComponent(req.params.email);
  data.subscribers = data.subscribers.filter(s => s.email !== email);
  writeSubscribers(data);
  res.json({ success: true });
});

// ─── Admin Upload API ─────────────────────────────────────────────────────────
// Verifiziert die tatsächlichen Magic Bytes der Datei, da der vom Client
// gesendete mimetype beliebig fälschbar ist (fileFilter allein reicht nicht).
function hasValidImageSignature(filePath) {
  const buf = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng  = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP';
  return isJpeg || isPng || isWebp;
}

app.post('/api/admin/upload', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload fehlgeschlagen.' });
    if (!req.file) return res.status(400).json({ error: 'Keine Datei empfangen.' });
    if (!hasValidImageSignature(req.file.path)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Datei ist kein gültiges JPEG-, PNG- oder WebP-Bild.' });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

// ─── Admin Submissions API ────────────────────────────────────────────────────
app.get('/api/admin/submissions', requireAuth, (req, res) => res.json(readSubmissions()));

app.put('/api/admin/submissions/:id/read', requireAuth, (req, res) => {
  const data = readSubmissions();
  const sub = data.submissions.find(s => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  sub.read = true;
  writeSubmissions(data);
  res.json({ success: true });
});

app.delete('/api/admin/submissions/:id', requireAuth, (req, res) => {
  const data = readSubmissions();
  const idx = data.submissions.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.submissions.splice(idx, 1);
  writeSubmissions(data);
  res.json({ success: true });
});

// ─── Admin Testimonials API ───────────────────────────────────────────────────
app.get('/api/admin/testimonials', requireAuth, (req, res) => res.json(readTestimonials()));

app.post('/api/admin/testimonials', requireAuth, (req, res) => {
  const { type, quote, name, role, tenure, initials } = req.body;
  if (!quote || !name) return res.status(400).json({ error: 'Zitat und Name erforderlich' });
  const data = readTestimonials();
  const item = { id: uuidv4(), type: type || 'employee', quote, name, role: role || '', tenure: tenure || '', initials: initials || name.slice(0, 2).toUpperCase() };
  data.items.push(item);
  writeTestimonials(data);
  res.json(item);
});

app.put('/api/admin/testimonials/:id', requireAuth, (req, res) => {
  const data = readTestimonials();
  const idx = data.items.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const { type, quote, name, role, tenure, initials } = req.body;
  data.items[idx] = { ...data.items[idx], ...(type && { type }), ...(quote && { quote }), ...(name && { name }), ...(role !== undefined && { role }), ...(tenure !== undefined && { tenure }), ...(initials && { initials }) };
  writeTestimonials(data);
  res.json(data.items[idx]);
});

app.delete('/api/admin/testimonials/:id', requireAuth, (req, res) => {
  const data = readTestimonials();
  const idx = data.items.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.items.splice(idx, 1);
  writeTestimonials(data);
  res.json({ success: true });
});

// ─── Admin Backup API ─────────────────────────────────────────────────────────
app.get('/api/admin/backup', requireAuth, (req, res) => {
  const backup = {
    exportedAt: new Date().toISOString(),
    posts:        readPosts(),
    jobs:         readJobs(),
    settings:     readSettings(),
    pages:        readPages(),
    testimonials: readTestimonials(),
    subscribers:  readSubscribers(),
    submissions:  readSubmissions(),
  };
  const date = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Disposition', `attachment; filename="acopa-backup-${date}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(backup, null, 2));
});

// ─── Page Routes ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  const allTestimonials = readTestimonials().items || [];
  res.render('index', { customerTestimonials: allTestimonials.filter(t => t.type === 'customer') });
});

app.get('/service',                   (req, res) => res.render('service/index'));
app.get('/service/sap-beratung',      (req, res) => res.render('service/sap-beratung'));
app.get('/service/digitalisierung',   (req, res) => res.render('service/digitalisierung'));
app.get('/service/supply-chain',      (req, res) => res.render('service/supply-chain'));
app.get('/service/sap-joule',         (req, res) => res.render('service/sap-joule'));
app.get('/service/cybersecurity',     (req, res) => res.redirect(301, '/service/sap-joule'));
app.get('/service/sustainability',    (req, res) => res.render('service/sustainability'));
app.get('/service/kinaxis',           (req, res) => res.render('service/kinaxis'));

app.get('/acopa',                     (req, res) => res.render('acopa/index'));
app.get('/acopa/netzwerk',            (req, res) => res.render('acopa/netzwerk'));
app.get('/acopa/erfolgsgeschichte',   (req, res) => res.render('acopa/erfolgsgeschichte'));
app.get('/acopa/referenzen',          (req, res) => res.render('acopa/referenzen'));

app.get('/karriere', (req, res) => {
  const allTestimonials = readTestimonials().items || [];
  res.render('karriere/index', { employeeTestimonials: allTestimonials.filter(t => t.type === 'employee') });
});
app.get('/karriere/offene-stellen', (req, res) => {
  const data = readJobs();
  const jobs = (data.jobs || []).filter(j => j.published);
  res.render('karriere/offene-stellen', { jobs });
});

app.get('/news', (req, res) => {
  const data = readPosts();
  let posts = (data.posts || []).filter(p => p.published);
  const category = req.query.category || '';
  if (category) posts = posts.filter(p => p.category === category);
  const categories = [...new Set((data.posts || []).filter(p => p.published).map(p => p.category))];
  res.render('news/index', { posts, categories, activeCategory: category });
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

// ─── Dynamic Sitemap ──────────────────────────────────────────────────────────
app.get('/sitemap.xml', (req, res) => {
  const data = readPosts();
  const publishedPosts = (data.posts || []).filter(p => p.published);
  const base = 'https://www.acopa.de';
  const staticUrls = [
    { loc: `${base}/`,                         changefreq: 'weekly',  priority: '1.0' },
    { loc: `${base}/service`,                  changefreq: 'monthly', priority: '0.9' },
    { loc: `${base}/service/sap-beratung`,     changefreq: 'monthly', priority: '0.8' },
    { loc: `${base}/service/digitalisierung`,  changefreq: 'monthly', priority: '0.8' },
    { loc: `${base}/service/supply-chain`,     changefreq: 'monthly', priority: '0.8' },
    { loc: `${base}/service/sap-joule`,        changefreq: 'monthly', priority: '0.8' },
    { loc: `${base}/service/sustainability`,   changefreq: 'monthly', priority: '0.8' },
    { loc: `${base}/service/kinaxis`,          changefreq: 'monthly', priority: '0.8' },
    { loc: `${base}/acopa`,                    changefreq: 'monthly', priority: '0.8' },
    { loc: `${base}/acopa/netzwerk`,           changefreq: 'monthly', priority: '0.7' },
    { loc: `${base}/acopa/erfolgsgeschichte`,  changefreq: 'monthly', priority: '0.7' },
    { loc: `${base}/acopa/referenzen`,         changefreq: 'monthly', priority: '0.7' },
    { loc: `${base}/karriere`,                 changefreq: 'weekly',  priority: '0.7' },
    { loc: `${base}/karriere/offene-stellen`,  changefreq: 'weekly',  priority: '0.7' },
    { loc: `${base}/news`,                     changefreq: 'weekly',  priority: '0.6' },
    { loc: `${base}/kontakt`,                  changefreq: 'yearly',  priority: '0.6' },
    { loc: `${base}/impressum`,                changefreq: 'yearly',  priority: '0.3' },
    { loc: `${base}/datenschutz`,              changefreq: 'yearly',  priority: '0.3' },
  ];
  const postUrls = publishedPosts.map(p => ({
    loc: `${base}/news/${p.slug}`,
    changefreq: 'monthly',
    priority: '0.5',
    lastmod: p.date,
  }));
  const allUrls = [...staticUrls, ...postUrls];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
    allUrls.map(u => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')
  }\n</urlset>`;
  res.set('Content-Type', 'application/xml');
  res.send(xml);
});

// ─── 404 Catch-all ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', { title: 'Seite nicht gefunden – ACOPA GmbH & Co. KG' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
process.on('uncaughtException', err => console.error('[Fatal]', err));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ACOPA Website running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
