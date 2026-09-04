"use client";

import { useEffect, useRef, useState } from "react";
import Chapter from "@/components/Chapter";
import Plate from "@/components/Plate";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { usePinSection } from "@/hooks/animation";
import { shutter } from "@/lib/clip";
import { FOOTAGE } from "@/lib/media";

/**
 * The one place a still would not do, so the one place there is
 * footage. The section is the cut, not a section containing a video.
 *
 * The open and the close run off two different triggers. The pin only
 * opens and holds; the close hangs off the section's exit, so the
 * shutter shuts over the same pixels Passage is already rising into.
 * Closing it inside the pin spent half a viewport shutting a frame onto
 * a black screen with nothing behind it.
 *
 * Neither clip has autoplay. The trigger owns playback, so nothing is
 * fetched until the frame is on screen, and a still sits underneath in
 * case the footage never arrives at all.
 */
export default function Motion() {
  const video = useRef<HTMLVideoElement>(null);
  const motes = useRef<HTMLVideoElement>(null);
  const band = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLDivElement>(null);
  const foot = useRef<HTMLDivElement>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    // Trigger on the section, not the band: the band is absolutely
    // positioned inside a pinned element, so its own start/end resolve
    // against the pin rather than the page.
    const el = band.current?.closest("section");
    if (!el) return;

    if (prefersReducedMotion()) {
      for (const v of [video.current, motes.current]) v?.pause();
      return;
    }

    const st = ScrollTrigger.create({
      trigger: el,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => {
        for (const v of [video.current, motes.current]) {
          if (!v) continue;
          if (self.isActive) {
            // preload="none", so there may be nothing to play yet.
            if (v.readyState === 0) v.load();
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        }
      },
    });
    return () => st.kill();
  }, []);

  // 0 to 1, written by the exit trigger and read by the pin, so the two
  // never fight over the clip path.
  const shut = useRef(0);

  const paint = (p: number) => {
    const still = prefersReducedMotion();
    const open = gsap.utils.clamp(0, 1, p / 0.24);
    const close = shut.current;

    gsap.set(band.current, { clipPath: shutter(open * (1 - close)) });
    gsap.set(inner.current, {
      scale: still ? 1 : 1.24 - open * 0.24 + close * 0.1,
      yPercent: still ? 0 : -p * 5,
    });
    gsap.set(title.current, {
      opacity: open * (1 - close),
      letterSpacing: `${0.2 + p * 0.5}em`,
      y: (1 - open) * 30,
    });
    gsap.set(foot.current, { opacity: open * (1 - close) });
  };

  const held = useRef(0);
  const pin = usePinSection<HTMLDivElement>({
    // Open, then hold. Nothing is reserved for the close, so every
    // pixel of the pin has a full frame in it.
    length: 1.8,
    onProgress: (p) => {
      held.current = p;
      paint(p);
    },
  });

  useEffect(() => {
    const el = band.current?.closest("section");
    if (!el) return;

    if (prefersReducedMotion()) {
      shut.current = 0;
      return;
    }

    // With pinSpacing on the section is the spacer, so its bottom hits
    // the bottom of the viewport at exactly the scroll position the pin
    // lets go, and the top one screen later. That window is the section
    // travelling up, which is the window Passage is travelling up into.
    const st = ScrollTrigger.create({
      trigger: el,
      start: "bottom bottom",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        // Shut over the first two thirds, so it reads as a cut rather
        // than something fading out as it goes.
        shut.current = gsap.utils.clamp(0, 1, self.progress / 0.66);
        // Any progress here means the pin is behind us.
        paint(self.progress > 0 ? 1 : held.current);
      },
    });
    return () => st.kill();
  }, []);

  return (
    <Chapter id="motion" tone="dark">
      <div ref={pin} className="relative h-[100svh] w-full overflow-hidden bg-ink">
        <div
          ref={band}
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: shutter(0) }}
        >
          <div ref={inner} className="absolute inset-0 will-change-transform">
            {/* last resort: a still, always present underneath */}
            <Plate name="void" sizes="100vw" quality={75} />

            {!broken && (
              <video
                ref={video}
                className="grade-video fill-abs"
                src={FOOTAGE.surface.src}
                poster={FOOTAGE.surface.poster}
                muted
                loop
                playsInline
                preload="none"
                onError={() => setBroken(true)}
                aria-hidden
              />
            )}

            {/* the dust, blended rather than overlaid */}
            <video
              ref={motes}
              className="fill-abs opacity-70 mix-blend-screen"
              src={FOOTAGE.particles.src}
              muted
              loop
              playsInline
              preload="none"
              aria-hidden
            />

            <div className="absolute inset-0 bg-ink/25" />
          </div>
        </div>

        <div className="edge pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <div
            ref={title}
            className="label text-paper opacity-0"
            style={{ fontSize: "clamp(0.7rem,1.4vw,1rem)" }}
          >
            Move through
          </div>
        </div>
        <h2 className="sr-only">Motion</h2>

        <div
          ref={foot}
          className="edge absolute inset-x-0 bottom-[clamp(1.5rem,4vw,3rem)] flex items-end justify-between gap-6 opacity-0"
        >
          <span className="label text-paper/70">08 — Motion</span>
          <span className="label text-paper/70">00:12 / loop</span>
        </div>
      </div>
    </Chapter>
  );
}
