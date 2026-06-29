# Archive — your fits (cloud-synced)

A private, personal outfit photo archive that syncs across every device you log into. Upload photos of your fits, browse them on an infinite-scroll canvas styled like a contact sheet — no tags, no social features, no one else can see it but you.

This is the cloud version: same look as the single-device prototype, but backed by Supabase so your photos follow you from phone to laptop.

---

## 1. Install dependencies

```bash
npm install
```

## 2. Set up Supabase (free)

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Go to **SQL Editor → New query**, paste in the entire contents of `supabase/schema.sql`, and run it. This creates:
   - the `photos` table (just `id`, `user_id`, `storage_path`, `created_at`)
   - a private storage bucket called `outfits`
   - row-level security so only you can ever see or touch your own photos and files
3. Go to **Project Settings → API**. You need two values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

That's it — no other API keys needed. There's no AI in this one, so no Anthropic key required either.

## 3. Set environment variables

```bash
cp .env.example .env.local
```

Fill in the two values:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and start uploading. Log in with the same account on your phone's browser (once deployed — see below) and the same photos show up there too.

## 5. Deploy (free) so your phone can reach it

Push this to a GitHub repo, then import it at [vercel.com](https://vercel.com). Add the same 2 environment variables in Vercel's project settings. Once deployed, open the Vercel URL on your phone and log in — same archive, synced.

If you want, add it to your phone's home screen (Safari: Share → Add to Home Screen; Chrome on Android: menu → Add to Home screen) so it opens like a regular app.

---

## How it's different from the single-file version

The single-file prototype stored photos in your browser's local storage (IndexedDB) — fast, free, zero setup, but trapped on one device. This version moves photo files into Supabase Storage and metadata into a Postgres table, so:

- Photos are private to your account (row-level security enforced at the database and storage level, not just in the app's UI)
- Photo URLs are signed and expire after an hour, so the storage bucket can stay private rather than public
- Deleting a photo removes both the database row and the underlying file

## Project structure

```
app/
  page.tsx                  → the canvas, upload, lightbox — main UI
  login/page.tsx            → auth (signup/login)
  api/
    photos/route.ts          → list your photos (GET), upload a new one (POST)
    photos/[id]/route.ts     → delete a single photo
components/
  ui/photo-card.tsx          → the mat-board photo card with tilt + date stamp
lib/
  supabase/client.ts          → browser Supabase client
  supabase/server.ts          → server Supabase client
  types.ts                    → shared TypeScript types
supabase/
  schema.sql                  → run this once in Supabase SQL Editor
middleware.ts                  → protects the home page, refreshes auth session
```

## A note on cost

Supabase's free tier includes 1GB of file storage and 5GB of bandwidth a month — at typical phone-photo sizes (2-4MB each), that's roughly 250-500 outfit photos before you'd need to either compress images on upload or move to a paid tier (which starts at $25/month for substantially more room). For a personal archive, the free tier should last a long while.
