(function () {
  'use strict';

  // Anchor scrolling is CSS-only: html { scroll-behavior: smooth; scroll-padding-top: 100px }.

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

  // Mark the section in view so the nav dot follows the page.
  var navLinks = document.querySelectorAll('.navigation nav a');
  var sections = document.querySelectorAll('#experience, #practice, #contact');

  if (navLinks.length && 'IntersectionObserver' in window) {
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
      applyFilter(btn.getAttribute('data-filter') || 'all');
    });
  });

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
})();
