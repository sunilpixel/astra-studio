"use client";

import { useRef } from "react";
import Chapter from "@/components/Chapter";
import { chapterNo } from "@/lib/chapters";
import Plate from "@/components/Plate";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { usePinSection } from "@/hooks/animation";
import { iris } from "@/lib/clip";

/**
 * The word does not animate out, it falls. Each letter gets its own
 * mass, release and spin, and all six obey the same rule: displacement
 * grows with the square of time. Nothing eases back. Behind them an
 * iris opens onto the photograph the word was standing in front of.
 */

const LETTERS = [
  // release, mass (fall rate), spin, lateral drift
  { ch: "W", at: 0.3, mass: 1.0, spin: -5, drift: -3 },
  { ch: "E", at: 0.18, mass: 1.25, spin: 3.5, drift: 2 },
  { ch: "I", at: 0.1, mass: 1.5, spin: -8, drift: -5 },
  { ch: "G", at: 0.22, mass: 1.15, spin: 2.5, drift: 4 },
  { ch: "H", at: 0.14, mass: 1.35, spin: -3, drift: -2 },
  { ch: "T", at: 0.05, mass: 1.7, spin: 6.5, drift: 6 },
];

export default function Weight() {
  const letters = useRef<(HTMLSpanElement | null)[]>([]);
  const plate = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const after = useRef<HTMLDivElement>(null);

  const pin = usePinSection<HTMLDivElement>({
    length: 3.4,
    onProgress: (p) => {
      const still = prefersReducedMotion();

      LETTERS.forEach((l, i) => {
        const el = letters.current[i];
        if (!el) return;

        // Before release it only sags, the way something heavy does
        // before the fixing gives way.
        const strain = still ? 0 : gsap.utils.clamp(0, 1, p / l.at);
        const t = still
          ? 0
          : gsap.utils.clamp(0, 1, (p - l.at) / (0.72 - l.at * 0.4));

        const fall = t * t * 165 * l.mass; // vh, quadratic
        gsap.set(el, {
          yPercent: strain * 4 + fall,
          rotate: t * t * l.spin,
          xPercent: t * l.drift,
          scaleY: 1 + strain * 0.05 - t * 0.04,
          opacity: t > 0.94 ? 0 : 1,
        });
      });

      // Uncovered, not faded in: it was always behind the word.
      const open = gsap.utils.clamp(0, 1, (p - 0.16) / 0.6);
      gsap.set(plate.current, { clipPath: iris(open) });
      gsap.set(inner.current, { scale: still ? 1 : 1.26 - open * 0.24 });

      const late = gsap.utils.clamp(0, 1, (p - 0.78) / 0.22);
      gsap.set(after.current, { opacity: late, y: (1 - late) * 26 });
    },
  });

  return (
    <Chapter id="weight" tone="dark">
      <div
        ref={pin}
        className="relative h-[100svh] w-full overflow-hidden bg-ink"
      >
        <div
          ref={plate}
          className="absolute inset-0"
          style={{ clipPath: iris(0) }}
        >
          <div ref={inner} className="absolute inset-0 will-change-transform">
            <Plate name="ember" sizes="100vw" quality={90} hard />
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="display flex text-paper mix-blend-difference select-none"
            style={{ fontSize: "clamp(4rem,20vw,18rem)", fontWeight: 700 }}
            aria-hidden
          >
            {LETTERS.map((l, i) => (
              <span
                key={l.ch + i}
                ref={(n) => {
                  letters.current[i] = n;
                }}
                className="inline-block will-change-transform"
              >
                {l.ch}
              </span>
            ))}
          </div>
        </div>
        <h2 className="sr-only">Weight</h2>

        <div className="edge absolute inset-x-0 bottom-[clamp(1.5rem,4vw,3rem)]">
          <div
            ref={after}
            className="flex flex-col gap-4 opacity-0 sm:flex-row sm:items-end sm:justify-between sm:gap-8"
          >
            <p
              className="display-italic max-w-[28ch] text-paper/90"
              style={{ fontSize: "clamp(1.05rem,1.6vw,1.5rem)" }}
            >
              Everything holds until it doesn&apos;t. Then it holds
              nothing at all.
            </p>
            <span className="label shrink-0 text-paper/70">{chapterNo("weight")} — Weight</span>
          </div>
        </div>
      </div>
    </Chapter>
  );
}
