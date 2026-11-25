(function () {
  'use strict';

  var container = document.getElementById('mn-mark');
  if (!container) return;

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return; // .mn-fallback stays visible

  var fallback = container.querySelector('.mn-fallback');
  if (fallback) fallback.style.display = 'none';
  container.appendChild(canvas);

  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Interactive 3D relief of the MN monogram. Drag with a mouse, touchpad, or finger to rotate it.');

  // The mark is a point-cloud relief, not a stack of glyph stamps: the pair is
  // rasterised into a small occupancy grid, every solid cell becomes a point on
  // the front and back slab, and cells on the silhouette also get points at
  // intermediate depths. That side wall is what makes the form read as solid
  // once it turns away from the camera.
  var GRID = 64;
  var DEPTH = 0.17;
  var RAMP_FALLBACK = ['#6f8642', '#92b25a', '#b7da78', '#d2f89b'];
  var RAMP = RAMP_FALLBACK.slice();

  // The relief takes its four bands from the theme, so the light theme gets
  // deeper greens instead of a wash of pale ones on paper.
  function refreshRamp() {
    var styles = window.getComputedStyle(document.documentElement);
    RAMP = RAMP_FALLBACK.map(function (fallback, index) {
      return styles.getPropertyValue('--mark-' + (index + 1)).trim() || fallback;
    });
  }

  var points = buildPoints();

  function buildPoints() {
    var off = document.createElement('canvas');
    off.width = GRID;
    off.height = GRID;
    var octx = off.getContext && off.getContext('2d', { willReadFrequently: true });
    if (!octx) return null;

    octx.fillStyle = '#ffffff';
    octx.textBaseline = 'middle';
    octx.textAlign = 'left';
    octx.font = '900 ' + GRID + 'px "Arial Black", Arial, Helvetica, sans-serif';

    var wm = octx.measureText('M').width;
    var wn = octx.measureText('N').width;
    var track = -GRID * 0.05;                 // tighten the pair into one mark
    var total = wm + wn + track;
    var fit = (GRID * 0.94) / total;          // letters fill 94% of the mask

    octx.save();
    octx.scale(fit, fit);
    var x0 = (GRID / fit - total) / 2;
    var baseline = GRID / fit / 2;
    octx.fillText('M', x0, baseline);
    octx.fillText('N', x0 + wm + track, baseline);
    octx.restore();

    var data = octx.getImageData(0, 0, GRID, GRID).data;

    function solid(x, y) {
      return x >= 0 && y >= 0 && x < GRID && y < GRID && data[(y * GRID + x) * 4 + 3] > 128;
    }

    // Stride 4: x, y, z, side. side 0 is a face point, 1-4 is a wall whose
    // outward normal is -x, +x, -y, +y.
    var out = [];
    var step = (2 * DEPTH) / 5;

    function wall(px, py, side) {
      for (var s = 1; s < 5; s++) out.push(px, py, step * s - DEPTH, side + 1);
    }

    for (var y = 0; y < GRID; y++) {
      for (var x = 0; x < GRID; x++) {
        if (!solid(x, y)) continue;
        var px = 2 * ((x + 0.5) / GRID - 0.5);
        var py = 2 * ((y + 0.5) / GRID - 0.5);
        out.push(px, py, -DEPTH, 0, px, py, DEPTH, 0);
        if (!solid(x - 1, y)) wall(px, py, 0);
        if (!solid(x + 1, y)) wall(px, py, 1);
        if (!solid(x, y - 1)) wall(px, py, 2);
        if (!solid(x, y + 1)) wall(px, py, 3);
      }
    }
    return out.length ? out : null;
  }

  var START_X = -0.05;
  var START_Y = 0.24;
  var rotX = START_X;
  var rotY = START_Y;

  var width = 0;
  var height = 0;

  function draw() {
    if (!points || !width || !height) return;

    ctx.clearRect(0, 0, width, height);

    var sy = Math.sin(rotY);
    var cy = Math.cos(rotY);
    var sx = Math.sin(rotX);
    var cx = Math.cos(rotX);
    var scale = 0.42 * Math.min(width, height);
    var bands = [[], [], [], []];

    // Only walls whose outward normal turns toward the camera are drawn;
    // without this the far side of every stroke shows through its own face.
    var faces = [sy * cx > 0, sy * cx < 0, sx < 0, sx > 0];

    for (var i = 0; i < points.length; i += 4) {
      var px = points[i];
      var py = points[i + 1];
      var pz = points[i + 2];
      var side = points[i + 3];
      if (side && !faces[side - 1]) continue;

      // Yaw, then pitch, then a mild perspective divide.
      var rx = px * cy + pz * sy;
      var rz = pz * cy - px * sy;
      var ry = py * cx - rz * sx;
      var depth = py * sx + rz * cx;
      var persp = 4.5 / (4.5 - depth);

      var band = Math.floor((depth + 1.2) / 2.4 * 4);
      band = band < 0 ? 0 : band > 3 ? 3 : band;

      bands[band].push(
        width / 2 + rx * scale * persp,
        height / 2 + ry * scale * persp,
        side ? 1.5 : 1.2
      );
    }

    // Far band first so near points overprint it: painter's algorithm by depth.
    for (var b = 0; b < 4; b++) {
      ctx.fillStyle = RAMP[b];
      var list = bands[b];
      for (var k = 0; k < list.length; k += 3) {
        ctx.fillRect(list[k], list[k + 1], list[k + 2], list[k + 2]);
      }
    }
  }

  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  var frameInterval = 1000 / (coarse ? 24 : 30);

  function resize(w, h) {
    if (!w || !h) return;
    width = w;
    height = h;
    var ratio = Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5);
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }

  var motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reduce = !!(motion && motion.matches);

  var visible = false;
  var dragging = false;
  var pointerId = null;
  var lastX = 0;
  var lastY = 0;
  var rafId = 0;
  var lastDraw = 0;

  function tick(now) {
    rafId = 0;
    if (!visible || document.hidden || reduce || dragging) return;
    if (!lastDraw) lastDraw = now - frameInterval;
    var dt = Math.min(now - lastDraw, 50);
    if (dt >= frameInterval) {
      rotY += 0.00018 * dt;                   // a slow, steady revolution
      draw();
      lastDraw = now;
    }
    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (rafId || reduce) return;
    lastDraw = 0;
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function sync() {
    if (visible && !document.hidden && !reduce && !dragging) start();
    else stop();
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true;
    pointerId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    if (canvas.setPointerCapture) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
    stop();
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!dragging || e.pointerId !== pointerId) return;
    rotY += 0.012 * (e.clientX - lastX);
    rotX = Math.max(-1.2, Math.min(1.2, rotX + 0.012 * (e.clientY - lastY)));
    lastX = e.clientX;
    lastY = e.clientY;
    draw();
  });

  function endDrag(e) {
    if (!dragging || (e && e.pointerId !== pointerId)) return;
    dragging = false;
    pointerId = null;
    sync();
  }

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  window.addEventListener('pointerup', endDrag);

  var reset = document.getElementById('mark-reset');
  if (reset) {
    reset.addEventListener('click', function () {
      rotX = START_X;
      rotY = START_Y;
      draw();
    });
  }

  if (motion) {
    var onMotion = function () {
      reduce = motion.matches;
      if (reduce) {
        stop();
        draw();
      } else {
        sync();
      }
    };
    if (motion.addEventListener) motion.addEventListener('change', onMotion);
    else if (motion.addListener) motion.addListener(onMotion);
  }

  document.addEventListener('visibilitychange', sync);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      sync();
    }).observe(canvas);
  } else {
    visible = true;
    sync();
  }

  if ('ResizeObserver' in window) {
    new ResizeObserver(function (entries) {
      var box = entries[0].contentRect;
      resize(box.width, box.height);
    }).observe(canvas);
  } else {
    resize(container.clientWidth || 260, container.clientHeight || 260);
  }

  resize(container.clientWidth || 260, container.clientHeight || 260);

  refreshRamp();
  document.addEventListener('mn:theme', function () {
    refreshRamp();
    if (!rafId) draw();
  });

  draw();
})();
