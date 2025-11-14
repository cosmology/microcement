# Vercel Production Logs Guide

## Accessing Production Logs

### Method 1: Vercel Dashboard (Easiest)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Sign in to your account

2. **Select Your Project**
   - Click on your project: `microcement` (or your project name)

3. **Navigate to Logs Tab**
   - In the project dashboard, click on the **"Logs"** tab in the top navigation
   - This shows real-time logs from all deployments

4. **Filter Logs**
   - Use the search bar to filter by function name (e.g., `/api/upload-from-ios`, `/api/exports/[id]`)
   - Use the filter dropdown to filter by:
     - **All Logs** - Everything
     - **Function Logs** - Only serverless function logs
     - **Edge Logs** - Edge function logs
     - **Build Logs** - Build process logs

### Method 2: Specific Deployment Logs

1. **Go to Deployments Tab**
   - Click on **"Deployments"** tab in the project dashboard
   - Find the deployment you want to check (most recent at the top)

2. **View Deployment Details**
   - Click on the deployment hash/timestamp
   - Scroll down to see **"Function Logs"** section
   - Click on a specific function (e.g., `/api/upload-from-ios`) to see its logs

3. **Filter by Function**
   - In the deployment view, use the function dropdown to filter logs by specific API route

### Method 3: Real-Time Logs (Live)

1. **Open Logs Tab**
   - Navigate to: `https://vercel.com/[your-team]/microcement/logs`

2. **Enable Live Updates**
   - Toggle **"Live"** button (green indicator) to see real-time logs
   - Logs will stream as requests come in

3. **Filter in Real-Time**
   - Use the search bar: `[Upload API]`, `[ExportService]`, `[SceneEditor]`, etc.
   - Filter by status code (200, 500, etc.)
   - Filter by hostname or path

## Finding Specific Logs

### For iOS Upload Conversions

**Search for:**
- `[Upload API]` - Upload endpoint logs
- `[ExportService]` - Export service logs
- `[ConvertService]` - Conversion service logs
- `Conversion completed` - Success messages
- `Conversion timeout` - Timeout messages

**Example search queries:**
```
[ExportService] Starting conversion
[ConvertService] Starting conversion
Conversion completed in
⏱️
```

### For Model Loading Issues

**Search for:**
- `[HomeClient]` - iOS redirect handling
- `[SceneEditor]` - Model loading logs
- `modelPath changed` - Zustand store updates
- `Loading uploaded model` - Model loading start

**Example search queries:**
```
[HomeClient] Resolved URLs
[SceneEditor] modelPath changed
setModelPath() called
```

### For Measurements Issues

**Search for:**
- `[Measurements]` - Measurement loading logs
- `RoomPlan JSON` - JSON metadata logs
- `setRoomPlanMetadata` - Metadata storage logs

**Example search queries:**
```
[HomeClient] JSON metadata parsed
[SceneEditor] RoomPlan JSON path changed
setRoomPlanMetadata() called
```

## Log Structure

### Upload Flow Logs

When an iOS upload happens, look for this sequence:

1. **Upload Start**
   ```
   === Upload from iOS API called ===
   [Upload API] Form data received
   ```

2. **File Upload**
   ```
   USDZ file uploaded: { bucket, objectPath, publicUrl }
   JSON metadata uploaded: { bucket, objectPath, publicUrl }
   ```

3. **Export Creation**
   ```
   Export pipeline triggered successfully: { id, status }
   [ExportService] Starting background conversion
   ```

4. **Conversion**
   ```
   [ExportService] Starting conversion with 240s timeout
   [ConvertService] Starting conversion for export ID: xxx
   [ConvertService] Updating export xxx status -> processing
   [ConvertService] Export xxx status updated to processing
   [ConvertService] Fetching export row for xxx
   [ConvertService] Export row fetched: { id, usdz_path, json_path }
   [ConvertService] Downloading USDZ from: xxx
   [ConvertService] Converting USDZ to GLB via JavaScript parser...
   [ConvertService] Conversion successful, GLB size: xxx bytes
   [ConvertService] Uploading GLB to Supabase Storage...
   [ConvertService] GLB uploaded successfully in xxxms
   [ConvertService] Export completed successfully in xxxms
   ```

5. **Response**
   ```
   [Upload API] Conversion attempt completed in xxxms
   ```

### iOS Redirect Flow Logs

When iOS redirects to web app:

1. **HomeClient**
   ```
   [HomeClient] Checking iOS export URL params...
   [HomeClient] exportId: xxx
   [HomeClient] Fetching export data from /api/exports/xxx
   [HomeClient] Export data received: { ... }
   [HomeClient] Resolved URLs for loading: { modelUrl, jsonUrl }
   [HomeClient] setModelPath() called with resolved URL
   [HomeClient] setRoomPlanJsonPath() called
   [HomeClient] Fetching JSON metadata from resolved URL...
   [HomeClient] JSON metadata parsed successfully: { wallsCount, doorsCount, ... }
   [HomeClient] setRoomPlanMetadata() called - metadata stored in Zustand
   ```

2. **SceneEditor**
   ```
   [SceneEditor] modelPath changed in Zustand store: { newPath, pathType }
   [SceneEditor] Dispatching load-uploaded-model event
   [SceneEditor] Loading uploaded model: { modelPath, pathType }
   [SceneEditor] Model loading details: { ... }
   ```

3. **Measurements**
   ```
   [SceneEditor] RoomPlan JSON path changed in Zustand store: { jsonPath, pathType }
   [SceneEditor] Fetching RoomPlan metadata from resolved URL...
   [SceneEditor] JSON fetch response: { ok, status, contentType }
   [SceneEditor] JSON metadata parsed successfully: { hasWalls, wallsCount, ... }
   [SceneEditor] setRoomPlanMetadata() called - metadata stored in Zustand
   ```

## Troubleshooting

### No Logs Appearing

1. **Check Deployment Status**
   - Ensure deployment is active (not failed)
   - Check that functions are being invoked

2. **Check Log Retention**
   - Vercel Pro plan: 7 days of logs
   - Older logs may not be available

3. **Verify Function Execution**
   - Check function invocations in the Functions tab
   - Verify the function is being called

### Finding Errors

1. **Filter by Status Code**
   - Search for: `500`, `400`, `Error`
   - Filter by: `status: 500` or `status: error`

2. **Look for Error Patterns**
   ```
   ❌ - Errors
   ⚠️ - Warnings
   ✅ - Success
   🔄 - Processing
   ⏱️ - Timing information
   ```

3. **Check Stack Traces**
   - Look for `Error:` or `Exception:`
   - Check for stack traces in the logs

### Exporting Logs

Vercel doesn't provide direct log export, but you can:
1. Use Vercel CLI (see Method 4 below)
2. Screenshot important log sections
3. Copy-paste relevant logs

## Method 4: Vercel CLI (Advanced)

If you have Vercel CLI installed:

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# List deployments
vercel ls

# View logs for a specific deployment
vercel logs [deployment-url]

# View logs for your project (real-time)
vercel logs --follow

# View logs for a specific function
vercel logs --function /api/upload-from-ios
```

## Quick Reference

### Direct URLs

- **Project Dashboard**: `https://vercel.com/[team]/microcement`
- **Logs**: `https://vercel.com/[team]/microcement/logs`
- **Deployments**: `https://vercel.com/[team]/microcement/deployments`

### Log Search Tips

- Use quotes for exact phrases: `"Conversion completed"`
- Use `-` to exclude: `-[error]` (exclude errors)
- Combine filters: `[Upload API] status:500` (upload errors only)
- Use regex patterns (if supported)

### Common Issues

1. **"No logs found"**
   - Check date range (logs expire after retention period)
   - Verify deployment is active
   - Check if function is being called

2. **"Too many logs"**
   - Use more specific search filters
   - Filter by function name
   - Filter by time range

3. **"Logs are delayed"**
   - Vercel logs can have 1-2 minute delay
   - Use "Live" mode for real-time updates
   - Refresh the page if needed

## Production Monitoring Checklist

When debugging production issues:

- [ ] Check recent deployments (Deployments tab)
- [ ] Filter logs by function name
- [ ] Search for error patterns (`❌`, `Error:`, `500`)
- [ ] Look for timing information (`⏱️`)
- [ ] Check conversion duration logs
- [ ] Verify URL resolution logs (`Resolved URLs`)
- [ ] Check model loading logs (`modelPath changed`)
- [ ] Verify metadata loading (`JSON metadata parsed`)

