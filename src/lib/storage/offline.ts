"use client";

import { openDB, DBSchema } from "idb";

const DB_NAME = "nocturne-offline";
const DB_VERSION = 1;
const STORE_CHAPTERS = "chapters";

interface ChapterDB extends DBSchema {
  [STORE_CHAPTERS]: {
    key: string; // `${slug}:${number}`
    value: {
      key: string;
      slug: string;
      number: number;
      title: string;
      content: string;
      savedAt: number;
      bytes: number;
    };
    indexes: { "by-slug": string };
  };
}

function makeKey(slug: string, number: number) {
  return `${slug}:${number}`;
}

async function getDB() {
  return openDB<ChapterDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_CHAPTERS)) {
        const store = db.createObjectStore(STORE_CHAPTERS, { keyPath: "key" });
        store.createIndex("by-slug", "slug");
      }
    },
  });
}

export async function saveChapterOffline(
  slug: string,
  number: number,
  title: string,
  content: string
) {
  const db = await getDB();
  const key = makeKey(slug, number);
  const bytes = new Blob([content]).size;
  await db.put(STORE_CHAPTERS, {
    key,
    slug,
    number,
    title,
    content,
    savedAt: Date.now(),
    bytes,
  });
}

export async function getChapterOffline(slug: string, number: number) {
  const db = await getDB();
  const key = makeKey(slug, number);
  return await db.get(STORE_CHAPTERS, key);
}

export async function listCachedChapterNumbers(
  slug: string
): Promise<number[]> {
  const db = await getDB();
  const idx = db.transaction(STORE_CHAPTERS).store.index("by-slug");
  const list: number[] = [];
  for await (const cursor of idx.iterate(slug)) {
    list.push(cursor.value.number);
  }
  return list.sort((a, b) => a - b);
}

export async function getNovelCacheInfo(slug: string) {
  const db = await getDB();
  const idx = db.transaction(STORE_CHAPTERS).store.index("by-slug");
  let count = 0;
  let bytes = 0;
  for await (const cursor of idx.iterate(slug)) {
    count++;
    bytes += cursor.value.bytes || 0;
  }
  return { count, bytes };
}

export async function clearNovelCache(slug: string) {
  const db = await getDB();
  const tx = db.transaction(STORE_CHAPTERS, "readwrite");
  const idx = tx.store.index("by-slug");
  const keys: string[] = [];
  for await (const cursor of idx.iterate(slug)) {
    keys.push(cursor.value.key);
  }
  for (const key of keys) {
    await tx.store.delete(key);
  }
  await tx.done;
}

export function bytesToHuman(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function fetchAndCacheChapter(slug: string, number: number) {
  const res = await fetch(`/api/novels/${slug}/chapter/${number}`);
  if (!res.ok) throw new Error("Network error");
  const data = await res.json();
  if (!data?.success) throw new Error("API error");
  await saveChapterOffline(slug, number, data.data.title, data.data.content);
  return data.data;
}

export async function prefetchChapterOffline(slug: string, number: number) {
  try {
    const existing = await getChapterOffline(slug, number);
    if (existing) return;
    await fetchAndCacheChapter(slug, number);
  } catch {
    // ignore
  }
}
