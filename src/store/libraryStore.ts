import { create } from "zustand";
import { Novel } from "@/types";

interface LibraryState {
  novels: Novel[];
  searchQuery: string;
  selectedGenre: string;
  sortBy: "recent" | "title" | "author" | "progress";
  setNovels: (novels: Novel[]) => void;
  addNovel: (novel: Novel) => void;
  removeNovel: (novelId: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedGenre: (genre: string) => void;
  setSortBy: (sortBy: "recent" | "title" | "author" | "progress") => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  novels: [],
  searchQuery: "",
  selectedGenre: "all",
  sortBy: "recent",
  setNovels: (novels) => set({ novels }),
  addNovel: (novel) => set((state) => ({ novels: [...state.novels, novel] })),
  removeNovel: (novelId) =>
    set((state) => ({
      novels: state.novels.filter((n) => n._id !== novelId),
    })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedGenre: (genre) => set({ selectedGenre: genre }),
  setSortBy: (sortBy) => set({ sortBy }),
}));
