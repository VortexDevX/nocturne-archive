"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReaderStore } from "@/store/readerStore";

// Mounted once per chapter. A closing chapter can never save the next chapter's position.
export function useReadingProgress(
  novelId: string,
  chapterNumber: number,
  totalChapters: number,
) {
  const [resume, setResume] = useState<{
    position: number;
    fraction?: number;
  } | null>(null);
  const ready = useRef(false);
  const snapshot = useRef({ position: 0, fraction: 0 });
  const dirty = useRef(false);
  const pending = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    const controller = new AbortController();
    async function restore() {
      const local = useReaderStore.getState();
      let position =
        local.currentNovel === novelId && local.currentChapter === chapterNumber
          ? local.scrollPosition
          : 0;
      let fraction: number | undefined;
      try {
        const response = await fetch(
          `/api/reading/progress?novelId=${encodeURIComponent(novelId)}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );
        const result = await response.json();
        if (result.success && result.data?.currentChapter === chapterNumber) {
          position =
            result.data.currentScrollPosition ??
            result.data.currentPosition ??
            0;
          fraction = result.data.chapterProgress;
        }
      } catch {
        /* Local position remains available offline. */
      }
      if (!controller.signal.aborted) setResume({ position, fraction });
    }
    void restore();
    return () => controller.abort();
  }, [novelId, chapterNumber]);

  const record = useCallback((position: number, fraction: number) => {
    if (!ready.current) return;
    snapshot.current = { position, fraction };
    dirty.current = true;
  }, []);

  const markRestored = useCallback(() => {
    ready.current = true;
    dirty.current = true;
  }, []);

  useEffect(() => {
    const save = (keepalive = false) => {
      if (!ready.current || !dirty.current) return;
      dirty.current = false;
      const { position, fraction } = snapshot.current;
      useReaderStore
        .getState()
        .setReadingPosition(novelId, chapterNumber, position);
      const body = JSON.stringify({
        novelId,
        chapterNumber,
        position,
        chapterProgress: fraction,
        progressPercent:
          ((chapterNumber - 1 + fraction) / Math.max(1, totalChapters)) * 100,
      });
      // Serialize periodic writes so slower responses cannot move progress backwards.
      const write = () =>
        fetch("/api/reading/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive,
        })
          .then((response) => {
            if (!response.ok) dirty.current = true;
          })
          .catch(() => {
            dirty.current = true;
          });
      if (keepalive) void write();
      else pending.current = pending.current.then(write);
    };
    const interval = window.setInterval(() => save(), 10000);
    const onHidden = () => {
      if (document.visibilityState === "hidden") save(true);
    };
    const onPageHide = () => save(true);
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      save(true);
    };
  }, [novelId, chapterNumber, totalChapters]);

  return { resume, record, markRestored };
}
