/* Liquid Mask Cursor — Originkit, browser-native lifecycle adapter.
   The original WebGL shader, field functions, parameter defaults, texture handling,
   fixed-step trail simulation, and visibility easing are retained. */
(() => {
  const MIN_W = 1200;
  const MIN_H = 800;
  const TRAIL_COUNT = 12;
  const IDLE_DELAY = 2.0;
  const FADE_IN = 0.35;
  const FADE_OUT = 0.7;
  const FIXED_STEP = 1 / 120;
  const DEFAULT_OUTER = window.liquidTextureSources?.outer || "assets/figma/home-repo-002.png";
  const DEFAULT_INNER = window.liquidTextureSources?.inner || "assets/figma/liquid-select-inner.png";

  const VERT = `
attribute vec2 a_position;
varying vec2 vUv;
void main() {
    vUv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

  const FRAG = `
precision highp float;

uniform sampler2D u_imageOuter;
uniform sampler2D u_imageInner;
uniform vec2 u_resolution;
uniform vec2 u_imageOuterRes;
uniform vec2 u_imageInnerRes;

uniform vec2 u_mouse;
uniform float u_time;
uniform float u_visibility;
uniform vec2 u_trail[12];
uniform float u_trailLength;
uniform float u_trailTaper;

uniform float u_radius;
uniform float u_distortion;
uniform float u_noiseScale;
uniform float u_speed;
uniform float u_edgeSoftness;
uniform float u_refraction;
uniform float u_parallax;

varying vec2 vUv;

// --- Noise & FBM ---
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    // Rotate between octaves to hide the value noise's blocky grid.
    mat2 rot = mat2(0.87, -0.48, 0.48, 0.87);
    for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
    }
    return v;
}

// Exact tapered-capsule distance AND its continuous outward gradient.
vec3 taperedCapsule(vec2 p, vec2 a, vec2 b, float ra, float rb) {
    vec2 segment = b - a;
    float segmentLength = length(segment);
    float radiusDelta = rb - ra;
    if (segmentLength <= abs(radiusDelta) + 0.00001) {
        vec2 offset = p - (ra >= rb ? a : b);
        float distanceToCenter = length(offset);
        return vec3(distanceToCenter - max(ra, rb), offset / max(distanceToCenter, 0.00001));
    }
    vec2 axis = segment / segmentLength;
    vec2 relative = p - a;
    float along = dot(relative, axis);
    vec2 perpendicular = relative - axis * along;
    float slope = radiusDelta / segmentLength;
    float tangent = sqrt(max(1.0 - slope * slope, 0.000001));
    float h = clamp((along + slope * length(perpendicular) / tangent) / segmentLength, 0.0, 1.0);
    vec2 offset = relative - segment * h;
    float distanceToCenter = length(offset);
    return vec3(distanceToCenter - mix(ra, rb, h), offset / max(distanceToCenter, 0.00001));
}

// Smooth-min that blends the GRADIENT as well as the distance, so overlapping
// segments do not put a refraction seam down the middle of the tail.
vec3 mergeFields(vec3 a, vec3 b, float width) {
    if (width < 0.000001) return a.x < b.x ? a : b;
    float h = clamp(0.5 + 0.5 * (b.x - a.x) / width, 0.0, 1.0);
    return vec3(mix(b.x, a.x, h) - width * h * (1.0 - h), mix(b.yz, a.yz, h));
}

// object-fit: cover, in uv space.
vec2 getCoverUv(vec2 uv, vec2 res, vec2 texRes) {
    vec2 ratio = res / texRes;
    float coverRatio = max(ratio.x, ratio.y);
    vec2 scaledRes = texRes * coverRatio;
    vec2 offset = (scaledRes - res) * 0.5 / scaledRes;
    return uv * (res / scaledRes) + offset;
}

void main() {
    // Procedural stand-ins so the component is never blank without pictures.
    vec3 fallbackOut = mix(vec3(0.05, 0.05, 0.08), vec3(0.15, 0.2, 0.3), vUv.y);
    vec3 fallbackIn = mix(vec3(0.9, 0.2, 0.4), vec3(0.1, 0.8, 0.9), vUv.x);

    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
    vec2 p = (vUv - u_mouse) * aspect;

    float n = fbm(p * u_noiseScale + u_time * u_speed);

    // Head disc, then eleven tapered capsules chained through the lagged
    // pointer samples. Rounded caps meet the segment sides tangentially.
    vec3 liquidField = vec3(length(p) - u_radius, p / max(length(p), 0.00001));
    for (int i = 0; i < 11; i++) {
        vec2 a = (u_trail[i] - u_mouse) * aspect * u_trailLength;
        vec2 b = (u_trail[i + 1] - u_mouse) * aspect * u_trailLength;
        float ra = u_radius * (1.0 - u_trailTaper * float(i) / 11.0);
        float rb = u_radius * (1.0 - u_trailTaper * float(i + 1) / 11.0);
        vec3 segmentField = taperedCapsule(p, a, b, ra, rb);
        float blendWidth = u_radius * 0.12 * smoothstep(0.0, u_radius * 0.15, length(b - a));
        liquidField = mergeFields(liquidField, segmentField, blendWidth);
    }

    float field = liquidField.x - u_radius * (n - 0.5) * u_distortion * 2.0;
    float mask = 1.0 - smoothstep(-u_edgeSoftness, u_edgeSoftness, field);
    float edgeProfile = smoothstep(0.0, 0.5, mask) * (1.0 - smoothstep(0.5, 1.0, mask));
    vec2 refractionDir = liquidField.yz;
    vec2 finalUvOffset = refractionDir * edgeProfile * u_refraction * u_visibility;

    vec4 colOuter = vec4(fallbackOut, 1.0);
    if (u_imageOuterRes.x > 0.0) {
        vec2 outerUv = getCoverUv(vUv + finalUvOffset, u_resolution, u_imageOuterRes);
        colOuter = texture2D(u_imageOuter, outerUv);
    }

    vec4 colInner = vec4(fallbackIn, 1.0);
    if (u_imageInnerRes.x > 0.0) {
        vec2 parallaxOffset = (u_mouse - 0.5) * u_parallax;
        vec2 innerUv = getCoverUv(vUv - finalUvOffset, u_resolution, u_imageInnerRes) + parallaxOffset;
        colInner = texture2D(u_imageInner, innerUv);
    }

    vec4 finalCol = mix(colOuter, colInner, mask * u_visibility);
    gl_FragColor = vec4(finalCol.rgb, 1.0);
}
`;

  const LIQUID_DEFAULTS = { distortion: 18, noiseScale: 57, softness: 6 };
  const TRAIL_DEFAULTS = { damping: 6, length: 108, persistence: 65, taper: 86 };
  const size = 14;
  const speed = 92;
  const refraction = 14;
  const parallax = 14;
  const L = { ...LIQUID_DEFAULTS };
  const T = { ...TRAIL_DEFAULTS };
  const live = {
    radius: size / 100,
    speed: (speed / 50) * 0.1,
    refraction: refraction / 100,
    parallax: parallax / 100,
    distortion: L.distortion / 100,
    noiseScale: L.noiseScale / 10,
    softness: L.softness / 100,
    smoothness: T.damping / 100,
    trailLength: T.length / 100,
    persistence: T.persistence / 100,
    taper: T.taper / 100,
  };

  const home = document.querySelector("#home");
  const host = document.createElement("div");
  const canvas = document.createElement("canvas");
  const portal = document.querySelector("#homePortal");
  if (!home || !portal) return;

  // This page previously shipped a hand-built SVG imitation. Remove only that
  // obsolete overlay; the Originkit WebGL canvas below remains self-contained.
  home.classList.remove("liquid-transition");
  document.querySelector("#select")?.classList.remove("liquid-underlay");
  document.querySelector(".liquid-idle-hint")?.remove();
  document.querySelector("#alpha-liquid-mask")?.ownerSVGElement?.remove();

  host.className = "liquid-mask-host";
  host.style.minWidth = `${MIN_W}px`;
  host.style.minHeight = `${MIN_H}px`;
  host.style.width = "100%";
  host.style.height = "100%";
  host.style.position = "absolute";
  host.style.inset = "0";
  host.style.overflow = "hidden";
  host.style.background = "#000";
  host.style.touchAction = "none";
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.setAttribute("aria-hidden", "true");
  host.append(canvas);
  portal.append(host);

  const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) {
    console.error("LiquidMaskCursor: WebGL is unavailable.");
    return;
  }

  const compile = (src, type) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("LiquidMaskCursor shader:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vs = compile(VERT, gl.VERTEX_SHADER);
  const fs = compile(FRAG, gl.FRAGMENT_SHADER);
  if (!vs || !fs) return;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("LiquidMaskCursor link:", gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  const u = (name) => gl.getUniformLocation(program, name);
  const U = {
    imageOuter: u("u_imageOuter"),
    imageInner: u("u_imageInner"),
    resolution: u("u_resolution"),
    outerRes: u("u_imageOuterRes"),
    innerRes: u("u_imageInnerRes"),
    mouse: u("u_mouse"),
    time: u("u_time"),
    visibility: u("u_visibility"),
    trail: u("u_trail[0]"),
    trailLength: u("u_trailLength"),
    trailTaper: u("u_trailTaper"),
    radius: u("u_radius"),
    distortion: u("u_distortion"),
    noiseScale: u("u_noiseScale"),
    speed: u("u_speed"),
    edgeSoftness: u("u_edgeSoftness"),
    refraction: u("u_refraction"),
    parallax: u("u_parallax"),
  };

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  // The texture orientation and NPOT settings mirror the source component.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const makeTex = (unit) => {
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return tex;
  };

  const texOuter = makeTex(0);
  const texInner = makeTex(1);
  gl.uniform1i(U.imageOuter, 0);
  gl.uniform1i(U.imageInner, 1);
  const outerRes = { w: 0, h: 0 };
  const innerRes = { w: 0, h: 0 };
  let outerLoaded = false, innerLoaded = false;
  let disposed = false;

  const load = (src, outer) => {
    if (!src) {
      if (outer) outerRes.w = outerRes.h = 0;
      else innerRes.w = innerRes.h = 0;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (disposed) return;
      gl.activeTexture(gl.TEXTURE0 + (outer ? 0 : 1));
      gl.bindTexture(gl.TEXTURE_2D, outer ? texOuter : texInner);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      let textureSource = img;
      if (outer) {
        // Match the larger liquid area to the bottom of the story image.
        const crop = document.createElement("canvas");
        crop.width = 1920;
        crop.height = 1600;
        const scale = Math.max(1922 / img.naturalWidth, 2486 / img.naturalHeight);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;
        crop.getContext("2d").drawImage(img, (1920 - w) / 2, 1600 - h, w, h);
        textureSource = crop;
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureSource);
      const target = outer ? outerRes : innerRes;
      target.w = outer ? 1920 : img.naturalWidth;
      target.h = outer ? 1600 : img.naturalHeight;
      if (outer) outerLoaded = true; else innerLoaded = true;
      if (outerLoaded && innerLoaded) host.classList.add("textures-ready");
    };
    img.onerror = () => {
      if (outer) outerRes.w = outerRes.h = 0;
      else innerRes.w = innerRes.h = 0;
    };
    img.src = src;
  };

  load(DEFAULT_OUTER, true);
  load(DEFAULT_INNER, false);

  let width = 0;
  let height = 0;
  const resize = () => {
    const w = Math.max(1, canvas.clientWidth || host.clientWidth);
    const h = Math.max(1, canvas.clientHeight || host.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.round(w * dpr);
    const bh = Math.round(h * dpr);
    if (bw === canvas.width && bh === canvas.height) return;
    canvas.width = bw;
    canvas.height = bh;
    width = bw;
    height = bh;
    gl.viewport(0, 0, bw, bh);
    gl.uniform2f(U.resolution, bw, bh);
  };

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  const trailPoints = new Float32Array(TRAIL_COUNT * 2).fill(0.5);
  const current = { x: 0.5, y: 0.5 };
  const target = { x: 0.5, y: 0.5 };
  let pointerInside = false;
  let lastActivity = -Infinity;
  let visibility = 0;
  let prevX = NaN;
  let prevY = NaN;
  const activate = (e) => {
    const b = canvas.getBoundingClientRect();
    if (b.width <= 0 || b.height <= 0) return;
    target.x = (e.clientX - b.left) / b.width;
    target.y = 1 - (e.clientY - b.top) / b.height;
    if (visibility === 0) {
      current.x = target.x;
      current.y = target.y;
      for (let i = 0; i < TRAIL_COUNT; i++) {
        trailPoints[i * 2] = target.x;
        trailPoints[i * 2 + 1] = target.y;
      }
    }
    pointerInside = true;
    lastActivity = performance.now();
    prevX = e.clientX;
    prevY = e.clientY;
  };

  const deactivate = () => {
    pointerInside = false;
    prevX = NaN;
    prevY = NaN;
  };

  const onMove = (e) => {
    if (!pointerInside || e.clientX !== prevX || e.clientY !== prevY) activate(e);
  };
  // Isolate the original effect from the prototype's older pointer handler.
  // The liquid simulation receives the native pointer samples; old prototype
  // listeners must not add ripples or navigate after arbitrary pointer moves.
  const onDocumentMoveCapture = (e) => {
    if (!portal.contains(e.target)) return;
    onMove(e);
    const glassCursor = document.querySelector(".glass-cursor");
    const figmaCursor = document.querySelector(".figma-mouse-cursor");
    if (glassCursor) {
      glassCursor.style.left = `${e.clientX}px`;
      glassCursor.style.top = `${e.clientY}px`;
    }
    if (figmaCursor) {
      figmaCursor.style.left = `${e.clientX}px`;
      figmaCursor.style.top = `${e.clientY}px`;
    }
    e.stopPropagation();
  };
  const onUp = (e) => {
    if (e.pointerType === "touch") deactivate();
  };

  portal.addEventListener("pointerenter", activate);
  document.addEventListener("pointermove", onDocumentMoveCapture, true);
  portal.addEventListener("pointerleave", deactivate);
  portal.addEventListener("pointercancel", deactivate);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("blur", deactivate);

  let raf = 0;
  let previousTime = performance.now();
  let accumulator = 0;
  let time = 0;
  const onVisibility = () => {
    if (document.hidden) {
      deactivate();
      visibility = 0;
    }
    previousTime = performance.now();
    accumulator = 0;
  };
  document.addEventListener("visibilitychange", onVisibility);

  const frame = (now) => {
    if (!home.classList.contains("active")) {
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(frame);
    const delta = Math.min(Math.max((now - previousTime) / 1000, 0), 0.05);
    previousTime = now;
    if (document.hidden) return;

    const v = live;
    const active = pointerInside && now - lastActivity < IDLE_DELAY * 1000;
    visibility = Math.min(1, Math.max(0, visibility + (active ? delta / FADE_IN : -delta / FADE_OUT)));
    gl.uniform1f(U.visibility, visibility * visibility * (3 - 2 * visibility));

    // Wrapped so the noise offset never costs float32 precision.
    time = (time + delta) % 3600;
    gl.uniform1f(U.time, time);

    accumulator += delta;
    const mouseAlpha = 1 - Math.pow(1 - v.smoothness, FIXED_STEP * 60);
    const trailAlpha = 1 - Math.exp((-FIXED_STEP * (TRAIL_COUNT - 1)) / v.persistence);
    while (accumulator >= FIXED_STEP) {
      current.x += (target.x - current.x) * mouseAlpha;
      current.y += (target.y - current.y) * mouseAlpha;
      trailPoints[0] = current.x;
      trailPoints[1] = current.y;
      for (let i = TRAIL_COUNT - 1; i > 0; i--) {
        trailPoints[i * 2] += (trailPoints[(i - 1) * 2] - trailPoints[i * 2]) * trailAlpha;
        trailPoints[i * 2 + 1] += (trailPoints[(i - 1) * 2 + 1] - trailPoints[i * 2 + 1]) * trailAlpha;
      }
      accumulator -= FIXED_STEP;
    }

    gl.uniform2f(U.mouse, current.x, current.y);
    gl.uniform2fv(U.trail, trailPoints);
    gl.uniform2f(U.outerRes, outerRes.w, outerRes.h);
    gl.uniform2f(U.innerRes, innerRes.w, innerRes.h);
    gl.uniform1f(U.radius, v.radius);
    gl.uniform1f(U.distortion, v.distortion);
    gl.uniform1f(U.noiseScale, v.noiseScale);
    gl.uniform1f(U.speed, v.speed);
    gl.uniform1f(U.edgeSoftness, v.softness);
    gl.uniform1f(U.refraction, v.refraction);
    gl.uniform1f(U.parallax, v.parallax);
    gl.uniform1f(U.trailLength, v.trailLength);
    gl.uniform1f(U.trailTaper, v.taper);
    if (width && height) gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const start = () => {
    if (!raf && home.classList.contains("active")) {
      previousTime = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
  const stopWhenHidden = new MutationObserver(start);
  stopWhenHidden.observe(home, { attributes: true, attributeFilter: ["class"] });
  start();

  window.addEventListener("beforeunload", () => {
    disposed = true;
    cancelAnimationFrame(raf);
    ro.disconnect();
    stopWhenHidden.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    portal.removeEventListener("pointerenter", activate);
    document.removeEventListener("pointermove", onDocumentMoveCapture, true);
    portal.removeEventListener("pointerleave", deactivate);
    portal.removeEventListener("pointercancel", deactivate);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("blur", deactivate);
  }, { once: true });
})();
