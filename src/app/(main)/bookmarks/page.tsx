"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiBookmark,
  FiTrash2,
  FiMenu,
  FiBookOpen,
  FiMessageSquare,
  FiClock,
  FiFileText,
  FiEdit2,
  FiMoreVertical,
  FiTag,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { useHamburger } from "../layout";
import ThemeDropdown from "@/components/ui/ThemeDropdown";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Bookmark } from "@/types";

type FilterType = "all" | "notes" | "quotes" | "recent";

export default function BookmarksPage() {
  const { toggleSidebar } = useHamburger();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookmarks();
  }, [activeFilter]);

  const fetchBookmarks = async () => {
    try {
      setLoading(true);
      const url =
        activeFilter === "all"
          ? "/api/bookmarks"
          : `/api/bookmarks?filter=${activeFilter}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setBookmarks(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch bookmarks:", error);
      toast.error("Failed to load bookmarks");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (!confirm("Are you sure you want to delete this bookmark?")) return;

    try {
      const response = await fetch(`/api/bookmarks?id=${bookmarkId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Bookmark deleted");
        fetchBookmarks(); // Refresh list
      } else {
        toast.error("Failed to delete bookmark");
      }
    } catch (error) {
      console.error("Failed to delete bookmark:", error);
      toast.error("Failed to delete bookmark");
    }
  };

  const filteredBookmarks = bookmarks.filter(
    (bookmark) =>
      bookmark.novelTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.chapterTitle
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      bookmark.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.selectedText?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filters = [
    { id: "all" as FilterType, label: "All", count: bookmarks.length },
    {
      id: "notes" as FilterType,
      label: "With Notes",
      count: bookmarks.filter((b) => b.note && b.note.trim() !== "").length,
    },
    {
      id: "quotes" as FilterType,
      label: "Quotes",
      count: bookmarks.filter(
        (b) => b.selectedText && b.selectedText.trim() !== ""
      ).length,
    },
    { id: "recent" as FilterType, label: "Recent", count: bookmarks.length },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-20">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSidebar}
                className="md:block hidden p-2 hover:bg-secondary rounded-xl transition-colors"
              >
                <FiMenu className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-lg font-bold">Bookmarks</h2>
                <p className="text-xs text-muted-foreground">
                  {loading ? "..." : `${bookmarks.length} saved items`}
                </p>
              </div>
            </div>
            <ThemeDropdown />
          </div>

          {/* Mobile Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-input bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Mobile Filters */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeFilter === filter.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary/50 text-muted-foreground"
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:block border-b border-border bg-card/50">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Bookmarks</h1>
              <p className="text-muted-foreground">
                {loading
                  ? "Loading..."
                  : `${bookmarks.length} saved passages and important moments`}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md mb-5">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search in bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeFilter === filter.id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {filter.label}
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                      activeFilter === filter.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary"
                    }`}
                  >
                    {filter.count}
                  </span>
                </span>
                {activeFilter === filter.id && (
                  <motion.div
                    layoutId="activeFilter"
                    className="absolute inset-0 bg-primary/10 border-2 border-primary rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20 lg:pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading bookmarks...</p>
            </div>
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="text-6xl mb-4">🔖</div>
            <h3 className="text-xl font-bold mb-2">
              {searchQuery ? "No bookmarks found" : "No bookmarks yet"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? "Try a different search term"
                : "Bookmark important passages while reading"}
            </p>
            {!searchQuery && (
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push("/library")}
              >
                <FiBookOpen className="mr-2" />
                Start Reading
              </Button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFilter}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="p-4 lg:p-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
                {filteredBookmarks.map((bookmark, i) => (
                  <BookmarkCard
                    key={bookmark._id}
                    bookmark={bookmark}
                    index={i}
                    onDelete={handleDeleteBookmark}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function BookmarkCard({
  bookmark,
  index,
  onDelete,
}: {
  bookmark: Bookmark;
  index: number;
  onDelete: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();

  const colorThemes = [
    {
      icon: "bg-violet-500",
      border: "border-violet-500/30",
      glow: "shadow-violet-500/20",
      accent: "bg-violet-500/10 border-violet-500/20 text-violet-600",
      tag: "bg-violet-500/15 text-violet-600 border-violet-500/30",
    },
    {
      icon: "bg-blue-500",
      border: "border-blue-500/30",
      glow: "shadow-blue-500/20",
      accent: "bg-blue-500/10 border-blue-500/20 text-blue-600",
      tag: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    },
    {
      icon: "bg-amber-500",
      border: "border-amber-500/30",
      glow: "shadow-amber-500/20",
      accent: "bg-amber-500/10 border-amber-500/20 text-amber-600",
      tag: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    },
    {
      icon: "bg-emerald-500",
      border: "border-emerald-500/30",
      glow: "shadow-emerald-500/20",
      accent: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600",
      tag: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    },
    {
      icon: "bg-rose-500",
      border: "border-rose-500/30",
      glow: "shadow-rose-500/20",
      accent: "bg-rose-500/10 border-rose-500/20 text-rose-600",
      tag: "bg-rose-500/15 text-rose-600 border-rose-500/30",
    },
  ];

  const theme = colorThemes[index % colorThemes.length];

  const timeAgo = bookmark.createdAt
    ? new Date(bookmark.createdAt).toLocaleDateString()
    : "Recently";

  const handleGoToBookmark = () => {
    router.push(
      `/reader/${bookmark.novelId}/${bookmark.chapterNumber}#bookmark-${bookmark._id}`
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`group bg-card rounded-2xl border-2 ${theme.border} transition-all hover:shadow-xl ${theme.glow} overflow-hidden cursor-pointer`}
      onClick={handleGoToBookmark}
    >
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className={`p-2.5 rounded-xl ${theme.icon} shadow-lg flex-shrink-0`}
            >
              <FiBookmark className="h-5 w-5 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base mb-1.5 group-hover:text-primary transition-colors leading-tight line-clamp-1">
                {bookmark.novelTitle || "Unknown Novel"}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                <FiBookOpen className="h-3.5 w-3.5" />
                <span className="truncate">
                  Chapter {bookmark.chapterNumber}: {bookmark.chapterTitle}
                </span>
              </div>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 hover:bg-secondary/80 rounded-lg transition-colors"
            >
              <FiMoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 mt-2 w-40 bg-card border border-border rounded-xl shadow-2xl z-20 overflow-hidden">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(bookmark._id!);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-sm text-left hover:bg-red-500/10 text-red-500 transition-colors flex items-center gap-2 font-medium"
                  >
                    <FiTrash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
          <span className="flex items-center gap-1.5">
            <FiClock className="h-3.5 w-3.5" />
            {timeAgo}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Selected Text/Quote */}
        {bookmark.selectedText && bookmark.selectedText.trim() !== "" && (
          <div
            className={`relative mb-4 p-4 rounded-xl ${theme.accent} border-l-4 ${theme.border}`}
          >
            <p className="text-sm leading-relaxed text-foreground line-clamp-4">
              "{bookmark.selectedText}"
            </p>
          </div>
        )}

        {/* Personal Note */}
        {bookmark.note && bookmark.note.trim() !== "" && (
          <div className="mb-4 p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg ${theme.icon} flex-shrink-0 shadow-md`}
              >
                <FiMessageSquare className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Your Note
                </p>
                <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                  {bookmark.note}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        {bookmark.tags && bookmark.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {bookmark.tags.map((tag) => (
              <span
                key={tag}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${theme.tag}`}
              >
                <FiTag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Go to Chapter Button */}
        <div className="mt-4 pt-4 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full">
            <FiBookOpen className="mr-2" />
            Go to Chapter
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
