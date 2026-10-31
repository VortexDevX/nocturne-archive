export function usesR2() {
  const driver = process.env.STORAGE_BACKEND;
  if (driver && !["local", "r2"].includes(driver)) throw new Error("Invalid STORAGE_BACKEND");
  if (process.env.VERCEL && driver === "local") throw new Error("Vercel requires R2 storage");
  return Boolean(process.env.VERCEL) || driver === "r2" || (!driver && Boolean(process.env.R2_ACCOUNT_ID));
}

export function allowsLocalFallback() {
  return !process.env.VERCEL && process.env.FILESYSTEM_FALLBACK !== "false";
}

export function readableNovelFilter() {
  return usesR2() && !allowsLocalFallback()
    ? { storageBackend: "r2", uploadState: "ready" }
    : { $or: [{ uploadState: { $exists: false } }, { uploadState: "ready" }] };
}
