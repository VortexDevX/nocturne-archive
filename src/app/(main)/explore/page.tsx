"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FiSearch,
  FiMenu,
  FiTrendingUp,
  FiClock,
  FiBookOpen,
  FiZap,
  FiGrid,
  FiTarget,
  FiHelpCircle,
  FiMoon,
  FiSmile,
  FiCommand,
  FiHeart,
  FiPlus,
} from "react-icons/fi";
import { useHamburger } from "../layout";
import ThemeDropdown from "@/components/ui/ThemeDropdown";
import Button from "@/components/ui/Button";
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

const genres = [
  {
    id: "all",
    label: "All",
    icon: FiGrid,
    color: "from-slate-500 to-slate-600",
  },
  {
    id: "fantasy",
    label: "Fantasy",
    icon: FiCommand,
    color: "from-violet-500 to-violet-600",
  },
  {
    id: "action",
    label: "Action",
    icon: FiZap,
    color: "from-orange-500 to-orange-600",
  },
  {
    id: "romance",
    label: "Romance",
    icon: FiHeart,
    color: "from-rose-500 to-rose-600",
  },
  {
    id: "scifi",
    label: "Sci-Fi",
    icon: FiTarget,
    color: "from-blue-500 to-blue-600",
  },
  {
    id: "mystery",
    label: "Mystery",
    icon: FiHelpCircle,
    color: "from-indigo-500 to-indigo-600",
  },
  {
    id: "horror",
    label: "Horror",
    icon: FiMoon,
    color: "from-gray-600 to-gray-700",
  },
  {
    id: "comedy",
    label: "Comedy",
    icon: FiSmile,
    color: "from-amber-500 to-amber-600",
  },
];

const quickFilters = [
  { id: "all", label: "All", icon: FiGrid },
  { id: "ongoing", label: "Ongoing", icon: FiTrendingUp },
  { id: "completed", label: "Completed", icon: FiZap },
  { id: "recent", label: "Recent", icon: FiClock },
];

export default function ExplorePage() {
  const router = useRouter();
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toggleSidebar } = useHamburger();

  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingNovel, setAddingNovel] = useState<string | null>(null);

  useEffect(() => {
    fetchNovels();
  }, []);

  const fetchNovels = async () => {
    try {
      const response = await fetch("/api/novels/list");
      const data = await response.json();

      if (data.success) {
        setNovels(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch novels:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToLibrary = async (novelSlug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddingNovel(novelSlug);

    try {
      const response = await fetch("/api/library", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          novelId: novelSlug,
          status: "plan_to_read",
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Added to Plan to Read!");
      } else if (data.alreadyExists) {
        toast.error("Already in your library");
      } else {
        toast.error(data.error || "Failed to add to library");
      }
    } catch (error) {
      console.error("Failed to add to library:", error);
      toast.error("Failed to add to library");
    } finally {
      setAddingNovel(null);
    }
  };

  // Filter novels
  const filteredNovels = novels.filter((novel) => {
    const matchesSearch =
      novel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      novel.author.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGenre =
      selectedGenre === "all" ||
      novel.genres.some((g) => g.toLowerCase() === selectedGenre.toLowerCase());

    const matchesStatus =
      selectedFilter === "all" ||
      (selectedFilter === "ongoing" && novel.status === "ongoing") ||
      (selectedFilter === "completed" && novel.status === "completed") ||
      selectedFilter === "recent";

    return matchesSearch && matchesGenre && matchesStatus;
  });

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
                <h2 className="text-lg font-bold">Explore</h2>
                <p className="text-xs text-muted-foreground">
                  {loading ? "..." : `${filteredNovels.length} novels`}
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
              placeholder="Search novels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-input bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Mobile Quick Filters */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {quickFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedFilter === filter.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary/50 text-muted-foreground"
              }`}
            >
              <filter.icon className="h-3.5 w-3.5" />
              {filter.label}
            </button>
          ))}
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:block border-b border-border bg-card/50">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Explore Novels</h1>
            <p className="text-muted-foreground">
              {loading
                ? "Loading novels..."
                : `${filteredNovels.length} ${
                    filteredNovels.length === 1 ? "novel" : "novels"
                  } available`}
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl mb-5">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <input
              type="text"
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-muted-foreground">
              Filter:
            </span>
            {quickFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedFilter === filter.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-secondary/50 hover:bg-secondary text-muted-foreground"
                }`}
              >
                <filter.icon className="h-4 w-4" />
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Genre Categories */}
      <div className="border-b border-border bg-card/30 sticky top-[149px] lg:top-0 z-10">
        <div className="flex gap-2 p-3 lg:px-6 lg:py-4 overflow-x-auto scrollbar-hide">
          {genres.map((genre) => (
            <button
              key={genre.id}
              onClick={() => setSelectedGenre(genre.id)}
              className={`flex-shrink-0 transition-all ${
                selectedGenre === genre.id
                  ? "scale-105"
                  : "hover:scale-105 opacity-70 hover:opacity-100"
              }`}
            >
              <div
                className={`flex items-center gap-2 text-white bg-gradient-to-r ${
                  genre.color
                } px-3 py-1.5 rounded-lg ${
                  selectedGenre === genre.id
                    ? "shadow-md ring-1 ring-white/20"
                    : ""
                }`}
              >
                <genre.icon className="h-3.5 w-3.5" />
                <span className="font-semibold text-sm">{genre.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-20 lg:pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading novels...</p>
            </div>
          </div>
        ) : filteredNovels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-bold mb-2">No novels found</h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your filters or search query
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setSearchQuery("");
                setSelectedGenre("all");
                setSelectedFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="p-3 lg:p-6 space-y-6 lg:space-y-8">
            {/* All Novels Grid */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg lg:text-xl font-bold">All Novels</h2>
                <span className="text-sm text-muted-foreground">
                  {filteredNovels.length}{" "}
                  {filteredNovels.length === 1 ? "novel" : "novels"}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 lg:gap-4">
                {filteredNovels.map((novel, i) => (
                  <NovelCard
                    key={novel.slug}
                    novel={novel}
                    index={i}
                    addingNovel={addingNovel}
                    handleAddToLibrary={handleAddToLibrary}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

// Novel Card Component
function NovelCard({
  novel,
  index,
  addingNovel,
  handleAddToLibrary,
}: {
  novel: Novel;
  index: number;
  addingNovel: string | null;
  handleAddToLibrary: (slug: string, e: React.MouseEvent) => void;
}) {
  const router = useRouter();

  const colorThemes = [
    {
      bg: "from-violet-500/20 to-purple-500/20",
      solid: "from-violet-500 to-purple-500",
    },
    {
      bg: "from-blue-500/20 to-cyan-500/20",
      solid: "from-blue-500 to-cyan-500",
    },
    {
      bg: "from-orange-500/20 to-red-500/20",
      solid: "from-orange-500 to-red-500",
    },
    {
      bg: "from-green-500/20 to-emerald-500/20",
      solid: "from-green-500 to-emerald-500",
    },
    {
      bg: "from-pink-500/20 to-rose-500/20",
      solid: "from-pink-500 to-rose-500",
    },
    {
      bg: "from-indigo-500/20 to-blue-500/20",
      solid: "from-indigo-500 to-blue-500",
    },
  ];

  const theme = colorThemes[index % colorThemes.length];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      className="group cursor-pointer relative"
    >
      <div className="relative">
        {/* Cover */}
        <div
          onClick={() => router.push(`/novel/${novel.slug}`)}
          className={`relative aspect-[2/3] rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all border border-border hover:border-primary/30 ${
            !novel.coverImage ? `bg-gradient-to-br ${theme.bg}` : ""
          }`}
        >
          {novel.coverImage ? (
            <img
              src={novel.coverImage}
              alt={novel.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-60">
              📚
            </div>
          )}

          {/* Gradient Overlay on Hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Status Badge */}
          <div className="absolute top-2 left-2">
            <span
              className={`px-2 py-1 rounded-md text-xs font-bold shadow-md ${
                novel.status === "ongoing"
                  ? "bg-blue-500/90 text-white"
                  : novel.status === "completed"
                  ? "bg-green-500/90 text-white"
                  : "bg-orange-500/90 text-white"
              }`}
            >
              {novel.status}
            </span>
          </div>

          {/* Desktop: Hover Actions */}
          <div className="hidden md:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2 px-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/reader/${novel.slug}/1`);
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <FiBookOpen className="h-4 w-4" />
              Read Now
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/novel/${novel.slug}`);
              }}
              className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg text-sm font-bold shadow-lg hover:bg-white/30 transition-colors border border-white/40"
            >
              Details
            </button>
          </div>
        </div>

        {/* Add to Library Button */}
        <button
          onClick={(e) => handleAddToLibrary(novel.slug, e)}
          disabled={addingNovel === novel.slug}
          className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 backdrop-blur-sm border border-white/20 hover:bg-primary hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
          title="Add to Plan to Read"
        >
          {addingNovel === novel.slug ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <FiPlus className="h-4 w-4 text-white" />
          )}
        </button>

        {/* Info */}
        <div className="mt-2 px-1">
          <h3 className="font-bold text-sm mb-1 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {novel.title}
          </h3>
          <p className="text-xs text-muted-foreground mb-2 truncate">
            {novel.author}
          </p>

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <FiBookOpen className="h-3 w-3" />
              {novel.totalChapters} Ch
            </span>
            {novel.genres.length > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-medium truncate max-w-[80px]">
                {novel.genres[0]}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
