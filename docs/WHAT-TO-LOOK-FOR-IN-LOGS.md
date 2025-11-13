# What to Look For in Vercel Logs - Quick Reference

## ✅ Good Signs (Everything Working)

### 1. Upload Success
Look for:
```
USDZ file uploaded: { bucket: 'scanned-rooms', objectPath: '...', publicUrl: '...' }
JSON metadata uploaded: { bucket: 'scanned-rooms', objectPath: '...', publicUrl: '...' }
```

### 2. Conversion Started
Look for:
```
🚀 [ExportService] Starting conversion with 240s timeout (240000ms) for export xxx
🔄 [ConvertService] Starting conversion for export ID: xxx
```

### 3. Conversion Processing
Look for:
```
📥 [ConvertService] Downloading USDZ from: supabase://...
✅ [ConvertService] USDZ buffer loaded, size: xxxx bytes
🔄 [ConvertService] Converting USDZ to GLB via JavaScript parser...
```

### 4. Conversion Completed ✅
Look for:
```
✅ [ConvertService] Conversion successful, GLB size: xxxx bytes
📤 [ConvertService] Uploading GLB to Supabase Storage...
✅ [ConvertService] GLB uploaded successfully in xxxms
✅ [ConvertService] Export completed successfully in xxxms: export-id
   GLB Path: supabase://...
   GLB URL: https://...
```

**In Upload API logs, also look for:**
```
✅ Conversion completed successfully during upload!
   GLB Path: supabase://...
   GLB URL: https://...
⏱️ [Upload API] Conversion attempt completed in xxxms
```

## ⚠️ Warning Signs (Potential Issues)

### 1. Conversion Timeout
Look for:
```
⏱️ [ExportService] Conversion timeout after 240s (240000ms) for export xxx
   Conversion continues in background (may be killed by Vercel function termination)
   💡 Tip: Very large scans may take longer than 240s. Check back later...
```

**Action:** Large scan - conversion will complete in background. Poll export status or wait.

### 2. Conversion Failed
Look for:
```
❌ [ConvertService] Conversion failed: [error message]
❌ [ConvertService] Conversion failed after xxxms for export xxx
   Error message: [details]
```

**Action:** Check error message for details (file format, parsing errors, etc.)

### 3. Upload Failed
Look for:
```
❌ Error uploading USDZ file from iOS: [error]
```

**Action:** Check Supabase Storage permissions, file size limits, or network issues.

### 4. Old Timeout Value (8 seconds)
If you see:
```
🚀 [ExportService] Starting conversion with timeout (8000ms) for export xxx
```

**Problem:** Code not deployed - still using old 8-second timeout (Hobby plan limit).

**Action:** Redeploy latest code with 240000ms (4 minute) timeout.

## 🔍 How to Find Completion Status

### Method 1: Search for Success Messages
In Vercel Logs search bar, type:
```
✅ [ConvertService] Export completed successfully
```

### Method 2: Search for the Export ID
If you have the export ID (e.g., `d65682d7-0112-4e7e-a7c5-ad26f2d4ae4e`), search for:
```
d65682d7-0112-4e7e-a7c5-ad26f2d4ae4e
```

Then look for the last log entry for that export ID to see if it completed or failed.

### Method 3: Check Database
Query the `exports` table in Supabase Studio:
```sql
SELECT id, status, glb_path, error, updated_at 
FROM exports 
WHERE id = 'd65682d7-0112-4e7e-a7c5-ad26f2d4ae4e'
ORDER BY updated_at DESC;
```

Look for:
- `status = 'ready'` → ✅ Conversion completed
- `status = 'processing'` → ⏳ Still running (check `updated_at` - if old, may be stuck)
- `status = 'failed'` → ❌ Failed (check `error` column)
- `status = 'queued'` → ⏳ Not started yet

## 📊 Example: Successful Conversion Flow

Here's what a successful conversion looks like in the logs:

```
1. Upload starts:
   === Upload from iOS API called ===
   Form data received: { hasFile: true, ... }

2. Files uploaded:
   USDZ file uploaded: { bucket: 'scanned-rooms', ... }
   JSON metadata uploaded: { bucket: 'scanned-rooms', ... }

3. Export created:
   📋 [ExportService] Export xxx created and conversion initiated

4. Conversion starts:
   🚀 [ExportService] Starting conversion with 240s timeout
   🔄 [ConvertService] Starting conversion for export ID: xxx

5. Files downloaded:
   📥 [ConvertService] Downloading USDZ from: supabase://...
   ✅ [ConvertService] USDZ buffer loaded, size: 23589 bytes
   RoomPlan metadata buffer loaded, size: 63087

6. Conversion processing:
   🔄 [ConvertService] Converting USDZ to GLB via JavaScript parser...
   Input: 23589 bytes USDZ
   Output: xxx.glb

7. GLB uploaded:
   📤 [ConvertService] Uploading GLB to Supabase Storage...
   ✅ [ConvertService] GLB uploaded successfully in xxxms

8. Success:
   ✅ [ConvertService] Export completed successfully in xxxms: xxx
      GLB Path: supabase://scanned-rooms/processed-glb/...
      GLB URL: https://...supabase.co/storage/v1/object/public/...

9. Upload API confirms:
   ✅ Conversion completed successfully during upload!
   ⏱️ [Upload API] Conversion attempt completed in xxxms
```

## 🚨 Common Issues & Solutions

### Issue 1: Logs Cut Off
**Symptom:** Logs stop mid-conversion, no success or error message.

**Solution:**
1. Scroll down in the log view to see more
2. Check if conversion timed out (search for "timeout")
3. Query the database to check export status
4. Check for newer log entries (conversion might complete later)

### Issue 2: Conversion Taking Too Long
**Symptom:** See "Conversion timeout after 240s" message.

**Solution:**
- This is normal for large scans (>10MB)
- Conversion continues in background
- Check export status later (it will eventually complete)
- Or use `/api/background/convert` endpoint to manually trigger

### Issue 3: Can't Find Specific Logs
**Symptom:** Too many logs, hard to find what you need.

**Solution:**
1. Use search bar with specific terms:
   - Export ID: `d65682d7-0112-4e7e-a7c5-ad26f2d4ae4e`
   - Service name: `[ConvertService]` or `[ExportService]`
   - Status: `✅` (success) or `❌` (errors)
2. Filter by function: `/api/upload-from-ios`
3. Filter by time: Last 5 minutes
4. Use status filter: `500` for errors, `200` for success

## 📝 Quick Checklist

When debugging a conversion:

- [ ] ✅ Upload completed (USDZ and JSON uploaded)
- [ ] ✅ Export record created (export ID present)
- [ ] ✅ Conversion started (`[ConvertService] Starting conversion`)
- [ ] ✅ USDZ downloaded (`USDZ buffer loaded`)
- [ ] ✅ Conversion processing (`Converting USDZ to GLB`)
- [ ] ✅ GLB uploaded (`GLB uploaded successfully`)
- [ ] ✅ Export completed (`Export completed successfully`)
- [ ] ✅ Database updated (`status = 'ready'`, `glb_path` present)

If any step is missing, that's where the issue is!

