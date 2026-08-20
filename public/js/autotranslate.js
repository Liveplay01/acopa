/* ============================================================
   ACOPA – autotranslate.js
   Free fallback translator for English mode.

   main.js only translates strings that were manually curated in
   the `translations` object (marked with data-i18n). Everything
   else — the service subpages, FAQs, etc. — has no EN copy at
   all. This module fills that gap: on switch to EN it walks the
   page, sends any untranslated German text to the free MyMemory
   API, and swaps it in. Results are cached in localStorage so a
   page only ever gets translated once per string.
   ============================================================ */

(function () {
  const API = 'https://api.mymemory.translated.net/get';
  const CACHE_KEY = 'acopa-autotranslate-cache';
  const CONCURRENCY = 4;
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'CIRCLE', 'RECT', 'POLYLINE', 'LINE', 'TEXTAREA', 'INPUT']);

  const originalByNode = new WeakMap();
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch (e) { cache = {}; }

  function saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) { /* storage full/unavailable — skip caching */ }
  }

  function isOptedOut(el) {
    while (el) {
      if (SKIP_TAGS.has(el.tagName)) return true;
      if (el.hasAttribute && (el.hasAttribute('data-i18n') || el.hasAttribute('data-no-translate') || el.hasAttribute('data-cms-de'))) return true;
      el = el.parentElement;
    }
    return false;
  }

  function isTranslatable(text) {
    const trimmed = text.trim();
    if (trimmed.length < 2) return false;
    if (!/[a-zA-ZäöüÄÖÜß]/.test(trimmed)) return false;
    return true;
  }

  function collectNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (!isTranslatable(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        if (isOptedOut(node.parentElement)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    return nodes;
  }

  // MyMemory occasionally wraps matched segments in <g id="n">…</g> markers —
  // strip any such markup so only plain text ever lands in the DOM.
  function sanitize(text) {
    return text.replace(/<[^>]+>/g, '').replace(/\s{2,}/g, ' ').trim();
  }

  // MyMemory's translation memory is community-submitted and occasionally
  // holds a corrupted entry for a given source string — most visibly as a
  // repeated word pair (e.g. "From the From conception…"). Better to keep
  // the correct German than show visibly broken English.
  function looksCorrupted(text) {
    const words = text.trim().split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const w = words[i].replace(/[^\w]/g, '');
      if (w.length < 3 || !/^[A-ZÄÖÜ]/.test(w)) continue; // sentence-start words are the tell for glued TM fragments
      for (let j = i + 1; j < Math.min(i + 4, words.length); j++) {
        if (w.toLowerCase() === words[j].replace(/[^\w]/g, '').toLowerCase()) return true;
      }
    }
    return false;
  }

  // MyMemory's top-level `translatedText` just picks the highest raw `match`
  // score in its memory, ignoring its own `quality` rating — which lets
  // zero-quality junk entries (stray address-book/corpus dumps) outrank a
  // properly translated one. Filtering to quality > 0 first, then taking the
  // best `match` among those, consistently finds the real translation.
  function pickBestTranslation(data) {
    const candidates = Array.isArray(data.matches) ? data.matches : [];
    const trustworthy = candidates.filter(m => m && m.translation && Number(m.quality) > 0);
    if (trustworthy.length) {
      trustworthy.sort((a, b) => Number(b.match) - Number(a.match));
      return trustworthy[0].translation;
    }
    return (data.responseData && data.responseData.translatedText) || null;
  }

  async function fetchTranslation(text) {
    if (cache[text]) return cache[text];
    try {
      const res = await fetch(`${API}?q=${encodeURIComponent(text)}&langpair=de|en&de=info@acopa.de`);
      if (!res.ok) throw new Error('translate request failed');
      const data = await res.json();
      const raw = pickBestTranslation(data);
      if (!raw || /MYMEMORY WARNING/i.test(raw)) throw new Error('no usable translation');
      const translated = sanitize(raw);
      if (looksCorrupted(translated)) throw new Error('corrupted translation memory match');
      cache[text] = translated;
      return translated;
    } catch (e) {
      return null;
    }
  }

  // MyMemory's free tier degrades on long, one-off business copy: without an
  // exact translation-memory match it can splice in a fragment of an
  // unrelated match. Short, punctuation-bounded chunks avoid that — so long
  // text gets cut at sentence boundaries, then clause boundaries, before
  // anything is sent.
  const MAX_CHUNK = 100;

  function splitByDelimiter(text, delimiterRegex) {
    const tokens = text.split(delimiterRegex);
    const chunks = [];
    let current = '';
    for (const tok of tokens) {
      current += tok;
      if (delimiterRegex.test(tok)) {
        chunks.push(current.trim());
        current = '';
      }
      delimiterRegex.lastIndex = 0;
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.filter(Boolean);
  }

  function splitIntoChunks(text) {
    let chunks = text.length > MAX_CHUNK
      ? splitByDelimiter(text, /([.!?]+\s*)/)
      : [text];

    chunks = chunks.flatMap(chunk =>
      chunk.length > MAX_CHUNK ? splitByDelimiter(chunk, /([,;:]\s*|\s-\s)/) : [chunk]
    );

    return chunks;
  }

  async function translateOne(text) {
    const chunks = splitIntoChunks(text);
    if (chunks.length <= 1) return fetchTranslation(text);

    const translatedParts = [];
    for (const chunk of chunks) {
      const t = await fetchTranslation(chunk);
      if (t === null) return null;
      translatedParts.push(t);
    }
    return translatedParts.join(' ');
  }

  async function translateAll(nodes) {
    let i = 0;
    async function worker() {
      while (i < nodes.length) {
        const node = nodes[i++];
        const original = node.nodeValue;
        if (!originalByNode.has(node)) originalByNode.set(node, original);
        // Source templates wrap long copy across multiple lines; the raw
        // text node carries those newlines/indentation, which corrupts
        // mid-sentence chunks sent to the API. Collapse to single spaces —
        // HTML renders it identically either way.
        const trimmed = original.replace(/\s+/g, ' ').trim();
        const translated = await translateOne(trimmed);
        if (translated) {
          node.nodeValue = translated;
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, nodes.length) }, worker));
    saveCache();
  }

  function restoreAll(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (originalByNode.has(n)) n.nodeValue = originalByNode.get(n);
    }
  }

  window.acopaAutoTranslate = function (lang) {
    const root = document.getElementById('main-content') || document.body;
    if (lang === 'en') {
      translateAll(collectNodes(root));
    } else {
      restoreAll(root);
    }
  };
})();
