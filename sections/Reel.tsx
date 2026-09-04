"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Chapter from "@/components/Chapter";
import Plate from "@/components/Plate";
import { gsap, Observer, prefersReducedMotion } from "@/lib/gsap";
import { blade, chevron, iris, shutter, slit } from "@/lib/clip";
import type { PlateKey } from "@/lib/media";

/**
 * A magazine turning into another photograph, not a carousel.
 *
 * The incoming frame occupies exactly the same rectangle as the
 * outgoing one and is revealed through a mask belonging to that slide:
 * blade, chevron, iris, shutter, slit, one per study. Nothing
 * cross-fades. The old picture stays opaque while it is covered and
 * pushes back a little, as though the page had weight.
 */

type Shape = "blade" | "chevron" | "iris" | "shutter" | "slit";

/**
 * Every plate here is landscape, because the frame is 3/2 and
 * `object-cover` pays for the difference. Four of these used to be
 * portrait: at 0.67 in a 1.5 frame the crop was eating more than half
 * the picture. See the aspect table in lib/media.
 */
type Slide = {
  index: string;
  title: [string, string];
  plate: PlateKey;
  place: string;
  time: string;
  note: string;
  shape: Shape;
  /**
   * The plate was shot on the same black this section is set on, so it
   * needs no blend and no crop: it is contained, and its ground is
   * indistinguishable from the frame. Measured at the edges, only
   * `dial` (1) and `void` (20) qualify. Everything else in the manifest
   * was shot on something you can see.
   */
  cut?: boolean;
};

const SLIDES: Slide[] = [
  {
    index: "01",
    title: ["A Weight", "in the Hand."],
    plate: "dial",
    place: "Steel, 316L",
    time: "f/11 — 1/125",
    note: "Nine hundred parts, and it still only does one thing.",
    shape: "blade",
    cut: true,
  },
  {
    index: "02",
    title: ["A Language", "of Clay."],
    plate: "ceramic",
    place: "Unglazed, six",
    time: "f/8 — 1/60",
    note: "Six went into the kiln. No two came out agreeing about it.",
    shape: "chevron",
  },
  {
    index: "03",
    title: ["Glass, and", "What It Holds."],
    plate: "decanted",
    place: "Pair, 100ml each",
    time: "f/16 — 1/200",
    note: "Photographing a transparent object is photographing its edges.",
    shape: "iris",
  },
  {
    index: "04",
    title: ["A Stone,", "Cut Once."],
    plate: "stone",
    place: "Set, four claws",
    time: "f/22 — 1/80",
    note: "Everything expensive about it happened in a single afternoon.",
    shape: "shutter",
  },
  {
    index: "05",
    title: ["A Case, and", "What Was In It."],
    plate: "salve",
    place: "Aluminium, 40ml",
    time: "f/9 — 1/160",
    note: "Nothing underneath it. That took most of the afternoon.",
    shape: "slit",
  },
];

/** Where each mask starts, and how its plate arrives. */
const START: Record<Shape, { clip: string; scale: number; x: number; y: number }> =
  {
    blade: { clip: blade(0, "right"), scale: 1.16, x: 6, y: 0 },
    chevron: { clip: chevron(0, "up"), scale: 1.2, x: 0, y: 6 },
    iris: { clip: iris(0), scale: 1.3, x: 0, y: 0 },
    shutter: { clip: shutter(0), scale: 1.14, x: 0, y: -5 },
    slit: { clip: slit(0), scale: 1.34, x: -5, y: 0 },
  };

const END: Record<Shape, string> = {
  blade: blade(1, "right"),
  chevron: chevron(1, "up"),
  iris: iris(1),
  shutter: shutter(1),
  slit: slit(1),
};

/**
 * The idle life of each plate once it has settled.
 *
 * It breathes. It used to run once and stop, which left every plate
 * parked at the far end of its own drift for as long as you looked at
 * it: permanently 5-12% zoomed in, and for two of the shapes pushed off
 * centre as well. The amounts are a third of what they were and the
 * yoyo brings each one back to the crop the frame was composed on.
 */
const AMBIENT: Record<Shape, gsap.TweenVars> = {
  blade: { scale: 1.035, duration: 11 },
  chevron: { y: "-1.5%", scale: 1.03, duration: 12 },
  iris: { scale: 1.04, duration: 10 },
  shutter: { x: "-1.5%", scale: 1.025, duration: 12 },
  slit: { scale: 1.05, duration: 13 },
};

export default function Reel() {
  const [active, setActive] = useState(0);
  const previous = useRef(0);
  const busy = useRef(false);
  const layers = useRef<(HTMLDivElement | null)[]>([]);
  const plates = useRef<(HTMLDivElement | null)[]>([]);
  const blocks = useRef<(HTMLDivElement | null)[]>([]);
  const stage = useRef<HTMLDivElement>(null);
  const ambient = useRef<gsap.core.Tween | null>(null);

  const settle = useCallback((i: number) => {
    ambient.current?.kill();
    const plate = plates.current[i];
    if (!plate || prefersReducedMotion()) return;
    ambient.current = gsap.to(plate, {
      ...AMBIENT[SLIDES[i].shape],
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      overwrite: "auto",
    });
  }, []);

  useEffect(() => {
    layers.current.forEach((l, i) => {
      if (!l) return;
      gsap.set(l, {
        clipPath: i === 0 ? END[SLIDES[0].shape] : START[SLIDES[i].shape].clip,
        zIndex: i === 0 ? 10 : 1,
        autoAlpha: i === 0 ? 1 : 0,
      });
      gsap.set(plates.current[i], { scale: 1, x: 0, y: 0 });
    });
    blocks.current.forEach((b, i) => {
      if (!b) return;
      gsap.set(b, {
        autoAlpha: i === 0 ? 1 : 0,
        pointerEvents: i === 0 ? "auto" : "none",
      });
      gsap.set(b.querySelectorAll("[data-piece]"), {
        yPercent: i === 0 ? 0 : 150,
        opacity: i === 0 ? 1 : 0,
      });
    });
    settle(0);
  }, [settle]);

  useEffect(() => {
    const from = previous.current;
    const to = active;
    if (from === to) return;
    previous.current = to;

    const reduced = prefersReducedMotion();
    const outLayer = layers.current[from];
    const inLayer = layers.current[to];
    const inPlate = plates.current[to];
    const outPlate = plates.current[from];
    const outBlock = blocks.current[from];
    const inBlock = blocks.current[to];
    const shape = SLIDES[to].shape;
    const entry = START[shape];

    ambient.current?.kill();
    busy.current = true;

    const tl = gsap.timeline({
      onComplete: () => {
        busy.current = false;
        if (outLayer) gsap.set(outLayer, { autoAlpha: 0, zIndex: 1 });
        settle(to);
      },
    });

    if (reduced) {
      tl.set(inLayer, { autoAlpha: 1, zIndex: 10, clipPath: END[shape] })
        .set(outLayer, { autoAlpha: 0, zIndex: 1 })
        .set(inBlock, { autoAlpha: 1, pointerEvents: "auto" })
        .set(inBlock?.querySelectorAll("[data-piece]") ?? [], {
          yPercent: 0,
          opacity: 1,
        })
        .set(outBlock, { autoAlpha: 0, pointerEvents: "none" });
      return () => void tl.kill();
    }

    // image: same rectangle, new shape
    tl.set(inLayer, { zIndex: 20, autoAlpha: 1, clipPath: entry.clip })
      .set(outLayer, { zIndex: 10 })
      .set(inPlate, { scale: entry.scale, xPercent: entry.x, yPercent: entry.y })
      .to(
        inLayer,
        { clipPath: END[shape], duration: 1.25, ease: "astra-io" },
        0,
      )
      .to(
        inPlate,
        { scale: 1, xPercent: 0, yPercent: 0, duration: 1.75, ease: "astra" },
        0,
      )
      // the outgoing frame gives ground rather than disappearing
      .to(outPlate, { scale: 1.07, duration: 1.4, ease: "astra-io" }, 0)
      .set(inLayer, { zIndex: 10 })
      .set(outPlate, { scale: 1, clearProps: "xPercent,yPercent" });

    // type: out upward, in from below, small print last
    const outPieces = outBlock?.querySelectorAll("[data-piece]") ?? [];
    const inPieces = inBlock?.querySelectorAll("[data-piece]") ?? [];

    tl.to(
      outPieces,
      {
        yPercent: -150,
        opacity: 0,
        duration: 0.55,
        stagger: 0.04,
        ease: "astra-io",
      },
      0,
    )
      .set(outBlock, { autoAlpha: 0, pointerEvents: "none" })
      .set(inBlock, { autoAlpha: 1, pointerEvents: "auto" }, 0.34)
      .fromTo(
        inPieces,
        { yPercent: 150, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 1.05, stagger: 0.075, ease: "astra" },
        0.42,
      );

    return () => void tl.kill();
  }, [active, settle]);

  const goto = useCallback((i: number) => {
    if (busy.current) return;
    setActive(((i % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    const el = stage.current;
    if (!el || prefersReducedMotion()) return;
    const obs = Observer.create({
      target: el,
      type: "touch,pointer",
      dragMinimum: 24,
      tolerance: 40,
      onLeft: () => goto(previous.current + 1),
      onRight: () => goto(previous.current - 1),
    });
    return () => obs.kill();
  }, [goto]);

  return (
    <Chapter id="studies" tone="dark">
      <div className="relative min-h-[100svh] overflow-clip bg-ink text-paper">
        <div className="grid min-h-[100svh] items-center gap-y-10 lg:grid-cols-[minmax(0,38fr)_minmax(0,62fr)]">
          {/* the words */}
          <div className="edge order-2 flex flex-col justify-center py-8 lg:order-1 lg:py-[12vh]">
            <div className="label mb-[clamp(1.5rem,4vw,3rem)] flex items-center gap-4 text-paper/70">
              <span>03</span>
              <span className="h-px w-10 bg-paper/25" />
              <span>Five studies</span>
            </div>

            {/* Every slide is absolutely positioned, so this height is
                the height they all get. It has to clear the tallest. */}
            <div className="relative min-h-[clamp(21rem,36vh,26rem)]">
              {SLIDES.map((s, i) => (
                <div
                  key={s.index}
                  ref={(n) => {
                    blocks.current[i] = n;
                  }}
                  className="absolute inset-0 flex flex-col justify-start"
                  aria-hidden={i !== active}
                >
                  <div className="line-mask">
                    <span
                      data-piece
                      className="label block text-signal will-change-transform"
                    >
                      {s.index} / 05
                    </span>
                  </div>

                  <h2
                    className="display mt-5 text-paper"
                    style={{ fontSize: "clamp(2.4rem,5.2vw,5rem)" }}
                  >
                    {s.title.map((line) => (
                      <span key={line} className="line-mask">
                        <span data-piece className="block will-change-transform">
                          {line}
                        </span>
                      </span>
                    ))}
                  </h2>

                  {/* Size on the mask, so its em-based room matches the
                      text. display-italic's 1.02 leading is for single
                      display lines and collides once this wraps. */}
                  <div
                    className="line-mask mt-7"
                    style={{ fontSize: "clamp(1.05rem,1.5vw,1.4rem)" }}
                  >
                    <p
                      data-piece
                      className="display-italic max-w-[36ch] text-paper/85 will-change-transform"
                      style={{ lineHeight: 1.34 }}
                    >
                      {s.note}
                    </p>
                  </div>

                  <div className="mt-8 flex items-center gap-6">
                    <div className="line-mask">
                      <span data-piece className="label block text-paper/60">
                        {s.place}
                      </span>
                    </div>
                    <div className="line-mask">
                      <span data-piece className="label block text-paper/60">
                        {s.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* the index: numbers, not dots */}
            <div className="mt-[clamp(2.5rem,6vw,4rem)] flex items-center gap-[clamp(1rem,2vw,2rem)]">
              {SLIDES.map((s, i) => (
                <button
                  key={s.index}
                  type="button"
                  onClick={() => goto(i)}
                  data-cursor="cta"
                  data-cursor-label={s.index}
                  aria-label={`Show ${s.title.join(" ")}`}
                  aria-current={i === active}
                  className="group flex flex-col gap-2"
                >
                  <span
                    className={`label transition-colors duration-500 ${
                      i === active ? "text-paper" : "text-paper/55 group-hover:text-paper/85"
                    }`}
                  >
                    {s.index}
                  </span>
                  <span
                    className={`block h-px origin-left transition-transform duration-700 ease-[var(--ease-out-expo)] ${
                      i === active
                        ? "scale-x-100 bg-signal"
                        : "scale-x-[0.25] bg-paper/40"
                    }`}
                    style={{ width: "clamp(1.5rem,3vw,2.75rem)" }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* the frame */}
          <div
            ref={stage}
            data-cursor="drag"
            className="relative order-1 aspect-3/2 max-h-[68svh] w-full touch-pan-y overflow-hidden bg-ink lg:order-2 lg:max-h-[84svh]"
          >
            {SLIDES.map((s, i) => (
              <div
                key={s.index}
                ref={(n) => {
                  layers.current[i] = n;
                }}
                className="absolute inset-0 overflow-hidden will-change-[clip-path]"
              >
                <div
                  ref={(n) => {
                    plates.current[i] = n;
                  }}
                  className="absolute inset-0 will-change-transform"
                >
                  <Plate
                    name={s.plate}
                    fit={s.cut ? "contain" : "cover"}
                    sizes="(max-width: 1024px) 100vw, 62vw"
                    quality={90}
                    priority={i === 0}
                  />
                </div>
              </div>
            ))}

            <span className="label pointer-events-none absolute right-[clamp(1rem,2vw,2rem)] bottom-[clamp(1rem,2vw,2rem)] text-paper mix-blend-difference">
              Drag or select
            </span>
          </div>
        </div>
      </div>
    </Chapter>
  );
}
