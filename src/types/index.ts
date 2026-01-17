// User Types
export interface User {
  _id: string;
  username: string;
  email: string;
  password?: string;
  profilePicture?: string;
  canUpload?: boolean;
  isAdmin?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserStats {
  totalNovelsRead: number;
  totalChaptersRead: number;
  totalWordsRead: number;
  hoursRead: number;
  currentStreak: number;
  longestStreak: number;
  favoriteGenres: { genre: string; count: number }[];
}

// Novel Types
export interface Novel {
  _id: string;
  slug?: string;
  title: string;
  author: string;
  description: string;
  coverImage?: string;
  customCover?: string;
  genres: string[];
  status: "ongoing" | "completed" | "hiatus";
  totalChapters: number;
  folderPath: string;
  addedBy: string;
  isPublic: boolean;
  chapters?: ChapterMetadata[];
  createdAt: Date;
  updatedAt: Date;
}

// Chapter Types
export interface Chapter {
  _id: string;
  novelId: string;
  chapterNumber: number;
  title: string;
  fileName: string;
  wordCount: number;
  createdAt: Date;
}

// Upload Types
export interface NovelImportData {
  title: string;
  author: string;
  description: string;
  genres: string[];
  status: "ongoing" | "completed" | "hiatus";
  chapters: {
    number: number;
    title: string;
    content: string;
  }[];
  coverImage?: File;
}

// Novel Metadata (for data/novels/{slug}/metadata.json)
export interface NovelMetadata {
  title: string;
  author: string;
  description: string;
  genres: string[];
  status: "ongoing" | "completed" | "hiatus";
  coverImage: string;
  totalChapters: number;
  addedAt: string;
  updatedAt: string;
  slug: string;
}

// Chapter from chapters.json
export interface ChapterMetadata {
  number: number;
  title: string;
  file: string;
}

// Reading Progress Types
export interface ReadingProgress {
  _id: string;
  userId: string;
  novelId: string;
  currentChapter: number;
  currentPosition: number;
  lastReadAt: Date;
  isCompleted: boolean;
  chaptersRead: number[];
}

// Bookmark Types (UPDATED)
export interface Bookmark {
  _id?: string;
  userId: string;
  novelId: string;
  chapterNumber: number;
  chapterTitle: string;
  position: number;
  selectedText?: string;
  note?: string;
  tags?: string[];
  color?: string;
  createdAt?: Date;
  updatedAt?: Date;
  novelTitle?: string;
  novelAuthor?: string;
}

// Continue Reading Item (NEW)
export interface ContinueReadingItem {
  novelId: string;
  title: string;
  author: string;
  coverImage?: string;
  genres: string[];
  currentChapter: number;
  currentChapterTitle: string;
  totalChapters: number;
  progressPercent: number;
  lastReadAt: Date;
  timeSince: string;
  chaptersRead: number;
}

// Reading Session Types (for stats)
export interface ReadingSession {
  _id: string;
  userId: string;
  novelId: string;
  chapterNumber: number;
  startTime: Date;
  endTime?: Date;
  wordsRead: number;
  durationMinutes: number;
}

// User Preferences Types
export interface UserPreferences {
  _id: string;
  userId: string;
  theme: "light" | "dark" | "amoled" | "night";
  accentColor: string;
  fontSize: number;
  fontFamily: "inter" | "roboto" | "fira-code" | "system" | "josephin";
  lineHeight: number;
  brightness: number;
  autoSave: boolean;
  offlineMode: boolean;
  ttsEnabled: boolean;
  ttsVoice?: string;
  ttsSpeed: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: Omit<User, "password">;
  token?: string;
  message?: string;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Reader Settings Types
export interface ReaderSettings {
  theme: "light" | "dark" | "amoled" | "night";
  accentColor: string;
  fontSize: number;
  fontFamily: "inter" | "roboto" | "fira-code" | "system" | "josephin";
  lineHeight: number;
  brightness: number;
  minimalMode: boolean;
}

export interface UserLibrary {
  _id?: string;
  userId: string;
  novelId: string;
  status: "plan_to_read" | "reading" | "completed" | "dropped";
  isFavorite: boolean;
  addedAt: Date;
  lastStatusChange?: Date;
  lastReadAt?: Date;
  rating?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
