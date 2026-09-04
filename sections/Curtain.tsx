"use client";

import { useEffect, useRef } from "react";
import Plate from "@/components/Plate";
import {
  gsap,
  isTouch,
  prefersReducedMotion,
  ScrollTrigger,
} from "@/lib/gsap";
import { useGsapContext } from "@/hooks/animation";
import { blade } from "@/lib/clip";
import { CHAPTERS } from "@/lib/chapters";
import { scrollState } from "@/lib/scroll";
import type { PlateKey } from "@/lib/media";
import type { SnowHandle } from "@/webgl/snowfield";

/**
 * The part-title page between two movements.
 *
 * It was only ever a transition: three blades, a word, and then two
 * viewports of flat colour with nothing to look at. Long enough to feel
 * like a loading screen. So it now does the job a part-title page does
 * in a book, and announces what is coming: the number, the title, the
 * epigraph, the plate. The cut is the arrival of that card, not the
 * whole event.
 *
 * Three layers cross the frame, offset, so at the midpoint you are
 * looking at three bands at once:
 *
 *   1. a photograph sweeps in over the outgoing ground
 *   2. the incoming ground sweeps in over the photograph
 *   3. a hairline of signal rides its leading edge
 *
 * All three are the same blade at three different points, and `skew` is
 * what separates one join from the next: the angle of the cut changes
 * every time, which is a difference you feel without being told. Five
 * different clip families here reads as five unrelated effects; five
 * angles of the same cut reads as one film.
 *
 * The incoming ground is not a flat fill either. The dust that has been
 * hanging since Matter is in the air behind the card, clipped by the
 * same blade and tinted for whichever ground is arriving.
 */
export default function Curtain({
  word,
  from,
  to,
  plate,
  note,
  next,
  dir = "right",
  /** lean of the cut, in % of frame height. Different at every join. */
  skew = 26,
  /** peak letter-spacing, in em */
  spread = 0.9,
}: {
  word: string;
  from: "paper" | "ink";
  to: "paper" | "ink";
  plate: PlateKey;
  note?: string;
  /** id of the movement this join is announcing */
  next: string;
  dir?: "right" | "left";
  skew?: number;
  spread?: number;
}) {
  const image = useRef<HTMLDivElement>(null);
  const ground = useRef<HTMLDivElement>(null);
  const edge = useRef<HTMLDivElement>(null);
  const type = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const rule = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const air = useRef<HTMLCanvasElement>(null);
  const dust = useRef<SnowHandle | null>(null);

  const HEX = { paper: "#ffffff", ink: "#000000" } as const;
  const chapter = CHAPTERS.find((c) => c.id === next);

  useEffect(() => {
    const canvas = air.current;
    if (!canvas || prefersReducedMotion()) return;

    let handle: SnowHandle | null = null;
    let cancelled = false;

    import("@/webgl/snowfield").then(({ createSnowfield }) => {
      if (cancelled || !air.current) return;
      handle = createSnowfield({
        back: air.current,
        quality: isTouch() || window.innerWidth < 820 ? "low" : "high",
        // The motes have to be the opposite of the ground arriving, not
        // of the one being left behind.
        ...(to === "ink"
          ? { tint: [255, 253, 248] as [number, number, number], sizeScale: 0.8 }
          : { tint: [10, 10, 12] as [number, number, number], sizeScale: 0.4 }),
      });
      handle.setDensity(0);
      dust.current = handle;
    });

    const pump = () => dust.current?.setVelocity(scrollState.velocity);
    gsap.ticker.add(pump);

    // The whole section, not the ground div: that one lives inside the
    // sticky panel, so its own start and end resolve against the panel
    // rather than the page.
    const section = canvas.closest("[data-curtain]");
    if (!section) return;

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => dust.current?.setActive(self.isActive),
    });

    return () => {
      cancelled = true;
      st.kill();
      gsap.ticker.remove(pump);
      handle?.destroy();
      dust.current = null;
    };
  }, [to]);

  const scope = useGsapContext<HTMLDivElement>((el) => {
    const lines = el.querySelectorAll("[data-card]");

    if (prefersReducedMotion()) {
      gsap.set([image.current, ground.current], {
        clipPath: blade(1, dir, skew),
      });
      gsap.set(edge.current, { opacity: 0 });
      gsap.set([lines, rule.current, frame.current], {
        autoAlpha: 1,
        yPercent: 0,
        scaleX: 1,
      });
      return;
    }

    // One scrubbed driver, three shapes read off it at three offsets.
    const state = { p: 0 };
    const at = (lag: number) =>
      gsap.utils.clamp(0, 1, (state.p - lag) / (1 - lag - 0.06));

    const paint = () => {
      gsap.set(image.current, { clipPath: blade(at(0), dir, skew) });
      const lead = at(0.22);
      gsap.set(ground.current, { clipPath: blade(lead, dir, skew) });
      gsap.set(edge.current, {
        clipPath: blade(lead, dir, skew),
        opacity: lead > 0.001 && lead < 0.999 ? 1 : 0,
      });

      // The air thickens behind the blade as it crosses and thins out
      // again before the section hands over, so the dust belongs to the
      // cut rather than sitting on top of it.
      const leave = gsap.utils.clamp(0, 1, (state.p - 0.86) / 0.14);
      dust.current?.setDensity(
        gsap.utils.clamp(0, 1, lead * 1.7) * (1 - leave),
      );
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
        { letterSpacing: fit, scale: 1.04, duration: 0.5, ease: "astra-io" },
        0,
      )
      // The word gives the card its room rather than leaving: it closes
      // up and lifts, and what was behind it is the announcement.
      .to(
        type.current,
        {
          letterSpacing: "0.1em",
          scale: 0.86,
          yPercent: -46,
          duration: 0.4,
          ease: "astra-io",
        },
        0.5,
      )
      // the card, once the ground has finished crossing
      .fromTo(
        rule.current,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.25, ease: "astra-io" },
        0.56,
      )
      .fromTo(
        lines,
        { yPercent: 130, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.3,
          stagger: 0.055,
          ease: "astra",
        },
        0.6,
      )
      .fromTo(
        frame.current,
        { clipPath: blade(0, dir, skew), scale: 1.14 },
        {
          clipPath: blade(1, dir, skew),
          scale: 1,
          duration: 0.34,
          ease: "astra-io",
        },
        0.64,
      );

    paint();
  });

  return (
    <div
      ref={scope}
      data-curtain
      className="relative h-[220svh] w-full overflow-clip"
      style={{ backgroundColor: HEX[from] }}
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* 01: the photograph */}
        <div
          ref={image}
          className="absolute inset-0"
          style={{ clipPath: blade(0, dir, skew) }}
        >
          <Plate name={plate} sizes="100vw" quality={75} hard />
        </div>

        {/* 02: the signal, sitting under the ground at a fractionally
            larger scale so all that survives of it is a rim on the
            leading edge of the cut */}
        <div
          ref={edge}
          className="absolute inset-0 opacity-0"
          style={{
            clipPath: blade(0, dir, skew),
            backgroundColor: "#ff2d16",
            transform: "scale(1.007)",
          }}
        />

        {/* 03: the incoming ground, with its own air in it */}
        <div
          ref={ground}
          className="absolute inset-0"
          style={{ backgroundColor: HEX[to], clipPath: blade(0, dir, skew) }}
        >
          <canvas ref={air} className="absolute inset-0 h-full w-full" />
        </div>

        {/* the word, which lifts to make room for the card */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div
            ref={type}
            className="display text-paper mix-blend-difference will-change-transform select-none whitespace-nowrap"
            style={{ fontSize: "clamp(1.5rem,6.4vw,5.5rem)", fontWeight: 600 }}
          >
            {word}
          </div>
        </div>

        {/* the card */}
        <div
          ref={card}
          className="edge absolute inset-x-0 bottom-[clamp(3rem,12vh,7rem)] text-paper mix-blend-difference"
        >
          <div className="mx-auto max-w-[92rem]">
            <div
              ref={rule}
              className="h-px w-full origin-left bg-current opacity-45"
              style={{ transform: "scaleX(0)" }}
            />

            <div className="grid items-end gap-x-[clamp(1.5rem,4vw,3.5rem)] gap-y-6 pt-[clamp(1rem,2.4vw,1.75rem)] sm:grid-cols-[auto_minmax(0,1fr)_auto]">
              <div className="line-mask">
                <span data-card className="label block opacity-60">
                  Next
                </span>
              </div>

              <div>
                <div className="line-mask">
                  <span
                    data-card
                    className="display block leading-none"
                    style={{ fontSize: "clamp(1.5rem,3.6vw,3rem)" }}
                  >
                    <span className="tabular-nums opacity-45">
                      {chapter?.index}
                    </span>
                    <span className="px-[0.35em] opacity-45">/</span>
                    {chapter?.title}
                  </span>
                </div>
                {note && (
                  <div className="line-mask mt-3">
                    <span
                      data-card
                      className="display-italic block opacity-70"
                      style={{ fontSize: "clamp(0.95rem,1.3vw,1.2rem)" }}
                    >
                      {note}
                    </span>
                  </div>
                )}
              </div>

              {/* the plate again, this time as a frame you can look at */}
              <div
                ref={frame}
                className="hidden aspect-3/2 w-[clamp(7rem,14vw,12rem)] overflow-hidden lg:block"
                style={{ clipPath: blade(0, dir, skew) }}
              >
                <div className="relative h-full w-full">
                  <Plate name={plate} sizes="14vw" quality={60} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
