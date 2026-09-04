"use client";

import { useRef } from "react";
import type { RefObject } from "react";
import { gsap, ScrollTrigger, SplitText, prefersReducedMotion } from "@/lib/gsap";
import { clipAt, type ClipDir, type ClipFamily } from "@/lib/clip";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

// Nothing here animates from React state. Every value is written
// straight to the DOM by GSAP, off the scroll position or the ticker,
// so the render tree stays still while the page moves.

/**
 * Scoped gsap.context with automatic revert. `setup` may return a
 * cleanup function of its own for non-GSAP listeners.
 */
export function useGsapContext<T extends HTMLElement = HTMLDivElement>(
  setup: (scope: T) => void | (() => void),
  deps: unknown[] = [],
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useIsomorphicLayoutEffect(() => {
    const scope = ref.current;
    if (!scope) return;
    let extra: void | (() => void);
    const ctx = gsap.context(() => {
      extra = setup(scope);
    }, scope);
    return () => {
      if (typeof extra === "function") extra();
      ctx.revert();
    };
  }, deps);

  return ref;
}

export type SplitKind = "lines" | "words" | "chars";

/** Re-splits on resize and once webfonts land, so line breaks never go stale. */
export function splitAndBuild(
  el: HTMLElement,
  kind: SplitKind,
  build: (pieces: Element[], split: SplitText) => void,
): SplitText {
  return SplitText.create(el, {
    type: kind === "lines" ? "lines" : "lines," + kind,
    mask: "lines",
    autoSplit: true,
    aria: "auto",
    linesClass: "split-line",
    onSplit: (self) => {
      const pieces =
        kind === "lines" ? self.lines : kind === "words" ? self.words : self.chars;
      build(pieces, self);
    },
  });
}

export type RevealOptions = {
  kind?: SplitKind;
  /** distance travelled, as a percentage of the piece's own height */
  from?: number;
  stagger?: number;
  duration?: number;
  start?: string;
  /** slight out-of-plane tilt */
  rotate?: number;
  delay?: number;
};

/** The default headline arrival: up from behind a line mask. */
export function useReveal<T extends HTMLElement = HTMLHeadingElement>(
  options: RevealOptions = {},
) {
  const {
    kind = "lines",
    from = 118,
    stagger = 0.085,
    duration = 1.25,
    start = "top 82%",
    rotate = -14,
    delay = 0,
  } = options;

  return useGsapContext<T>((scope) => {
    gsap.set(scope, { autoAlpha: 1 });
    if (prefersReducedMotion()) return;

    const split = splitAndBuild(scope, kind, (pieces) => {
      gsap.set(pieces, {
        yPercent: from,
        rotateX: rotate,
        opacity: 0,
        transformOrigin: "50% 100%",
      });
      gsap.to(pieces, {
        yPercent: 0,
        rotateX: 0,
        opacity: 1,
        duration,
        delay,
        stagger,
        ease: "astra",
        scrollTrigger: { trigger: scope, start, once: true },
      });
    });

    return () => split.revert();
  });
}

export type ParallaxOptions = {
  /** fraction of a viewport travelled across the full scroll pass */
  speed?: number;
  axis?: "y" | "x";
  scale?: number;
  trigger?: string;
};

/** One depth layer. Four of these at four speeds make a camera. */
export function useParallax<T extends HTMLElement = HTMLDivElement>(
  options: ParallaxOptions = {},
) {
  const { speed = 0.18, axis = "y", scale, trigger } = options;

  return useGsapContext<T>((scope) => {
    if (prefersReducedMotion()) return;
    const target = trigger
      ? ((scope.closest(trigger) as HTMLElement) ?? scope)
      : scope;
    const distance =
      (axis === "y" ? window.innerHeight : window.innerWidth) * speed;

    gsap.fromTo(
      scope,
      { [axis]: -distance * 0.5, ...(scale ? { scale } : {}) },
      {
        [axis]: distance * 0.5,
        ...(scale ? { scale: 1 } : {}),
        ease: "none",
        scrollTrigger: {
          trigger: target,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    );
  }, [speed, axis, scale, trigger]);
}

export type PinOptions = {
  /** how many viewport heights of scroll the pin consumes */
  length?: number;
  onProgress?: (p: number) => void;
  anticipatePin?: number;
};

/**
 * Pins a section and reports normalised progress. The progress comes off
 * ScrollTrigger's scrub loop, never a scroll listener, so nothing
 * recomputes layout mid-gesture.
 */
export function usePinSection<T extends HTMLElement = HTMLDivElement>(
  options: PinOptions = {},
) {
  const { length = 3, onProgress, anticipatePin = 1 } = options;

  // Build the trigger once and swap the callback, or every parent
  // re-render tears the pin down and rebuilds it.
  const cb = useRef(onProgress);
  useIsomorphicLayoutEffect(() => {
    cb.current = onProgress;
  });

  return useGsapContext<T>((scope) => {
    const st = ScrollTrigger.create({
      trigger: scope,
      start: "top top",
      end: () => "+=" + window.innerHeight * length,
      pin: true,
      pinSpacing: true,
      anticipatePin,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => cb.current?.(self.progress),
    });
    return () => st.kill();
  }, [length, anticipatePin]);
}

export function useClipReveal<T extends HTMLElement = HTMLDivElement>(
  shape: ClipFamily = "blade",
  options: {
    start?: string;
    duration?: number;
    scrub?: boolean;
    dir?: ClipDir;
  } = {},
) {
  const { start = "top 88%", duration = 1.5, scrub = false, dir = "right" } =
    options;

  return useGsapContext<T>((scope) => {
    const open = clipAt(shape, 1, dir);
    if (prefersReducedMotion()) {
      gsap.set(scope, { clipPath: open });
      return;
    }
    gsap.fromTo(
      scope,
      { clipPath: clipAt(shape, 0, dir) },
      {
        clipPath: open,
        duration,
        ease: "astra-io",
        scrollTrigger: scrub
          ? { trigger: scope, start: "top bottom", end: "top 40%", scrub: true }
          : { trigger: scope, start, once: true },
      },
    );
  }, [shape, start, duration, scrub, dir]);
}

/** Slow push-in on a photographic plate, scrubbed by scroll. */
export function useImageZoom<T extends HTMLElement = HTMLDivElement>(
  options: { from?: number; to?: number; blur?: number } = {},
) {
  const { from = 1.22, to = 1.0, blur = 0 } = options;

  return useGsapContext<T>((scope) => {
    if (prefersReducedMotion()) return;
    gsap.fromTo(
      scope,
      { scale: from, filter: blur ? "blur(" + blur + "px)" : "blur(0px)" },
      {
        scale: to,
        filter: "blur(0px)",
        ease: "none",
        scrollTrigger: {
          trigger: scope,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    );
  }, [from, to, blur]);
}

export type GravityOptions = {
  /** peak sag of the heaviest character, in pixels */
  sag?: number;
  /** how far each character lags the one before it */
  lag?: number;
  rotate?: number;
};

/**
 * Characters near the middle of a line sag further than those at the
 * ends (the curve of a cloth pinned at two corners), and each lags its
 * neighbour, so the line settles in sequence rather than as a block.
 */
export function useGravityText<T extends HTMLElement = HTMLElement>(
  options: GravityOptions = {},
) {
  const { sag = 48, lag = 0.22, rotate = 4 } = options;

  return useGsapContext<T>((scope) => {
    if (prefersReducedMotion()) return;

    const split = splitAndBuild(scope, "chars", (chars) => {
      const n = chars.length;
      if (!n) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scope,
          start: "top 92%",
          end: "bottom 28%",
          scrub: 1.1,
          invalidateOnRefresh: true,
        },
      });

      chars.forEach((char, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const curve = Math.sin(t * Math.PI);
        tl.to(
          char,
          {
            y: sag * curve,
            rotate: rotate * (t - 0.5) * 2 * curve,
            scaleY: 1 + 0.07 * curve,
            ease: "astra-heavy",
            duration: 1,
          },
          i * lag * 0.1,
        );
      });
    });

    return () => split.revert();
  }, [sag, lag, rotate]);
}

/** Letter-spacing on a scrub: the word pulls apart, then closes again. */
export function useTracking<T extends HTMLElement = HTMLElement>(
  options: { from?: number; to?: number; back?: number; scrub?: number } = {},
) {
  const { from = 0.02, to = 0.62, back, scrub = 1 } = options;

  return useGsapContext<T>((scope) => {
    if (prefersReducedMotion()) return;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scope,
        start: "top 90%",
        end: "bottom 10%",
        scrub,
        invalidateOnRefresh: true,
      },
    });
    tl.fromTo(
      scope,
      { letterSpacing: from + "em" },
      { letterSpacing: to + "em", ease: "astra-io", duration: 1 },
    );
    if (back !== undefined) {
      tl.to(scope, { letterSpacing: back + "em", ease: "astra-io", duration: 1 });
    }
  }, [from, to, back, scrub]);
}

/** Elements that lean toward the cursor. Quick-setters, no re-render. */
export function useMagnetic<T extends HTMLElement = HTMLElement>(
  strength = 0.32,
  radius = 110,
) {
  return useGsapContext<T>((scope) => {
    if (prefersReducedMotion() || window.matchMedia("(pointer: coarse)").matches)
      return;

    const xTo = gsap.quickTo(scope, "x", { duration: 0.6, ease: "astra" });
    const yTo = gsap.quickTo(scope, "y", { duration: 0.6, ease: "astra" });
    const inner = scope.querySelector<HTMLElement>("[data-magnetic-inner]");
    const ixTo = inner && gsap.quickTo(inner, "x", { duration: 0.9, ease: "astra" });
    const iyTo = inner && gsap.quickTo(inner, "y", { duration: 0.9, ease: "astra" });

    const reset = () => {
      xTo(0);
      yTo(0);
      ixTo?.(0);
      iyTo?.(0);
    };

    const onMove = (e: PointerEvent) => {
      const r = scope.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);
      const reach = Math.max(r.width, r.height) / 2 + radius;
      if (dist > reach) return reset();
      const falloff = 1 - dist / reach;
      xTo(dx * strength * falloff);
      yTo(dy * strength * falloff);
      ixTo?.(dx * strength * 0.4 * falloff);
      iyTo?.(dy * strength * 0.4 * falloff);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", reset);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", reset);
    };
  }, [strength, radius]);
}

/** Announces the active chapter to the scroll index. */
export function useSectionMarker<T extends HTMLElement = HTMLElement>(
  id: string,
) {
  return useGsapContext<T>((scope) => {
    const st = ScrollTrigger.create({
      trigger: scope,
      start: "top 60%",
      end: "bottom 40%",
      onToggle: (self) => {
        if (self.isActive) {
          window.dispatchEvent(
            new CustomEvent("astra:chapter", { detail: { id } }),
          );
        }
      },
    });
    return () => st.kill();
  }, [id]);
}
