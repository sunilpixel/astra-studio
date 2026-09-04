"use client";

import { useRef } from "react";
import Chapter from "@/components/Chapter";
import { chapterNo, MOVEMENTS } from "@/lib/chapters";
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

const ELSEWHERE = [
  { label: "Instagram", href: "https://instagram.com" },
  { label: "Contact", href: "mailto:studio@astra.example" },
];

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
          <div className="absolute top-[38%] left-1/2 h-[34vmin] w-[34vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-signal/30" />
        </div>

        <div className="edge absolute inset-x-0 top-[clamp(5rem,10vw,8rem)] flex items-start justify-between">
          <span className="label text-ink/70">
            {chapterNo("still")} — Still
          </span>
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
          className="label absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center whitespace-nowrap text-ink opacity-0"
          style={{ letterSpacing: "1.1em" }}
        >
          Everything moves
        </div>

        {/* The CTA and the closing block share one bottom-anchored
            column. They used to be two absolutes at hand-picked offsets
            from the bottom, which meant the gap between them was a
            guess about the block's height, and on a short viewport the
            guess was wrong and they overlapped. */}
        <div className="edge absolute inset-x-0 bottom-[clamp(1.25rem,3.5vw,2.5rem)] flex flex-col items-center gap-[clamp(1.75rem,5vh,3.25rem)]">
          <div ref={cta} className="opacity-0">
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
                <svg
                  width="26"
                  height="8"
                  viewBox="0 0 26 8"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M0 4h24M20.5 0.5 24.5 4l-4 3.5"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                </svg>
              </span>
            </a>
          </div>

          {/* The closing block. It arrives with the CTA, on the same
            `end` progress, so the silence in the middle of the section
            stays silent and everything printed after the volume lands
            at once, the way the back of a book does. */}
          <div ref={credit} className="w-full opacity-0">
            <div className="mx-auto max-w-[92rem]">
              <div className="h-px w-full bg-rule-light" />

              <div className="grid gap-x-[clamp(1.5rem,4vw,4rem)] gap-y-6 pt-[clamp(1.25rem,2.5vw,2rem)] sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <h2 className="label text-ink/45">This volume</h2>
                  <p
                    className="display-italic mt-3 max-w-[22ch] text-ink/75"
                    style={{ fontSize: "clamp(0.95rem,1.1vw,1.1rem)" }}
                  >
                    Twenty objects, photographed against nothing.
                  </p>
                </div>

                <div>
                  <h2 className="label text-ink/45">Next</h2>
                  <p
                    className="display-italic mt-3 max-w-[22ch] text-ink/75"
                    style={{ fontSize: "clamp(0.95rem,1.1vw,1.1rem)" }}
                  >
                    Volume 02 — Surface, this winter.
                  </p>
                </div>

                <div>
                  <h2 className="label text-ink/45">Elsewhere</h2>
                  <ul className="mt-3 space-y-1.5">
                    {ELSEWHERE.map((l) => (
                      <li key={l.label}>
                        <a
                          href={l.href}
                          data-cursor="cta"
                          data-cursor-label="GO"
                          className="display-italic text-ink/75 transition-colors duration-500 hover:text-signal"
                          style={{ fontSize: "clamp(0.95rem,1.1vw,1.1rem)" }}
                        >
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="lg:text-right">
                  <h2 className="label text-ink/45">Studio</h2>
                  <address
                    className="display-italic mt-3 text-ink/75 not-italic"
                    style={{ fontSize: "clamp(0.95rem,1.1vw,1.1rem)" }}
                  >
                    Unit 4, Ashfield Works
                    <br />
                    London E2 — by appointment
                  </address>
                </div>
              </div>

              <div className="mt-[clamp(1.25rem,2.5vw,2rem)] flex flex-wrap items-end justify-between gap-4">
                <span className="label text-ink/45">
                  © 2026 Astra — Volume 01 / Object
                </span>
                <span className="label text-ink/45">
                  {MOVEMENTS} movements — one take
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Chapter>
  );
}
