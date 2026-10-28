# Nocturne Agent Instructions

## Package Manager

- Use npm and committed `package-lock.json`: `npm install`, `npm run dev`, `npm run build`, `npm run lint`.
- Do not mix npm with yarn, pnpm, or bun. Always use `--ignore-scripts` if running package maintenance commands manually.

## File-Scoped Commands

| Task             | Command                                      |
| ---------------- | -------------------------------------------- |
| Lint file        | `npx eslint path/to/file.tsx`                |
| Typecheck        | `npx tsc --noEmit`                           |
| Production build | `npm run build`                              |
| Dev server       | `npm run dev`                                |

## Architecture and Data Contracts

- Dual-layer storage: MongoDB stores relational metadata (`users`, `userpreferences`, `novels`, `readingprogresses`, `bookmarks`); local filesystem (`uploads/`) stores novel raw content, chapter files (`uploads/novels/<slug>/chapters/chapter-<num>.txt`), and cover images (`uploads/novels/<slug>/cover.*`).
- Never delete or bypass local filesystem paths without verifying existence via `fs.stat` / `fs.access`.
- Authentication uses HTTP-only JWT cookies (`nocturne-token`) signed using `jose` with `HS256`. Never expose JWT tokens, raw authorization headers, or sensitive user fields (`password`) in client payloads or server logs.
- Strict role checking (`isAdmin`, `canUpload`) is required on all administrative routes (`/admin`, `/api/admin/*`) and novel upload endpoints (`/admin/upload`, `/api/novels/upload/*`).
- Reading progress tracking synchronizes `currentChapter`, `currentScrollPosition`, `progressPercent`, and `lastReadAt` between reader view and library/continue cards.
- Offline reader cache uses IndexedDB (`idb`) and Service Worker (`@ducanh2912/next-pwa`). Never cache authenticated, dynamic API routes (`/api/auth/*`, `/api/admin/*`, `/api/user/*`, `/api/library/*`). Cache only immutable static novel assets (`/api/novels/cover/*`, `/api/user/avatar/*`).

## Verification

- Web gate: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Production builds must compile 100% clean with zero TypeScript errors, zero ESLint warnings, and zero Edge Runtime warnings.
- UI/Reader changes must be verified at 100% zoom across mobile and desktop breakpoints (reading themes, font sizes, continuous vs paged mode, chapter navigation, and library shelves).

## Git

- Only commit or push changes when explicitly requested.
- Before committing, inspect the exact diff and perform a secret scan.
- Write concise, direct commit messages that clearly describe what changed.
- Keep commit subjects natural and human-readable.
- Do not use conventional commit prefixes such as `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `perf:`, or `test:`.
- Avoid vague or generic messages such as `changes`, `updates`, `fix stuff`, or `AI changes`.

## Commit Attribution

- AI agents MUST NOT add `Co-Authored-By` trailers to commits.
- AI agents MUST NOT include their model name, agent name, vendor name, or other AI attribution in commit messages.
- All commits MUST use the user's existing Git author and committer identity.
- NEVER modify `user.name` or `user.email`.
- Do not add `Co-authored-by`, `Co-Authored-By`, or any equivalent attribution trailer unless explicitly requested by the user.
- Before committing, verify that the commit message contains no AI attribution trailer.

## Commit Message Style

- Write commit messages as a developer would naturally describe the change.
- Use a single concise subject line by default.
- Describe the primary user-facing or code-level change directly.
- Do not use conventional commit prefixes such as `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `perf:`, or `test:`.
- Do not automatically add bullet points, summaries, implementation details, or a commit body.
- Add a commit body only when the change is complex enough that the subject alone cannot reasonably explain it.
- Keep the subject specific, concise, and natural.
- Avoid vague, generic, robotic, or overly polished wording.
- Do not mention AI assistance, prompts, agents, models, or automated generation unless explicitly requested.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
