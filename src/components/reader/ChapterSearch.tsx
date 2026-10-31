"use client";

import { FiChevronDown, FiChevronUp, FiX } from "react-icons/fi";

export default function ChapterSearch({ query, onQuery, current, total, onMove, onClose }: {
  query: string; onQuery: (value: string) => void; current: number; total: number;
  onMove: (direction: number) => void; onClose: () => void;
}) {
  return <form role="search" aria-label="Search chapter text" className="chapter-search" onSubmit={(event) => { event.preventDefault(); onMove(1); }}>
    <input autoFocus aria-label="Find in chapter" placeholder="Find in this chapter…" type="search" maxLength={200}
      value={query} onChange={(event) => onQuery(event.target.value)} />
    <output aria-live="polite" className="text-xs text-muted-foreground whitespace-nowrap">{query ? total ? `${current + 1} / ${total}` : "No matches" : "Type to find"}</output>
    <button type="button" aria-label="Previous match" disabled={!total} onClick={() => onMove(-1)}><FiChevronUp /></button>
    <button type="button" aria-label="Next match" disabled={!total} onClick={() => onMove(1)}><FiChevronDown /></button>
    <button type="button" aria-label="Close chapter search" onClick={onClose}><FiX /></button>
  </form>;
}
