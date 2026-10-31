"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check authentication and redirect
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();

        if (data.success) {
          router.push("/library");
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background ">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="mx-auto mb-8 w-16"
        >
          <Image
            src="/brand/nocturne-mark-64.png"
            alt="Nocturne"
            width={64}
            height={64}
            priority
          />
        </motion.div>
        <h1 className="mb-4 text-4xl font-bold text-foreground font-serif font-normal tracking-tight">
          Nocturne
        </h1>
        <p className="text-muted-foreground animate-pulse">
          Loading your library...
        </p>
      </motion.div>
    </div>
  );
}
