"use client";

import { useEffect } from "react";

export default function ServiceWorkerLifecycle() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      const appWorkers = registrations.filter((registration) => {
        const worker = registration.active || registration.waiting || registration.installing;
        if (!worker) return false;
        const url = new URL(worker.scriptURL);
        return url.origin === location.origin && url.pathname === "/sw.js";
      });
      if (process.env.NODE_ENV === "development") {
        // Production workers otherwise keep serving old, unversioned dev chunks.
        const controlled = navigator.serviceWorker.controller?.scriptURL;
        await Promise.all(appWorkers.map((registration) => registration.unregister()));
        if (controlled && new URL(controlled).pathname === "/sw.js") location.reload();
      } else {
        await Promise.all(appWorkers.map((registration) => registration.update().catch(() => {})));
      }
    }).catch(() => {});
  }, []);
  return null;
}
