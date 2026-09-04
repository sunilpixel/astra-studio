export type Chapter = {
  id: string;
  index: string;
  title: string;
  /** which top-level nav heading this chapter belongs to */
  group: "index" | "studies" | "objects" | "archive";
};

/**
 * Order is the only thing declared here. The numbers are derived from
 * it, because they were hand-written into nine section headers as well
 * as this list, and every movement inserted in the middle silently put
 * the two out of step.
 */
const ORDER = [
  { id: "nothing", title: "Nothing", group: "index" },
  { id: "between", title: "The Space Between", group: "index" },
  { id: "studies", title: "Five Studies", group: "studies" },
  { id: "matter", title: "Matter", group: "studies" },
  { id: "archive", title: "Archive", group: "archive" },
  { id: "composition", title: "Composition", group: "objects" },
  { id: "weight", title: "Weight", group: "objects" },
  { id: "motion", title: "Motion", group: "objects" },
  { id: "passage", title: "Passage", group: "studies" },
  { id: "notes", title: "Notes", group: "archive" },
  { id: "still", title: "Still", group: "archive" },
] as const satisfies readonly Omit<Chapter, "index">[];

export const CHAPTERS: Chapter[] = ORDER.map((c, i) => ({
  ...c,
  index: String(i + 1).padStart(2, "0"),
}));

/** The two-digit number a section prints in its own header. */
export function chapterNo(id: string): string {
  return CHAPTERS.find((c) => c.id === id)?.index ?? "";
}

const WORDS = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
  "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
];

/** "Eleven", for the copy that counts the movements out loud. */
export const MOVEMENTS = WORDS[CHAPTERS.length] ?? String(CHAPTERS.length);

export const NAV = [
  { key: "index", label: "Index", target: "#nothing" },
  { key: "studies", label: "Studies", target: "#studies" },
  { key: "objects", label: "Objects", target: "#composition" },
  { key: "archive", label: "Archive", target: "#archive" },
] as const;
