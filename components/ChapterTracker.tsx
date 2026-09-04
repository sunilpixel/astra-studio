"use client";

import { useEffect } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { CHAPTERS } from "@/lib/chapters";

/**
 * Ten independent enter/leave triggers race wherever two sections
 * overlap, and whichever fires last wins, which is how an index ends up
 * a chapter behind. So: measure every section once per refresh and
 * answer from the cache. One answer at any scroll position, no
 * per-frame layout reads.
 */
export default function ChapterTracker() {
  useEffect(() => {
    type Bound = { id: string; top: number; bottom: number };
    let bounds: Bound[] = [];
    let current = "";

    const measure = () => {
      const y = window.scrollY;
      bounds = CHAPTERS.map((c) => {
        const el = document.getElementById(c.id);
        if (!el) return { id: c.id, top: Infinity, bottom: Infinity };
        const r = el.getBoundingClientRect();
        return { id: c.id, top: r.top + y, bottom: r.bottom + y };
      });
    };

    const evaluate = () => {
      if (!bounds.length) return;
      // The frame's own centre decides, not its top edge.
      const eye = window.scrollY + window.innerHeight * 0.5;
      let found = bounds[0].id;
      for (const b of bounds) {
        if (eye >= b.top && eye < b.bottom) {
          found = b.id;
          break;
        }
        if (eye >= b.bottom) found = b.id;
      }
      if (found === current) return;
      current = found;
      window.dispatchEvent(
        new CustomEvent("astra:chapter", { detail: { id: found } }),
      );
    };

    const st = ScrollTrigger.create({
      trigger: document.documentElement,
      start: 0,
      end: "max",
      onUpdate: evaluate,
      // Must refresh last: pinned sections resize their spacers during
      // a refresh, so measuring first caches the pre-pin layout.
      refreshPriority: -100,
      onRefresh: () => {
        measure();
        evaluate();
      },
    });

    measure();
    evaluate();

    return () => st.kill();
  }, []);

  return null;
}
