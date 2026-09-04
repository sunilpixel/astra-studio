"use client";

import { useEffect, useRef, useState } from "react";
import Chapter from "@/components/Chapter";
import Plate from "@/components/Plate";
import {
  gsap,
  isTouch,
  prefersReducedMotion,
  ScrollTrigger,
} from "@/lib/gsap";
import { usePinSection } from "@/hooks/animation";
import { useIsomorphicLayoutEffect } from "@/hooks/useIsomorphicLayoutEffect";
import { blade, iris } from "@/lib/clip";
import type { FabricHandle } from "@/webgl/fabricText";

/**
 * Black didone, inflated, on white.
 *
 * A Garamond has almost no mass in its hairlines and a great deal in
 * its stems, so when the height field is built the stems puff into
 * solid objects while the serifs stay flat as ribbon. No grotesk does
 * this at any weight.
 */
export default function Hero() {
  const fabric = useRef<FabricHandle | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fallback = useRef<HTMLDivElement>(null);
  const cut = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const ui = useRef<HTMLDivElement>(null);
  const sub = useRef<HTMLDivElement>(null);
  const [webglReady, setWebglReady] = useState(false);

  useEffect(() => {
    const el = canvas.current;
    if (!el || prefersReducedMotion()) return;

    let handle: FabricHandle | null = null;
    let cancelled = false;

    const boot = async () => {
      try {
        await document.fonts.ready;
      } catch {
        /* older engines: use whatever is loaded */
      }
      if (cancelled) return;

      const family =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--font-cormorant")
          .trim() || "Times New Roman, serif";

      const narrow = window.innerWidth < 820;
      const { createFabricText } = await import("@/webgl/fabricText");
      if (cancelled) return;

      handle = createFabricText({
        canvas: el,
        // On a phone the word breaks where its meaning already breaks.
        lines: narrow ? ["NO", "THING"] : ["NOTHING"],
        fontFamily: family,
        // The inflation radius is a fixed fraction of glyph size, so a
        // stem narrower than about twice it rounds into a tube and stops
        // reading as a letter. The heavier cut keeps the stems wide
        // enough to hold a flat face at phone scale.
        fontWeight: 700,
        color: [0.045, 0.045, 0.05],
        // Black cloth is read by its highlights, but only just: any
        // more and the specular outshines the base and it turns grey.
        sheen: 0.15,
        // The rim carries the whole silhouette once the plate behind
        // has opened, because by then it is a black word on a black
        // ground and nothing else separates the two.
        rim: [0.8, 0.82, 0.88],
        rimStrength: 0.34,
        shadow: 0.14,
        // A gutter, not a crop. See the fit in measure().
        overflow: narrow ? 0.94 : 0.9,
        maxHeight: narrow ? 1.3 : 0.92,
        quality: isTouch() || window.innerWidth < 820 ? "low" : "high",
      });

      if (!handle) return;
      fabric.current = handle;
      setWebglReady(true);
      handle.setPresence(0);
    };

    boot();
    return () => {
      cancelled = true;
      handle?.destroy();
      fabric.current = null;
    };
  }, []);

  // stop drawing once the word is behind you
  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: "#nothing",
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => fabric.current?.setActive(self.isActive),
    });
    return () => st.kill();
  }, []);

  const pin = usePinSection<HTMLDivElement>({
    length: 3.4,
    onProgress: (p) => {
      const still = prefersReducedMotion();
      fabric.current?.setProgress(p);

      // The plate opens on an iris while the camera is still
      // travelling, so you arrive at it rather than cut to it.
      const open = gsap.utils.clamp(0, 1, (p - 0.3) / 0.45);
      gsap.set(plate.current, {
        clipPath: iris(open),
        scale: still ? 1 : 1.32 - open * 0.3,
      });

      // The blade takes the last quarter.
      const slice = gsap.utils.clamp(0, 1, (p - 0.74) / 0.26);
      gsap.set(cut.current, {
        clipPath: blade(slice, "right"),
        opacity: slice > 0.001 ? 1 : 0,
      });

      const chrome = 1 - gsap.utils.clamp(0, 1, p / 0.2);
      gsap.set(ui.current, { opacity: chrome, y: (1 - chrome) * -26 });
      gsap.set(sub.current, {
        letterSpacing: `${0.5 + p * 1.7}em`,
        opacity: chrome,
      });

      if (!fabric.current) {
        gsap.set(fallback.current, {
          scale: still ? 1 : 1 + p * p * 3.2,
          opacity: 1 - gsap.utils.clamp(0, 1, (p - 0.5) / 0.35),
          letterSpacing: `${-0.02 + p * (still ? 0.12 : 0.4)}em`,
        });
      }
    },
  });

  useIsomorphicLayoutEffect(() => {
    const enter = () => {
      const reduced = prefersReducedMotion();
      const tl = gsap.timeline();

      if (fabric.current) {
        const presence = { v: 0 };
        tl.to(presence, {
          v: 1,
          duration: reduced ? 0.3 : 1.5,
          ease: "astra",
          onUpdate: () => fabric.current?.setPresence(presence.v),
        });
      } else {
        tl.fromTo(
          fallback.current,
          { opacity: 0, scale: 1.14, letterSpacing: "0.3em" },
          {
            opacity: 1,
            scale: 1,
            letterSpacing: "-0.02em",
            duration: reduced ? 0.3 : 1.6,
          },
        );
      }

      tl.fromTo(
        "[data-hero-ui]",
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 1.1, stagger: 0.09 },
        reduced ? 0 : 0.55,
      ).fromTo(
        sub.current,
        { opacity: 0, letterSpacing: "1.4em" },
        { opacity: 1, letterSpacing: "0.5em", duration: 1.5 },
        reduced ? 0 : 0.7,
      );
    };

    window.addEventListener("astra:enter", enter, { once: true });
    return () => window.removeEventListener("astra:enter", enter);
  }, []);

  return (
    <Chapter id="nothing" tone="light">
      <div
        ref={pin}
        className="relative h-[100svh] w-full overflow-hidden bg-paper"
      >
        {/* depth 01: what the camera arrives at */}
        <div
          ref={plate}
          className="absolute inset-0 will-change-transform"
          style={{ clipPath: iris(0) }}
        >
          {/* An object, and a dark one: the word in front is near-black,
              so any white in the ground swallows the letterforms. No
              `hard` either, that grade crushes an already low-key plate. */}
          <Plate name="chrono" sizes="100vw" priority quality={90} />
        </div>

        {/* depth 02: the material */}
        <canvas
          ref={canvas}
          className="absolute inset-0 h-full w-full"
          aria-hidden
        />

        {/* depth 02b: the same word in type, when WebGL is absent */}
        <div
          ref={fallback}
          aria-hidden={webglReady}
          className="pointer-events-none absolute inset-0 flex items-center justify-center will-change-transform"
          style={{
            opacity: webglReady ? 0 : 1,
            visibility: webglReady ? "hidden" : "visible",
          }}
        >
          <span
            className="display text-ink"
            style={{
              fontSize: "clamp(3rem,17vw,14rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            NOTHING
          </span>
        </div>

        <h1 className="sr-only">Astra, Volume One. Nothing is still.</h1>

        {/* depth 03: chrome */}
        <div ref={ui} className="absolute inset-0">
          <div
            ref={sub}
            data-hero-ui
            className="label absolute bottom-[24%] left-1/2 -translate-x-1/2 text-center whitespace-nowrap text-ink/75"
            style={{ letterSpacing: "0.5em" }}
          >
            Is still
          </div>

          <div className="edge absolute inset-x-0 bottom-[clamp(1.25rem,3.2vw,2.5rem)] flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
            <p
              data-hero-ui
              className="display-italic max-w-[24ch] text-ink/85"
              style={{ fontSize: "clamp(1.15rem,2vw,1.9rem)" }}
            >
              Twenty things, photographed against nothing.
            </p>

            <div
              data-hero-ui
              className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end sm:justify-start"
            >
              <span className="label text-ink/65">Scroll to enter</span>
              <span className="relative block h-10 w-px overflow-hidden bg-ink/15 sm:h-16">
                <span className="absolute inset-x-0 top-0 block h-5 animate-[cue_2.4s_cubic-bezier(0.76,0,0.24,1)_infinite] bg-ink" />
              </span>
            </div>
          </div>

          <div className="edge absolute inset-x-0 top-[clamp(4.5rem,9vw,7rem)] flex items-start justify-between">
            <span data-hero-ui className="label text-ink/65">
              Volume 01 — Object
            </span>
            <span data-hero-ui className="label hidden text-ink/65 sm:block">
              Nineteen studies
            </span>
          </div>
        </div>

        {/* depth 04: the cut that ends the section */}
        <div
          ref={cut}
          className="pointer-events-none absolute inset-0 bg-ink opacity-0"
          style={{ clipPath: blade(0, "right") }}
        />
      </div>
    </Chapter>
  );
}
