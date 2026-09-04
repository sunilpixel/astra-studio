import { useEffect, useLayoutEffect } from "react";

/** useLayoutEffect that does not warn during server rendering. */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
