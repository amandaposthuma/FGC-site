/* shader-hero.js — drop-in interactive shader background.
 *
 * Usage:
 *   <script src="shader-hero.js"></script>
 *   <shader-hero variant="liquid"  accent="#c96442"></shader-hero>
 *   <shader-hero variant="plasma"  accent="#c96442"></shader-hero>
 *
 * Place anywhere; sized via CSS (defaults to 100% of parent). Put your hero
 * content as light-DOM children — they render above the canvas:
 *
 *   <shader-hero variant="liquid">
 *     <h1>Stop optimizing.</h1>
 *     <p>...</p>
 *   </shader-hero>
 *
 * Attributes:
 *   variant   "liquid" | "plasma"     (default "liquid")
 *   accent    CSS color hex           (default "#c96442")
 *   intensity 0..1, scales motion     (default 0.85)
 *   paused    presence pauses RAF
 *
 * No build step, no deps, no framework. Pointer + click are listened on the
 * element itself, so embedded interactive content (buttons, links) keeps
 * working — clicks bubble to the shader for the ripple/flash regardless.
 *
 * SSR-safe: guards on `window`/`document`. React/Vue/Svelte/Next: just render
 * <shader-hero …/> like any HTML tag. If your framework warns about unknown
 * elements, declare it (React: <shader-hero> works as-is in JSX).
 */
(function () {
  if (typeof window === 'undefined') return;
  if (customElements.get('shader-hero')) return;

  // ---- Fragment shaders ----------------------------------------------------

  const FRAG_LIQUID = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_mouseSmooth;
uniform float u_click;
uniform vec2 u_clickPos;
uniform float u_intensity;
uniform vec3 u_accent;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i+vec2(0,0)), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.02; a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = uv; p.x *= u_resolution.x / u_resolution.y;
  vec2 m = u_mouseSmooth; m.x *= u_resolution.x / u_resolution.y;
  vec2 toM = p - m;
  float dM = length(toM);
  float pull = 0.18 / (dM*dM*6.0 + 0.5);
  vec2 warp = -normalize(toM + 0.0001) * pull * u_intensity;
  vec2 cp = u_clickPos; cp.x *= u_resolution.x / u_resolution.y;
  float dC = length(p - cp);
  float ripple = sin(dC*40.0 - u_time*8.0) * exp(-dC*4.0) * u_click * 0.5;
  vec2 q = p + warp;
  float n1 = fbm(q*1.8 + vec2(u_time*0.05*u_intensity, -u_time*0.04*u_intensity));
  float n2 = fbm(q*1.8 + 4.0 + vec2(n1*1.5, -n1*1.2) + ripple);
  float n3 = fbm(q*2.2 + 8.0 + vec2(n2*1.8, n1*1.0));
  float bands = sin(n3*7.0 + u_time*0.2 + ripple*4.0)*0.5 + 0.5;
  bands = pow(bands, 1.6);
  vec3 base = vec3(0.965, 0.957, 0.937);
  vec3 dark = vec3(0.055, 0.055, 0.062);
  vec3 col = mix(dark, base, bands);
  float sheen = smoothstep(0.55, 0.95, bands);
  col = mix(col, mix(col, u_accent, 0.35), sheen * 0.4);
  float glow = exp(-dM*3.0) * 0.25;
  col += glow * vec3(1.0, 0.85, 0.7);
  col += u_click * exp(-dC*2.5) * u_accent * 0.6;
  col += (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.025;
  gl_FragColor = vec4(col, 1.0);
}
`;

  const FRAG_PLASMA = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_mouseSmooth;
uniform float u_click;
uniform vec2 u_clickPos;
uniform float u_intensity;
uniform vec3 u_accent;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i+vec2(0,0)), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v=0.0, a=0.5;
  for(int i=0;i<4;i++){ v += a*noise(p); p*=2.0; a*=0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float ar = u_resolution.x / u_resolution.y;
  vec2 p = uv; p.x *= ar;
  vec2 m = u_mouseSmooth; m.x *= ar;
  vec2 cp = u_clickPos; cp.x *= ar;
  float dM = length(p - m);
  float dC = length(p - cp);
  float n1 = fbm(p*1.4 + vec2(u_time*0.06*u_intensity, 0.0));
  float n2 = fbm(p*1.4 + vec2(0.0, u_time*0.05*u_intensity) + n1);
  vec3 paper = vec3(0.965, 0.957, 0.937);
  vec3 ink = vec3(0.06, 0.06, 0.07);
  vec3 cool = vec3(0.30, 0.40, 0.55);
  float bw = mix(0.86, 0.96, n2);
  vec3 base = mix(ink, paper, bw);
  float halo = smoothstep(0.55, 0.0, dM);
  vec3 colored = mix(base, mix(cool, u_accent, n1), 0.55);
  vec3 col = mix(base, colored, halo*0.8);
  float scan = sin(uv.y * u_resolution.y * 1.0 + u_time*1.5) * 0.5 + 0.5;
  col *= 1.0 - scan*0.04;
  float split = halo * 0.005;
  vec2 dir = normalize(p - m + 0.0001);
  float r = fbm((p + dir*split)*1.4 + vec2(u_time*0.06, 0.0));
  float b = fbm((p - dir*split)*1.4 + vec2(0.0, u_time*0.05));
  col.r = mix(col.r, mix(col.r, r*0.9 + 0.1, halo*0.6), 0.5);
  col.b = mix(col.b, mix(col.b, b*0.9 + 0.1, halo*0.6), 0.5);
  float flash = u_click * exp(-dC*2.5);
  col = mix(col, vec3(1.0, 0.95, 0.88), flash*0.5);
  col += (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.03;
  gl_FragColor = vec4(col, 1.0);
}
`;

  const VERT = 'attribute vec2 a_pos; void main(){ gl_Position=vec4(a_pos,0.0,1.0); }';

  function hexToRgb(hex) {
    if (!hex) return [0.78, 0.45, 0.25];
    const h = hex.replace('#', '').trim();
    const v = h.length === 3
      ? h.split('').map((c) => parseInt(c + c, 16))
      : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    return [v[0] / 255, v[1] / 255, v[2] / 255];
  }

  const FRAGS = { liquid: FRAG_LIQUID, plasma: FRAG_PLASMA };

  class ShaderHero extends HTMLElement {
    static get observedAttributes() { return ['variant', 'accent', 'intensity', 'paused']; }

    connectedCallback() {
      // Host styles — content children render above the canvas.
      const ds = this.style;
      if (!ds.position) ds.position = 'relative';
      if (!ds.display)  ds.display  = 'block';
      if (!ds.overflow) ds.overflow = 'hidden';

      this._canvas = document.createElement('canvas');
      Object.assign(this._canvas.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        display: 'block', zIndex: '0', pointerEvents: 'none',
      });
      this.insertBefore(this._canvas, this.firstChild);

      // Children content layer — relative-positioned auto, gets above canvas.
      // (Consumers control layout; we just guarantee z-index.)
      for (const ch of Array.from(this.children)) {
        if (ch === this._canvas) continue;
        const cs = ch.style;
        if (!cs.position) cs.position = 'relative';
        cs.zIndex = cs.zIndex || '1';
      }

      this._init();
    }

    disconnectedCallback() { this._dispose(); }

    attributeChangedCallback() {
      if (!this._gl) return;
      if (this._variantName !== this.getAttribute('variant')) {
        // re-init program
        this._dispose(true);
        this._init();
      }
      this._accent = hexToRgb(this.getAttribute('accent') || '#c96442');
      this._intensity = parseFloat(this.getAttribute('intensity') || '0.85');
    }

    _init() {
      const gl = this._canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false });
      if (!gl) return;
      this._gl = gl;
      this._variantName = this.getAttribute('variant') || 'liquid';
      this._accent = hexToRgb(this.getAttribute('accent') || '#c96442');
      this._intensity = parseFloat(this.getAttribute('intensity') || '0.85');

      const fragSrc = FRAGS[this._variantName] || FRAG_LIQUID;
      const compile = (type, src) => {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src); gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
          console.error('[shader-hero]', gl.getShaderInfoLog(sh));
        }
        return sh;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragSrc));
      gl.linkProgram(prog); gl.useProgram(prog);
      this._prog = prog;

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, 'a_pos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      this._u = {
        res: gl.getUniformLocation(prog, 'u_resolution'),
        t: gl.getUniformLocation(prog, 'u_time'),
        m: gl.getUniformLocation(prog, 'u_mouse'),
        ms: gl.getUniformLocation(prog, 'u_mouseSmooth'),
        c: gl.getUniformLocation(prog, 'u_click'),
        cp: gl.getUniformLocation(prog, 'u_clickPos'),
        i: gl.getUniformLocation(prog, 'u_intensity'),
        a: gl.getUniformLocation(prog, 'u_accent'),
      };

      this._state = {
        mouse: [0.5, 0.5],
        mouseSmooth: [0.5, 0.5],
        click: 0,
        clickPos: [0.5, 0.5],
        t0: performance.now(),
        raf: 0, alive: true,
      };

      const onMove = (e) => {
        const r = this.getBoundingClientRect();
        this._state.mouse[0] = (e.clientX - r.left) / r.width;
        this._state.mouse[1] = 1 - (e.clientY - r.top) / r.height;
      };
      const onClick = (e) => {
        const r = this.getBoundingClientRect();
        this._state.clickPos[0] = (e.clientX - r.left) / r.width;
        this._state.clickPos[1] = 1 - (e.clientY - r.top) / r.height;
        this._state.click = 1;
      };
      this._onMove = onMove; this._onClick = onClick;
      this.addEventListener('pointermove', onMove);
      this.addEventListener('pointerdown', onClick);

      const ro = new ResizeObserver(() => this._resize());
      ro.observe(this); this._ro = ro;
      this._resize();

      const frame = () => {
        if (!this._state.alive) return;
        if (!this.hasAttribute('paused')) this._render();
        this._state.raf = requestAnimationFrame(frame);
      };
      this._state.raf = requestAnimationFrame(frame);
    }

    _resize() {
      const gl = this._gl; if (!gl) return;
      const r = this.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(r.width * dpr));
      const h = Math.max(1, Math.floor(r.height * dpr));
      if (this._canvas.width !== w || this._canvas.height !== h) {
        this._canvas.width = w; this._canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    _render() {
      const gl = this._gl, st = this._state, u = this._u;
      st.mouseSmooth[0] += (st.mouse[0] - st.mouseSmooth[0]) * 0.08;
      st.mouseSmooth[1] += (st.mouse[1] - st.mouseSmooth[1]) * 0.08;
      st.click *= 0.96; if (st.click < 0.001) st.click = 0;
      const t = (performance.now() - st.t0) / 1000;
      gl.uniform2f(u.res, this._canvas.width, this._canvas.height);
      gl.uniform1f(u.t, t);
      gl.uniform2f(u.m, st.mouse[0], st.mouse[1]);
      gl.uniform2f(u.ms, st.mouseSmooth[0], st.mouseSmooth[1]);
      gl.uniform1f(u.c, st.click);
      gl.uniform2f(u.cp, st.clickPos[0], st.clickPos[1]);
      gl.uniform1f(u.i, this._intensity);
      gl.uniform3f(u.a, this._accent[0], this._accent[1], this._accent[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    _dispose(keepCanvas) {
      if (this._state) { this._state.alive = false; cancelAnimationFrame(this._state.raf); }
      if (this._ro) { this._ro.disconnect(); this._ro = null; }
      if (this._onMove) this.removeEventListener('pointermove', this._onMove);
      if (this._onClick) this.removeEventListener('pointerdown', this._onClick);
      if (this._gl && this._prog) { this._gl.deleteProgram(this._prog); }
      if (!keepCanvas && this._canvas && this._canvas.parentNode) {
        this._canvas.parentNode.removeChild(this._canvas);
        this._canvas = null;
      }
      this._gl = null; this._prog = null;
    }
  }

  customElements.define('shader-hero', ShaderHero);
})();
