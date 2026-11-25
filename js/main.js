(function () {
  'use strict';

  // Anchor scrolling is CSS-only: html { scroll-behavior: smooth; scroll-padding-top: 100px }.

  // Offline: the service worker caches the page and its assets. HTML stays
  // network-first there, so a new build shows up on the next visit.
  if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  var progress = document.getElementById('scroll-progress');

  function updateProgress() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(doc.scrollTop / max, 1) : 0) + ')';
  }

  if (progress) {
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();
  }

  // Mark the section in view so the nav dot and the desktop rail follow the page.
  var navLinks = document.querySelectorAll('.navigation nav a');
  var railLinks = document.querySelectorAll('.section-rail a');
  var sections = document.querySelectorAll('#hero, #about, #experience, #practice, #contact');

  function markCurrent(id) {
    document.querySelectorAll('.navigation nav a, .section-rail a').forEach(function (link) {
      if (link.getAttribute('href') === '#' + id) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  if (sections.length && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        markCurrent(entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (section) { observer.observe(section); });
  }

  // Category filters. aria-pressed is the only state; CSS styles it.
  var filterButtons = document.querySelectorAll('.filter-btn[data-filter]');
  var entries = document.querySelectorAll('.experience-row[data-category]');
  var resultCount = document.getElementById('result-count');

  function applyFilter(filter) {
    var visible = 0;
    entries.forEach(function (entry) {
      var show = filter === 'all' || entry.getAttribute('data-category') === filter;
      entry.toggleAttribute('hidden', !show);
      if (show) visible += 1;
    });
    filterButtons.forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-filter') === filter));
    });
    if (resultCount) {
      resultCount.textContent = String(visible).padStart(2, '0') + (visible === 1 ? ' ENTRY' : ' ENTRIES');
    }
  }

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var filter = btn.getAttribute('data-filter') || 'all';
      applyFilter(filter);
      syncUrl(filter);
    });
  });

  // Deep links: ?filter=automation#experience opens the page already filtered.
  var filterValues = [];
  filterButtons.forEach(function (btn) { filterValues.push(btn.getAttribute('data-filter') || 'all'); });

  function filterFromUrl() {
    var value = null;
    try { value = new URLSearchParams(window.location.search).get('filter'); } catch (e) {}
    return value && filterValues.indexOf(value) > -1 ? value : 'all';
  }

  function syncUrl(filter) {
    if (!window.history || !history.replaceState) return;
    var search = filter === 'all' ? '' : '?filter=' + encodeURIComponent(filter);
    try {
      history.replaceState(null, '', window.location.pathname + search + window.location.hash);
    } catch (e) {}
  }

  var initialFilter = filterFromUrl();
  if (initialFilter !== 'all') {
    applyFilter(initialFilter);
    var experience = document.getElementById('experience');
    if (experience && !window.location.hash) {
      requestAnimationFrame(function () { experience.scrollIntoView(); });
    }
  }

  // Counts live in the markup so the page still reads with JS off; refresh them
  // here so adding or recategorising a row can never leave a stale number.
  function syncFilterCounts() {
    filterButtons.forEach(function (btn) {
      var filter = btn.getAttribute('data-filter') || 'all';
      var count = 0;
      entries.forEach(function (entry) {
        if (filter === 'all' || entry.getAttribute('data-category') === filter) count += 1;
      });
      var badge = btn.querySelector('span');
      if (badge) badge.textContent = String(count).padStart(2, '0');
    });
  }

  syncFilterCounts();

  // Clipboard: the async API needs a secure, focused document and can reject;
  // fall back to the old selection trick so COPY still works when it does.
  function legacyCopy(text) {
    var field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.top = '-1000px';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    field.setSelectionRange(0, text.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(field);
    return ok;
  }

  function copyText(text) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      return Promise.resolve(legacyCopy(text));
    }
    return navigator.clipboard.writeText(text).then(function () {
      return true;
    }, function () {
      return legacyCopy(text);
    });
  }

  var copyBtn = document.getElementById('copy-email');
  var feedback = document.getElementById('copy-feedback');
  var copyTimer = null;

  if (copyBtn && feedback) {
    copyBtn.addEventListener('click', function () {
      copyText(copyBtn.getAttribute('data-email')).then(function (ok) {
        feedback.textContent = ok ? 'Copied!' : 'Copy failed';
        clearTimeout(copyTimer);
        copyTimer = setTimeout(function () { feedback.textContent = ''; }, 2000);
      });
    });
  }

  // Share: the native sheet on phones, the clipboard everywhere else. The
  // status line starts empty in the markup and is only filled at runtime.
  var shareBtn = document.getElementById('share-page');
  var shareStatus = document.getElementById('share-status');
  var shareTimer = null;

  function announce(message) {
    if (!shareStatus) return;
    shareStatus.textContent = message;
    clearTimeout(shareTimer);
    shareTimer = setTimeout(function () { shareStatus.textContent = ''; }, 2600);
  }

  function copyLink(url) {
    copyText(url).then(function (ok) {
      announce(ok ? 'Link copied' : 'Copy failed');
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', function () {
      var url = window.location.href;
      if (navigator.share) {
        navigator.share({ title: document.title, url: url }).then(function () {
          announce('Shared');
        }).catch(function (error) {
          if (error && error.name === 'AbortError') return;
          copyLink(url);
        });
      } else {
        copyLink(url);
      }
    });
  }

  // Keyboard: t toggles the theme preset, f jumps to the filters, Esc clears them.
  document.addEventListener('keydown', function (event) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    var target = event.target;
    if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    var key = (event.key || '').toLowerCase();
    var panel = document.getElementById('theme-panel');

    if (key === 't' && window.MNTheme && (!panel || !panel.open)) {
      window.MNTheme.toggle();
    } else if (key === 'f' && filterButtons.length) {
      event.preventDefault();
      var active = document.querySelector('.filter-btn[aria-pressed="true"]') || filterButtons[0];
      if (active.focus) active.focus();
      if (active.scrollIntoView) active.scrollIntoView({ block: 'center' });
    } else if (event.key === 'Escape') {
      var pressed = document.querySelector('.filter-btn[aria-pressed="true"]');
      if (pressed && pressed.getAttribute('data-filter') !== 'all') {
        applyFilter('all');
        syncUrl('all');
        announce('Filter cleared');
      }
    }
  });

  // Reveal sections once as they come up. The safety pass guarantees the copy
  // is visible even if the observer never fires.
  var revealItems = document.querySelectorAll('[data-reveal]');

  // Number the staggered groups (--i) so each sequence restarts inside its own
  // heading, row list, card grid or facts grid.
  revealItems.forEach(function (section) {
    ['.section-heading > *', '.experience-row', '.practice-card', '.about-facts > *'].forEach(function (selector) {
      var index = 0;
      section.querySelectorAll(selector).forEach(function (child) {
        child.style.setProperty('--i', String(index));
        index += 1;
      });
    });
  });

  if (revealItems.length && 'IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    revealItems.forEach(function (item) { revealObserver.observe(item); });
    setTimeout(function () {
      revealItems.forEach(function (item) { item.classList.add('is-in'); });
    }, 2500);
  } else {
    revealItems.forEach(function (item) { item.classList.add('is-in'); });
  }

  // Pointer spotlight on the practice cards; touch never pays for it.
  document.querySelectorAll('.practice-card').forEach(function (card) {
    card.addEventListener('pointermove', function (event) {
      if (event.pointerType !== 'mouse') return;
      var box = card.getBoundingClientRect();
      card.style.setProperty('--mx', (event.clientX - box.left) + 'px');
      card.style.setProperty('--my', (event.clientY - box.top) + 'px');
    });
  });

  // Scroll-linked drift for the monogram: a few pixels, measured from its
  // parent so the element's own transform never feeds back into the reading.
  var parallaxItems = document.querySelectorAll('[data-parallax]');
  var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var parallaxFrame = null;

  function paintParallax() {
    parallaxFrame = null;
    if (!parallaxItems.length || (reduceMotion && reduceMotion.matches)) return;
    var viewport = window.innerHeight || 1;
    parallaxItems.forEach(function (item) {
      var reference = item.parentElement || item;
      var box = reference.getBoundingClientRect();
      var progress = (box.top + box.height / 2 - viewport / 2) / viewport;
      var amount = parseFloat(item.getAttribute('data-parallax')) || 0;
      var offset = Math.max(-1, Math.min(1, progress)) * amount * 100;
      item.style.setProperty('--py', offset.toFixed(1) + 'px');
    });
  }

  function queueParallax() {
    if (parallaxFrame === null) parallaxFrame = requestAnimationFrame(paintParallax);
  }

  if (parallaxItems.length) {
    window.addEventListener('scroll', queueParallax, { passive: true });
    window.addEventListener('resize', queueParallax);
    if (reduceMotion && reduceMotion.addEventListener) {
      reduceMotion.addEventListener('change', function () {
        parallaxItems.forEach(function (item) { item.style.setProperty('--py', '0px'); });
        queueParallax();
      });
    }
    paintParallax();
  }
})();
