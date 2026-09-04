// Every frame in the film, in one manifest, so the grade and the crops
// can be changed in one place.

const CDN = "https://images.unsplash.com/photo-";

// The grade is imgix params on the CDN request, not a CSS filter: a
// filter on a full-bleed image makes the compositor allocate an
// offscreen buffer and re-filter the whole frame every scroll tick.
function plate(
  id: string,
  w = 2400,
  q = 75,
  contrast = 38,
  /** overall lift, and a separate pull on the top end of the curve */
  bri = 1,
  high = 0,
) {
  return (
    `${CDN}${id}?auto=format&fit=crop&w=${w}&q=${q}` +
    `&sat=-100&con=${contrast}&bri=${bri}&high=${high}`
  );
}

export type Plate = {
  src: string;
  alt: string;
  /** focal point, used for object-position on tall crops */
  focus: string;
};

/**
 * Which sources have a clean ground, measured off the files by sampling
 * their border pixels (mean, then standard deviation). Only these can be
 * cut out — blended over the page with `mix-blend-multiply` so the
 * ground disappears into the paper and the object is left floating:
 *
 *   forms 255/0.6   flat 255/0.0   stone 244/1.0
 *   salve 230/2.0   sole 228/14    vessel 240/10
 *
 * Everything else was shot on something. `noir` reads 154: there is a
 * grey card behind that bottle, and no blend mode will remove it.
 *
 * Native aspect of each source, measured from the files themselves. It
 * decides which slot a plate can go in: `object-cover` in a frame of a
 * different shape throws away the difference, and putting a 0.67 plate
 * in a 1.5 frame costs more than half its height.
 *
 *   landscape ~1.5   forms, void, ceramic, decanted, chrono (1.52)
 *   landscape ~1.3   stone (1.36), noir (1.33), salve (1.30)
 *   square           carry (1.00)
 *   portrait         sole (0.80), facet/hold (0.75), flat (0.71),
 *                    decant (0.70), and relief/knit/worn/dial/vessel/
 *                    ember/petal at 0.67
 */
const raw = {
  /* sculptural / material */
  forms: {
    id: "1519415943484-9fa1873496d4",
    alt: "Pale shoes scattered like sculpture on a white ground",
    focus: "50% 50%",
  },
  relief: {
    id: "1550895030-823330fc2551",
    alt: "A raised white relief catching a raking light",
    focus: "50% 50%",
  },
  void: {
    id: "1550684376-efcbd6e3f031",
    alt: "A black surface, close enough to read its grain",
    focus: "50% 50%",
  },
  knit: {
    id: "1509319117193-57bab727e09d",
    alt: "Heavy knitted wool hung on a rail",
    focus: "50% 50%",
  },
  flat: {
    id: "1618354691373-d851c5c3a990",
    alt: "A single black garment laid flat on white",
    focus: "50% 50%",
  },
  worn: {
    id: "1583744946564-b52ac1c389c8",
    alt: "The same garment, worn, cropped at the shoulder",
    focus: "50% 45%",
  },

  /* objects, hard-lit */
  chrono: {
    id: "1523170335258-f5ed11844a49",
    alt: "A steel chronograph on black",
    focus: "50% 50%",
  },
  dial: {
    id: "1524805444758-089113d48a6d",
    alt: "A worn watch face, low key",
    focus: "50% 50%",
  },
  stone: {
    id: "1602751584552-8ba73aad10e1",
    alt: "A cut stone set in metal, lit from one side",
    focus: "50% 50%",
  },
  vessel: {
    id: "1602143407151-7111542de6e8",
    alt: "A single vessel standing on seamless white",
    focus: "50% 50%",
  },
  ceramic: {
    id: "1610701596007-11502861dcfa",
    alt: "Unglazed ceramic, grouped and lit softly",
    focus: "50% 50%",
  },
  decant: {
    id: "1541643600914-78b084683601",
    alt: "A glass flacon photographed straight on",
    focus: "50% 45%",
  },
  noir: {
    id: "1585386959984-a4155224a1ad",
    alt: "A black flacon on a flat seamless ground",
    focus: "50% 45%",
  },
  facet: {
    id: "1587017539504-67cfbddac569",
    alt: "A faceted bottle throwing hard edges of light",
    focus: "50% 45%",
  },
  ember: {
    id: "1608528577891-eb055944f2e7",
    alt: "A heavy bottle standing on broken stone",
    focus: "50% 50%",
  },
  petal: {
    id: "1595425970377-c9703cf48b6d",
    alt: "Glass among scattered petals",
    focus: "50% 50%",
  },
  sole: {
    id: "1560343090-f0409e92791a",
    alt: "A single shoe raised on a plinth",
    focus: "50% 50%",
  },
  hold: {
    id: "1584917865442-de89df76afd3",
    alt: "A structured bag against a flat ground",
    focus: "50% 50%",
  },
  carry: {
    id: "1546938576-6e6a64f317cc",
    alt: "A soft bag photographed on white",
    focus: "50% 50%",
  },
  salve: {
    id: "1608248543803-ba4f8c70ae0b",
    alt: "A tube and its case, held mid-air",
    focus: "50% 50%",
  },
  decanted: {
    id: "1526947425960-945c6e72858f",
    alt: "Two white bottles standing together",
    focus: "50% 50%",
  },
} satisfies Record<string, { id: string; alt: string; focus: string }>;

export type PlateKey = keyof typeof raw;

export const PLATES: Record<PlateKey, Plate> = Object.fromEntries(
  Object.entries(raw).map(([k, v]) => [
    k,
    { src: plate(v.id), alt: v.alt, focus: v.focus },
  ]),
) as Record<PlateKey, Plate>;

/** The same set, pushed harder, for plates that carry a whole screen. */
export const PLATES_HARD: Record<PlateKey, Plate> = Object.fromEntries(
  Object.entries(raw).map(([k, v]) => [
    k,
    { src: plate(v.id, 2400, 75, 60), alt: v.alt, focus: v.focus },
  ]),
) as Record<PlateKey, Plate>;

/** Low-resolution stand-in used by the loader to warm the cache. */
export function preview(key: PlateKey, w = 480) {
  return plate(raw[key].id, w, 60);
}

/**
 * Plain URL for the text-shaped masks, which need a CSS background
 * rather than a next/image.
 *
 * Graded darker than everything else on purpose: a masked word sits on
 * paper, so any part of the fill that reaches white takes the letter
 * with it and there is nothing underneath to catch it.
 */
export function plateUrl(
  key: PlateKey,
  w = 1800,
  q: 60 | 75 | 90 = 75,
  contrast = 46,
) {
  return plate(raw[key].id, w, q, contrast, -24, -46);
}

// Graded in CSS (see .grade-video); the CDN cannot do it for these.
export const FOOTAGE = {
  particles: {
    src: "https://videos.pexels.com/video-files/3045163/3045163-hd_1920_1080_25fps.mp4",
    poster:
      "https://images.pexels.com/videos/3045163/free-video-3045163.jpg?auto=compress&w=1280",
  },
  surface: {
    src: "https://videos.pexels.com/video-files/3571264/3571264-hd_1920_1080_30fps.mp4",
    poster:
      "https://images.pexels.com/videos/3571264/free-video-3571264.jpg?auto=compress&w=1280",
  },
} as const;
