# How to View Vercel Production Logs - Step by Step

## Quick Start

### Step 1: Navigate to Logs Tab
1. Go to: https://vercel.com/dashboard
2. Click on your project: `microcement`
3. Click **"Logs"** tab in the top navigation

### Step 2: Search for Specific Logs

In the search bar at the top, type one of these:

**For iOS Uploads:**
```
=== Upload from iOS API called ===
```

**For Conversion:**
```
[ExportService]
```

**For Model Loading:**
```
[HomeClient]
```

**For Measurements:**
```
[SceneEditor] RoomPlan JSON
```

### Step 3: Click on a Log Entry

1. Find a log entry in the table (e.g., `POST /api/upload-from-ios`)
2. **Click on the log entry row**
3. The right panel will show detailed information
4. **Scroll down in the right panel** to see all logs

### Step 4: View Function Logs (Detailed Console Logs)

After clicking a log entry, look at the **bottom left** section:

1. Find the **"Logs"** section
2. Under it, you'll see **"Vercel Function"**
3. **Click the dropdown arrow** to expand it
4. You'll see all `console.log()` output from that function

### Step 5: See All Logs from a Function Invocation

When you click a log entry, the right panel shows:

1. **Function Invocation** section - Shows route and duration
2. **External APIs** section - Shows Supabase API calls
3. **Scroll down** to see all function logs in chronological order

## Where to Find Specific Logs

### Upload Flow Logs

**Search for:** `/api/upload-from-ios`

Then click the log entry and expand "Vercel Function" to see:
- `=== Upload from iOS API called ===`
- `USDZ file uploaded:`
- `JSON metadata uploaded:`
- `[ExportService] Starting conversion with 240s timeout`
- `[Upload API] Conversion attempt completed in xxxms`

### Conversion Logs

**Search for:** `[ConvertService]` or `Conversion`

You'll see:
- `[ConvertService] Starting conversion for export ID:`
- `[ConvertService] Updating export xxx status -> processing`
- `[ConvertService] Export row fetched:`
- `[ConvertService] Converting USDZ to GLB...`
- `[ConvertService] Conversion successful`
- `[ConvertService] GLB uploaded successfully`

### iOS Redirect Logs (Model Loading)

**Search for:** `[HomeClient]`

Then click the log entry to see:
- `[HomeClient] Checking iOS export URL params...`
- `[HomeClient] Export data received:`
- `[HomeClient] Resolved URLs for loading:`
- `[HomeClient] setModelPath() called with resolved URL`
- `[HomeClient] JSON metadata parsed successfully`

### Model Loading in SceneEditor

**Search for:** `[SceneEditor]`

Look for:
- `[SceneEditor] modelPath changed in Zustand store:`
- `[SceneEditor] Loading uploaded model:`
- `[SceneEditor] Model loading details:`

### Measurements Loading

**Search for:** `[SceneEditor] RoomPlan JSON` or `setRoomPlanMetadata`

Look for:
- `[SceneEditor] RoomPlan JSON path changed in Zustand store:`
- `[SceneEditor] Fetching RoomPlan metadata from resolved URL...`
- `[SceneEditor] JSON metadata parsed successfully:`
- `[SceneEditor] setRoomPlanMetadata() called`

## Tips

### Tip 1: Use Time Range
- Vercel logs show recent logs by default
- Use the time selector to see older logs
- Logs are retained for 7 days on Pro plan

### Tip 2: Filter by Status
- Click the filter icon (funnel) to filter by:
  - Status code (200, 500, etc.)
  - Function name
  - Time range

### Tip 3: Real-Time Logs
- Toggle **"Live"** button (green indicator) for real-time streaming
- Logs will update automatically as requests come in

### Tip 4: Export Logs
- You can't directly export, but you can:
  - Screenshot important logs
  - Copy-paste log text
  - Use Vercel CLI (advanced)

## Common Issues

### "I don't see the logs I added"

**Possible reasons:**
1. **Code not deployed yet** - Make sure you've deployed to production
2. **Need to trigger new request** - Upload a new file or trigger the action
3. **Looking at wrong deployment** - Make sure you're on the latest deployment
4. **Logs in different function** - The logs might be in a different API route

**Solution:**
- Check deployment date/time
- Trigger a new upload from iOS app
- Search for the specific log message using search bar

### "Logs are truncated"

**Solution:**
- Click on the log entry to see full details
- Expand "Vercel Function" section
- Scroll down in the right panel to see all logs

### "Can't find specific log message"

**Solution:**
- Use exact search (e.g., `[ExportService] Starting conversion`)
- Check if the function was actually called (look for the API route)
- Verify code was deployed with the logging

## Example Workflow

1. **Trigger an iOS upload** from the iOS app
2. **Go to Vercel Logs** tab
3. **Search for:** `/api/upload-from-ios`
4. **Click** the most recent log entry
5. **Expand** "Vercel Function" section in bottom left
6. **Look at** right panel for detailed logs
7. **Scroll down** to see all console.log output

You should see logs like:
- `=== Upload from iOS API called ===`
- `[ExportService] Starting conversion with 240s timeout`
- `[ConvertService] Starting conversion for export ID:`
- `⏱️ [ConvertService] Conversion completed in xxxms`
- etc.

## Quick Reference

**Direct URL:** `https://vercel.com/[your-team]/microcement/logs`

**Key Search Terms:**
- `[ExportService]` - Export service
- `[ConvertService]` - Conversion processing
- `[HomeClient]` - iOS redirect handling
- `[SceneEditor]` - Model/measurements loading
- `[Upload API]` - Upload endpoint
- `Resolved URLs` - URL resolution
- `⏱️` - Timing information

