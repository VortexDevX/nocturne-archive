# Nocturne Archive

<img src="public/brand/nocturne-mark-64.png" alt="Nocturne" width="64" />

A personal web novel library and reader built with Next.js 15, React 19,
TypeScript, and Tailwind CSS.

- Import TXT/MD chapters or split a complete book in the browser.
- Organize shelves, save passages, and sync reading progress.
- Adjust typography, use four themes, turn pages, and search chapter text.
- Download chapters for offline reading through IndexedDB.
- Store accounts and chapter indexes in MongoDB Atlas and private files in R2.

## Local development

Use Node.js 24 and npm with the committed lockfile.

```powershell
npm ci --ignore-scripts
Copy-Item .env.example .env
# Fill in database, JWT, and R2 values before starting.
npm run dev
```

Open `http://localhost:3000`. Never commit `.env` or credentials.
Use `STORAGE_BACKEND=local` for filesystem-only development. For Atlas/R2, set
`STORAGE_BACKEND=r2` and `FILESYSTEM_FALLBACK=false`. An existing administrator
grants upload permission through Admin.

## Checks

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

## Deploy to Vercel

1. Import this repository. Select Next.js, `master` as production branch, Node.js
   24, install command `npm ci`, and build command `npm run build`.
2. Add variables from `.env.example` to Vercel. Use the Atlas URI,
   `MONGODB_DB_NAME=nocturne`, `STORAGE_BACKEND=r2`, and
   `FILESYSTEM_FALLBACK=false`. Keep secrets server-side. Vercel sets `NODE_ENV`.
3. Allow the deployment through Atlas Network Access. Use a database user scoped
   to the app database. Keep the R2 bucket private.
4. Add your exact app origin to R2 CORS. Example:

   ```json
   [
     {
       "AllowedOrigins": ["https://nocturne.vxdev.in", "http://localhost:3000"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["Content-Type", "If-None-Match"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

5. Set `NEXT_PUBLIC_APP_URL` to the actual HTTPS app URL. Redeploy after changing
   environment variables. Add custom-domain origins to CORS when using them.
6. Test login, migrated books, chapter navigation, progress, bookmarks, upload
   retries, avatars, and offline downloads on mobile and desktop.

Files upload directly to R2 through short-lived signed URLs. The API verifies
objects before publication. Each chapter/image is limited to 3 MiB. Production
on Vercel does not use local files or runtime directory scanning.

Use a separate Atlas database and R2 bucket for writable Preview deployments.
Local hosting notes, migration scripts, backups, reports, and original artwork
are intentionally excluded from Git and deployment uploads.
