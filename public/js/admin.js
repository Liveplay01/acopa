/* ============================================================
   ACOPA Admin – admin.js
   Post CRUD, Jobs CRUD, Settings, Tab navigation
   ============================================================ */

let posts = [];
let editingId = null;
let jobs = [];
let editingJobId = null;

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  if (!toast) return;
  toastMsg.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

// ── Helpers ───────────────────────────────────────────────────
function escapeHTML(str) {
  const d = document.createElement('div');
  d.textContent = String(str || '');
  return d.innerHTML;
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch { return dateStr; }
}

function saveBtnHTML(label) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>${label}`;
}

// ── Tabs ──────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.admin-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === name)
  );
  document.querySelectorAll('.tab-pane').forEach(p => {
    p.style.display = p.id === `tab-${name}` ? '' : 'none';
  });
  if (name === 'jobs')     loadJobs();
  if (name === 'settings') loadSettings();
}

// ── Posts: Load & Render ──────────────────────────────────────
async function loadPosts() {
  try {
    const res  = await fetch('/api/admin/posts');
    if (res.status === 401) { window.location = '/admin/login'; return; }
    const data = await res.json();
    posts = data.posts || [];
    renderTable();
    updateStats();
    const badge = document.getElementById('tabBadgeNews');
    if (badge) badge.textContent = posts.length;
  } catch (err) {
    console.error('[Admin] Failed to load posts:', err);
    showToast('Fehler beim Laden der Beiträge.', 'error');
  }
}

function updateStats() {
  const total     = posts.length;
  const published = posts.filter(p => p.published).length;
  const draft     = total - published;
  const el = id => document.getElementById(id);
  if (el('statTotal'))     el('statTotal').textContent     = total;
  if (el('statPublished')) el('statPublished').textContent = published;
  if (el('statDraft'))     el('statDraft').textContent     = draft;
  if (el('postsCount'))    el('postsCount').textContent    = total;
}

function renderTable() {
  const tbody = document.getElementById('postsTableBody');
  if (!tbody) return;
  if (!posts.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Noch keine Beiträge. Erstellen Sie Ihren ersten Beitrag mit dem Formular rechts.</td></tr>`;
    return;
  }
  tbody.innerHTML = posts.map(post => `
    <tr data-id="${escapeHTML(post.id)}">
      <td class="post-title-cell">
        <span title="${escapeHTML(post.title.de)}">${escapeHTML(post.title.de)}</span>
        <span class="post-title-lang" title="${escapeHTML(post.title.en)}">${escapeHTML(post.title.en)}</span>
      </td>
      <td><span class="category-badge">${escapeHTML(post.category)}</span></td>
      <td>${escapeHTML(post.author)}</td>
      <td>${formatDate(post.date)}</td>
      <td><span class="status-dot ${post.published ? 'published' : 'draft'}">${post.published ? 'Veröffentlicht' : 'Entwurf'}</span></td>
      <td>
        <div class="table-actions">
          <button class="a-btn-icon" onclick="startEdit('${escapeHTML(post.id)}')" title="Bearbeiten">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="a-btn-icon danger" onclick="deletePost('${escapeHTML(post.id)}')" title="Löschen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── Posts: Form ───────────────────────────────────────────────
function resetForm() {
  editingId = null;
  const f = document.getElementById('postForm');
  if (f) f.reset();
  const title = document.getElementById('formTitle');
  const btn   = document.getElementById('formSubmitBtn');
  const cancel= document.getElementById('formCancelBtn');
  const pub   = document.getElementById('published');
  if (title)  title.textContent   = 'Neuer Beitrag';
  if (btn)    btn.innerHTML       = saveBtnHTML('Beitrag speichern');
  if (cancel) cancel.style.display = 'none';
  if (pub)    pub.checked         = true;
  hideFeedback('formFeedback');
}

function startEdit(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;
  editingId = id;
  document.getElementById('editingId').value  = id;
  document.getElementById('titleDe').value    = post.title.de    || '';
  document.getElementById('titleEn').value    = post.title.en    || '';
  document.getElementById('excerptDe').value  = (post.excerpt && post.excerpt.de)  || '';
  document.getElementById('excerptEn').value  = (post.excerpt && post.excerpt.en)  || '';
  document.getElementById('contentDe').value  = (post.content && post.content.de)  || '';
  document.getElementById('contentEn').value  = (post.content && post.content.en)  || '';
  document.getElementById('imageUrl').value   = post.imageUrl   || '';
  document.getElementById('author').value     = post.author     || '';
  document.getElementById('published').checked = post.published;
  for (let opt of document.getElementById('category').options) {
    if (opt.value === post.category) { opt.selected = true; break; }
  }
  document.getElementById('formTitle').textContent = 'Beitrag bearbeiten';
  document.getElementById('formSubmitBtn').innerHTML = saveBtnHTML('Änderungen speichern');
  document.getElementById('formCancelBtn').style.display = '';
  document.getElementById('formPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  hideFeedback('formFeedback');
}

function showFeedback(id) {
  const fb = document.getElementById(id);
  if (!fb) return;
  fb.classList.add('show');
  setTimeout(() => fb.classList.remove('show'), 3000);
}
function hideFeedback(id) {
  const fb = document.getElementById(id);
  if (fb) fb.classList.remove('show');
}

async function deletePost(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;
  if (!confirm(`Beitrag löschen?\n\n"${post.title.de}"\n\nDiese Aktion kann nicht rückgängig gemacht werden.`)) return;
  try {
    const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
    if (res.status === 401) { window.location = '/admin/login'; return; }
    if (!res.ok) throw new Error('Delete failed');
    showToast('Beitrag gelöscht.');
    if (editingId === id) resetForm();
    await loadPosts();
  } catch (err) {
    console.error('[Admin] Delete error:', err);
    showToast('Fehler beim Löschen.', 'error');
  }
}

// ── Jobs: Load & Render ───────────────────────────────────────
async function loadJobs() {
  try {
    const res  = await fetch('/api/admin/jobs');
    if (res.status === 401) { window.location = '/admin/login'; return; }
    const data = await res.json();
    jobs = data.jobs || [];
    renderJobsTable();
    const badge = document.getElementById('tabBadgeJobs');
    if (badge) badge.textContent = jobs.filter(j => j.published).length;
  } catch (err) {
    console.error('[Admin] Failed to load jobs:', err);
    showToast('Fehler beim Laden der Stellen.', 'error');
  }
}

function renderJobsTable() {
  const tbody = document.getElementById('jobsTableBody');
  if (!tbody) return;
  if (!jobs.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Noch keine Stellen. Legen Sie die erste Stelle an.</td></tr>`;
    return;
  }
  tbody.innerHTML = jobs.map(job => `
    <tr data-id="${escapeHTML(job.id)}">
      <td class="post-title-cell"><span title="${escapeHTML(job.title)}">${escapeHTML(job.title)}</span></td>
      <td>${escapeHTML(job.location || '')}</td>
      <td><span class="category-badge">${escapeHTML(job.badge || 'Vollzeit')}</span></td>
      <td><span class="status-dot ${job.published ? 'published' : 'draft'}">${job.published ? 'Aktiv' : 'Inaktiv'}</span></td>
      <td>
        <div class="table-actions">
          <button class="a-btn-icon" onclick="startEditJob('${escapeHTML(job.id)}')" title="Bearbeiten">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="a-btn-icon danger" onclick="deleteJob('${escapeHTML(job.id)}')" title="Löschen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function resetJobForm() {
  editingJobId = null;
  const f = document.getElementById('jobForm');
  if (f) f.reset();
  const title  = document.getElementById('jobFormTitle');
  const btn    = document.getElementById('jobFormSubmitBtn');
  const cancel = document.getElementById('jobFormCancelBtn');
  const pub    = document.getElementById('jobPublished');
  if (title)  title.textContent    = 'Neue Stelle';
  if (btn)    btn.innerHTML        = saveBtnHTML('Stelle speichern');
  if (cancel) cancel.style.display = 'none';
  if (pub)    pub.checked          = true;
  hideFeedback('jobFormFeedback');
}

function startEditJob(id) {
  const job = jobs.find(j => j.id === id);
  if (!job) return;
  editingJobId = id;
  document.getElementById('editingJobId').value   = id;
  document.getElementById('jobTitle').value        = job.title || '';
  document.getElementById('jobLocation').value     = job.location || '';
  document.getElementById('jobStart').value        = job.start || '';
  document.getElementById('jobDescription').value  = job.description || '';
  document.getElementById('jobTags').value         = (job.tags || []).join(', ');
  document.getElementById('jobEmailSubject').value = job.emailSubject || '';
  document.getElementById('jobPublished').checked  = job.published;
  for (let opt of document.getElementById('jobBadge').options) {
    if (opt.value === job.badge) { opt.selected = true; break; }
  }
  document.getElementById('jobFormTitle').textContent = 'Stelle bearbeiten';
  document.getElementById('jobFormSubmitBtn').innerHTML = saveBtnHTML('Änderungen speichern');
  document.getElementById('jobFormCancelBtn').style.display = '';
  document.getElementById('jobFormPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  hideFeedback('jobFormFeedback');
}

async function deleteJob(id) {
  const job = jobs.find(j => j.id === id);
  if (!job) return;
  if (!confirm(`Stelle löschen?\n\n"${job.title}"\n\nDiese Aktion kann nicht rückgängig gemacht werden.`)) return;
  try {
    const res = await fetch(`/api/admin/jobs/${id}`, { method: 'DELETE' });
    if (res.status === 401) { window.location = '/admin/login'; return; }
    if (!res.ok) throw new Error('Delete failed');
    showToast('Stelle gelöscht.');
    if (editingJobId === id) resetJobForm();
    await loadJobs();
  } catch (err) {
    console.error('[Admin] Job delete error:', err);
    showToast('Fehler beim Löschen.', 'error');
  }
}

// ── Markdown Preview ──────────────────────────────────────────
function togglePreview(textareaId, previewId) {
  const ta  = document.getElementById(textareaId);
  const pre = document.getElementById(previewId);
  if (!ta || !pre) return;
  if (pre.style.display === 'none') {
    pre.innerHTML = typeof marked !== 'undefined' ? marked.parse(ta.value || '') : ta.value;
    pre.style.display = 'block';
    ta.style.display  = 'none';
  } else {
    pre.style.display = 'none';
    ta.style.display  = '';
  }
}

// ── Settings: Load ────────────────────────────────────────────
async function loadSettings() {
  try {
    const res  = await fetch('/api/admin/settings');
    if (res.status === 401) { window.location = '/admin/login'; return; }
    const data = await res.json();
    const c = data.company || {};
    const s = data.social  || {};
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('settingName',          c.name);
    set('settingAddress',       c.address);
    set('settingCity',          c.city);
    set('settingPhone',         c.phone);
    set('settingEmail',         c.email);
    set('settingEmailKarriere', c.emailKarriere);
    set('settingLinkedin',      s.linkedin);
    set('settingXing',          s.xing);
    set('settingInstagram',     s.instagram);
    set('settingFacebook',      s.facebook);
    set('settingYoutube',       s.youtube);
    set('settingTwitter',       s.twitter);
    set('settingKununu',        s.kununu);
  } catch (err) {
    console.error('[Admin] Failed to load settings:', err);
    showToast('Fehler beim Laden der Einstellungen.', 'error');
  }
}

// ── Pages: Load & Save ────────────────────────────────────────
async function loadPages() {
  try {
    const res  = await fetch('/api/admin/pages');
    if (res.status === 401) { window.location = '/admin/login'; return; }
    const data = await res.json();
    const h = data.homepage || {};
    const f = data.footer   || {};
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('pgHeroTitle',    h.heroTitle);
    set('pgHeroAccent',   h.heroTitleAccent);
    set('pgHeroSub',      h.heroSubtitle);
    set('pgCtaHeadline',  h.ctaHeadline);
    set('pgCtaSub',       h.ctaSubtext);
    set('pgFooterTagline',f.tagline);
  } catch (err) {
    console.error('[Admin] Failed to load pages:', err);
  }
}

// ── Init (all listeners inside DOMContentLoaded) ──────────────
document.addEventListener('DOMContentLoaded', () => {

  // Posts form
  const postForm = document.getElementById('postForm');
  if (postForm) {
    postForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = document.getElementById('formSubmitBtn');
      btn.disabled = true;
      const body = {
        title:    { de: document.getElementById('titleDe').value.trim(), en: document.getElementById('titleEn').value.trim() },
        excerpt:  { de: document.getElementById('excerptDe').value.trim(), en: document.getElementById('excerptEn').value.trim() },
        content:  { de: document.getElementById('contentDe').value.trim(), en: document.getElementById('contentEn').value.trim() },
        imageUrl:  document.getElementById('imageUrl').value.trim(),
        category:  document.getElementById('category').value,
        author:    document.getElementById('author').value.trim(),
        published: document.getElementById('published').checked,
      };
      if (!body.title.de || !body.title.en) {
        showToast('Bitte Titel auf Deutsch und Englisch angeben.', 'error');
        btn.disabled = false;
        return;
      }
      try {
        const url    = editingId ? `/api/admin/posts/${editingId}` : '/api/admin/posts';
        const method = editingId ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.status === 401) { window.location = '/admin/login'; return; }
        if (!res.ok) throw new Error('Server error');
        showFeedback('formFeedback');
        showToast(editingId ? 'Beitrag aktualisiert!' : 'Neuer Beitrag erstellt!');
        await loadPosts();
        if (!editingId) resetForm();
      } catch (err) {
        console.error('[Admin] Save error:', err);
        showToast('Fehler beim Speichern.', 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  // Jobs form
  const jobForm = document.getElementById('jobForm');
  if (jobForm) {
    jobForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = document.getElementById('jobFormSubmitBtn');
      btn.disabled = true;
      const body = {
        title:        document.getElementById('jobTitle').value.trim(),
        badge:        document.getElementById('jobBadge').value,
        location:     document.getElementById('jobLocation').value.trim(),
        start:        document.getElementById('jobStart').value.trim(),
        description:  document.getElementById('jobDescription').value.trim(),
        tags:         document.getElementById('jobTags').value.trim(),
        emailSubject: document.getElementById('jobEmailSubject').value.trim(),
        published:    document.getElementById('jobPublished').checked,
      };
      if (!body.title) {
        showToast('Bitte einen Stellentitel angeben.', 'error');
        btn.disabled = false;
        return;
      }
      try {
        const url    = editingJobId ? `/api/admin/jobs/${editingJobId}` : '/api/admin/jobs';
        const method = editingJobId ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.status === 401) { window.location = '/admin/login'; return; }
        if (!res.ok) throw new Error('Server error');
        showFeedback('jobFormFeedback');
        showToast(editingJobId ? 'Stelle aktualisiert!' : 'Neue Stelle erstellt!');
        await loadJobs();
        if (!editingJobId) resetJobForm();
      } catch (err) {
        console.error('[Admin] Job save error:', err);
        showToast('Fehler beim Speichern.', 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  // Settings form
  const settingsForm = document.getElementById('settingsForm');
  if (settingsForm) {
    settingsForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = document.getElementById('settingsSubmitBtn');
      btn.disabled = true;
      const body = {
        company: {
          name:          document.getElementById('settingName').value.trim(),
          address:       document.getElementById('settingAddress').value.trim(),
          city:          document.getElementById('settingCity').value.trim(),
          phone:         document.getElementById('settingPhone').value.trim(),
          email:         document.getElementById('settingEmail').value.trim(),
          emailKarriere: document.getElementById('settingEmailKarriere').value.trim(),
        },
        social: {
          linkedin:  document.getElementById('settingLinkedin').value.trim(),
          xing:      document.getElementById('settingXing').value.trim(),
          instagram: document.getElementById('settingInstagram').value.trim(),
          facebook:  document.getElementById('settingFacebook').value.trim(),
          youtube:   document.getElementById('settingYoutube').value.trim(),
          twitter:   document.getElementById('settingTwitter').value.trim(),
          kununu:    document.getElementById('settingKununu').value.trim(),
        },
      };
      try {
        const res = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.status === 401) { window.location = '/admin/login'; return; }
        if (!res.ok) throw new Error('Server error');
        showFeedback('settingsFeedback');
        showToast('Einstellungen gespeichert!');
      } catch (err) {
        console.error('[Admin] Settings save error:', err);
        showToast('Fehler beim Speichern.', 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  // Tab buttons
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.tab;
      document.querySelectorAll('.admin-tab').forEach(t =>
        t.classList.toggle('active', t === btn)
      );
      document.querySelectorAll('.tab-pane').forEach(p => {
        p.style.display = p.id === `tab-${name}` ? '' : 'none';
      });
      if (name === 'jobs')     loadJobs();
      if (name === 'settings') loadSettings();
      if (name === 'pages')    loadPages();
    });
  });

  // Pages form
  const pagesForm = document.getElementById('pagesForm');
  if (pagesForm) {
    pagesForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = document.getElementById('pagesSubmitBtn');
      btn.disabled = true;
      const body = {
        homepage: {
          heroTitle:       document.getElementById('pgHeroTitle').value.trim(),
          heroTitleAccent: document.getElementById('pgHeroAccent').value.trim(),
          heroSubtitle:    document.getElementById('pgHeroSub').value.trim(),
          ctaHeadline:     document.getElementById('pgCtaHeadline').value.trim(),
          ctaSubtext:      document.getElementById('pgCtaSub').value.trim(),
        },
        footer: {
          tagline: document.getElementById('pgFooterTagline').value.trim(),
        },
      };
      try {
        const res = await fetch('/api/admin/pages', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.status === 401) { window.location = '/admin/login'; return; }
        if (!res.ok) throw new Error('Server error');
        showFeedback('pagesFeedback');
        showToast('Seiteninhalte gespeichert!');
      } catch {
        showToast('Fehler beim Speichern.', 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  // Password form
  const pwForm = document.getElementById('pwForm');
  if (pwForm) {
    pwForm.addEventListener('submit', async e => {
      e.preventDefault();
      const errEl  = document.getElementById('pwError');
      const btn    = document.getElementById('pwSubmitBtn');
      const next   = document.getElementById('pwNext').value;
      const confirm = document.getElementById('pwConfirm').value;
      errEl.style.display = 'none';
      if (next !== confirm) {
        errEl.textContent = 'Die Passwörter stimmen nicht überein.';
        errEl.style.display = 'block';
        return;
      }
      btn.disabled = true;
      try {
        const res = await fetch('/api/admin/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current: document.getElementById('pwCurrent').value, next }),
        });
        const data = await res.json();
        if (!res.ok) {
          errEl.textContent = data.error || 'Fehler beim Ändern.';
          errEl.style.display = 'block';
          return;
        }
        showFeedback('pwFeedback');
        showToast('Passwort erfolgreich geändert!');
        pwForm.reset();
      } catch {
        showToast('Fehler beim Speichern.', 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  // Initial load
  loadPosts();
});
