# Setup Guide

Complete step-by-step guide to get Music Intelligence running.

## 1. Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (free tier works)

## 2. Supabase Project Setup

### Create Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new organization (if needed)
4. Create a new project:
   - Choose a project name
   - Set a database password (save this!)
   - Select a region
   - Wait for project to provision (~2 minutes)

### Get API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (under "Project API keys")
   - **anon public** key (under "Project API keys")

### Set Up Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase/schema.sql` from this repo
4. Paste into the SQL editor
5. Click "Run" or press Cmd/Ctrl + Enter
6. Verify success: Go to **Database** → **Tables** and confirm you see:
   - songs
   - song_versions
   - listening_sessions
   - listening_events
   - timeline_stats
   - engagement_fingerprints

### Set Up Storage Bucket

1. In Supabase Dashboard, go to **Storage**
2. Click "Create a new bucket"
3. Name it: `audio`
4. Set to **Public bucket** (check the box)
   - For production, you can use signed URLs instead
5. Click "Create bucket"

### Configure Storage Policies (if using public bucket)

1. Click on the `audio` bucket
2. Go to "Policies" tab
3. Click "New Policy"
4. Create a policy for SELECT (read):
   - Policy name: `Public read access`
   - Check: `SELECT`
   - Target roles: `public`
   - Policy definition: `true`
   - Click "Save"
5. Create a policy for INSERT (upload):
   - Policy name: `Public upload access`
   - Check: `INSERT`
   - Target roles: `public`
   - Policy definition: `true`
   - Click "Save"

## 3. Local Development Setup

### Clone and Install

```bash
# If you haven't already cloned the repo
git clone <your-repo-url>
cd music-intelligence

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace with your actual values from Step 2.

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 4. Test the Application

### Upload a Test Track

1. Go to [http://localhost:3000](http://localhost:3000)
2. Fill in:
   - Song Title: "Test Track"
   - Version Label: "v1"
3. Either:
   - Upload an audio file (MP3, WAV, etc.)
   - OR paste a public audio URL
4. Click "Upload & Create Listen Link"
5. You should see the song appear in the "Uploaded Tracks" section

### Test Listening Experience

1. Click the "Listen" button next to your uploaded track
2. On the listen page:
   - Click Play
   - Click emoji reactions while listening
   - Try seeking (drag the timeline)
   - Click Skip
3. All interactions are being tracked!

### View Analytics

1. Go to [http://localhost:3000/admin](http://localhost:3000/admin)
2. Select your track
3. You should see:
   - Session count (1)
   - Basic stats
4. Click "Compute Fingerprint"
5. View the generated EF JSON with 25+ features

## 5. Verify Database

In Supabase Dashboard → **Table Editor**:

- **songs**: Should have 1 row (your test song)
- **song_versions**: Should have 1 row
- **listening_sessions**: Should have 1+ rows
- **listening_events**: Should have multiple rows (play, pause, reactions, etc.)
- **engagement_fingerprints**: Should have 1 row after computing

## 6. Common Issues

### "Missing Supabase environment variables"

- Make sure `.env.local` exists and has correct values
- Restart the dev server after creating `.env.local`

### "Failed to upload audio file"

- Check that the `audio` storage bucket exists
- Verify storage policies allow public INSERT
- Check file size (Supabase free tier has limits)

### "Song not found" on listen page

- Verify the song_version was created in database
- Check browser console for errors
- Ensure the URL is correct

### "Failed to compute fingerprint"

- Need at least 1 complete listening session
- Check that events were recorded in `listening_events` table
- Look at server logs for detailed error messages

### No data in charts

- Timeline stats are computed on-demand when fingerprint is generated
- You need at least 1 session with events
- Try listening to a track first, then compute fingerprint

## 7. Production Deployment (Vercel)

### Prepare for Deployment

1. Commit all changes:
```bash
git add .
git commit -m "Initial setup"
git push origin main
```

### Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New Project"
4. Import your repository
5. Configure:
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
6. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
7. Click "Deploy"

### Verify Deployment

1. Wait for deployment to complete
2. Visit your deployment URL
3. Test upload, listen, and admin pages
4. All functionality should work identically to local

## 8. Next Steps

- Share listen links with real listeners
- Collect engagement data
- Analyze fingerprints to understand what works
- Compare different versions of the same song
- Export EF JSON for further analysis

## Need Help?

- Check the main [README.md](./README.md) for architecture details
- Review the [schema.sql](./supabase/schema.sql) for database structure
- Open an issue on GitHub with detailed error messages

