/**
 * FGC Advisors — Main JS
 */

/* ── Intro: scanner sweep reveal ─────────────────────────────── */
(function () {
  var loader = document.getElementById('intro-loader');
  var wrap   = loader && loader.querySelector('.intro-logo-wrap');
  var logo   = loader && loader.querySelector('.il-logo');
  var cursor = loader && loader.querySelector('.il-cursor');
  if (!loader || !wrap || !logo) {
    if (loader) loader.classList.add('done');
    return;
  }

  var SWEEP_MS = 750;
  var BLINK_MS = 850;
  var HOLD_MS  = 180;

  var scan = document.createElement('div');
  scan.className = 'il-scan';
  wrap.appendChild(scan);

  function run() {
    var W = logo.offsetWidth;

    scan.style.opacity = '1';
    scan.style.left    = '0px';
    scan.getBoundingClientRect(); /* force reflow before transition */

    requestAnimationFrame(function () {
      logo.classList.add('revealed');
      scan.style.left = W + 'px';
    });

    setTimeout(function () {
      scan.style.opacity = '0';
      if (cursor) cursor.classList.add('blinking');
    }, SWEEP_MS);

    setTimeout(function () {
      loader.classList.add('done');
    }, SWEEP_MS + BLINK_MS + HOLD_MS);
  }

  if (logo.complete && logo.naturalWidth) {
    setTimeout(run, 300);
  } else {
    logo.addEventListener('load',  function () { setTimeout(run, 300); });
    logo.addEventListener('error', function () { loader.classList.add('done'); });
  }
})();

/* ── Stat counter animation ──────────────────────────────────── */
(function () {
  var stats = document.querySelectorAll('.we-stat-n[data-count]');
  if (!stats.length || typeof IntersectionObserver === 'undefined') return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);

      var el       = entry.target;
      var target   = parseInt(el.dataset.count, 10);
      var suffix   = el.dataset.suffix  || '';
      var prefix   = el.dataset.prefix  || '';
      var display  = el.dataset.display || null;
      var start    = null;
      var DURATION = 1200;

      function step(ts) {
        if (!start) start = ts;
        var progress = Math.min((ts - start) / DURATION, 1);
        var ease = 1 - Math.pow(1 - progress, 3); /* ease-out cubic */
        var val  = Math.floor(ease * target);
        el.textContent = (progress >= 1 && display)
          ? display
          : prefix + val.toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });

  stats.forEach(function (el) { observer.observe(el); });
})();

/* ── Left nav: block-level active state via IntersectionObserver */
(function () {
  var navBtns = document.querySelectorAll('.we-col-nav [data-block]');
  if (!navBtns.length) return;

  function setActive(id) {
    navBtns.forEach(function (btn) {
      btn.closest('li').classList.toggle('active', btn.dataset.block === id);
    });
  }

  navBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.getElementById(btn.dataset.block);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  var blocks = Array.from(navBtns)
    .map(function (btn) { return document.getElementById(btn.dataset.block); })
    .filter(Boolean);

  if (!blocks.length || typeof IntersectionObserver === 'undefined') return;

  var blockObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, {
    threshold: 0,
    rootMargin: '-80px 0px -50% 0px'
  });

  blocks.forEach(function (b) { blockObserver.observe(b); });
})();

/* ── Services list: scroll-triggered row accordion ───────────── */
(function () {
  var rows = document.querySelectorAll('.we-row');
  if (!rows.length || typeof IntersectionObserver === 'undefined') return;

  var rowObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        rows.forEach(function (r) { r.classList.remove('is-open'); });
        entry.target.classList.add('is-open');
      } else {
        entry.target.classList.remove('is-open');
      }
    });
  }, {
    threshold: 0,
    rootMargin: '-44% 0px -44% 0px'
  });

  rows.forEach(function (row) { rowObserver.observe(row); });
})();

/* ── Cursor + nav scroll ─────────────────────────────────────── */
(function () {
  'use strict';

  var cursor     = document.getElementById('cursor');
  var cursorGlow = document.getElementById('cursor-glow');
  if (!cursor || !cursorGlow) return;

  var cursorX = -100, cursorY = -100;
  var smoothX = -100, smoothY = -100;
  var glowX   = -100, glowY   = -100;

  function moveCursor() {
    smoothX += (cursorX - smoothX) * 0.18;
    smoothY += (cursorY - smoothY) * 0.18;
    cursor.style.left = smoothX + 'px';
    cursor.style.top  = smoothY + 'px';

    glowX += (cursorX - glowX) * 0.06;
    glowY += (cursorY - glowY) * 0.06;
    cursorGlow.style.left = glowX + 'px';
    cursorGlow.style.top  = glowY + 'px';

    requestAnimationFrame(moveCursor);
  }

  document.addEventListener('mousemove', function (e) {
    cursorX = e.clientX;
    cursorY = e.clientY;
    cursor.classList.add('visible');
    cursorGlow.classList.add('visible');
  });
  document.addEventListener('mouseleave', function () {
    cursor.classList.remove('visible');
    cursorGlow.classList.remove('visible');
  });
  document.addEventListener('mousedown', function () { cursor.classList.add('click'); });
  document.addEventListener('mouseup',   function () { cursor.classList.remove('click'); });

  document.querySelectorAll('a, button, [data-hover]').forEach(function (el) {
    el.addEventListener('mouseenter', function () { cursor.classList.add('hover'); });
    el.addEventListener('mouseleave', function () { cursor.classList.remove('hover'); });
  });

  moveCursor();

  /* Nav: compact on scroll */
  var nav = document.getElementById('nav');
  window.addEventListener('scroll', function () {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
})();

/* ── The FGC Brief: scroll-driven horizontal strip ──────────── */
(function () {
  var outer = document.getElementById('brief');
  var track = document.querySelector('.brief-track');
  if (!outer || !track) return;

  function updateBrief() {
    /* On mobile the strip is a native touch-scroll; skip JS transform */
    if (window.innerWidth < 768) {
      track.style.transform = '';
      return;
    }
    var rect     = outer.getBoundingClientRect();
    var progress = -rect.top / (rect.height - window.innerHeight);
    progress     = Math.max(0, Math.min(1, progress));
    var maxScroll = track.scrollWidth - track.parentElement.offsetWidth;
    track.style.transform = 'translateX(' + (-progress * maxScroll) + 'px)';
  }

  window.addEventListener('scroll', updateBrief, { passive: true });
  window.addEventListener('resize', updateBrief, { passive: true });
  updateBrief();
})();
