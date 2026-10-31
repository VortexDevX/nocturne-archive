import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));

// Run real request handlers and real file I/O in a temporary workspace.
// Only authentication and MongoDB are replaced; existing books are never touched.
async function fixture(run) {
  const temporaryRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "nocturne-upload-"),
  );
  const records = new Map();
  const shelves = new Map();
  const state = {
    session: { userId: "upload-test-user" },
    roles: { canUpload: true },
  };
  const mocks = {
    "@/lib/auth/session": { getSession: async () => state.session },
    "@/lib/db/mongodb": async () => {},
    "@/lib/db/models/User": {
      findById: () => ({ select: async () => state.roles }),
    },
    "@/lib/db/models/Novel": {
      create: async (data) => {
        records.set(data.slug, { ...data });
        return data;
      },
      updateOne: async (filter, update) => {
        const slug = filter.$or[0].slug;
        const record = records.get(slug);
        if (record) Object.assign(record, update.$set);
        return { matchedCount: record ? 1 : 0 };
      },
    },
    "@/lib/db/models/UserLibrary": {
      findOneAndUpdate: async (filter, update) => {
        const key = `${filter.userId}:${filter.novelId}`;
        if (!shelves.has(key)) shelves.set(key, update.$setOnInsert);
        return shelves.get(key);
      },
    },
  };
  const cache = new Map();
  function load(relative) {
    const filename = path.join(sourceRoot, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiled = { exports: {} };
    cache.set(filename, compiled);
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    });
    const nativeRequire = createRequire(filename);
    runInNewContext(
      outputText,
      {
        module: compiled,
        exports: compiled.exports,
        console,
        Buffer,
        File,
        FormData,
        Date,
        URL,
        process: { cwd: () => temporaryRoot, env: {} },
        require(name) {
          if (name in mocks) return mocks[name];
          if (name.startsWith("@/")) return load(`${name.slice(2)}.ts`);
          if (name.startsWith("."))
            return load(
              path.relative(
                sourceRoot,
                path.resolve(path.dirname(filename), `${name}.ts`),
              ),
            );
          return nativeRequire(name);
        },
      },
      { filename },
    );
    return compiled.exports;
  }
  try {
    await run({ root: temporaryRoot, records, shelves, state, load });
  } finally {
    const resolved = path.resolve(temporaryRoot);
    assert.equal(
      path.dirname(resolved).toLowerCase(),
      path.resolve(os.tmpdir()).toLowerCase(),
    );
    assert.ok(path.basename(resolved).startsWith("nocturne-upload-"));
    assert.ok((await fs.stat(resolved)).isDirectory());
    await fs.rm(resolved, { recursive: true });
  }
}

const text =
  "A quiet road led through the trees. The traveler followed the river toward the distant village and paused to listen. ".repeat(
    8,
  );
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
function metadataForm(title = "Test Novel", cover = true) {
  const form = new FormData();
  form.set("title", title);
  form.set("author", "Test Author");
  form.set("genres", '["Fantasy"]');
  if (cover)
    form.set("cover", new File([png], "cover.png", { type: "image/png" }));
  return form;
}
function request(form) {
  return new Request("http://localhost/api/novels/upload", {
    method: "POST",
    body: form,
  });
}
const context = (params) => ({ params: Promise.resolve(params) });

test("Fresh installation lists empty, uploads files, and reads imported chapters and cover", async () =>
  fixture(async ({ root, records, shelves, load }) => {
    const storage = load("lib/utils/fileSystem.ts");
    assert.equal((await storage.getNovelFolders()).length, 0);
    const list = load("app/api/novels/list/route.ts");
    assert.equal((await (await list.GET()).json()).data.length, 0);
    const create = load("app/api/novels/upload/route.ts");
    const response = await create.POST(request(metadataForm()));
    assert.equal(response.status, 201);
    const {
      data: { slug },
    } = await response.json();
    assert.equal(slug, "test_novel");
    assert.equal(records.get(slug).slug, slug);
    assert.equal(records.get(slug).folderPath, "uploads/novels/test_novel");
    const directory = path.join(root, "uploads", "novels", slug);
    assert.ok((await fs.stat(path.join(directory, "chapters"))).isDirectory());
    const form = new FormData();
    form.set("slug", slug);
    form.set(
      "titles",
      JSON.stringify({
        1: "A long title with invalid filename symbols: ? < > |",
        2: "Second chapter",
      }),
    );
    form.append("chapters", new File([text], "chapter-one.txt"));
    form.append("chapters", new File([text], "chapter-two.md"));
    const upload = load("app/api/novels/upload/chapters/route.ts");
    const result = await upload.POST(request(form));
    assert.equal(result.status, 200);
    assert.equal((await result.json()).data.addedChapters, 2);
    assert.equal((await storage.readNovelMetadata(slug)).totalChapters, 2);
    assert.equal(records.get(slug).totalChapters, 2);
    assert.equal(
      shelves.get(`upload-test-user:${slug}`).status,
      "plan_to_read",
    );
    assert.equal(
      await fs.readFile(
        path.join(directory, "chapters", "chapter-1.txt"),
        "utf8",
      ),
      text,
    );
    const reader = load(
      "app/api/novels/[slug]/chapter/[chapterNumber]/route.ts",
    );
    const chapter = await (
      await reader.GET(
        new Request("http://localhost"),
        context({ slug, chapterNumber: "1" }),
      )
    ).json();
    assert.equal(chapter.data.content, text);
    assert.equal(
      chapter.data.title,
      "A long title with invalid filename symbols: ? < > |",
    );
    const cover = load("app/api/novels/cover/[slug]/[filename]/route.ts");
    const image = await cover.GET(
      new Request("http://localhost"),
      context({ slug, filename: "cover.png" }),
    );
    assert.equal(image.headers.get("Content-Type"), "image/png");
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
    assert.equal(
      (
        await cover.GET(
          new Request("http://localhost"),
          context({ slug, filename: "metadata.json" }),
        )
      ).status,
      404,
    );
    const books = (await (await list.GET()).json()).data;
    assert.equal(books[0].totalChapters, 2);
    assert.equal((await create.POST(request(metadataForm()))).status, 409);
    assert.equal(records.size, 1);
  }));

test("Existing data/novels content remains readable and receives appended chapters in place", async () =>
  fixture(async ({ root, load }) => {
    const directory = path.join(root, "data", "novels", "legacy_book");
    await fs.mkdir(path.join(directory, "chapters"), { recursive: true });
    await fs.writeFile(
      path.join(directory, "metadata.json"),
      JSON.stringify({
        title: "Legacy",
        author: "Author",
        coverImage: "cover.png",
        totalChapters: 1,
        genres: [],
        status: "ongoing",
      }),
    );
    await fs.writeFile(
      path.join(directory, "chapters.json"),
      JSON.stringify([
        { number: 1, title: "Original", file: "0001 - Original.txt" },
      ]),
    );
    await fs.writeFile(
      path.join(directory, "chapters", "0001 - Original.txt"),
      text,
    );
    await fs.writeFile(path.join(directory, "cover.png"), png);
    const storage = load("lib/utils/fileSystem.ts");
    assert.equal(await storage.getNovelDirectory("legacy_book"), directory);
    assert.equal(
      await storage.readChapterContent("legacy_book", "0001 - Original.txt"),
      text,
    );
    const form = new FormData();
    form.set("slug", "legacy_book");
    form.append("chapters", new File([text], "new.txt"));
    const response = await load("app/api/novels/upload/chapters/route.ts").POST(
      request(form),
    );
    assert.equal(response.status, 200);
    assert.equal(
      (await storage.readNovelMetadata("legacy_book")).totalChapters,
      2,
    );
    assert.equal(
      await fs.readFile(
        path.join(directory, "chapters", "0001 - Original.txt"),
        "utf8",
      ),
      text,
    );
    assert.ok(
      (
        await fs.stat(path.join(directory, "chapters", "chapter-2.txt"))
      ).isFile(),
    );
    await assert.rejects(
      fs.stat(path.join(root, "uploads", "novels", "legacy_book")),
      { code: "ENOENT" },
    );
    assert.equal(
      await storage.getCoverImagePath("legacy_book", "cover.png"),
      path.join(directory, "cover.png"),
    );
  }));

test("Combined TXT import uses safe filenames, preserved titles and sequential chapter numbers", async () =>
  fixture(async ({ load, records }) => {
    const create = load("app/api/novels/upload/route.ts");
    const created = await (
      await create.POST(request(metadataForm("Parsed Novel", false)))
    ).json();
    const slug = created.data.slug;
    const form = new FormData();
    form.set("slug", slug);
    form.set(
      "file",
      new File(
        [`Chapter 10: First\n${text}\n\nChapter 20: Second\n${text}`],
        "novel.txt",
      ),
    );
    form.set("titles", JSON.stringify({ 10: "Custom chapter title" }));
    const response = await load("app/api/novels/upload/parse/route.ts").POST(
      request(form),
    );
    assert.equal(response.status, 200);
    const result = (await response.json()).data;
    assert.deepEqual(
      result.chapters.map((chapter) => chapter.number),
      [1, 2],
    );
    assert.equal(result.chapters[0].title, "Custom chapter title");
    assert.equal(records.get(slug).totalChapters, 2);
    assert.equal(
      (await load("lib/utils/fileSystem.ts").readNovelMetadata(slug))
        .coverImage,
      "",
    );
  }));

test("Upload endpoints reject anonymous or unprivileged requests without creating files", async () =>
  fixture(async ({ load, state }) => {
    const routes = [
      "app/api/novels/upload/route.ts",
      "app/api/novels/upload/chapters/route.ts",
      "app/api/novels/upload/parse/route.ts",
      "app/api/novels/route.ts",
    ];
    for (const filename of routes) {
      state.roles = { isAdmin: false, canUpload: false };
      assert.equal(
        (await load(filename).POST(request(metadataForm()))).status,
        403,
      );
      state.session = null;
      assert.equal(
        (await load(filename).POST(request(metadataForm()))).status,
        401,
      );
      state.session = { userId: "upload-test-user" };
    }
    assert.equal(
      (await load("lib/utils/fileSystem.ts").getNovelFolders()).length,
      0,
    );
  }));

test("Invalid cover and traversal requests leave storage untouched", async () =>
  fixture(async ({ load }) => {
    const form = metadataForm("Invalid cover", false);
    form.set("cover", new File(["invalid"], "bad.svg"));
    assert.equal(
      (await load("app/api/novels/upload/route.ts").POST(request(form))).status,
      400,
    );
    const chapters = new FormData();
    chapters.set("slug", "../escape");
    chapters.append("chapters", new File([text], "chapter.txt"));
    assert.equal(
      (
        await load("app/api/novels/upload/chapters/route.ts").POST(
          request(chapters),
        )
      ).status,
      400,
    );
    const missing = new FormData();
    missing.set("slug", "missing");
    missing.append("chapters", new File([text], "chapter.txt"));
    assert.equal(
      (
        await load("app/api/novels/upload/chapters/route.ts").POST(
          request(missing),
        )
      ).status,
      404,
    );
    assert.equal(
      (await load("lib/utils/fileSystem.ts").getNovelFolders()).length,
      0,
    );
  }));
