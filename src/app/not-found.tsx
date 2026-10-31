import Link from "next/link";
import { FiArrowLeft, FiBookOpen } from "react-icons/fi";

export default function NotFound() {
  return (
    <main className="min-h-dvh bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
      <FiBookOpen className="h-9 w-9 text-primary mb-8" aria-hidden="true" />
      <p className="eyebrow mb-4">404</p>
      <h1 className="font-serif text-4xl tracking-tight mb-4">A page out of place.</h1>
      <p className="text-sm text-muted-foreground max-w-sm mb-8">This page is no longer here. Your next chapter is waiting in the library.</p>
      <Link href="/library" className="reader-action"><FiArrowLeft aria-hidden="true" />Back to library</Link>
    </main>
  );
}
