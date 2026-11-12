(function () {
  // Smooth scroll for in-page nav links
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (!id || id === '#') return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var header = document.querySelector('.site-header');
      var offset = header ? header.offsetHeight + 12 : 0;
      var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
      history.pushState(null, '', id);
    });
  });

  // Experience filters
  var filterButtons = document.querySelectorAll('.filter-btn[data-filter]');
  var entries = document.querySelectorAll('.timeline-entry[data-category]');
  function applyFilter(filter) {
    entries.forEach(function (entry) {
      var cat = entry.getAttribute('data-category');
      var show = filter === 'all' || cat === filter;
      if (show) {
        entry.removeAttribute('hidden');
      } else {
        entry.setAttribute('hidden', '');
      }
    });
    filterButtons.forEach(function (btn) {
      var active = btn.getAttribute('data-filter') === filter;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }
  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyFilter(btn.getAttribute('data-filter') || 'all');
    });
  });

  // Copy email
  var copyBtn = document.getElementById('copy-email');
  var feedback = document.getElementById('copy-feedback');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var email = copyBtn.getAttribute('data-email') || '';
      if (!email) return;
      function show(msg) {
        if (!feedback) return;
        feedback.textContent = msg;
        setTimeout(function () { feedback.textContent = ''; }, 2000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(function () {
          show('Copied!');
        }).catch(function () {
          fallbackCopy(email, show);
        });
      } else {
        fallbackCopy(email, show);
      }
    });
  }
  function fallbackCopy(text, show) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      show('Copied!');
    } catch (e) {
      show('Copy failed');
    }
    document.body.removeChild(ta);
  }
})();
