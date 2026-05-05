require('dotenv').config({ path: './config/.env' });
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const POSTS_FILE = path.join(__dirname, 'data', 'posts.json');

// Pre-hash the admin password once on startup
const passwordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'acopa2026', 10);

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

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  res.redirect('/admin/login');
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

app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  console.log('[Contact]', { name, email, subject, date: new Date().toISOString() });
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

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`ACOPA Website running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  console.log(`Default password: ${process.env.ADMIN_PASSWORD || 'acopa2026'}`);
});
