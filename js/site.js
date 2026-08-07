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
