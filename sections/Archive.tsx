"use client";

import { useEffect, useRef } from "react";
import Chapter from "@/components/Chapter";
import { chapterNo } from "@/lib/chapters";
import Plate from "@/components/Plate";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { usePinSection } from "@/hooks/animation";
import type { PlateKey } from "@/lib/media";

// Prints on a table, not cards in a grid: each one arrives at its own
// speed, lands off square, and covers part of the one before it. The
// camera pulls back while they land, so the last beat is the pile
// resolving rather than another arrival.

type Card = {
  plate: PlateKey;
  ref: string;
  caption: string;
  /** resting place, in vmin, measured from the centre of the table */
  x: number;
  y: number;
  rot: number;
  /** width in vmin, so the pile keeps its proportions everywhere */
  w: number;
  /** when this print lands, as a fraction of the pin */
  at: number;
  ratio: string;
};

const CARDS: Card[] = [
  { plate: "ceramic", ref: "A-01", caption: "Unglazed, four", x: -46, y: -6, rot: -4.5, w: 40, at: 0.02, ratio: "4/5" },
  { plate: "salve", ref: "A-02", caption: "Case and contents", x: 8, y: 12, rot: 3.2, w: 36, at: 0.16, ratio: "3/4" },
  { plate: "flat", ref: "A-03", caption: "Sample, unmarked", x: -18, y: 22, rot: -1.6, w: 27, at: 0.31, ratio: "1/1" },
  { plate: "carry", ref: "A-04", caption: "Soft body, no frame", x: 44, y: -16, rot: 5.4, w: 30, at: 0.46, ratio: "4/5" },
  { plate: "relief", ref: "A-05", caption: "Raking light, 15°", x: 24, y: 26, rot: 2.1, w: 26, at: 0.6, ratio: "3/4" },
];

export default function Archive() {
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const stage = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLDivElement>(null);
  // A phone is a smaller table: the prints keep their size and give up
  // their spread, so it reads as a tighter stack rather than a shrunk
  // version of the desktop layout.
  const spread = useRef(1);

  useEffect(() => {
    const fit = () => {
      spread.current = window.innerWidth < 820 ? 0.44 : 1;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const pin = usePinSection<HTMLDivElement>({
    length: 4,
    onProgress: (p) => {
      const still = prefersReducedMotion();
      CARDS.forEach((c, i) => {
        const el = cards.current[i];
        if (!el) return;
        // Each print gets its own 34% of the pin to travel in.
        const t = still ? 1 : gsap.utils.clamp(0, 1, (p - c.at) / 0.34);
        const eased = 1 - Math.pow(1 - t, 3);
        gsap.set(el, {
          x: `${c.x * eased * spread.current}vmin`,
          y: `${100 - (100 - c.y * spread.current) * eased}vmin`,
          rotate: c.rot * eased,
          opacity: t > 0.001 ? 1 : 0,
          // Still moving means a longer shadow.
          filter: `drop-shadow(0 ${24 * (1 - eased) + 8}px ${
            40 * (1 - eased) + 20
          }px rgba(0,0,0,${0.26 + 0.16 * (1 - eased)}))`,
        });
      });

      const back = still ? 1 : gsap.utils.clamp(0, 1, (p - 0.4) / 0.5);
      gsap.set(stage.current, {
        scale: still ? 0.84 : 1.2 - back * 0.36,
        yPercent: still ? 0 : -back * 2,
        rotate: still ? 0 : -back * 1.2,
      });

      gsap.set(title.current, {
        opacity: 1 - gsap.utils.clamp(0, 1, p / 0.5),
        yPercent: -gsap.utils.clamp(0, 1, p / 0.5) * 30,
      });
    },
  });

  return (
    <Chapter id="archive" tone="light">
      <div
        ref={pin}
        className="relative h-[100svh] w-full overflow-hidden bg-paper text-ink"
      >
        <div className="edge absolute inset-x-0 top-[clamp(5rem,10vw,8rem)] z-40 flex items-start justify-between">
          <span className="label text-ink/70">{chapterNo("archive")} — Archive</span>
          <span className="label hidden text-ink/70 sm:block">
            Five prints / one table
          </span>
        </div>

        <div
          ref={title}
          className="edge pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
        >
          <span
            className="display text-ink/20 select-none"
            style={{ fontSize: "clamp(4rem,19vw,17rem)", fontWeight: 600 }}
          >
            Archive
          </span>
        </div>
        <h2 className="sr-only">Archive</h2>

        <div
          ref={stage}
          className="absolute inset-0 flex items-center justify-center will-change-transform"
        >
          {CARDS.map((c, i) => (
            <div
              key={c.ref}
              ref={(n) => {
                cards.current[i] = n;
              }}
              data-cursor="view"
              className="absolute opacity-0 will-change-transform"
              style={{ width: `${c.w}vmin`, zIndex: 10 + i }}
            >
              <div
                className="relative overflow-hidden bg-paper"
                style={{ aspectRatio: c.ratio }}
              >
                <Plate
                  name={c.plate}
                  sizes="(max-width: 768px) 60vw, 34vw"
                  quality={75}
                />
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <span className="label text-ink/80">{c.ref}</span>
                <span className="label truncate text-ink/55">{c.caption}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Chapter>
  );
}
