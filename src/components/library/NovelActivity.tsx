"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiClock } from "react-icons/fi";

interface Event { id: string; title: string; date: string; chapter?: number }

export default function NovelActivity({ novelId }: { novelId: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [chaptersRead, setChaptersRead] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    void fetch(`/api/reading/activity?novelId=${encodeURIComponent(novelId)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error("Activity unavailable");
        if (!controller.signal.aborted) { setEvents(result.data); setChaptersRead(result.chaptersRead); }
      }).catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [novelId, retry]);
  if (loading) return <p role="status" className="py-12 text-center text-muted-foreground">Loading your activity…</p>;
  if (error) return <div className="py-12 text-center"><p className="mb-4 text-muted-foreground">Couldn’t load activity.</p><button className="reader-action" onClick={() => setRetry((n) => n + 1)}>Try again</button></div>;
  return <section aria-label="Your novel activity" className="max-w-3xl mx-auto py-6">
    <h2 className="font-serif text-2xl mb-2">Your reading trail</h2>
    <p className="text-sm text-muted-foreground mb-6">{chaptersRead} chapters visited. Latest reading position, shelf changes, and saved passages.</p>
    {events.length ? <ol className="divide-y divide-border">
      {events.map((event) => <li key={event.id} className="flex gap-4 py-5">
        <FiClock className="h-5 w-5 text-primary shrink-0 mt-1" aria-hidden="true" />
        <div className="min-w-0"><p className="text-sm font-medium">{event.title}</p>
          <time dateTime={event.date} className="block text-xs text-muted-foreground mt-2">{new Date(event.date).toLocaleString()}</time>
          {event.chapter && <Link className="inline-block py-2 text-xs text-primary underline underline-offset-4" href={`/reader/${encodeURIComponent(novelId)}/${event.chapter}`}>Open chapter {event.chapter}</Link>}
        </div>
      </li>)}
    </ol> : <p className="py-12 text-muted-foreground">Your activity will appear here when you add this book, read, or save a passage.</p>}
  </section>;
}
