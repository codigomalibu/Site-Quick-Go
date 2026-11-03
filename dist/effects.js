// Aurora shader adapted from the component in the user-supplied Um só catalogue.
// Source and license: see THIRD_PARTY_NOTICES.md.
const VERTEX = "#version 300 es\nin vec2 aPosition;\nvoid main() {\n  gl_Position = vec4(aPosition, 0.0, 1.0);\n}";
const FRAGMENT = "#version 300 es\nprecision highp float;\nprecision highp int;\nuniform vec2 uResolution;\nuniform float uTime;\nuniform vec3 uStops[5];\nuniform int uStopCount;\nuniform float uAmplitude;\nuniform float uBlend;\nuniform float uHeight;\nuniform float uScale;\nuniform float uGlow;\nuniform float uBrightness;\nuniform int uLayers;\nuniform float uFlip;\nuniform vec3 uPointer;\nuniform float uReveal;\nuniform float uOpacity;\nuniform float uLightMode;\nout vec4 outColor;\n\nvec3 permute(vec3 x) {\n  return mod(((x * 34.0) + 1.0) * x, 289.0);\n}\n\nfloat snoise(vec2 v) {\n  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);\n  vec2 i = floor(v + dot(v, C.yy));\n  vec2 x0 = v - i + dot(i, C.xx);\n  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);\n  vec4 x12 = x0.xyxy + C.xxzz;\n  x12.xy -= i1;\n  i = mod(i, 289.0);\n  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));\n  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);\n  m = m * m;\n  m = m * m;\n  vec3 x = 2.0 * fract(p * C.www) - 1.0;\n  vec3 h = abs(x) - 0.5;\n  vec3 ox = floor(x + 0.5);\n  vec3 a0 = x - ox;\n  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);\n  vec3 g;\n  g.x = a0.x * x0.x + h.x * x0.y;\n  g.yz = a0.yz * x12.xz + h.yz * x12.yw;\n  return 130.0 * dot(m, g);\n}\n\nfloat smootherstep(float edge0, float edge1, float x) {\n  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);\n  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);\n}\n\nvec3 oklabToLinear(vec3 c) {\n  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;\n  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;\n  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;\n  l = l * l * l;\n  m = m * m * m;\n  s = s * s * s;\n  return vec3(\n    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,\n    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,\n    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s\n  );\n}\n\nvec3 toSrgb(vec3 c) {\n  c = clamp(c, 0.0, 1.0);\n  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));\n}\n\nvec3 ramp(float t) {\n  float x = clamp(t, 0.0, 1.0) * float(uStopCount - 1);\n  int i = int(min(floor(x), float(uStopCount - 2)));\n  float f = x - float(i);\n  f = f * f * (3.0 - 2.0 * f);\n  vec3 lch = mix(uStops[i], uStops[i + 1], f);\n  lch.x = mix(lch.x, min(lch.x, 0.7), uLightMode);\n  return toSrgb(oklabToLinear(vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z))));\n}\n\nfloat hash(vec2 p) {\n  p = fract(p * vec2(123.34, 456.21));\n  p += dot(p, p + 45.32);\n  return fract(p.x * p.y);\n}\n\nvoid main() {\n  vec2 frag = gl_FragCoord.xy;\n  float y = 1.0 - frag.y / uResolution.y;\n  y = mix(y, 1.0 - y, uFlip);\n  float u = frag.x / uResolution.x;\n  float X = (frag.x - uResolution.x * 0.5) / uResolution.y;\n  float t = uTime;\n  float reach = uPointer.z * exp(-pow((X - uPointer.x) / 0.38, 2.0));\n\n  vec3 glow = vec3(0.0);\n  float cover = 0.0;\n  for (int k = 0; k < 3; k++) {\n    if (k >= uLayers) break;\n    float layer = float(k);\n    float seed = layer * 13.7;\n    float pace = t * (1.0 - layer * 0.18);\n    float warp = snoise(vec2(X * 0.45 * uScale + pace * 0.02 + seed, pace * 0.05 + seed));\n    float wave = snoise(vec2(X * 0.75 * uScale + warp * 0.35 - pace * 0.03 + seed, pace * 0.07 - seed)) * 0.72\n      + snoise(vec2(X * 1.6 * uScale + warp * 0.5 + pace * 0.04 - seed, pace * 0.1 + seed * 0.5)) * 0.28;\n    float hem = uHeight + layer * 0.07 + wave * 0.15 * uAmplitude;\n    hem += reach * 0.08 * (layer < 0.5 ? 1.0 : 0.4);\n    hem = mix(-0.25, hem, uReveal);\n\n    float soft = (0.04 + uBlend * 0.16) * (1.0 + layer * 0.9);\n    float rise = hem - y;\n    float low = -soft - uGlow * 0.14;\n    float high = 0.26 + soft * 0.6;\n    float body = pow(smootherstep(low, high, rise), 1.5 + uGlow * 0.6);\n    float lobes = 0.86 + 0.14 * snoise(vec2(X * 0.9 * uScale - pace * 0.025 + seed, y * 0.3 + pace * 0.04));\n    float alpha = body * lobes * (layer < 0.5 ? 1.0 : 0.32 / layer);\n    alpha = clamp(alpha * (1.0 + reach * 0.25 * smootherstep(0.9, 0.0, abs(y - hem))), 0.0, 1.0);\n\n    vec3 tint = ramp(u + 0.05 * sin(pace * 0.08 + layer * 2.3) + layer * 0.1 + max(rise, 0.0) * 0.05);\n    glow = 1.0 - (1.0 - glow) * (1.0 - tint * alpha);\n    cover = 1.0 - (1.0 - cover) * (1.0 - alpha);\n  }\n\n  float fade = smootherstep(0.0, 0.7, uReveal) * uOpacity;\n  float strength = clamp(uBrightness, 0.0, 2.0);\n  glow *= fade * min(strength, 1.0);\n  cover *= fade * min(strength, 1.0);\n  glow = 1.0 - pow(1.0 - glow, vec3(max(strength, 1.0)));\n  float dither = (hash(frag) - 0.5) / 255.0;\n\n  if (uLightMode > 0.5) {\n    vec3 tint = cover > 0.0001 ? glow / cover : vec3(0.0);\n    cover *= smootherstep(0.0, 0.25, cover);\n    float alpha = cover * 0.7;\n    outColor = vec4(tint * alpha + dither, clamp(alpha + dither, 0.0, 1.0));\n    return;\n  }\n  outColor = vec4(glow + dither, clamp(cover + dither, 0.0, 1.0));\n}";
export function startAurora(canvas, { paused = false } = {}) {
  if (!canvas) return;
  const container = canvas.parentElement;
  let gl;
  try { gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false }); }
  catch { return; }
  if (!gl) return;
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader); return null;
  };
  const vertex = compile(gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vertex || !fragment) return;
  const program = gl.createProgram();
  gl.attachShader(program, vertex); gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, 'aPosition'); gl.linkProgram(program);
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); return; }
  const uniforms = {};
  for (let n = 0; n < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); n++) {
    const info = gl.getActiveUniform(program, n);
    uniforms[info.name.replace('[0]', '')] = gl.getUniformLocation(program, info.name);
  }
  const buffer = gl.createBuffer();
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const toOklch = hex => {
    const rgb = hex.match(/[\da-f]{2}/gi).map(value => parseInt(value, 16) / 255);
    const [r, g, b] = rgb.map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
    const l = Math.cbrt(.4122214708*r + .5363325363*g + .0514459929*b);
    const m = Math.cbrt(.2119034982*r + .6806995451*g + .1073969566*b);
    const s = Math.cbrt(.0883024619*r + .2817188376*g + .6299787005*b);
    const a = 1.9779984951*l - 2.428592205*m + .4505937099*s;
    const bb = .0259040371*l + .7827717662*m - .808675766*s;
    return [.2104542553*l + .793617785*m - .0040720468*s, Math.hypot(a, bb), Math.atan2(bb, a)];
  };
  const stops = ['#6b9a9e', '#d5b88b', '#9287a6'].map(toOklch);
  for (let n = 1; n < stops.length; n++) {
    while (stops[n][2] - stops[n - 1][2] > Math.PI) stops[n][2] -= Math.PI * 2;
    while (stops[n][2] - stops[n - 1][2] < -Math.PI) stops[n][2] += Math.PI * 2;
  }
  const colors = new Float32Array(15); stops.forEach((stop, index) => colors.set(stop, index * 3));
  let visible = false, running = false, frame = 0, last = 0, clock = 0, px = 0, pointerX = 0, pointerInside = false, reach = 0;
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.25);
    canvas.width = Math.max(1, Math.round(container.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(container.clientHeight * dpr));
    if (paused) render();
  };
  const render = () => {
    gl.viewport(0, 0, canvas.width, canvas.height); gl.useProgram(program); gl.bindVertexArray(vao);
    gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.uTime, clock * .3);
    gl.uniform3fv(uniforms.uStops, colors); gl.uniform1i(uniforms.uStopCount, 3);
    for (const [key, value] of Object.entries({uAmplitude:1.1,uBlend:.6,uHeight:.55,uScale:.8,uGlow:.5,uBrightness:.9,uFlip:0,uReveal:1,uOpacity:.8,uLightMode:0})) gl.uniform1f(uniforms[key], value);
    gl.uniform1i(uniforms.uLayers, 2);
    gl.uniform3f(uniforms.uPointer, px, .5, reach);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const tick = now => {
    frame = 0;
    if (!visible || paused || document.hidden) { running = false; return; }
    if (now - last >= 32) {
      const delta = Math.min((now - last) / 1000, .05);
      last = now; clock += delta; px += (pointerX - px) * .06; reach += ((pointerInside ? 1 : 0) - reach) * .04; render();
    }
    frame = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (!visible || document.hidden || paused || running) return;
    running = true; last = performance.now(); frame = requestAnimationFrame(tick);
  };
  new ResizeObserver(resize).observe(container);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) { if (paused) render(); else wake(); } }, { rootMargin: '150px' }).observe(container);
  container.addEventListener('pointermove', event => {
    const rect = container.getBoundingClientRect(); pointerX = (event.clientX - rect.left - rect.width / 2) / rect.height; pointerInside = true;
  }, { passive: true });
  container.addEventListener('pointerleave', () => pointerInside = false);
  window.addEventListener('quickgo:motion', event => {
    paused = event.detail.paused;
    if (paused) { cancelAnimationFrame(frame); running = false; render(); } else wake();
  });
  document.addEventListener('visibilitychange', wake);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); cancelAnimationFrame(frame); running = false; canvas.style.visibility = 'hidden'; });
  resize();
}

// Spotlight Card's pointer-driven light, adapted to semantic HTML cards.
document.querySelectorAll('.spotlight').forEach(card => {
  card.addEventListener('pointermove', event => {
    if (document.body.classList.contains('motion-paused')) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
    card.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
  }, { passive: true });
});
