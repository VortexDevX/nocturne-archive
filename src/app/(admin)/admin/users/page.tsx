"use client";

import { useEffect, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { FiSearch, FiUserCheck, FiShield, FiRefreshCcw } from "react-icons/fi";
import toast from "react-hot-toast";

interface AdminUser {
  _id: string;
  username: string;
  email: string;
  canUpload?: boolean;
  isAdmin?: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/admin/users?q=${encodeURIComponent(
          q
        )}&page=${page}&limit=${limit}`
      );
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.users);
        setTotal(data.data.total);
      } else {
        toast.error(data.message || "Failed to load users");
      }
    } catch (e) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const onSearch = () => {
    setPage(1);
    fetchUsers();
  };

  const toggle = async (
    userId: string,
    field: "canUpload" | "isAdmin",
    current: boolean | undefined
  ) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, [field]: !current }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Updated");
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, ...data.data } : u))
        );
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch {
      toast.error("Update failed");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by username or email"
            className="pl-9"
          />
        </div>
        <Button variant="primary" onClick={onSearch}>
          Search
        </Button>
        <Button variant="secondary" onClick={fetchUsers}>
          <FiRefreshCcw className="mr-2" />
          Refresh
        </Button>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 bg-card/70 border-b border-border px-4 py-3 text-sm font-semibold">
          <div className="col-span-4">User</div>
          <div className="col-span-4">Email</div>
          <div className="col-span-2">Can Upload</div>
          <div className="col-span-2">Admin</div>
        </div>

        {loading ? (
          <div className="p-6 text-muted-foreground">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-muted-foreground">No users found</div>
        ) : (
          users.map((u) => (
            <div
              key={u._id}
              className="grid grid-cols-12 items-center px-4 py-3 border-b border-border text-sm"
            >
              <div className="col-span-4 font-medium">{u.username}</div>
              <div className="col-span-4 text-muted-foreground">{u.email}</div>
              <div className="col-span-2">
                <ToggleButton
                  label="Upload"
                  icon={<FiUserCheck />}
                  active={!!u.canUpload}
                  onClick={() => toggle(u._id, "canUpload", u.canUpload)}
                />
              </div>
              <div className="col-span-2">
                <ToggleButton
                  label="Admin"
                  icon={<FiShield />}
                  active={!!u.isAdmin}
                  onClick={() => toggle(u._id, "isAdmin", u.isAdmin)}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </div>
          <Button
            variant="secondary"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function ToggleButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
        active
          ? "bg-green-500/10 text-green-600 border-green-500/30"
          : "bg-secondary hover:bg-secondary/80"
      }`}
    >
      <span className="w-4 h-4">{icon}</span>
      {label}
    </button>
  );
}
