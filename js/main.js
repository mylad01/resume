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

  var copyBtn = document.getElementById('copy-email');
  var feedback = document.getElementById('copy-feedback');

  if (copyBtn && feedback) {
    copyBtn.addEventListener('click', function () {
      if (!navigator.clipboard) {
        feedback.textContent = 'Copy failed';
        return;
      }
      navigator.clipboard.writeText(copyBtn.getAttribute('data-email')).then(function () {
        feedback.textContent = 'Copied!';
      }).catch(function () {
        feedback.textContent = 'Copy failed';
      }).finally(function () {
        setTimeout(function () { feedback.textContent = ''; }, 2000);
      });
    });
  }

  // Appearance engine. The head script applies the saved look before first
  // paint; here the panel edits it. Everything lands on data attributes on
  // <html>, and the token layer does the rest.
  var root = document.documentElement;
  var panel = document.getElementById('theme-panel');
  var openBtn = document.getElementById('theme-open');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var ACCENTS = ['lime', 'teal', 'amber', 'violet', 'ice'];
  var appearance = loadAppearance();

  function loadAppearance() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem('mn-appearance') || 'null'); } catch (e) {}
    saved = saved || {};
    return {
      theme: saved.theme === 'light' ? 'light' : 'dark',
      accent: ACCENTS.indexOf(saved.accent) > -1 ? saved.accent : 'lime',
      contrast: saved.contrast === 'high' ? 'high' : 'standard',
      grain: saved.grain === 'off' ? 'off' : 'on'
    };
  }

  function syncControls() {
    document.querySelectorAll('[data-theme-choice]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-theme-choice') === appearance.theme));
    });
    document.querySelectorAll('[data-accent-choice]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-accent-choice') === appearance.accent));
    });
    document.querySelectorAll('[data-contrast-choice]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-contrast-choice') === appearance.contrast));
    });
    var grain = document.getElementById('grain-toggle');
    if (grain) grain.checked = appearance.grain === 'on';
  }

  function paint(persist) {
    root.setAttribute('data-theme', appearance.theme);
    if (appearance.accent === 'lime') root.removeAttribute('data-accent');
    else root.setAttribute('data-accent', appearance.accent);
    if (appearance.contrast === 'high') root.setAttribute('data-contrast', 'high');
    else root.removeAttribute('data-contrast');
    if (appearance.grain === 'off') root.setAttribute('data-grain', 'off');
    else root.removeAttribute('data-grain');
    if (themeMeta) themeMeta.setAttribute('content', appearance.theme === 'light' ? '#f4f5ee' : '#111310');
    syncControls();
    if (persist) {
      try { localStorage.setItem('mn-appearance', JSON.stringify(appearance)); } catch (e) {}
    }
    document.dispatchEvent(new CustomEvent('mn:theme', { detail: appearance.theme }));
  }

  function setAppearance(patch) {
    Object.keys(patch).forEach(function (key) { appearance[key] = patch[key]; });
    paint(true);
  }

  paint(false);

  document.querySelectorAll('[data-theme-choice]').forEach(function (btn) {
    btn.addEventListener('click', function () { setAppearance({ theme: btn.getAttribute('data-theme-choice') }); });
  });
  document.querySelectorAll('[data-accent-choice]').forEach(function (btn) {
    btn.addEventListener('click', function () { setAppearance({ accent: btn.getAttribute('data-accent-choice') }); });
  });
  document.querySelectorAll('[data-contrast-choice]').forEach(function (btn) {
    btn.addEventListener('click', function () { setAppearance({ contrast: btn.getAttribute('data-contrast-choice') }); });
  });

  var grainToggle = document.getElementById('grain-toggle');
  if (grainToggle) {
    grainToggle.addEventListener('change', function () {
      setAppearance({ grain: grainToggle.checked ? 'on' : 'off' });
    });
  }

  var resetBtn = document.getElementById('theme-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      appearance = { theme: 'dark', accent: 'lime', contrast: 'standard', grain: 'on' };
      paint(true);
    });
  }

  function closePanel() {
    if (!panel) return;
    if (typeof panel.close === 'function') panel.close();
    else panel.removeAttribute('open');
  }

  if (openBtn && panel) {
    openBtn.addEventListener('click', function () {
      if (typeof panel.showModal === 'function') panel.showModal();
      else panel.setAttribute('open', '');
      openBtn.setAttribute('aria-expanded', 'true');
    });
    panel.addEventListener('close', function () {
      openBtn.setAttribute('aria-expanded', 'false');
      openBtn.focus();
    });
    panel.addEventListener('click', function (event) {
      if (event.target === panel) closePanel();
    });
  }
  var themeClose = document.getElementById('theme-close');
  var themeDone = document.getElementById('theme-done');
  if (themeClose) themeClose.addEventListener('click', closePanel);
  if (themeDone) themeDone.addEventListener('click', closePanel);

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
    if (!navigator.clipboard) { announce('Copy failed'); return; }
    navigator.clipboard.writeText(url).then(function () {
      announce('Link copied');
    }).catch(function () {
      announce('Copy failed');
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

  // Keyboard: t toggles the theme, f jumps to the filters, Esc clears them.
  document.addEventListener('keydown', function (event) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    var target = event.target;
    if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    var key = (event.key || '').toLowerCase();

    if (key === 't' && panel && !panel.open) {
      setAppearance({ theme: appearance.theme === 'light' ? 'dark' : 'light' });
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
})();
