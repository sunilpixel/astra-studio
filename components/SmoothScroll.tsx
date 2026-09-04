"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import {
  registerScroller,
  registerScrollLock,
  scrollState,
} from "@/lib/scroll";

// Lenis drives the page, the GSAP ticker drives Lenis, ScrollTrigger
// updates off Lenis. One clock, so the smoothed position and the
// triggers can never drift apart.
export default function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) {
      // Native scrolling, but ScrollTrigger still has to be told once
      // fonts and images have settled.
      const id = setTimeout(() => ScrollTrigger.refresh(), 400);
      return () => clearTimeout(id);
    }

    const lenis = new Lenis({
      duration: 1.15,
      lerp: 0.085,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.6,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: false,
    });

    lenis.on("scroll", (e: { velocity: number; progress: number }) => {
      scrollState.raw = e.velocity;
      // ~40px/frame is a firm wheel scroll. Clamped, or a trackpad
      // fling blows out everything downstream.
      scrollState.velocity = Math.min(1.6, Math.abs(e.velocity) / 38);
      scrollState.progress = e.progress;
      ScrollTrigger.update();
    });

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(220, 30);

    registerScroller({
      scrollTo: (target, opts) =>
        lenis.scrollTo(target as number, { duration: 1.6, ...opts }),
    });
    registerScrollLock((locked) => (locked ? lenis.stop() : lenis.start()));

    // Photography lands late and changes the document height. One
    // refresh when the network settles, not one per image.
    const settle = setTimeout(() => ScrollTrigger.refresh(), 600);

    return () => {
      clearTimeout(settle);
      gsap.ticker.remove(raf);
      registerScroller(null);
      registerScrollLock(null);
      lenis.destroy();
    };
  }, []);

  return null;
}
