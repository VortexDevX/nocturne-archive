"use client";

import { useCallback, useEffect, useLayoutEffect, useDeferredValue, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ChapterSearch from "@/components/reader/ChapterSearch";
import ThemeChoices from "@/components/ui/ThemeChoices";
import {
  FiArrowLeft,
  FiArrowRight,
  FiBookmark,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiList,
  FiSearch,
  FiSliders,
  FiBookOpen,
  FiClock,
  FiWifiOff,
} from "react-icons/fi";
import { useTheme } from "@/components/providers/ThemeProvider";
import Modal from "@/components/ui/Modal";
import BookmarkModal from "@/components/reader/BookmarkModal";
import {
  READER_FONTS,
  chapterParagraphs,
} from "@/components/reader/reader-settings";
import { useReadingProgress } from "@/components/reader/use-reading-progress";
import { useReaderStore } from "@/store/readerStore";
import {
  getChapterOffline,
  listCachedChapterNumbers,
  saveChapterOffline,
} from "@/lib/storage/offline";

interface Chapter {
  number: number;
  title: string;
  content: string;
  offline?: boolean;
}
interface Novel {
  title: string;
  author: string;
  totalChapters: number;
  chapters: { number: number; title: string }[];
}

export default function ReaderPage() {
  const params = useParams<{ novelId: string; chapterId: string }>();
  return (
    <ReaderSession
      key={params.novelId}
      novelId={params.novelId}
      chapterId={Number(params.chapterId)}
    />
  );
}

function ReaderSession({
  novelId,
  chapterId,
}: {
  novelId: string;
  chapterId: number;
}) {
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [offlineMode, setOfflineMode] = useState(false);
  const cache = useRef(new Map<number, Promise<Chapter>>());

  useEffect(() => {
    const controller = new AbortController();
    const initialSettings = useReaderStore.getState();
    void fetch("/api/user/preferences", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((result) => {
        if (!controller.signal.aborted && result.success) {
          setOfflineMode(Boolean(result.data.offlineMode));
          const { fontSize, fontFamily, lineHeight, brightness, accentColor } =
            result.data;
          const current = useReaderStore.getState();
          const unchanged = (
            [
              "fontSize",
              "fontFamily",
              "lineHeight",
              "brightness",
              "accentColor",
            ] as const
          ).every((key) => current[key] === initialSettings[key]);
          if (unchanged)
            useReaderStore.setState({
              fontSize,
              fontFamily,
              lineHeight,
              brightness,
              accentColor,
            });
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Metadata loads independently of chapters; large tables of contents load once.
  useEffect(() => {
    const controller = new AbortController();
    async function loadNovel() {
      try {
        const response = await fetch(
          `/api/novels/${encodeURIComponent(novelId)}`,
          { signal: controller.signal },
        );
        const result = await response.json();
        if (!response.ok || !result.success)
          throw new Error("Novel unavailable");
        if (!controller.signal.aborted) setNovel(result.data);
      } catch {
        if (controller.signal.aborted) return;
        const numbers = await listCachedChapterNumbers(novelId).catch(() => []);
        if (controller.signal.aborted) return;
        if (numbers.length)
          setNovel({
            title: "Offline reading",
            author: "Downloaded chapters",
            totalChapters: Math.max(...numbers),
            chapters: numbers.map((number) => ({
              number,
              title: `Chapter ${number}`,
            })),
          });
        else
          setError(
            "This novel couldn't be loaded. Check your connection and try again.",
          );
      }
    }
    void loadNovel();
    return () => controller.abort();
  }, [novelId, retry]);

  const loadChapter = useCallback(
    (number: number) => {
      const existing = cache.current.get(number);
      if (existing) return existing;
      const request = (async (): Promise<Chapter> => {
        try {
          const response = await fetch(
            `/api/novels/${encodeURIComponent(novelId)}/chapter/${number}`,
          );
          const result = await response.json();
          if (!response.ok || !result.success)
            throw new Error(result.message || "Chapter unavailable");
          return result.data;
        } catch (failure) {
          const saved = await getChapterOffline(novelId, number).catch(
            () => null,
          );
          if (saved) return { ...saved, offline: true };
          throw failure;
        }
      })();
      cache.current.set(number, request);
      if (cache.current.size > 3)
        cache.current.delete(cache.current.keys().next().value!);
      void request.catch(() => {
        cache.current.delete(number);
      });
      return request;
    },
    [novelId],
  );

  useEffect(() => {
    let cancelled = false;
    if (!Number.isInteger(chapterId) || chapterId < 1) return;
    void loadChapter(chapterId)
      .then((data) => {
        if (!cancelled) {
          setChapter({ ...data, number: chapterId });
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "This chapter isn't available. Reconnect or choose a downloaded chapter.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [chapterId, loadChapter, retry]);

  useEffect(() => {
    if (!chapter || !novel || chapter.number !== chapterId) return;
    if (offlineMode && !chapter.offline)
      void saveChapterOffline(
        novelId,
        chapterId,
        chapter.title,
        chapter.content,
      ).catch(() => {});
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (connection?.saveData || !navigator.onLine) return;
    const next = novel.chapters.find((item) => item.number > chapterId);
    if (!next) return;
    const timer = window.setTimeout(() => {
      void loadChapter(next.number)
        .then((data) => {
          if (offlineMode)
            void saveChapterOffline(
              novelId,
              next.number,
              data.title,
              data.content,
            ).catch(() => {});
        })
        .catch(() => {});
    }, 800);
    return () => window.clearTimeout(timer);
  }, [chapter, novel, chapterId, novelId, offlineMode, loadChapter]);

  if (!Number.isInteger(chapterId) || chapterId < 1 || error)
    return (
      <div className="reader-empty">
        <FiWifiOff className="h-8 w-8 text-primary" />
        <h1>Let's get you back to your book.</h1>
        <p>{error || "Choose a valid chapter to start reading."}</p>
        <div className="flex gap-3">
          <Link className="reader-action" href={`/novel/${novelId}`}>
            View chapters
          </Link>
          <button
            className="reader-action"
            onClick={() => {
              setError("");
              setRetry((n) => n + 1);
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  if (!novel || chapter?.number !== chapterId)
    return (
      <div className="reader-empty" role="status">
        <span className="eyebrow">NOCTURNE / READER</span>
        <h1>Opening your next escape.</h1>
        <div className="w-64 space-y-3 animate-pulse" aria-hidden="true">
          {[100, 92, 98, 65].map((width) => (
            <div
              key={width}
              className="h-2 rounded bg-secondary"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          Loading chapter {chapterId}…
        </span>
      </div>
    );
  return (
    <ChapterReader
      key={`${novelId}:${chapterId}`}
      novelId={novelId}
      novel={novel}
      chapter={chapter}
    />
  );
}

function ChapterReader({
  novelId,
  novel,
  chapter,
}: {
  novelId: string;
  novel: Novel;
  chapter: Chapter;
}) {
  const router = useRouter();
  const [chromeHidden, setChromeHidden] = useState(false);
  const pointerStart = useRef({ x: 0, y: 0, scroll: 0 });
  const { theme, setTheme } = useTheme();
  const settings = useReaderStore();
  const {
    fontSize,
    fontFamily,
    lineHeight,
    brightness,
    accentColor,
    contentWidth,
    readingMode,
  } = settings;
  const viewport = useRef<HTMLDivElement>(null);
  const article = useRef<HTMLElement>(null);
  const fractionRef = useRef(0);
  const [pages, setPages] = useState({ current: 1, total: 1 });
  const [panel, setPanel] = useState<"settings" | "chapters" | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const deferredQuery = useDeferredValue(findQuery);
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const [bookmark, setBookmark] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [search, setSearch] = useState("");
  const [chapterWindow, setChapterWindow] = useState(0);
  const chaptersViewport = useCallback((el: HTMLDivElement | null) => {
    if (el) el.scrollTop = Math.max(0, novel.chapters.findIndex((ch) => ch.number === chapter.number) * 60 - 120);
  }, [novel.chapters, chapter.number]);
  const { resume, record, markRestored } = useReadingProgress(
    novelId,
    chapter.number,
    novel.totalChapters,
  );
  const paragraphs = useMemo(
    () => chapterParagraphs(chapter.content),
    [chapter.content],
  );
  const found = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    let count = 0;
    const text = paragraphs.map((paragraph) => {
      if (!needle) return paragraph;
      const parts: React.ReactNode[] = [];
      const lower = paragraph.toLowerCase();
      let cursor = 0;
      let offset = lower.indexOf(needle);
      while (offset !== -1 && count < 5000) {
        parts.push(paragraph.slice(cursor, offset));
        const index = count++;
        parts.push(<mark key={index} data-reader-match={index} className={index === matchIndex ? "current-match" : ""}>{paragraph.slice(offset, offset + needle.length)}</mark>);
        cursor = offset + needle.length;
        offset = lower.indexOf(needle, cursor);
      }
      parts.push(paragraph.slice(cursor));
      return parts;
    });
    return { text, count };
  }, [paragraphs, deferredQuery, matchIndex]);
  useEffect(() => {
    if (!findOpen || !deferredQuery.trim()) return;
    const el = viewport.current;
    const match = article.current?.querySelector<HTMLElement>(`[data-reader-match="${matchIndex}"]`);
    if (!el || !match) return;
    const box = match.getBoundingClientRect();
    const frame = el.getBoundingClientRect();
    if (readingMode === "paged") el.scrollLeft = Math.floor((el.scrollLeft + box.left - frame.left) / el.clientWidth) * el.clientWidth;
    else el.scrollTop += box.top - frame.top - el.clientHeight / 3;
  }, [findOpen, deferredQuery, matchIndex, found.count, readingMode]);
  const words = useMemo(
    () => chapter.content.trim().split(/\s+/).filter(Boolean).length,
    [chapter.content],
  );
  const font =
    READER_FONTS.find((f) => f.value === fontFamily) || READER_FONTS[0];
  const filteredChapters = useMemo(
    () =>
      novel.chapters.filter((ch) =>
        `${ch.number} ${ch.title}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [novel.chapters, search],
  );
  const currentIndex = novel.chapters.findIndex(
    (ch) => ch.number === chapter.number,
  );
  const previous = novel.chapters[currentIndex - 1];
  const next = novel.chapters[currentIndex + 1];

  const measure = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    const paged = readingMode === "paged";
    const extent = paged
      ? el.scrollWidth - el.clientWidth
      : el.scrollHeight - el.clientHeight;
    const position = paged ? el.scrollLeft : el.scrollTop;
    const fraction =
      extent > 1 ? Math.min(1, Math.max(0, position / extent)) : 1;
    fractionRef.current = fraction;
    if (paged)
      setPages({
        current: Math.round(el.scrollLeft / el.clientWidth) + 1,
        total: Math.max(1, Math.round(el.scrollWidth / el.clientWidth)),
      });
    record(position, fraction);
  }, [readingMode, record]);

  useEffect(() => {
    if (!resume || !viewport.current) return;
    let cancelled = false;
    const el = viewport.current;
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      const extent =
        readingMode === "paged"
          ? el.scrollWidth - el.clientWidth
          : el.scrollHeight - el.clientHeight;
      const restored =
        resume.fraction === undefined
          ? resume.position
          : resume.fraction * extent;
      if (readingMode === "paged")
        el.scrollLeft = Math.round(restored / el.clientWidth) * el.clientWidth;
      else el.scrollTop = restored;
      markRestored();
      measure();
    });
    return () => {
      cancelled = true;
    };
    // Restore once; subsequent typography changes preserve the current fraction below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume]);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const fraction = fractionRef.current;
    const frame = requestAnimationFrame(() => {
      if (readingMode === "paged")
        el.scrollLeft =
          Math.round(
            (fraction * (el.scrollWidth - el.clientWidth)) / el.clientWidth,
          ) * el.clientWidth;
      else el.scrollTop = fraction * (el.scrollHeight - el.clientHeight);
      measure();
    });
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    if (article.current) observer.observe(article.current);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [fontSize, fontFamily, lineHeight, contentWidth, readingMode, measure]);

  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const fraction = fractionRef.current;
    if (readingMode === "paged") el.scrollLeft = Math.round(fraction * (el.scrollWidth - el.clientWidth) / el.clientWidth) * el.clientWidth;
    else el.scrollTop = fraction * (el.scrollHeight - el.clientHeight);
    measure();
  }, [chromeHidden, readingMode, measure]);

  const navigate = useCallback(
    (number: number) => {
      router.push(`/reader/${novelId}/${number}`, { scroll: false });
    },
    [novelId, router],
  );
  const turnPage = useCallback(
    (direction: -1 | 1) => {
      const el = viewport.current;
      if (!el) return;
      if (readingMode === "paged") {
        const target = el.scrollLeft + direction * el.clientWidth;
        if (target > el.scrollWidth - el.clientWidth + 1 && next)
          navigate(next.number);
        else if (target < -1 && previous) navigate(previous.number);
        else el.scrollTo({ left: Math.max(0, target), behavior: "instant" });
      } else
        el.scrollBy({
          top: direction * el.clientHeight * 0.85,
          behavior: "instant",
        });
    },
    [readingMode, next, previous, navigate],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && findOpen) {
        setFindOpen(false); setFindQuery(""); searchTrigger.current?.focus(); return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault(); setChromeHidden(false); setFindOpen(true); return;
      }
      if (event.key === "Escape" && !panel && !bookmark) {
        setChromeHidden(false);
        return;
      }
      if (
        panel ||
        bookmark ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (event.target instanceof HTMLElement &&
          event.target.closest(
            "input, textarea, select, button, a, [contenteditable=true]",
          ))
      )
        return;
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        turnPage(1);
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        turnPage(-1);
      }
      if (event.key.toLowerCase() === "m")
        setChromeHidden((hidden) => !hidden);
      if (event.key.toLowerCase() === "s") setPanel("settings");
      if (event.key === "Escape")
        setChromeHidden(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, bookmark, findOpen, turnPage]);

  const firstSettings = useRef(true);
  const pendingPreferences = useRef<string | null>(null);
  useEffect(() => {
    if (firstSettings.current) {
      firstSettings.current = false;
      return;
    }
    const body = JSON.stringify({
      fontSize,
      fontFamily,
      lineHeight,
      brightness,
      accentColor,
    });
    pendingPreferences.current = body;
    const timer = window.setTimeout(() => {
      pendingPreferences.current = null;
      void fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
      }).catch(() => {});
    }, 600);
    return () => window.clearTimeout(timer);
  }, [fontSize, fontFamily, lineHeight, brightness, accentColor]);

  useEffect(
    () => () => {
      if (pendingPreferences.current)
        void fetch("/api/user/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: pendingPreferences.current,
          keepalive: true,
        }).catch(() => {});
    },
    [],
  );

  const openChapters = () => {
    setSearch("");
    setChapterWindow(Math.max(0, currentIndex * 60 - 120));
    setPanel("chapters");
  };
  const windowStart = Math.max(0, Math.floor(chapterWindow / 60) - 4);
  const visibleChapters = filteredChapters.slice(windowStart, windowStart + 20);

  return (
    <div className={`reader-shell reader-tint-${accentColor} ${chromeHidden ? "is-focused" : ""}`}
      onPointerDown={(event) => { pointerStart.current = { x: event.clientX, y: event.clientY, scroll: viewport.current?.scrollTop || viewport.current?.scrollLeft || 0 }; }}
      onClick={(event) => {
        if (panel || bookmark || event.detail > 1 || !(event.target instanceof HTMLElement) ||
          event.target.closest("button, a, input, select, textarea, [role=dialog], .chapter-search")) return;
        if (window.getSelection()?.toString().trim()) return;
        const start = pointerStart.current;
        if (event.detail !== 0 && (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8 ||
          Math.abs((viewport.current?.scrollTop || viewport.current?.scrollLeft || 0) - start.scroll) > 8)) return;
        setChromeHidden((hidden) => !hidden);
      }}>
      <header className="reader-toolbar">
        <Link href={`/novel/${novelId}`} className="reader-back" aria-label="Back to novel">
          <FiArrowLeft aria-hidden="true" /><span>Back to book</span>
        </Link>
        <div className="reader-book-title">
          <span className="eyebrow">NOW READING</span>
          <Link href={`/novel/${novelId}`}>{novel.title}</Link>
        </div>
        <span className="reader-tap-hint text-xs text-muted-foreground text-right">Tap page to hide controls</span>
      </header>

      {findOpen && <ChapterSearch query={findQuery} onQuery={(value) => { setFindQuery(value); setMatchIndex(0); }}
        current={matchIndex} total={found.count} onMove={(direction) => setMatchIndex((index) => found.count ? (index + direction + found.count) % found.count : 0)}
        onClose={() => { setFindOpen(false); setFindQuery(""); searchTrigger.current?.focus(); }} />}
      <div className="reader-workspace">
        <aside className="reader-margin" aria-label="Book information">
          <Image src="/brand/nocturne-mark-64.png" alt="" width={32} height={32} />
          <span className="reader-imprint">Nocturne</span>
          <div className="reader-margin-rule" />
          <p className="eyebrow">YOUR PLACE</p>
          <p className="reader-chapter-number">{String(chapter.number).padStart(2, "0")}</p>
          <p className="text-xs text-muted-foreground">of {novel.totalChapters.toLocaleString()} chapters</p>
          <p className="reader-margin-author">{novel.author}</p>
          {chapter.offline && <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><FiWifiOff />Offline copy</span>}
        </aside>

        <div className="reader-stage" style={{ maxWidth: contentWidth + 64 }}>
          <div ref={viewport} className={`reader-viewport ${readingMode === "paged" ? "reader-paged" : ""}`}
            onScroll={measure} tabIndex={0} aria-label="Chapter text">
            <article ref={article} className="reader-article" style={{ fontSize, lineHeight, fontFamily: font.family, filter: `brightness(${brightness}%)` }}>
              <header className="reader-chapter-heading">
                <span className="eyebrow">CHAPTER {String(chapter.number).padStart(2, "0")}</span>
                <h1>{chapter.title}</h1>
                <div className="reader-chapter-meta">
                  <span><FiClock aria-hidden="true" />{Math.max(1, Math.ceil(words / 230))} min read</span>
                  <span>{words.toLocaleString()} words</span>
                  {chapter.offline && <span><FiWifiOff aria-hidden="true" />Offline</span>}
                </div>
                <div className="reader-heading-rule" aria-hidden="true" />
              </header>
              {found.text.map((paragraph, index) => (
                <p key={index} className="reader-paragraph">{paragraph}</p>
              ))}
              <div className="reader-chapter-end">
                <FiBookOpen className="mx-auto mb-4 text-primary" aria-hidden="true" />
                <span className="eyebrow">CHAPTER COMPLETE</span>
                <p>{next ? next.title : "You’ve reached the last available chapter."}</p>
                {next ? <button className="reader-action" onClick={() => navigate(next.number)}>Continue to chapter {next.number}<FiArrowRight /></button>
                  : <Link className="reader-action" href={`/novel/${novelId}`}>Back to novel<FiCheck /></Link>}
              </div>
            </article>
          </div>
        </div>

        <nav className="reader-tools" aria-label="Reader tools">
          <button ref={searchTrigger} className="reader-tool" aria-label="Search chapter text" aria-expanded={findOpen} onClick={() => setFindOpen((open) => !open)}><FiSearch aria-hidden="true" /><span>Find</span></button>
          <button className="reader-tool" onClick={openChapters} aria-label="Open chapters" aria-haspopup="dialog" aria-expanded={panel === "chapters"}>
            <FiList aria-hidden="true" /><span>Contents</span>
          </button>
          <button className="reader-tool" onClick={() => { setSelectedText(window.getSelection()?.toString() || ""); setBookmark(true); }}
            aria-label="Bookmark passage" aria-haspopup="dialog">
            <FiBookmark aria-hidden="true" /><span>Bookmark</span>
          </button>
          <button className="reader-tool" onClick={() => setPanel("settings")} aria-label="Reading settings" aria-haspopup="dialog" aria-expanded={panel === "settings"}>
            <FiSliders aria-hidden="true" /><span>Appearance</span>
          </button>
        </nav>
      </div>


      <footer className="reader-footer">
        <button className="reader-step" onClick={() => readingMode === "paged" ? turnPage(-1) : previous && navigate(previous.number)}
          disabled={readingMode === "paged" ? pages.current === 1 && !previous : !previous}
          aria-label={readingMode === "paged" ? "Previous page" : "Previous chapter"}>
          <FiChevronLeft aria-hidden="true" /><span>Previous</span>
        </button>
        <span className="text-xs text-muted-foreground text-center" aria-live="off">{readingMode === "paged" ? `Page ${pages.current} of ${pages.total}` : `Chapter ${chapter.number} of ${novel.totalChapters}`}</span>
        <button className="reader-step" onClick={() => readingMode === "paged" ? turnPage(1) : next && navigate(next.number)}
          disabled={readingMode === "paged" ? pages.current === pages.total && !next : !next}
          aria-label={readingMode === "paged" ? "Next page" : "Next chapter"}>
          <span>Next</span><FiChevronRight aria-hidden="true" />
        </button>
      </footer>
      <Modal
        isOpen={panel === "settings"}
        onClose={() => setPanel(null)}
        title="Your reading space"
        size="sm"
        placement="right"
      >
        <div className="space-y-6 reader-settings">
          <p className="text-sm text-muted-foreground">
            Settle into a page that suits you. Changes save automatically.
          </p>
          <fieldset>
            <legend className="reader-label">Atmosphere</legend>
            <ThemeChoices value={theme} onChange={setTheme} />
          </fieldset>
          <div>
            <label className="reader-label" htmlFor="reader-font">
              Typeface
            </label>
            <select
              id="reader-font"
              value={fontFamily}
              onChange={(e) =>
                settings.setFontFamily(e.target.value as typeof fontFamily)
              }
              className="reader-select"
            >
              {READER_FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <ReaderSlider
            label="Text size"
            value={fontSize}
            display={`${fontSize}px`}
            min={14}
            max={32}
            step={1}
            onChange={settings.setFontSize}
          />
          <ReaderSlider
            label="Line spacing"
            value={lineHeight}
            display={lineHeight.toFixed(1)}
            min={1.2}
            max={2.5}
            step={0.1}
            onChange={settings.setLineHeight}
          />
          <ReaderSlider
            label="Page width"
            value={contentWidth}
            display={`${contentWidth}px`}
            min={480}
            max={960}
            step={40}
            onChange={settings.setContentWidth}
          />
          <ReaderSlider
            label="Brightness"
            value={brightness}
            display={`${brightness}%`}
            min={50}
            max={120}
            step={5}
            onChange={settings.setBrightness}
          />
          <fieldset disabled={theme === "amoled"}>
            <legend className="reader-label">Page tint</legend>
            {theme === "amoled" && (
              <p className="text-xs text-muted-foreground mb-3">
                AMOLED keeps the page pure black. Tints apply to other themes.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {["default", "warm", "sepia", "cool", "green"].map((tint) => (
                <button
                  key={tint}
                  aria-pressed={accentColor === tint}
                  onClick={() => settings.setAccentColor(tint)}
                  className={`reader-pill ${accentColor === tint ? "selected" : ""}`}
                >
                  {tint === "default" ? "Natural" : tint}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="reader-label">Reading flow</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["continuous", "paged"] as const).map((mode) => (
                <button
                  key={mode}
                  className={`reader-pill ${readingMode === mode ? "selected" : ""}`}
                  aria-pressed={readingMode === mode}
                  onClick={() => settings.setReadingMode(mode)}
                >
                  {mode === "continuous" ? "Scroll" : "Turn pages"}
                </button>
              ))}
            </div>
          </fieldset>
          <button
            className="reader-action w-full"
            onClick={() => {
              setPanel(null);
              setSelectedText(window.getSelection()?.toString() || "");
              setBookmark(true);
            }}
          >
            <FiBookmark /> Save a passage
          </button>
          <p className="text-xs text-muted-foreground">
            Arrow keys: move through text · M: focus · S: appearance
          </p>
        </div>
      </Modal>
      <Modal
        isOpen={panel === "chapters"}
        onClose={() => setPanel(null)}
        title="Contents"
        size="sm"
        placement="right"
      >
        <p className="text-sm text-muted-foreground mb-4">
          {novel.title} · {novel.chapters.length} chapters
        </p>
        <div className="relative mb-4">
          <FiSearch className="absolute left-3 top-3.5 text-muted-foreground" />
          <input
            className="reader-select pl-10"
            aria-label="Search chapters"
            placeholder="Find a chapter or number…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setChapterWindow(0);
              const list = document.getElementById("reader-contents-list");
              if (list) list.scrollTop = 0;
            }}
          />
        </div>
        <div
          id="reader-contents-list"
          className="h-[calc(100dvh-240px)] overflow-auto"
          onScroll={(event) => setChapterWindow(event.currentTarget.scrollTop)}
          ref={chaptersViewport}
        >
          <div
            style={{
              height: filteredChapters.length * 60,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                insetInline: 0,
                top: windowStart * 60,
              }}
            >
              {visibleChapters.map((item) => (
                <button
                  key={item.number}
                  className={`reader-chapter-link ${item.number === chapter.number ? "selected" : ""}`}
                  aria-current={
                    item.number === chapter.number ? "page" : undefined
                  }
                  onClick={() => {
                    setPanel(null);
                    navigate(item.number);
                  }}
                >
                  <span className="text-xs tabular-nums text-muted-foreground w-8 shrink-0">
                    {String(item.number).padStart(2, "0")}
                  </span>
                  <span className="truncate flex-1 text-left">
                    {item.title}
                  </span>
                  {item.number === chapter.number && (
                    <FiBookmark className="shrink-0 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
          {!filteredChapters.length && (
            <p className="py-12 text-center text-muted-foreground">
              No chapters match your search.
            </p>
          )}
        </div>
      </Modal>
      <BookmarkModal
        isOpen={bookmark}
        onClose={() => setBookmark(false)}
        novelId={novelId}
        chapterNumber={chapter.number}
        chapterTitle={chapter.title}
        selectedText={selectedText}
        position={viewport.current?.scrollTop || 0}
      />
    </div>
  );
}

function ReaderSlider({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const id = `reader-${label.replaceAll(" ", "-").toLowerCase()}`;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label htmlFor={id} className="reader-label mb-0">
          {label}
        </label>
        <output
          htmlFor={id}
          className="text-xs text-muted-foreground tabular-nums"
        >
          {display}
        </output>
      </div>
      <input
        id={id}
        className="w-full accent-primary"
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
