# Nocturne Archive — Full Project Audit

> Audited: 2026-06-18 | Stack: Next.js 15 (App Router) + MongoDB/Mongoose + Zustand + PWA + Tailwind CSS

---

## Table of Contents

1. [Critical Security Issues](#1-critical-security-issues)
2. [High-Severity Issues](#2-high-severity-issues)
3. [Medium-Severity Issues](#3-medium-severity-issues)
4. [Low-Severity Issues / Code Quality](#4-low-severity-issues--code-quality)
5. [Frontend-Specific Issues](#5-frontend-specific-issues)
6. [Backend / API-Specific Issues](#6-backend--api-specific-issues)
7. [Database / Model Issues](#7-database--model-issues)
8. [Dependency & Configuration Issues](#8-dependency--configuration-issues)
9. [PWA Issues](#9-pwa-issues)
10. [Architecture & Design Issues](#10-architecture--design-issues)

---

## 1. Critical Security Issues

### 1.1 — `.env` Committed with Real Secrets
- **File**: `.env`
- **Problem**: The `.env` file is tracked in git and contains:
  - A real `JWT_SECRET` (256-bit hex key) on line 8
  - Commented-out MongoDB Atlas credentials (`[redacted MongoDB URI]`) on line 2
- **Impact**: Anyone with repo access has full JWT signing capability and can see DB credentials. Even though `.gitignore` lists `.env`, the file was already committed before the ignore rule was added, so git still tracks it.
- **Fix**: 
  1. Remove `.env` from git tracking: `git rm --cached .env`
  2. Rotate the JWT secret immediately
  3. Rotate the MongoDB Atlas password
  4. Use `.env.example` (already exists) as the template
  5. Add `.env` to `.gitignore` (already there but ineffective due to prior commit)

### 1.2 — JWT Fallback Secret
- **File**: `src/lib/auth/jwt.ts:4`
- **Problem**: `process.env.JWT_SECRET || "fallback-secret-key-change-in-production"` — if `JWT_SECRET` is missing, the app silently uses a hardcoded fallback key.
- **Impact**: In any environment where `.env` is misconfigured, all tokens are signed with a publicly known key. Attackers can forge any auth token.
- **Fix**: Throw an error on startup if `JWT_SECRET` is not set. Never use a fallback.

### 1.3 — Admin Bypass in Development Mode
- **File**: `src/middleware.ts:35,39,44,49`
- **Problem**: `const isDev = process.env.NODE_ENV === "development"` — all admin route checks are bypassed when `NODE_ENV=development`. Any user can access admin panel, user management, and upload routes in dev.
- **Impact**: In staging/preview deployments that run with `NODE_ENV=development`, every user is effectively an admin. This is also a developer convenience that becomes a production risk if misconfigured.
- **Fix**: Remove the `isDev` bypass entirely, or gate it behind a separate `ADMIN_BYPASS=true` env var that defaults to `false`.

### 1.4 — `/api/auth/check` Leaks Token and Cookies
- **File**: `src/app/api/auth/check/route.ts`
- **Problem**: The endpoint returns a `tokenPreview` (first 10 chars of the JWT) and `allCookies` array in its response body.
- **Impact**: Partial token disclosure helps attackers performing brute-force attacks on JWT. Exposing all cookies is an information leak.
- **Fix**: Remove `tokenPreview` and `allCookies` from the response. Return only `{ authenticated: boolean, user?: {...} }`.

### 1.5 — No Rate Limiting on Auth Endpoints
- **Files**: `src/app/api/auth/login/route.ts`, `src/app/api/auth/register/route.ts`
- **Problem**: Login and registration have zero rate limiting. Attackers can brute-force passwords or mass-register accounts.
- **Fix**: Implement rate limiting (e.g., `next-rate-limit`, a reverse proxy rule, or an in-memory limiter like `rate-limiter-flexible`).

### 1.6 — No CSRF Protection
- **Problem**: State-changing endpoints (login, register, password change, preference updates, bookmark CRUD, etc.) have no CSRF protection. Cookies use `sameSite: "lax"` which mitigates cross-site GET but not same-origin POST attacks from subdomains.
- **Fix**: Add CSRF tokens or use `sameSite: "strict"` for auth cookies.

---

## 2. High-Severity Issues

### 2.1 — Password Policy Too Weak
- **File**: `src/lib/auth/password.ts:16-35`
- **Problem**: Only checks `length >= 6`. No complexity requirements (uppercase, lowercase, numbers, special chars).
- **Impact**: Users can set passwords like `"aaaaaa"` which are trivially crackable.
- **Fix**: Enforce minimum complexity: at least 1 uppercase, 1 lowercase, 1 digit, min length 8.

### 2.2 — Error Responses Leak Internal Details
- **Files**: Multiple API routes
- **Problem**: Many catch blocks return `error.message` directly to the client. Examples:
  - `src/app/api/novels/upload/route.ts` — returns `error.message` in the response
  - `src/app/api/novels/upload/chapters/route.ts` — exposes `error.message`
  - Various routes expose Mongoose error details (duplicate key errors, validation errors with internal field names)
- **Impact**: Internal error messages reveal implementation details, DB structure, and can help craft targeted attacks.
- **Fix**: Log errors server-side, return generic error messages to clients. Use a centralized error handler.

### 2.3 — MongoDB `$regex` Search — NoSQL Injection / ReDoS Risk
- **File**: `src/app/api/admin/users/route.ts`
- **Problem**: Uses `{ username: { $regex: search, $options: "i" } }` with user-supplied input directly.
- **Impact**: An attacker can craft a malicious regex pattern that causes catastrophic backtracking (ReDoS), or use NoSQL operators to extract data.
- **Fix**: Sanitize/escape regex special characters before using in `$regex`, or use `$text` index with full-text search instead.

### 2.4 — Cover and Avatar Endpoints Have No Auth
- **Files**: 
  - `src/app/api/novels/cover/[slug]/[filename]/route.ts`
  - `src/app/api/user/avatar/[filename]/route.ts`
- **Problem**: These routes serve files without verifying the user is authenticated. Any unauthenticated request can enumerate and download all cover images and user avatars.
- **Impact**: Information disclosure, avatar harvesting, potential privacy violation.
- **Fix**: Add auth verification, or at minimum verify the requesting user has access to the resource.

### 2.5 — Logout Doesn't Invalidate Server-Side Session
- **File**: `src/store/authStore.ts`
- **Problem**: `logout()` only resets client-side Zustand state. It doesn't call `/api/auth/logout` to clear the HTTP-only cookie, and it doesn't add the token to a deny-list.
- **Impact**: After "logout", the cookie persists for up to 7 days. Any XSS can steal the still-valid cookie. Closing the tab doesn't destroy the session.
- **Fix**: Always call the logout API on logout to delete the cookie. Consider a token deny-list for immediate revocation.

---

## 3. Medium-Severity Issues

### 3.1 — `CustomJWTPayload` Has Index Signature `[key: string]: any`
- **File**: `src/lib/auth/jwt.ts:14`
- **Problem**: The index signature allows any arbitrary key with `any` value, completely undermining TypeScript type safety.
- **Fix**: Remove `[key: string]: any`. If extensibility is needed, use a explicit union type or generic.

### 3.2 — Duplicate Index Definitions in Types
- **Files**: Types defined in both `src/types/index.ts` and `src/lib/db/models/*.ts`
- **Problem**: `Bookmark` and `UserLibrary` have interface definitions in both `src/types/index.ts` and their respective model files (`IBookmark` in `Bookmark.ts`, `IUserLibrary` in `UserLibrary.ts`). These can drift apart.
- **Fix**: Use a single source of truth for types. Import from `@/types` in models, or vice versa.

### 3.3 — No Input Validation Library Used Consistently
- **Problem**: Some routes use Zod (it's installed), but most don't validate input at all. Routes like `/api/user/update` accept arbitrary `field` and `value` parameters.
- **Fix**: Implement Zod schemas for every API endpoint and validate before processing.

### 3.4 — `novelId` and `userId` Stored as Strings (Not ObjectId)
- **Files**: All models
- **Problem**: `novelId`, `userId`, `addedBy` are `String` type instead of `ObjectId` with ref. This means:
  - No referential integrity (Mongoose can't enforce foreign keys)
  - No population (`Mongoose populate()`) without casting
  - Manual joins required in every query
- **Fix**: Use `Schema.Types.ObjectId` with `ref` for relational fields. Alternatively, this may be intentional if supporting non-MongoDB IDs, but should be documented.

### 3.5 — No Database Indexes for Common Query Patterns
- **Problem**: `User.preferences` is queried by `userId` (has unique index — OK), but:
  - `Bookmark` by `userId + novelId + chapterNumber` has no compound index
  - `ReadingSession` has no compound index on `userId + startTime` for stats queries
- **Fix**: Add compound indexes matching hot query patterns visible in the API routes.

### 3.6 — Cookie Security — Missing `Secure` in Development
- **File**: `src/lib/auth/session.ts:21`
- **Problem**: `secure: process.env.NODE_ENV === "production"` — in development, cookies are sent over HTTP, making them interceptable on the network.
- **Impact**: Acceptable for localhost dev, but risky if dev server is exposed on a network.
- **Fix**: Document this as a known dev-mode risk, or always use `secure: true` with local HTTPS.

---

## 4. Low-Severity Issues / Code Quality

### 4.1 — `"josephin"` Typo for `"josefin"`
- **Files**: `src/store/readerStore.ts`, `src/types/index.ts:156,199`, `src/lib/db/models/UserPreferences.ts:29`
- **Problem**: The font `josephin` should likely be `josefin` (referring to "Josefin Sans" or "Josefin Slab" Google Font).
- **Impact**: If the actual font import uses the correct spelling, this enum value will never match. If the import is also misspelled, the font simply won't load.
- **Fix**: Rename all instances of `"josephin"` to `"josefin"` and update the font import.

### 4.2 — Duplicate `countWords` Function
- **Files**: `src/lib/utils/index.ts:66-68`, `src/lib/utils/fileSystem.ts:136-138`
- **Problem**: Two identical implementations of `countWords`.
- **Fix**: Remove one, import from the canonical location.

### 4.3 — Duplicate `generateSlug` / `slugify` Functions
- **Files**: `src/lib/utils/fileSystem.ts:126-131` (generates `_`-separated slugs) vs `src/lib/utils/index.ts:48-55` (`slugify` generates `-`-separated slugs)
- **Problem**: Two different slug generation strategies exist. Novel folders use `_`, URL slugs likely use `-`.
- **Impact**: Confusing and error-prone. If a developer uses the wrong function, slugs won't match.
- **Fix**: Consolidate into a single function or clearly document when each is appropriate.

### 4.4 — Duplicate Modal Body Scroll Lock
- **Files**: `src/components/ui/Modal.tsx:22-31`, `src/components/reader/BookmarkModal.tsx:41-50`
- **Problem**: Both components independently manage `document.body.style.overflow`. If both are open simultaneously (unlikely but possible), they can conflict.
- **Fix**: Use a shared hook like `useScrollLock` or a library that handles this.

### 4.5 — Inconsistent Error Handling Pattern
- **Problem**: Some routes return `{ success: false, message: "..." }`, others return `{ success: false, error: "..." }`. The `ApiResponse<T>` type in `types/index.ts` has both `message` and `error` as optional fields.
- **Fix**: Standardize on one pattern: always use `error` for error details, `message` for success messages.

### 4.6 — `console.error` in Production Code
- **Problem**: Multiple API routes and utilities use `console.error` for error logging. No structured logging library is used.
- **Impact**: In production, console output may be lost, and there's no log levels, correlation IDs, or structured format.
- **Fix**: Use a logging library (e.g., `pino`, `winston`) or at minimum centralize error logging.

### 4.7 — `onKeyPress` is Deprecated
- **File**: `src/components/reader/BookmarkModal.tsx:206`
- **Problem**: React's `onKeyPress` is deprecated in favor of `onKeyDown` or `onKeyUp`.
- **Fix**: Replace `onKeyPress` with `onKeyDown`.

### 4.8 — Missing `aria-label` or Accessible Labels
- **Problem**: Several interactive elements lack accessible labels:
  - `BookmarkModal` tag input has no `<label>` element associated
  - `Input` component uses `label` as a sibling `<p>`, not a proper `<label htmlFor>`
- **Fix**: Add `htmlFor`/`id` linking, ensure all form controls have accessible labels.

---

## 5. Frontend-Specific Issues

### 5.1 — Monolithic Page Components
- **Files**: 
  - `src/app/(main)/reader/[novelId]/[chapterId]/page.tsx` (~57KB)
  - `src/app/(main)/library/page.tsx` (~41KB)
- **Problem**: These are enormous single client components. No code-splitting, no sub-components extracted, no custom hooks.
- **Impact**: Poor maintainability, difficult to test, all state mixed together, huge bundle chunk.
- **Fix**: Extract into smaller components and custom hooks. Consider route-level code splitting.

### 5.2 — `next-themes` Installed but Not Used
- **File**: `package.json:39`
- **Problem**: `next-themes` is a dependency but the app uses a custom `ThemeProvider` (`src/components/providers/ThemeProvider.tsx`).
- **Impact**: Dead dependency increasing bundle size and maintenance burden.
- **Fix**: Remove `next-themes` from dependencies, or adopt it instead of the custom provider.

### 5.3 — Multiple Toast Libraries Installed
- **File**: `package.json`
- **Problem**: Both `react-hot-toast` (used) and `sonner` (unused) are installed.
- **Fix**: Remove the unused one (`sonner`).

### 5.4 — `userScalable: false` in Viewport Config
- **File**: `src/app/layout.tsx`
- **Problem**: `userScalable: false` prevents zooming. This is an accessibility violation (WCAG 1.4.4).
- **Impact**: Users with low vision cannot zoom in to read content — critical for a reader app.
- **Fix**: Set `userScalable: true` or remove the restriction entirely.

### 5.5 — Multiple Fonts Loaded in Layout but Only Some Used
- **File**: `src/app/layout.tsx`
- **Problem**: 4+ Google Fonts are imported (`next/font/google`) but some may not be actively used in the app, adding page weight.
- **Fix**: Only import fonts that are actually referenced in CSS/Tailwind config.

### 5.6 — `react-hook-form` + `@hookform/resolvers` Installed but Unused
- **File**: `package.json`
- **Problem**: These packages are installed but no form in the codebase uses `useForm` from react-hook-form. All forms use manual `useState` handling.
- **Fix**: Either adopt react-hook-form in forms or remove the dependency.

### 5.7 — `react-window` Installed but Likely Unused
- **Problem**: `react-window` (virtualized list library) is in `package.json` but there's no visible usage for virtualized rendering. The library page renders all novels in a regular list.
- **Fix**: Remove if unused, or integrate if large lists need virtualization.

### 5.8 — `@radix-ui/*` Components Partially Used
- **Problem**: Three Radix UI packages are installed (`dialog`, `dropdown-menu`, `slider`) but custom Modal/Dropdown components are also hand-built. Inconsistent UI primitive strategy.
- **Fix**: Standardize: either use Radix for all interactive primitives or build custom for all.

---

## 6. Backend / API-Specific Issues

### 6.1 — `/api/user/update` Accepts Arbitrary Field Updates
- **File**: `src/app/api/user/update/route.ts`
- **Problem**: The route accepts `{ field, value }` from the client body and updates whatever field is specified. There may be a whitelist check, but the pattern itself is dangerous.
- **Impact**: If not properly whitelisted, a user could update `isAdmin`, `canUpload`, or other protected fields.
- **Fix**: Use explicit route handlers per field, or a strict enum/whitelist of allowed fields.

### 6.2 — No Pagination on Novel List Endpoint
- **File**: `src/app/api/novels/route.ts`
- **Problem**: `GET /api/novels` returns all novels without pagination.
- **Impact**: With large datasets, this will return massive payloads and cause OOM or timeout.
- **Fix**: Implement cursor-based or offset pagination with limit/default parameters.

### 6.3 — File Upload Size Validation May Be Inconsistent
- **Problem**: `MAX_FILE_SIZE` is defined in `.env` as `10485760` (10MB), but it's unclear if all upload routes respect this limit. Next.js also has its own body size limits.
- **Fix**: Centralize file size validation and ensure all upload paths enforce the limit at both the middleware and route level.

### 6.4 — Upload Route Missing Auth Check for `canUpload`
- **File**: `src/app/api/novels/upload/route.ts`
- **Problem**: While middleware checks `canUpload` for page access, the API route itself may not re-verify this permission. A user could call the API directly without `canUpload`.
- **Fix**: Always re-verify permissions in the API handler, not just in middleware.

### 6.5 — No Atomic Operations for Reading Progress
- **File**: `src/app/api/reading/progress/route.ts`
- **Problem**: Reading progress uses `findOne` + `save` pattern instead of `findOneAndUpdate` with atomic operators.
- **Impact**: Race conditions if two tabs/devices update progress simultaneously. Last-write-wins can lose progress.
- **Fix**: Use `findOneAndUpdate` with `$set` and `$addToSet` for atomic updates.

### 6.6 — Novel Delete Doesn't Clean Up Related Data
- **Problem**: Deleting a novel doesn't cascade-delete related: Chapters, Bookmarks, ReadingProgress, ReadingSessions, UserLibrary entries.
- **Impact**: Orphaned data accumulates, causing incorrect stats and broken library entries.
- **Fix**: Implement cascade delete or soft-delete with cleanup job.

---

## 7. Database / Model Issues

### 7.1 — String IDs Instead of ObjectId References
- **Files**: All models
- **Problem**: `novelId`, `userId`, `addedBy` are plain `String` fields. No Mongoose `ref`population, no referential integrity.
- **Impact**: 
  - Deleting a user leaves all their novels/bookmarks/progress with dangling references
  - No ability to use `populate()` for joins
  - Manual `$lookup` aggregations required for any joined query
- **Fix**: Migrate to `Schema.Types.ObjectId` with `ref` properties.

### 7.2 — `ReadingSession.endTime` Not Enforced
- **Problem**: `endTime` is optional and there's no mechanism to close sessions. Sessions may stay "open" indefinitely.
- **Fix**: Add a TTL index or a cleanup cron that auto-closes sessions after a timeout.

### 7.3 — No Data Validation for `chaptersRead` Array in ReadingProgress
- **Problem**: `chaptersRead: [Number]` has no constraints. A client could push arbitrary numbers or duplicates.
- **Fix**: Add `$addToSet` semantics (use `$each` with `$addToSet`) and validate that chapter numbers exist.

### 7.4 — Missing `__v` (Version Key) Handling
- **Problem**: No explicit handling of Mongoose's `__v` field in API responses. It leaks to clients.
- **Fix**: Exclude `__v` from JSON serialization or strip it in a global middleware.

### 7.5 — `UserPreferences._id` Type Mismatch
- **File**: `src/types/index.ts:150` — `UserPreferences._id: string` vs `src/lib/db/models/UserPreferences.ts:9` — `userId` is `unique: true` but `_id` is auto-generated
- **Problem**: The `userId` field acts as the logical primary key, but Mongoose creates a separate `_id`. Two keys for one record.
- **Fix**: Consider using `userId` as `_id` via a custom `_id` value, or at minimum document the distinction.

---

## 8. Dependency & Configuration Issues

### 8.1 — Duplicate PWA Packages
- **File**: `package.json`
- **Problem**: Both `next-pwa` (v5, unmaintained) and `@ducanh2912/next-pwa` (v10, actively maintained) are installed.
- **Impact**: Conflicting PWA configurations, potential build errors, unnecessary bundle size.
- **Fix**: Remove `next-pwa` (v5). Keep only `@ducanh2912/next-pwa`.

### 8.2 — `fs` npm Package Installed
- **File**: `package.json:30`
- **Problem**: The `fs` package (`^0.0.1-security`) is a deprecated stub that does nothing. Node.js's built-in `fs` module is what the code actually uses (via `import fs from "fs/promises"`).
- **Impact**: Misleading dependency, potential confusion.
- **Fix**: Remove `fs` from package.json.

### 8.3 — `jsonwebtoken` Installed but Unused
- **File**: `package.json:33`
- **Problem**: The codebase uses `jose` for all JWT operations. `jsonwebtoken` is never imported.
- **Fix**: Remove `jsonwebtoken` and `@types/jsonwebtoken`.

### 8.4 — `localforage` and `idb`/`dexie` — Competing IndexedDB Solutions
- **Files**: `package.json`
- **Problem**: Three IndexedDB wrappers are installed:
  - `localforage` — used in `src/lib/storage/offline.ts`
  - `idb` — possibly used elsewhere
  - `dexie` — package.json dependency
- **Impact**: Three different IndexedDB abstractions means no unified offline data layer, potential data conflicts.
- **Fix**: Standardize on one library (recommend `dexie` for its query power, or `idb` for minimalism).

### 8.5 — `multer` Installed but Next.js Has Its Own Body Parsing
- **File**: `package.json:36`
- **Problem**: `multer` is a Express middleware. In Next.js App Router, file uploads are handled via `request.formData()`. `multer` is not usable in this context.
- **Fix**: Remove `multer` and `@types/multer`. Use Next.js native `FormData` handling.

### 8.6 — `date-fns` Installed but Custom `formatRelativeTime` Used
- **File**: `src/lib/utils/index.ts:15-27`
- **Problem**: `date-fns` is installed but `formatRelativeTime` is implemented manually.
- **Fix**: Use `date-fns` `formatDistanceToNow` or remove `date-fns` if not needed elsewhere.

### 8.7 — `vaul` Installed (Drawer Component)
- **Problem**: `vaul` is a drawer component library. Unknown if it's actually used anywhere in the codebase.
- **Fix**: Verify usage. Remove if unused.

### 8.8 — `class-variance-authority` Installed
- **Problem**: CVA is installed but the `Button` component uses a hardcoded variants object, not CVA.
- **Fix**: Either adopt CVA for component variants or remove the dependency.

### 8.9 — Invalid `package.json` Fields
- **File**: `package.json:5-8`
- **Problem**: `"type": "module"`, `"module": "esnext"`, `"moduleResolution": "node"`, `"esModuleInterop": true`, `"allowSyntheticDefaultImports": true` — these are TypeScript compiler options, not valid `package.json` fields. They belong in `tsconfig.json`.
- **Impact**: These fields are ignored by npm/pnpm/yarn. Could be confusing.
- **Fix**: Remove these fields from `package.json`; they're already likely set in `tsconfig.json`.

---

## 9. PWA Issues

### 9.1 — Stale Service Worker Files in `public/`
- **Files**: `public/sw.js`, `public/workbox-f1770938.js`
- **Problem**: Built service worker files are checked into `public/`. These are build artifacts that should be regenerated each build, not committed.
- **Impact**: Stale service workers may cache old content and prevent users from getting updates.
- **Fix**: Add `public/sw.js` and `public/workbox-*.js` to `.gitignore`. Let the PWA plugin generate them at build time.

### 9.2 — PWA Manifest May Be Static
- **File**: `public/manifest.json`
- **Problem**: If the manifest is a static file rather than generated by the PWA plugin, it may not reflect the current app configuration.
- **Fix**: Ensure manifest is generated or at minimum reviewed for correctness.

---

## 10. Architecture & Design Issues

### 10.1 — Dual Storage Architecture (Filesystem + MongoDB)
- **Problem**: Novels are stored as files on disk (`data/novels/{slug}/chapters/*.txt`) AND metadata is stored in MongoDB. Chapters have records in both MongoDB (`Chapter` model) and the filesystem.
- **Impact**: 
  - Data inconsistency risk: DB says 15 chapters, filesystem has 12
  - No transactional integrity between FS and DB
  - Backups must cover both systems
  - Scaling horizontally requires shared filesystem (NFS/EFS)
- **Fix**: Choose one storage strategy: either store chapter content in MongoDB (GridFS or text fields), or store all metadata in the filesystem (metadata.json + chapters.json per novel) and use MongoDB only for user data.

### 10.2 — No API Response Standardization
- **Problem**: API responses use inconsistent shapes:
  - Sometimes `{ success, data }` 
  - Sometimes `{ success, message }`
  - Sometimes `{ success, error }`
  - Sometimes `{ success, novel }` (entity-specific key)
- **Fix**: Standardize on `{ success: boolean, data?: T, error?: { code: string, message: string } }`.

### 10.3 — No API Versioning
- **Problem**: All API routes are at `/api/...` with no version prefix.
- **Impact**: Breaking changes require all clients to update simultaneously.
- **Fix**: Add `/api/v1/...` prefix.

### 10.4 — No Request ID / Correlation for Debugging
- **Problem**: No request tracing across the stack. When an error occurs, there's no way to correlate logs from different services.
- **Fix**: Add a request ID middleware that generates a UUID per request and includes it in logs and error responses.

### 10.5 — Theme System: Custom Provider Instead of `next-themes`
- **File**: `src/components/providers/ThemeProvider.tsx`
- **Problem**: A custom theme provider is built from scratch despite `next-themes` being installed. The custom provider likely doesn't handle SSR flash (FOUC) as well as `next-themes`.
- **Impact**: Potential flash of unstyled content on page load, and duplicated effort.
- **Fix**: Migrate to `next-themes` or remove the dependency.

### 10.6 — `epub2` Type Declaration With `[key: string]: any`
- **File**: `src/types/epub2.d.ts:8,16`
- **Problem**: Index signatures with `any` undermine type safety for the entire `epub2` module.
- **Fix**: Define explicit interface members instead of index signatures.

### 10.7 — No Tests
- **Problem**: No test files, no test framework, no test scripts in `package.json`.
- **Impact**: Zero regression protection. Any change could break existing functionality silently.
- **Fix**: Add a test framework (Jest + React Testing Library for frontend, Vitest or Mocha for backend). Start with critical path tests (auth, reading progress, novel CRUD).

### 10.8 — No CI/CD Pipeline
- **Problem**: No GitHub Actions, no CI config, no automated linting/build/test on push.
- **Fix**: Add a GitHub Actions workflow that runs `npm run lint`, `npm run build`, and tests on every PR.

### 10.9 — `data/novels/` Directory Contains User Content
- **Problem**: Novel content files are stored in `data/novels/` relative to `process.cwd()`. This means:
  - Content lives inside the project directory
  - It may be included in Docker builds or deployments
  - Not suitable for containerized deployments (ephemeral filesystem)
- **Fix**: Use a configurable content directory outside the project tree, or use cloud storage (S3, GCS).

### 10.10 — `UPLOAD_DIR=./public/uploads`
- **File**: `.env:14`
- **Problem**: Uploads are stored in `public/uploads`, making them directly accessible via URL with no auth. Any uploaded file (covers, avatars) is publicly accessible.
- **Impact**: Privacy concern for user avatars. No access control on uploaded content.
- **Fix**: Store uploads outside `public/` and serve them via authenticated API routes.

---

## Summary Statistics

| Category | Count |
|---|---|
| Critical Security | 6 |
| High Severity | 5 |
| Medium Severity | 6 |
| Low Severity / Code Quality | 8 |
| Frontend-Specific | 8 |
| Backend / API-Specific | 6 |
| Database / Model | 5 |
| Dependency & Config | 9 |
| PWA | 2 |
| Architecture & Design | 10 |
| **Total** | **65** |

---

## Priority Remediation Order

1. **Rotate committed secrets** (1.1) — Do this immediately
2. **Remove JWT fallback secret** (1.2) — Deploy before any production use
3. **Remove admin dev bypass** (1.3) — Security gate bypass
4. **Add rate limiting** (1.5) — Brute-force protection
5. **Fix `/api/auth/check` information leak** (1.4)
6. **Whitelist `/api/user/update` fields** (6.1)
7. **Sanitize regex input** (2.3)
8. **Remove unused dependencies** (8.1–8.8) — Reduces attack surface
9. **Standardize error responses** (2.2, 10.2)
10. **Add tests** (10.7) — Foundation for safe refactoring
