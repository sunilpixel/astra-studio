"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { lockScroll } from "@/lib/scroll";
import { PLATES, preview } from "@/lib/media";
import { blade, shutter } from "@/lib/clip";

/** The frames that must be in the browser before the film can start. */
const CRITICAL = [
  { key: "forms", ref: "A-01" },
  { key: "chrono", ref: "A-02" },
  { key: "knit", ref: "A-03" },
  { key: "decant", ref: "A-04" },
  { key: "ember", ref: "A-05" },
] as const;

/** 0–9 with the wrap digit repeated, so a column rolls 9 → 0 cleanly. */
const WHEEL = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

/** A digit's carry. */
const carry = (x: number) => gsap.utils.clamp(0, 1, x);

function warm(url: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

/**
 * A contact sheet coming up in the developer, and a counter.
 *
 * Both are honest. Each frame is one of the photographs the opening
 * cannot run without, and its shutter opens when that file actually
 * finishes decoding. The counter is geared like an odometer rather than
 * tweened: units turn continuously, tens and hundreds only move when
 * the wheel below them passes nine.
 */
export default function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const meter = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLSpanElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const sheet = useRef<(HTMLDivElement | null)[]>([]);
  const marks = useRef<(HTMLSpanElement | null)[]>([]);
  const wheels = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    lockScroll(true);
    document.documentElement.dataset.stage = "loading";

    const reduced = prefersReducedMotion();
    const state = { value: 0 };
    let released = false;

    const paint = () => {
      const v = state.value * 100;
      const pos = [
        // v tops out at 100, so hundreds is pure carry.
        carry(v - 99),
        (Math.floor(v / 10) + carry((v % 10) - 9)) % 10,
        v % 10,
      ];
      pos.forEach((p, i) => {
        gsap.set(wheels.current[i], { yPercent: -(p / WHEEL.length) * 100 });
      });
      gsap.set(line.current, { scaleX: state.value });
      if (status.current) {
        status.current.textContent = `Loading, ${Math.round(v)} percent`;
      }
    };

    const expose = (i: number) => {
      const frame = sheet.current[i];
      const mark = marks.current[i];
      if (reduced) {
        gsap.set(frame, { clipPath: shutter(1) });
        gsap.set(mark, { opacity: 1 });
        return;
      }
      gsap.to(frame, { clipPath: shutter(1), duration: 0.9, ease: "astra-io" });
      gsap.to(mark, { opacity: 1, duration: 0.5 });
    };

    const release = () => {
      if (released) return;
      released = true;

      const tl = gsap.timeline({
        onComplete: () => {
          document.documentElement.dataset.stage = "ready";
          lockScroll(false);
          el.style.display = "none";
        },
      });

      if (reduced) {
        window.dispatchEvent(new CustomEvent("astra:enter"));
        tl.to(el, { opacity: 0, duration: 0.5 });
        return;
      }

      const cut = { p: 0 };
      const prints = sheet.current
        .map((f) => f?.parentElement?.parentElement)
        .filter(Boolean) as HTMLElement[];

      gsap.set(dot.current, { animation: "none", opacity: 1 });
      tl.to(dot.current, { backgroundColor: "#ff2d16", duration: 0.25 }, 0)
        .to(label.current, { opacity: 0, duration: 0.4 }, 0.1)
        // lift the sheet off the table, last frame first
        .to(
          prints,
          {
            yPercent: -18,
            opacity: 0,
            duration: 0.7,
            stagger: { each: 0.045, from: "end" },
            ease: "astra-io",
          },
          0.1,
        )
        .to(meter.current, { opacity: 0, duration: 0.45 }, 0.35)
        .to(word.current, { opacity: 1, duration: 0.6 }, 0.3)
        // the rule thickens into the leading edge of the cut
        .to(
          line.current,
          {
            scaleY: 40,
            duration: 0.7,
            ease: "astra-io",
            transformOrigin: "50% 50%",
          },
          0.45,
        )
        .add(() => window.dispatchEvent(new CustomEvent("astra:enter")), 1.05)
        .to(
          cut,
          {
            p: 1,
            duration: 1.25,
            ease: "astra-io",
            onUpdate: () => gsap.set(el, { clipPath: blade(1 - cut.p, "left") }),
          },
          1.1,
        );
    };

    const started = performance.now();
    const total = CRITICAL.length + 1;
    let done = 0;

    const advance = () => {
      done += 1;
      gsap.to(state, {
        value: done / total,
        duration: 0.9,
        ease: "astra",
        onUpdate: paint,
      });
    };

    const jobs: Promise<unknown>[] = [
      (document.fonts?.ready ?? Promise.resolve()).then(advance),
      ...CRITICAL.map((c, i) =>
        warm(preview(c.key, 640))
          .then(() => {
            expose(i);
            return warm(PLATES[c.key].src);
          })
          .then(advance),
      ),
    ];

    // A slow network should not hold the door shut forever.
    const cap = new Promise((r) => setTimeout(r, 7000));

    Promise.race([Promise.all(jobs), cap]).then(() => {
      CRITICAL.forEach((_, i) => expose(i));
      const elapsed = performance.now() - started;
      const wait = Math.max(0, (reduced ? 300 : 1600) - elapsed);
      gsap.to(state, {
        value: 1,
        duration: 0.8,
        ease: "astra",
        onUpdate: paint,
        delay: wait / 1000,
        onComplete: release,
      });
    });

    paint();
    return () => {
      lockScroll(false);
    };
  }, []);

  return (
    <div
      ref={root}
      className="edge fixed inset-0 z-[400] flex flex-col justify-between bg-paper py-[clamp(1.25rem,3.2vw,2.5rem)] text-ink"
      style={{ clipPath: blade(1, "left") }}
    >
      <p ref={status} className="sr-only" role="status" aria-live="polite" />

      <div ref={label} className="flex items-start justify-between gap-6">
        <span className="label text-ink/65">Astra — Volume 01 / Object</span>
        <span className="label flex items-center gap-3 text-ink/65">
          <span
            ref={dot}
            aria-hidden
            className="block size-1.5 rounded-full bg-ink/30"
            style={{ animation: "pulse-signal 1.4s ease-in-out infinite" }}
          />
          Developing
        </span>
      </div>

      {/* the contact sheet */}
      <div
        aria-hidden
        className="flex items-end justify-center gap-[clamp(0.5rem,1.6vw,1.25rem)]"
      >
        {CRITICAL.map((c, i) => (
          <div key={c.ref} className="will-change-transform">
            <div className="relative aspect-3/4 w-[clamp(3rem,8.5vw,7.5rem)] overflow-hidden border border-ink/12 bg-paper">
              <div
                ref={(n) => {
                  sheet.current[i] = n;
                }}
                className="absolute inset-0 bg-cover bg-center will-change-[clip-path]"
                style={{
                  backgroundImage: `url(${preview(c.key, 640)})`,
                  clipPath: shutter(0),
                }}
              />
            </div>
            <span
              ref={(n) => {
                marks.current[i] = n;
              }}
              className="label mt-3 block text-center text-ink/70 opacity-25"
            >
              {c.ref}
            </span>
          </div>
        ))}
      </div>

      <div>
        <div className="relative flex items-end justify-between gap-8">
          <div
            ref={word}
            className="display-italic text-ink/80 opacity-0"
            style={{ fontSize: "clamp(1.5rem,4vw,3rem)" }}
          >
            Nothing is still.
          </div>

          {/* the odometer */}
          <div
            ref={meter}
            aria-hidden
            className="flex items-end gap-[0.03em] leading-none"
            style={{ fontSize: "clamp(3rem,11vw,9rem)" }}
          >
            {[0, 1, 2].map((col) => (
              <div key={col} className="h-[1em] overflow-hidden">
                <div
                  ref={(n) => {
                    wheels.current[col] = n;
                  }}
                  className="will-change-transform"
                >
                  {WHEEL.map((d, j) => (
                    <div
                      key={d + j}
                      className="display flex h-[1em] items-center justify-center leading-none tabular-nums"
                    >
                      {d}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <span className="label mb-[0.34em] ml-[0.22em] text-ink/45">%</span>
          </div>
        </div>

        {/* The rule. It becomes the cut. */}
        <div className="relative mt-[clamp(1rem,2.4vw,2rem)] h-px w-full">
          <div className="absolute inset-0 bg-rule-light" />
          <div
            ref={line}
            className="absolute inset-0 origin-left bg-ink will-change-transform"
            style={{ transform: "scaleX(0)" }}
          />
        </div>
      </div>
    </div>
  );
}
