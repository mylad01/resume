/* Theme engine: seven editable colour roles for the page, with every other
   token derived from them so the whole sheet stays in sync. Saves the derived
   tokens (not just the roles) so the head script can repaint before first
   paint without doing any maths. */
(function () {
  'use strict';

  var KEY = 'mn-theme-v2';
  var root = document.documentElement;

  var ROLES = [
    { key: 'bg', label: 'Background' },
    { key: 'surface', label: 'Surface' },
    { key: 'card', label: 'Cards' },
    { key: 'text', label: 'Text' },
    { key: 'muted', label: 'Muted text' },
    { key: 'accent', label: 'Accent' },
    { key: 'line', label: 'Borders' }
  ];

  var PRESETS = {
    night: { bg: '#111310', surface: '#181b16', card: '#1d2119', text: '#efefea', muted: '#a2a79a', accent: '#d2f89b', line: '#34382e' },
    paper: { bg: '#f4f5ee', surface: '#ffffff', card: '#eef0e6', text: '#20271b', muted: '#526242', accent: '#4a6516', line: '#dfe3d6' },
    slate: { bg: '#0f1419', surface: '#151c23', card: '#1a232c', text: '#e6edf3', muted: '#9aa7b4', accent: '#7cc4ff', line: '#283440' },
    forest: { bg: '#0c1512', surface: '#101b16', card: '#14211b', text: '#e8f0e9', muted: '#9db3a2', accent: '#86e0b0', line: '#25362c' },
    sand: { bg: '#f6f1e7', surface: '#fffdf8', card: '#efe6d5', text: '#241d12', muted: '#6b5a3e', accent: '#8a5a12', line: '#e0d3bb' },
    glass: { bg: '#0b1620', surface: '#122230', card: '#163042', text: '#e9f5fb', muted: '#a3bccb', accent: '#7fe3ff', line: '#254355' }
  };

  /* --- colour maths ------------------------------------------------------ */

  function toRgb(value) {
    var match = /^#?([0-9a-f]{6})$/i.exec(String(value || '').trim());
    if (!match) return null;
    var n = parseInt(match[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function toHex(rgb) {
    return '#' + rgb.map(function (c) {
      var v = Math.max(0, Math.min(255, Math.round(c)));
      return (v < 16 ? '0' : '') + v.toString(16);
    }).join('');
  }

  function mix(a, b, t) {
    var A = toRgb(a), B = toRgb(b);
    return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
  }

  function alpha(c, a) {
    var A = toRgb(c);
    return 'rgba(' + A[0] + ', ' + A[1] + ', ' + A[2] + ', ' + a + ')';
  }

  function luminance(c) {
    var A = toRgb(c).map(function (v) {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * A[0] + 0.7152 * A[1] + 0.0722 * A[2];
  }

  function contrast(a, b) {
    var l1 = luminance(a), l2 = luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  function inkOn(c) {
    return luminance(c) > 0.45 ? '#10130d' : '#ffffff';
  }

  /* Fade a colour toward the page background, but never past the point where
     it stops being readable on either background or card surface. */
  function tone(c, roles, blend, min) {
    var bases = [roles.bg, roles.card];
    for (var t = blend; t > 0; t -= 0.02) {
      var value = mix(c, roles.bg, t);
      if (bases.every(function (b) { return contrast(value, b) >= min; })) return value;
    }
    return c;
  }

  function derive(roles) {
    var dark = luminance(roles.bg) < 0.42;
    var lift = dark ? '#ffffff' : '#000000';
    return {
      '--bg': roles.bg,
      '--bg-soft': mix(roles.bg, lift, 0.035),
      '--panel': roles.surface,
      '--panel-raised': roles.card,
      '--nav-bg': alpha(roles.bg, 0.96),
      '--card-wash': alpha(roles.accent, dark ? 0.1 : 0.07),
      '--row-hover': alpha(roles.text, 0.04),
      '--line': roles.line,
      '--line-soft': alpha(roles.line, 0.45),
      '--line-strong': mix(roles.line, roles.text, 0.35),
      '--line-hover': mix(roles.line, roles.accent, 0.6),
      '--ring-line': alpha(roles.accent, 0.18),
      '--grid': alpha(roles.line, 0.3),
      '--text': roles.text,
      '--text-2': tone(roles.text, roles, 0.14, 7),
      '--text-3': tone(roles.text, roles, 0.26, 4.8),
      '--text-4': tone(roles.text, roles, 0.36, 4.5),
      '--muted': roles.muted,
      '--muted-2': tone(roles.muted, roles, 0.16, 4.5),
      '--muted-3': tone(roles.muted, roles, 0.3, 4.5),
      '--accent': roles.accent,
      '--lime': roles.accent,
      '--lime-hover': mix(roles.accent, lift, 0.16),
      '--lime-ink': inkOn(roles.accent),
      '--glow': alpha(roles.accent, 0.12),
      '--dot-glow': alpha(roles.accent, 0.27),
      '--mark-1': mix(roles.accent, roles.bg, 0.55),
      '--mark-2': mix(roles.accent, roles.bg, 0.34),
      '--mark-3': mix(roles.accent, roles.bg, 0.15),
      '--mark-4': roles.accent,
      '--shadow': '0 22px 45px -32px ' + alpha(dark ? '#000000' : '#20271b', dark ? 0.8 : 0.28),
      '--glass-bg': alpha(roles.card, 0.5),
      '--glass-bg-soft': alpha(roles.card, 0.68),
      '--glass-line': alpha(mix(roles.line, roles.text, 0.2), 0.75),
      '--glass-hi': alpha(lift, dark ? 0.12 : 0.6)
    };
  }

  /* --- apply / persist --------------------------------------------------- */

  var state = { preset: 'night', roles: Object.assign({}, PRESETS.night), contrast: 'standard', grain: 'on', glass: 'off' };
  var applied = [];

  function applyTokens(tokens) {
    applied.forEach(function (name) { root.style.removeProperty(name); });
    applied = [];
    Object.keys(tokens).forEach(function (name) {
      root.style.setProperty(name, tokens[name]);
      applied.push(name);
    });
    root.setAttribute('data-theme', luminance(state.roles.bg) < 0.42 ? 'dark' : 'light');
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        preset: state.preset,
        roles: state.roles,
        contrast: state.contrast,
        grain: state.grain,
        glass: state.glass,
        tokens: derive(state.roles),
        mode: luminance(state.roles.bg) < 0.42 ? 'dark' : 'light'
      }));
    } catch (e) {}
  }

  function setAttributes() {
    if (state.contrast === 'high') root.setAttribute('data-contrast', 'high');
    else root.removeAttribute('data-contrast');
    if (state.grain === 'off') root.setAttribute('data-grain', 'off');
    else root.removeAttribute('data-grain');
    if (state.glass === 'soft' || state.glass === 'strong') root.setAttribute('data-glass', state.glass);
    else root.removeAttribute('data-glass');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', state.roles.bg);
  }

  function render() {
    applyTokens(derive(state.roles));
    setAttributes();
    if (ui.ready) {
      syncControls();
      updateRatio();
    }
    save();
    document.dispatchEvent(new CustomEvent('mn:theme', { detail: state.roles }));
  }

  /* Printing must not inherit a dark or custom palette. */
  function printMode(on) {
    if (on) {
      applied.forEach(function (name) { root.style.removeProperty(name); });
    } else {
      applyTokens(derive(state.roles));
    }
  }
  window.addEventListener('beforeprint', function () { printMode(true); });
  window.addEventListener('afterprint', function () { printMode(false); });

  /* --- panel ------------------------------------------------------------- */

  var ui = { ready: false };

  function buildRows() {
    var host = document.getElementById('theme-roles');
    if (!host) return;
    ROLES.forEach(function (role) {
      var row = document.createElement('label');
      row.className = 'theme-role';

      var name = document.createElement('span');
      name.className = 'theme-role-name';
      name.textContent = role.label;

      var picker = document.createElement('input');
      picker.type = 'color';
      picker.className = 'theme-color';
      picker.setAttribute('data-role', role.key);
      picker.setAttribute('aria-label', role.label + ' colour');

      var hex = document.createElement('input');
      hex.type = 'text';
      hex.className = 'theme-hex';
      hex.setAttribute('data-role-hex', role.key);
      hex.setAttribute('aria-label', role.label + ' hex value');
      hex.maxLength = 7;
      hex.spellcheck = false;

      row.appendChild(name);
      row.appendChild(picker);
      row.appendChild(hex);
      host.appendChild(row);

      picker.addEventListener('input', function () { setRole(role.key, picker.value); });
      hex.addEventListener('input', function () {
        if (toRgb(hex.value) && hex.value.charAt(0) === '#' && hex.value.length === 7) {
          setRole(role.key, hex.value.toLowerCase());
        }
      });
      hex.addEventListener('blur', function () { hex.value = state.roles[role.key]; });
    });
  }

  function setRole(key, value) {
    if (!toRgb(value)) return;
    state.roles[key] = value.toLowerCase();
    state.preset = null;
    render();
  }

  function syncControls() {
    ROLES.forEach(function (role) {
      var picker = document.querySelector('[data-role="' + role.key + '"]');
      var hex = document.querySelector('[data-role-hex="' + role.key + '"]');
      if (picker) picker.value = state.roles[role.key];
      if (hex && document.activeElement !== hex) hex.value = state.roles[role.key];
    });
    document.querySelectorAll('[data-preset]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-preset') === state.preset));
    });
    document.querySelectorAll('[data-theme-choice]').forEach(function (btn) {
      var mode = luminance(state.roles.bg) < 0.42 ? 'dark' : 'light';
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-theme-choice') === mode));
    });
    document.querySelectorAll('[data-contrast-choice]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-contrast-choice') === state.contrast));
    });
    document.querySelectorAll('[data-glass-choice]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-glass-choice') === state.glass));
    });
    var grain = document.getElementById('grain-toggle');
    if (grain) grain.checked = state.grain === 'on';
  }

  function updateRatio() {
    var out = document.getElementById('theme-ratio');
    if (!out) return;
    var text = contrast(state.roles.text, state.roles.bg);
    var accent = contrast(state.roles.accent, state.roles.bg);
    var flag = (text >= 4.5 && accent >= 3) ? '' : ' · low';
    out.textContent = 'Text ' + text.toFixed(1) + ':1 · Accent ' + accent.toFixed(1) + ':1' + flag;
    out.setAttribute('data-low', (text < 4.5 || accent < 3) ? 'true' : 'false');
  }

  function loadPreset(name) {
    if (!PRESETS[name]) return;
    state.preset = name;
    state.roles = Object.assign({}, PRESETS[name]);
    render();
  }

  function toggleTheme() {
    loadPreset(luminance(state.roles.bg) < 0.42 ? 'paper' : 'night');
  }

  function openPanel() {
    var panel = document.getElementById('theme-panel');
    var opener = document.getElementById('theme-open');
    if (!panel) return;
    if (typeof panel.showModal === 'function') panel.showModal();
    else panel.setAttribute('open', '');
    if (opener) opener.setAttribute('aria-expanded', 'true');
  }

  function closePanel() {
    var panel = document.getElementById('theme-panel');
    var opener = document.getElementById('theme-open');
    if (!panel) return;
    if (typeof panel.close === 'function') panel.close();
    else panel.removeAttribute('open');
    if (opener) opener.setAttribute('aria-expanded', 'false');
  }

  function boot() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved && saved.roles) {
        state.preset = saved.preset || null;
        state.roles = Object.assign({}, PRESETS.night, saved.roles);
        state.contrast = saved.contrast === 'high' ? 'high' : 'standard';
        state.grain = saved.grain === 'off' ? 'off' : 'on';
        state.glass = (saved.glass === 'soft' || saved.glass === 'strong') ? saved.glass : 'off';
      }
    } catch (e) {}

    buildRows();
    ui.ready = true;
    render();

    document.querySelectorAll('[data-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () { loadPreset(btn.getAttribute('data-preset')); });
    });
    document.querySelectorAll('[data-theme-choice]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var want = btn.getAttribute('data-theme-choice');
        var isDark = luminance(state.roles.bg) < 0.42;
        if ((want === 'dark') !== isDark) toggleTheme();
      });
    });
    document.querySelectorAll('[data-contrast-choice]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.contrast = btn.getAttribute('data-contrast-choice');
        render();
      });
    });

    document.querySelectorAll('[data-glass-choice]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.glass = btn.getAttribute('data-glass-choice');
        render();
      });
    });

    var grain = document.getElementById('grain-toggle');
    if (grain) {
      grain.addEventListener('change', function () {
        state.grain = grain.checked ? 'on' : 'off';
        render();
      });
    }

    var reset = document.getElementById('theme-reset');
    if (reset) {
      reset.addEventListener('click', function () {
        state.contrast = 'standard';
        state.grain = 'on';
        state.glass = 'off';
        loadPreset('night');
      });
    }

    var opener = document.getElementById('theme-open');
    if (opener) opener.addEventListener('click', openPanel);
    var panel = document.getElementById('theme-panel');
    if (panel) {
      panel.addEventListener('close', function () {
        if (opener) {
          opener.setAttribute('aria-expanded', 'false');
          opener.focus();
        }
      });
      panel.addEventListener('click', function (event) {
        if (event.target === panel) closePanel();
      });
    }
    ['theme-close', 'theme-done'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', closePanel);
    });
  }

  window.MNTheme = {
    open: openPanel,
    close: closePanel,
    toggle: toggleTheme,
    preset: loadPreset,
    state: function () { return state; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
