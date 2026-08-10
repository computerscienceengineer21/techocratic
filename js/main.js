/* ============================================================
   techocratic — shared behavior
   splash (sunrise, 3s hold), nav, theme, lenis, reveals
   ============================================================ */

(function () {
  'use strict';

  var docEl = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';
  var hasST = hasGSAP && typeof window.ScrollTrigger !== 'undefined';

  if (hasST) gsap.registerPlugin(ScrollTrigger);

  window.tc = { reduced: reduced, hasGSAP: hasGSAP, hasST: hasST };

  /* ---------------- theme toggle ---------------- */

  var themeBtns = document.querySelectorAll('.theme-toggle');
  themeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dark = docEl.classList.toggle('theme-dark');
      try { localStorage.setItem('tc-theme', dark ? 'dark' : 'light'); } catch (e) {}
    });
  });

  /* ---------------- mobile menu ---------------- */

  var menuBtn = document.querySelector('.menu-toggle');
  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      document.body.classList.toggle('menu-open');
    });
    document.querySelectorAll('.mobile-menu a').forEach(function (a) {
      a.addEventListener('click', function () { document.body.classList.remove('menu-open'); });
    });
  }

  /* ---------------- active nav link ---------------- */

  var page = document.body.getAttribute('data-page');
  document.querySelectorAll('[data-nav]').forEach(function (a) {
    if (a.getAttribute('data-nav') === page) a.classList.add('is-active');
  });

  /* ---------------- nav scrolled state ---------------- */

  var nav = document.querySelector('.site-nav');
  function onScrollNav() {
    if (!nav) return;
    nav.classList.toggle('is-scrolled', window.scrollY > 10);
  }
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  /* ---------------- lenis smooth scroll ---------------- */

  var lenis = null;
  if (!reduced && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    window.tc.lenis = lenis;
    if (hasST) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(0);
    }
  }

  /* ---------------- scroll progress bar ---------------- */

  var progress = document.querySelector('.scroll-progress');
  if (progress && hasST) {
    gsap.to(progress, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.4 }
    });
  }

  /* ---------------- splash (sunrise, 3s hold) ---------------- */

  var splashResolve;
  window.tc.splashDone = new Promise(function (res) { splashResolve = res; });

  var splash = document.getElementById('splash');
  var seen = false;
  try { seen = !!sessionStorage.getItem('tc-splash-seen'); } catch (e) {}

  function endSplash() {
    docEl.classList.remove('splash-pending');
    document.body.classList.remove('no-scroll');
    if (lenis) lenis.start();
    if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
    if (hasST) ScrollTrigger.refresh();
    splashResolve();
  }

  if (!splash || seen || docEl.classList.contains('splash-seen')) {
    docEl.classList.remove('splash-pending');
    if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
    splashResolve();
  } else {
    try { sessionStorage.setItem('tc-splash-seen', '1'); } catch (e) {}
    splash.classList.add('is-active');
    document.body.classList.add('no-scroll');
    if (lenis) lenis.stop();
    window.scrollTo(0, 0);

    var HOLD_MS = 3000;
    var sun = splash.querySelector('.splash-sun');
    var riseGroup = sun ? sun.querySelector('.r') : null;
    var rays = sun ? sun.querySelectorAll('.ray') : [];
    var horizon = sun ? sun.querySelector('.hz') : null;
    var word = splash.querySelector('.splash-word');
    var tag = splash.querySelector('.splash-tag');

    if (reduced || !hasGSAP || !riseGroup) {
      /* static sunrise: show finished frame, hold 3s, fade */
      setTimeout(function () {
        splash.style.transition = 'opacity 0.5s ease';
        splash.style.opacity = '0';
        setTimeout(endSplash, 520);
      }, HOLD_MS);
    } else {
      rays.forEach(function (ray) {
        var x1 = +ray.getAttribute('x1'), y1 = +ray.getAttribute('y1');
        var x2 = +ray.getAttribute('x2'), y2 = +ray.getAttribute('y2');
        var len = Math.hypot(x2 - x1, y2 - y1);
        ray.style.strokeDasharray = len;
        ray.style.strokeDashoffset = len;
      });

      var tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: function () {
          setTimeout(function () {
            gsap.to(splash, {
              yPercent: -100,
              duration: 0.9,
              ease: 'power4.inOut',
              onComplete: endSplash
            });
          }, HOLD_MS);
        }
      });

      tl.set(riseGroup, { y: 30 })
        .set([word, tag], { autoAlpha: 0, y: 14 });

      if (horizon) {
        tl.fromTo(horizon, { scaleX: 0, transformOrigin: '50% 50%' }, { scaleX: 1, duration: 0.7, ease: 'power2.out' });
      }

      tl.to(riseGroup, { y: 0, duration: 1.7, ease: 'power3.inOut' }, horizon ? '-=0.1' : 0)
        .to(rays, { strokeDashoffset: 0, duration: 0.45, stagger: 0.055, ease: 'power2.out' }, '-=0.7')
        .to(word, { autoAlpha: 1, y: 0, duration: 0.6 }, '-=0.25')
        .to(tag, { autoAlpha: 1, y: 0, duration: 0.5 }, '-=0.35');
    }
  }

  /* ---------------- split-text hero reveals ---------------- */

  function splitWords(el) {
    var text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.textContent = '';
    text.split(/\s+/).forEach(function (wordStr, i) {
      var outer = document.createElement('span');
      outer.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:top;';
      var inner = document.createElement('span');
      inner.style.display = 'inline-block';
      inner.className = 'wi';
      inner.textContent = wordStr;
      outer.appendChild(inner);
      el.appendChild(outer);
      el.appendChild(document.createTextNode(' '));
    });
    el.setAttribute('aria-hidden', 'false');
  }

  var splitEls = document.querySelectorAll('[data-split]');
  if (hasGSAP && !reduced && splitEls.length) {
    splitEls.forEach(splitWords);
    gsap.set(document.querySelectorAll('[data-split] .wi'), { yPercent: 115 });
    window.tc.splashDone.then(function () {
      splitEls.forEach(function (el, i) {
        gsap.to(el.querySelectorAll('.wi'), {
          yPercent: 0,
          duration: 1.05,
          stagger: 0.06,
          delay: 0.15 + i * 0.12,
          ease: 'power4.out'
        });
      });
    });
  }

  /* ---------------- hero entrance extras ---------------- */

  var heroFade = document.querySelectorAll('[data-hero-fade]');
  if (hasGSAP && !reduced && heroFade.length) {
    gsap.set(heroFade, { autoAlpha: 0, y: 26 });
    window.tc.splashDone.then(function () {
      gsap.to(heroFade, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.14, delay: 0.55, ease: 'power3.out' });
    });
  }

  /* ---------------- scroll reveals ---------------- */

  if (hasST && !reduced) {
    var revealEls = document.querySelectorAll('[data-reveal]');
    if (revealEls.length) {
      gsap.set(revealEls, { autoAlpha: 0, y: 34 });
      ScrollTrigger.batch(revealEls, {
        start: 'top 88%',
        once: true,
        onEnter: function (batch) {
          gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.95, stagger: 0.09, ease: 'power3.out', overwrite: true });
        }
      });
    }
  }

  /* ---------------- counters ---------------- */

  if (hasST && !reduced) {
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var obj = { v: 0 };
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: function () {
          gsap.to(obj, {
            v: target,
            duration: 1.6,
            ease: 'power2.out',
            onUpdate: function () { el.textContent = Math.round(obj.v); }
          });
        }
      });
    });
  }

  /* ---------------- self-drawing SVG strokes ---------------- */

  window.tc.prepareDraw = function (svg) {
    var strokes = svg.querySelectorAll('[data-len], path, line, circle, polyline, rect');
    strokes.forEach(function (s) {
      var len;
      try { len = s.getTotalLength(); } catch (e) { return; }
      s.style.strokeDasharray = len;
      s.style.strokeDashoffset = len;
    });
    return strokes;
  };

  if (hasST && !reduced) {
    document.querySelectorAll('svg[data-draw]').forEach(function (svg) {
      var strokes = window.tc.prepareDraw(svg);
      ScrollTrigger.create({
        trigger: svg,
        start: 'top 85%',
        once: true,
        onEnter: function () {
          gsap.to(strokes, { strokeDashoffset: 0, duration: 1.4, stagger: 0.06, ease: 'power2.inOut' });
        }
      });
    });
  }

  /* ---------------- footer year ---------------- */

  var yr = document.querySelector('[data-year]');
  if (yr) yr.textContent = new Date().getFullYear();
})();
