(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap = window.gsap, ST = window.ScrollTrigger;
  var motion = !reduce && !!gsap && !!ST;
  if (motion) { root.classList.add('motion'); gsap.registerPlugin(ST); }

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  $$('[data-dup]').forEach(function (el) {
    var src = $('[data-key="' + el.getAttribute('data-dup') + '"]');
    if (src) el.src = src.getAttribute('src');
  });
  var hv = document.getElementById('heroVid'), gv = document.querySelector('#gravStage video');
  if (hv) hv.poster = document.querySelector('#heroWin img').getAttribute('src');
  if (gv) gv.poster = document.querySelector('[data-key="g-tolva"]').getAttribute('src');
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var store = {
    get: function (k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- almenas: polígonos con el perfil de la muralla ---------- */
  function crenels(x0, x1, y, d, n) {
    var w = x1 - x0, g = w / (2.4 * n - 1), m = 1.4 * g, x = x0, pts = [];
    for (var i = 0; i < n; i++) {
      pts.push([x, y]); x += m; pts.push([x, y]);
      if (i < n - 1) { pts.push([x, y + d]); x += g; pts.push([x, y + d]); }
    }
    return pts;
  }
  function poly(pts) {
    return 'polygon(' + pts.map(function (p) { return p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px'; }).join(',') + ')';
  }
  function merlonCount(w) { return Math.max(5, Math.round(w / 150)); }

  /* ---------- Lenis ---------- */
  var lenis = null;
  if (motion && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function scrollToEl(el) {
    if (!el) return;
    if (lenis) lenis.scrollTo(el === 'top' ? 0 : el, { duration: 1.6 });
    else if (el === 'top') window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }

  /* ---------- texto por líneas ---------- */
  function splitLines(el) {
    var original = el.innerHTML;
    var words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    var lines = [], top = null;
    $$('.w', el).forEach(function (s) {
      if (top === null || Math.abs(s.offsetTop - top) > 4) { lines.push([]); top = s.offsetTop; }
      lines[lines.length - 1].push(s.textContent);
    });
    el.innerHTML = lines.map(function (l) { return '<span class="line-mask"><span>' + l.join(' ') + '</span></span>'; }).join('');
    return { inner: $$('.line-mask > span', el), restore: function () { el.innerHTML = original; } };
  }
  function revealLines(el, delay) {
    var s = splitLines(el);
    return gsap.fromTo(s.inner, { yPercent: 105 }, {
      yPercent: 0, duration: 1.15, ease: 'expo.out', stagger: 0.09, delay: delay || 0,
      onComplete: s.restore
    });
  }

  /* ---------- entrada + mayoría de edad ---------- */
  var gate = $('#gate'), heroVid = $('#heroVid');
  var gateMark = $('.gate__mark');
  gateMark.innerHTML = $('#castle').innerHTML;
  var heroIntro = null;
  root.classList.add('is-gated');
  if (lenis) lenis.stop();

  function liftGate() {
    store.set('cz-edad', '1');
    var finish = function () {
      gate.remove(); root.classList.remove('is-gated');
      if (lenis) lenis.start();
      if (heroVid && !reduce) { var pr = heroVid.play(); if (pr && pr.catch) pr.catch(function () {}); }
      if (heroIntro) heroIntro();
    };
    if (!motion) { finish(); return; }
    var W = innerWidth, H = innerHeight, n = merlonCount(W), d = Math.min(46, H * 0.06);
    var o = { b: H + d };
    gsap.to(o, {
      b: -2, duration: 1.25, ease: 'expo.inOut',
      onUpdate: function () {
        gate.style.clipPath = poly([[0, 0], [W, 0]].concat(crenels(0, W, o.b, -d, n).reverse()));
      },
      onComplete: finish
    });
    gsap.to('.gate__in', { y: -60, opacity: 0, duration: 0.8, ease: 'power2.in' });
  }
  $('#gate-yes').addEventListener('click', liftGate);
  $('#gate-no').addEventListener('click', function () {
    $('#gate-msg').textContent = 'Lo sentimos. Para visitar esta web tienes que ser mayor de edad.';
  });
  var already = store.get('cz-edad') === '1';
  if (motion) {
    var paths = $$('path', gateMark);
    gsap.set(paths, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set('.gw', { opacity: 0, y: 14 });
    var tl = gsap.timeline({ delay: 0.25 });
    tl.to(paths, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', stagger: 0.09 })
      .to('.gw', { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.12 }, '-=.5');
    if (already) { $('.gate__ask').style.display = 'none'; tl.add(liftGate, '+=.15'); }
    else tl.add(function () { $('#gate-yes').focus({ preventScroll: true }); });
  } else if (already) { liftGate(); }

  /* ---------- nav ---------- */
  var nav = $('#nav'), heroDark = false, darkZones = 0;
  function paintNav() { nav.classList.toggle('is-dark', heroDark || darkZones > 0); }
  var menu = $('#menu'), drawer = $('#drawer');
  menu.addEventListener('click', function () {
    var open = !drawer.classList.contains('is-open');
    drawer.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', open);
    menu.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    nav.classList.toggle('is-dark', open || heroDark || darkZones > 0);
    if (lenis) open ? lenis.stop() : lenis.start();
  });
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var el = id === '#top' ? 'top' : $(id);
      if (!el) return;
      e.preventDefault();
      if (drawer.classList.contains('is-open')) menu.click();
      scrollToEl(el);
    });
  });

  /* ---------- resto: solo con movimiento ---------- */
  if (!motion) {
    $('#heroWin').style.setProperty('--clip', 'inset(' + Math.round(($('.hero__copy').getBoundingClientRect().bottom + 28)) + 'px var(--gut) var(--gut) var(--gut))');
    initStatic();
    return;
  }

  if (ST.create) {
    ST.create({
      start: 140, end: 'max',
      onUpdate: function (s) { nav.classList.toggle('is-hidden', s.direction === 1 && !drawer.classList.contains('is-open')); }
    });
    ST.create({
      trigger: '#historia', start: 'top 68px', end: 'max',
      onToggle: function (s) { nav.classList.toggle('is-solid', s.isActive); }
    });
    $$('[data-nav="dark"]').forEach(function (z) {
      ST.create({
        trigger: z, start: 'top 34px', end: 'bottom 34px',
        onToggle: function (s) { darkZones += s.isActive ? 1 : -1; paintNav(); }
      });
    });
  }

  /* ---------- HERO: ventana almenada que se abre ---------- */
  var win = $('#heroWin'), copy = $('.hero__copy'), cap = $('#heroCap');
  var hs = { intro: 0, p: 0 };
  var geo = {};
  function measureHero() {
    var r = win.getBoundingClientRect();
    var gut = parseFloat(getComputedStyle(root).getPropertyValue('--gut')) || 24;
    geo.W = r.width; geo.H = r.height; geo.gut = Math.min(gut, 40);
    geo.t0 = clamp(copy.offsetTop + copy.offsetHeight + (innerWidth < 900 ? 26 : 40), geo.H * 0.32, geo.H * 0.78);
    geo.n = merlonCount(geo.W); geo.d = innerWidth < 900 ? 18 : 30;
  }
  function paintHero() {
    var p = hs.p, k = 1 - p;
    var top = lerp(geo.H + geo.d, geo.t0, hs.intro);
    top = lerp(top, 0, p);
    var side = geo.gut * k, bottom = geo.H - geo.gut * k, d = geo.d * Math.pow(k, 1.4);
    var pts = [[side, bottom]].concat(crenels(side, geo.W - side, top, d, geo.n), [[geo.W - side, bottom]]);
    if (top <= 0.5 && side < 0.5) win.style.clipPath = 'none';
    else win.style.clipPath = poly(pts);
    win.style.setProperty('--vs', (1.12 - 0.12 * p).toFixed(4));
    win.style.setProperty('--shade', clamp((p - 0.55) / 0.45, 0, 1).toFixed(3));
    copy.style.transform = 'translate3d(0,' + (-90 * p).toFixed(1) + 'px,0)';
    copy.style.opacity = clamp(1 - p * 1.9, 0, 1).toFixed(3);
    cap.style.opacity = clamp((p - 0.72) / 0.28, 0, 1).toFixed(3);
    cap.style.transform = 'translate3d(0,' + (24 * (1 - clamp((p - 0.72) / 0.28, 0, 1))).toFixed(1) + 'px,0)';
    var dark = p > 0.32;
    if (dark !== heroDark) { heroDark = dark; paintNav(); }
  }
  measureHero(); paintHero();
  gsap.set('.hero [data-rise]', { opacity: 0, y: 24 });
  var heroH1 = $('.hero h1');
  heroH1.style.visibility = 'hidden';
  heroIntro = function () {
    heroH1.style.visibility = '';
    revealLines(heroH1, 0.15);
    gsap.to('.hero [data-rise]', { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.12, delay: 0.1 });
    gsap.to(hs, { intro: 1, duration: 1.6, ease: 'expo.out', delay: 0.35, onUpdate: paintHero });
  };
  ST.create({
    trigger: '.hero', start: 'top top', end: '+=115%', pin: true, scrub: true,
    onUpdate: function (s) { hs.p = s.progress; paintHero(); },
    onToggle: function (s) {
      if (!heroVid || gate.isConnected) return;
      if (s.isActive) { var pr = heroVid.play(); if (pr && pr.catch) pr.catch(function () {}); } else heroVid.pause();
    }
  });
  ST.addEventListener('refreshInit', function () { measureHero(); });
  ST.addEventListener('refresh', paintHero);

  /* ---------- titulares y textos ---------- */
  $$('[data-lines]').forEach(function (el) {
    if (el.closest('.hero')) return;
    gsap.set(el, { visibility: 'hidden' });
    ST.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { gsap.set(el, { visibility: 'visible' }); revealLines(el); } });
  });
  ST.batch($$('[data-rise]').filter(function (el) { return !el.closest('.hero'); }), {
    start: 'top 90%', once: true,
    onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1 }); }
  });

  var mm = gsap.matchMedia();

  /* ---------- HISTORIA: recorrido horizontal ---------- */
  mm.add('(min-width: 901px)', function () {
    var track = $('#histTrack'), bar = $('#histBar');
    var dist = function () { return track.scrollWidth - innerWidth; };
    var pan = gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: {
        trigger: '.hist', start: 'top top', end: function () { return '+=' + dist(); },
        pin: true, scrub: 1, invalidateOnRefresh: true,
        onUpdate: function (s) { bar.style.setProperty('--hp', s.progress.toFixed(3)); }
      }
    });
    $$('.era').forEach(function (era) {
      var img = $('.era__fig img', era), yr = $('.era__year', era);
      gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: era, containerAnimation: pan, start: 'left right', end: 'right left', scrub: true } });
      gsap.fromTo(yr, { x: 90 }, { x: -30, ease: 'none', scrollTrigger: { trigger: era, containerAnimation: pan, start: 'left right', end: 'right left', scrub: true } });
      gsap.fromTo($('.era__fig', era), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', ease: 'power2.out', scrollTrigger: { trigger: era, containerAnimation: pan, start: 'left 85%', end: 'left 35%', scrub: true } });
    });
  });

  /* ---------- RECINTO: bento y contadores ---------- */
  ST.batch('[data-tile]', {
    start: 'top 88%', once: true,
    onEnter: function (els) {
      gsap.fromTo(els, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.3, ease: 'expo.out', stagger: 0.1 });
      els.forEach(function (el) {
        var img = $('img', el); if (img) gsap.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.8, ease: 'expo.out' });
      });
    }
  });
  $$('[data-count]').forEach(function (el) {
    var to = +el.getAttribute('data-count'), sep = el.hasAttribute('data-sep');
    var from = to === 0 ? 12 : 0, o = { v: from };
    var fmt = function (v) { var s = String(Math.round(v)); return sep ? s.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : s; };
    el.textContent = fmt(from);
    ST.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () {
      gsap.to(o, { v: to, duration: to === 0 ? 1.4 : 2, ease: to === 0 ? 'power2.inOut' : 'expo.out', delay: 0.25, onUpdate: function () { el.textContent = fmt(o.v); } });
    } });
  });

  /* ---------- VIÑEDOS: altímetro ---------- */
  (function () {
    var ruler = $('#ruler'), mk = $('#rulerMk'), val = $('#altVal'), nm = $('#altName'), tg = $('#altTag');
    var MIN = 500, MAX = 660;
    for (var a = MIN; a <= MAX; a += 10) {
      var t = document.createElement('span');
      var major = a % 50 === 0;
      t.className = 'ruler__tick' + (major ? ' ruler__tick--major' : '');
      t.style.top = ((MAX - a) / (MAX - MIN) * 100) + '%';
      ruler.appendChild(t);
      if (major) { var l = document.createElement('span'); l.className = 'ruler__lab num'; l.style.top = t.style.top; l.textContent = a; ruler.appendChild(l); }
    }
    var cur = { v: 520 };
    function y(a) { return (MAX - a) / (MAX - MIN) * ruler.clientHeight; }
    function go(plot) {
      var a = +plot.getAttribute('data-alt');
      gsap.to(cur, { v: a, duration: 1.2, ease: 'expo.out', onUpdate: function () { val.textContent = Math.round(cur.v); } });
      gsap.to(mk, { y: y(a), duration: 1.2, ease: 'expo.out' });
      gsap.to([nm, tg], { opacity: 0, y: -8, duration: 0.2, onComplete: function () {
        nm.textContent = plot.getAttribute('data-name'); tg.textContent = plot.getAttribute('data-tag');
        gsap.fromTo([nm, tg], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.05 });
      } });
    }
    gsap.set(mk, { y: y(520) });
    ST.addEventListener('refresh', function () { gsap.set(mk, { y: y(cur.v) }); });
    $$('.plot').forEach(function (plot) {
      ST.create({ trigger: plot, start: 'top 55%', end: 'bottom 55%', onToggle: function (s) { if (s.isActive) go(plot); } });
      gsap.to($('figure img', plot), { scale: 1, ease: 'none', scrollTrigger: { trigger: plot, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  })();

  /* ---------- BODEGA: gravedad ---------- */
  mm.add('(min-width: 901px)', function () {
    var stage = $$('#gravStage > *'), steps = $$('#gravSteps .step'), lv = $$('#gravLevels i');
    var rail = $('#gravRail'), vid = $('#gravStage video'), idx = 0;
    var setRH = function () { rail.style.setProperty('--rh', rail.clientHeight + 'px'); };
    setRH();
    gsap.set(stage, { opacity: 0 }); gsap.set(stage[0], { opacity: 1 });
    gsap.set(steps, { autoAlpha: 0 }); gsap.set(steps[0], { autoAlpha: 1 });
    stage.forEach(function (el) { el.classList.remove('on'); }); steps.forEach(function (el) { el.classList.remove('on'); });
    function show(i) {
      if (i === idx) return;
      var down = i > idx, prev = idx, prevS = steps[idx], prevI = stage[idx];
      idx = i;
      gsap.killTweensOf(steps); gsap.killTweensOf(stage);
      steps.forEach(function (s, k) { if (k !== i && k !== prev) gsap.set(s, { autoAlpha: 0 }); });
      stage.forEach(function (s, k) { if (k !== i && k !== prev) gsap.set(s, { opacity: 0, zIndex: 0 }); });
      gsap.to(prevS, { autoAlpha: 0, y: down ? -24 : 24, duration: 0.45, ease: 'power2.in' });
      gsap.fromTo(steps[i], { autoAlpha: 0, y: down ? 36 : -36 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', delay: 0.2 });
      gsap.set(stage[i], { zIndex: 2 }); gsap.set(prevI, { zIndex: 1 });
      gsap.fromTo(stage[i], { opacity: 1, clipPath: down ? 'inset(0 0 100% 0)' : 'inset(100% 0 0 0)', scale: 1.12 },
        { clipPath: 'inset(0 0 0% 0)', scale: 1, duration: 1.2, ease: 'expo.inOut', onComplete: function () { stage.forEach(function (s, k) { if (k !== idx) gsap.set(s, { opacity: 0 }); }); } });
      lv.forEach(function (l, k) { l.classList.toggle('on', k <= i); });
      if (vid) { if (i === 1) { var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {}); } else vid.pause(); }
    }
    ST.create({
      trigger: '#gravPin', start: 'top top', end: '+=420%', pin: true, scrub: true,
      onRefresh: setRH,
      onUpdate: function (s) {
        rail.style.setProperty('--gp', s.progress.toFixed(4));
        show(Math.min(steps.length - 1, Math.floor(s.progress * steps.length * 0.999)));
      }
    });
    return function () { gsap.set(stage.concat(steps), { clearProps: 'all' }); stage[0].classList.add('on'); steps[0].classList.add('on'); };
  });

  /* ---------- VINOS: botellas y fichas apiladas ---------- */
  gsap.set('.shelf img', { yPercent: 30, opacity: 0 });
  ST.create({ trigger: '.shelf', start: 'top 85%', once: true, onEnter: function () {
    gsap.to('.shelf img', { yPercent: 0, opacity: 1, duration: 1.4, ease: 'expo.out', stagger: 0.08, clearProps: 'transform' });
  } });
  mm.add('(min-width: 901px)', function () {
    var cards = $$('.card');
    cards.forEach(function (card, i) {
      if (i === cards.length - 1) return;
      gsap.fromTo($('.card__in', card), { scale: 1, yPercent: 0, filter: 'brightness(1)' }, {
        scale: 0.93, yPercent: -1.5, filter: 'brightness(.9)', ease: 'none',
        scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top top', scrub: true }
      });
    });
    cards.forEach(function (card) {
      gsap.fromTo($('.card__fig img', card), { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'top top', scrub: true } });
    });
  });

  /* ---------- VISITAS: acordeón ---------- */
  var vis = $$('.vis');
  function openVis(v) { vis.forEach(function (x) { x.classList.toggle('on', x === v); }); }
  vis.forEach(function (v) {
    $('.vis__hit', v).addEventListener('click', function () { openVis(v); });
    v.addEventListener('mouseenter', function () { if (innerWidth > 900) openVis(v); });
  });

  /* ---------- RESERVA: la foto sube como una muralla ---------- */
  (function () {
    var fig = $('#resFig'), img = $('img', fig);
    var o = { y: 1 };
    function paint() {
      var W = fig.clientWidth, H = fig.clientHeight, d = innerWidth < 900 ? 18 : 30, n = merlonCount(W);
      var top = lerp(-d, H, o.y);
      if (o.y <= 0.001) { fig.style.clipPath = 'none'; return; }
      fig.style.clipPath = poly([[0, H]].concat(crenels(0, W, top, d, n), [[W, H]]));
    }
    paint();
    gsap.to(o, { y: 0, ease: 'none', onUpdate: paint, scrollTrigger: { trigger: '.reserva', start: 'top 92%', end: 'top 20%', scrub: true } });
    gsap.fromTo(img, { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.reserva', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    ST.addEventListener('refresh', paint);
  })();

  initForm();

  window.addEventListener('load', function () { ST.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });

  /* ---------- sin animaciones ---------- */
  function initStatic() {
    var vis = $$('.vis');
    vis.forEach(function (v) { $('.vis__hit', v).addEventListener('click', function () { vis.forEach(function (x) { x.classList.toggle('on', x === v); }); }); });
    var g = $('#gravRail'); if (g) g.style.setProperty('--gp', 1);
    initForm();
  }

  /* ---------- formulario de demostración ---------- */
  function initForm() {
    var f = $('#form'); if (!f || f.dataset.ready) return; f.dataset.ready = '1';
    var date = $('#f-fecha');
    var t = new Date(); t.setDate(t.getDate() + 1);
    date.min = t.toISOString().slice(0, 10);
    function err(id, msg, input) { $(id).textContent = msg; input.setAttribute('aria-invalid', msg ? 'true' : 'false'); return !msg; }
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      ok = err('#e-fecha', date.value ? (date.value < date.min ? 'Elige un día a partir de mañana.' : '') : 'Elige un día.', date) && ok;
      var nm = $('#f-nombre'); ok = err('#e-nombre', nm.value.trim() ? '' : 'Escribe tu nombre.', nm) && ok;
      var em = $('#f-mail'); ok = err('#e-mail', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value) ? '' : 'Revisa el correo electrónico.', em) && ok;
      if (!ok) { var first = $('[aria-invalid="true"]', f); if (first) first.focus(); return; }
      f.classList.add('is-sent');
      $('.form__ok', f).focus && $('.form__ok', f).setAttribute('tabindex', '-1');
      $('.form__ok', f).focus();
    });
  }
})();
