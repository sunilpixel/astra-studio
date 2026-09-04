"use client";

import { useRef } from "react";
import Chapter from "@/components/Chapter";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { scrollTo } from "@/lib/scroll";
import { usePinSection, useMagnetic } from "@/hooks/animation";
import { iris } from "@/lib/clip";

/**
 * White, and one word that is not going to stay. It bends first, a slow
 * catenary through the middle of the line, then the letters let go from
 * the outside in. The full stop weighs nothing, so it goes last.
 */

const CHARS = ["S", "t", "i", "l", "l", "."];
// release order: outer letters first, the full stop last of all
const RELEASE = [0.34, 0.42, 0.5, 0.46, 0.38, 0.66];
const MASS = [1.2, 1.05, 0.9, 1.1, 1.3, 0.7];
const SPIN = [-6, 4, -3, 5, -8, 12];

export default function Still() {
  const chars = useRef<(HTMLSpanElement | null)[]>([]);
  const coda = useRef<HTMLDivElement>(null);
  const cta = useRef<HTMLDivElement>(null);
  const credit = useRef<HTMLDivElement>(null);
  const halo = useRef<HTMLDivElement>(null);
  const magnet = useMagnetic<HTMLAnchorElement>(0.42, 130);

  const pin = usePinSection<HTMLDivElement>({
    length: 4,
    onProgress: (p) => {
      const still = prefersReducedMotion();

      CHARS.forEach((_, i) => {
        const el = chars.current[i];
        if (!el) return;

        const bendT = still ? 0 : gsap.utils.clamp(0, 1, p / 0.32);
        const curve = Math.sin((i / (CHARS.length - 1)) * Math.PI);
        const sag = bendT * curve * 4.2;

        const t = still ? 0 : gsap.utils.clamp(0, 1, (p - RELEASE[i]) / 0.34);
        const fall = t * t * 140 * MASS[i];

        gsap.set(el, {
          yPercent: sag + fall,
          rotate:
            bendT * curve * 2 * (i / (CHARS.length - 1) - 0.5) * 2 +
            t * t * SPIN[i],
          scaleY: 1 + bendT * curve * 0.06 - t * 0.05,
          opacity: t > 0.95 ? 0 : 1,
        });
      });

      // Then a single line, opening on an iris.
      const quiet = gsap.utils.clamp(0, 1, (p - 0.78) / 0.12);
      gsap.set(coda.current, {
        opacity: quiet,
        letterSpacing: `${1.1 - quiet * 0.66}em`,
      });
      gsap.set(halo.current, { clipPath: iris(quiet, 50, 50) });

      const end = gsap.utils.clamp(0, 1, (p - 0.88) / 0.12);
      gsap.set(cta.current, { opacity: end, y: (1 - end) * 22 });
      gsap.set(credit.current, { opacity: end });
    },
  });

  return (
    <Chapter id="still" tone="light">
      <div
        ref={pin}
        className="relative flex h-[100svh] w-full flex-col items-center justify-center overflow-hidden bg-paper text-ink"
      >
        {/* a single ring of signal, opening behind the last line */}
        <div
          ref={halo}
          className="pointer-events-none absolute inset-0"
          style={{ clipPath: iris(0) }}
          aria-hidden
        >
          <div className="absolute top-1/2 left-1/2 h-[46vmin] w-[46vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-signal/30" />
        </div>

        <div className="edge absolute inset-x-0 top-[clamp(5rem,10vw,8rem)] flex items-start justify-between">
          <span className="label text-ink/70">11 — Still</span>
          <span className="label hidden text-ink/70 sm:block">
            End of volume
          </span>
        </div>

        <div
          className="display flex select-none"
          style={{ fontSize: "clamp(4rem,24vw,22rem)", fontWeight: 600 }}
          aria-hidden
        >
          {CHARS.map((c, i) => (
            <span
              key={c + i}
              ref={(n) => {
                chars.current[i] = n;
              }}
              className="inline-block will-change-transform"
            >
              {c}
            </span>
          ))}
        </div>
        <h2 className="sr-only">Still</h2>

        <div
          ref={coda}
          className="label absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-10 text-center whitespace-nowrap text-ink opacity-0"
          style={{ letterSpacing: "1.1em" }}
        >
          Everything moves
        </div>

        <div
          ref={cta}
          className="absolute bottom-[clamp(5rem,14vh,9rem)] left-1/2 -translate-x-1/2 opacity-0"
        >
          <a
            ref={magnet}
            href="#nothing"
            data-cursor="cta"
            data-cursor-label="AGAIN"
            onClick={(e) => {
              e.preventDefault();
              scrollTo(0, { duration: 2.4 });
            }}
            className="group inline-flex items-center gap-4 border-b border-ink/25 pb-3 will-change-transform"
          >
            <span
              data-magnetic-inner
              className="label text-ink transition-[letter-spacing] duration-700 group-hover:tracking-[0.62em]"
            >
              Enter again
            </span>
            <span className="block text-signal transition-transform duration-700 group-hover:translate-x-1.5 group-hover:-rotate-45">
              {/* hairline arrow */}
              <svg width="26" height="8" viewBox="0 0 26 8" fill="none" aria-hidden>
                <path
                  d="M0 4h24M20.5 0.5 24.5 4l-4 3.5"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
            </span>
          </a>
        </div>

        <div
          ref={credit}
          className="edge absolute inset-x-0 bottom-[clamp(1.5rem,4vw,3rem)] flex flex-wrap items-end justify-between gap-4 opacity-0"
        >
          <span className="label text-ink/60">Astra — Volume 01 / Object</span>
          <span className="label text-ink/60">Eleven movements — one take</span>
        </div>
      </div>
    </Chapter>
  );
}
