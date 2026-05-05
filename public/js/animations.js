/* ============================================================
   ACOPA – animations.js
   All GSAP / ScrollTrigger animations
   ============================================================ */

(function () {
  if (typeof gsap === 'undefined') {
    console.warn('[ACOPA] GSAP not loaded – animations skipped.');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // ── Hero Entrance ─────────────────────────────────────────
  function animateHero() {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

    // Line-by-line headline reveal
    tl.fromTo(
      '.hero-line-inner',
      { yPercent: 105, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.12 }
    );
    tl.fromTo(
      '#heroEyebrow',
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.8 },
      '-=0.9'
    );
    tl.fromTo(
      '#heroSub',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.9 },
      '-=0.7'
    );
    tl.fromTo(
      '#heroCtas',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8 },
      '-=0.7'
    );
  }

  // ── Generic Scroll Reveals ────────────────────────────────
  function initScrollReveals() {
    // .reveal-up → slide from below
    gsap.utils.toArray('.reveal-up').forEach(el => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 45 },
        {
          opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start:   'top 88%',
            toggleActions: 'play none none none',
          },
        }
      );
    });

    // .reveal-left
    gsap.utils.toArray('.reveal-left').forEach(el => {
      gsap.fromTo(
        el,
        { opacity: 0, x: -45 },
        {
          opacity: 1, x: 0, duration: 1, ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start:   'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    });

    // .reveal-right
    gsap.utils.toArray('.reveal-right').forEach(el => {
      gsap.fromTo(
        el,
        { opacity: 0, x: 45 },
        {
          opacity: 1, x: 0, duration: 1, ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start:   'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    });

    // .reveal-fade
    gsap.utils.toArray('.reveal-fade').forEach(el => {
      gsap.fromTo(
        el,
        { opacity: 0 },
        {
          opacity: 1, duration: 1, ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start:   'top 88%',
            toggleActions: 'play none none none',
          },
        }
      );
    });
  }

  // ── Service Cards Stagger ─────────────────────────────────
  function initServiceCards() {
    const cards = gsap.utils.toArray('.service-card');
    if (!cards.length) return;

    gsap.fromTo(
      cards,
      { opacity: 0, y: 50 },
      {
        opacity: 1, y: 0,
        duration: 0.75,
        ease:     'power3.out',
        stagger:  { amount: 0.5, from: 'start' },
        scrollTrigger: {
          trigger: '.bento-grid',
          start:   'top 82%',
          toggleActions: 'play none none none',
        },
      }
    );
  }

  // ── Animated Counters ─────────────────────────────────────
  function initCounters() {
    const counters = document.querySelectorAll('.counter');
    if (!counters.length) return;

    counters.forEach(el => {
      const target = parseInt(el.dataset.target, 10);
      const obj    = { val: 0 };

      ScrollTrigger.create({
        trigger: el,
        start:   'top 85%',
        once:    true,
        onEnter: () => {
          gsap.to(obj, {
            val:      target,
            duration: 1.8,
            ease:     'power2.out',
            onUpdate: () => { el.textContent = Math.round(obj.val); },
          });
        },
      });
    });
  }

  // ── Stats Section Entrance ────────────────────────────────
  function initStats() {
    gsap.fromTo(
      '.stat-item',
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
        stagger: 0.12,
        scrollTrigger: {
          trigger: '.section-stats',
          start:   'top 80%',
          toggleActions: 'play none none none',
        },
      }
    );
  }

  // ── About Section ─────────────────────────────────────────
  function initAbout() {
    const image = document.querySelector('.about-image-wrap');
    const badge = document.querySelector('.about-image-badge');
    if (!image) return;

    gsap.fromTo(
      image,
      { opacity: 0, x: 60, scale: 0.96 },
      {
        opacity: 1, x: 0, scale: 1,
        duration: 1.1, ease: 'power3.out',
        scrollTrigger: {
          trigger: '.about-grid',
          start:   'top 78%',
          toggleActions: 'play none none none',
        },
      }
    );

    if (badge) {
      gsap.fromTo(
        badge,
        { opacity: 0, scale: 0.7, y: 20 },
        {
          opacity: 1, scale: 1, y: 0,
          duration: 0.7, ease: 'back.out(1.7)', delay: 0.5,
          scrollTrigger: {
            trigger: '.about-grid',
            start:   'top 78%',
            toggleActions: 'play none none none',
          },
        }
      );
    }
  }

  // ── News Cards Stagger ────────────────────────────────────
  function initNewsCards() {
    // Use MutationObserver since cards are loaded dynamically
    const newsGrid = document.getElementById('news-grid');
    if (!newsGrid) return;

    const observer = new MutationObserver(() => {
      const cards = newsGrid.querySelectorAll('.news-card');
      if (!cards.length) return;

      gsap.fromTo(
        cards,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0,
          duration: 0.7, ease: 'power3.out',
          stagger: 0.1,
          scrollTrigger: {
            trigger: newsGrid,
            start:   'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    });

    observer.observe(newsGrid, { childList: true });
  }

  // ── Career Cards ──────────────────────────────────────────
  function initCareer() {
    gsap.fromTo(
      '.career-card',
      { opacity: 0, x: 30 },
      {
        opacity: 1, x: 0,
        duration: 0.65, ease: 'power3.out',
        stagger: 0.12,
        scrollTrigger: {
          trigger: '.career-positions',
          start:   'top 82%',
          toggleActions: 'play none none none',
        },
      }
    );
  }

  // ── Value Tags Pop-in ─────────────────────────────────────
  function initValueTags() {
    gsap.fromTo(
      '.value-tag',
      { opacity: 0, scale: 0.8, y: 10 },
      {
        opacity: 1, scale: 1, y: 0,
        duration: 0.5, ease: 'back.out(1.5)',
        stagger: 0.08,
        scrollTrigger: {
          trigger: '.about-values',
          start:   'top 88%',
          toggleActions: 'play none none none',
        },
      }
    );
  }

  // ── Nav Entrance ──────────────────────────────────────────
  function animateNav() {
    gsap.fromTo(
      '#navbar',
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.2 }
    );
  }

  // ── Hero Parallax ─────────────────────────────────────────
  function initParallax() {
    const heroBg = document.querySelector('.hero-bg');
    if (!heroBg) return;

    gsap.to(heroBg, {
      yPercent: 20,
      ease: 'none',
      scrollTrigger: {
        trigger: '.section-hero',
        start:   'top top',
        end:     'bottom top',
        scrub:   1.5,
      },
    });
  }

  // ── Footer Entrance ───────────────────────────────────────
  function initFooter() {
    gsap.fromTo(
      '.footer-top',
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: {
          trigger: '.site-footer',
          start:   'top 90%',
          toggleActions: 'play none none none',
        },
      }
    );
  }

  // ── Section Lines ─────────────────────────────────────────
  function initSectionEyebrows() {
    gsap.utils.toArray('.section-eyebrow').forEach(el => {
      gsap.fromTo(
        el,
        { opacity: 0, x: -20 },
        {
          opacity: 1, x: 0, duration: 0.7, ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start:   'top 90%',
            toggleActions: 'play none none none',
          },
        }
      );
    });
  }

  // ── Run All ───────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    animateNav();
    animateHero();
    initScrollReveals();
    initServiceCards();
    initCounters();
    initStats();
    initAbout();
    initNewsCards();
    initCareer();
    initValueTags();
    initParallax();
    initFooter();
    initSectionEyebrows();

    // Refresh ScrollTrigger after all images load
    window.addEventListener('load', () => ScrollTrigger.refresh());
  });
})();
