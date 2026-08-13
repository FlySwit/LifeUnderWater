(function () {
  var depthValue = document.getElementById('depthValue');
  var bgSky = document.getElementById('bgSky');
  var maxDepth = 500;
  var ticking = false;

  // Preloader: progreso animado + espera de carga real (con mínimo y máximo)
  (function initPreloader(){
    var fill = document.getElementById('preloaderFill');
    var MIN_MS = 1300, MAX_MS = 4500;
    var start = Date.now();
    var pct = 0;
    var pageLoaded = false;
    var finished = false;

    var tick = window.setInterval(function(){
      // avanza rápido al inicio y se frena cerca del final, esperando la carga real
      var target = pageLoaded ? 100 : 88;
      pct += (target - pct) * 0.12 + 0.3;
      if (pct > target) pct = target;
      if (fill) fill.style.width = pct.toFixed(1) + '%';
    }, 90);

    function finish(){
      if (finished) return;
      finished = true;
      window.clearInterval(tick);
      if (fill) fill.style.width = '100%';
      window.setTimeout(function(){
        document.body.classList.remove('is-loading');
      }, 220);
    }

    window.addEventListener('load', function(){
      pageLoaded = true;
      var elapsed = Date.now() - start;
      var wait = Math.max(0, MIN_MS - elapsed);
      window.setTimeout(finish, wait);
    });

    // failsafe: nunca dejar al usuario atrapado en la pantalla de carga
    window.setTimeout(finish, MAX_MS);
  })();

  function getScrollProgress(){
    var doc = document.documentElement;
    var scrollable = doc.scrollHeight - window.innerHeight;
    return scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
  }

  function smoothstep(edge0, edge1, x){
    var t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function updateChrome(){
    var pct = getScrollProgress();
    var depth = Math.round(pct * maxDepth);
    if (depthValue) depthValue.textContent = '-' + String(depth).padStart(3, '0') + ' m';
    if (bgSky) bgSky.style.opacity = String(1 - smoothstep(0, 0.14, pct));
    ticking = false;
  }
  window.addEventListener('scroll', function(){
    if (!ticking){ requestAnimationFrame(updateChrome); ticking = true; }
  }, { passive: true });
  updateChrome();

  // Smooth anchor scrolling
  document.querySelectorAll('[data-scroll]').forEach(function(link){
    link.addEventListener('click', function(e){
      var target = document.querySelector(link.getAttribute('href'));
      if (target){
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Reveal on scroll
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('is-visible'); });
  }

  // Studio credit: tilt del logo + spotlight que sigue el cursor
  var studioInner = document.getElementById('studioInner');
  var studioLogoWrap = document.getElementById('studioLogoWrap');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (studioInner && studioLogoWrap && !reducedMotion){
    studioInner.addEventListener('pointermove', function(e){
      var rect = studioInner.getBoundingClientRect();
      var xPct = ((e.clientX - rect.left) / rect.width) * 100;
      var yPct = ((e.clientY - rect.top) / rect.height) * 100;
      studioInner.style.setProperty('--mx', xPct + '%');
      studioInner.style.setProperty('--my', yPct + '%');

      var logoRect = studioLogoWrap.getBoundingClientRect();
      var cx = logoRect.left + logoRect.width / 2;
      var cy = logoRect.top + logoRect.height / 2;
      var dx = (e.clientX - cx) / (logoRect.width / 2);
      var dy = (e.clientY - cy) / (logoRect.height / 2);
      dx = Math.max(-1, Math.min(1, dx));
      dy = Math.max(-1, Math.min(1, dy));
      var rotateY = dx * 18;
      var rotateX = dy * -18;
      studioLogoWrap.style.transform = 'perspective(600px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale(1.06)';
    });
    studioInner.addEventListener('pointerleave', function(){
      studioLogoWrap.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)';
    });
  }

  // ---------- Liquid glass: tilt de puntero + brillo especular ----------
  // Se aplica a cualquier tarjeta de vidrio: tráiler, fotos y equipo.
  var tiltEls = document.querySelectorAll('[data-tilt]');
  if (!reducedMotion){
    tiltEls.forEach(function(inner){
      var panel = inner; // el propio .glass-panel
      inner.addEventListener('pointermove', function(e){
        var rect = inner.getBoundingClientRect();
        var xPct = ((e.clientX - rect.left) / rect.width) * 100;
        var yPct = ((e.clientY - rect.top) / rect.height) * 100;
        panel.style.setProperty('--mx', xPct + '%');
        panel.style.setProperty('--my', yPct + '%');

        var dx = (xPct - 50) / 50;
        var dy = (yPct - 50) / 50;
        dx = Math.max(-1, Math.min(1, dx));
        dy = Math.max(-1, Math.min(1, dy));
        inner.style.setProperty('--ry', (dx * 7) + 'deg');
        inner.style.setProperty('--rx', (dy * -7) + 'deg');
        inner.style.setProperty('--tscale', '1.015');
      });
      inner.addEventListener('pointerleave', function(){
        inner.style.setProperty('--rx', '0deg');
        inner.style.setProperty('--ry', '0deg');
        inner.style.setProperty('--tscale', '1');
      });
    });
  }

  // ---------- Parallax de scroll para tráiler, fotos y tarjetas del equipo ----------
  var depthEls = Array.prototype.slice.call(document.querySelectorAll('[data-depth]'));
  var parallaxTicking = false;
  function updateParallaxDepths(){
    if (!reducedMotion && depthEls.length){
      var vh = window.innerHeight;
      depthEls.forEach(function(el){
        var depth = parseFloat(el.getAttribute('data-depth')) || 0;
        var rect = el.getBoundingClientRect();
        var center = rect.top + rect.height / 2;
        var offset = (vh / 2 - center) * depth;
        offset = Math.max(-70, Math.min(70, offset));
        el.style.setProperty('--parallax-y', offset.toFixed(1) + 'px');
      });
    }
    parallaxTicking = false;
  }
  if (depthEls.length){
    window.addEventListener('scroll', function(){
      if (!parallaxTicking){ requestAnimationFrame(updateParallaxDepths); parallaxTicking = true; }
    }, { passive: true });
    window.addEventListener('resize', updateParallaxDepths);
    updateParallaxDepths();
  }

  // ---------- Tráiler: reproducir/pausar ----------
  var trailerVideo = document.getElementById('trailerVideo');
  var trailerPlay = document.getElementById('trailerPlay');
  var trailerFrame = document.getElementById('trailerFrame');
  if (trailerVideo && trailerPlay && trailerFrame){
    trailerPlay.addEventListener('click', function(){
      trailerVideo.muted = false;
      trailerVideo.controls = true;
      trailerFrame.classList.add('is-playing');
      trailerVideo.play().catch(function(){});
    });
    trailerVideo.addEventListener('pause', function(){
      trailerFrame.classList.remove('is-playing');
    });
    trailerVideo.addEventListener('ended', function(){
      trailerFrame.classList.remove('is-playing');
      trailerVideo.controls = false;
      trailerVideo.currentTime = 0;
    });
    if ('IntersectionObserver' in window){
      var trailerIo = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (!entry.isIntersecting && !trailerVideo.paused){ trailerVideo.pause(); }
        });
      }, { threshold: 0.15 });
      trailerIo.observe(trailerFrame);
    }
  }

  // ---------- Carrusel de fotos: auto-avance, flechas, puntos y swipe ----------
  (function initShotCarousel(){
    var track = document.getElementById('shotTrack');
    var viewport = document.getElementById('shotViewport');
    var dotsWrap = document.getElementById('shotDots');
    var prevBtn = document.getElementById('shotPrev');
    var nextBtn = document.getElementById('shotNext');
    if (!track || !viewport) return;

    var slides = Array.prototype.slice.call(track.children);
    var index = 0;
    var AUTO_MS = 4500;
    var timer = null;

    slides.forEach(function(_, i){
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', 'Imagen ' + (i + 1));
      if (i === 0) dot.classList.add('is-active');
      dot.addEventListener('click', function(){ goTo(i); restartAuto(); });
      dotsWrap.appendChild(dot);
    });
    var dots = Array.prototype.slice.call(dotsWrap.children);

    function render(){
      track.style.transform = 'translateX(-' + (index * 100) + '%)';
      dots.forEach(function(d, i){ d.classList.toggle('is-active', i === index); });
    }
    function goTo(i){
      index = (i + slides.length) % slides.length;
      render();
    }
    function next(){ goTo(index + 1); }
    function prev(){ goTo(index - 1); }

    function startAuto(){
      if (reducedMotion) return;
      stopAuto();
      timer = window.setInterval(next, AUTO_MS);
    }
    function stopAuto(){
      if (timer){ window.clearInterval(timer); timer = null; }
    }
    function restartAuto(){ startAuto(); }

    if (nextBtn) nextBtn.addEventListener('click', function(){ next(); restartAuto(); });
    if (prevBtn) prevBtn.addEventListener('click', function(){ prev(); restartAuto(); });
    viewport.addEventListener('pointerenter', stopAuto);
    viewport.addEventListener('pointerleave', startAuto);

    // Swipe táctil
    var touchStartX = null;
    viewport.addEventListener('touchstart', function(e){
      touchStartX = e.touches[0].clientX;
      stopAuto();
    }, { passive: true });
    viewport.addEventListener('touchend', function(e){
      if (touchStartX === null) return;
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40){ dx < 0 ? next() : prev(); }
      touchStartX = null;
      restartAuto();
    }, { passive: true });

    // Pausar cuando el carrusel no está visible en pantalla
    if ('IntersectionObserver' in window){
      var carouselEl = document.getElementById('shotCarousel');
      if (carouselEl){
        var shotIo = new IntersectionObserver(function(entries){
          entries.forEach(function(entry){
            entry.isIntersecting ? startAuto() : stopAuto();
          });
        }, { threshold: 0.2 });
        shotIo.observe(carouselEl);
      }
    } else {
      startAuto();
    }

    render();
  })();

  // Email form → Google Sheets (vía Google Apps Script)
  // 1) Sigue las instrucciones para crear tu Apps Script y publícalo como "Aplicación web".
  // 2) Pega aquí la URL que termina en /exec. Mientras esté vacía, el formulario funciona en modo demo.
  var SHEET_WEBHOOK_URL = 'https://script.google.com/u/0/home/projects/1flDRayYgk1233UFTe3w4-H2tVyaLuxCTJ_IlC64He7ua6BCI83Us8-eC/edit';

  var form = document.getElementById('emailForm');
  var note = document.getElementById('formNote');
  if (form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var input = document.getElementById('emailInput');
      var button = form.querySelector('button');
      if (!input.checkValidity()){ input.reportValidity(); return; }

      function showSuccess(){
        form.style.display = 'none';
        note.innerHTML = '<span class="form-success">¡Listo! Te escribiremos en cuanto zarpe.</span>';
      }

      if (!SHEET_WEBHOOK_URL){
        // Modo demo: todavía no configuraste la hoja de Google.
        showSuccess();
        note.innerHTML += '<span class="demo-note">Modo demostración — falta configurar SHEET_WEBHOOK_URL en js/site.js.</span>';
        return;
      }

      button.disabled = true;
      button.textContent = 'Enviando…';

      var body = new URLSearchParams({ email: input.value });

      fetch(SHEET_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors', // Apps Script no responde con headers CORS; no podemos leer la respuesta, pero el envío sí llega.
        body: body
      }).then(function(){
        showSuccess();
      }).catch(function(){
        button.disabled = false;
        button.textContent = 'Avisarme';
        note.textContent = 'Hubo un problema de conexión. Intenta de nuevo en unos segundos.';
      });
    });
  }
})();
