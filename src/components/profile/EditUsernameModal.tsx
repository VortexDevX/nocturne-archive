"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

interface EditUsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EditUsernameModal({
  isOpen,
  onClose,
}: EditUsernameModalProps) {
  const { user, setUser } = useAuthStore();
  const [username, setUsername] = useState(user?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error("Username cannot be empty");
      return;
    }

    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/user/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: "username",
          value: username,
          currentPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.data);
        toast.success(data.message);
        onClose();
        setCurrentPassword("");
      } else {
        toast.error(data.message || "Failed to update username");
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update username");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Username" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">New Username</label>
          <Input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter new username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Current Password
          </label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Confirm with your password"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={loading}
            className="flex-1"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
