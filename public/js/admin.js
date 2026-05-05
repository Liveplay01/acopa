/* ============================================================
   ACOPA Admin – admin.js
   Post CRUD, table rendering, form management
   ============================================================ */

let posts = [];
let editingId = null;

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

// ── Load & Render Posts ───────────────────────────────────────
async function loadPosts() {
  try {
    const res  = await fetch('/api/admin/posts');
    if (res.status === 401) { window.location = '/admin/login'; return; }
    const data = await res.json();
    posts = data.posts || [];
    renderTable();
    updateStats();
  } catch (err) {
    console.error('[Admin] Failed to load posts:', err);
    showToast('Fehler beim Laden der Beiträge.', 'error');
  }
}

function updateStats() {
  const total     = posts.length;
  const published = posts.filter(p => p.published).length;
  const draft     = total - published;
  document.getElementById('statTotal').textContent     = total;
  document.getElementById('statPublished').textContent = published;
  document.getElementById('statDraft').textContent     = draft;
  document.getElementById('postsCount').textContent    = total;
}

function renderTable() {
  const tbody = document.getElementById('postsTableBody');
  if (!tbody) return;

  if (!posts.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          Noch keine Beiträge. Erstellen Sie Ihren ersten Beitrag mit dem Formular rechts.
        </td>
      </tr>`;
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
      <td>
        <span class="status-dot ${post.published ? 'published' : 'draft'}">
          ${post.published ? 'Veröffentlicht' : 'Entwurf'}
        </span>
      </td>
      <td>
        <div class="table-actions">
          <button
            class="a-btn-icon"
            onclick="startEdit('${escapeHTML(post.id)}')"
            title="Bearbeiten"
            aria-label="Beitrag bearbeiten"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            class="a-btn-icon danger"
            onclick="deletePost('${escapeHTML(post.id)}')"
            title="Löschen"
            aria-label="Beitrag löschen"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── Form ──────────────────────────────────────────────────────
function resetForm() {
  editingId = null;
  document.getElementById('editingId').value  = '';
  document.getElementById('postForm').reset();
  document.getElementById('formTitle').textContent = 'Neuer Beitrag';
  document.getElementById('formSubmitBtn').innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
    Beitrag speichern`;
  document.getElementById('formCancelBtn').style.display = 'none';
  document.getElementById('published').checked = true;
  hideFeedback();
}

function startEdit(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;

  editingId = id;
  document.getElementById('editingId').value = id;
  document.getElementById('titleDe').value    = post.title.de    || '';
  document.getElementById('titleEn').value    = post.title.en    || '';
  document.getElementById('excerptDe').value  = (post.excerpt && post.excerpt.de)  || '';
  document.getElementById('excerptEn').value  = (post.excerpt && post.excerpt.en)  || '';
  document.getElementById('contentDe').value  = (post.content && post.content.de)  || '';
  document.getElementById('contentEn').value  = (post.content && post.content.en)  || '';
  document.getElementById('imageUrl').value   = post.imageUrl   || '';
  document.getElementById('author').value     = post.author     || '';
  document.getElementById('published').checked = post.published;

  const catSelect = document.getElementById('category');
  for (let opt of catSelect.options) {
    if (opt.value === post.category) { opt.selected = true; break; }
  }

  document.getElementById('formTitle').textContent = 'Beitrag bearbeiten';
  document.getElementById('formSubmitBtn').innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
    Änderungen speichern`;
  document.getElementById('formCancelBtn').style.display = '';

  // Scroll to form on mobile
  document.getElementById('formPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  hideFeedback();
}

function showFeedback() {
  const fb = document.getElementById('formFeedback');
  fb.classList.add('show');
  setTimeout(() => fb.classList.remove('show'), 3000);
}
function hideFeedback() {
  document.getElementById('formFeedback').classList.remove('show');
}

// ── Submit (Create / Update) ──────────────────────────────────
document.getElementById('postForm').addEventListener('submit', async e => {
  e.preventDefault();
  const submitBtn = document.getElementById('formSubmitBtn');
  submitBtn.disabled = true;

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
    submitBtn.disabled = false;
    return;
  }

  try {
    const url    = editingId ? `/api/admin/posts/${editingId}` : '/api/admin/posts';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.status === 401) { window.location = '/admin/login'; return; }
    if (!res.ok) { throw new Error('Server error'); }

    showFeedback();
    showToast(editingId ? 'Beitrag aktualisiert!' : 'Neuer Beitrag erstellt!');
    await loadPosts();

    if (!editingId) resetForm();

  } catch (err) {
    console.error('[Admin] Save error:', err);
    showToast('Fehler beim Speichern. Bitte erneut versuchen.', 'error');
  } finally {
    submitBtn.disabled = false;
  }
});

// ── Delete ────────────────────────────────────────────────────
async function deletePost(id) {
  const post = posts.find(p => p.id === id);
  if (!post) return;

  const confirmed = confirm(
    `Beitrag löschen?\n\n"${post.title.de}"\n\nDiese Aktion kann nicht rückgängig gemacht werden.`
  );
  if (!confirmed) return;

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

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadPosts();
});
