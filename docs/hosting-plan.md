# Nocturne Archive Hosting Plan

## Chosen stack

| Part | Service |
| --- | --- |
| Code and version history | GitHub |
| Next.js app and API | Vercel |
| Users, metadata, progress | MongoDB Atlas |
| Chapters, covers, avatars | Cloudflare R2 |
| Existing VPS | Backups and export jobs later |

The application currently stores chapters, covers, and avatars on the local filesystem. Vercel deployments cannot be treated as durable local storage, so these files must move to R2 before production deployment.

The VPS has 2 CPUs, 1 GB RAM, 48 GB disk, and no swap. It has enough disk for the current library, but limited memory for another Next.js service. Keep it out of the main request path.

## Target architecture

MongoDB stores:

- users
- user preferences
- novels
- chapter index records
- reading progress
- bookmarks
- user libraries
- reading sessions

R2 stores:

```text
novels/<slug>/chapters/000001.txt
novels/<slug>/chapters/000002.txt
novels/<slug>/cover.webp
avatars/<user-id>/<uuid>.webp
imports/<user-id>/<uuid>.txt
```

Keep the R2 bucket private. Vercel API routes check the user session before reading protected objects.

## R2 setup

Create one bucket, for example:

```text
nocturne-archive-prod
```

Create a bucket-scoped R2 API token:

- permission: `Object Read & Write`
- scope: only the production bucket
- save the Access Key ID and Secret Access Key immediately

Also record the Cloudflare Account ID and bucket jurisdiction, if one was selected.

The S3 endpoint is:

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

Configure CORS for browser uploads. Start with localhost and the eventual Vercel/custom domains:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://YOUR-VERCEL-DOMAIN.vercel.app",
      "https://YOUR-CUSTOM-DOMAIN"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Do not add deletion or expiration rules for `novels/` or `avatars/`.

## MongoDB changes

Add a `Chapter` model:

```ts
{
  novelSlug: string,
  number: number,
  title: string,
  objectKey: string,
  wordCount: number,
  createdAt: Date
}
```

Indexes:

```text
{ novelSlug: 1, number: 1 } unique
{ novelSlug: 1 }
```

Add `coverObjectKey` to novels. Keep `folderPath` temporarily for migration compatibility, then stop using it in production.

Production should no longer depend on:

- `metadata.json`
- `chapters.json`
- `uploads/novels`
- `data/novels`
- runtime directory scanning

## Code migration

Install the R2-compatible S3 client:

```powershell
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner --ignore-scripts
```

Create:

```text
src/lib/storage/r2.ts
src/lib/storage/keys.ts
```

The adapter should expose `putObject`, `getObject`, `headObject`, `deleteObject`, and `createUploadUrl`. Credentials remain server-side.

Add environment variables:

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=nocturne-archive-prod
```

Change novel, chapter, cover, and avatar routes to use Atlas and R2. Keep filesystem fallback during migration. Remove fallback only after production verification.

## Upload flow

Vercel Function request and response bodies have a 4.5 MB limit. Existing batch upload can exceed this, so files should upload directly from the browser to R2 through short-lived presigned URLs.

Flow:

1. `POST /api/novels/upload/prepare` validates admin/upload permission and reserves the novel slug.
2. `POST /api/novels/upload/presign` returns a short-lived R2 `PUT` URL for each approved object.
3. Browser uploads directly to R2 with controlled concurrency, around 4–8 files at a time.
4. `POST /api/novels/upload/complete` verifies every object with `HeadObject`, inserts chapter records, updates `totalChapters`, and marks the novel ready.

Use upload states:

```text
draft -> uploading -> ready
                  -> failed
```

Only `ready` novels appear in normal library pages.

For large TXT/MD imports, parse chapters in the browser, then upload individual chapter files. This avoids sending a large body through Vercel.

## Read flow

```text
Reader
  -> GET /api/novels/<slug>/chapter/<number>
  -> session check
  -> chapter record from Atlas
  -> object read from R2
  -> JSON response
  -> IndexedDB offline cache
```

Chapter bodies are currently small enough for the API response. Keep chapter objects private and proxy them through authenticated API routes. Covers and avatars can also use authenticated API proxy routes with long cache headers.

## Existing data migration

Current local data contains approximately 3,669 chapter files and 43 MB of novel data across two novel folders. The largest chapter is approximately 30 KB.

Create:

```text
scripts/migrate-filesystem-to-r2.ts
```

The script must support:

```powershell
npm run migrate:r2 -- --dry-run
npm run migrate:r2
npm run migrate:r2 -- --verify
```

For every novel:

1. Read `metadata.json` and `chapters.json`.
2. Match chapter records to local files.
3. Upload chapter files and cover to R2.
4. Upsert the novel and chapter records in Atlas.
5. Verify R2 object sizes.
6. Write a migration report.
7. Skip already verified objects safely.

Keep local folders until migration verification and production testing finish.

## Atlas setup

Create an Atlas project, free cluster, database named `nocturne`, and a dedicated database user with a strong generated password.

Set:

```env
MONGODB_URI=mongodb+srv://...
```

Back up existing MongoDB data before migration. Verify collection counts and the admin account after restore.

Atlas free storage is suitable for metadata and user state while chapter bodies remain in R2.

## Vercel setup

Import the GitHub repository into Vercel.

Use:

- framework: Next.js
- root directory: repository root
- install command: `npm install`
- build command: `npm run build`
- production branch: `main` or the repository default branch

Production environment variables:

```env
MONGODB_URI=
JWT_SECRET=
NEXT_PUBLIC_APP_URL=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=nocturne-archive-prod
```

Set separate Preview and Production values. Preview uploads should eventually use a separate Atlas database and R2 bucket.

## Deployment order

1. Create the R2 bucket, token, and CORS rule.
2. Create Atlas cluster and database user.
3. Back up current MongoDB.
4. Add R2 adapter and Chapter model.
5. Add R2-backed reads with filesystem fallback.
6. Add migration script and run dry-run.
7. Migrate and verify existing files.
8. Change upload UI and routes to direct R2 uploads.
9. Run project checks:

   ```powershell
   npx tsc --noEmit
   npm run lint
   npm run build
   ```

10. Push the implementation to GitHub.
11. Deploy a Vercel Preview.
12. Test the complete workflow.
13. Deploy Production.
14. Keep local/VPS backups.
15. Remove filesystem fallback in a later cleanup release.

## Verification checklist

Test at 100% zoom on mobile and desktop:

- register, login, logout
- JWT cookie persistence
- admin and upload permissions
- novel creation
- cover upload
- one-chapter upload
- large multi-chapter upload
- interrupted upload retry
- novel list and detail pages
- reader navigation
- continuous and paged modes
- reading progress and continue cards
- bookmarks
- avatar upload
- offline chapter download and IndexedDB reading
- service worker cache rules

Data checks:

```text
Mongo novel count = expected
Mongo chapter count = expected
R2 chapter object count = expected
Every chapter record points to an existing R2 object
Private chapter objects are not publicly readable
```

## Recovery plan

If Vercel fails, roll back the deployment. Atlas and R2 remain unchanged.

If migration stops, rerun the idempotent migration. Existing verified objects are skipped and local files remain available.

Use the VPS later for scheduled encrypted Atlas exports and R2 inventory manifests. Do not put the main app on the current 1 GB VPS unless its existing Node services are removed or the server is upgraded.

## First information needed from R2

After creating the bucket, record:

```text
Bucket name
Account ID
Jurisdiction, if any
```

Keep the Secret Access Key private. Store it only in local environment variables and Vercel project secrets.
