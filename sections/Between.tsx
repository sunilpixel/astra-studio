"use client";

import Chapter from "@/components/Chapter";
import { chapterNo } from "@/lib/chapters";
import Plate from "@/components/Plate";
import {
  useClipReveal,
  useGsapContext,
  useParallax,
  useReveal,
  useTracking,
} from "@/hooks/animation";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

// Three words at three distances: one behind the photograph, one level
// with it, one in front. The depth is in the parallax speeds, not in
// hanging them off the edges: at 15vw the outer two carried a negative
// margin, a growing letter-spacing and a scroll drift all pushing the
// same way, and on a narrow window they compounded into a word with its
// first letter cut off.
export default function Between() {
  const spaceRef = useTracking<HTMLDivElement>({ from: -0.02, to: 0.16 });
  const betweenRef = useParallax<HTMLDivElement>({ speed: 0.34 });
  const thingsRef = useParallax<HTMLDivElement>({ speed: -0.2 });
  const frameRef = useClipReveal<HTMLDivElement>("chevron", { duration: 1.7 });
  const innerRef = useParallax<HTMLDivElement>({ speed: 0.16, scale: 1.14 });
  const copyRef = useReveal<HTMLParagraphElement>({
    kind: "lines",
    start: "top 78%",
  });

  // The outer words drift apart as the section passes. Bounded, so
  // that with the tracking at its widest they still land inside the edge.
  const scope = useGsapContext<HTMLDivElement>((el) => {
    if (prefersReducedMotion()) return;
    gsap.to(el.querySelectorAll("[data-drift]"), {
      x: (i: number) => (i === 0 ? -30 : 30),
      ease: "none",
      scrollTrigger: {
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
  });

  return (
    <Chapter id="between" tone="light">
      <div
        ref={scope}
        className="relative overflow-clip bg-paper py-[clamp(6rem,16vh,12rem)] text-ink"
      >
        <div className="edge relative mx-auto flex min-h-[86vh] max-w-[112rem] flex-col justify-center md:min-h-[110vh]">
          {/* the far word */}
          <div
            data-drift
            ref={spaceRef}
            className="display pointer-events-none relative z-10 text-ink select-none"
            style={{ fontSize: "clamp(2.6rem,11.5vw,11rem)" }}
          >
            The Space
          </div>

          {/* the photograph, level with the reader */}
          <div className="relative z-20 -mt-[1vw] flex justify-end">
            <div
              ref={frameRef}
              className="relative aspect-71/100 w-[58%] overflow-hidden bg-paper sm:w-[46%] lg:w-[34%]"
              data-cursor="view"
            >
              {/* Cut out, not framed. Multiply over the page turns white
                  into nothing, so a plate shot on a clean white ground
                  loses its ground and the object is left sitting on the
                  paper. Two conditions.

                  The plate has to have a clean ground and something
                  black on it. Measured off the file: 255 at the edges
                  with zero deviation, ink at 2, and a third of the frame
                  covered by it. `noir` reads 154 at the edges (there is
                  a grey card behind that bottle) and `salve` covers 6%,
                  which is a speck floating in a lot of nothing.

                  And the blend has to sit on this wrapper rather than
                  the image, because `will-change: transform` opens a
                  stacking context, and a blend inside one has no
                  backdrop to multiply against. */}
              <div
                ref={innerRef}
                className="absolute inset-0 mix-blend-multiply will-change-transform"
              >
                <Plate
                  name="flat"
                  sizes="(max-width: 640px) 58vw, 34vw"
                  quality={90}
                />
              </div>
              <span className="label absolute bottom-4 left-4 text-paper mix-blend-difference">
                Fig. 02 — one object, no ground
              </span>
            </div>
          </div>

          {/* the near word, running behind the frame it overlaps */}
          <div
            ref={betweenRef}
            className="display pointer-events-none absolute inset-x-0 top-[46%] z-[15] text-center text-ink/40 select-none"
            style={{ fontSize: "clamp(4rem,17vw,17rem)" }}
          >
            Between
          </div>

          {/* the nearest word */}
          <div
            data-drift
            ref={thingsRef}
            className="display pointer-events-none relative z-30 -mt-[5vw] text-right text-ink select-none"
            style={{ fontSize: "clamp(2.6rem,11.5vw,11rem)" }}
          >
            Things.
          </div>

          <div className="relative z-30 mt-[clamp(3rem,8vw,7rem)] grid gap-8 md:grid-cols-12">
            <div className="label text-ink/70 md:col-span-3">
              {chapterNo("between")} — The Space Between
            </div>
            <p
              ref={copyRef}
              className="display max-w-[44ch] text-ink opacity-0 md:col-span-6 md:col-start-5"
              style={{
                fontSize: "clamp(1.35rem,2.4vw,2.3rem)",
                lineHeight: 1.22,
              }}
            >
              An object is mostly the air around it. Move it two inches
              and it becomes a different object. We spent a season
              photographing the part nobody frames.
            </p>
            <div className="label self-end text-right text-ink/70 md:col-span-2 md:col-start-11">
              Studio / 04:12
            </div>
          </div>
        </div>
      </div>
    </Chapter>
  );
}
