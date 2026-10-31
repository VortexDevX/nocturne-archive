import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);

// Exercise the real route handlers with isolated database adapters. No user data changes.
function route(relativePath, mocks) {
  const filename = fileURLToPath(
    new URL(`../src/app/api/${relativePath}/route.ts`, import.meta.url),
  );
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  const compiled = { exports: {} };
  runInNewContext(
    outputText,
    {
      module: compiled,
      exports: compiled.exports,
      process,
      Date,
      URL,
      console,
      require: (name) => (name in mocks ? mocks[name] : require(name)),
    },
    { filename },
  );
  return compiled.exports;
}

function query(value) {
  return {
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    select() {
      return this;
    },
    lean: async () => value,
  };
}

const session = { userId: "reader-1" };
const auth = { verifyAuth: async () => session };
const connection = async () => {};

test("Membership resolves the current user's dropped shelf", async () => {
  const api = route("library/check", {
    "@/lib/auth/session": auth, "@/lib/db/mongodb": connection,
    "@/lib/db/models/UserLibrary": { findOne(filter) {
      assert.deepEqual(JSON.parse(JSON.stringify(filter)), { userId: session.userId, novelId: "book" });
      return query({ status: "dropped", isFavorite: true });
    } },
  });
  const result = await (await api.GET(new Request("http://localhost/api/library/check?novelId=book"))).json();
  assert.equal(result.inLibrary, true);
  assert.equal(result.data.status, "dropped");
});

test("Shelf changes update the existing row without removing favorites", async () => {
  const api = route("library", {
    "@/lib/auth/session": auth, "@/lib/db/mongodb": connection,
    "@/lib/db/models/Novel": {}, "@/lib/db/models/ReadingProgress": {}, "@/lib/utils/fileSystem": {},
    "@/lib/db/models/UserLibrary": { async findOneAndUpdate(filter, update, options) {
      assert.deepEqual(JSON.parse(JSON.stringify(filter)), { userId: session.userId, novelId: "book" });
      assert.equal(update.status, "plan_to_read");
      assert.equal(update.isFavorite, undefined);
      assert.equal(options.runValidators, true);
      return { status: update.status, isFavorite: true };
    } },
  });
  const result = await (await api.PATCH(new Request("http://localhost/api/library", { method: "PATCH", body: JSON.stringify({ novelId: "book", status: "plan_to_read" }) }))).json();
  assert.equal(result.success, true);
  assert.equal(result.data.isFavorite, true);
});

test("Activity reconstructs stored actions and scopes every query to the user", async () => {
  const scoped = (value) => (filter) => {
    assert.deepEqual(JSON.parse(JSON.stringify(filter)), { userId: session.userId, novelId: "book" });
    return query(value);
  };
  const api = route("reading/activity", {
    "@/lib/auth/session": auth, "@/lib/db/mongodb": connection,
    "@/lib/db/models/UserLibrary": { findOne: scoped({ status: "reading", addedAt: "2026-01-01", lastStatusChange: "2026-01-02" }) },
    "@/lib/db/models/ReadingProgress": { findOne: scoped({ currentChapter: 4, chaptersRead: [1,2,3,4], lastReadAt: "2026-01-04" }) },
    "@/lib/db/models/Bookmark": { find: scoped([{ _id: "one", chapterNumber: 3, createdAt: "2026-01-03" }]) },
  });
  const response = await api.GET(new Request("http://localhost/api/reading/activity?novelId=book"));
  const result = await response.json();
  assert.equal(result.data.length, 4);
  assert.equal(result.data[0].id, "reading");
  assert.equal(result.chaptersRead, 4);
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("Progress keeps pixel fields, fraction, percentage, and timestamp in sync", async () => {
  let update;
  const api = route("reading/progress", {
    "@/lib/auth/session": auth,
    "@/lib/db/mongodb": connection,
    "@/lib/utils/fileSystem": {
      readNovelMetadata: async () => null,
      readChaptersMetadata: async () => [],
    },
    "@/lib/db/models/Novel": { findOne: () => query({ totalChapters: 10 }) },
    "@/lib/db/models/ReadingProgress": {
      findOneAndUpdate: async (_filter, value) => {
        update = value;
        return value.$set;
      },
    },
  });
  const response = await api.POST(
    new Request("http://localhost/api/reading/progress", {
      method: "POST",
      body: JSON.stringify({
        novelId: "novel-1",
        chapterNumber: 4,
        position: 1200,
        chapterProgress: 0.5,
        progressPercent: 99,
      }),
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(update.$set.currentChapter, 4);
  assert.equal(update.$set.currentPosition, 1200);
  assert.equal(update.$set.currentScrollPosition, 1200);
  assert.equal(update.$set.chapterProgress, 0.5);
  assert.equal(update.$set.progressPercent, 35);
  assert.ok(update.$set.lastReadAt instanceof Date);
});

test("Invalid progress rejects before touching storage", async () => {
  const api = route("reading/progress", {
    "@/lib/auth/session": auth,
    "@/lib/db/mongodb": () => {
      throw new Error("Storage must not be called");
    },
    "@/lib/db/models/ReadingProgress": {},
    "@/lib/db/models/Novel": {},
    "@/lib/utils/fileSystem": {},
  });
  for (const payload of [
    null,
    [],
    {},
    { novelId: "../escape", chapterNumber: 1 },
    { novelId: "novel", chapterNumber: -1 },
    { novelId: "novel", chapterNumber: 1, position: -20 },
    { novelId: "novel", chapterNumber: 1, chapterProgress: 1.1 },
  ]) {
    const result = await api.POST(
      new Request("http://localhost/api/reading/progress", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
    assert.equal(result.status, 400);
  }
});

test("Progress requires authentication", async () => {
  const api = route("reading/progress", {
    "@/lib/auth/session": { verifyAuth: async () => null },
    "@/lib/db/mongodb": connection,
    "@/lib/db/models/ReadingProgress": {},
    "@/lib/db/models/Novel": {},
    "@/lib/utils/fileSystem": {},
  });
  assert.equal(
    (
      await api.POST(
        new Request("http://localhost/api/reading/progress", {
          method: "POST",
          body: "{}",
        }),
      )
    ).status,
    401,
  );
});

test("Unknown chapters cannot create orphan progress records", async () => {
  const api = route("reading/progress", {
    "@/lib/auth/session": auth,
    "@/lib/db/mongodb": connection,
    "@/lib/db/models/Novel": { findOne: () => query(null) },
    "@/lib/utils/fileSystem": {
      readNovelMetadata: async () => null,
      readChaptersMetadata: async () => [],
    },
    "@/lib/db/models/ReadingProgress": {
      findOneAndUpdate: () => {
        throw new Error("Unknown novels must not be saved");
      },
    },
  });
  const result = await api.POST(
    new Request("http://localhost/api/reading/progress", {
      method: "POST",
      body: JSON.stringify({ novelId: "missing", chapterNumber: 1 }),
    }),
  );
  assert.equal(result.status, 404);
});

test("Large libraries fetch novels and progress in batches", async () => {
  let novelQueries = 0;
  let progressQueries = 0;
  const items = Array.from({ length: 100 }, (_, index) => ({
    _id: `item-${index}`,
    userId: session.userId,
    novelId: `novel-${index}`,
    status: "reading",
  }));
  const novels = items.map((item) => ({
    slug: item.novelId,
    title: item.novelId,
    author: "Author",
    totalChapters: 10,
  }));
  const progress = items.map((item) => ({
    novelId: item.novelId,
    currentChapter: 4,
    currentScrollPosition: 1200,
    progressPercent: 35,
    lastReadAt: new Date(),
  }));
  const api = route("library", {
    "@/lib/auth/session": auth,
    "@/lib/db/mongodb": connection,
    "@/lib/db/models/UserLibrary": { find: () => query(items) },
    "@/lib/utils/fileSystem": {
      readNovelMetadata: async () => null,
      readChaptersMetadata: async () => [],
    },
    "@/lib/db/models/Novel": {
      find: () => {
        novelQueries++;
        return query(novels);
      },
    },
    "@/lib/db/models/ReadingProgress": {
      find: () => {
        progressQueries++;
        return query(progress);
      },
    },
  });
  const response = await api.GET(new Request("http://localhost/api/library"));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.data.length, 100);
  assert.equal(novelQueries, 1);
  assert.equal(progressQueries, 1);
  assert.equal(result.data[0].currentChapter, 4);
  assert.equal(result.data[0].currentScrollPosition, 1200);
  assert.equal(result.data[0].progressPercent, 35);
});

test("Continue shelf uses one novel query and retains fractional progress", async () => {
  let novelQueries = 0;
  const progress = Array.from({ length: 20 }, (_, index) => ({
    novelId: `novel-${index}`,
    currentChapter: 4,
    currentScrollPosition: 1200,
    progressPercent: 35,
    lastReadAt: new Date(),
    chaptersRead: [1, 2, 3],
  }));
  const api = route("reading/continue", {
    "@/lib/auth/session": auth,
    "@/lib/db/mongodb": connection,
    "@/lib/db/models/ReadingProgress": { find: () => query(progress) },
    "@/lib/db/models/Novel": {
      find: () => {
        novelQueries++;
        return query(
          progress.map((item) => ({
            slug: item.novelId,
            title: item.novelId,
            totalChapters: 10,
          })),
        );
      },
    },
    "@/lib/utils/fileSystem": {
      readChaptersMetadata: async () => [{ number: 4, title: "The bridge" }],
    },
  });
  const result = await (
    await api.GET(new Request("http://localhost/api/reading/continue"))
  ).json();
  assert.equal(result.data.length, 20);
  assert.equal(novelQueries, 1);
  assert.equal(result.data[0].progressPercent, 35);
  assert.equal(result.data[0].currentChapterTitle, "The bridge");
});
