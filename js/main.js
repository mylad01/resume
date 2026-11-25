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
  var rail = document.querySelector('.section-rail');
  var railFill = rail ? rail.querySelector('.ledger-fill') : null;
  var railRead = rail ? rail.querySelector('.ledger-read') : null;
  var railItems = rail ? Array.prototype.slice.call(rail.querySelectorAll('a[data-rail]')) : [];
  var marksHost = document.getElementById('section-marks');
  var markNodes = marksHost ? Array.prototype.slice.call(marksHost.children) : [];

  function readFraction() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    return max > 0 ? Math.min(doc.scrollTop / max, 1) : 0;
  }

  function updateProgress() {
    var fraction = readFraction();
    if (progress) progress.style.transform = 'scaleX(' + fraction + ')';
    if (railRead) railRead.setAttribute('data-pct', String(Math.round(fraction * 100)).padStart(2, '0'));
  }

  if (progress || railRead) {
    var progressFrame = null;
    var queueProgress = function () {
      if (progressFrame !== null) return;
      progressFrame = requestAnimationFrame(function () {
        progressFrame = null;
        updateProgress();
      });
    };
    window.addEventListener('scroll', queueProgress, { passive: true });
    window.addEventListener('resize', function () { queueProgress(); paintLedgerFill(); paintMarks(); });
    updateProgress();
  }

  // Mark the section in view so the nav dot and the desktop rail follow the page.
  var navLinks = document.querySelectorAll('.navigation nav a');
  var railLinks = document.querySelectorAll('.section-rail a');
  var sections = document.querySelectorAll('#hero, #about, #experience, #practice, #contact');

  // The reading ledger: the current section's tick goes accent, every tick
  // above it stays marked as read, and the fill stops on the current section.
  function paintLedgerFill() {
    if (!railFill || !railItems.length) return;
    var ticks = railFill.parentElement;
    var box = ticks.getBoundingClientRect();
    if (!box.height) return;
    var current = null;
    railItems.forEach(function (link) {
      if (link.getAttribute('aria-current') === 'true') current = link;
    });
    if (!current) return;
    var tick = current.getBoundingClientRect();
    var centre = tick.top + tick.height / 2 - box.top;
    var fraction = Math.max(0, Math.min(1, centre / box.height));
    railFill.style.transform = 'scaleY(' + fraction.toFixed(3) + ')';
  }

  // The top bar is cut at each section boundary, the mobile stand-in for the
  // rail's ticks. Fractions follow the same scroll fraction as the bar.
  function paintMarks() {
    if (!markNodes.length) return;
    var max = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (max <= 0) return;
    var boundaries = [];
    sections.forEach(function (section) {
      var top = section.getBoundingClientRect().top + window.scrollY;
      if (top > 0 && top < max) boundaries.push(top / max);
    });
    markNodes.forEach(function (mark, i) {
      if (boundaries[i] === undefined) {
        mark.style.display = 'none';
        return;
      }
      mark.style.display = '';
      mark.style.left = (boundaries[i] * 100).toFixed(3) + '%';
    });
  }

  function markCurrent(id) {
    var index = -1;
    railItems.forEach(function (link, i) {
      if (link.getAttribute('data-rail') === id) index = i;
    });
    document.querySelectorAll('.navigation nav a').forEach(function (link) {
      if (link.getAttribute('href') === '#' + id) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
    railItems.forEach(function (link, i) {
      var on = i === index;
      if (on) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
      link.classList.toggle('is-read', index > -1 && i < index);
      link.classList.remove('is-hit');
      if (on) {
        void link.offsetWidth;
        link.classList.add('is-hit');
      }
    });
    paintLedgerFill();
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

  // Number the rail ticks so they write in one after another (CSS reads --i).
  railItems.forEach(function (link, i) { link.style.setProperty('--i', String(i)); });

  // Jump links land settled: the target's reveals are already in on arrival.
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function () {
      var id = (link.getAttribute('href') || '').slice(1);
      var target = id ? document.getElementById(id) : null;
      if (!target || !target.closest) return;
      var section = target.closest('[data-reveal]');
      if (section && !section.classList.contains('is-in')) {
        section.classList.add('is-in');
      }
      if (section) {
        section.classList.add('is-settled');
        section.querySelectorAll('.reveal-item').forEach(function (item) {
          item.classList.add('is-in');
        });
      }
    });
  });

  // Split the hero heading into words so each rises behind its own baseline.
  // The copy is unchanged and no-JS keeps the plain heading.
  var heroTitle = document.querySelector('.hero h1');
  if (heroTitle) {
    var heroWords = heroTitle.textContent.trim().split(/\s+/);
    if (heroWords.length > 1) {
      heroTitle.textContent = '';
      heroWords.forEach(function (word, i) {
        var outer = document.createElement('span');
        outer.className = 'word';
        outer.style.setProperty('--i', String(i));
        var inner = document.createElement('span');
        inner.textContent = word;
        outer.appendChild(inner);
        heroTitle.appendChild(outer);
        if (i < heroWords.length - 1) heroTitle.appendChild(document.createTextNode(' '));
      });
    }
  }

  paintMarks();
  window.addEventListener('load', paintMarks);

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
    // Rows appear and disappear, so the section map and read-out move too; a
    // row that comes back above the fold must not sit invisible.
    paintMarks();
    updateProgress();
    if (revealItems && revealItems.length) settleVisible(revealItems);
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

  // Reveal once as things come up. Headings arrive with their section; rows,
  // cards and facts arrive when they themselves reach the viewport, so nothing
  // plays its entrance below the fold.
  var revealSections = document.querySelectorAll('[data-reveal]');
  var revealItems = [];

  // Number the staggered groups (--i) so each sequence restarts inside its own
  // heading, row list, card grid or facts grid.
  revealSections.forEach(function (section) {
    var headingIndex = 0;
    section.querySelectorAll('.section-heading > *').forEach(function (child) {
      child.style.setProperty('--i', String(headingIndex));
      headingIndex += 1;
    });
    ['.experience-row', '.practice-card', '.about-facts > *'].forEach(function (selector) {
      var index = 0;
      section.querySelectorAll(selector).forEach(function (child) {
        child.classList.add('reveal-item');
        child.style.setProperty('--i', String(index));
        index += 1;
        revealItems.push(child);
      });
    });
  });

  function settleVisible(nodes) {
    nodes.forEach(function (node) {
      if (node.getBoundingClientRect().top < window.innerHeight) node.classList.add('is-in');
    });
  }

  if (revealSections.length && 'IntersectionObserver' in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        sectionObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });

    var itemObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        itemObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });

    revealSections.forEach(function (section) { sectionObserver.observe(section); });
    revealItems.forEach(function (item) { itemObserver.observe(item); });

    // Safety pass: reveal anything already at or above the viewport, so no copy
    // can stay hidden, while anything further down still waits for its scroll.
    setTimeout(function () {
      settleVisible(Array.prototype.slice.call(revealSections));
      settleVisible(revealItems);
    }, 2500);
  } else {
    revealSections.forEach(function (item) { item.classList.add('is-in'); });
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
