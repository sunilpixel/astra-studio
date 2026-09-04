export type Chapter = {
  id: string;
  index: string;
  title: string;
  /** which top-level nav heading this chapter belongs to */
  group: "index" | "studies" | "objects" | "archive";
};

export const CHAPTERS: Chapter[] = [
  { id: "nothing", index: "01", title: "Nothing", group: "index" },
  { id: "between", index: "02", title: "The Space Between", group: "index" },
  { id: "studies", index: "03", title: "Five Studies", group: "studies" },
  { id: "matter", index: "04", title: "Matter", group: "studies" },
  { id: "archive", index: "05", title: "Archive", group: "archive" },
  { id: "composition", index: "06", title: "Composition", group: "objects" },
  { id: "weight", index: "07", title: "Weight", group: "objects" },
  { id: "motion", index: "08", title: "Motion", group: "objects" },
  { id: "passage", index: "09", title: "Passage", group: "studies" },
  { id: "notes", index: "10", title: "Notes", group: "archive" },
  { id: "still", index: "11", title: "Still", group: "archive" },
];

export const NAV = [
  { key: "index", label: "Index", target: "#nothing" },
  { key: "studies", label: "Studies", target: "#studies" },
  { key: "objects", label: "Objects", target: "#composition" },
  { key: "archive", label: "Archive", target: "#archive" },
] as const;
