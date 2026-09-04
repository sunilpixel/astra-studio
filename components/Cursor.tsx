"use client";

import { useEffect, useRef } from "react";
import { gsap, isTouch, prefersReducedMotion } from "@/lib/gsap";

/**
 * A dot that tracks precisely and a ring that lags. Everything else is
 * driven by data-cursor on whatever the pointer is over, so nothing
 * else has to know the cursor exists.
 *
 *   view   opens over photography
 *   cta    opens and labels itself
 *   drag   opens wide, labelled DRAG
 *   hide   gets out of the way
 *
 * data-cursor-label overrides the label text.
 */

type Mode = "default" | "view" | "cta" | "drag" | "hide";

const RING: Record<Mode, { size: number; alpha: number; border: number }> = {
  default: { size: 34, alpha: 0.45, border: 1 },
  view: { size: 108, alpha: 0.14, border: 0 },
  cta: { size: 82, alpha: 0.2, border: 0 },
  drag: { size: 116, alpha: 0.16, border: 0 },
  hide: { size: 0, alpha: 0, border: 0 },
};

const LABEL: Partial<Record<Mode, string>> = {
  view: "VIEW",
  cta: "EXPLORE",
  drag: "DRAG",
};

export default function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isTouch() || prefersReducedMotion()) return;
    const ringEl = ring.current!;
    const dotEl = dot.current!;
    const labelEl = label.current!;

    document.documentElement.dataset.pointer = "custom";
    gsap.set([ringEl, dotEl], { xPercent: -50, yPercent: -50, opacity: 0 });

    const rx = gsap.quickTo(ringEl, "x", { duration: 0.55, ease: "astra" });
    const ry = gsap.quickTo(ringEl, "y", { duration: 0.55, ease: "astra" });
    const dx = gsap.quickTo(dotEl, "x", { duration: 0.12, ease: "power2.out" });
    const dy = gsap.quickTo(dotEl, "y", { duration: 0.12, ease: "power2.out" });

    let mode: Mode = "default";
    let shown = false;

    const apply = (next: Mode, text?: string) => {
      if (next === mode && !text) return;
      mode = next;
      const spec = RING[next];
      gsap.to(ringEl, {
        width: spec.size,
        height: spec.size,
        backgroundColor: `rgba(244,241,236,${spec.alpha})`,
        borderWidth: spec.border,
        duration: 0.55,
        ease: "astra",
      });
      gsap.to(dotEl, {
        scale: next === "default" ? 1 : 0,
        duration: 0.4,
        ease: "astra",
      });
      const copy = text ?? LABEL[next] ?? "";
      if (copy) labelEl.textContent = copy;
      gsap.to(labelEl, {
        opacity: copy ? 1 : 0,
        letterSpacing: copy ? "0.28em" : "0.6em",
        duration: 0.45,
        ease: "astra",
      });
    };

    const onMove = (e: PointerEvent) => {
      if (!shown) {
        shown = true;
        gsap.to([ringEl, dotEl], { opacity: 1, duration: 0.5 });
        gsap.set([ringEl, dotEl], { x: e.clientX, y: e.clientY });
      }
      rx(e.clientX);
      ry(e.clientY);
      dx(e.clientX);
      dy(e.clientY);

      const hit = (e.target as Element | null)?.closest?.("[data-cursor]") as
        | HTMLElement
        | null;
      const next = hit?.dataset.cursor as Mode | undefined;
      if (!next || !(next in RING)) return apply("default");
      apply(next, hit?.dataset.cursorLabel);
    };

    const onLeave = () => {
      shown = false;
      gsap.to([ringEl, dotEl], { opacity: 0, duration: 0.35 });
    };
    const onDown = () => gsap.to(ringEl, { scale: 0.82, duration: 0.25 });
    const onUp = () => gsap.to(ringEl, { scale: 1, duration: 0.45 });

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    return () => {
      delete document.documentElement.dataset.pointer;
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[300] hidden mix-blend-difference lg:block"
    >
      <div
        ref={ring}
        className="absolute top-0 left-0 flex h-[34px] w-[34px] items-center justify-center rounded-full border border-paper/60 will-change-transform"
      >
        <span
          ref={label}
          className="mono-label translate-y-px text-[9px] text-paper opacity-0"
        />
      </div>
      <div
        ref={dot}
        className="absolute top-0 left-0 h-[5px] w-[5px] rounded-full bg-paper will-change-transform"
      />
    </div>
  );
}
