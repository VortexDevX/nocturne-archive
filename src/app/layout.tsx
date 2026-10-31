import type { Metadata, Viewport } from "next";
import { Inter, Roboto, Fira_Code, Josefin_Sans } from "next/font/google";
import "./globals.css";
import "@/components/reader/reader.css";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import ServiceWorkerLifecycle from "@/components/providers/ServiceWorkerLifecycle";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
  preload: false,
});
const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  preload: false,
});
const josefinSans = Josefin_Sans({
  subsets: ["latin"],
  variable: "--font-josephin",
  preload: false,
});

export const metadata: Metadata = {
  title: "Nocturne - Your Premium Light Novel Reader",
  description:
    "The ultimate light novel reading experience with offline support, cloud sync, and customizable themes",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nocturne",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/brand/nocturne-icon-48.png", type: "image/png", sizes: "48x48" },
      {
        url: "/brand/nocturne-icon-192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        url: "/brand/nocturne-icon-512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    apple: "/brand/nocturne-icon-180.png",
    shortcut: "/brand/nocturne-icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ed" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${inter.variable} ${firaCode.variable} ${josefinSans.variable} ${roboto.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <ServiceWorkerLifecycle />
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
