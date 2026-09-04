"use client";

/**
 * Fabric type. Each letter is a textured quad, lit in real time as if
 * it were a stuffed object.
 *
 * The glyphs are rasterised once to an offscreen atlas, then blurred
 * twice: a wide pass and a tight one. The wide blur is read as a height
 * field, peaking inside a thick stem and falling away at the outline;
 * its square root turns that ramp into a rounded cross-section. The
 * fragment shader differentiates the height to recover a normal and
 * lights that. Since the field is evaluated per pixel, a depression
 * pushed into it under the cursor bends the surface and moves the
 * highlight the way pressing a cushion does.
 *
 * The tight blur supplies the silhouette, fractionally fatter than the
 * original glyph. That is the inflation.
 */

import { gsap } from "@/lib/gsap";

export type FabricOptions = {
  canvas: HTMLCanvasElement;
  /** one entry per line; lines are centred and tightly leaded */
  lines: string[];
  fontFamily: string;
  fontWeight?: number | string;
  /** applied only where the browser exposes canvas font-stretch */
  fontStretch?: CanvasRenderingContext2D["fontStretch"];
  /** material colour, linear-ish sRGB 0..1 */
  color?: [number, number, number];
  /** specular strength; a dark material needs more of it to read */
  sheen?: number;
  /** edge light as a colour, carrying the silhouette on dark cloth */
  rim?: [number, number, number];
  rimStrength?: number;
  /** contact shadow opacity against the ground behind it */
  shadow?: number;
  /**
   * Painted width of the widest line relative to the viewport. This
   * is measured across the letter quads, so 1 means the outermost
   * ink just touches the edges and anything above 1 crops.
   */
  overflow?: number;
  /** upper bound on total type height, in viewport heights */
  maxHeight?: number;
  quality?: "high" | "low";
};

export type FabricHandle = {
  /** 0 at rest, 1 once the camera has passed through the word */
  setProgress: (p: number) => void;
  /** 0 hidden, 1 fully material */
  setPresence: (v: number) => void;
  /** false stops the render loop entirely while off screen */
  setActive: (v: boolean) => void;
  resize: () => void;
  destroy: () => void;
};

type Cell = { col: number; row: number };

type Layout = {
  atlas: HTMLCanvasElement;
  cellW: number;
  cellH: number;
  cols: number;
  rows: number;
  fontSize: number;
  /** per placed letter */
  glyphs: {
    cell: Cell;
    /** centre of the glyph along the line, in atlas pixels */
    x: number;
    line: number;
  }[];
  lineWidths: number[];
  lineCount: number;
};

const PAD_RATIO = 0.22;
const LINE_HEIGHT = 0.84;

type Stretch = CanvasRenderingContext2D["fontStretch"];

function buildAtlas(
  lines: string[],
  fontFamily: string,
  fontWeight: number | string,
  fontStretch: Stretch | undefined,
  fontSize: number,
  maxTexture: number,
): Layout {
  const probe = document.createElement("canvas").getContext("2d")!;
  const font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  probe.font = font;
  // Where the engine exposes it, the width axis gives a wider cut than
  // weight alone can.
  if (fontStretch && "fontStretch" in probe) probe.fontStretch = fontStretch;

  const chars = Array.from(new Set(lines.join("").replace(/ /g, ""))).sort();

  // Ink extents across the whole set, so every cell can share a size.
  let inkW = 0;
  let inkTop = 0;
  let inkBottom = 0;
  for (const ch of chars) {
    const m = probe.measureText(ch);
    const left = m.actualBoundingBoxLeft ?? 0;
    const right = m.actualBoundingBoxRight ?? m.width;
    inkW = Math.max(inkW, left + right, m.width);
    inkTop = Math.max(inkTop, m.actualBoundingBoxAscent ?? fontSize * 0.72);
    inkBottom = Math.max(inkBottom, m.actualBoundingBoxDescent ?? 0);
  }
  const inkH = inkTop + inkBottom;

  const pad = fontSize * PAD_RATIO;
  const cellW = Math.ceil(inkW + pad * 2);
  const cellH = Math.ceil(inkH + pad * 2);

  const count = chars.length;
  let cols = Math.min(count, Math.max(1, Math.floor(maxTexture / cellW)));
  let rows = Math.ceil(count / cols);
  // Keep the atlas inside the driver's limit in both axes.
  while (rows * cellH > maxTexture && cols < count) {
    cols += 1;
    rows = Math.ceil(count / cols);
  }

  const atlas = document.createElement("canvas");
  atlas.width = cols * cellW;
  atlas.height = rows * cellH;
  const ctx = atlas.getContext("2d")!;
  ctx.font = font;
  if (fontStretch && "fontStretch" in ctx) ctx.fontStretch = fontStretch;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fff";

  const cellOf = new Map<string, Cell>();
  chars.forEach((ch, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    cellOf.set(ch, { col, row });
    // Centre the ink block inside the cell.
    const cx = col * cellW + cellW / 2;
    const baseline = row * cellH + pad + inkTop;
    ctx.fillText(ch, cx, baseline);
  });

  // Letter placement along each line, measured with kerning intact.
  const glyphs: Layout["glyphs"] = [];
  const lineWidths: number[] = [];
  lines.forEach((line, li) => {
    const total = probe.measureText(line).width;
    lineWidths.push(total);
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === " ") continue;
      const before = probe.measureText(line.slice(0, i)).width;
      const advance = probe.measureText(ch).width;
      glyphs.push({
        cell: cellOf.get(ch)!,
        x: before + advance / 2 - total / 2,
        line: li,
      });
    }
  });

  return {
    atlas,
    cellW,
    cellH,
    cols,
    rows,
    fontSize,
    glyphs,
    lineWidths,
    lineCount: lines.length,
  };
}

// Three box passes are close enough to a Gaussian, run on a downsampled
// copy, so the whole field costs a few ms once. ctx.filter would be
// shorter but is not dependable across browsers.
function boxBlur(
  src: Float32Array,
  w: number,
  h: number,
  radius: number,
): Float32Array {
  let a: typeof src = src;
  let b: typeof src = new Float32Array(src.length);
  const r = Math.max(1, Math.round(radius));
  for (let pass = 0; pass < 3; pass++) {
    // horizontal
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      for (let i = -r; i <= r; i++) sum += a[row + Math.min(w - 1, Math.max(0, i))];
      const inv = 1 / (2 * r + 1);
      for (let x = 0; x < w; x++) {
        b[row + x] = sum * inv;
        const out = row + Math.min(w - 1, Math.max(0, x - r));
        const inn = row + Math.min(w - 1, Math.max(0, x + r + 1));
        sum += a[inn] - a[out];
      }
    }
    // vertical
    const t = a;
    a = b;
    b = t;
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let i = -r; i <= r; i++) sum += a[Math.min(h - 1, Math.max(0, i)) * w + x];
      const inv = 1 / (2 * r + 1);
      for (let y = 0; y < h; y++) {
        b[y * w + x] = sum * inv;
        const out = Math.min(h - 1, Math.max(0, y - r)) * w + x;
        const inn = Math.min(h - 1, Math.max(0, y + r + 1)) * w + x;
        sum += a[inn] - a[out];
      }
    }
    const t2 = a;
    a = b;
    b = t2;
  }
  return a;
}

/** Value noise on the CPU: a smoothly interpolated random field. */
function valueNoise(w: number, h: number, feature: number): Uint8Array {
  const gw = Math.max(2, Math.ceil(w / feature) + 1);
  const gh = Math.max(2, Math.ceil(h / feature) + 1);
  const grid = new Float32Array(gw * gh);
  for (let i = 0; i < grid.length; i++) grid[i] = Math.random();

  const out = new Uint8Array(w * h);
  const fade = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < h; y++) {
    const gy = y / feature;
    const y0 = Math.min(gh - 2, Math.floor(gy));
    const ty = fade(gy - y0);
    for (let x = 0; x < w; x++) {
      const gx = x / feature;
      const x0 = Math.min(gw - 2, Math.floor(gx));
      const tx = fade(gx - x0);
      const a = grid[y0 * gw + x0];
      const b = grid[y0 * gw + x0 + 1];
      const c = grid[(y0 + 1) * gw + x0];
      const d = grid[(y0 + 1) * gw + x0 + 1];
      const top = a + (b - a) * tx;
      const bot = c + (d - c) * tx;
      out[y * w + x] = (top + (bot - top) * ty) * 255;
    }
  }
  return out;
}

function buildField(layout: Layout, scale: number) {
  const { atlas } = layout;
  const fw = Math.max(8, Math.round(atlas.width * scale));
  const fh = Math.max(8, Math.round(atlas.height * scale));

  const small = document.createElement("canvas");
  small.width = fw;
  small.height = fh;
  const sctx = small.getContext("2d")!;
  sctx.drawImage(atlas, 0, 0, fw, fh);
  const data = sctx.getImageData(0, 0, fw, fh).data;

  const mask = new Float32Array(fw * fh);
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] / 255;

  const wide = boxBlur(mask.slice(), fw, fh, layout.fontSize * 0.088 * scale);
  const tight = boxBlur(mask.slice(), fw, fh, layout.fontSize * 0.03 * scale);

  // Channel four is the cloth's slack, baked here rather than evaluated
  // in the shader. Value noise is four sin() per octave, the height
  // function is sampled three times per fragment to build a normal, and
  // the letters cover most of the screen: per pixel per frame this was
  // comfortably the most expensive thing on the page.
  const feature = (layout.cellW * scale) / 21;
  const slack = valueNoise(fw, fh, feature);

  const out = new Uint8Array(fw * fh * 4);
  for (let i = 0; i < mask.length; i++) {
    out[i * 4] = Math.min(255, wide[i] * 255 * 1.65); // height ramp
    out[i * 4 + 1] = Math.min(255, tight[i] * 255); // silhouette
    out[i * 4 + 2] = Math.min(255, mask[i] * 255); // crisp original
    out[i * 4 + 3] = slack[i]; // slack
  }
  return { data: out, width: fw, height: fh };
}

const VERT = `
attribute vec2 aPos;
uniform vec2 uCentre;
uniform vec2 uHalf;
uniform float uRot;
uniform float uZ;
uniform float uFocal;
uniform float uAspect;
uniform vec2 uSkew;
varying vec2 vUv;

void main() {
  vec2 p = aPos * uHalf * 2.0;
  float c = cos(uRot), s = sin(uRot);
  p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  p += uCentre;

  // One shared vanishing point. Scaling position and extent by the same
  // factor is all a flat camera needs.
  float persp = uFocal / max(uFocal - uZ, 0.06);
  p *= persp;
  p += uSkew * uZ;

  // v runs downward so it matches the atlas without a flip.
  vUv = vec2(aPos.x + 0.5, 0.5 - aPos.y);
  gl_Position = vec4(p.x / uAspect, p.y, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;

varying vec2 vUv;

uniform sampler2D uField;
uniform vec4 uRect;      // atlas sub-rect for this cell
uniform vec2 uEps;       // finite-difference step, cell-uv
uniform vec2 uMouse;     // cursor in cell-uv
uniform float uPress;
uniform float uRadius;
uniform float uCellAspect;
uniform vec3 uColor;
uniform vec3 uRim;
uniform float uAlpha;
uniform float uMode;     // 0 = contact shadow, 1 = material
uniform float uBump;
uniform float uDetail;   // 1 on desktop, 0 drops the fine octaves
uniform float uSheen;
uniform float uRimStrength;

float sample1(vec2 uv, int ch) {
  vec4 t = texture2D(uField, uRect.xy + clamp(uv, 0.0, 1.0) * uRect.zw);
  if (ch == 0) return t.r;   // wide blur   — the height field
  if (ch == 1) return t.g;   // tight blur  — the inflated silhouette
  if (ch == 2) return t.b;   // crisp mask  — the glyph as drawn
  return t.a;                // baked slack — see buildField
}

// Height of the padded surface at a point inside the cell.
float height(vec2 uv) {
  float d = sample1(uv, 0);
  d = clamp((d - 0.24) / 0.76, 0.0, 1.0);
  // pow(d, 0.42) not sqrt: flatter face, steeper wall. sqrt gives a
  // balloon; this gives a stuffed panel.
  float h = pow(d, 0.42);

  // Slack, gated by h * (1 - h). A padded panel does not wrinkle at the
  // seam, where it is tight, or across the crown, where it is full. It
  // wrinkles on the shoulder between the two, and gating there rather
  // than everywhere is the difference between wrinkles and smudges.
  float slack = sample1(uv, 3) - 0.5;
  h += slack * 0.145 * h * (1.0 - h);

  // The touch. A smooth well, circular in screen space.
  vec2 md = (uv - uMouse) * vec2(uCellAspect, 1.0);
  float well = exp(-dot(md, md) / (uRadius * uRadius));
  h -= well * uPress * 0.52 * h;

  return h;
}

void main() {
  // Silhouette = union of the inflated outline and the glyph as drawn.
  //
  // Blur alone is fine for a grotesk, where every stroke is roughly a
  // stem wide, and destroys a didone, whose hairlines are a fraction of
  // one: they blur below the threshold and vanish, leaving a row of
  // disconnected tubes. Unioning with the crisp mask means inflation
  // can only add. Thin strokes keep their drawn width and, having no
  // height, stay flat and unlit, which is what a didone in cloth should
  // look like: puffed stems, ribbon-flat hairlines.
  float silhouette = max(sample1(vUv, 1), sample1(vUv, 2) * 0.92);

  if (uMode < 0.5) {
    // Contact shadow: the wide field, thresholded low and soft.
    float s = max(
      smoothstep(0.06, 0.50, sample1(vUv, 0)),
      smoothstep(0.30, 0.60, sample1(vUv, 2)) * 0.7
    );
    // Most of a cell is empty, and blending zero still costs a
    // read-modify-write per pixel.
    if (s * uAlpha <= 0.002) discard;
    gl_FragColor = vec4(0.0, 0.0, 0.0, s * uAlpha);
    return;
  }

  float alpha = smoothstep(0.385, 0.505, silhouette) * uAlpha;
  if (alpha <= 0.001) discard;

  float h = height(vUv);
  float hu = height(vUv + vec2(uEps.x, 0.0));
  float hv = height(vUv + vec2(0.0, uEps.y));

  // v points down in uv, up in the world, hence the sign flip on y.
  float du = (hu - h) / uEps.x;
  float dv = (hv - h) / uEps.y;
  vec3 n = normalize(vec3(-du * uBump, dv * uBump, 1.0));

  vec3 L = normalize(vec3(-0.40, 0.68, 0.62));   // key, upper left
  vec3 F = normalize(vec3(0.62, -0.30, 0.55));   // cool fill, lower right
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 H = normalize(L + V);

  float diff = max(dot(n, L), 0.0);
  float fill = max(dot(n, F), 0.0);
  // Broad and weak. Cloth has no hot spot; give it one and the word
  // turns to chrome.
  float sheen = pow(max(dot(n, H), 0.0), 4.5) * uSheen;
  float rim = pow(1.0 - clamp(n.z, 0.0, 1.0), 3.0);

  // Occlusion where the surface returns to the seam.
  float ao = smoothstep(0.0, 0.62, h);

  // Warm key, cool fill. Without the split an off-white object reads
  // as grey.
  vec3 warm = vec3(1.0, 0.984, 0.952);
  vec3 cool = vec3(0.84, 0.885, 0.98);

  vec3 col = uColor * (0.30 + 0.72 * diff) * (0.56 + 0.44 * ao);
  col *= mix(cool, warm, diff);
  col += uColor * cool * fill * 0.15 * ao;
  col += vec3(1.0) * sheen * ao;
  col += uRim * rim * uRimStrength;

  // Colour only. Neither touches the height field, so neither can
  // alias into the lighting.
  vec2 wv = vUv * vec2(300.0 * uCellAspect, 300.0);
  float weave = (sin(wv.x) * 0.5 + 0.5) * 0.5 + (sin(wv.y) * 0.5 + 0.5) * 0.5;
  col *= 0.962 + 0.040 * weave * uDetail;
  // fibre: the same baked field, read at a different scale
  col *= 0.976 + 0.034 * sample1(vUv * 2.7 + 0.31, 3) * uDetail;

  gl_FragColor = vec4(col * alpha, alpha);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error("fabric shader: " + log);
  }
  return sh;
}

type Letter = {
  cell: Cell;
  /** rest position in world units, before tracking */
  restX: number;
  restY: number;
  halfW: number;
  halfH: number;
  z0: number;
  /** per-letter personality */
  drift: number;
  spin: number;
  lagZ: number;
  press: number;
  pressTarget: number;
  mouseU: number;
  mouseV: number;
  offX: number;
  offY: number;
};

export function createFabricText(opts: FabricOptions): FabricHandle | null {
  const {
    canvas,
    lines,
    fontFamily,
    fontWeight = 900,
    fontStretch,
    color = [0.93, 0.905, 0.855],
    sheen = 0.085,
    rim = [0.6, 0.64, 0.72],
    rimStrength = 0.09,
    shadow = 0.3,
    overflow = 0.96,
    maxHeight = 1.62,
    quality = "high",
  } = opts;

  const gl = (canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
    powerPreference: "high-performance",
  }) ??
    canvas.getContext(
      "experimental-webgl",
    )) as WebGLRenderingContext | null;

  if (!gl) return null;

  const maxTex = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) as number, 4096);
  const detail = quality === "high" ? 1 : 0;
  // A didone's hairlines are a fraction of its stem width, so drop the
  // field resolution far enough and they fall below one field pixel and
  // blur away, leaving disconnected stems. The low path gives up shader
  // detail and DPR, never glyph resolution.
  const glyphPx = quality === "high" ? 320 : 260;

  let layout: Layout;
  try {
    layout = buildAtlas(
      lines,
      fontFamily,
      fontWeight,
      fontStretch,
      glyphPx,
      maxTex,
    );
  } catch {
    return null;
  }
  const field = buildField(layout, 1 / 3);

  let program: WebGLProgram;
  try {
    program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "link failed");
    }
  } catch {
    return null;
  }
  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]),
    gl.STATIC_DRAW,
  );
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    field.width,
    field.height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    field.data,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const U = {
    centre: u("uCentre"),
    half: u("uHalf"),
    rot: u("uRot"),
    z: u("uZ"),
    focal: u("uFocal"),
    aspect: u("uAspect"),
    skew: u("uSkew"),
    field: u("uField"),
    rect: u("uRect"),
    eps: u("uEps"),
    mouse: u("uMouse"),
    press: u("uPress"),
    radius: u("uRadius"),
    cellAspect: u("uCellAspect"),
    color: u("uColor"),
    rim: u("uRim"),
    alpha: u("uAlpha"),
    mode: u("uMode"),
    bump: u("uBump"),
    detail: u("uDetail"),
    sheen: u("uSheen"),
    rimStrength: u("uRimStrength"),
  };

  gl.uniform1i(U.field, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform3f(U.color, color[0], color[1], color[2]);
  gl.uniform3f(U.rim, rim[0], rim[1], rim[2]);
  gl.uniform1f(U.sheen, sheen);
  gl.uniform1f(U.rimStrength, rimStrength);
  gl.uniform1f(U.focal, 2.35);
  gl.uniform1f(U.detail, detail);
  gl.uniform1f(U.bump, 0.38);
  gl.uniform1f(U.radius, 0.33);
  gl.uniform1f(U.cellAspect, layout.cellW / layout.cellH);

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const uvRect = (cell: Cell): [number, number, number, number] => [
    cell.col / layout.cols,
    cell.row / layout.rows,
    1 / layout.cols,
    1 / layout.rows,
  ];

  const letters: Letter[] = [];
  let aspect = 1;
  let dpr = 1;

  function measure() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    aspect = w / h;
    dpr = Math.min(window.devicePixelRatio || 1, quality === "high" ? 1.6 : 1.3);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl!.viewport(0, 0, canvas.width, canvas.height);

    // Fit what is painted, not the advance width. Every letter is a
    // quad a full cell wide, and a cell is the widest glyph's ink plus
    // PAD_RATIO on each side, so the outer letters hang past the ends
    // of the line by a margin that grows with the weight of the face.
    const drawn =
      2 *
      Math.max(
        ...layout.glyphs.map((g) => Math.abs(g.x) + layout.cellW / 2),
        Math.max(...layout.lineWidths) / 2,
      );

    // World units per atlas pixel: fill the viewport width, then back
    // off if the stack would grow taller than its budget.
    let k = (2 * aspect * overflow) / drawn;
    const stack = layout.lineCount * layout.fontSize * LINE_HEIGHT * k;
    if (stack > maxHeight) k *= maxHeight / stack;

    const lineStep = layout.fontSize * LINE_HEIGHT * k;
    const yTop = ((layout.lineCount - 1) * lineStep) / 2;

    letters.length = 0;
    layout.glyphs.forEach((g, i) => {
      letters.push({
        cell: g.cell,
        restX: g.x * k,
        restY: yTop - g.line * lineStep,
        halfW: (layout.cellW / 2) * k,
        halfH: (layout.cellH / 2) * k,
        z0: 0,
        drift: 0,
        spin: 0,
        lagZ: 0,
        press: 0,
        pressTarget: 0,
        mouseU: -9,
        mouseV: -9,
        offX: 0,
        offY: 0,
      });
      const l = letters[i];
      // Deterministic, so the same letter always behaves the same way
      // and the piece is repeatable rather than random.
      const t = layout.glyphs.length === 1 ? 0.5 : i / (layout.glyphs.length - 1);
      l.z0 = Math.sin(t * Math.PI * 1.7 + 0.6) * 0.05;
      l.drift = Math.sin(i * 2.399) * 0.5;
      l.spin = Math.sin(i * 1.117 + 1.3) * 0.5;
      l.lagZ = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(i * 0.9 + 2.1));
    });

    const cellUvW = 1 / layout.cols;
    const cellUvH = 1 / layout.rows;
    const stepX = (1.7 / (field.width * cellUvW));
    const stepY = (1.7 / (field.height * cellUvH));
    gl!.uniform2f(U.eps, stepX, stepY);
    gl!.uniform1f(U.aspect, aspect);
  }

  const pointer = { x: -9, y: -9, tx: -9, ty: -9, active: false };
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };

  function onPointerMove(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    // World coordinates: y in [-1, 1], x in [-aspect, aspect].
    pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2 * aspect;
    pointer.ty = -((e.clientY - r.top) / r.height - 0.5) * 2;
    pointer.active = true;
    parallax.tx = ((e.clientX - r.left) / r.width - 0.5) * 0.11;
    parallax.ty = -((e.clientY - r.top) / r.height - 0.5) * 0.07;
  }
  function onPointerLeave() {
    pointer.active = false;
    parallax.tx = 0;
    parallax.ty = 0;
  }

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerleave", onPointerLeave);

  let progress = 0;
  let presence = 0;
  let active = true;

  function render() {
    // Nothing to light once the word is behind the reader, and without
    // this the shader runs for the remaining forty screens.
    if (!gl || !active) return;

    // Chased, never snapped to. Snapping reads as the surface following
    // the mouse rather than having weight.
    pointer.x += (pointer.tx - pointer.x) * 0.14;
    pointer.y += (pointer.ty - pointer.y) * 0.14;
    parallax.x += (parallax.tx - parallax.x) * 0.06;
    parallax.y += (parallax.ty - parallax.y) * 0.06;

    const p = progress;
    const ease = p * p; // the approach accelerates
    const spread = 1 + ease * 2.05; // tracking opens as we close in
    const camZ = ease * 2.05;
    const fade = presence * (1 - Math.max(0, (p - 0.74) / 0.26));

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (fade <= 0.001) return;

    gl.uniform2f(U.skew, parallax.x, parallax.y);

    // Resolved once, drawn twice: shadows first, so every letter sits on
    // the same ground plane.
    type Draw = {
      l: Letter;
      cx: number;
      cy: number;
      z: number;
      rot: number;
      a: number;
    };
    const draws: Draw[] = [];

    for (const l of letters) {
      const z = l.z0 + camZ * l.lagZ;
      const cx = l.restX * spread + l.offX + parallax.x * 0.7;
      const cy =
        l.restY + l.offY - ease * 0.16 * l.drift + parallax.y * 0.7;
      const rot = l.spin * ease * 0.12;
      draws.push({ l, cx, cy, z, rot, a: fade });
    }
    // Far letters first: correct overlap without a depth buffer.
    draws.sort((a, b) => a.z - b.z);

    // Pass 1: contact shadow.
    gl.uniform1f(U.mode, 0);
    for (const d of draws) {
      const persp = 2.35 / Math.max(2.35 - d.z, 0.06);
      const drop = 0.055 / persp;
      gl.uniform4fv(U.rect, uvRect(d.l.cell));
      gl.uniform2f(U.centre, d.cx + drop * 0.55, d.cy - drop);
      gl.uniform2f(U.half, d.l.halfW * 1.03, d.l.halfH * 1.03);
      gl.uniform1f(U.rot, d.rot);
      gl.uniform1f(U.z, d.z);
      gl.uniform1f(U.alpha, d.a * shadow);
      gl.uniform1f(U.press, 0);
      gl.uniform2f(U.mouse, -9, -9);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // Pass 2: material.
    gl.uniform1f(U.mode, 1);
    for (let i = 0; i < draws.length; i++) {
      const d = draws[i];
      const l = d.l;

      // Cursor, resolved into this letter's own surface coordinates.
      const persp = 2.35 / Math.max(2.35 - d.z, 0.06);
      const sx = d.cx * persp + parallax.x * d.z;
      const sy = d.cy * persp + parallax.y * d.z;
      const hw = l.halfW * persp;
      const hh = l.halfH * persp;

      let uu = -9;
      let vv = -9;
      if (pointer.active) {
        uu = (pointer.x - sx) / (hw * 2) + 0.5;
        vv = 0.5 - (pointer.y - sy) / (hh * 2);
        const inside = uu > -0.15 && uu < 1.15 && vv > -0.15 && vv < 1.15;
        l.pressTarget = inside ? 1 : 0;
      } else {
        l.pressTarget = 0;
      }

      // Quick to compress, slow to recover. Fabric does not snap back,
      // and that asymmetry is most of the illusion.
      const rate = l.pressTarget > l.press ? 0.13 : 0.035;
      l.press += (l.pressTarget - l.press) * rate;

      // The letter itself yields a little, away from the touch.
      const pushX = l.press * (0.5 - uu) * 0.035;
      const pushY = l.press * (vv - 0.5) * 0.035;
      l.offX += (pushX - l.offX) * 0.08;
      l.offY += (pushY - l.offY) * 0.08;

      l.mouseU = uu;
      l.mouseV = vv;

      gl.uniform4fv(U.rect, uvRect(l.cell));
      gl.uniform2f(U.centre, d.cx, d.cy);
      gl.uniform2f(U.half, l.halfW, l.halfH);
      gl.uniform1f(U.rot, d.rot);
      gl.uniform1f(U.z, d.z);
      gl.uniform1f(U.alpha, d.a);
      gl.uniform1f(U.press, l.press);
      gl.uniform2f(U.mouse, uu, vv);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  measure();
  gsap.ticker.add(render);

  let resizeRaf = 0;
  const onResize = () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(measure);
  };
  window.addEventListener("resize", onResize);

  return {
    setProgress(p) {
      progress = p;
    },
    setPresence(v) {
      presence = v;
    },
    setActive(v) {
      if (active === v) return;
      active = v;
      if (!v) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
    },
    resize: measure,
    destroy() {
      gsap.ticker.remove(render);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      cancelAnimationFrame(resizeRaf);
      gl.deleteTexture(tex);
      gl.deleteBuffer(quad);
      gl.deleteProgram(program);
    },
  };
}
