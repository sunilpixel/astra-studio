"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { lockScroll, scrollTo } from "@/lib/scroll";
import { CHAPTERS, NAV } from "@/lib/chapters";
import { blade } from "@/lib/clip";

export default function Nav() {
  const bar = useRef<HTMLElement>(null);
  const rule = useRef<HTMLSpanElement>(null);
  const links = useRef<HTMLDivElement>(null);
  const hair = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const activeGroup = useRef<string>("index");

  useEffect(() => {
    const row = links.current;
    const bead = rule.current;
    if (!row || !bead) return;

    const moveTo = (el: HTMLElement | null) => {
      if (!el) return gsap.to(bead, { opacity: 0, duration: 0.3 });
      const r = el.getBoundingClientRect();
      const base = row.getBoundingClientRect();
      gsap.to(bead, {
        x: r.left - base.left,
        width: r.width,
        opacity: 1,
        duration: 0.7,
        ease: "astra",
      });
    };

    const current = () =>
      row.querySelector<HTMLElement>(`[data-group="${activeGroup.current}"]`);

    const onChapter = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail.id;
      const chapter = CHAPTERS.find((c) => c.id === id);
      if (!chapter) return;
      activeGroup.current = chapter.group;
      if (!row.matches(":hover")) moveTo(current());
    };

    const onOver = (e: Event) => {
      const t = (e.target as Element).closest<HTMLElement>("[data-group]");
      if (t) moveTo(t);
    };
    const onOut = () => moveTo(current());

    window.addEventListener("astra:chapter", onChapter);
    row.addEventListener("pointerover", onOver);
    row.addEventListener("pointerleave", onOut);
    requestAnimationFrame(() => moveTo(current()));

    return () => {
      window.removeEventListener("astra:chapter", onChapter);
      row.removeEventListener("pointerover", onOver);
      row.removeEventListener("pointerleave", onOut);
    };
  }, []);

  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    let shown = false;
    const onScroll = () => {
      const past = window.scrollY > window.innerHeight * 0.55;
      if (past === shown) return;
      shown = past;
      gsap.to(hair.current, { opacity: past ? 1 : 0, duration: 0.7 });
      gsap.to(el, {
        paddingTop: past ? "0.95rem" : "1.6rem",
        duration: 0.8,
        ease: "astra",
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The index opens on a blade, like everything else that covers the
  // screen. A page transition without a page change.
  useEffect(() => {
    const el = overlay.current;
    if (!el) return;
    const items = el.querySelectorAll("[data-menu-item]");
    const reduced = prefersReducedMotion();

    if (open) {
      lockScroll(true);
      el.style.pointerEvents = "auto";
      gsap
        .timeline()
        .set(el, { display: "flex" })
        .fromTo(
          el,
          { clipPath: blade(0, "left") },
          {
            clipPath: blade(1, "left"),
            duration: reduced ? 0.2 : 0.9,
            ease: "astra-io",
          },
        )
        .fromTo(
          items,
          { yPercent: 150, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: reduced ? 0.2 : 0.9,
            stagger: 0.045,
            ease: "astra",
          },
          reduced ? 0 : 0.3,
        );
    } else {
      el.style.pointerEvents = "none";
      gsap.to(el, {
        clipPath: blade(0, "left"),
        duration: reduced ? 0.2 : 0.7,
        ease: "astra-io",
        onComplete: () => {
          el.style.display = "none";
          lockScroll(false);
        },
      });
    }
  }, [open]);

  const go = (target: string) => {
    setOpen(false);
    setTimeout(() => scrollTo(target, { offset: 0 }), 360);
  };

  return (
    <>
      <header
        ref={bar}
        className="edge fixed inset-x-0 top-0 z-[220] pt-[1.6rem] pb-3 text-paper mix-blend-difference"
      >
        <div className="flex items-center justify-between gap-6">
          <a
            href="#nothing"
            onClick={(e) => {
              e.preventDefault();
              go("#nothing");
            }}
            data-cursor="cta"
            data-cursor-label="TOP"
            className="display text-[1.05rem] leading-none tracking-[0.52em] uppercase"
          >
            Astra
          </a>

          <div
            ref={links}
            className="relative hidden items-center gap-[clamp(1.2rem,2.6vw,2.6rem)] md:flex"
          >
            {NAV.map((n) => (
              <a
                key={n.key}
                href={n.target}
                data-group={n.key}
                data-cursor="cta"
                data-cursor-label="GO"
                onClick={(e) => {
                  e.preventDefault();
                  go(n.target);
                }}
                className="label py-1 opacity-70 transition-opacity duration-500 hover:opacity-100"
              >
                {n.label}
              </a>
            ))}
            <span
              ref={rule}
              className="pointer-events-none absolute -bottom-0.5 left-0 h-px w-0 bg-current opacity-0"
            />
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            data-cursor="cta"
            data-cursor-label={open ? "CLOSE" : "INDEX"}
            className="label flex items-center gap-2.5 py-1"
          >
            <span className="relative block h-2.5 w-4">
              <span
                className="absolute left-0 block h-px w-full bg-current transition-transform duration-500"
                style={{
                  transform: open
                    ? "translateY(4px) rotate(9deg)"
                    : "translateY(0)",
                }}
              />
              <span
                className="absolute left-0 block h-px w-full bg-current transition-transform duration-500"
                style={{
                  transform: open
                    ? "translateY(4px) rotate(-9deg)"
                    : "translateY(8px)",
                }}
              />
            </span>
            {open ? "Close" : "Menu"}
          </button>
        </div>
        <div
          ref={hair}
          className="mt-3 h-px w-full bg-paper/25 opacity-0"
          aria-hidden
        />
      </header>

      <div
        ref={overlay}
        className="edge fixed inset-0 z-[210] hidden flex-col overflow-y-auto overscroll-contain bg-ink pt-[clamp(4.5rem,13vh,8rem)] pb-[clamp(2rem,8vh,6rem)] text-paper"
        style={{ clipPath: blade(0, "left") }}
        aria-hidden={!open}
      >
        {/* my-auto, not justify-center on the parent: justify-center
            puts the overflow above the scroll area where it can never
            be reached. */}
        <nav className="my-auto grid gap-[clamp(0.05rem,0.3vw,0.3rem)]">
          {CHAPTERS.map((c) => (
            // the mask sizes its own room in em, so it carries the
            // font-size rather than the span inside it
            <div
              key={c.id}
              className="line-mask"
              style={{ fontSize: "clamp(1.05rem,min(4.4vw,5.2vh),3.4rem)" }}
            >
              <a
                data-menu-item
                data-cursor="cta"
                data-cursor-label="OPEN"
                href={`#${c.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  go(`#${c.id}`);
                }}
                className="group flex items-baseline gap-[clamp(0.6rem,2vw,2rem)] leading-[1.02] will-change-transform"
              >
                <span className="label w-8 shrink-0 text-paper/60 transition-colors duration-500 group-hover:text-signal">
                  {c.index}
                </span>
                <span className="display transition-[letter-spacing] duration-700 group-hover:tracking-[0.06em]">
                  {c.title}
                </span>
              </a>
            </div>
          ))}
        </nav>
        <p className="label mt-[clamp(1.25rem,3vw,2.25rem)] max-w-sm text-paper/60">
          Volume 01 — Object. Eleven movements, one continuous take.
        </p>
      </div>
    </>
  );
}
