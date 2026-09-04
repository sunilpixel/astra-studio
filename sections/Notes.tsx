"use client";

import Chapter from "@/components/Chapter";
import { chapterNo } from "@/lib/chapters";
import { gsap, prefersReducedMotion, SplitText } from "@/lib/gsap";
import { useGsapContext, useReveal } from "@/hooks/animation";

/**
 * The one place on the site that asks to be read rather than watched.
 *
 * Everything before this is a photograph or a piece of motion, and a
 * volume that never says anything in its own words is a lookbook. The
 * notes are set as body copy, at a size you would actually read.
 *
 * The one thing that moves is the reading itself: each note is split
 * into words and scrubbed from dim to full as it passes, so the line
 * you are on is the brightest thing on the screen and the scroll is
 * doing the same work your eye is. Nothing translates, nothing fades in
 * as a block; the text is in place the whole time and only its weight
 * on the page changes.
 */

const NOTES = [
  {
    n: "i",
    head: "On the ground",
    body: "Seamless white is not a background. It is a decision to remove the room, and everything the room would have told you about scale, about weather, about whose hands the thing had been in. What is left has to carry all of that on its own, which most objects cannot do.",
  },
  {
    n: "ii",
    head: "On the object",
    body: "We photographed twenty. Four are in the volume. The rest failed the same test in the same way: photographed against nothing, they turned out to have been interesting only in context, and the context was the part we had thrown away.",
  },
  {
    n: "iii",
    head: "On distance",
    body: "Tracking is the only typographic control that behaves like a camera. Set it tight and the word is one shape; open it and the letters become separate objects on a ground. The volume opens its own title across four seconds of scroll for that reason and no other.",
  },
  {
    n: "iv",
    head: "On the take",
    body: "There are no pages here. The ground colour is cut across the frame at every join rather than changed between them, so the whole volume is one move from the first frame to the last. Whether that is a film or a document is not a question we found worth settling.",
  },
];

const COLOPHON = [
  ["Photography", "Studio, over one season"],
  ["Direction", "Astra"],
  ["Type", "Cormorant Garamond, Inter"],
  ["Volume", "01 / Object, 2026"],
];

export default function Notes() {
  const head = useReveal<HTMLHeadingElement>({ kind: "lines", start: "top 84%" });

  const scope = useGsapContext<HTMLDivElement>((el) => {
    const heads = el.querySelectorAll("[data-note-head]");
    const bodies = el.querySelectorAll<HTMLElement>("[data-note-body]");
    const rows = el.querySelectorAll("[data-colophon]");

    if (prefersReducedMotion()) {
      gsap.set([...heads, ...bodies, ...rows], { autoAlpha: 1, y: 0 });
      return;
    }

    gsap.fromTo(
      heads,
      { autoAlpha: 0, y: 18 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: "astra",
        scrollTrigger: { trigger: el, start: "top 74%", once: true },
      },
    );

    // No mask on this split. The masks are for lines that travel out of
    // one, and these do not move at all; wrapping them would only put an
    // overflow:hidden around every descender for nothing.
    const splits = Array.from(bodies).map((body) =>
      SplitText.create(body, {
        type: "words",
        aria: "auto",
        autoSplit: true,
        onSplit: (self) =>
          gsap.fromTo(
            self.words,
            { opacity: 0.16 },
            {
              opacity: 1,
              ease: "none",
              stagger: 0.4,
              scrollTrigger: {
                trigger: body,
                start: "top 84%",
                end: "bottom 58%",
                scrub: true,
                invalidateOnRefresh: true,
              },
            },
          ),
      }),
    );

    gsap.fromTo(
      rows,
      { autoAlpha: 0 },
      {
        autoAlpha: 1,
        duration: 0.9,
        stagger: 0.08,
        ease: "astra",
        scrollTrigger: { trigger: rows[0] ?? el, start: "top 92%", once: true },
      },
    );

    return () => splits.forEach((s) => s.revert());
  });

  return (
    <Chapter id="notes" tone="dark">
      <div
        ref={scope}
        className="edge relative bg-ink py-[clamp(6rem,16vh,11rem)] text-paper"
      >
        <div className="mx-auto max-w-[92rem]">
          <div className="flex items-start justify-between gap-6">
            <span className="label text-paper/70">{chapterNo("notes")} — Notes</span>
            <span className="label hidden text-paper/70 sm:block">
              In our own words
            </span>
          </div>

          <h2
            ref={head}
            className="display mt-[clamp(2.5rem,7vw,5rem)] max-w-[18ch] text-paper opacity-0"
            style={{ fontSize: "clamp(2.4rem,7vw,6rem)" }}
          >
            Four things we only learned by throwing sixteen away.
          </h2>

          <div className="mt-[clamp(3.5rem,9vw,7rem)] grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-[clamp(2.5rem,5vw,4rem)] md:grid-cols-2">
            {NOTES.map((note) => (
              <article
                key={note.n}
                className="border-t border-paper/15 pt-6"
              >
                <div data-note-head className="flex items-baseline gap-4 opacity-0">
                  <span className="label text-signal">{note.n}</span>
                  <h3 className="label text-paper">{note.head}</h3>
                </div>
                <p
                  data-note-body
                  className="mt-5 max-w-[46ch] text-paper"
                  style={{
                    fontSize: "clamp(0.95rem,1.15vw,1.1rem)",
                    lineHeight: 1.62,
                  }}
                >
                  {note.body}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-[clamp(4rem,10vw,8rem)] border-t border-paper/15 pt-8">
            <dl className="grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              {COLOPHON.map(([term, value]) => (
                <div key={term} data-colophon className="opacity-0">
                  <dt className="label text-paper/45">{term}</dt>
                  <dd
                    className="display-italic mt-3 text-paper/85"
                    style={{ fontSize: "clamp(1rem,1.3vw,1.25rem)" }}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </Chapter>
  );
}
