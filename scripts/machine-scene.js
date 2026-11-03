import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const host = document.getElementById('machine-viewer');
const status = document.getElementById('machine-status');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = matchMedia('(max-width: 800px)').matches;
let renderer, machine, frame, visible = true, suspended = false, dragging = false;
let velocity = 0, resumeAt = performance.now() + 2500, previous = performance.now();
const clock = { value: 0 };

async function start() {
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.65 : 2));
  renderer.setClearColor(0x04272c, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.transmissionResolutionScale = mobile ? .65 : 1;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#04272c');
  const camera = new THREE.PerspectiveCamera(31, 1, .05, 30);
  camera.position.set(0, .17, 3.1);
  camera.lookAt(0, -.035, 0);
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(environment, .03);
  scene.environment = env.texture;
  scene.environmentIntensity = .75;
  environment.dispose();
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xfff1df, 3.4);
  key.position.set(-2, 3, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -1.5;
  key.shadow.camera.right = key.shadow.camera.top = 1.5;
  key.shadow.camera.near = .5; key.shadow.camera.far = 10;
  key.shadow.normalBias = .015; key.shadow.bias = -.0002;
  key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb7e4ec, 2.3);
  rim.position.set(2, 1.7, -2); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xe1f1f3, .9);
  fill.position.set(2, .3, 3); scene.add(fill);
  const contactCanvas = document.createElement('canvas'); contactCanvas.width = contactCanvas.height = 128;
  const contact = contactCanvas.getContext('2d');
  const gradient = contact.createRadialGradient(64, 64, 10, 64, 64, 64);
  gradient.addColorStop(0, '#00000088'); gradient.addColorStop(1, '#00000000');
  contact.fillStyle = gradient; contact.fillRect(0, 0, 128, 128);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .85), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(contactCanvas),transparent:true,depthWrite:false}));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.787; scene.add(ground);

  const gltf = await new GLTFLoader().loadAsync('/assets/quickgo-machine-complete.glb?v=complete-10');
  machine = gltf.scene;
  machine.name = 'Integrated Quick GO machine, cup and dispensing flow';
  machine.rotation.y = -.29;
  scene.add(machine);
  const splashes = [];
  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = grainCanvas.height = 128;
  const ctx = grainCanvas.getContext('2d');
  const grainImage = ctx.createImageData(128, 128);
  let seed = 41;
  for (let i = 0; i < grainImage.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const n = 112 + (seed % 32);
    grainImage.data.set([n, n, n, 255], i);
  }
  ctx.putImageData(grainImage, 0, 0);
  const grain = new THREE.CanvasTexture(grainCanvas);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(28, 28);

  machine.traverse(object => {
    if (!object.isMesh) return;
    const material = object.material;
    object.castShadow = !['Crystal tumbler', 'Clear melting ice', 'Glass condensation'].includes(material.name);
    object.receiveShadow = material.name.includes('black') || material.name.includes('graphite');
    if (!object.geometry.getAttribute('uv')) {
      const pos = object.geometry.getAttribute('position');
      const uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) { uv[i*2] = pos.getX(i) + pos.getZ(i); uv[i*2+1] = pos.getY(i); }
      object.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    if (material.name === 'Powder coated black metal') {
      object.material = new THREE.MeshPhysicalMaterial({color:0x101416,metalness:.22,roughness:.42,specularIntensity:.18,envMapIntensity:.8,bumpMap:grain,bumpScale:.00035});
    }
    if (material.name === 'Crystal tumbler') {
      // Alpha glass lets the nested refractive ice remain visible; two
      // transmission passes cannot refract one another in a raster renderer.
      material.transmission = 0; material.transparent = true; material.opacity = .14;
      material.depthWrite = false; material.side = THREE.FrontSide;
      material.envMapIntensity = 1.7; object.castShadow = false;
      material.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
          #include <opaque_fragment>
          float glassEdge = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.5);
          gl_FragColor.a = mix(.045, .72, glassEdge);
        `);
      };
    }
    if (material.name === 'Clear melting ice') material.envMapIntensity = 1.7;
    if (material.name === 'Coral cocktail' && !object.name.includes('stream')) {
      material.onBeforeCompile = shader => {
        shader.vertexShader = 'varying vec3 liquidPosition;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nliquidPosition = position;');
        shader.fragmentShader = 'varying vec3 liquidPosition;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
          #include <color_fragment>
          float depthTint = smoothstep(-.63, -.413, liquidPosition.y);
          float glassCaustic = .94 + .06 * sin(atan(liquidPosition.z - .025, liquidPosition.x) * 24.);
          diffuseColor.rgb *= mix(vec3(.62,.43,.38),vec3(1.04,.96,.87),depthTint) * glassCaustic;
        `);
      };
    }
    if (object.name === 'Flowing_coral_stream' || object.name === 'Flowing coral stream') {
      // Only the stream gets a traveling deformation; the whole assembly
      // remains inside the same machine root throughout manual/auto rotation.
      object.material = material.clone();
      object.material.onBeforeCompile = shader => {
        shader.uniforms.flowTime = clock;
        shader.vertexShader = 'uniform float flowTime;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
          #include <begin_vertex>
          float along = clamp((-position.y - .137) / .276, 0., 1.);
          float traveling = sin(along * 46. - flowTime * 15.);
          transformed.x *= 1. + .11 * traveling;
          transformed.z = .025 + (transformed.z - .025) * (1. + .11 * traveling);
          transformed.x += .0013 * sin(along * 16. - flowTime * 5.) * along;
        `);
      };
    }
    if (object.name.startsWith('Splash_droplet') || object.name.startsWith('Splash droplet')) splashes.push(object);
  });
  // A small local light picks out the glass and orange liquid below the head.
  const dispenserLight = new THREE.PointLight(0xffd8b3, .08, .8, 2);
  dispenserLight.position.set(0, -.15, .14); machine.add(dispenserLight);

  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Preserve the full silhouette, including the widest side-on rotation.
    camera.position.z = Math.max(3.25, .49 / (Math.tan(THREE.MathUtils.degToRad(15.5)) * camera.aspect));
    camera.lookAt(0, -.035, 0); camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host); resize();
  host.dataset.ready = 'true';
  status.textContent = 'Máquina Quick GO 3D pronta. Arraste para girar em 360 graus. Use as setas do teclado para girar ou espaço para pausar.';

  let pointer, startX, startY, lastX, lastTime, direction;
  host.addEventListener('pointerdown', event => {
    pointer = event.pointerId; startX = lastX = event.clientX; startY = event.clientY;
    lastTime = performance.now(); direction = null; velocity = 0;
    dragging = event.pointerType === 'mouse';
    if (dragging) host.setPointerCapture(pointer);
    host.dataset.interacting = 'true';
  });
  host.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer) return;
    const dx = event.clientX - startX, dy = event.clientY - startY;
    if (!direction && Math.max(Math.abs(dx), Math.abs(dy)) > 6) {
      direction = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      if (direction === 'horizontal') { dragging = true; host.setPointerCapture(pointer); }
    }
    if (!dragging || direction === 'vertical') return;
    const now = performance.now();
    const delta = (event.clientX - lastX) * .008;
    machine.rotation.y += delta;
    velocity = THREE.MathUtils.clamp(delta / Math.max((now - lastTime) / 1000, .008), -2, 2);
    lastX = event.clientX; lastTime = now;
    host.dataset.angle = machine.rotation.y.toFixed(3);
  });
  const release = event => {
    if (pointer !== event.pointerId) return;
    dragging = false; pointer = null; resumeAt = performance.now() + 1000;
    delete host.dataset.interacting;
  };
  host.addEventListener('pointerup', release);
  host.addEventListener('pointercancel', release);
  host.addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault(); machine.rotation.y += event.code === 'ArrowLeft' ? -.35 : .35;
      host.dataset.angle = machine.rotation.y.toFixed(3); resumeAt = performance.now() + 2500;
    }
    if (event.code === 'Space') { event.preventDefault(); suspended = !suspended; status.textContent = suspended ? 'Rotação pausada.' : 'Rotação automática ativada.'; }
  });
  window.addEventListener('quickgo:machine-motion', event => { suspended = event.detail.paused; });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; wake(); }, { threshold: .01 }).observe(host);
  document.addEventListener('visibilitychange', wake);
  reduced.addEventListener('change', wake);
  function wake() {
    if (frame || !visible || document.hidden) return;
    previous = performance.now(); frame = requestAnimationFrame(tick);
  }
  function tick(now) {
    frame = null;
    if (!visible || document.hidden) return;
    const delta = Math.min((now - previous) / 1000, .05); previous = now;
    if (!reduced.matches && !suspended) clock.value += delta;
    if (!dragging) {
      machine.rotation.y += velocity * delta;
      velocity *= Math.exp(-delta * 4);
      if (!reduced.matches && !suspended && now > resumeAt) machine.rotation.y += delta * .13;
    }
    for (let i = 0; i < splashes.length; i++) {
      const t = (clock.value * 1.4 + i / splashes.length) % 1;
      const a = i * 2.4;
      splashes[i].position.set(Math.cos(a) * (.007 + .035*t), -.413 + .065*Math.sin(t*Math.PI) - .012*t, .025 + Math.sin(a) * (.007 + .035*t));
      splashes[i].scale.setScalar(.3 + .7*Math.sin(t*Math.PI));
    }
    // Diagnostics are numeric state, useful for accessible keyboard QA too.
    host.dataset.angle = machine.rotation.y.toFixed(3);
    host.dataset.flowTime = clock.value.toFixed(2);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  }
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); host.dataset.ready = 'false'; status.textContent = 'Visualização pausada. Recarregue para restaurar o 3D.';
  });
  wake();
}
start().catch(error => {
  host.dataset.failed = 'true';
  status.textContent = 'Não foi possível carregar o 3D neste navegador. A imagem de apresentação permanece disponível.';
  console.error('Quick GO 3D:', error);
});
