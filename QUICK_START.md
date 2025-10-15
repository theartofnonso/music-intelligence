# Quick Start Guide

Get Music Intelligence running in 5 minutes.

## Prerequisites Check

- [ ] Node.js 18+ installed (`node -v`)
- [ ] npm installed (`npm -v`)
- [ ] Supabase account created

## Setup (5 steps)

### 1. Install Dependencies (30 seconds)

```bash
npm install
```

### 2. Create Supabase Project (2 minutes)

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy **Project URL** and **anon key** from Settings → API

### 3. Configure Environment (30 seconds)

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key-here
```

### 4. Setup Database (1 minute)

1. Open Supabase SQL Editor
2. Copy contents of `supabase/schema.sql`
3. Paste and Run
4. Create storage bucket: `audio` (make it public)

### 5. Start Development (10 seconds)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## First Test (2 minutes)

1. **Upload Track**
   - Title: "Test Song"
   - Version: "v1"
   - URL: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`
   - Click "Upload"

2. **Listen**
   - Click "Listen" button
   - Play the track
   - Click some emoji reactions
   - Click Skip after 20 seconds

3. **View Analytics**
   - Go to `/admin`
   - Click "Compute Fingerprint"
   - View the EF JSON

**Success!** You now have a working engagement tracking platform.

## Project Structure

```
music-intelligence/
├── app/
│   ├── page.tsx              # Upload page
│   ├── listen/[id]/          # Listen page
│   ├── admin/                # Analytics dashboard
│   └── api/                  # API routes
│       ├── sessions/         # Session management
│       ├── events/           # Event ingestion
│       └── fingerprint/      # EF computation
├── components/
│   ├── ui/                   # shadcn/ui components
│   └── Player.tsx            # Audio player
├── lib/
│   ├── supabase/             # DB clients
│   ├── aggregation/          # EF logic
│   ├── hooks/                # React hooks
│   └── types/                # TypeScript types
└── supabase/
    └── schema.sql            # Database schema
```

## Key URLs

- **Home (Upload)**: `http://localhost:3000`
- **Listen**: `http://localhost:3000/listen/[id]`
- **Admin**: `http://localhost:3000/admin`

## API Endpoints

- `POST /api/sessions/start` - Create session
- `POST /api/sessions/complete` - Complete session
- `POST /api/events` - Ingest events
- `GET /api/fingerprint/[id]` - Compute EF

## Key Files

- `README.md` - Complete documentation
- `SETUP.md` - Detailed setup guide
- `TESTING.md` - Testing procedures
- `ENGAGEMENT_FINGERPRINT.md` - EF specification
- `supabase/schema.sql` - Database schema

## Next Steps

1. ✅ Basic setup complete
2. 📚 Read [ENGAGEMENT_FINGERPRINT.md](./ENGAGEMENT_FINGERPRINT.md) to understand metrics
3. 🧪 Follow [TESTING.md](./TESTING.md) for comprehensive testing
4. 🚀 Deploy to Vercel (see [README.md](./README.md))
5. 📊 Share listen links and collect real data

## Common Issues

**"Missing Supabase environment variables"**
→ Create `.env.local` with your credentials

**"Failed to upload audio file"**
→ Create `audio` storage bucket in Supabase

**"Song not found"**
→ Check that database tables were created from schema.sql

**Need help?**
→ See [SETUP.md](./SETUP.md) for detailed troubleshooting

## Deploy to Production

```bash
# 1. Push to GitHub
git add .
git commit -m "Initial setup"
git push

# 2. Deploy to Vercel
# - Import repo at vercel.com
# - Add environment variables
# - Deploy
```

---

**Ready to track engagement!** 🎵📊

