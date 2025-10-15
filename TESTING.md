# Testing Guide

Quick guide to test the Music Intelligence platform with sample data.

## Quick Test Flow

### 1. Start Development Server

```bash
npm run dev
```

### 2. Upload a Test Track

**Option A: Use a Public URL**
- Use this sample audio URL: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`
- Song Title: "Test Song 1"
- Version Label: "v1"

**Option B: Upload Your Own File**
- Any MP3, WAV, or other audio format
- Recommended: 30-180 seconds for testing

### 3. Simulate Multiple Listening Sessions

To test the engagement fingerprint properly, you need multiple sessions:

1. Open the listen link in a **normal browser window**
2. Listen for 10-15 seconds, click some emojis
3. Skip the track
4. Open the same listen link in an **incognito/private window**
5. Listen for 20-30 seconds, click different emojis
6. Let it play further
7. Repeat 3-5 times with different behaviors:
   - Early skip (5-10 seconds)
   - Full listen
   - Replay (seek backwards)
   - Different emoji reactions

### 4. Verify Event Tracking

Check Supabase Dashboard → Table Editor → `listening_events`:

You should see events like:
- `play` events when starting
- `heartbeat` events every 5 seconds while playing
- `reaction` events when clicking emojis
- `pause` events
- `seek` events (if you dragged the timeline)
- `skip` events
- `visibility` and `focus` events

### 5. Compute Fingerprint

1. Go to `/admin`
2. Select your test track
3. Verify session count (should match your test sessions)
4. Click "Compute Fingerprint"
5. Review the generated JSON

Expected features:
- `n_sessions`: Should match your test count
- `retention_30s`: Should be between 0-1
- `retention_60s`: Should be less than retention_30s
- `replay_rate_total`: > 0 if you seeked backwards
- `emoji_rate_*`: > 0 for emojis you clicked
- All features should have reasonable values

## Test Scenarios

### Scenario 1: High Engagement Track

Simulate a track people love:
1. 10 sessions
2. Most listen for 60+ seconds
3. Many 🔥 and 😍 reactions
4. Some replays (seek backwards)
5. Few skips

Expected EF:
- High retention (>0.7)
- High emoji_rate_fire and emoji_rate_love
- Low early_skip_rate_30s

### Scenario 2: Drop-Off Track

Simulate a track that loses listeners:
1. 10 sessions
2. Most skip within 15-30 seconds
3. Few reactions
4. No replays

Expected EF:
- Low retention_30s (<0.5)
- High early_skip_rate_30s
- Low replay_rate_total

### Scenario 3: Replay Hotspot

Simulate a track with a memorable hook:
1. 10 sessions
2. Many seek backwards to 40-50 second mark
3. 🔥 reactions at that timestamp

Expected EF:
- replay_hotspot_s around 40-50
- High replay_hotspot_intensity
- emoji_peak_s near replay_hotspot_s

## Validation Checklist

- [ ] Upload works (file or URL)
- [ ] Listen page loads correctly
- [ ] Audio plays
- [ ] Play/Pause works
- [ ] Emoji buttons are clickable
- [ ] Skip button works
- [ ] Events are recorded in database
- [ ] Session is created in database
- [ ] Multiple sessions can be created
- [ ] Admin page shows all tracks
- [ ] Session count is accurate
- [ ] Retention chart displays
- [ ] Compute Fingerprint works
- [ ] EF JSON has all expected fields
- [ ] EF values are reasonable (not NaN, Infinity, etc.)
- [ ] Same inputs produce same EF (determinism)

## Determinism Test

Run this test to ensure EF is stable:

1. Create 5 listening sessions with exact same behavior
2. Compute fingerprint → Copy JSON
3. Delete the fingerprint from database
4. Compute again → Compare JSON
5. Result: Both JSONs should be **identical**

## Edge Cases to Test

### Empty Track (No Sessions)
- Upload a track
- Don't create any sessions
- Try to compute fingerprint
- Expected: Should handle gracefully (empty fingerprint or message)

### Single Session
- Create just 1 session
- Compute fingerprint
- Expected: Should work, but some metrics may be 0

### Very Short Listen (< 5 seconds)
- Start playing, skip immediately
- Expected: Events recorded, retention metrics reflect early skip

### Tab Switching
- Start playing
- Switch to another tab (triggers visibility change)
- Switch back
- Expected: `visibility` events recorded, focus_share metrics affected

### Network Failure Simulation
1. Start playing
2. Open DevTools → Network tab
3. Set throttling to "Offline"
4. Click emojis (should queue)
5. Restore network
6. Expected: Events should retry and eventually flush

### Multiple Rapid Emojis
- Click all 4 emoji buttons rapidly
- Expected: All reactions recorded with correct timestamps

## Debugging Tips

### Events Not Recording
- Check browser console for errors
- Verify session started (check Network tab for `/api/sessions/start`)
- Check `/api/events` POST requests in Network tab
- Look at Supabase logs

### Fingerprint Computation Fails
- Ensure at least 1 session exists
- Check server logs (terminal running `npm run dev`)
- Verify timeline_stats table has data
- Check that events table has records

### Charts Not Showing
- Need to compute fingerprint first to populate timeline_stats
- Refresh the admin page after computing
- Check that timeline_stats table has rows

### Incorrect Retention Values
- Verify play segments make sense in events table
- Check that heartbeat events are being sent every 5s
- Ensure pause/skip events are recorded

## Performance Testing

For larger scale testing:

```javascript
// Run this in browser console on listen page
// Simulates 100 rapid emoji reactions (for testing batch flush)
for (let i = 0; i < 100; i++) {
  document.querySelector('[data-emoji="🔥"]').click();
}
```

Expected:
- Events batched into groups of 50
- Multiple POST requests to `/api/events`
- All events eventually recorded

## Success Criteria

✅ **Basic Functionality**
- All pages load without errors
- Audio plays correctly
- Events are captured

✅ **Data Integrity**
- Events in database match user actions
- No duplicate events (idempotency works)
- Sessions complete properly

✅ **Fingerprint Quality**
- EF computes without errors
- All 25+ features present
- Values are in reasonable ranges
- Deterministic (same inputs → same outputs)

✅ **User Experience**
- Listen page is intuitive
- Admin dashboard is readable
- Charts display correctly
- No visual glitches

## Next Steps After Testing

Once everything passes:
1. Deploy to production (Vercel)
2. Test production deployment
3. Share real listen links
4. Collect genuine engagement data
5. Analyze patterns in EF data

