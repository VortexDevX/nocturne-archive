"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  FiFileText,
  FiUpload,
  FiCheck,
  FiImage,
  FiTrash2,
  FiPlus,
  FiEdit2,
  FiInfo,
} from "react-icons/fi";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  parseTitlesFile,
  matchChaptersWithTitles,
} from "@/lib/utils/titleProcessor";

const GENRES = [
  "Fantasy",
  "Action",
  "Romance",
  "Sci-Fi",
  "Mystery",
  "Horror",
  "Comedy",
  "Drama",
  "Adventure",
  "Slice of Life",
];

export default function BulkUpload() {
  const router = useRouter();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const titlesInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [novelSlug, setNovelSlug] = useState("");

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [status, setStatus] = useState<"ongoing" | "completed" | "hiatus">(
    "ongoing",
  );
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [chapterFiles, setChapterFiles] = useState<File[]>([]);
  const [titlesFile, setTitlesFile] = useState<File | null>(null);
  const [titlesMap, setTitlesMap] = useState<Map<number, string>>(new Map());

  const [previewChapters, setPreviewChapters] = useState<
    Array<{ number: number; title: string; matched: boolean }>
  >([]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(
      (f) => f.name.endsWith(".txt") || f.name.endsWith(".md"),
    );

    // Sort files by name
    files.sort((a, b) => a.name.localeCompare(b.name));

    setChapterFiles(files);
  };

  const handleTitlesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name !== "titles.txt") {
        toast.error("File must be named exactly 'titles.txt'");
        return;
      }

      setTitlesFile(file);

      const content = await file.text();
      const parsed = parseTitlesFile(content);
      setTitlesMap(parsed);

      toast.success(`Loaded ${parsed.size} titles from titles.txt`);
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  };

  const removeChapter = (index: number) => {
    setChapterFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeTitlesFile = () => {
    setTitlesFile(null);
    setTitlesMap(new Map());
  };

  const handleSubmitMetadata = async () => {
    if (!title || !author) {
      toast.error("Title and author are required");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("author", author);
      formData.append("description", description);
      formData.append("genres", JSON.stringify(selectedGenres));
      formData.append("status", status);
      if (coverFile) {
        formData.append("cover", coverFile);
      }

      const response = await fetch("/api/novels/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setNovelSlug(data.data.slug);
        toast.success("Novel created! Now select chapter files.");
        setStep(2);
      } else {
        toast.error(data.message || "Failed to create novel");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload novel");
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPreview = () => {
    if (chapterFiles.length === 0) {
      toast.error("Please select chapter files");
      return;
    }

    const matched = matchChaptersWithTitles(chapterFiles.length, titlesMap);
    setPreviewChapters(matched);
    setStep(3);
  };

  const handleTitleEdit = (chapterNumber: number, newTitle: string) => {
    setPreviewChapters((prev) =>
      prev.map((ch) =>
        ch.number === chapterNumber ? { ...ch, title: newTitle } : ch,
      ),
    );
  };

  const handleUploadChapters = async () => {
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("slug", novelSlug);
      chapterFiles.forEach((file) => {
        formData.append("chapters", file);
      });

      const titlesData = previewChapters.reduce(
        (acc, ch) => {
          acc[ch.number] = ch.title;
          return acc;
        },
        {} as Record<number, string>,
      );

      formData.append("titles", JSON.stringify(titlesData));

      const response = await fetch("/api/novels/upload/chapters", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Uploaded ${data.data.addedChapters} chapters!`);
        router.push("/library");
      } else {
        toast.error(data.message || "Failed to upload chapters");
      }
    } catch (error) {
      console.error("Chapter upload error:", error);
      toast.error("Failed to upload chapters");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        <div
          className={`flex items-center gap-2 ${
            step >= 1 ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 1 ? "bg-primary text-primary-foreground" : "bg-secondary"
            }`}
          >
            {step > 1 ? <FiCheck /> : "1"}
          </div>
          <span className="font-medium hidden sm:inline">Novel Details</span>
        </div>
        <div className="flex-1 h-px bg-border" />
        <div
          className={`flex items-center gap-2 ${
            step >= 2 ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 2 ? "bg-primary text-primary-foreground" : "bg-secondary"
            }`}
          >
            {step > 2 ? <FiCheck /> : "2"}
          </div>
          <span className="font-medium hidden sm:inline">Select Chapters</span>
        </div>
        <div className="flex-1 h-px bg-border" />
        <div
          className={`flex items-center gap-2 ${
            step >= 3 ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 3 ? "bg-primary text-primary-foreground" : "bg-secondary"
            }`}
          >
            3
          </div>
          <span className="font-medium hidden sm:inline">Preview</span>
        </div>
      </div>

      {/* Step 1: Metadata (same as Manual Upload) */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-bold mb-4">Basic Information</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Novel Title *
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter novel title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Author *
                </label>
                <Input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Enter author name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter novel description"
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Cover Image
                </label>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  className="hidden"
                />

                {coverPreview ? (
                  <div className="relative w-32 h-48 rounded-lg overflow-hidden border border-border">
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setCoverPreview(null);
                        setCoverFile(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => coverInputRef.current?.click()}
                    className="w-32 h-48 rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                  >
                    <FiImage className="w-8 h-8" />
                    <span className="text-xs">Upload Cover</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-bold mb-4">Genres</h3>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedGenres.includes(genre)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-bold mb-4">Publication Status</h3>
            <div className="flex gap-3">
              {["ongoing", "completed", "hiatus"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s as any)}
                  className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    status === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmitMetadata}
            isLoading={loading}
            className="w-full"
          >
            Continue to Chapters
          </Button>
        </motion.div>
      )}

      {/* Step 2: Bulk Chapter Selection + Titles */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Folder Selection */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-bold mb-4">
              📁 Select Chapter Folder (Required)
            </h3>

            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore - webkitdirectory is not in types
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFolderSelect}
              className="hidden"
            />

            {chapterFiles.length === 0 ? (
              <button
                onClick={() => folderInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border hover:border-primary transition-colors rounded-xl p-12 flex flex-col items-center gap-4 text-muted-foreground hover:text-primary"
              >
                <FiPlus className="w-16 h-16" />
                <div className="text-center">
                  <p className="font-medium text-lg mb-1">
                    Select Chapter Folder
                  </p>
                  <p className="text-sm">
                    Choose a folder containing .txt or .md chapter files
                  </p>
                </div>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    {chapterFiles.length} file(s) selected
                  </p>
                  <button
                    onClick={() => setChapterFiles([])}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Clear All
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2 border border-border rounded-lg p-4">
                  {chapterFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FiFileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeChapter(index)}
                        className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors flex-shrink-0"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Titles File Upload */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-lg font-bold mb-4">
              📋 Upload titles.txt (Optional)
            </h3>

            <input
              ref={titlesInputRef}
              type="file"
              accept=".txt"
              onChange={handleTitlesSelect}
              className="hidden"
            />

            {titlesFile ? (
              <div className="flex items-center gap-4 p-4 bg-secondary rounded-lg">
                <FiFileText className="w-8 h-8 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{titlesFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {titlesMap.size} titles loaded
                  </p>
                </div>
                <button
                  onClick={removeTitlesFile}
                  className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                >
                  <FiTrash2 className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => titlesInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border hover:border-primary transition-colors rounded-xl p-6 flex flex-col items-center gap-3 text-muted-foreground hover:text-primary"
              >
                <FiFileText className="w-10 h-10" />
                <div className="text-center">
                  <p className="font-medium">Upload titles.txt</p>
                  <p className="text-sm">
                    One title per line: "Chapter X: Title"
                  </p>
                </div>
              </button>
            )}

            <div className="mt-4 text-xs text-muted-foreground flex items-center gap-1">
              <FiInfo className="w-3 h-3" /> If not provided, titles will be
              extracted from chapter content
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setStep(1)}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleProceedToPreview}
              disabled={chapterFiles.length === 0}
              className="flex-1"
            >
              Preview Chapters
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step 3: Preview & Edit */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                Preview & Edit Chapter Titles
              </h3>
              <div className="text-sm text-muted-foreground">
                {previewChapters.filter((ch) => ch.matched).length} /{" "}
                {previewChapters.length} matched
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {previewChapters.map((chapter) => (
                <div
                  key={chapter.number}
                  className={`p-3 rounded-lg border ${
                    chapter.matched
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-yellow-500/30 bg-yellow-500/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-20 flex-shrink-0">
                      Ch. {chapter.number}
                    </span>
                    <Input
                      type="text"
                      value={chapter.title}
                      onChange={(e) =>
                        handleTitleEdit(chapter.number, e.target.value)
                      }
                      className="flex-1"
                    />
                    <FiEdit2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setStep(2)}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleUploadChapters}
              isLoading={loading}
              className="flex-1"
            >
              <FiUpload className="mr-2" />
              Upload {chapterFiles.length} Chapters
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
