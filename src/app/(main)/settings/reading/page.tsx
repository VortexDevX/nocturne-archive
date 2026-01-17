"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FiType,
  FiSun,
  FiAlignLeft,
  FiDroplet,
  FiBookOpen,
  FiCheckCircle,
  FiEye,
  FiSave,
} from "react-icons/fi";
import type { UserPreferences } from "@/types";

type ReaderFont = "inter" | "roboto" | "fira-code" | "system" | "josephin";

const FONT_OPTIONS: { value: ReaderFont; label: string; stack: string }[] = [
  {
    value: "inter",
    label: "Inter",
    stack: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
  },
  {
    value: "roboto",
    label: "Roboto",
    stack: '"Roboto", ui-sans-serif, system-ui, sans-serif',
  },
  {
    value: "fira-code",
    label: "Fira Code",
    stack: '"Fira Code", "Cascadia Code", ui-monospace, monospace',
  },
  {
    value: "system",
    label: "System",
    stack:
      "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  {
    value: "josephin",
    label: "Josephin Sans",
    stack: '"Josefin Sans", ui-sans-serif, system-ui, sans-serif',
  },
];

const ACCENT_COLORS = [
  { name: "Default", value: "default", bg: "#ffffff", text: "#000000" },
  { name: "Warm", value: "warm", bg: "#fffdf8", text: "#3e3e3e" },
  { name: "Sepia", value: "sepia", bg: "#faf6ed", text: "#5c4a2f" },
  { name: "Cool", value: "cool", bg: "#f7f9fc", text: "#2d3748" },
  { name: "Green", value: "green", bg: "#f5faf6", text: "#233428" },
];

const SAMPLE_TEXT = `In the beginning, the universe was created. This has made a lot of people very angry and been widely regarded as a bad move. Far out in the uncharted backwaters of the unfashionable end of the western spiral arm of the Galaxy lies a small unregarded yellow sun.

Orbiting this at a distance of roughly ninety-two million miles is an utterly insignificant little blue green planet whose ape-descended life forms are so amazingly primitive that they still think digital watches are a pretty neat idea.`;

export default function ReadingSettingsPage() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const fetchPrefs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/preferences");
      const data = await res.json();
      if (data.success) setPrefs(data.data);
    } catch {
      toast.error("Failed to load preferences");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrefs();
  }, []);

  const autoSave = async (update: Partial<UserPreferences>) => {
    try {
      setAutoSaving(true);
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Update failed");
      setPrefs(data.data);
      setLastSaved(new Date());
      toast.success("Saved!", { duration: 1500 });
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setAutoSaving(false);
    }
  };

  const updateLocal = (update: Partial<UserPreferences>) => {
    if (!prefs) return;
    setPrefs({ ...prefs, ...update });
  };

  const getCurrentFont = () => {
    return (
      FONT_OPTIONS.find((f) => f.value === prefs?.fontFamily)?.stack ||
      FONT_OPTIONS[0].stack
    );
  };

  const getCurrentColor = () => {
    return (
      ACCENT_COLORS.find((c) => c.value === prefs?.accentColor) ||
      ACCENT_COLORS[0]
    );
  };

  if (loading || !prefs) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <FiBookOpen className="w-8 h-8 text-primary" />
              Reading Preferences
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Customize your reading experience • Changes save automatically
            </p>
          </div>

          {lastSaved && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FiCheckCircle className="w-4 h-4 text-green-500" />
              <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Settings Column */}
        <div className="space-y-6">
          {/* Page Background */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border-2 border-border rounded-xl p-5 bg-card space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FiDroplet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Page Background</h2>
                <p className="text-xs text-muted-foreground">
                  Choose your reading background
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {ACCENT_COLORS.map((color) => (
                <motion.button
                  key={color.value}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    updateLocal({ accentColor: color.value });
                    autoSave({ accentColor: color.value });
                  }}
                  className={`relative p-3 rounded-xl border-2 transition-all ${
                    prefs.accentColor === color.value
                      ? "border-primary ring-4 ring-primary/20 shadow-lg"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div
                    className="w-full h-12 rounded-lg mb-2 border border-border/50 shadow-sm"
                    style={{ backgroundColor: color.bg }}
                  />
                  <div className="text-xs font-medium text-center">
                    {color.name}
                  </div>
                  {prefs.accentColor === color.value && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <FiCheckCircle className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.section>

          {/* Font Family */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="border-2 border-border rounded-xl p-5 bg-card space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FiType className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Font Family</h2>
                <p className="text-xs text-muted-foreground">
                  Select your preferred typeface
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {FONT_OPTIONS.map((font) => (
                <motion.button
                  key={font.value}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    updateLocal({ fontFamily: font.value });
                    autoSave({ fontFamily: font.value });
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    prefs.fontFamily === font.value
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                  style={{ fontFamily: font.stack }}
                >
                  <div className="text-2xl font-medium mb-1">Aa</div>
                  <div className="text-sm">{font.label}</div>
                </motion.button>
              ))}
            </div>
          </motion.section>

          {/* Font Size */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="border-2 border-border rounded-xl p-5 bg-card space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <FiType className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Font Size</h2>
                  <p className="text-xs text-muted-foreground">
                    Adjust text size
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">
                {prefs.fontSize}px
              </span>
            </div>

            <input
              type="range"
              min={12}
              max={32}
              step={1}
              value={prefs.fontSize}
              onChange={(e) =>
                updateLocal({ fontSize: Number(e.target.value) })
              }
              onMouseUp={() => autoSave({ fontSize: prefs.fontSize })}
              onTouchEnd={() => autoSave({ fontSize: prefs.fontSize })}
              className="w-full h-3 accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>12px</span>
              <span>32px</span>
            </div>
          </motion.section>

          {/* Line Spacing */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="border-2 border-border rounded-xl p-5 bg-card space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <FiAlignLeft className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Line Spacing</h2>
                  <p className="text-xs text-muted-foreground">
                    Control line height
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">
                {prefs.lineHeight.toFixed(1)}
              </span>
            </div>

            <input
              type="range"
              min={1.2}
              max={2.5}
              step={0.1}
              value={prefs.lineHeight}
              onChange={(e) =>
                updateLocal({ lineHeight: Number(e.target.value) })
              }
              onMouseUp={() => autoSave({ lineHeight: prefs.lineHeight })}
              onTouchEnd={() => autoSave({ lineHeight: prefs.lineHeight })}
              className="w-full h-3 accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>Compact (1.2)</span>
              <span>Relaxed (2.5)</span>
            </div>
          </motion.section>

          {/* Brightness */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="border-2 border-border rounded-xl p-5 bg-card space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <FiSun className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Brightness</h2>
                  <p className="text-xs text-muted-foreground">
                    Adjust screen brightness
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">
                {prefs.brightness}%
              </span>
            </div>

            <input
              type="range"
              min={60}
              max={120}
              step={5}
              value={prefs.brightness}
              onChange={(e) =>
                updateLocal({ brightness: Number(e.target.value) })
              }
              onMouseUp={() => autoSave({ brightness: prefs.brightness })}
              onTouchEnd={() => autoSave({ brightness: prefs.brightness })}
              className="w-full h-3 accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>Dim (60%)</span>
              <span>Bright (120%)</span>
            </div>
          </motion.section>
        </div>

        {/* Live Preview Column */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:sticky lg:top-6 h-fit"
        >
          <div className="border-2 border-border rounded-xl overflow-hidden bg-card">
            {/* Preview Header */}
            <div className="p-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FiEye className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Live Preview</h2>
                  <p className="text-xs text-muted-foreground">
                    See your changes in real-time
                  </p>
                </div>
              </div>
            </div>

            {/* Preview Content */}
            <div
              className="p-8 min-h-[400px] transition-all duration-200"
              style={{
                backgroundColor: getCurrentColor().bg,
                filter: `brightness(${prefs.brightness}%)`,
              }}
            >
              <div
                className="prose prose-lg max-w-none"
                style={{
                  fontFamily: getCurrentFont(),
                  fontSize: `${prefs.fontSize}px`,
                  lineHeight: `${prefs.lineHeight}`,
                  color: getCurrentColor().text,
                }}
              >
                <h1 className="text-2xl font-bold mb-4">Chapter Title</h1>
                {SAMPLE_TEXT.split("\n\n").map((para, idx) => (
                  <p key={idx} className="mb-6">
                    {para}
                  </p>
                ))}
              </div>
            </div>

            {/* Preview Footer */}
            <div className="p-4 border-t border-border bg-secondary/30">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Preview updates automatically</span>
                <div className="flex items-center gap-2">
                  {autoSaving ? (
                    <>
                      <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="w-3 h-3 text-green-500" />
                      <span>All changes saved</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/20"
          >
            <div className="flex items-start gap-3">
              <FiSave className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">
                    Auto-Save Enabled:
                  </strong>{" "}
                  Your preferences are saved automatically as you make changes.
                </p>
                <p>These settings sync across all your devices.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
