"use client";

import { useRef } from "react";
import Plate from "@/components/Plate";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { useGsapContext } from "@/hooks/animation";
import { blade } from "@/lib/clip";
import type { PlateKey } from "@/lib/media";

/**
 * A full-screen transition between movements. Three angled blades cross
 * the viewport, one behind the other, all of them clip-paths:
 *
 *   1. a photograph sweeps in over the outgoing ground
 *   2. the incoming ground sweeps in over the photograph
 *   3. a hairline rides the leading edge of the cut
 *
 * They are offset, so at the midpoint you see three bands at once. The
 * word sits on top in difference blend and inverts itself as each band
 * passes under it. Nothing fades; the only animated property is shape.
 */
export default function Curtain({
  word,
  from,
  to,
  plate,
  note,
  dir = "right",
  /** peak letter-spacing, in em */
  spread = 0.9,
}: {
  word: string;
  from: "paper" | "ink";
  to: "paper" | "ink";
  plate: PlateKey;
  note?: string;
  dir?: "right" | "left";
  spread?: number;
}) {
  const image = useRef<HTMLDivElement>(null);
  const ground = useRef<HTMLDivElement>(null);
  const edge = useRef<HTMLDivElement>(null);
  const type = useRef<HTMLDivElement>(null);
  const meta = useRef<HTMLSpanElement>(null);

  const HEX = { paper: "#ffffff", ink: "#000000" } as const;

  const scope = useGsapContext<HTMLDivElement>((el) => {
    if (prefersReducedMotion()) {
      gsap.set([image.current, ground.current], { clipPath: blade(1, dir) });
      gsap.set(edge.current, { opacity: 0 });
      return;
    }

    // One scrubbed driver, three shapes read off it at three offsets.
    const state = { p: 0 };
    const at = (lag: number) =>
      gsap.utils.clamp(0, 1, (state.p - lag) / (1 - lag - 0.06));

    const paint = () => {
      gsap.set(image.current, { clipPath: blade(at(0), dir) });
      gsap.set(ground.current, { clipPath: blade(at(0.22), dir) });
      const lead = at(0.22);
      gsap.set(edge.current, {
        clipPath: blade(lead, dir),
        opacity: lead > 0.001 && lead < 0.999 ? 1 : 0,
      });
    };

    // The sticky panel is only locked to the viewport between the
    // section's top hitting the top of the screen and its bottom doing
    // the same. Scrub over exactly that window, or most of the progress
    // is spent below the fold and the blades have already crossed by
    // the time you can see them.
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    });

    // Peak tracking is a request, not a promise: a long word on a
    // narrow screen would open straight past both edges. Measure with
    // the tracking neutralised and spend only what is left. A function
    // value, so invalidateOnRefresh re-resolves it on resize and once
    // the real face has loaded.
    const fit = () => {
      const node = type.current;
      if (!node) return `${spread}em`;
      const held = node.style.letterSpacing;
      node.style.letterSpacing = "0em";
      const bare = node.scrollWidth;
      node.style.letterSpacing = held;

      const size = parseFloat(getComputedStyle(node).fontSize) || 16;
      const chars = Math.max(word.length, 1);
      // scale peaks at 1.04, and the frame keeps a 7% gutter each side
      const room = window.innerWidth * 0.86 - bare * 1.04;
      const peak = gsap.utils.clamp(0.04, spread, room / (chars * size * 1.04));
      return `${peak}em`;
    };

    tl.to(state, { p: 1, ease: "none", duration: 1, onUpdate: paint })
      .fromTo(
        type.current,
        { letterSpacing: "-0.02em", scale: 0.9 },
        { letterSpacing: fit, scale: 1.04, duration: 0.55, ease: "astra-io" },
        0,
      )
      .to(
        type.current,
        { letterSpacing: "0.12em", scale: 1, duration: 0.45, ease: "astra-io" },
        0.55,
      )
      .fromTo(meta.current, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.45);

    paint();
  });

  return (
    <div
      ref={scope}
      aria-hidden
      className="relative h-[220svh] w-full overflow-clip"
      style={{ backgroundColor: HEX[from] }}
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* blade 01: the photograph */}
        <div
          ref={image}
          className="absolute inset-0"
          style={{ clipPath: blade(0, dir) }}
        >
          <Plate name={plate} sizes="100vw" quality={75} hard />
        </div>

        {/* blade 02: the incoming ground */}
        <div
          ref={ground}
          className="absolute inset-0"
          style={{ backgroundColor: HEX[to], clipPath: blade(0, dir) }}
        />

        {/* blade 03: a hairline riding the cut */}
        <div
          ref={edge}
          className="absolute inset-0 opacity-0"
          style={{
            clipPath: blade(0, dir),
            // the signal colour, used here and almost nowhere else
            background: `linear-gradient(${dir === "right" ? 92 : 88}deg, transparent calc(100% - 2px), #ff2d16 calc(100% - 2px))`,
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div
            ref={type}
            className="display whitespace-nowrap text-paper mix-blend-difference will-change-transform select-none"
            style={{ fontSize: "clamp(1.5rem,6.4vw,5.5rem)", fontWeight: 600 }}
          >
            {word}
          </div>
        </div>

        {note && (
          <span
            ref={meta}
            className="label absolute bottom-[clamp(1.5rem,4vw,3rem)] left-1/2 -translate-x-1/2 text-paper opacity-0 mix-blend-difference"
          >
            {note}
          </span>
        )}
      </div>
    </div>
  );
}
