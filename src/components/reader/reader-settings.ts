import type { ReaderFont } from "@/store/readerStore";

export const READER_FONTS: {
  value: ReaderFont;
  label: string;
  family: string;
}[] = [
  {
    value: "serif",
    label: "Book serif",
    family: 'Georgia, "Times New Roman", serif',
  },
  { value: "inter", label: "Inter", family: "var(--font-inter), sans-serif" },
  {
    value: "roboto",
    label: "Roboto",
    family: "var(--font-roboto), sans-serif",
  },
  { value: "system", label: "System", family: "system-ui, sans-serif" },
  {
    value: "fira-code",
    label: "Fira Code",
    family: "var(--font-fira-code), monospace",
  },
  {
    value: "josephin",
    label: "Josefin Sans",
    family: "var(--font-josephin), sans-serif",
  },
];

export function chapterParagraphs(content: string) {
  return content
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
