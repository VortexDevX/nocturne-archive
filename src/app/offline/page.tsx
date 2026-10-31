import { FiWifiOff } from "react-icons/fi";
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <FiWifiOff className="h-12 w-12 mx-auto text-primary" aria-hidden="true" />
        <h1 className="text-2xl font-bold">You’re offline</h1>
        <p className="text-sm text-muted-foreground">
          This page isn’t available offline yet. Use Downloads to cache
          chapters, then try again.
        </p>
        <div className="flex items-center justify-center gap-2">
          <a
            href="/settings/downloads"
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground"
          >
            Open Downloads
          </a>
          <a
            href="/library"
            className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80"
          >
            Back to Library
          </a>
        </div>
      </div>
    </div>
  );
}
