"use client";

/**
 * Three populations at three distances, each with its own size, speed,
 * drift, opacity and softness, split across two canvases so the word
 * can sit between them. Near flakes pass in front of the letters, far
 * ones behind; that is the only reason it reads as a space rather than
 * an overlay.
 *
 * Flakes are pre-rendered discs, not a tiled texture and not a
 * per-frame shadowBlur, so a few hundred cost almost nothing. Fall
 * speed is coupled to scroll velocity.
 */

import { gsap } from "@/lib/gsap";

export type SnowLayerSpec = {
  count: number;
  /** radius range in CSS pixels */
  size: [number, number];
  /** fall speed range, px per second at rest */
  speed: [number, number];
  /** lateral drift, px per second */
  wind: number;
  sway: number;
  opacity: [number, number];
  /** 0 = crisp, 1 = fully diffuse */
  softness: number;
  /** how strongly this layer answers scroll velocity */
  reactivity: number;
};

export type SnowOptions = {
  /** flakes drawn behind the subject */
  back: HTMLCanvasElement;
  /** flakes drawn in front of it */
  front?: HTMLCanvasElement | null;
  quality?: "high" | "low";
  /** r,g,b: dark motes on a white ground, light ones on a black one */
  tint?: [number, number, number];
  /** scales every radius; dark motes read as marks unless smaller */
  sizeScale?: number;
};

export type SnowHandle = {
  setVelocity: (v: number) => void;
  setDensity: (v: number) => void;
  /** false stops the loop entirely while the scene is off screen */
  setActive: (v: boolean) => void;
  destroy: () => void;
};

type Flake = {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
  swaySpeed: number;
  alpha: number;
  layer: number;
};

const LAYERS: SnowLayerSpec[] = [
  // far: a fine, almost static dust
  {
    count: 230,
    size: [0.5, 1.3],
    speed: [12, 26],
    wind: 6,
    sway: 5,
    opacity: [0.16, 0.38],
    softness: 0.15,
    reactivity: 0.35,
  },
  // middle: the body of the fall
  {
    count: 120,
    size: [1.4, 3.1],
    speed: [34, 62],
    wind: -14,
    sway: 14,
    opacity: [0.3, 0.6],
    softness: 0.4,
    reactivity: 0.7,
  },
  // near: heavy, blurred, in front of everything
  {
    count: 26,
    size: [7, 18],
    speed: [78, 140],
    wind: 26,
    sway: 34,
    opacity: [0.1, 0.26],
    softness: 1,
    reactivity: 1.25,
  },
];

function makeSprite(
  radius: number,
  softness: number,
  tint: [number, number, number],
) {
  const rgb = `${tint[0]},${tint[1]},${tint[2]}`;
  const size = Math.ceil(radius * 2 * (1 + softness * 1.6)) + 2;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const mid = size / 2;
  const g = ctx.createRadialGradient(mid, mid, 0, mid, mid, mid);
  const core = 1 - softness * 0.85;
  // Both stops share the tint, so the gradient fades to transparency
  // rather than through white and haloing every mote.
  g.addColorStop(0, `rgba(${rgb},1)`);
  g.addColorStop(Math.max(0.02, core * 0.55), `rgba(${rgb},1)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(mid, mid, mid, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

export function createSnowfield(opts: SnowOptions): SnowHandle {
  const {
    back,
    front = null,
    quality = "high",
    tint = [255, 253, 248],
    sizeScale = 1,
  } = opts;

  const scale = quality === "high" ? 1 : 0.45;
  const backCtx = back.getContext("2d")!;
  const frontCtx = front ? front.getContext("2d")! : null;

  // Eight sizes per layer: enough that no two flakes read as copies,
  // few enough to stay in cache.
  const SPRITE_STEPS = 8;
  const sprites: HTMLCanvasElement[][] = LAYERS.map((spec) => {
    const out: HTMLCanvasElement[] = [];
    for (let i = 0; i < SPRITE_STEPS; i++) {
      const t = i / (SPRITE_STEPS - 1);
      out.push(
        makeSprite(
          (spec.size[0] + (spec.size[1] - spec.size[0]) * t) * sizeScale,
          spec.softness,
          tint,
        ),
      );
    }
    return out;
  });

  let w = 1;
  let h = 1;
  let dpr = 1;
  const flakes: Flake[] = [];

  function seed() {
    flakes.length = 0;
    LAYERS.forEach((spec, li) => {
      const n = Math.round(spec.count * scale);
      for (let i = 0; i < n; i++) {
        flakes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random(),
          vy: spec.speed[0] + Math.random() * (spec.speed[1] - spec.speed[0]),
          phase: Math.random() * Math.PI * 2,
          swaySpeed: 0.4 + Math.random() * 0.9,
          alpha:
            spec.opacity[0] + Math.random() * (spec.opacity[1] - spec.opacity[0]),
          layer: li,
        });
      }
    });
  }

  function resize() {
    const rect = back.getBoundingClientRect();
    w = rect.width || window.innerWidth;
    h = rect.height || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, quality === "high" ? 2 : 1.5);
    for (const c of [back, front]) {
      if (!c) continue;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    backCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    frontCtx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!flakes.length) seed();
  }

  let velocity = 0;
  let smoothed = 0;
  let density = 1;
  let active = true;
  let last = performance.now();

  function frame() {
    if (!active) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // Eases in fast, decays slowly, so the air keeps moving for a
    // moment after the scroll stops.
    const rate = Math.abs(velocity) > Math.abs(smoothed) ? 0.16 : 0.045;
    smoothed += (velocity - smoothed) * rate;
    const t = now / 1000;

    backCtx.clearRect(0, 0, w, h);
    frontCtx?.clearRect(0, 0, w, h);
    if (density <= 0.01) return;

    for (const f of flakes) {
      const spec = LAYERS[f.layer];
      const boost = 1 + smoothed * spec.reactivity;
      f.y += f.vy * dt * boost;
      f.x +=
        (spec.wind + Math.sin(t * f.swaySpeed + f.phase) * spec.sway) * dt * boost;

      if (f.y - 40 > h) {
        f.y = -40;
        f.x = Math.random() * w;
      } else if (f.y < -60) {
        f.y = h + 20;
      }
      if (f.x < -60) f.x = w + 40;
      else if (f.x > w + 60) f.x = -40;

      const ctx = f.layer === 2 && frontCtx ? frontCtx : backCtx;
      const sprite = sprites[f.layer][Math.floor(f.r * (SPRITE_STEPS - 1))];
      ctx.globalAlpha = f.alpha * density;
      ctx.drawImage(sprite, f.x - sprite.width / 2, f.y - sprite.height / 2);
    }
    backCtx.globalAlpha = 1;
    if (frontCtx) frontCtx.globalAlpha = 1;
  }

  resize();
  let raf = 0;
  const onResize = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(resize);
  };
  window.addEventListener("resize", onResize);
  gsap.ticker.add(frame);

  return {
    setVelocity(v) {
      velocity = v;
    },
    setDensity(v) {
      density = v;
    },
    setActive(v) {
      if (active === v) return;
      active = v;
      if (!v) {
        backCtx.clearRect(0, 0, w, h);
        frontCtx?.clearRect(0, 0, w, h);
      } else {
        // Skip the gap: a long dt would teleport every flake.
        last = performance.now();
      }
    },
    destroy() {
      gsap.ticker.remove(frame);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    },
  };
}
