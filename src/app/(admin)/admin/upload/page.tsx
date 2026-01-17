"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiUpload, FiFileText, FiArrowLeft } from "react-icons/fi";
import ThemeDropdown from "@/components/ui/ThemeDropdown";
import ManualUpload from "@/components/library/ManualUpload";
import BulkUpload from "@/components/library/BulkUpload";

type UploadMethod = "manual" | "bulk";

export default function AdminUploadPage() {
  const [selectedMethod, setSelectedMethod] = useState<UploadMethod | null>(
    null
  );

  const methods = [
    {
      id: "manual" as UploadMethod,
      title: "Manual Upload",
      description: "Add novel details and upload chapters individually",
      icon: FiUpload,
      color: "from-blue-500 to-cyan-500",
    },
    {
      id: "bulk" as UploadMethod,
      title: "Bulk TXT Upload",
      description: "Upload multiple chapter files at once",
      icon: FiFileText,
      color: "from-orange-500 to-red-500",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedMethod(null)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
              disabled={!selectedMethod}
              title="Back to method selection"
            >
              <FiArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-lg font-bold">Add Novel</h2>
              <p className="text-xs text-muted-foreground">
                {selectedMethod
                  ? "Fill in the details below"
                  : "Choose your preferred upload method"}
              </p>
            </div>
          </div>
          <ThemeDropdown />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-5xl mx-auto p-4 lg:p-6">
          <AnimatePresence mode="wait">
            {!selectedMethod ? (
              <motion.div
                key="method-selection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6"
              >
                {methods.map((m, idx) => (
                  <MethodCard
                    key={m.id}
                    method={m}
                    index={idx}
                    onClick={() => setSelectedMethod(m.id)}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="upload-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {selectedMethod === "manual" && <ManualUpload />}
                {selectedMethod === "bulk" && <BulkUpload />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function MethodCard({ method, index, onClick }: any) {
  const Icon = method.icon;
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl border border-border bg-card hover:border-primary/50 transition-all p-6 text-left group hover:shadow-xl hover:shadow-primary/10"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${method.color} opacity-5 group-hover:opacity-10 transition-opacity`}
      />
      <div
        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform relative`}
      >
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
        {method.title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {method.description}
      </p>
      <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        <span>Get Started</span>
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </motion.button>
  );
}
