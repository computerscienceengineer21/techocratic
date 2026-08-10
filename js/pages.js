/* ============================================================
   techocratic — page-specific scenes
   guarded by <body data-page="...">
   ============================================================ */

(function () {
  'use strict';

  var tc = window.tc || {};
  var reduced = !!tc.reduced;
  var hasGSAP = !!tc.hasGSAP;
  var hasST = !!tc.hasST;
  var page = document.body.getAttribute('data-page');
  var DESKTOP = '(min-width: 961px)';
  var MOBILE = '(max-width: 960px)';
  var mm = hasST ? gsap.matchMedia() : null;

  function q(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function prepareStrokes(root) {
    var strokes = [];
    qa('path, line, circle, polyline', root).forEach(function (s) {
      var len;
      try { len = s.getTotalLength(); } catch (e) { return; }
      if (!len || (s.getAttribute('fill') && s.getAttribute('fill') !== 'none' && !s.getAttribute('stroke'))) return;
      s.style.strokeDasharray = len;
      s.style.strokeDashoffset = len;
      strokes.push(s);
    });
    return strokes;
  }

  /* crossfading step panels driven by a scrubbed timeline */
  function addStepSegment(tl, stepEl, activate, deactivate, isLast) {
    tl.add(activate);
    tl.to(stepEl, { autoAlpha: 1, y: 0, duration: 0.6 }, '<');
    tl.to({}, { duration: 0.9 }); /* hold */
    if (!isLast) {
      tl.add(deactivate);
      tl.to(stepEl, { autoAlpha: 0, y: -26, duration: 0.5 }, '<');
    }
  }

  /* ============================================================
     index — the vision
     ============================================================ */

  if (page === 'index') {

    /* --- hero network canvas: citizens connecting --- */
    (function heroCanvas() {
      var canvas = document.getElementById('netCanvas');
      if (!canvas || reduced) return;
      var ctx2d = canvas.getContext('2d');
      if (!ctx2d) return;

      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var W = 0, H = 0, nodes = [], running = true;
      var mouse = { x: -1e4, y: -1e4 };
      var LINK = 130, LINK2 = LINK * LINK;

      function resize() {
        W = canvas.clientWidth; H = canvas.clientHeight;
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
        var count = Math.max(28, Math.min(60, Math.round((W * H) / 24000)));
        nodes = [];
        for (var i = 0; i < count; i++) {
          nodes.push({
            x: Math.random() * W,
            y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            r: 1.2 + Math.random() * 1.7,
            saff: Math.random() < 0.16
          });
        }
      }

      /* rect is cached and refreshed once per frame: reading it on every
         pointermove forces a layout flush mid-scroll, which stutters */
      var rect = { left: 0, top: 0 };
      var pointer = { x: -1e4, y: -1e4 };

      window.addEventListener('pointermove', function (e) {
        pointer.x = e.clientX; pointer.y = e.clientY;
      }, { passive: true });

      /* links are drawn in a handful of opacity buckets so the whole web is a
         few batched strokes per frame instead of one stroke() per pair */
      var BUCKETS = 5;
      var bucket = [];
      for (var b = 0; b < BUCKETS; b++) bucket.push([]);

      function tick() {
        requestAnimationFrame(tick);
        if (!running) return;
        rect = canvas.getBoundingClientRect();
        mouse.x = pointer.x - rect.left;
        mouse.y = pointer.y - rect.top;
        var dark = document.documentElement.classList.contains('theme-dark');
        var base = dark ? '168,176,255' : '6,3,141';
        var lineA = dark ? 0.15 : 0.09;
        ctx2d.clearRect(0, 0, W, H);

        var i, j, k, n, m, dx, dy, d2;
        for (i = 0; i < nodes.length; i++) {
          n = nodes[i];
          n.x += n.vx; n.y += n.vy;
          if (n.x < -20) n.x = W + 20; if (n.x > W + 20) n.x = -20;
          if (n.y < -20) n.y = H + 20; if (n.y > H + 20) n.y = -20;
          dx = n.x - mouse.x; dy = n.y - mouse.y; d2 = dx * dx + dy * dy;
          if (d2 < LINK2 && d2 > 1e-6) {
            var dm = Math.sqrt(d2);
            n.x += (dx / dm) * 0.6; n.y += (dy / dm) * 0.6;
          }
        }

        for (k = 0; k < BUCKETS; k++) bucket[k].length = 0;
        for (i = 0; i < nodes.length; i++) {
          n = nodes[i];
          for (j = i + 1; j < nodes.length; j++) {
            m = nodes[j];
            dx = n.x - m.x;
            if (dx > LINK || dx < -LINK) continue;
            dy = n.y - m.y;
            if (dy > LINK || dy < -LINK) continue;
            d2 = dx * dx + dy * dy;
            if (d2 >= LINK2) continue;
            k = (1 - Math.sqrt(d2) / LINK) * BUCKETS | 0;
            if (k > BUCKETS - 1) k = BUCKETS - 1;
            bucket[k].push(n.x, n.y, m.x, m.y);
          }
        }

        ctx2d.lineWidth = 1;
        for (k = 0; k < BUCKETS; k++) {
          var seg = bucket[k];
          if (!seg.length) continue;
          ctx2d.strokeStyle = 'rgba(' + base + ',' + (((k + 0.5) / BUCKETS) * lineA).toFixed(3) + ')';
          ctx2d.beginPath();
          for (i = 0; i < seg.length; i += 4) {
            ctx2d.moveTo(seg[i], seg[i + 1]);
            ctx2d.lineTo(seg[i + 2], seg[i + 3]);
          }
          ctx2d.stroke();
        }

        /* dots: two fill styles, so two batched paths */
        var plain = 'rgba(' + base + ',' + (dark ? 0.7 : 0.45) + ')';
        for (k = 0; k < 2; k++) {
          ctx2d.fillStyle = k ? 'rgba(255,103,31,0.85)' : plain;
          ctx2d.beginPath();
          for (i = 0; i < nodes.length; i++) {
            n = nodes[i];
            if (!!n.saff !== !!k) continue;
            ctx2d.moveTo(n.x + n.r, n.y);
            ctx2d.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          }
          ctx2d.fill();
        }
      }

      var visible = true, onscreen = true;
      function sync() { running = visible && onscreen; }

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          onscreen = entries[0].isIntersecting;
          sync();
        }).observe(canvas);
      }
      document.addEventListener('visibilitychange', function () {
        visible = !document.hidden;
        sync();
      });

      /* mobile browsers fire resize as the URL bar collapses; rebuilding the
         node field on every one of those is pure jank */
      var rt = null;
      window.addEventListener('resize', function () {
        clearTimeout(rt);
        rt = setTimeout(resize, 180);
      });

      resize();
      requestAnimationFrame(tick);
    })();

    /* --- is / is-not strike-through --- */
    if (hasST && !reduced) {
      qa('[data-strike]').forEach(function (item, i) {
        var strike = q('.strike', item);
        ScrollTrigger.create({
          trigger: item,
          start: 'top 86%',
          once: true,
          onEnter: function () {
            gsap.to(strike, { scaleX: 1, duration: 0.65, ease: 'power3.inOut', delay: 0.1 + i * 0.12 });
            gsap.to(item, { opacity: 0.5, duration: 0.5, delay: 0.45 + i * 0.12 });
          }
        });
      });
    }

    /* --- triguna: pinned, scrubbed --- */
    if (mm && !reduced) {
      mm.add(DESKTOP, function () {
        var pinEl = q('.triguna-pin');
        var svg = q('#trigunaSvg');
        if (!pinEl || !svg) return;
        document.documentElement.classList.add('tc-anim');

        var steps = qa('.triguna-step');
        var gunas = [q('.g-tamas', svg), q('.g-rajas', svg), q('.g-sattva', svg)];
        var edges = qa('.tri-edge', svg);
        var center = q('.tri-center', svg);
        var centerLabel = q('.tri-center-label', svg);

        edges.forEach(function (l) {
          var len = l.getTotalLength();
          l.style.strokeDasharray = len;
          l.style.strokeDashoffset = len;
        });
        gsap.set(gunas, { opacity: 0.22, scale: 0.92, transformOrigin: '50% 50%' });
        gsap.set([center, centerLabel], { opacity: 0.3 });
        gsap.set(steps, { autoAlpha: 0, y: 26 });

        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: pinEl,
            start: 'top top',
            end: '+=2800',
            scrub: 0.35,
            pin: true,
            anticipatePin: 1
          },
          defaults: { ease: 'power2.inOut' }
        });

        [0, 1, 2].forEach(function (i) {
          addStepSegment(
            tl,
            steps[i],
            gsap.to(gunas[i], { opacity: 1, scale: 1.1, duration: 0.7, paused: false }),
            gsap.to(gunas[i], { opacity: 0.35, scale: 1, duration: 0.5, paused: false }),
            false
          );
        });

        /* triad finale */
        tl.to(gunas, { opacity: 1, scale: 1, duration: 0.8 });
        tl.to(edges, { strokeDashoffset: 0, duration: 0.9, stagger: 0.15 }, '<');
        tl.to([center, centerLabel], { opacity: 1, duration: 0.5 }, '-=0.4');
        tl.fromTo(center, { scale: 1, transformOrigin: '50% 50%' }, { scale: 1.35, duration: 0.35 });
        tl.to(center, { scale: 1, duration: 0.35 });
        tl.to(steps[3], { autoAlpha: 1, y: 0, duration: 0.6 }, '-=0.8');
        tl.to({}, { duration: 0.8 });

        return function () { document.documentElement.classList.remove('tc-anim'); };
      });
    }
  }

  /* ============================================================
     architecture — the machine
     ============================================================ */

  if (page === 'architecture') {

    /* --- marching arcs (ambient) --- */
    if (hasGSAP && !reduced) {
      gsap.to('.loop-arc', { strokeDashoffset: -140, duration: 12, ease: 'none', repeat: -1 });
    }

    /* --- control loop: pinned, scrubbed --- */
    if (mm && !reduced) {
      mm.add(DESKTOP, function () {
        var pinEl = q('.loop-pin');
        var svg = q('#loopSvg');
        if (!pinEl || !svg) return;
        document.documentElement.classList.add('tc-anim');

        var steps = qa('.loop-step');
        var nodes = [q('.node-1', svg), q('.node-2', svg), q('.node-3', svg), q('.node-4', svg)];
        var arcs = [q('.arc-1', svg), q('.arc-2', svg), q('.arc-3', svg), q('.arc-4', svg)];
        var critic = q('.loop-critic', svg);
        var criticLines = q('.critic-lines', svg);

        var circles = nodes.map(function (n) { return q('circle', n); });
        gsap.set(steps, { autoAlpha: 0, y: 26 });

        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: pinEl,
            start: 'top top',
            end: '+=3400',
            scrub: 0.35,
            pin: true,
            anticipatePin: 1
          },
          defaults: { ease: 'power2.inOut' }
        });

        function activateNode(i) {
          var seg = gsap.timeline();
          seg.to(circles[i], { stroke: '#FF671F', strokeWidth: 3.5, duration: 0.5 }, 0);
          seg.to(arcs[i], { opacity: 0.9, stroke: '#FF671F', duration: 0.5 }, 0);
          return seg;
        }
        function deactivateNode(i) {
          var seg = gsap.timeline();
          seg.to(circles[i], { stroke: '#046A38', strokeWidth: 2.5, duration: 0.4 }, 0);
          seg.to(arcs[i], { opacity: 0.35, stroke: '#8a857b', duration: 0.4 }, 0);
          return seg;
        }

        [0, 1, 2, 3].forEach(function (i) {
          addStepSegment(tl, steps[i], activateNode(i), deactivateNode(i), false);
        });

        /* critic finale */
        var criticSeg = gsap.timeline();
        criticSeg.to(critic, { opacity: 1, duration: 0.6 }, 0);
        criticSeg.to(criticLines, { opacity: 0.8, duration: 0.6 }, 0.1);
        criticSeg.to(circles, { stroke: '#046A38', duration: 0.5 }, 0);
        addStepSegment(tl, steps[4], criticSeg, gsap.timeline(), true);
        tl.to({}, { duration: 0.6 });

        return function () { document.documentElement.classList.remove('tc-anim'); };
      });
    }

    /* --- critic typewriter --- */
    var typeEl = q('#criticType');
    if (typeEl) {
      var full = '…and then what happens?';
      if (reduced || !hasST) {
        typeEl.textContent = full;
      } else {
        ScrollTrigger.create({
          trigger: typeEl,
          start: 'top 85%',
          once: true,
          onEnter: function () {
            var i = 0;
            var iv = setInterval(function () {
              typeEl.textContent = full.slice(0, ++i);
              if (i >= full.length) clearInterval(iv);
            }, 55);
          }
        });
      }
    }

    /* --- override meter --- */
    var fills = qa('.om-fill');
    if (fills.length) {
      if (reduced || !hasST) {
        fills.forEach(function (f) { f.style.transform = 'scaleX(1)'; });
      } else {
        ScrollTrigger.create({
          trigger: '.override-meter',
          start: 'top 82%',
          once: true,
          onEnter: function () {
            gsap.to(fills, { scaleX: 1, duration: 1.1, stagger: 0.25, ease: 'power3.out' });
          }
        });
      }
    }
  }

  /* ============================================================
     pillars — horizontal scroll
     ============================================================ */

  if (page === 'pillars') {
    var glyphs = qa('.p-glyph');

    if (mm && !reduced) {
      mm.add(DESKTOP, function () {
        var pinSec = q('.pillars-pin');
        var track = q('.pillar-track');
        if (!pinSec || !track) return;
        var ppFill = q('.pp-fill');
        var ppCurrent = q('.pp-current');
        var total = qa('.pillar-panel', track).length;

        function amt() { return Math.max(0, track.scrollWidth - window.innerWidth); }

        var tween = gsap.to(track, {
          x: function () { return -amt(); },
          ease: 'none',
          scrollTrigger: {
            trigger: pinSec,
            start: 'top top',
            end: function () { return '+=' + amt(); },
            scrub: 0.35,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: function (self) {
              if (ppFill) ppFill.style.transform = 'scaleX(' + self.progress + ')';
              if (ppCurrent) {
                var idx = Math.min(total, 1 + Math.floor(self.progress * (total - 0.001)));
                ppCurrent.textContent = (idx < 10 ? '0' : '') + idx;
              }
            }
          }
        });

        glyphs.forEach(function (svg) {
          var strokes = prepareStrokes(svg);
          ScrollTrigger.create({
            trigger: svg,
            containerAnimation: tween,
            start: 'left 78%',
            once: true,
            onEnter: function () {
              gsap.to(strokes, { strokeDashoffset: 0, duration: 1.1, stagger: 0.09, ease: 'power2.inOut' });
            }
          });
        });
      });

      mm.add(MOBILE, function () {
        glyphs.forEach(function (svg) {
          var strokes = prepareStrokes(svg);
          ScrollTrigger.create({
            trigger: svg,
            start: 'top 85%',
            once: true,
            onEnter: function () {
              gsap.to(strokes, { strokeDashoffset: 0, duration: 1.1, stagger: 0.09, ease: 'power2.inOut' });
            }
          });
        });
      });
    }
  }

  /* ============================================================
     integrity — locks & the die
     ============================================================ */

  if (page === 'integrity') {
    var mechs = qa('[data-mech]');
    if (reduced || !hasST) {
      mechs.forEach(function (c) { c.classList.add('is-locked'); });
    } else if (mechs.length) {
      gsap.set(mechs, { autoAlpha: 0, y: 34 });
      ScrollTrigger.batch(mechs, {
        start: 'top 84%',
        once: true,
        onEnter: function (batch) {
          gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.85, stagger: 0.12, ease: 'power3.out' });
          batch.forEach(function (c, i) {
            setTimeout(function () { c.classList.add('is-locked'); }, 550 + i * 160);
          });
        }
      });
    }

    var die = q('#mechDie');
    if (die) {
      var faces = {
        1: [4], 2: [0, 8], 3: [0, 4, 8],
        4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]
      };
      var dots = qa('i', die);
      function showFace(f) {
        dots.forEach(function (d, i) { d.classList.toggle('on', faces[f].indexOf(i) >= 0); });
      }
      showFace(5);
      if (!reduced && 'IntersectionObserver' in window) {
        var iv = null;
        new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting && !iv) {
            iv = setInterval(function () { showFace(1 + Math.floor(Math.random() * 6)); }, 650);
          } else if (!entries[0].isIntersecting && iv) {
            clearInterval(iv); iv = null;
          }
        }).observe(die);
      }
    }
  }

  /* ============================================================
     roadmap — the self-drawing timeline
     ============================================================ */

  if (page === 'roadmap') {
    var tlFill = q('.tl-fill');
    var phases = qa('[data-phase]');

    if (reduced || !hasST) {
      if (tlFill) tlFill.style.transform = 'scaleY(1)';
      phases.forEach(function (p) { p.classList.add('is-lit'); });
    } else {
      if (tlFill) {
        gsap.to(tlFill, {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: '.timeline', start: 'top 72%', end: 'bottom 58%', scrub: 0.5 }
        });
      }
      phases.forEach(function (ph) {
        var sun = q('.phase-sun', ph);
        var card = q('.phase-card', ph);
        var strokes = sun ? prepareStrokes(sun) : [];
        if (card) gsap.set(card, { autoAlpha: 0, x: -24 });
        ScrollTrigger.create({
          trigger: ph,
          start: 'top 68%',
          once: true,
          onEnter: function () {
            ph.classList.add('is-lit');
            if (card) gsap.to(card, { autoAlpha: 1, x: 0, duration: 0.8, ease: 'power3.out' });
            if (strokes.length) gsap.to(strokes, { strokeDashoffset: 0, duration: 1.2, stagger: 0.06, ease: 'power2.inOut' });
          }
        });
      });
    }
  }
})();
