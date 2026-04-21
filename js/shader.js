/**
 * FGC Advisors — WebGL Fluid Shader
 * Adapted from Hazey Studio for FGC light theme
 * Colors: warm champagne + soft sage (#9AB4B0) + dusty rose
 */

(function () {

  const canvas  = document.getElementById('gradient-canvas');
  const gl      = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;

  /* ── Vertex shader ──────────────────────────────────────────── */
  const vert = `
    attribute vec2 a_pos;
    varying vec2 vUv;
    void main() {
      vUv = a_pos * 0.5 + 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  /* ── Fragment shader (exact Hazey mechanics, FGC palette) ───── */
  const frag = `
    precision mediump float;
    varying vec2 vUv;
    uniform float uTime;
    uniform float uScroll;
    uniform vec2  uMouse;
    uniform vec2  uResolution;
    uniform float uCellSize;
    uniform float uRadius;
    uniform float uCA;
    uniform float uEffect;
    uniform vec3  uC1;
    uniform vec3  uC2;
    uniform vec3  uC3;
    uniform float uScale;
    uniform float uIntensity;

    /* ── Simplex noise helpers ─────────────────────────────────── */
    vec3 mod289v3(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 mod289v4(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 permute(vec4 x){return mod289v4(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}

    float snoise(vec3 v){
      const vec2 C=vec2(1.0/6.0,1.0/3.0);
      const vec4 D=vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy));
      vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz);
      vec3 l=1.0-g;
      vec3 i1=min(g.xyz,l.zxy);
      vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx;
      vec3 x2=x0-i2+C.yyy;
      vec3 x3=x0-D.yyy;
      i=mod289v3(i);
      vec4 p=permute(permute(permute(
        i.z+vec4(0.0,i1.z,i2.z,1.0))
        +i.y+vec4(0.0,i1.y,i2.y,1.0))
        +i.x+vec4(0.0,i1.x,i2.x,1.0));
      float n_=0.142857142857;
      vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.0*floor(p*ns.z*ns.z);
      vec4 x_=floor(j*ns.z);
      vec4 y_=floor(j-7.0*x_);
      vec4 x=x_*ns.x+ns.yyyy;
      vec4 y=y_*ns.x+ns.yyyy;
      vec4 h=1.0-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy);
      vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.0+1.0;
      vec4 s1=floor(b1)*2.0+1.0;
      vec4 sh=-step(h,vec4(0.0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
      vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x);
      vec3 p1=vec3(a0.zw,h.y);
      vec3 p2=vec3(a1.xy,h.z);
      vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
      vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
      m=m*m;
      return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }

    /* ── Gradient at UV point ──────────────────────────────────── */
    vec3 gradientAt(vec2 uv) {
      vec2 p = uv * uScale;
      p += (uMouse - 0.5) * 0.12;
      p.y -= uScroll * 0.3;
      for(float i=0.0;i<3.0;i++){
        p += snoise(vec3(p-i*0.2, uTime+i*32.0)) * uIntensity;
      }
      float n = snoise(vec3(p, sin(uTime))) * 0.5 + 0.5;
      return n < 0.5
        ? mix(uC1, uC2, n*2.0)
        : mix(uC2, uC3, (n-0.5)*2.0);
    }

    /* ── Pixelate UV to grid cell center ───────────────────────── */
    vec2 pixelate(vec2 uv) {
      vec2 px = uv * uResolution;
      return (floor(px / uCellSize) * uCellSize + uCellSize * 0.5) / uResolution;
    }

    void main() {
      vec2 uv = vUv;
      float aspect = uResolution.x / uResolution.y;
      vec2  delta  = (uv - uMouse) * vec2(aspect, 1.0);
      float dist   = length(delta);
      float zone   = 1.0 - smoothstep(uRadius * 0.5, uRadius, dist);
      float blend  = zone * uEffect;
      vec2 dir = dist > 0.001 ? normalize(delta / vec2(aspect, 1.0)) : vec2(0.0);
      float ca = uCA * blend;
      float r  = gradientAt(pixelate(uv + dir * ca * 1.0)).r;
      float g  = gradientAt(pixelate(uv + dir * ca * 0.4)).g;
      float b  = gradientAt(pixelate(uv - dir * ca * 0.8)).b;
      vec3 pixelCol  = vec3(r, g, b);
      vec3 smoothCol = gradientAt(uv);
      gl_FragColor   = vec4(mix(smoothCol, pixelCol, blend), 1.0);
    }
  `;

  /* ── Compile helpers ────────────────────────────────────────── */
  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[FGC Shader]', gl.getShaderInfoLog(s));
    }
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  /* ── Quad ───────────────────────────────────────────────────── */
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  /* ── Uniforms ───────────────────────────────────────────────── */
  const u = {
    time:       gl.getUniformLocation(prog, 'uTime'),
    scroll:     gl.getUniformLocation(prog, 'uScroll'),
    mouse:      gl.getUniformLocation(prog, 'uMouse'),
    resolution: gl.getUniformLocation(prog, 'uResolution'),
    cellSize:   gl.getUniformLocation(prog, 'uCellSize'),
    radius:     gl.getUniformLocation(prog, 'uRadius'),
    ca:         gl.getUniformLocation(prog, 'uCA'),
    effect:     gl.getUniformLocation(prog, 'uEffect'),
    c1:         gl.getUniformLocation(prog, 'uC1'),
    c2:         gl.getUniformLocation(prog, 'uC2'),
    c3:         gl.getUniformLocation(prog, 'uC3'),
    scale:      gl.getUniformLocation(prog, 'uScale'),
    intensity:  gl.getUniformLocation(prog, 'uIntensity'),
  };

  /* ── FGC Brand Palette ──────────────────────────────────────── */
  /* Primary  — off-white         #FBF8F4 → 0.984 / 0.973 / 0.957 */
  /* Secondary — dark navy        #0B1319 → 0.043 / 0.075 / 0.098 */
  /* Accent 1  — terracotta       #D96040 → 0.851 / 0.376 / 0.251 */
  /* Accent 2  — steel blue       #B8CDD4 → 0.722 / 0.804 / 0.831 */
  /*                                                                 */
  /* Usage: c1 = off-white (dominant), c2 = dark navy (subtle veins) */
  /* c3 = terracotta (sparingly). Steel blue emerges in transitions. */
  gl.uniform3f(u.c1, 0.990, 0.982, 0.968);   /* off-white base                        */
  gl.uniform3f(u.c2, 0.855, 0.820, 0.770);   /* warm parchment — strong mid wash      */
  gl.uniform3f(u.c3, 0.700, 0.650, 0.590);   /* warm tan — deep accent                */

  gl.uniform1f(u.scale,    1.4);   /* larger, more dramatic features        */
  gl.uniform1f(u.intensity, 0.85); /* high turbulence                       */
  gl.uniform1f(u.cellSize,  16.0);
  gl.uniform1f(u.radius,    0.22);
  gl.uniform1f(u.ca,        0.012);

  /* ── Noise canvas ───────────────────────────────────────────── */
  const noiseCanvas = document.getElementById('noise-canvas');
  const noiseCtx    = noiseCanvas.getContext('2d');
  let   noiseImg    = null;

  function drawNoise() {
    const w = noiseCanvas.width;
    const h = noiseCanvas.height;
    if (!noiseImg || noiseImg.width !== w || noiseImg.height !== h) {
      noiseImg = noiseCtx.createImageData(w, h);
    }
    const buf32 = new Uint32Array(noiseImg.data.buffer);
    for (let i = 0; i < buf32.length; i++) {
      const v = (Math.random() * 255) | 0;
      buf32[i] = (255 << 24) | (v << 16) | (v << 8) | v;
    }
    noiseCtx.putImageData(noiseImg, 0, 0);
  }

  /* ── Resize ─────────────────────────────────────────────────── */
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width       = w;
    canvas.height      = h;
    noiseCanvas.width  = w;
    noiseCanvas.height = h;
    gl.viewport(0, 0, w, h);
  }
  resize();
  window.addEventListener('resize', resize);

  /* ── Scroll ─────────────────────────────────────────────────── */
  let scrollProgress = 0;
  window.addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = max > 0 ? window.scrollY / max : 0;
  }, { passive: true });

  /* ── Mouse + dwell ──────────────────────────────────────────── */
  let mx = 0.5, my = 0.5;
  let smx = 0.5, smy = 0.5;
  let pmx = 0.5, pmy = 0.5;
  let velocity      = 0;
  let dwellTimer    = 0;
  let effectTarget  = 0;
  let effectCurrent = 0;
  let onPage        = true;

  const SPEED_THRESHOLD = 0.003;
  const DWELL_DELAY     = 400;
  const EMERGE_SPEED    = 0.06;
  const DECAY_SPEED     = 0.025;

  document.addEventListener('mousemove', e => {
    mx = e.clientX / window.innerWidth;
    my = 1.0 - (e.clientY / window.innerHeight);
  });
  document.addEventListener('mouseleave', () => { onPage = false; effectTarget = 0; });
  document.addEventListener('mouseenter', () => { onPage = true; });

  /* ── Visibility ─────────────────────────────────────────────── */
  let hidden = false;
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; });

  /* ── Animation loop ─────────────────────────────────────────── */
  let time = 0.5;
  let last = performance.now();
  let lastNoise = 0;
  const NOISE_INTERVAL = 1000 / 12;

  function animate(now) {
    requestAnimationFrame(animate);
    if (hidden) return;

    const dt = Math.min(now - last, 50);
    last = now;
    time += dt * 0.001 * 0.048;

    smx += (mx - smx) * 0.07;
    smy += (my - smy) * 0.07;

    const dx = smx - pmx, dy = smy - pmy;
    velocity += (Math.sqrt(dx*dx + dy*dy) - velocity) * 0.15;
    pmx = smx; pmy = smy;

    if (onPage) {
      if (velocity > SPEED_THRESHOLD) {
        effectTarget = 1;
        dwellTimer   = 0;
      } else {
        dwellTimer += dt;
        if (dwellTimer > DWELL_DELAY) effectTarget = 0;
      }
    } else {
      dwellTimer   = 0;
      effectTarget = 0;
    }

    const rate = effectTarget > effectCurrent ? EMERGE_SPEED : DECAY_SPEED;
    effectCurrent += (effectTarget - effectCurrent) * rate;

    gl.uniform1f(u.time,   time);
    gl.uniform1f(u.scroll, scrollProgress);
    gl.uniform2f(u.mouse,  smx, smy);
    gl.uniform2f(u.resolution, canvas.width, canvas.height);
    gl.uniform1f(u.effect, effectCurrent);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (now - lastNoise > NOISE_INTERVAL) {
      drawNoise();
      lastNoise = now;
    }
  }

  drawNoise();
  animate(performance.now());

})();
