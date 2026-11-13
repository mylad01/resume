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

  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  container.addEventListener('mousemove', function (e) {
    var box = container.getBoundingClientRect();
    pointer.tx = ((e.clientX - box.left) / box.width - 0.5) * 2;
    pointer.ty = ((e.clientY - box.top) / box.height - 0.5) * 2;
  });
  container.addEventListener('mouseleave', function () {
    pointer.tx = 0;
    pointer.ty = 0;
  });

  var reset = document.getElementById('mark-reset');
  if (reset) {
    reset.addEventListener('click', function () {
      pointer.tx = 0;
      pointer.ty = 0;
      pointer.x = 0;
      pointer.y = 0;
      if (reduce) draw(0);
    });
  }

  var t = 0;

  function draw(time) {
    t = (time || 0) * 0.001;
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    ctx.clearRect(0, 0, size, size);

    var cx = size / 2 + pointer.x * 6;
    var cy = size / 2 + pointer.y * 6;
    var lift = reduce ? 0 : Math.sin(t * 0.8) * 2;

    ctx.save();
    ctx.translate(cx, cy);

    // monogram
    ctx.fillStyle = '#efefea';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '400 104px Arial, Helvetica, sans-serif';
    ctx.fillText('MN', 0, lift - 6);

    // lime rule under the mark
    ctx.strokeStyle = '#d2f89b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-56, 52 + lift * 0.4);
    ctx.lineTo(56, 52 + lift * 0.4);
    ctx.stroke();

    ctx.restore();

    if (!reduce) requestAnimationFrame(draw);
  }

  if (reduce) draw(0);
  else requestAnimationFrame(draw);

  if (query) {
    var handler = function (e) {
      reduce = e.matches;
      if (reduce) draw(0);
      else requestAnimationFrame(draw);
    };
    if (query.addEventListener) query.addEventListener('change', handler);
    else if (query.addListener) query.addListener(handler);
  }
})();
