"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import {
  getNovelCacheInfo,
  clearNovelCache,
  fetchAndCacheChapter,
  bytesToHuman,
} from "@/lib/storage/offline";
import toast from "react-hot-toast";
import {
  FiDownload,
  FiTrash2,
  FiHardDrive,
  FiBook,
  FiBookOpen,
  FiCheckCircle,
  FiAlertCircle,
  FiDownloadCloud,
  FiDatabase,
} from "react-icons/fi";

type LibraryItem = {
  novel: {
    slug: string;
    title: string;
    totalChapters: number;
    coverImage?: string;
    author?: string;
  };
  novelId: string;
};

export default function DownloadsManagerPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [caching, setCaching] = useState<Record<string, boolean>>({});
  const [downloadProgress, setDownloadProgress] = useState<
    Record<string, number>
  >({});
  const [meta, setMeta] = useState<
    Record<string, { count: number; bytes: number }>
  >({});
  const [lastN, setLastN] = useState(10);
  const [totalCacheSize, setTotalCacheSize] = useState(0);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/library");
      const data = await res.json();
      if (data.success) {
        const list: LibraryItem[] = data.data.map((x: any) => ({
          novel: x.novel,
          novelId: x.novelId,
        }));
        setItems(list);

        let totalBytes = 0;
        for (const it of list) {
          const info = await getNovelCacheInfo(it.novel.slug);
          setMeta((m) => ({ ...m, [it.novel.slug]: info }));
          totalBytes += info.bytes;
        }
        setTotalCacheSize(totalBytes);
      } else {
        toast.error("Failed to load library");
      }
    } catch {
      toast.error("Failed to load library");
    } finally {
      setLoading(false);
    }
  };

  const downloadLastN = async (slug: string, total: number, N: number) => {
    setCaching((c) => ({ ...c, [slug]: true }));
    setDownloadProgress((p) => ({ ...p, [slug]: 0 }));

    try {
      const start = Math.max(1, total - N + 1);
      const chaptersToDownload = total - start + 1;

      for (let i = start; i <= total; i++) {
        await fetchAndCacheChapter(slug, i);
        const progress = Math.round(
          ((i - start + 1) / chaptersToDownload) * 100,
        );
        setDownloadProgress((p) => ({ ...p, [slug]: progress }));
      }

      const info = await getNovelCacheInfo(slug);
      setMeta((m) => ({ ...m, [slug]: info }));
      updateTotalCache();
      toast.success(`Downloaded ${Math.min(N, total)} chapters`);
    } catch {
      toast.error("Download failed");
    } finally {
      setCaching((c) => ({ ...c, [slug]: false }));
      setDownloadProgress((p) => ({ ...p, [slug]: 0 }));
    }
  };

  const downloadAll = async (slug: string, total: number) => {
    if (!confirm(`Download all ${total} chapters? This may take a while.`))
      return;

    setCaching((c) => ({ ...c, [slug]: true }));
    setDownloadProgress((p) => ({ ...p, [slug]: 0 }));

    try {
      for (let i = 1; i <= total; i++) {
        await fetchAndCacheChapter(slug, i);
        const progress = Math.round((i / total) * 100);
        setDownloadProgress((p) => ({ ...p, [slug]: progress }));
      }

      const info = await getNovelCacheInfo(slug);
      setMeta((m) => ({ ...m, [slug]: info }));
      updateTotalCache();
      toast.success(`Downloaded ${total} chapters`);
    } catch {
      toast.error("Download failed");
    } finally {
      setCaching((c) => ({ ...c, [slug]: false }));
      setDownloadProgress((p) => ({ ...p, [slug]: 0 }));
    }
  };

  const clearCache = async (slug: string) => {
    if (!confirm("Clear all cached chapters for this novel?")) return;

    await clearNovelCache(slug);
    setMeta((m) => ({ ...m, [slug]: { count: 0, bytes: 0 } }));
    updateTotalCache();
    toast.success("Cache cleared");
  };

  const clearAllCache = async () => {
    if (!confirm("Clear ALL cached chapters from all novels?")) return;

    for (const item of items) {
      await clearNovelCache(item.novel.slug);
      setMeta((m) => ({ ...m, [item.novel.slug]: { count: 0, bytes: 0 } }));
    }
    setTotalCacheSize(0);
    toast.success("All cache cleared");
  };

  const updateTotalCache = async () => {
    let total = 0;
    for (const item of items) {
      const info = await getNovelCacheInfo(item.novel.slug);
      total += info.bytes;
    }
    setTotalCacheSize(total);
  };

  const getTotalCachedChapters = () => {
    return Object.values(meta).reduce((sum, m) => sum + m.count, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <FiDownloadCloud className="w-8 h-8 text-primary" />
              Offline Downloads
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cache chapters for offline reading
            </p>
          </div>

          {items.length > 0 && (
            <Button
              variant="secondary"
              onClick={clearAllCache}
              className="flex items-center gap-2"
            >
              <FiTrash2 className="w-4 h-4" />
              Clear All Cache
            </Button>
          )}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {/* Total Storage */}
        <div className="p-4 sm:p-6 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 border-2 border-primary/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <FiHardDrive className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">
              Total Storage
            </h3>
          </div>
          <p className="text-2xl font-bold">{bytesToHuman(totalCacheSize)}</p>
        </div>

        {/* Cached Chapters */}
        <div className="p-4 sm:p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/20">
              <FiCheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">
              Cached Chapters
            </h3>
          </div>
          <p className="text-2xl font-bold">{getTotalCachedChapters()}</p>
        </div>

        {/* Novels */}
        <div className="p-4 sm:p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <FiBook className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">
              Novels
            </h3>
          </div>
          <p className="text-2xl font-bold">{items.length}</p>
        </div>
      </motion.div>

      {/* Download Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 rounded-xl bg-card border border-border"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <FiDatabase className="w-5 h-5 text-primary" />
          <label className="text-sm font-medium">Quick Download:</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Last</span>
            <input
              type="number"
              min={1}
              max={5000}
              value={lastN}
              onChange={(e) => setLastN(Number(e.target.value))}
              className="w-20 px-3 py-1.5 rounded-lg border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
            />
            <span className="text-sm text-muted-foreground">chapters</span>
          </div>
        </div>
      </motion.div>

      {/* Novels List */}
      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center py-12 px-4"
        >
          <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
            <FiBook className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Novels Yet</h3>
          <p className="text-muted-foreground mb-6">
            Add novels to your library to download them for offline reading
          </p>
          <Button
            variant="primary"
            onClick={() => (window.location.href = "/library")}
          >
            Browse Library
          </Button>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          {items.map((item, idx) => {
            const slug = item.novel.slug;
            const info = meta[slug] || { count: 0, bytes: 0 };
            const progress = downloadProgress[slug] || 0;
            const isDownloading = !!caching[slug];
            const cachePercent = (info.count / item.novel.totalChapters) * 100;

            return (
              <motion.div
                key={slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
                className="border-2 border-border rounded-xl overflow-hidden bg-card hover:border-primary/30 transition-all group"
              >
                <div className="flex flex-col sm:flex-row gap-4 p-4">
                  {/* Cover Image */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-28 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-purple-500/20 border border-border shadow-md">
                      {item.novel.coverImage ? (
                        <img
                          src={item.novel.coverImage}
                          alt={item.novel.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiBookOpen className="w-8 h-8 text-primary" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                        {item.novel.title}
                      </h3>
                      {item.novel.author && (
                        <p className="text-sm text-muted-foreground">
                          by {item.novel.author}
                        </p>
                      )}
                    </div>

                    {/* Cache Stats */}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <FiCheckCircle
                          className={`w-4 h-4 ${
                            info.count > 0
                              ? "text-green-500"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span className="text-muted-foreground">
                          Cached:{" "}
                          <span className="font-semibold text-foreground">
                            {info.count}
                          </span>
                          /{item.novel.totalChapters}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiHardDrive className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">
                          Size:{" "}
                          <span className="font-semibold text-foreground">
                            {bytesToHuman(info.bytes)}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {isDownloading ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-primary">
                            Downloading...
                          </span>
                          <span className="text-xs font-bold text-primary">
                            {progress}%
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-primary to-purple-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                    ) : info.count > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Cache Progress
                          </span>
                          <span className="text-xs font-bold text-green-500">
                            {Math.round(cachePercent)}%
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                            style={{ width: `${cachePercent}%` }}
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          downloadLastN(slug, item.novel.totalChapters, lastN)
                        }
                        isLoading={isDownloading}
                        disabled={isDownloading}
                        className="flex items-center gap-2"
                      >
                        <FiDownload className="w-4 h-4" />
                        Last {lastN}
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          downloadAll(slug, item.novel.totalChapters)
                        }
                        isLoading={isDownloading}
                        disabled={isDownloading}
                        className="flex items-center gap-2"
                      >
                        <FiDownloadCloud className="w-4 h-4" />
                        Download All
                      </Button>
                      {info.count > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearCache(slug)}
                          disabled={isDownloading}
                          className="flex items-center gap-2 text-red-500 hover:bg-red-500/10"
                        >
                          <FiTrash2 className="w-4 h-4" />
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/20"
      >
        <div className="flex items-start gap-3">
          <FiAlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Tip:</strong> Downloaded
              chapters are stored locally in your browser for offline access.
            </p>
            <p>
              Large downloads may take time depending on your connection speed.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
