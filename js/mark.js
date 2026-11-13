(function () {
  'use strict';

  var container = document.getElementById('mn-mark');
  if (!container) return;

  var query = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reduce = !!(query && query.matches);

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return; // .mn-fallback stays visible

  var size = 260;
  var dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  var fallback = container.querySelector('.mn-fallback');
  if (fallback) fallback.style.display = 'none';
  container.appendChild(canvas);

  // Extruded monogram: the glyph is drawn once per depth slice, each slice
  // offset by the current rotation, which reads as a solid extruded form.
  var SLICES = 30;
  var DEPTH = 1.2;
  var FONT = '400 88px Arial, Helvetica, sans-serif';
  var LIME = '#d2f89b';
  var FACE = [239, 239, 234];
  var EDGE = [88, 96, 76];

  var shades = [];
  for (var i = 0; i <= SLICES; i++) {
    var k = i / SLICES;
    shades.push('rgb(' +
      Math.round(FACE[0] + (EDGE[0] - FACE[0]) * k) + ',' +
      Math.round(FACE[1] + (EDGE[1] - FACE[1]) * k) + ',' +
      Math.round(FACE[2] + (EDGE[2] - FACE[2]) * k) + ')');
  }

  var yaw = 0;
  var pitch = 0;
  var velYaw = 0;
  var velPitch = 0;
  var dragging = false;
  var running = false;
  var lastX = 0;
  var lastY = 0;
  var start = 0;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function render(now) {
    var seconds = ((now || 0) - start) / 1000;
    var drift = reduce || dragging ? 0 : Math.sin(seconds * 0.55) * 0.18;
    var y = yaw + drift;
    var p = pitch;

    // Extrusion vector: a fixed isometric bias (so the mark reads as solid at
    // rest) swung by the drag. The glyph keeps its full width, so the letters
    // stay readable at every angle instead of collapsing edge-on.
    var ex = clamp(0.8 + Math.sin(y) * 0.85, 0.05, 1.5);
    var ey = clamp(-0.62 - Math.sin(p) * 0.85, -1.5, 0.05);

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = FONT;

    for (var i = SLICES; i >= 0; i--) {
      ctx.fillStyle = shades[i];
      ctx.fillText('MN', ex * i * DEPTH, ey * i * DEPTH);
    }

    ctx.strokeStyle = LIME;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-46, 40);
    ctx.lineTo(46, 40);
    ctx.stroke();

    ctx.restore();
  }

  function frame(now) {
    if (!running) return;
    if (!start) start = now;
    if (!dragging) {
      yaw += velYaw;
      pitch = clamp(pitch + velPitch, -0.45, 0.45);
      velYaw *= 0.95;
      velPitch *= 0.95;
    }
    render(now);
    requestAnimationFrame(frame);
  }

  function startLoop() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }

  function onPointerDown(e) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    velYaw = 0;
    velPitch = 0;
    canvas.style.cursor = 'grabbing';
    if (canvas.setPointerCapture && e.pointerId !== undefined) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
  }

  function onPointerMove(e) {
    if (!dragging) return;
    var dx = e.clientX - lastX;
    var dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    yaw += dx * 0.012;
    pitch = clamp(pitch + dy * 0.006, -0.45, 0.45);
    velYaw = dx * 0.012 * 0.5;
    velPitch = dy * 0.006 * 0.5;
    // Repaint straight away so the drag tracks the pointer even if the
    // animation loop is throttled (background tab, low-power mode).
    render(0);
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    canvas.style.cursor = 'grab';
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  var reset = document.getElementById('mark-reset');
  if (reset) {
    reset.addEventListener('click', function () {
      yaw = 0;
      pitch = 0;
      velYaw = 0;
      velPitch = 0;
      render(0);
    });
  }

  render(0);
  if (!reduce) startLoop();

  if (query) {
    var onChange = function (e) {
      reduce = e.matches;
      if (reduce) {
        running = false;
        render(0);
      } else {
        startLoop();
      }
    };
    if (query.addEventListener) query.addEventListener('change', onChange);
    else if (query.addListener) query.addListener(onChange);
  }
})();
