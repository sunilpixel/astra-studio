import Image from "next/image";
import { PLATES, PLATES_HARD, type PlateKey } from "@/lib/media";

// Fills whatever frame it is dropped into. Never a card, never boxed.
export default function Plate({
  name,
  sizes = "100vw",
  priority = false,
  hard = false,
  fit = "cover",
  className = "",
  quality = 75,
  focus,
}: {
  name: PlateKey;
  sizes?: string;
  priority?: boolean;
  /** push the contrast further, for plates that carry a whole screen */
  hard?: boolean;
  /**
   * `contain` for a plate that is being cut out. There are no visible
   * letterbox bars when the plate's ground is the same colour as the
   * frame it sits in, so nothing has to be cropped to fill it.
   */
  fit?: "cover" | "contain";
  className?: string;
  quality?: 60 | 75 | 90;
  focus?: string;
}) {
  const plate = hard ? PLATES_HARD[name] : PLATES[name];
  return (
    <Image
      src={plate.src}
      alt={plate.alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={quality}
      draggable={false}
      className={`select-none ${fit === "contain" ? "object-contain" : "object-cover"} ${className}`}
      style={{ objectPosition: focus ?? plate.focus }}
    />
  );
}
