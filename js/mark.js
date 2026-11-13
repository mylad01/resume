(function () {
  'use strict';

  var container = document.getElementById('mn-mark');
  if (!container) return;

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return; // .mn-fallback stays visible

  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = motion.matches;

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

  // The mark is the glyph drawn once per depth slice, each slice offset along
  // a rotation-swinging extrusion vector so it reads as a solid form.
  var SLICES = 30;
  var DEPTH = 1.2;
  var LIMIT = 0.45;
  var FONT = '400 88px Arial, Helvetica, sans-serif';
  var LIME = getComputedStyle(document.documentElement).getPropertyValue('--lime').trim() || '#d2f89b';
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
  var started = 0;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function render(now) {
    var drift = reduce || dragging ? 0 : Math.sin(((now || 0) - started) * 0.00055) * 0.18;
    var ex = clamp(0.8 + Math.sin(yaw + drift) * 0.85, 0.05, 1.5);
    var ey = clamp(-0.62 - Math.sin(pitch) * 0.85, -1.5, 0.05);

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = FONT;

    for (var slice = SLICES; slice >= 0; slice--) {
      ctx.fillStyle = shades[slice];
      ctx.fillText('MN', ex * slice * DEPTH, ey * slice * DEPTH);
    }

    ctx.strokeStyle = LIME;
    ctx.beginPath();
    ctx.moveTo(-46, 40);
    ctx.lineTo(46, 40);
    ctx.stroke();
    ctx.restore();
  }

  function frame(now) {
    if (!running) return;
    if (!started) started = now;
    if (!dragging) {
      yaw += velYaw;
      pitch = clamp(pitch + velPitch, -LIMIT, LIMIT);
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

  canvas.addEventListener('pointerdown', function (e) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    velYaw = 0;
    velPitch = 0;
    if (canvas.setPointerCapture) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
  });

  window.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX;
    var dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    yaw += dx * 0.012;
    pitch = clamp(pitch + dy * 0.006, -LIMIT, LIMIT);
    velYaw = dx * 0.006;
    velPitch = dy * 0.003;
    // Repaint now so the drag tracks the pointer even if the loop is throttled.
    render(0);
  });

  window.addEventListener('pointerup', function () { dragging = false; });
  window.addEventListener('pointercancel', function () { dragging = false; });

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

  motion.addEventListener('change', function (e) {
    reduce = e.matches;
    if (reduce) {
      running = false;
      render(0);
    } else {
      startLoop();
    }
  });
})();
