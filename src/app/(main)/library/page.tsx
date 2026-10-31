"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiGrid,
  FiList,
  FiSearch,
  FiPlus,
  FiMenu,
  FiFilter,
  FiChevronDown,
  FiMoreVertical,
  FiHeart,
  FiBookOpen,
  FiCalendar,
  FiX,
  FiTrash2,
  FiBook,
} from "react-icons/fi";
import Button from "@/components/ui/Button";
import ThemeDropdown from "@/components/ui/ThemeDropdown";
import { useHamburger } from "@/components/layout/NavigationContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Novel {
  slug: string;
  title: string;
  author: string;
  coverImage?: string;
  genres: string[];
  status: string;
  totalChapters: number;
}

interface LibraryItem {
  _id: string;
  userId: string;
  novelId: string;
  status: "plan_to_read" | "reading" | "completed" | "dropped";
  isFavorite: boolean;
  addedAt: Date;
  lastStatusChange?: Date;
  lastReadAt?: Date;
  novel: Novel;
  currentChapter?: number;
  progressPercent?: number;
}

type TabType =
  "all" | "reading" | "completed" | "planned" | "dropped" | "favorites";
type SortType = "recent" | "title" | "author" | "added";

export default function LibraryPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>("recent");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const { toggleSidebar } = useHamburger();

  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLibrary();
  }, []);

  const fetchLibrary = async () => {
    try {
      setLoading(true);
      const url = "/api/library"; // Always fetch ALL items

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setLibraryItems(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch library:", error);
      toast.error("Failed to load library");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromLibrary = async (novelId: string) => {
    if (!confirm("Remove this novel from your library?")) return;

    try {
      const response = await fetch(`/api/library?novelId=${novelId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Removed from library");
        fetchLibrary();
      } else {
        toast.error("Failed to remove from library");
      }
    } catch (error) {
      console.error("Failed to remove:", error);
      toast.error("Failed to remove from library");
    }
  };

  const handleToggleFavorite = async (
    novelId: string,
    currentFavorite: boolean,
  ) => {
    try {
      const response = await fetch("/api/library", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          novelId,
          isFavorite: !currentFavorite,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          currentFavorite ? "Removed from favorites" : "Added to favorites",
        );
        fetchLibrary();
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      toast.error("Failed to update favorite");
    }
  };

  // Filter library items
  const filteredLibrary = libraryItems.filter((item) => {
    // Search filter
    const matchesSearch =
      item.novel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.novel.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.novel.genres.some((genre) =>
        genre.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    // Genre filter
    const matchesGenre =
      selectedGenres.length === 0 ||
      selectedGenres.some((g) =>
        item.novel.genres.some((ng) => ng.toLowerCase() === g.toLowerCase()),
      );

    return matchesSearch && matchesGenre;
  });

  const tabFilteredLibrary = filteredLibrary.filter((item) => {
    if (activeTab === "all") return true;
    if (activeTab === "favorites") return item.isFavorite;
    if (activeTab === "planned") return item.status === "plan_to_read";
    return item.status === activeTab;
  });

  // Sort library items
  const sortedLibrary = [...tabFilteredLibrary].sort((a, b) => {
    switch (sortBy) {
      case "title":
        return a.novel.title.localeCompare(b.novel.title);
      case "author":
        return a.novel.author.localeCompare(b.novel.author);
      case "added":
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      case "recent":
      default:
        const aDate = a.lastReadAt || a.addedAt;
        const bDate = b.lastReadAt || b.addedAt;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
    }
  });

  const genres = [
    "Fantasy",
    "Action",
    "Romance",
    "Mystery",
    "Sci-Fi",
    "Horror",
    "Comedy",
    "Drama",
  ];

  // Calculate tab counts
  const tabCounts = {
    all: libraryItems.length,
    reading: libraryItems.filter((item) => item.status === "reading").length,
    completed: libraryItems.filter((item) => item.status === "completed")
      .length,
    planned: libraryItems.filter((item) => item.status === "plan_to_read")
      .length,
    dropped: libraryItems.filter((item) => item.status === "dropped").length,
    favorites: libraryItems.filter((item) => item.isFavorite).length,
  };

  const tabs = [
    {
      id: "all" as TabType,
      label: "All Books",
      count: tabCounts.all,
    },
    {
      id: "reading" as TabType,
      label: "Reading",
      count: tabCounts.reading,
    },
    {
      id: "completed" as TabType,
      label: "Completed",
      count: tabCounts.completed,
    },
    {
      id: "planned" as TabType,
      label: "Plan to Read",
      count: tabCounts.planned,
    },
    {
      id: "dropped" as TabType,
      label: "Dropped",
      count: tabCounts.dropped,
    },
    {
      id: "favorites" as TabType,
      label: "Favorites",
      count: tabCounts.favorites,
    },
  ];

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  };

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
                <span className="eyebrow">YOUR READING ROOM</span>
                <h2 className="font-serif text-2xl font-normal">
                  The books you come back to.
                </h2>
                <p className="text-xs text-muted-foreground">
                  {loading
                    ? "..."
                    : `${sortedLibrary.length} ${
                        sortedLibrary.length === 1 ? "book" : "books"
                      }`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeDropdown />
            </div>
          </div>

          {/* Mobile Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              aria-label="Search library"
              placeholder="Search your library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-input bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="flex overflow-x-auto px-4 pb-3 gap-2 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:block border-b border-border bg-background">
        <div className="p-8 pb-5">
          <div className="flex items-end justify-between gap-6 mb-8">
            <div>
              <span className="eyebrow">YOUR PERSONAL ARCHIVE</span>
              <h1 className="library-heading mt-3 mb-3">
                The books you come back to.
              </h1>
              <p className="text-sm text-muted-foreground">
                A place for every story. A little room to get lost.
              </p>
            </div>
            <div className="text-right shrink-0 pb-1">
              <p className="font-serif text-3xl text-primary">
                {loading ? "—" : tabCounts.all}
              </p>
              <p className="text-[10px] tracking-widest text-muted-foreground uppercase mt-1">
                on your shelves
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex-shrink-0 ${
                  activeTab === tab.id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {tab.label}
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary"
                    }`}
                  >
                    {tab.count}
                  </span>
                </span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10 border-2 border-primary rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Search & Controls */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative max-w-md">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                aria-label="Search library"
                placeholder="Search by title, author, genre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 h-11 rounded-xl border transition-all flex items-center gap-2 text-sm font-medium ${
                  showFilters || selectedGenres.length > 0
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-input bg-background hover:bg-secondary"
                }`}
              >
                <FiFilter className="h-4 w-4" />
                <span>Filters</span>
                {selectedGenres.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-xs font-bold">
                    {selectedGenres.length}
                  </span>
                )}
                <FiChevronDown
                  className={`h-4 w-4 transition-transform ${
                    showFilters ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Filter Dropdown */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 p-5 rounded-xl border border-border bg-card shadow-2xl z-20"
                  >
                    <div className="space-y-5">
                      <div>
                        <label className="text-sm font-semibold mb-3 block">
                          Sort By
                        </label>
                        <select
                          value={sortBy}
                          onChange={(e) =>
                            setSortBy(e.target.value as SortType)
                          }
                          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="recent">Recently Read</option>
                          <option value="title">Title (A-Z)</option>
                          <option value="author">Author (A-Z)</option>
                          <option value="added">Date Added</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-semibold mb-3 block">
                          Genres
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {genres.map((genre) => (
                            <button
                              key={genre}
                              onClick={() => toggleGenre(genre)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                selectedGenres.includes(genre)
                                  ? "bg-primary text-primary-foreground shadow-md"
                                  : "bg-secondary hover:bg-secondary/80"
                              }`}
                            >
                              {genre}
                            </button>
                          ))}
                        </div>
                      </div>

                      {selectedGenres.length > 0 && (
                        <button
                          onClick={() => setSelectedGenres([])}
                          className="w-full py-2 text-sm text-primary hover:text-primary/80 font-medium"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1 border border-border">
              <button
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-background shadow-md"
                    : "hover:bg-background/50"
                }`}
              >
                <FiGrid className="h-4 w-4" />
              </button>
              <button
                aria-label="List view"
                aria-pressed={viewMode === "list"}
                onClick={() => setViewMode("list")}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === "list"
                    ? "bg-background shadow-md"
                    : "hover:bg-background/50"
                }`}
              >
                <FiList className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Filter Bar */}
      <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-border bg-card/50">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex-1 h-9 px-3 rounded-lg border text-sm flex items-center justify-between ${
            showFilters || selectedGenres.length > 0
              ? "border-primary bg-primary/5 text-primary"
              : "border-input bg-background"
          }`}
        >
          <span className="flex items-center gap-2">
            <FiFilter className="h-4 w-4" />
            Filters
            {selectedGenres.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-xs font-bold">
                {selectedGenres.length}
              </span>
            )}
          </span>
          <FiChevronDown
            className={`h-4 w-4 transition-transform ${
              showFilters ? "rotate-180" : ""
            }`}
          />
        </button>
        <div className="flex gap-1 bg-secondary/50 rounded-lg p-0.5">
          <button
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md transition-all ${
              viewMode === "grid" ? "bg-background shadow-sm" : ""
            }`}
          >
            <FiGrid className="h-4 w-4" />
          </button>
          <button
            aria-label="List view"
            aria-pressed={viewMode === "list"}
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-md transition-all ${
              viewMode === "list" ? "bg-background shadow-sm" : ""
            }`}
          >
            <FiList className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden border-b border-border bg-card overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold mb-2 block text-muted-foreground">
                  SORT BY
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                >
                  <option value="recent">Recently Read</option>
                  <option value="title">Title (A-Z)</option>
                  <option value="author">Author (A-Z)</option>
                  <option value="added">Date Added</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold mb-2 block text-muted-foreground">
                  GENRES
                </label>
                <div className="flex flex-wrap gap-2">
                  {genres.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedGenres.includes(genre)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary"
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters Display */}
      {selectedGenres.length > 0 && (
        <div className="px-4 lg:px-6 py-3 border-b border-border bg-card/30 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground">
            Active filters:
          </span>
          {selectedGenres.map((genre) => (
            <span
              key={genre}
              className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium flex items-center gap-1.5 border border-primary/20"
            >
              {genre}
              <button
                onClick={() => toggleGenre(genre)}
                className="hover:bg-primary/20 rounded-full p-0.5"
              >
                <FiX className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            onClick={() => setSelectedGenres([])}
            className="text-xs text-primary hover:text-primary/80 font-medium ml-auto"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-24 lg:pb-6">
        {!loading &&
          activeTab === "all" &&
          !searchQuery &&
          selectedGenres.length === 0 &&
          libraryItems.some((item) => item.status === "reading") &&
          (() => {
            const book = [...libraryItems]
              .filter((item) => item.status === "reading")
              .sort(
                (a, b) =>
                  new Date(b.lastReadAt || b.addedAt).getTime() -
                  new Date(a.lastReadAt || a.addedAt).getTime(),
              )[0];
            return (
              <section
                className="mx-4 lg:mx-8 mt-6 mb-2 p-5 sm:p-6 rounded-xl border border-primary/20 bg-primary/[0.05] flex items-center gap-5 sm:gap-8"
                aria-label="Pick up where you left off"
              >
                <div className="hidden sm:flex w-12 h-16 shrink-0 border-l-4 border-primary/50 bg-primary/10 items-center justify-center rounded-r">
                  <FiBookOpen className="text-primary w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="eyebrow">RIGHT WHERE YOU LEFT OFF</span>
                  <h2 className="font-serif text-xl sm:text-2xl mt-2 truncate">
                    {book.novel.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-2">
                    Chapter {book.currentChapter || 1} of{" "}
                    {book.novel.totalChapters} ·{" "}
                    {Math.floor(book.progressPercent || 0)}% read
                  </p>
                </div>
                <Link
                  href={`/reader/${book.novel.slug}/${book.currentChapter || 1}`}
                  className="reader-action shrink-0"
                >
                  <FiBookOpen />
                  <span className="hidden sm:inline">Keep reading</span>
                </Link>
              </section>
            );
          })()}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your library...</p>
            </div>
          </div>
        ) : sortedLibrary.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="flex items-center justify-center w-16 h-16">
              <FiBook className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">
              {searchQuery || selectedGenres.length > 0
                ? "No novels found"
                : "Your library is empty"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || selectedGenres.length > 0
                ? "Try adjusting your search or filters"
                : "Start adding novels from the Explore page"}
            </p>
            {!searchQuery && selectedGenres.length === 0 ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push("/explore")}
              >
                <FiPlus className="mr-2" />
                Explore Novels
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedGenres([]);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-5 gap-y-9 p-4 lg:gap-x-7 lg:p-8">
                  {sortedLibrary.map((item, i) => (
                    <NovelCard
                      key={item._id}
                      item={item}
                      index={i}
                      onRemove={handleRemoveFromLibrary}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3 p-4 lg:p-6">
                  {sortedLibrary.map((item, i) => (
                    <NovelListItem
                      key={item._id}
                      item={item}
                      index={i}
                      onRemove={handleRemoveFromLibrary}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// Each cover and title is a native link; shelf actions remain separate controls.
function NovelCard({
  item,
  index,
  onRemove,
  onToggleFavorite,
}: {
  item: LibraryItem;
  index: number;
  onRemove: (novelId: string) => void;
  onToggleFavorite: (novelId: string, currentFavorite: boolean) => void;
}) {
  const colors = ["#485c53", "#65584c", "#445965", "#635860", "#605f43"];
  const labels = {
    reading: "Reading",
    completed: "Finished",
    plan_to_read: "For later",
    dropped: "Set aside",
  };
  return (
    <div className="library-shelf group min-w-0">
      <div className="relative">
        <Link
          href={`/novel/${item.novel.slug}`}
          className="block relative aspect-[2/3] rounded-r-lg rounded-l-sm overflow-hidden border border-border shadow-md transition-transform duration-200 hover:-translate-y-1 focus-visible:-translate-y-1"
          aria-label={`View ${item.novel.title}`}
        >
          {item.novel.coverImage ? (
            <Image
              src={item.novel.coverImage}
              alt=""
              fill
              className="object-cover"
              unoptimized
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 18vw"
            />
          ) : (
            <div
              className="absolute inset-0 p-5 flex flex-col text-center items-center justify-between text-[#f5f0e6]"
              style={{ background: colors[index % colors.length] }}
            >
              <span className="text-[9px] tracking-[0.2em] uppercase border-y border-white/20 py-2 w-full">
                The Nocturne Archive
              </span>
              <div>
                <FiBookOpen className="mx-auto w-7 h-7 opacity-60 mb-5" />
                <h3 className="font-serif text-xl leading-snug line-clamp-4">
                  {item.novel.title}
                </h3>
              </div>
              <span className="text-[10px] opacity-75">
                {item.novel.author}
              </span>
            </div>
          )}
          <div className="absolute inset-y-0 left-0 w-2.5 border-r border-black/10 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />
        </Link>
        <button
          onClick={() => onToggleFavorite(item.novelId, item.isFavorite)}
          aria-label={`${item.isFavorite ? "Unfavorite" : "Favorite"} ${item.novel.title}`}
          aria-pressed={item.isFavorite}
          className="absolute top-2 right-2 w-10 h-10 rounded-full flex items-center justify-center bg-black/55 text-white hover:bg-black/75"
        >
          <FiHeart
            className={`h-4 w-4 ${item.isFavorite ? "fill-current text-danger" : ""}`}
          />
        </button>
      </div>
      <div className="pt-3.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[9px] uppercase tracking-widest text-primary">
            {labels[item.status]}
          </span>
          <button
            onClick={() => onRemove(item.novelId)}
            aria-label={`Remove ${item.novel.title} from library`}
            className="text-muted-foreground hover:text-danger p-2 -m-2"
          >
            <FiTrash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <Link
          href={`/novel/${item.novel.slug}`}
          className="font-serif text-lg leading-snug line-clamp-2 hover:text-primary"
        >
          {item.novel.title}
        </Link>
        <p className="text-xs text-muted-foreground mt-1.5 truncate">
          {item.novel.author}
        </p>
        <div className="flex items-center justify-between gap-2 mt-3 text-[10px] text-muted-foreground">
          <span>{item.novel.totalChapters.toLocaleString()} chapters</span>
          <Link
            href={`/reader/${item.novel.slug}/${item.currentChapter || 1}`}
            className="text-primary font-semibold py-2"
          >
            {item.currentChapter && item.currentChapter > 1
              ? "Resume →"
              : "Read →"}
          </Link>
        </div>
        {item.status === "reading" && (
          <div className="h-0.5 bg-secondary mt-1 overflow-hidden rounded">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.min(100, item.progressPercent || 0)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// List View Component
function NovelListItem({
  item,
  index,
  onRemove,
  onToggleFavorite,
}: {
  item: LibraryItem;
  index: number;
  onRemove: (novelId: string) => void;
  onToggleFavorite: (novelId: string, currentFavorite: boolean) => void;
}) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);


  const statusConfig = {
    reading: {
      color: "bg-success/15 text-success border-success/20",
      label: "Reading",
    },
    completed: {
      color: "bg-primary/15 text-primary border-primary/20",
      label: "Completed",
    },
    plan_to_read: {
      color: "bg-warning/15 text-warning border-warning/20",
      label: "Plan to Read",
    },
    dropped: {
      color: "bg-danger/15 text-danger border-danger/20",
      label: "Dropped",
    },
  };

  const currentStatus = statusConfig[item.status];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.2) }}
      className="group flex items-center gap-4 p-4 rounded-2xl border-2 border-border bg-card hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer"
      onClick={() => router.push(`/novel/${item.novel.slug}`)}
    >
      {/* Cover Thumbnail */}
      <div
        className={`relative w-16 h-24 lg:w-20 lg:h-28 rounded-xl flex-shrink-0 overflow-hidden shadow-lg border-2 border-white/10 ${
          !item.novel.coverImage
            ? "bg-primary/10"
            : ""
        }`}
      >
        {item.novel.coverImage ? (
          <Image
            src={item.novel.coverImage}
            alt={item.novel.title}
            fill
            className="object-cover"
            unoptimized
            sizes="(max-width: 1024px) 64px, 80px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl">
            <FiBookOpen className="w-10 h-10 text-primary" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base lg:text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">
              {item.novel.title}
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
              <span>{item.novel.author}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              <span>{item.novel.totalChapters} Chapters</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(item.novelId, item.isFavorite);
              }}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <FiHeart
                className={`h-4 w-4 ${
                  item.isFavorite ? "fill-red-500 text-danger" : ""
                }`}
              />
            </button>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
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
                        onRemove(item.novelId);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-sm text-left hover:bg-danger/10 text-danger transition-colors flex items-center gap-2 font-medium"
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tags & Status */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {item.novel.genres.slice(0, 3).map((genre) => (
            <span
              key={genre}
              className="px-2.5 py-1 text-xs rounded-lg bg-primary/15 text-primary font-medium border border-primary/20"
            >
              {genre}
            </span>
          ))}
          <span
            className={`px-2.5 py-1 text-xs rounded-lg font-medium border ${currentStatus.color}`}
          >
            {currentStatus.label}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FiCalendar className="h-3.5 w-3.5" />
              Added {new Date(item.addedAt).toLocaleDateString()}
            </span>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="hidden sm:flex"
            onClick={(e) => {
              e.stopPropagation();
              router.push(
                `/reader/${item.novel.slug}/${item.currentChapter || 1}`,
              );
            }}
          >
            <FiBookOpen className="mr-1.5" />
            {item.status === "reading"
              ? "Continue"
              : item.status === "completed"
                ? "Re-read"
                : "Read"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
