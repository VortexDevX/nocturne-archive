"use client";

import { useState, useEffect } from "react";
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
  FiStar,
  FiBookOpen,
  FiCalendar,
  FiClock,
  FiX,
  FiTrash2,
} from "react-icons/fi";
import Button from "@/components/ui/Button";
import ThemeDropdown from "@/components/ui/ThemeDropdown";
import { useHamburger } from "../layout";
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
}

type TabType =
  | "all"
  | "reading"
  | "completed"
  | "planned"
  | "dropped"
  | "favorites";
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
    currentFavorite: boolean
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
          currentFavorite ? "Removed from favorites" : "Added to favorites"
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
      item.novel.author.toLowerCase().includes(searchQuery.toLowerCase());

    // Genre filter
    const matchesGenre =
      selectedGenres.length === 0 ||
      selectedGenres.some((g) =>
        item.novel.genres.some((ng) => ng.toLowerCase() === g.toLowerCase())
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
      color: "blue",
    },
    {
      id: "reading" as TabType,
      label: "Reading",
      count: tabCounts.reading,
      color: "green",
    },
    {
      id: "completed" as TabType,
      label: "Completed",
      count: tabCounts.completed,
      color: "purple",
    },
    {
      id: "planned" as TabType,
      label: "Plan to Read",
      count: tabCounts.planned,
      color: "orange",
    },
    {
      id: "dropped" as TabType,
      label: "Dropped",
      count: tabCounts.dropped,
      color: "red",
    },
    {
      id: "favorites" as TabType,
      label: "Favorites",
      count: tabCounts.favorites,
      color: "pink",
    },
  ];

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
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
                <h2 className="text-lg font-bold">My Library</h2>
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
      <header className="hidden lg:block border-b border-border bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="p-6 pb-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xl">
                  📚
                </div>
                My Library
              </h1>
              <p className="text-muted-foreground text-sm">
                {loading
                  ? "Loading your collection..."
                  : `${tabCounts.all} ${
                      tabCounts.all === 1 ? "novel" : "novels"
                    } in your collection`}
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
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md transition-all ${
              viewMode === "grid" ? "bg-background shadow-sm" : ""
            }`}
          >
            <FiGrid className="h-4 w-4" />
          </button>
          <button
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
      <div className="flex-1 overflow-y-auto pb-20 lg:pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your library...</p>
            </div>
          </div>
        ) : sortedLibrary.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="text-6xl mb-4">📚</div>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4 lg:gap-5 lg:p-6">
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

// Novel Card Component
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
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const coverColors = [
    "from-violet-500/20 to-fuchsia-500/20",
    "from-cyan-500/20 to-blue-500/20",
    "from-amber-500/20 to-orange-500/20",
    "from-emerald-500/20 to-teal-500/20",
    "from-pink-500/20 to-rose-500/20",
    "from-indigo-500/20 to-purple-500/20",
  ];

  const statusConfig = {
    reading: { color: "bg-green-500", label: "Reading" },
    completed: { color: "bg-blue-500", label: "Completed" },
    plan_to_read: { color: "bg-orange-500", label: "Plan to Read" },
    dropped: { color: "bg-red-500", label: "Dropped" },
  };

  const currentStatus = statusConfig[item.status];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -6 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
      className="group cursor-pointer"
      onClick={() => router.push(`/novel/${item.novel.slug}`)}
    >
      <div className="relative">
        {/* Cover */}
        <div
          className={`relative aspect-[2/3] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-border hover:border-primary/40 ${
            !item.novel.coverImage
              ? `bg-gradient-to-br ${coverColors[index % coverColors.length]}`
              : ""
          }`}
        >
          {item.novel.coverImage ? (
            <img
              src={item.novel.coverImage}
              alt={item.novel.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-white text-center">
              <div className="text-5xl mb-3">📖</div>
              <div className="font-bold text-xs lg:text-sm line-clamp-3 px-2">
                {item.novel.title}
              </div>
            </div>
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />

          {/* Hover Action */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <Button
              variant="primary"
              size="sm"
              className="shadow-xl transform scale-90 group-hover:scale-100 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/reader/${item.novel.slug}/1`);
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

          {/* Top Right Actions */}
          <div className="absolute top-2 right-2 flex flex-col gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(item.novelId, item.isFavorite);
              }}
              className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 hover:bg-black/80 transition-colors"
            >
              <FiHeart
                className={`h-3.5 w-3.5 ${
                  item.isFavorite ? "fill-red-500 text-red-500" : "text-white"
                }`}
              />
            </button>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 hover:bg-black/80 transition-colors"
              >
                <FiMoreVertical className="h-3.5 w-3.5 text-white" />
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
                      className="w-full px-4 py-2.5 text-sm text-left hover:bg-red-500/10 text-red-500 transition-colors flex items-center gap-2 font-medium"
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className="absolute top-2 left-2">
            <span
              className={`px-2 py-1 text-xs rounded-lg ${currentStatus.color} text-white font-bold shadow-lg`}
            >
              {currentStatus.label}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="mt-3 px-1">
          <h3 className="font-bold text-sm lg:text-base mb-1 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {item.novel.title}
          </h3>
          <p className="text-xs text-muted-foreground mb-2 truncate">
            {item.novel.author}
          </p>

          {/* Genres */}
          <div className="flex flex-wrap gap-1">
            {item.novel.genres.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-500 text-[10px] font-medium border border-purple-500/20"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
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

  const coverColors = [
    "from-violet-500/20 to-fuchsia-500/20",
    "from-cyan-500/20 to-blue-500/20",
    "from-amber-500/20 to-orange-500/20",
    "from-emerald-500/20 to-teal-500/20",
    "from-pink-500/20 to-rose-500/20",
    "from-indigo-500/20 to-purple-500/20",
  ];

  const statusConfig = {
    reading: {
      color: "bg-green-500/15 text-green-500 border-green-500/20",
      label: "Reading",
    },
    completed: {
      color: "bg-blue-500/15 text-blue-500 border-blue-500/20",
      label: "Completed",
    },
    plan_to_read: {
      color: "bg-orange-500/15 text-orange-500 border-orange-500/20",
      label: "Plan to Read",
    },
    dropped: {
      color: "bg-red-500/15 text-red-500 border-red-500/20",
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
            ? `bg-gradient-to-br ${coverColors[index % coverColors.length]}`
            : ""
        }`}
      >
        {item.novel.coverImage ? (
          <img
            src={item.novel.coverImage}
            alt={item.novel.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl">
            📖
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
                  item.isFavorite ? "fill-red-500 text-red-500" : ""
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
                      className="w-full px-4 py-2.5 text-sm text-left hover:bg-red-500/10 text-red-500 transition-colors flex items-center gap-2 font-medium"
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
              className="px-2.5 py-1 text-xs rounded-lg bg-purple-500/15 text-purple-500 font-medium border border-purple-500/20"
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
              router.push(`/reader/${item.novel.slug}/1`);
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
