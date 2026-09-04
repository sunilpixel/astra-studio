"use client";

import { useEffect, useRef } from "react";
import Chapter from "@/components/Chapter";
import MaskedType from "@/components/MaskedType";
import { gsap, isTouch, prefersReducedMotion, ScrollTrigger } from "@/lib/gsap";
import { scrollState } from "@/lib/scroll";
import { usePinSection } from "@/hooks/animation";
import { slit } from "@/lib/clip";
import type { SnowHandle } from "@/webgl/snowfield";

/**
 * The word is the window: MATTER set at the size of the screen and
 * filled with a photograph of a material.
 *
 * Two dust fields sandwich it, the near one crossing in front of the
 * letters and the far one falling behind. Fall speed answers scroll
 * velocity, so pushing the page moves the air.
 */
export default function Matter() {
  const back = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const rule = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLDivElement>(null);
  const dust = useRef<SnowHandle | null>(null);

  useEffect(() => {
    if (!back.current || prefersReducedMotion()) return;
    let handle: SnowHandle | null = null;
    let cancelled = false;

    import("@/webgl/snowfield").then(({ createSnowfield }) => {
      if (cancelled || !back.current) return;
      handle = createSnowfield({
        back: back.current,
        front: front.current,
        quality: isTouch() || window.innerWidth < 820 ? "low" : "high",
        // white ground: the motes are dark, not bright
        tint: [10, 10, 12],
        sizeScale: 0.45,
      });
      handle.setDensity(0);
      dust.current = handle;
    });

    const pump = () => dust.current?.setVelocity(scrollState.velocity);
    gsap.ticker.add(pump);

    const st = ScrollTrigger.create({
      trigger: "#matter",
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
  }, []);

  const pin = usePinSection<HTMLDivElement>({
    length: 2.8,
    onProgress: (p) => {
      const still = prefersReducedMotion();

      // The air thickens, holds, and clears as we leave.
      const density =
        p < 0.3 ? p / 0.3 : p < 0.62 ? 1 : 1 - ((p - 0.62) / 0.38) * 0.7;
      dust.current?.setDensity(density);

      // The word opens on a slit, then tracks wide as we leave.
      const open = gsap.utils.clamp(0, 1, p / 0.34);
      const leave = gsap.utils.clamp(0, 1, (p - 0.74) / 0.26);
      gsap.set(word.current, {
        clipPath: slit(open),
        letterSpacing: `${-0.02 + leave * 0.34}em`,
        scale: still ? 1 : 1.08 - open * 0.08 + leave * 0.1,
      });

      gsap.set(rule.current, { scaleX: open });
      gsap.set(caption.current, {
        opacity: gsap.utils.clamp(0, 1, (p - 0.42) / 0.2) * (1 - leave),
      });
    },
  });

  return (
    <Chapter id="matter" tone="light">
      <div
        ref={pin}
        className="relative h-[100svh] w-full overflow-hidden bg-paper"
      >
        {/* far and middle dust */}
        <canvas ref={back} aria-hidden className="absolute inset-0 h-full w-full" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div
            ref={word}
            className="will-change-[clip-path]"
            style={{ clipPath: slit(0) }}
          >
            <MaskedType
              as="h2"
              plate="dial"
              travel={30}
              push={30}
              className="display block whitespace-nowrap select-none"
              style={{
                fontSize: "clamp(4rem,19vw,17rem)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              MATTER
            </MaskedType>
          </div>
        </div>

        {/* near dust, crossing in front of the letters */}
        <canvas
          ref={front}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        <div className="edge absolute inset-x-0 bottom-[clamp(1.5rem,4vw,3rem)]">
          <div
            ref={rule}
            className="mb-5 h-px w-full origin-left bg-ink/15"
            style={{ transform: "scaleX(0)" }}
          />
          <div
            ref={caption}
            className="flex flex-col gap-4 opacity-0 sm:flex-row sm:items-end sm:justify-between sm:gap-8"
          >
            <p
              className="display-italic max-w-[32ch] text-ink/85"
              style={{ fontSize: "clamp(1.05rem,1.6vw,1.5rem)" }}
            >
              One photograph of one object, seen only through the word
              for what it is made of.
            </p>
            <span className="label shrink-0 text-ink/70">04 — Matter</span>
          </div>
        </div>
      </div>
    </Chapter>
  );
}
