"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiSettings,
  FiBookmark,
  FiList,
  FiEye,
  FiEyeOff,
  FiSun,
  FiType,
  FiSearch,
  FiX,
  FiMoreVertical,
  FiCheckCircle,
  FiWifiOff,
  FiAlignLeft,
  FiDroplet,
} from "react-icons/fi";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useReaderStore } from "@/store/readerStore";
import BookmarkModal from "@/components/reader/BookmarkModal";
import {
  getChapterOffline,
  saveChapterOffline,
  prefetchChapterOffline,
  listCachedChapterNumbers,
} from "@/lib/storage/offline";

function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 5); // 5 item buffer
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + 5
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    },
    startIndex,
  };
}

interface ChapterData {
  number: number;
  title: string;
  content: string;
}

interface NovelData {
  title: string;
  author: string;
  totalChapters: number;
  chapters: { number: number; title: string }[];
}

// Theme-specific accent colors
const ACCENT_COLORS = {
  light: [
    { name: "Default", value: "default", bg: "bg-white", preview: "#ffffff" },
    { name: "Warm", value: "warm", bg: "bg-[#fffdf8]", preview: "#fffdf8" },
    { name: "Sepia", value: "sepia", bg: "bg-[#faf6ed]", preview: "#faf6ed" },
    { name: "Cool", value: "cool", bg: "bg-[#f7f9fc]", preview: "#f7f9fc" },
    { name: "Green", value: "green", bg: "bg-[#f5faf6]", preview: "#f5faf6" },
  ],
  dark: [
    {
      name: "Default",
      value: "default",
      bg: "bg-[#0f0f0f]",
      preview: "#0f0f0f",
    },
    { name: "Warm", value: "warm", bg: "bg-[#1a1816]", preview: "#1a1816" },
    { name: "Sepia", value: "sepia", bg: "bg-[#1f1b16]", preview: "#1f1b16" },
    { name: "Cool", value: "cool", bg: "bg-[#141922]", preview: "#141922" },
    { name: "Green", value: "green", bg: "bg-[#151918]", preview: "#151918" },
  ],
  night: [
    {
      name: "Default",
      value: "default",
      bg: "bg-[#0d1117]",
      preview: "#0d1117",
    },
    { name: "Warm", value: "warm", bg: "bg-[#15130f]", preview: "#15130f" },
    { name: "Sepia", value: "sepia", bg: "bg-[#18150f]", preview: "#18150f" },
    { name: "Cool", value: "cool", bg: "bg-[#0f131a]", preview: "#0f131a" },
    { name: "Green", value: "green", bg: "bg-[#0f1311]", preview: "#0f1311" },
  ],
  amoled: [
    { name: "Default", value: "default", bg: "bg-black", preview: "#000000" },
    { name: "Warm", value: "warm", bg: "bg-[#0a0908]", preview: "#0a0908" },
    { name: "Sepia", value: "sepia", bg: "bg-[#0d0b08]", preview: "#0d0b08" },
    { name: "Cool", value: "cool", bg: "bg-[#060810]", preview: "#060810" },
    { name: "Green", value: "green", bg: "bg-[#060807]", preview: "#060807" },
  ],
};

const FONTS = [
  {
    value: "inter",
    label: "Inter",
    family: '"Inter", ui-sans-serif, system-ui, sans-serif',
  },
  {
    value: "roboto",
    label: "Roboto",
    family: '"Roboto", ui-sans-serif, system-ui, sans-serif',
  },
  {
    value: "fira-code",
    label: "Fira Code",
    family: '"Fira Code", ui-monospace, monospace',
  },
  {
    value: "system",
    label: "System",
    family: "ui-sans-serif, system-ui, -apple-system, sans-serif",
  },
  {
    value: "josephin",
    label: "Josephin Sans",
    family: '"Josefin Sans", ui-sans-serif, system-ui, sans-serif',
  },
];

interface VirtualChapterListProps {
  chapters: { number: number; title: string }[];
  currentChapter: number;
  onChapterClick: (chapterNum: number) => void;
}

function VirtualChapterList({
  chapters,
  currentChapter,
  onChapterClick,
}: VirtualChapterListProps) {
  const ITEM_HEIGHT = 60;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
    }
  }, []);

  const { visibleItems, totalHeight, offsetY, onScroll, startIndex } =
    useVirtualList(chapters, ITEM_HEIGHT, containerHeight);

  // Auto-scroll to current chapter
  useEffect(() => {
    const currentIndex = chapters.findIndex(
      (ch) => ch.number === currentChapter
    );
    if (currentIndex >= 0 && containerRef.current) {
      containerRef.current.scrollTop =
        currentIndex * ITEM_HEIGHT - containerHeight / 2;
    }
  }, []);

  if (chapters.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center py-12">
          <FiSearch className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No chapters found</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4"
      onScroll={onScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((ch, idx) => {
            const isCurrent = ch.number === currentChapter;
            return (
              <div
                key={ch.number}
                style={{ height: ITEM_HEIGHT }}
                className="py-0.5"
              >
                <button
                  onClick={() => onChapterClick(ch.number)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    isCurrent
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            isCurrent
                              ? "bg-primary-foreground/20"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {ch.number}
                        </span>
                        <span className="truncate">{ch.title}</span>
                      </div>
                    </div>
                    {isCurrent && (
                      <div className="text-xs px-2 py-1 bg-primary-foreground/20 rounded flex-shrink-0">
                        Reading
                      </div>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ReaderPage() {
  const router = useRouter();
  const params = useParams();
  const { theme } = useTheme();
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Core state
  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [novel, setNovel] = useState<NovelData | null>(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [showChapterList, setShowChapterList] = useState(false);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [selectedTextForBookmark, setSelectedTextForBookmark] = useState("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [minimalMode, setMinimalMode] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [chapterSearch, setChapterSearch] = useState("");
  const lastScrollY = useRef(0);

  // Offline
  const [offlineMode, setOfflineMode] = useState(false);
  const [usedOffline, setUsedOffline] = useState(false);

  // Settings from store
  const {
    fontSize,
    fontFamily,
    lineHeight,
    brightness,
    accentColor,
    setFontSize,
    setFontFamily,
    setLineHeight,
    setBrightness,
    setAccentColor,
    setReadingPosition,
  } = useReaderStore();

  const novelId = params.novelId as string;
  const chapterId = parseInt(params.chapterId as string, 10);

  // Load offlineMode preference
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/user/preferences");
        const data = await res.json();
        if (data?.success) setOfflineMode(!!data.data.offlineMode);
      } catch {
        // ignore
      }
    })();
  }, []);

  // Get current theme's accent colors
  const getCurrentThemeAccents = () => {
    return (
      ACCENT_COLORS[theme as keyof typeof ACCENT_COLORS] || ACCENT_COLORS.light
    );
  };

  // Get current accent background class
  const getAccentClass = () => {
    const themeAccents = getCurrentThemeAccents();
    const accent =
      themeAccents.find((c) => c.value === accentColor) || themeAccents[0];
    return accent.bg;
  };

  // Get current font
  const getCurrentFont = () => {
    return FONTS.find((f) => f.value === fontFamily)?.family || FONTS[0].family;
  };

  // Format content preserving line breaks
  const formatContent = (content: string) => {
    if (!content) return [];
    const paragraphs = content.split(/\n\n+/);
    return paragraphs
      .map((paragraph) =>
        paragraph
          .trim()
          .split("\n")
          .map((line) => line.trim())
          .join("\n")
      )
      .filter((p) => p.length > 0);
  };

  // Fetch chapter and novel with offline fallback
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setUsedOffline(false);
      try {
        const chapterRes = await fetch(
          `/api/novels/${novelId}/chapter/${chapterId}`
        );
        const chapterJson = await chapterRes.json();

        if (chapterRes.ok && chapterJson?.success) {
          if (cancelled) return;
          setChapter({
            number: chapterJson.data.number,
            title: chapterJson.data.title,
            content: chapterJson.data.content,
          });
          if (offlineMode) {
            try {
              await saveChapterOffline(
                novelId,
                chapterId,
                chapterJson.data.title,
                chapterJson.data.content
              );
            } catch {}
          }
        } else {
          const offline = await getChapterOffline(novelId, chapterId);
          if (offline) {
            if (cancelled) return;
            setUsedOffline(true);
            setChapter({
              number: chapterId,
              title: offline.title,
              content: offline.content,
            });
          } else {
            window.location.href = "/offline";
            return;
          }
        }

        try {
          const novelRes = await fetch(`/api/novels/${novelId}`);
          const novelJson = await novelRes.json();
          if (novelRes.ok && novelJson?.success) {
            if (cancelled) return;
            setNovel({
              title: novelJson.data.title,
              author: novelJson.data.author,
              totalChapters: novelJson.data.totalChapters,
              chapters: novelJson.data.chapters,
            });
          } else {
            const nums = await listCachedChapterNumbers(novelId);
            if (cancelled) return;
            if (nums.length > 0) {
              setNovel({
                title: "Offline Novel",
                author: "",
                totalChapters: Math.max(...nums),
                chapters: nums.map((n) => ({
                  number: n,
                  title: `Chapter ${n}`,
                })),
              });
            }
          }
        } catch {
          const nums = await listCachedChapterNumbers(novelId);
          if (!cancelled && nums.length > 0) {
            setNovel({
              title: "Offline Novel",
              author: "",
              totalChapters: Math.max(...nums),
              chapters: nums.map((n) => ({ number: n, title: `Chapter ${n}` })),
            });
          }
        }
      } catch {
        const offline = await getChapterOffline(novelId, chapterId);
        if (offline) {
          if (!cancelled) {
            setUsedOffline(true);
            setChapter({
              number: chapterId,
              title: offline.title,
              content: offline.content,
            });
          }
          const nums = await listCachedChapterNumbers(novelId);
          if (!cancelled && nums.length > 0) {
            setNovel({
              title: "Offline Novel",
              author: "",
              totalChapters: Math.max(...nums),
              chapters: nums.map((n) => ({ number: n, title: `Chapter ${n}` })),
            });
          }
        } else {
          window.location.href = "/offline";
          return;
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setScrollProgress(0);
        }
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [novelId, chapterId, offlineMode]);

  // Prefetch next chapter
  useEffect(() => {
    if (!offlineMode || !novel) return;
    const next = chapterId + 1;
    if (next <= (novel?.totalChapters || 0)) {
      prefetchChapterOffline(novelId, next).catch(() => {});
    }
  }, [offlineMode, novel, chapterId, novelId]);

  // Auto-hide header on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current || minimalMode) return;

      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const progress =
        (scrollTop / Math.max(1, scrollHeight - clientHeight)) * 100;
      setScrollProgress(Math.min(100, Math.max(0, progress)));

      const currentScrollY = scrollTop;
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setHeaderVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        setHeaderVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    const el = contentRef.current;
    el?.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => el?.removeEventListener("scroll", handleScroll);
  }, [chapter, minimalMode]);

  // Save reading progress
  useEffect(() => {
    const saveProgress = async () => {
      const position = contentRef.current?.scrollTop || 0;
      setReadingPosition(novelId, chapterId, position);
      try {
        await fetch("/api/reading/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ novelId, chapterNumber: chapterId, position }),
        });
      } catch {}
    };
    const interval = setInterval(saveProgress, 10000);
    return () => {
      clearInterval(interval);
      saveProgress();
    };
  }, [novelId, chapterId, setReadingPosition]);

  // Restore scroll position
  useEffect(() => {
    if (!chapter || loading) return;
    const restorePosition = async () => {
      try {
        const res = await fetch(
          `/api/reading/progress?novelId=${encodeURIComponent(novelId)}`
        );
        const data = await res.json();
        if (
          data?.success &&
          data.data &&
          data.data.currentChapter === chapterId
        ) {
          setTimeout(() => {
            contentRef.current?.scrollTo({
              top: data.data.currentPosition || 0,
              behavior: "auto",
            });
          }, 100);
        } else {
          setTimeout(() => {
            contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
          }, 100);
        }
      } catch {}
    };
    restorePosition();
  }, [chapter, chapterId, novelId, loading]);

  // Swipe gestures for chapter navigation
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchStartX.current - touchEndX;
      const diffY = touchStartY.current - touchEndY;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 100) {
        if (diffX > 0) {
          navigateChapter("next");
        } else {
          navigateChapter("prev");
        }
      }
    };

    const el = contentRef.current;
    el?.addEventListener("touchstart", handleTouchStart, { passive: true });
    el?.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el?.removeEventListener("touchstart", handleTouchStart);
      el?.removeEventListener("touchend", handleTouchEnd);
    };
  }, [chapterId, novel, novelId]);

  // Navigation
  const navigateChapter = useCallback(
    (direction: "prev" | "next") => {
      if (direction === "prev" && chapterId > 1) {
        router.push(`/reader/${novelId}/${chapterId - 1}`);
      } else if (
        direction === "next" &&
        novel &&
        chapterId < novel.totalChapters
      ) {
        router.push(`/reader/${novelId}/${chapterId + 1}`);
      }
    },
    [chapterId, novel, novelId, router]
  );

  // Scroll handler for scrubber
  const handleScrubberChange = (value: number) => {
    if (!contentRef.current) return;
    const { scrollHeight, clientHeight } = contentRef.current;
    const maxScroll = scrollHeight - clientHeight;
    contentRef.current.scrollTo({
      top: (value / 100) * maxScroll,
      behavior: "auto",
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      switch (e.key) {
        case "ArrowLeft":
          navigateChapter("prev");
          break;
        case "ArrowRight":
          navigateChapter("next");
          break;
        case "m":
        case "M":
          setMinimalMode((prev) => !prev);
          break;
        case "s":
        case "S":
          setShowSettings((prev) => !prev);
          break;
        case "Escape":
          if (minimalMode) setMinimalMode(false);
          setShowSettings(false);
          setShowChapterList(false);
          setShowQuickSettings(false);
          break;
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [navigateChapter, minimalMode]);

  // Filter chapters based on search
  const filteredChapters =
    novel?.chapters.filter(
      (ch) =>
        ch.title.toLowerCase().includes(chapterSearch.toLowerCase()) ||
        ch.number.toString().includes(chapterSearch)
    ) || [];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (!chapter || !novel) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-2xl">Chapter not found</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const formattedContent = formatContent(chapter.content);

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${getAccentClass()}`}
      style={{ filter: `brightness(${brightness}%)` }}
    >
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-border/30 z-[60]">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-purple-500"
          initial={{ width: 0 }}
          animate={{
            width: `${(chapterId / Math.max(1, novel.totalChapters)) * 100}%`,
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Top Header - Auto-hiding */}
      <AnimatePresence>
        {!minimalMode && headerVisible && (
          <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border shadow-lg"
          >
            <div className="h-14 flex items-center px-3 sm:px-4 gap-2">
              <button
                onClick={() => router.push(`/novel/${novelId}`)}
                className="p-2 rounded-lg hover:bg-secondary transition-colors flex-shrink-0"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>

              <div className="flex-1 min-w-0">
                <h1 className="font-semibold text-sm truncate">
                  {novel.title}
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  Chapter {chapterId} of {novel.totalChapters}
                </p>
              </div>

              {usedOffline && (
                <div className="px-2 py-1 text-xs rounded-md bg-orange-500/15 text-orange-500 border border-orange-500/30 flex items-center gap-1 flex-shrink-0">
                  <FiWifiOff className="w-3 h-3" />
                  <span className="hidden sm:inline">Offline</span>
                </div>
              )}

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setShowChapterList(true)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  title="Chapters"
                >
                  <FiList className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowQuickSettings(!showQuickSettings)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  title="Quick Settings"
                >
                  <FiMoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Quick Settings Dropdown */}
      <AnimatePresence>
        {showQuickSettings && !minimalMode && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[45]"
              onClick={() => setShowQuickSettings(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed top-16 right-3 sm:right-4 z-50 w-80 bg-card border-2 border-border rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <FiSun className="w-4 h-4 text-orange-500" />
                      Brightness
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {brightness}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={120}
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <FiType className="w-4 h-4 text-blue-500" />
                      Font Size
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {fontSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={14}
                    max={28}
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <FiAlignLeft className="w-4 h-4 text-green-500" />
                      Line Spacing
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {lineHeight}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1.4}
                    max={2.4}
                    step={0.1}
                    value={lineHeight}
                    onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => {
                      setShowQuickSettings(false);
                      setShowSettings(true);
                    }}
                    className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <FiSettings className="w-4 h-4" />
                    All Settings
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTextForBookmark(
                        window.getSelection()?.toString() || ""
                      );
                      setShowBookmarkModal(true);
                      setShowQuickSettings(false);
                    }}
                    className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <FiBookmark className="w-4 h-4" />
                    Bookmark
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Minimal Mode Toggle */}
      <AnimatePresence>
        {!minimalMode && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setMinimalMode(true)}
            className="fixed bottom-24 right-4 z-40 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all"
            title="Minimal Mode (M)"
          >
            <FiEyeOff className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Exit Minimal Mode - Small floating button */}
      {minimalMode && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setMinimalMode(false)}
          className="fixed top-4 right-4 z-50 p-3 bg-card/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-card transition-all"
          title="Exit minimal mode"
          style={{ pointerEvents: "auto" }}
        >
          <FiEye className="w-5 h-5" />
        </motion.button>
      )}

      {/* Main Content */}
      <main
        ref={contentRef}
        className="h-screen overflow-y-auto scroll-smooth"
        style={{
          paddingTop: minimalMode ? "2rem" : "5rem",
          paddingBottom: minimalMode ? "6rem" : "10rem",
        }}
      >
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {!minimalMode && (
            <motion.header
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10 pb-6 border-b border-border/50"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <h1
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold flex-1"
                  style={{ fontFamily: getCurrentFont() }}
                >
                  {chapter.title}
                </h1>
                <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-sm font-bold flex-shrink-0">
                  {chapterId}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                  {chapter.content.split(/\s+/).length.toLocaleString()} words
                </span>
              </div>
            </motion.header>
          )}

          <div
            className="prose prose-lg max-w-none"
            style={{
              fontFamily: getCurrentFont(),
              fontSize: `${fontSize}px`,
              lineHeight: `${lineHeight}`,
            }}
          >
            {formattedContent.map((paragraph, index) => (
              <p
                key={index}
                className="mb-6 whitespace-pre-wrap"
                style={{ lineHeight: `${lineHeight}` }}
              >
                {paragraph}
              </p>
            ))}
          </div>

          {!minimalMode && (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="mt-12 pt-8 border-t border-border/50 text-center"
            >
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-6">
                <FiCheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">
                  End of Chapter {chapterId}
                </span>
              </div>
              <div className="flex items-center justify-center gap-3">
                {chapterId > 1 && (
                  <button
                    onClick={() => navigateChapter("prev")}
                    className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium"
                  >
                    ← Previous
                  </button>
                )}
                {chapterId < novel.totalChapters && (
                  <button
                    onClick={() => navigateChapter("next")}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium"
                  >
                    Next Chapter →
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </article>
      </main>

      {/* Bottom Navigation */}
      <AnimatePresence>
        {!minimalMode && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ duration: 0.2 }}
            className="fixed left-0 right-0 bottom-0 lg:bottom-0 bg-card/95 backdrop-blur-xl border-t border-border shadow-2xl z-40"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="px-3 sm:px-4 py-3">
              <div className="max-w-3xl mx-auto flex items-center gap-2">
                <button
                  onClick={() => navigateChapter("prev")}
                  disabled={chapterId <= 1}
                  className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 flex-shrink-0"
                >
                  <FiChevronLeft className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">
                    Prev
                  </span>
                </button>

                <div className="flex-1 px-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={scrollProgress}
                    onChange={(e) =>
                      handleScrubberChange(parseFloat(e.target.value))
                    }
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${scrollProgress}%, hsl(var(--secondary)) ${scrollProgress}%, hsl(var(--secondary)) 100%)`,
                    }}
                  />
                  <div className="mt-1 text-xs text-muted-foreground text-center truncate">
                    {chapter.title}
                  </div>
                </div>

                <button
                  onClick={() => navigateChapter("next")}
                  disabled={chapterId >= novel.totalChapters}
                  className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 flex-shrink-0"
                >
                  <span className="text-sm font-medium hidden sm:inline">
                    Next
                  </span>
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REVAMPED Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="fixed right-0 top-0 h-full w-full max-w-md z-[55] bg-card shadow-2xl overflow-y-auto"
            >
              <div className="min-h-full pb-safe">
                {/* Header */}
                <div className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-border z-10 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold">Reading Settings</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Customize your experience
                      </p>
                    </div>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="p-2 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-8 pb-24">
                  {/* Page Background */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <FiDroplet className="w-5 h-5 text-primary" />
                      <h3 className="text-sm font-bold">Page Background</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {getCurrentThemeAccents().map((color) => (
                        <motion.button
                          key={color.value}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setAccentColor(color.value)}
                          className={`relative p-3 rounded-xl border-2 transition-all ${
                            accentColor === color.value
                              ? "border-primary ring-4 ring-primary/20 shadow-lg"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div
                            className={`w-full h-12 rounded-lg mb-2 border border-border/50 shadow-sm`}
                            style={{ backgroundColor: color.preview }}
                          />
                          <div className="text-xs font-medium text-center">
                            {color.name}
                          </div>
                          {accentColor === color.value && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <FiCheckCircle className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Font Family */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <FiType className="w-5 h-5 text-blue-500" />
                      <h3 className="text-sm font-bold">Font Family</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {FONTS.map((font) => (
                        <motion.button
                          key={font.value}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setFontFamily(font.value as any)}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            fontFamily === font.value
                              ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                              : "border-border hover:border-primary/50"
                          }`}
                          style={{ fontFamily: font.family }}
                        >
                          <div className="text-2xl font-medium mb-1">Aa</div>
                          <div className="text-sm">{font.label}</div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <FiType className="w-5 h-5 text-green-500" />
                        <h3 className="text-sm font-bold">Font Size</h3>
                      </div>
                      <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">
                        {fontSize}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={14}
                      max={28}
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="w-full h-3 accent-primary"
                    />
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground font-medium">
                      <span>Small (14px)</span>
                      <span>Large (28px)</span>
                    </div>
                    {/* Preview */}
                    <div className="mt-4 p-4 rounded-lg bg-secondary/50 border border-border">
                      <p
                        className="text-center"
                        style={{
                          fontFamily: getCurrentFont(),
                          fontSize: `${fontSize}px`,
                        }}
                      >
                        The quick brown fox jumps over the lazy dog
                      </p>
                    </div>
                  </div>

                  {/* Line Spacing */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <FiAlignLeft className="w-5 h-5 text-purple-500" />
                        <h3 className="text-sm font-bold">Line Spacing</h3>
                      </div>
                      <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">
                        {lineHeight}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1.4}
                      max={2.4}
                      step={0.1}
                      value={lineHeight}
                      onChange={(e) =>
                        setLineHeight(parseFloat(e.target.value))
                      }
                      className="w-full h-3 accent-primary"
                    />
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground font-medium">
                      <span>Compact (1.4)</span>
                      <span>Relaxed (2.4)</span>
                    </div>
                  </div>

                  {/* Brightness */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <FiSun className="w-5 h-5 text-orange-500" />
                        <h3 className="text-sm font-bold">Brightness</h3>
                      </div>
                      <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">
                        {brightness}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={120}
                      value={brightness}
                      onChange={(e) => setBrightness(parseInt(e.target.value))}
                      className="w-full h-3 accent-primary"
                    />
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground font-medium">
                      <span>Dim (50%)</span>
                      <span>Bright (120%)</span>
                    </div>
                  </div>

                  {/* Keyboard Shortcuts */}
                  <div className="pt-6 border-t border-border">
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                      <FiSettings className="w-4 h-4" />
                      Keyboard Shortcuts
                    </h3>
                    <div className="space-y-3">
                      {[
                        { label: "Navigate chapters", keys: ["←", "→"] },
                        { label: "Minimal mode", keys: ["M"] },
                        { label: "Settings", keys: ["S"] },
                        { label: "Close panels", keys: ["ESC"] },
                      ].map((shortcut) => (
                        <div
                          key={shortcut.label}
                          className="flex justify-between items-center p-3 rounded-lg bg-secondary/50"
                        >
                          <span className="text-sm text-muted-foreground">
                            {shortcut.label}
                          </span>
                          <div className="flex gap-1">
                            {shortcut.keys.map((key) => (
                              <kbd
                                key={key}
                                className="px-2.5 py-1.5 bg-background border-2 border-border rounded-md text-xs font-bold shadow-sm"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reading Tips */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 border-2 border-primary/20">
                    <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                      <FiEye className="w-4 h-4 text-primary" />
                      Reading Tips
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>
                          Swipe left/right to navigate chapters on mobile
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>
                          Header auto-hides when scrolling down for better focus
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>
                          Use minimal mode for distraction-free reading
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Chapter List with Search - VIRTUALIZED */}
      <AnimatePresence>
        {showChapterList && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
              onClick={() => setShowChapterList(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
              className="fixed left-0 top-0 h-full w-full max-w-md z-[55] bg-card shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-border flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold">Chapters</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {novel.totalChapters} total chapters
                    </p>
                  </div>
                  <button
                    onClick={() => setShowChapterList(false)}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search chapters..."
                    value={chapterSearch}
                    onChange={(e) => setChapterSearch(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-secondary border-2 border-border rounded-lg focus:border-primary focus:outline-none transition-colors"
                  />
                  {chapterSearch && (
                    <button
                      onClick={() => setChapterSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-card rounded transition-colors"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {chapterSearch && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Showing {filteredChapters.length} of {novel.totalChapters}{" "}
                    chapters
                  </p>
                )}
              </div>

              <VirtualChapterList
                chapters={filteredChapters}
                currentChapter={chapterId}
                onChapterClick={(chNum) => {
                  router.push(`/reader/${novelId}/${chNum}`);
                  setShowChapterList(false);
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BookmarkModal
        isOpen={showBookmarkModal}
        onClose={() => {
          setShowBookmarkModal(false);
          setSelectedTextForBookmark("");
        }}
        novelId={novelId}
        chapterNumber={chapterId}
        chapterTitle={chapter.title}
        selectedText={selectedTextForBookmark}
        position={contentRef.current?.scrollTop || 0}
      />
    </div>
  );
}
