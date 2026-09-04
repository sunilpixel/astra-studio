"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { scrollTo } from "@/lib/scroll";
import { CHAPTERS } from "@/lib/chapters";

// Ten ticks and a number. The column is difference-blended, so it
// inverts itself over black and white sections without being told
// which one it is on.
export default function ScrollIndex() {
  const root = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ticks = Array.from(el.querySelectorAll<HTMLElement>("[data-tick]"));
    let current = "";

    const onChapter = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail.id;
      if (id === current) return;
      current = id;
      const i = CHAPTERS.findIndex((c) => c.id === id);
      if (i < 0) return;

      ticks.forEach((t, n) => {
        gsap.to(t, {
          scaleX: n === i ? 1 : n === i - 1 || n === i + 1 ? 0.5 : 0.24,
          opacity: n === i ? 1 : Math.abs(n - i) < 2 ? 0.55 : 0.28,
          duration: 0.7,
          ease: "astra",
        });
      });

      // The number swaps on a short mask, never a cross-fade.
      gsap
        .timeline()
        .to(readout.current, {
          yPercent: -110,
          opacity: 0,
          duration: 0.3,
          ease: "astra-io",
        })
        .add(() => {
          if (readout.current) readout.current.textContent = CHAPTERS[i].index;
        })
        .fromTo(
          readout.current,
          { yPercent: 110, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.55, ease: "astra" },
        );
    };

    window.addEventListener("astra:chapter", onChapter);
    return () => window.removeEventListener("astra:chapter", onChapter);
  }, []);

  return (
    <div
      ref={root}
      className="pointer-events-none fixed top-1/2 right-[clamp(1rem,2.2vw,2.2rem)] z-[200] hidden -translate-y-1/2 flex-col items-end gap-3 text-paper mix-blend-difference lg:flex"
    >
      <div className="overflow-hidden">
        <span
          ref={readout}
          className="display block text-[0.85rem] tracking-[0.24em] tabular-nums"
        >
          01
        </span>
      </div>

      <div className="pointer-events-auto flex flex-col items-end gap-[7px]">
        {CHAPTERS.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-label={`Go to ${c.title}`}
            data-cursor="cta"
            data-cursor-label={c.index}
            onClick={() => scrollTo(`#${c.id}`)}
            className="group flex h-2 w-8 items-center justify-end"
          >
            <span
              data-tick
              className="block h-px w-full origin-right bg-current opacity-30"
              style={{ transform: "scaleX(0.24)" }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
