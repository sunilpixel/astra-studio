/**
 * Every transition on the site is one of these shapes. Nothing
 * cross-fades.
 *
 *   blade    angled edge sweeping across   (cuts)
 *   chevron  wedge opening from a point    (arrivals)
 *   iris     circle out from the centre    (focus)
 *   shutter  two edges parting             (holds)
 *   slit     the same, vertically
 *
 * All pure functions of progress, so a scrub, a timeline and a click
 * can drive them without knowing about each other.
 */

export type ClipFamily = "blade" | "chevron" | "iris" | "shutter" | "slit";

/** Which way a shape travels. */
export type ClipDir = "left" | "right" | "up" | "down";

const pct = (n: number) => `${+n.toFixed(3)}%`;

function poly(points: [number, number][]) {
  return `polygon(${points.map(([x, y]) => `${pct(x)} ${pct(y)}`).join(", ")})`;
}

/** `skew` is the lean of the leading edge, as a % of frame height. */
export function blade(p: number, dir: ClipDir = "right", skew = 26): string {
  const t = p * (100 + skew);
  switch (dir) {
    case "right":
      return poly([
        [0, 0],
        [t, 0],
        [t - skew, 100],
        [0, 100],
      ]);
    case "left":
      return poly([
        [100 - t + skew, 0],
        [100, 0],
        [100, 100],
        [100 - t, 100],
      ]);
    case "up":
      return poly([
        [0, 100 - t],
        [100, 100 - t + skew],
        [100, 100],
        [0, 100],
      ]);
    default:
      return poly([
        [0, 0],
        [100, 0],
        [100, t - skew],
        [0, t],
      ]);
  }
}

export function chevron(p: number, dir: ClipDir = "up"): string {
  const t = p * 150;
  switch (dir) {
    case "up":
      return poly([
        [50 - t, 100],
        [50, 100 - t],
        [50 + t, 100],
        [50 + t, 100],
        [50 - t, 100],
      ]);
    case "down":
      return poly([
        [50 - t, 0],
        [50 + t, 0],
        [50, t],
      ]);
    case "right":
      return poly([
        [0, 50 - t],
        [t, 50],
        [0, 50 + t],
      ]);
    default:
      return poly([
        [100, 50 - t],
        [100, 50 + t],
        [100 - t, 50],
      ]);
  }
}

// 92, not 100: the radius is a % of the frame's own diagonal, so it has
// to overshoot to clear the corners.
export function iris(p: number, cx = 50, cy = 50): string {
  return `circle(${pct(p * 92)} at ${pct(cx)} ${pct(cy)})`;
}

/** Top and bottom edges parting: letterbox to full frame. */
export function shutter(p: number): string {
  const bar = (1 - p) * 50;
  return `inset(${pct(bar)} 0% ${pct(bar)} 0%)`;
}

/** The same, from a vertical centre line. */
export function slit(p: number): string {
  const bar = (1 - p) * 50;
  return `inset(0% ${pct(bar)} 0% ${pct(bar)})`;
}

export function clipAt(
  family: ClipFamily,
  p: number,
  dir: ClipDir = "right",
): string {
  const t = p < 0 ? 0 : p > 1 ? 1 : p;
  switch (family) {
    case "blade":
      return blade(t, dir);
    case "chevron":
      return chevron(t, dir);
    case "iris":
      return iris(t);
    case "shutter":
      return shutter(t);
    default:
      return slit(t);
  }
}

/** Endpoints, for tweens that are not scrubbed. */
export const CLOSED = {
  blade: blade(0),
  chevron: chevron(0),
  iris: iris(0),
  shutter: shutter(0),
  slit: slit(0),
} as const;

export const OPEN = {
  blade: blade(1),
  chevron: chevron(1),
  iris: iris(1),
  shutter: shutter(1),
  slit: slit(1),
} as const;
