"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeDropdown from "@/components/ui/ThemeDropdown";
import { FiShield, FiUpload, FiUsers, FiArrowLeft } from "react-icons/fi";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card/50">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <FiShield />
            </div>
            <div>
              <div className="font-bold">Admin</div>
              <div className="text-xs text-muted-foreground">
                Nocturne Control
              </div>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          <NavItem
            href="/admin/upload"
            label="Upload"
            icon={<FiUpload />}
            active={isActive("/admin/upload")}
          />
          <NavItem
            href="/admin/users"
            label="Users"
            icon={<FiUsers />}
            active={isActive("/admin/users")}
          />
          <NavItem
            href="/library"
            label="Back to App"
            icon={<FiArrowLeft />}
            active={false}
          />
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                <FiShield />
              </div>
              <div>
                <div className="font-bold">Admin</div>
                <div className="text-xs text-muted-foreground">
                  Nocturne Control
                </div>
              </div>
            </div>
            <ThemeDropdown />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? "bg-primary/10 text-primary border border-primary/20"
          : "hover:bg-secondary"
      }`}
    >
      <span className="w-5 h-5">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
