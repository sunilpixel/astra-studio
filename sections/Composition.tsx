"use client";

import { useRef } from "react";
import Chapter from "@/components/Chapter";
import Plate from "@/components/Plate";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { usePinSection } from "@/hooks/animation";
import { chevron } from "@/lib/clip";

// Three frames arrive from three directions and stop edge to edge as
// one image. Each is unmasked by a chevron on the way in, so they are
// cut into the page rather than slid onto it. The type never moves.
export default function Composition() {
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);
  const drop = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLDivElement>(null);
  const rule = useRef<HTMLDivElement>(null);
  const meta = useRef<HTMLDivElement>(null);

  const pin = usePinSection<HTMLDivElement>({
    length: 3.2,
    onProgress: (p) => {
      const still = prefersReducedMotion();
      // Arrival takes two thirds. The last third is just the
      // composition holding, which is what makes it land.
      const t = still ? 1 : gsap.utils.clamp(0, 1, p / 0.68);
      const e = 1 - Math.pow(1 - t, 3);

      gsap.set(left.current, {
        xPercent: -108 + 108 * e,
        rotate: -3 + 3 * e,
        clipPath: chevron(Math.min(1, e * 1.3), "right"),
      });
      gsap.set(right.current, {
        xPercent: 108 - 108 * e,
        rotate: 3 - 3 * e,
        clipPath: chevron(Math.min(1, e * 1.3), "left"),
      });
      gsap.set(drop.current, {
        yPercent: -112 + 112 * e,
        scale: still ? 1 : 1.16 - 0.16 * e,
        clipPath: chevron(Math.min(1, e * 1.3), "down"),
      });

      // The type tracks closed only as the sides close in on it.
      gsap.set(words.current, {
        letterSpacing: `${0.55 - e * 0.5}em`,
        opacity: 0.25 + e * 0.75,
      });

      const lock = still ? 1 : gsap.utils.clamp(0, 1, (p - 0.7) / 0.3);
      gsap.set(rule.current, { scaleX: lock });
      gsap.set(meta.current, { opacity: lock, y: (1 - lock) * 18 });
    },
  });

  return (
    <Chapter id="composition" tone="dark">
      <div
        ref={pin}
        className="relative h-[100svh] w-full overflow-hidden bg-ink"
      >
        <div className="absolute inset-0 grid grid-rows-3 md:grid-cols-3 md:grid-rows-1">
          <div
            ref={left}
            className="relative h-full overflow-hidden will-change-transform"
          >
            <Plate name="worn" sizes="34vw" quality={75} />
          </div>
          <div
            ref={drop}
            className="relative h-full overflow-hidden will-change-transform"
          >
            <Plate name="hold" sizes="34vw" quality={75} />
          </div>
          <div
            ref={right}
            className="relative h-full overflow-hidden will-change-transform"
          >
            <Plate name="facet" sizes="34vw" quality={75} />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 bg-ink/45" />

        <div className="edge pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <div
            ref={words}
            className="display text-paper"
            style={{ fontSize: "clamp(2.6rem,9vw,8rem)", fontWeight: 600 }}
          >
            <span className="block">One</span>
            <span className="block">Frame</span>
          </div>
          <div
            ref={rule}
            className="mt-8 h-px w-[min(28rem,60vw)] origin-center bg-signal"
            style={{ transform: "scaleX(0)" }}
          />
          <div ref={meta} className="mt-6 opacity-0">
            <span className="label text-paper/80">
              06 — Three negatives, one decision
            </span>
          </div>
        </div>
        <h2 className="sr-only">One frame</h2>
      </div>
    </Chapter>
  );
}
