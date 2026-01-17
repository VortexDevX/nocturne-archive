"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiBookmark, FiMessageSquare, FiTag } from "react-icons/fi";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

interface BookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  novelId: string;
  chapterNumber: number;
  chapterTitle: string;
  selectedText?: string;
  position?: number;
}

export default function BookmarkModal({
  isOpen,
  onClose,
  novelId,
  chapterNumber,
  chapterTitle,
  selectedText = "",
  position = 0,
}: BookmarkModalProps) {
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleSaveBookmark = async () => {
    if (!selectedText && !note) {
      toast.error("Please select some text or add a note");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          novelId,
          chapterNumber,
          chapterTitle,
          position,
          selectedText: selectedText.trim(),
          note: note.trim(),
          tags,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Bookmark saved!");
        onClose();
        setNote("");
        setTags([]);
        setTagInput("");
      } else {
        toast.error(data.error || "Failed to save bookmark");
      }
    } catch (error) {
      console.error("Failed to save bookmark:", error);
      toast.error("Failed to save bookmark");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="relative w-full max-w-lg bg-card border-2 border-border rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-primary/5 to-background flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-lg">
                  <FiBookmark className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Create Bookmark</h2>
                  <p className="text-xs text-muted-foreground">
                    Chapter {chapterNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Selected Text */}
              {selectedText && (
                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                    <FiBookmark className="h-4 w-4 text-primary" />
                    Selected Text
                  </label>
                  <div className="p-4 rounded-xl bg-primary/5 border-2 border-primary/20 text-sm leading-relaxed max-h-32 overflow-y-auto">
                    "{selectedText}"
                  </div>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                  <FiMessageSquare className="h-4 w-4 text-primary" />
                  Personal Note
                  <span className="text-xs text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add your thoughts, analysis, or why this passage is important..."
                  className="w-full h-32 px-4 py-3 rounded-xl border-2 border-input bg-background focus:border-primary focus:outline-none resize-none text-sm"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                  <FiTag className="h-4 w-4 text-primary" />
                  Tags
                  <span className="text-xs text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>

                {/* Tag Input */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add a tag..."
                    className="flex-1 h-10 px-4 rounded-xl border-2 border-input bg-background focus:border-primary focus:outline-none text-sm"
                  />
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim()}
                  >
                    Add
                  </Button>
                </div>

                {/* Tags List */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium border border-primary/20 flex items-center gap-2"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-500 transition-colors"
                        >
                          <FiX className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick Tags */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Quick tags:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Important",
                      "Character Development",
                      "Plot Twist",
                      "Quote",
                      "Theory",
                      "Foreshadowing",
                    ].map((quickTag) => (
                      <button
                        key={quickTag}
                        onClick={() => {
                          if (!tags.includes(quickTag)) {
                            setTags([...tags, quickTag]);
                          }
                        }}
                        disabled={tags.includes(quickTag)}
                        className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        + {quickTag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="flex gap-3 p-5 border-t border-border bg-card flex-shrink-0">
              <Button
                variant="ghost"
                size="lg"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleSaveBookmark}
                disabled={loading || (!selectedText && !note)}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FiBookmark className="mr-2" />
                    Save Bookmark
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
