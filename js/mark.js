(function () {
  var container = document.getElementById('mn-mark');
  if (!container) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return; // fallback span remains

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
    var r = container.getBoundingClientRect();
    pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  container.addEventListener('mouseleave', function () { pointer.tx = 0; pointer.ty = 0; });

  var t = 0;
  function draw(time) {
    t = (time || 0) * 0.001;
    // slower, subtler pointer response
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;

    ctx.clearRect(0, 0, size, size);

    var cx = size / 2 + pointer.x * 4;
    var cy = size / 2 + pointer.y * 4;
    var drift = reduce ? 0 : Math.sin(t * 0.8) * 2;
    var pulse = reduce ? 1 : 1 + Math.sin(t * 0.9) * 0.015;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);

    // outer frame
    ctx.strokeStyle = '#2a2a30';
    ctx.lineWidth = 1;
    ctx.strokeRect(-100, -100, 200, 200);

    // inner panel
    ctx.fillStyle = '#101014';
    ctx.strokeStyle = '#1f1f24';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(-76 + drift * 0.5, -76 - drift * 0.5, 152, 152);
    ctx.fill();
    ctx.stroke();

    // subtle corner marks
    ctx.strokeStyle = '#3a3a42';
    ctx.lineWidth = 1;
    var c = 88, l = 14;
    ctx.beginPath();
    ctx.moveTo(-c, -c + l); ctx.lineTo(-c, -c); ctx.lineTo(-c + l, -c);
    ctx.moveTo(c - l, -c); ctx.lineTo(c, -c); ctx.lineTo(c, -c + l);
    ctx.moveTo(-c, c - l); ctx.lineTo(-c, c); ctx.lineTo(-c + l, c);
    ctx.moveTo(c - l, c); ctx.lineTo(c, c); ctx.lineTo(c, c - l);
    ctx.stroke();

    // MN letters
    ctx.fillStyle = '#f2f2f2';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 84px system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    ctx.letterSpacing = '0.04em';
    var lift = reduce ? 0 : Math.sin(t * 0.7) * 1.5;
    ctx.fillText('MN', pointer.x * 2, lift + pointer.y * 2);

    // minimal underline accent
    ctx.strokeStyle = '#8a8a92';
    ctx.lineWidth = 1;
    var uw = 72;
    ctx.beginPath();
    ctx.moveTo(-uw / 2, 46 + lift * 0.4);
    ctx.lineTo(uw / 2, 46 + lift * 0.4);
    ctx.stroke();

    ctx.restore();

    if (!reduce) requestAnimationFrame(draw);
  }

  if (reduce) {
    draw(0);
  } else {
    requestAnimationFrame(draw);
  }

  // If user changes preference dynamically
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    var handler = function (e) { reduce = e.matches; if (reduce) draw(0); else requestAnimationFrame(draw); };
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
  }
})();
