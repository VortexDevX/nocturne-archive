"use client";

import { useState, useRef } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { FiUpload, FiImage, FiFolder } from "react-icons/fi";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AvatarUploadModal({
  isOpen,
  onClose,
}: AvatarUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setUser, user } = useAuthStore();

  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.data.user);
        toast.success("Avatar updated successfully!");
        onClose();
        setFile(null);
        setPreview(null);
      } else {
        toast.error(data.message || "Failed to upload avatar");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setFile(null);
    setPreview(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Profile Picture">
      <div className="space-y-6">
        {/* Drag & Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 transition-all ${
            dragActive
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-border hover:border-primary/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) =>
              e.target.files && handleFileChange(e.target.files[0])
            }
            className="hidden"
          />

          {preview ? (
            <div className="flex flex-col items-center">
              <img
                src={preview}
                alt="Preview"
                className="w-32 h-32 rounded-full object-cover border-4 border-border mb-4"
              />
              <p className="text-sm text-muted-foreground mb-4 font-medium">
                {file?.name}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <FiFolder className="mr-2" />
                Choose Different Image
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <FiImage className="w-8 h-8 text-primary" />
              </div>
              <p className="text-base font-medium mb-2">
                Drag & drop your image here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                PNG, JPG, GIF up to 5MB
              </p>

              {/* Divider */}
              <div className="flex items-center gap-3 w-full my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">
                  OR
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Select File Button */}
              <Button
                variant="secondary"
                size="md"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <FiFolder className="mr-2" />
                Select File from Device
              </Button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={handleClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleUpload}
            disabled={!file || uploading}
            isLoading={uploading}
            className="flex-1"
          >
            <FiUpload className="mr-2" />
            Upload Avatar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
