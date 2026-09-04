"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Observer } from "gsap/Observer";
import { CustomEase } from "gsap/CustomEase";

let registered = false;

if (typeof window !== "undefined" && !registered) {
  gsap.registerPlugin(ScrollTrigger, SplitText, Observer, CustomEase);

  // Four eases, and nothing on the site is allowed a fifth.
  CustomEase.create("astra", "0.16, 1, 0.3, 1"); // arrival
  CustomEase.create("astra-io", "0.76, 0, 0.24, 1"); // transit
  CustomEase.create("astra-heavy", "0.62, 0.02, 0.2, 1"); // mass
  CustomEase.create("astra-drop", "0.55, 0, 0.85, 0.2"); // gravity

  gsap.defaults({ ease: "astra", duration: 1.1 });
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Both faces are display:swap, so every start/end measured before they
  // land is measured against a fallback of the wrong width, and stays
  // wrong. Re-measure once.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  registered = true;
}

export { gsap, ScrollTrigger, SplitText, Observer, CustomEase };

let reducedCache: boolean | null = null;

// Cached: scrub callbacks read this every frame and matchMedia is not free.
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (reducedCache === null) {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedCache = mq.matches;
    mq.addEventListener("change", (e) => {
      reducedCache = e.matches;
    });
  }
  return reducedCache;
}

/** Coarse pointer: no hover, no custom cursor, lighter particle budget. */
export function isTouch(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, min = 0, max = 1) =>
  v < min ? min : v > max ? max : v;
