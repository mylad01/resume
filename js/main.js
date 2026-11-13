(function () {
  'use strict';

  // Anchor scrolling is CSS-only: html { scroll-behavior: smooth; scroll-padding-top: 100px }
  // clears the 92px sticky bar, and the reduced-motion query disables smooth scrolling.

  // --- scroll progress bar ------------------------------------------------
  var progress = document.getElementById('scroll-progress');
  function updateProgress() {
    if (!progress) return;
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var ratio = max > 0 ? doc.scrollTop / max : 0;
    progress.style.transform = 'scaleX(' + Math.min(1, Math.max(0, ratio)) + ')';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  // --- scroll-spy: mark the section currently in view --------------------
  var navLinks = document.querySelectorAll('.navigation nav a');
  var sections = document.querySelectorAll('#experience, #practice, #contact');

  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          if (link.getAttribute('href') === '#' + entry.target.id) {
            link.setAttribute('aria-current', 'true');
          } else {
            link.removeAttribute('aria-current');
          }
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (section) { observer.observe(section); });
  }

  // --- experience filters -------------------------------------------------
  var filterButtons = document.querySelectorAll('.filter-btn[data-filter]');
  var entries = document.querySelectorAll('.experience-row[data-category]');
  var resultCount = document.getElementById('result-count');

  function updateCount(visible) {
    if (!resultCount) return;
    var total = String(visible).padStart(2, '0');
    resultCount.textContent = total + (visible === 1 ? ' ENTRY' : ' ENTRIES');
  }

  function applyFilter(filter) {
    var visible = 0;
    entries.forEach(function (entry) {
      var show = filter === 'all' || entry.getAttribute('data-category') === filter;
      if (show) {
        entry.removeAttribute('hidden');
        visible += 1;
      } else {
        entry.setAttribute('hidden', '');
      }
    });
    filterButtons.forEach(function (btn) {
      var active = btn.getAttribute('data-filter') === filter;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    updateCount(visible);
  }

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyFilter(btn.getAttribute('data-filter') || 'all');
    });
  });

  // --- copy email ---------------------------------------------------------
  var copyBtn = document.getElementById('copy-email');
  var feedback = document.getElementById('copy-feedback');

  function showFeedback(message) {
    if (!feedback) return;
    feedback.textContent = message;
    setTimeout(function () { feedback.textContent = ''; }, 2000);
  }

  function fallbackCopy(text) {
    var field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'absolute';
    field.style.left = '-9999px';
    document.body.appendChild(field);
    field.select();
    try {
      document.execCommand('copy');
      showFeedback('Copied!');
    } catch (err) {
      showFeedback('Copy failed');
    }
    document.body.removeChild(field);
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var email = copyBtn.getAttribute('data-email') || '';
      if (!email) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(function () {
          showFeedback('Copied!');
        }).catch(function () {
          fallbackCopy(email);
        });
      } else {
        fallbackCopy(email);
      }
    });
  }
})();
