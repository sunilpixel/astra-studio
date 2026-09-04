"use client";

import { useRef } from "react";
import Chapter from "@/components/Chapter";
import { chapterNo } from "@/lib/chapters";
import Plate from "@/components/Plate";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { usePinSection } from "@/hooks/animation";
import { blade } from "@/lib/clip";
import type { PlateKey } from "@/lib/media";

/**
 * The longest hold on the site: one viewport, five movements, the
 * scroll wheel acting as a transport control. Each movement cuts in on
 * a blade, alternating direction so it reads as a series of cuts and
 * not a stack of dissolves. The last one slows to almost nothing before
 * the pin lets go.
 *
 * No React state. Every value is a function of one scrub value, which
 * is why five simultaneous transitions cost the same as one.
 */

type Stage = {
  plate: PlateKey;
  index: string;
  line: [string, string];
  meta: string;
  ground: string;
  dir: "left" | "right";
  drift: [number, number];
  zoom: number;
};

const STAGES: Stage[] = [
  {
    plate: "vessel",
    index: "I",
    line: ["Put it down", "and step back."],
    meta: "Plate 01 — seamless",
    ground: "#000000",
    dir: "right",
    drift: [-4, 0],
    zoom: 1.18,
  },
  {
    plate: "dial",
    index: "II",
    line: ["Turn the light", "until it argues."],
    meta: "Plate 02 — one head, gridded",
    ground: "#000000",
    dir: "left",
    drift: [3, -3],
    zoom: 1.14,
  },
  {
    plate: "petal",
    index: "III",
    line: ["Add one thing", "that does not belong."],
    meta: "Plate 03 — dressed",
    ground: "#000000",
    dir: "right",
    drift: [-2, 4],
    zoom: 1.22,
  },
  {
    plate: "noir",
    index: "IV",
    line: ["Take away", "everything else."],
    meta: "Plate 04 — stripped",
    ground: "#ffffff",
    dir: "left",
    drift: [5, 2],
    zoom: 1.1,
  },
  {
    plate: "decanted",
    index: "V",
    line: ["And then,", "nothing again."],
    meta: "Plate 05 — final",
    ground: "#ffffff",
    dir: "right",
    drift: [0, -2],
    zoom: 1.06,
  },
];

export default function Passage() {
  const layers = useRef<(HTMLDivElement | null)[]>([]);
  const plates = useRef<(HTMLDivElement | null)[]>([]);
  const blocks = useRef<(HTMLDivElement | null)[]>([]);
  const ground = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  const pin = usePinSection<HTMLDivElement>({
    length: 6,
    onProgress: (p) => {
      const still = prefersReducedMotion();
      // The last sixth decelerates, so the section ends on a held frame.
      const eased =
        p < 0.84 ? p : 0.84 + (1 - Math.pow(1 - (p - 0.84) / 0.16, 2)) * 0.16;
      const pos = eased * STAGES.length; // 0 .. 5

      STAGES.forEach((s, i) => {
        const layer = layers.current[i];
        const plate = plates.current[i];
        const block = blocks.current[i];
        if (!layer || !plate || !block) return;

        // How far this movement's blade has crossed.
        const cut = gsap.utils.clamp(0, 1, (pos - i) / 0.62);
        const life = gsap.utils.clamp(0, 1, pos - i);

        gsap.set(layer, {
          clipPath: blade(cut, s.dir),
          zIndex: 10 + i,
          visibility: pos > i - 0.2 ? "visible" : "hidden",
        });
        gsap.set(plate, {
          scale: still ? 1 : s.zoom - life * (s.zoom - 1.0),
          xPercent: still ? 0 : s.drift[0] * life,
          yPercent: still ? 0 : s.drift[1] * life,
        });

        // Type arrives after its plate and leaves before the next.
        const inT = gsap.utils.clamp(0, 1, (pos - i - 0.18) / 0.3);
        const outT = gsap.utils.clamp(0, 1, (pos - i - 0.74) / 0.26);
        gsap.set(block, {
          zIndex: 40 + i,
          opacity: inT * (1 - outT),
          yPercent: (1 - inT) * 55 - outT * 45,
          visibility: inT > 0 && outT < 1 ? "visible" : "hidden",
        });
      });

      const i0 = Math.min(STAGES.length - 1, Math.floor(pos));
      gsap.set(ground.current, { backgroundColor: STAGES[i0].ground });
      gsap.set(bar.current, { scaleX: eased });
    },
  });

  return (
    <Chapter id="passage" tone="dark">
      <div ref={pin} className="relative h-[100svh] w-full overflow-hidden">
        <div ref={ground} className="absolute inset-0 bg-paper" />

        {STAGES.map((s, i) => (
          <div
            key={s.index}
            ref={(n) => {
              layers.current[i] = n;
            }}
            className="absolute inset-0 overflow-hidden will-change-[clip-path]"
            style={{ clipPath: blade(0, s.dir), visibility: "hidden" }}
          >
            <div
              ref={(n) => {
                plates.current[i] = n;
              }}
              className="absolute inset-0 will-change-transform"
            >
              <Plate name={s.plate} sizes="100vw" quality={75} hard />
            </div>
            {/* the type is always light, so the plate is always dark */}
            <div className="absolute inset-0 bg-ink/55" />
          </div>
        ))}

        {STAGES.map((s, i) => (
          <div
            key={s.index}
            ref={(n) => {
              blocks.current[i] = n;
            }}
            className="edge absolute inset-0 flex flex-col justify-center will-change-transform"
            style={{ visibility: "hidden", opacity: 0 }}
            aria-hidden
          >
            <div className="mx-auto w-full max-w-[80rem]">
              <span
                className="display-italic block text-signal"
                style={{ fontSize: "clamp(1rem,2vw,1.6rem)" }}
              >
                {s.index}
              </span>
              <h3
                className="display mt-3 text-paper"
                style={{ fontSize: "clamp(2.1rem,6.6vw,5.8rem)" }}
              >
                {s.line[0]}
                <br />
                {s.line[1]}
              </h3>
              <span className="label mt-6 block text-paper/70">{s.meta}</span>
            </div>
          </div>
        ))}

        <h2 className="sr-only">Passage</h2>

        <div className="edge absolute inset-x-0 bottom-[clamp(1.5rem,4vw,3rem)] z-50">
          <div className="flex items-center gap-4 mix-blend-difference">
            <span className="label shrink-0 text-paper">{chapterNo("passage")} — Passage</span>
            <span className="relative h-px flex-1 bg-paper/25">
              <span
                ref={bar}
                className="absolute inset-0 origin-left bg-paper"
                style={{ transform: "scaleX(0)" }}
              />
            </span>
            <span className="label shrink-0 text-paper">V</span>
          </div>
        </div>
      </div>
    </Chapter>
  );
}
