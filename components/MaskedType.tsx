"use client";

import { useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { useIsomorphicLayoutEffect } from "@/hooks/useIsomorphicLayoutEffect";
import { plateUrl, type PlateKey } from "@/lib/media";

/**
 * The photograph lives inside the letterforms.
 *
 * `background-clip: text` is the only way to do this to real type: the
 * text stays selectable and readable to a screen reader, and degrades
 * to solid ink where it is unsupported. A clip-path cannot take a glyph
 * outline and an SVG <text> mask costs the semantics.
 *
 * The faint solid copy goes ON TOP. The fill is an opaque photograph,
 * so a copy behind it is hidden by definition; it has to be over the
 * fill to stop a blown highlight washing a stem out to paper.
 *
 * Scroll moves the background independently of the word, which is what
 * makes it read as a view through the letters rather than a fill.
 */
export default function MaskedType({
  children,
  plate,
  className = "",
  style,
  /** how far the image travels behind the letters, in percent */
  travel = 26,
  /** how much the image is scaled down as it passes */
  push = 26,
  /** opacity of the solid copy that guarantees the letterforms */
  ghost = 0.22,
  as: Tag = "span",
}: {
  children: string;
  plate: PlateKey;
  className?: string;
  style?: React.CSSProperties;
  travel?: number;
  push?: number;
  ghost?: number;
  as?: "span" | "h1" | "h2" | "div";
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const tween = gsap.fromTo(
      el,
      {
        backgroundPositionY: `${50 - travel / 2}%`,
        backgroundSize: `${210 + push}% auto`,
      },
      {
        backgroundPositionY: `${50 + travel / 2}%`,
        backgroundSize: "210% auto",
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [travel, push]);

  return (
    <Tag className={`relative inline-block ${className}`} style={style}>
      <span
        ref={ref}
        className="masked-type relative"
        style={{ backgroundImage: `url(${plateUrl(plate, 1800, 75)})` }}
      >
        {children}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 text-ink select-none"
        style={{ opacity: ghost }}
      >
        {children}
      </span>
    </Tag>
  );
}
