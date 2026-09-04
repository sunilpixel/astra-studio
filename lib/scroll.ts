"use client";

// Written once per Lenis frame, read from inside loops that are already
// running. Nothing here should add a scroll listener of its own.
export const scrollState = {
  /** 0 at rest, ~1 at a brisk wheel scroll */
  velocity: 0,
  /** raw px/frame, signed */
  raw: 0,
  progress: 0,
};

type Locker = (locked: boolean) => void;
let locker: Locker | null = null;

export function registerScrollLock(fn: Locker | null) {
  locker = fn;
}

export function lockScroll(locked: boolean) {
  locker?.(locked);
}

type Scroller = { scrollTo: (target: number | string, opts?: object) => void };
let scroller: Scroller | null = null;

export function registerScroller(s: Scroller | null) {
  scroller = s;
}

export function scrollTo(target: number | string, opts?: object) {
  if (scroller) scroller.scrollTo(target, opts);
  else if (typeof target === "number") window.scrollTo({ top: target });
}
