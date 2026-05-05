/* ============================================================
   ACOPA – main.js
   Language system, navigation, news loader, contact form
   ============================================================ */

// ── Translations ──────────────────────────────────────────────
const translations = {
  de: {
    nav: {
      services: 'Leistungen', about: 'Über uns', clients: 'Kunden',
      news: 'News', career: 'Karriere', contact: 'Kontakt',
      cta: 'Kostenlose Beratung',
    },
    hero: {
      eyebrow:   'Managementberatung & IT-Consulting',
      headline1: 'Mehrwert durch',
      headline2: 'digitale Prozesse.',
      sub:       'Als innovatives Expertennetzwerk transformieren wir mittelständische und Großunternehmen mit maßgeschneiderten SAP-, Digitalisierungs- und Beratungslösungen.',
      cta1: 'Kostenlose Beratung',
      cta2: 'Unsere Leistungen',
    },
    services: {
      eyebrow:      'Leistungen',
      headline:     'Unsere Leistungen',
      sub:          'Ganzheitliche Beratung für Ihre digitale Transformation',
      learn_more:   'Mehr erfahren',
      sap_badge:    'Enterprise Partner',
      sap_title:    'SAP Consulting',
      sap_desc:     'S/4HANA Migration, SCM, Business Intelligence, ABAP & FIORI Development – wir begleiten Sie auf dem gesamten SAP-Transformationsweg.',
      digital_title:'Digitalisierung',
      digital_desc: 'Go-Digital-Programme, Data Science, Machine Learning und Prozessautomatisierung.',
      process_title:'Prozessberatung',
      process_desc: 'Operative Effizienz und Ressourcenoptimierung für nachhaltige Wettbewerbsvorteile.',
      cyber_title:  'Cybersecurity',
      cyber_desc:   'Datenschutz, Sicherheitsaudits und präventive Sicherheitsmaßnahmen.',
      green_title:  'Green Tech',
      green_desc:   'Nachhaltige Geschäftslösungen und IoT-Implementierungen für die Zukunft.',
      supply_title: 'Supply Chain',
      supply_desc:  'Fortgeschrittene Supply-Chain-Optimierung und Prozessintegration.',
      uiux_title:   'UI/UX Design',
      uiux_desc:    'Nutzerzentrierte Designs und optimierte Benutzererfahrungen.',
      change_title: 'Change Management',
      change_desc:  'Anwenderschulungen und begleitetes Organisationsmanagement für erfolgreiche digitale Transformationen – wir nehmen Ihr Team mit auf die Reise.',
    },
    stats: {
      years:    'Jahre Erfahrung',
      projects: 'Projekte',
      experts:  'Experten',
      clients:  'Kunden',
    },
    about: {
      eyebrow:  'Über ACOPA',
      headline: 'Ihr Partner für digitale Transformation',
      text:     'ACOPA GmbH & Co. KG ist ein innovatives Expertennetzwerk für mittelständische und Großunternehmen. Mit tiefgreifender Branchenkenntnis und technologischem Vorsprung begleiten wir unsere Kunden auf dem Weg zur digitalen Excellence.',
      value1:   'Innovation',
      value2:   'Expertise',
      value3:   'Partnerschaft',
      value4:   'Nachhaltigkeit',
      cta:      'Gespräch vereinbaren',
      badge:    'Jahre Erfahrung',
    },
    clients: {
      eyebrow:  'Referenzkunden',
      headline: 'Vertrauen führender Unternehmen',
    },
    news: {
      eyebrow:   'Insights',
      headline:  'Aktuelle Einblicke',
      all_posts: 'Alle Beiträge',
      read_more: 'Weiterlesen',
      loading:   'Beiträge werden geladen…',
      no_posts:  'Noch keine Beiträge vorhanden.',
    },
    career: {
      eyebrow:    'Karriere bei ACOPA',
      headline:   'Gestalten Sie die digitale Zukunft',
      sub:        'Werden Sie Teil unseres wachsenden Expertennetzwerks und arbeiten Sie an spannenden Projekten mit führenden Unternehmen.',
      cta:        'Alle Stellen ansehen',
      location:   'Wuppertal / Remote',
      fulltime:   'Vollzeit',
      job1_title: 'SAP Consultant (m/w/d)',
      job2_title: 'Cybersecurity Analyst (m/w/d)',
      job3_title: 'Data Science Engineer (m/w/d)',
    },
    contact: {
      eyebrow:       'Kontakt',
      headline:      'Starten Sie Ihr Projekt',
      sub:           'Vereinbaren Sie noch heute ein kostenloses Erstgespräch.',
      name_label:    'Name',
      email_label:   'E-Mail',
      subject_label: 'Betreff',
      message_label: 'Nachricht',
      name:          'Ihr Name',
      email:         'E-Mail-Adresse',
      subject:       'Betreff',
      message:       'Ihre Nachricht',
      submit:        'Nachricht senden',
      success:       'Nachricht gesendet! Wir melden uns bald.',
      address_label: 'Adresse',
      phone_label:   'Telefon',
      email_label2:  'E-Mail',
    },
    footer: {
      services:  'Leistungen',
      company:   'Unternehmen',
      tagline:   'Mehrwert durch digitale Prozesse.',
      impressum: 'Impressum',
      privacy:   'Datenschutz',
      copyright: '© 2026 ACOPA GmbH & Co. KG. Alle Rechte vorbehalten.',
    },
  },

  en: {
    nav: {
      services: 'Services', about: 'About', clients: 'Clients',
      news: 'News', career: 'Career', contact: 'Contact',
      cta: 'Free Consultation',
    },
    hero: {
      eyebrow:   'Management & IT Consulting',
      headline1: 'Value through',
      headline2: 'digital processes.',
      sub:       'As an innovative expert network, we transform mid-size and large enterprises with tailored SAP, digitalization, and consulting solutions.',
      cta1: 'Free Consultation',
      cta2: 'Our Services',
    },
    services: {
      eyebrow:      'Services',
      headline:     'Our Services',
      sub:          'Holistic consulting for your digital transformation',
      learn_more:   'Learn more',
      sap_badge:    'Enterprise Partner',
      sap_title:    'SAP Consulting',
      sap_desc:     'S/4HANA Migration, SCM, Business Intelligence, ABAP & FIORI Development – we guide you through your entire SAP transformation journey.',
      digital_title:'Digitalization',
      digital_desc: 'Go-Digital programs, Data Science, Machine Learning, and Process Automation.',
      process_title:'Process Consulting',
      process_desc: 'Operational efficiency and resource optimization for sustainable competitive advantages.',
      cyber_title:  'Cybersecurity',
      cyber_desc:   'Data protection, security audits, and preventive security measures.',
      green_title:  'Green Tech',
      green_desc:   'Sustainable business solutions and IoT implementations for the future.',
      supply_title: 'Supply Chain',
      supply_desc:  'Advanced supply chain optimization and process integration.',
      uiux_title:   'UI/UX Design',
      uiux_desc:    'User-centered designs and optimized user experiences.',
      change_title: 'Change Management',
      change_desc:  'User training and guided organizational change management for successful digital transformations – we bring your team along for the journey.',
    },
    stats: {
      years:    'Years of Experience',
      projects: 'Projects',
      experts:  'Experts',
      clients:  'Clients',
    },
    about: {
      eyebrow:  'About ACOPA',
      headline: 'Your partner for digital transformation',
      text:     'ACOPA GmbH & Co. KG is an innovative expert network for mid-size and large enterprises. With deep industry knowledge and technological edge, we guide our clients toward digital excellence.',
      value1:   'Innovation',
      value2:   'Expertise',
      value3:   'Partnership',
      value4:   'Sustainability',
      cta:      'Schedule a call',
      badge:    'Years of Experience',
    },
    clients: {
      eyebrow:  'Reference Clients',
      headline: 'Trusted by leading companies',
    },
    news: {
      eyebrow:   'Insights',
      headline:  'Latest Insights',
      all_posts: 'All Posts',
      read_more: 'Read More',
      loading:   'Loading posts…',
      no_posts:  'No posts available yet.',
    },
    career: {
      eyebrow:    'Career at ACOPA',
      headline:   'Shape the digital future',
      sub:        'Join our growing expert network and work on exciting projects with leading companies.',
      cta:        'View all positions',
      location:   'Wuppertal / Remote',
      fulltime:   'Full-time',
      job1_title: 'SAP Consultant (m/f/d)',
      job2_title: 'Cybersecurity Analyst (m/f/d)',
      job3_title: 'Data Science Engineer (m/f/d)',
    },
    contact: {
      eyebrow:       'Contact',
      headline:      'Start your project',
      sub:           'Schedule a free initial consultation today.',
      name_label:    'Name',
      email_label:   'Email',
      subject_label: 'Subject',
      message_label: 'Message',
      name:          'Your Name',
      email:         'Email Address',
      subject:       'Subject',
      message:       'Your Message',
      submit:        'Send Message',
      success:       'Message sent! We will be in touch soon.',
      address_label: 'Address',
      phone_label:   'Phone',
      email_label2:  'Email',
    },
    footer: {
      services:  'Services',
      company:   'Company',
      tagline:   'Value through digital processes.',
      impressum: 'Legal Notice',
      privacy:   'Privacy Policy',
      copyright: '© 2026 ACOPA GmbH & Co. KG. All rights reserved.',
    },
  },
};

// ── Language System ───────────────────────────────────────────
function getCurrentLang() {
  return localStorage.getItem('acopa-lang') || 'de';
}

function getNestedValue(obj, keyPath) {
  return keyPath.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : null), obj);
}

function applyTranslations(lang) {
  const t = translations[lang];
  if (!t) return;

  // Text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = getNestedValue(t, el.dataset.i18n);
    if (val !== null) el.textContent = val;
  });

  // Placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const val = getNestedValue(t, el.dataset.i18nPlaceholder);
    if (val !== null) el.placeholder = val;
  });

  // HTML lang attribute
  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;

  // Lang buttons
  document.querySelectorAll('[data-lang-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.langBtn === lang);
  });
}

function setLang(lang) {
  localStorage.setItem('acopa-lang', lang);
  applyTranslations(lang);
  loadNews(); // reload news in new language
}

// ── Navigation ────────────────────────────────────────────────
function initNav() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('navHamburger');
  const mobileMenu = document.getElementById('navMobile');

  // Scroll: transparent → solid
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        navbar.classList.toggle('scrolled', window.scrollY > 60);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Hamburger toggle
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const open = hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });

    // Close on nav-link click
    mobileMenu.querySelectorAll('.nav-link, .btn').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // Language buttons
  document.querySelectorAll('[data-lang-btn]').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.langBtn));
  });

  // Smooth scroll for all anchor links
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ── News Loader ───────────────────────────────────────────────
function escapeHTML(str) {
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

function formatDate(dateStr, lang) {
  try {
    return new Date(dateStr).toLocaleDateString(
      lang === 'de' ? 'de-DE' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
  } catch { return dateStr; }
}

async function loadNews() {
  const lang = getCurrentLang();
  const t    = translations[lang].news;
  const grid = document.getElementById('news-grid');
  if (!grid) return;

  try {
    const res  = await fetch('/api/posts');
    const data = await res.json();
    const posts = (data.posts || []).filter(p => p.published);

    if (posts.length === 0) {
      grid.innerHTML = `<p class="news-empty">${escapeHTML(t.no_posts)}</p>`;
      return;
    }

    grid.innerHTML = posts.slice(0, 6).map(post => `
      <article class="news-card reveal-up">
        <div class="news-card-image">
          <img
            src="${escapeHTML(post.imageUrl)}"
            alt="${escapeHTML(post.title[lang] || post.title.de)}"
            loading="lazy"
          >
          <span class="news-card-category">${escapeHTML(post.category)}</span>
        </div>
        <div class="news-card-body">
          <time class="news-card-date" datetime="${escapeHTML(post.date)}">
            ${formatDate(post.date, lang)}
          </time>
          <h3 class="news-card-title">${escapeHTML(post.title[lang] || post.title.de)}</h3>
          <p class="news-card-excerpt">${escapeHTML((post.excerpt && post.excerpt[lang]) || (post.content && post.content[lang] && post.content[lang].substring(0, 120)) || '')}</p>
          <div class="news-card-footer">
            <span class="news-card-author">${escapeHTML(post.author)}</span>
            <a href="#" class="news-card-link">
              ${escapeHTML(t.read_more)}
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
            </a>
          </div>
        </div>
      </article>
    `).join('');

    // Re-trigger scroll animations for new cards if GSAP is ready
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();

  } catch (err) {
    console.error('[ACOPA] Failed to load news:', err);
    grid.innerHTML = `<p class="news-empty">${escapeHTML(t.no_posts)}</p>`;
  }
}

// ── Contact Form ──────────────────────────────────────────────
function initContactForm() {
  const form    = document.getElementById('contactForm');
  const submit  = document.getElementById('contactSubmit');
  const success = document.getElementById('formSuccess');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const lang = getCurrentLang();
    submit.disabled = true;
    submit.style.opacity = '0.7';

    const body = {
      name:    form.name.value.trim(),
      email:   form.email.value.trim(),
      subject: form.subject.value.trim(),
      message: form.message.value.trim(),
    };

    try {
      const res = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      if (res.ok) {
        form.reset();
        success.classList.add('show');
        success.querySelector('[data-i18n]').textContent =
          translations[lang].contact.success;
        setTimeout(() => success.classList.remove('show'), 5000);
      }
    } catch (err) {
      console.error('[ACOPA] Contact form error:', err);
    } finally {
      submit.disabled = false;
      submit.style.opacity = '';
    }
  });
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const lang = getCurrentLang();
  applyTranslations(lang);
  initNav();
  loadNews();
  initContactForm();
});
