"use client";

import type { ReactNode } from "react";

// Identity and ground tone only. Which chapter is on screen is
// ChapterTracker's call, not a section's.
export default function Chapter({
  id,
  children,
  className = "",
  tone = "dark",
}: {
  id: string;
  children: ReactNode;
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <section
      id={id}
      data-tone={tone}
      className={`relative ${className}`}
    >
      {children}
    </section>
  );
}
