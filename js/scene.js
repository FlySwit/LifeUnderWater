(function () {
  var canvas = document.getElementById('bgCanvas');
  if (!canvas || typeof THREE === 'undefined') return;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (e) {
    return; // No WebGL: the CSS sky + gradient backdrop stays visible on its own.
  }

  function getSize(){ return { w: window.innerWidth, h: window.innerHeight }; }
  var size = getSize();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(size.w, size.h, false);
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var FOG_SHALLOW = 0x14294f;
  var FOG_ABYSS = 0x02030a;
  var fog = new THREE.FogExp2(FOG_SHALLOW, 0.05);
  scene.fog = fog;

  var camera = new THREE.PerspectiveCamera(45, size.w / size.h, 0.1, 100);
  camera.position.set(0, 0.6, 9);
  var camLookAt = new THREE.Vector3(0, 0.2, 0);
  camera.lookAt(camLookAt);

  var ambient = new THREE.AmbientLight(0x8fb4ff, 0.6);
  scene.add(ambient);
  var key = new THREE.DirectionalLight(0xbdf5ff, 1.1);
  key.position.set(4, 6, 5);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0xc77dff, 0.45);
  rim.position.set(-5, 2, -4);
  scene.add(rim);

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------
  function smoothstep(edge0, edge1, x){
    var t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }
  function depthWindow(pct, center, halfWidth){
    var d = Math.abs(pct - center);
    if (d >= halfWidth) return 0;
    return 1 - smoothstep(0, halfWidth, d);
  }
  function lerp(a, b, t){ return a + (b - a) * t; }
  function lerpColorHex(c1, c2, t){
    var r1=(c1>>16)&255, g1=(c1>>8)&255, b1=c1&255;
    var r2=(c2>>16)&255, g2=(c2>>8)&255, b2=c2&255;
    var r = Math.round(lerp(r1,r2,t)), g = Math.round(lerp(g1,g2,t)), b = Math.round(lerp(b1,b2,t));
    return (r<<16)|(g<<8)|b;
  }
  function setGroupOpacity(group, opacity){
    group.traverse(function(obj){
      if (obj.isMesh && obj.material){
        obj.material.transparent = true;
        obj.material.opacity = opacity;
      }
    });
  }

  function getScrollProgress(){
    var doc = document.documentElement;
    var scrollable = doc.scrollHeight - window.innerHeight;
    return scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
  }

  // ---------------------------------------------------------------
  // Marine snow (gives the continuous "sinking" feeling on scroll)
  // ---------------------------------------------------------------
  var SNOW_COUNT = 240;
  var snowGeo = new THREE.BufferGeometry();
  var snowPositions = new Float32Array(SNOW_COUNT * 3);
  var snowSpeeds = new Float32Array(SNOW_COUNT);
  for (var i = 0; i < SNOW_COUNT; i++){
    snowPositions[i*3]   = (Math.random() - 0.5) * 16;
    snowPositions[i*3+1] = Math.random() * 12 - 5;
    snowPositions[i*3+2] = (Math.random() - 0.5) * 11 - 2;
    snowSpeeds[i] = 0.12 + Math.random() * 0.3;
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
  var snowMat = new THREE.PointsMaterial({ color: 0xbfe8ff, size: 0.045, transparent: true, opacity: 0.5, depthWrite: false });
  var snow = new THREE.Points(snowGeo, snowMat);
  scene.add(snow);

  var lastScrollY = window.scrollY;
  var scrollVelocity = 0;
  window.addEventListener('scroll', function(){
    var now = window.scrollY;
    scrollVelocity += (now - lastScrollY) * 0.03;
    lastScrollY = now;
  }, { passive: true });

  function updateSnow(dt){
    var boost = Math.min(Math.abs(scrollVelocity), 3);
    var posAttr = snowGeo.attributes.position;
    for (var i = 0; i < SNOW_COUNT; i++){
      var idx = i*3 + 1;
      posAttr.array[idx] += (snowSpeeds[i] * 0.2 + snowSpeeds[i] * boost) * dt;
      if (posAttr.array[idx] > 7){
        posAttr.array[idx] -= 12;
      }
    }
    posAttr.needsUpdate = true;
    scrollVelocity *= 0.9;
  }

  // ---------------------------------------------------------------
  // Coral / moss garden — shallow-zone set dressing (not a "species")
  // ---------------------------------------------------------------
  var coralGroup = new THREE.Group();
  var coralPalette = [0x1f6f63, 0x2a8f7a, 0x35a68e, 0x184a42];
  var glowPalette = [0x4dedd4, 0xc77dff];

  function makeCoralClump(x, y, z, scale, colorIdx){
    var detail = Math.random() > 0.5 ? 1 : 0;
    var geo = new THREE.IcosahedronGeometry(1, detail);
    var mat = new THREE.MeshStandardMaterial({
      color: coralPalette[colorIdx % coralPalette.length],
      flatShading: true, roughness: 0.8, metalness: 0.05
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(scale, scale * (0.8 + Math.random()*0.5), scale);
    mesh.rotation.y = Math.random() * Math.PI;
    return mesh;
  }
  var clumpPositions = [
    [-3.4,-2.1,-1,1.1,0], [-2.1,-2.3,0.6,0.7,1], [-0.6,-2.4,-0.4,0.9,2],
    [1.1,-2.3,0.8,0.65,1], [2.6,-2.2,-0.6,1.0,3], [3.6,-2.4,0.4,0.6,0]
  ];
  clumpPositions.forEach(function(p){ coralGroup.add(makeCoralClump(p[0],p[1],p[2],p[3],p[4])); });

  var noduleGeo = new THREE.IcosahedronGeometry(0.09, 0);
  for (var n = 0; n < 14; n++){
    var nmat = new THREE.MeshStandardMaterial({
      color: glowPalette[n % 2], emissive: glowPalette[n % 2], emissiveIntensity: 0.9, flatShading: true
    });
    var nodule = new THREE.Mesh(noduleGeo, nmat);
    var base = clumpPositions[n % clumpPositions.length];
    nodule.position.set(base[0] + (Math.random()-0.5)*1.2, base[1] + 0.6 + Math.random()*0.6, base[2] + (Math.random()-0.5)*1.2);
    coralGroup.add(nodule);
  }
  scene.add(coralGroup);

  // ---------------------------------------------------------------
  // Species 1 — Medusa luminiscente (bioluminescent jelly bloom)
  // ---------------------------------------------------------------
  var jellyGroup = new THREE.Group();
  function makeJelly(x, y, z, scale, phase){
    var g = new THREE.Group();
    var bellGeo = new THREE.IcosahedronGeometry(0.5, 1);
    var bellMat = new THREE.MeshStandardMaterial({ color: 0x4dedd4, emissive: 0x1f6b60, emissiveIntensity: 0.5, flatShading: true, roughness: 0.5 });
    var bell = new THREE.Mesh(bellGeo, bellMat);
    bell.scale.set(1, 0.6, 1);
    g.add(bell);
    for (var t = 0; t < 5; t++){
      var tGeo = new THREE.CylinderGeometry(0.02, 0.015, 1.1, 4);
      var tMat = new THREE.MeshStandardMaterial({ color: 0x4dedd4, transparent: true, opacity: 0.5, flatShading: true });
      var tent = new THREE.Mesh(tGeo, tMat);
      var a = (t / 5) * Math.PI * 2;
      tent.position.set(Math.cos(a)*0.25, -0.75, Math.sin(a)*0.25);
      tent.name = 'tentacle';
      g.add(tent);
    }
    g.position.set(x, y, z);
    g.scale.set(scale, scale, scale);
    g.userData.phase = phase;
    return g;
  }
  var jellyDefs = [ [-2.4,3.2,-1.5,0.9,0], [-0.4,2.6,0.4,0.65,1.4], [2.1,3.5,-0.8,0.8,2.7] ];
  jellyDefs.forEach(function(p){ jellyGroup.add(makeJelly(p[0],p[1],p[2],p[3],p[4])); });
  scene.add(jellyGroup);

  // ---------------------------------------------------------------
  // Species 2 — Deslizador coralino (the one that slides across and
  // passes close to the camera, in front of the coral garden)
  // ---------------------------------------------------------------
  var glider = new THREE.Group();
  var bodyGeo = new THREE.IcosahedronGeometry(1, 1);
  var bodyMat = new THREE.MeshStandardMaterial({ color: 0xd58cff, emissive: 0x6c2f99, emissiveIntensity: 0.25, flatShading: true, roughness: 0.5, metalness: 0.1 });
  var body = new THREE.Mesh(bodyGeo, bodyMat);
  body.scale.set(1.15, 0.62, 0.62);
  glider.add(body);
  var tailGeo = new THREE.ConeGeometry(0.55, 1.3, 5);
  var tailMat = new THREE.MeshStandardMaterial({ color: 0xa855e8, flatShading: true, roughness: 0.6 });
  var tail = new THREE.Mesh(tailGeo, tailMat);
  tail.rotation.z = Math.PI / 2;
  tail.position.set(-1.35, 0, 0);
  tail.name = 'tail';
  glider.add(tail);
  var finGeo = new THREE.ConeGeometry(0.4, 0.9, 4);
  var finMat = new THREE.MeshStandardMaterial({ color: 0x4dedd4, flatShading: true, roughness: 0.6, transparent: true, opacity: 0.85 });
  var finTop = new THREE.Mesh(finGeo, finMat);
  finTop.position.set(0.1, 0.55, 0);
  finTop.rotation.z = Math.PI;
  glider.add(finTop);
  var eyeGeo = new THREE.IcosahedronGeometry(0.09, 0);
  var eyeMat = new THREE.MeshStandardMaterial({ color: 0x0a0612, emissive: 0x4dedd4, emissiveIntensity: 1.2 });
  var eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(0.85, 0.18, 0.32);
  glider.add(eyeL);
  var eyeR = eyeL.clone();
  eyeR.position.z = -0.32;
  glider.add(eyeR);
  glider.scale.set(0.6, 0.6, 0.6);
  scene.add(glider);

  // ---------------------------------------------------------------
  // Species 3 — Manta abisal (wide slow glider)
  // ---------------------------------------------------------------
  var manta = new THREE.Group();
  var wingGeo = new THREE.IcosahedronGeometry(1, 1);
  var wingMat = new THREE.MeshStandardMaterial({ color: 0x7c93ff, emissive: 0x2b3580, emissiveIntensity: 0.3, flatShading: true, roughness: 0.55 });
  var wing = new THREE.Mesh(wingGeo, wingMat);
  wing.scale.set(2.1, 0.16, 1.3);
  manta.add(wing);
  var mantaTailGeo = new THREE.ConeGeometry(0.08, 1.2, 4);
  var mantaTail = new THREE.Mesh(mantaTailGeo, wingMat);
  mantaTail.rotation.z = Math.PI / 2;
  mantaTail.position.set(-1.9, 0, 0);
  manta.add(mantaTail);
  scene.add(manta);

  // ---------------------------------------------------------------
  // Species 4 — Farolero de las profundidades (abyssal angler)
  // ---------------------------------------------------------------
  var angler = new THREE.Group();
  var anglerBodyGeo = new THREE.IcosahedronGeometry(1, 1);
  var anglerBodyMat = new THREE.MeshStandardMaterial({ color: 0x120a1e, flatShading: true, roughness: 0.9 });
  var anglerBody = new THREE.Mesh(anglerBodyGeo, anglerBodyMat);
  anglerBody.scale.set(1, 0.65, 0.7);
  angler.add(anglerBody);
  var antennaGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.9, 4);
  var antennaMat = new THREE.MeshStandardMaterial({ color: 0x2a1c3a, flatShading: true });
  var antenna = new THREE.Mesh(antennaGeo, antennaMat);
  antenna.position.set(0.7, 0.85, 0);
  antenna.rotation.z = -0.3;
  angler.add(antenna);
  var lureGeo = new THREE.IcosahedronGeometry(0.11, 0);
  var lureMat = new THREE.MeshStandardMaterial({ color: 0xff7a59, emissive: 0xff7a59, emissiveIntensity: 1.4 });
  var lure = new THREE.Mesh(lureGeo, lureMat);
  lure.position.set(0.95, 1.25, 0);
  lure.name = 'lure';
  angler.add(lure);
  scene.add(angler);

  // ---------------------------------------------------------------
  // Per-frame update
  // ---------------------------------------------------------------
  var clock = new THREE.Clock();
  var mouse = { x: 0, y: 0 };
  window.addEventListener('mousemove', function(e){
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  function updateGlider(t){
    var duration = 16;
    var p = (t % duration) / duration;
    var angle = p * Math.PI * 2;
    var x = Math.sin(angle) * 4.2;
    var z = Math.cos(angle * 2) * 2.6 - 1.2;
    var y = 0.2 + Math.sin(angle * 2) * 0.4;
    glider.position.set(x, y, z);
    var dx = Math.cos(angle) * 4.2;
    var dz = -Math.sin(angle * 2) * 5.2;
    glider.rotation.y = Math.atan2(dx, dz);
    glider.rotation.z = Math.sin(angle * 3) * 0.12;
    var tailMesh = glider.getObjectByName('tail');
    if (tailMesh) tailMesh.rotation.y = Math.sin(t * 6) * 0.4;
  }

  function updateJellies(t){
    jellyGroup.children.forEach(function(j){
      var phase = j.userData.phase || 0;
      j.position.y += Math.sin(t * 0.6 + phase) * 0.0009;
      j.rotation.y = Math.sin(t * 0.3 + phase) * 0.3;
      j.children.forEach(function(part){
        if (part.name === 'tentacle') part.rotation.z = Math.sin(t * 1.5 + phase) * 0.25;
      });
    });
  }

  function updateManta(t){
    manta.position.x = Math.sin(t * 0.12) * 3.5;
    manta.position.y = -0.4 + Math.sin(t * 0.2) * 0.3;
    manta.position.z = Math.cos(t * 0.09) * 1.5 - 1;
    manta.rotation.z = Math.sin(t * 0.5) * 0.15;
    manta.rotation.y = Math.cos(t * 0.12) * 0.4;
  }

  function updateAngler(t){
    angler.position.x = Math.sin(t * 0.05) * 1.2;
    angler.position.y = -1.6 + Math.sin(t * 0.2) * 0.15;
    angler.position.z = -1 + Math.cos(t * 0.05) * 0.6;
    var lureMesh = angler.getObjectByName('lure');
    if (lureMesh) lureMesh.material.emissiveIntensity = 1 + Math.sin(t * 2.2) * 0.6;
  }

  function updateDepthVisuals(pct){
    var fogColor = lerpColorHex(FOG_SHALLOW, FOG_ABYSS, pct);
    fog.color.setHex(fogColor);
    fog.density = lerp(0.05, 0.09, pct);
    key.intensity = lerp(1.1, 0.2, pct);
    ambient.intensity = lerp(0.6, 0.12, pct);
    rim.intensity = lerp(0.45, 0.15, pct);

    setGroupOpacity(coralGroup, depthWindow(pct, 0.06, 0.22));
    setGroupOpacity(jellyGroup, depthWindow(pct, 0.06, 0.28));
    setGroupOpacity(glider, depthWindow(pct, 0.32, 0.32));
    setGroupOpacity(manta, depthWindow(pct, 0.62, 0.32));
    setGroupOpacity(angler, depthWindow(pct, 0.9, 0.28));
  }

  function render(){
    var t = clock.getElapsedTime();
    var dt = Math.min(clock.getDelta(), 0.05);
    var pct = getScrollProgress();

    updateDepthVisuals(pct);
    updateSnow(dt);
    updateGlider(t);
    updateJellies(t);
    updateManta(t);
    updateAngler(t);

    coralGroup.children.forEach(function(c, i){ c.rotation.y += 0.0006 * (i % 2 === 0 ? 1 : -1); });

    camera.position.x += (mouse.x * 0.5 - camera.position.x) * 0.02;
    camera.position.y += (0.6 - mouse.y * 0.25 - camera.position.y) * 0.02;
    camera.lookAt(camLookAt);

    renderer.render(scene, camera);
    if (!prefersReducedMotion) requestAnimationFrame(render);
  }

  function renderStatic(){
    // One settled frame per scroll tick — no continuous animation loop.
    var pct = getScrollProgress();
    updateDepthVisuals(pct);
    updateGlider(2);
    updateJellies(2);
    updateManta(2);
    updateAngler(2);
    camera.lookAt(camLookAt);
    renderer.render(scene, camera);
  }

  function handleResize(){
    size = getSize();
    if (size.w === 0 || size.h === 0) return;
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
    renderer.setSize(size.w, size.h, false);
    if (prefersReducedMotion) renderStatic();
  }
  window.addEventListener('resize', handleResize);

  if (prefersReducedMotion){
    renderStatic();
    window.addEventListener('scroll', function(){
      requestAnimationFrame(renderStatic);
    }, { passive: true });
  } else {
    render();
  }
})();
