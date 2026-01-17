import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ReaderFont =
  | "inter"
  | "roboto"
  | "fira-code"
  | "system"
  | "josephin";

interface ReaderSettings {
  fontSize: number;
  fontFamily: ReaderFont;
  lineHeight: number;
  brightness: number;
  accentColor: string;
  minimalMode: boolean;
  currentNovel: string | null;
  currentChapter: number | null;
  scrollPosition: number;
}

interface ReaderState extends ReaderSettings {
  setFontSize: (size: number) => void;
  setFontFamily: (family: ReaderFont) => void;
  setLineHeight: (height: number) => void;
  setBrightness: (brightness: number) => void;
  setAccentColor: (color: string) => void;
  setMinimalMode: (enabled: boolean) => void;
  setReadingPosition: (
    novel: string,
    chapter: number,
    position: number
  ) => void;
  resetSettings: () => void;
}

const defaultSettings: ReaderSettings = {
  fontSize: 18,
  fontFamily: "inter",
  lineHeight: 1.8,
  brightness: 100,
  accentColor: "default",
  minimalMode: false,
  currentNovel: null,
  currentChapter: null,
  scrollPosition: 0,
};

export const useReaderStore = create<ReaderState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setFontSize: (size) => set({ fontSize: size }),
      setFontFamily: (family) => set({ fontFamily: family }),
      setLineHeight: (height) => set({ lineHeight: height }),
      setBrightness: (brightness) => set({ brightness }),
      setAccentColor: (color) => set({ accentColor: color }),
      setMinimalMode: (enabled) => set({ minimalMode: enabled }),
      setReadingPosition: (novel, chapter, position) =>
        set({
          currentNovel: novel,
          currentChapter: chapter,
          scrollPosition: position,
        }),
      resetSettings: () => set(defaultSettings),
    }),
    { name: "reader-settings" }
  )
);