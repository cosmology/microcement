# Where to Find Different Types of Logs

## 🔴 Server-Side Logs (Vercel Dashboard)

**These appear in Vercel Logs tab:**

### Upload & Conversion Logs
- `=== Upload from iOS API called ===`
- `[ExportService] Starting conversion...`
- `[ConvertService] Converting USDZ to GLB...`
- `✅ [ConvertService] Export completed successfully`

**Where to find:**
1. Go to Vercel Dashboard
2. Click your project: `microcement`
3. Click **"Logs"** tab
4. Search for export ID or `[ConvertService]`

**When these appear:**
- Immediately when upload happens
- During conversion process
- After conversion completes

---

## 🟢 Client-Side Logs (Browser Console)

**These appear in the browser's Developer Console:**

### HomeClient Logs (iOS Redirect Handling)
- `[HomeClient] Checking iOS export URL params...`
- `[HomeClient] Export data received:`
- `[HomeClient] Resolved URLs for loading:`
- `[HomeClient] setModelPath() called with resolved URL`
- `[HomeClient] setRoomPlanJsonPath() called with resolved URL`
- `[HomeClient] JSON metadata parsed successfully:`

### SceneEditor Logs (Model Loading)
- `[SceneEditor] modelPath changed in Zustand store:`
- `[SceneEditor] Loading uploaded model:`
- `[SceneEditor] Model loading details:`
- `[SceneEditor] RoomPlan JSON path changed in Zustand store:`
- `[SceneEditor] JSON metadata parsed successfully:`

### Zustand Store Logs
- `setModelPath()` calls
- `setRoomPlanJsonPath()` calls
- `setRoomPlanMetadata()` calls

**Where to find:**

### Method 1: Safari on Mac (When Testing from iOS)

1. **Enable Web Inspector on iOS:**
   - Go to iOS Settings → Safari → Advanced
   - Toggle "Web Inspector" ON

2. **Connect iOS Device:**
   - Connect iPhone/iPad to Mac via USB
   - Trust computer if prompted

3. **Open Safari on Mac:**
   - Safari → Develop menu → [Your iPhone Name] → [Web Page Title]
   - This opens Web Inspector

4. **View Console:**
   - Click "Console" tab in Web Inspector
   - Logs will appear when page loads

### Method 2: Chrome/Firefox DevTools (When Testing in Browser)

1. **Open the web app** in your browser
2. **Open Developer Tools:**
   - **Mac:** `Cmd + Option + I` (Chrome) or `Cmd + Option + C` (Safari)
   - **Windows/Linux:** `F12` or `Ctrl + Shift + I`
3. **Click "Console" tab**
4. **Filter logs** by typing:
   - `[HomeClient]` - iOS redirect logs
   - `[SceneEditor]` - Model loading logs
   - `setModelPath` - Zustand store updates

### Method 3: Local Development (Docker)

1. **Open the app** in your browser (usually `http://localhost:3000`)
2. **Open Developer Tools** (`F12` or `Cmd + Option + I`)
3. **Click "Console" tab**
4. **View logs** - they appear immediately when:
   - Page loads
   - User navigates to export URL
   - Model path changes in Zustand store

**When these appear:**
- **Only after** user clicks "View in Web App" in iOS app
- **Or** when navigating directly to export URL in browser
- **Or** when model path is set in Zustand store from any source

---

## 🔍 How to Debug Model Loading Issues

### Step 1: Check if Conversion Completed (Vercel Logs)

1. Go to **Vercel Logs**
2. Search for your export ID (e.g., `d65682d7-0112-4e7e-a7c5-ad26f2d4ae4e`)
3. Look for:
   - `✅ [ConvertService] Export completed successfully` ← **SUCCESS**
   - `❌ [ConvertService] Conversion failed` ← **FAILED**
   - No completion message → **STILL RUNNING OR TIMED OUT**

### Step 2: Check Database Status (Supabase Studio)

1. Go to **Supabase Studio** → SQL Editor
2. Run:
   ```sql
   SELECT id, status, glb_path, error, updated_at 
   FROM exports 
   WHERE id = 'd65682d7-0112-4e7e-a7c5-ad26f2d4ae4e';
   ```
3. Check:
   - `status = 'ready'` → ✅ Conversion completed
   - `status = 'processing'` → ⏳ Still running
   - `status = 'failed'` → ❌ Check `error` column
   - `status = 'queued'` → ⏳ Not started yet

### Step 3: Check Browser Console (When User Views Export)

1. **User clicks "View in Web App"** in iOS app
2. **Open browser console** (see methods above)
3. **Look for logs in this order:**

   **a) HomeClient logs (iOS redirect):**
   ```
   [HomeClient] Checking iOS export URL params...
   [HomeClient] Export data received: {...}
   [HomeClient] Resolved URLs for loading: {...}
   [HomeClient] setModelPath() called with resolved URL
   ```

   **b) SceneEditor logs (model loading):**
   ```
   [SceneEditor] modelPath changed in Zustand store: {...}
   [SceneEditor] Loading uploaded model: {...}
   [SceneEditor] Model loading details: {...}
   ```

   **c) JSON metadata logs (measurements):**
   ```
   [HomeClient] JSON metadata parsed successfully: {...}
   [SceneEditor] RoomPlan JSON path changed in Zustand store: {...}
   [SceneEditor] JSON metadata parsed successfully: {...}
   ```

### Step 4: Common Issues

**Problem:** No logs in browser console

**Possible causes:**
1. User hasn't clicked "View in Web App" yet
2. Web page hasn't loaded yet
3. Console not opened yet
4. Logs filtered out (check console filter settings)

**Solution:**
- Make sure user clicks "View in Web App" from iOS
- Open console **before** clicking "View in Web App"
- Clear console filter (click "All levels" or remove text from filter)

**Problem:** Logs stop at "Conversion started" in Vercel

**Possible causes:**
1. Conversion timed out (8 second limit on old code)
2. Conversion still running (large file)
3. Conversion failed silently

**Solution:**
- Check database status (see Step 2)
- Deploy latest code with 4-minute timeout
- Check for error messages in Vercel logs

**Problem:** Model doesn't load in browser

**Possible causes:**
1. GLB path not resolved (still Supabase URI)
2. URL invalid (expired signed URL)
3. Model loading failed silently

**Solution:**
- Check browser console for `[SceneEditor]` logs
- Check if `modelPath` is a valid HTTPS URL
- Check Network tab for failed requests to GLB file

---

## 📋 Quick Checklist

When debugging model loading:

- [ ] ✅ Conversion completed (Vercel logs show success)
- [ ] ✅ Database shows `status = 'ready'` and `glb_path` present
- [ ] ✅ User clicked "View in Web App" from iOS
- [ ] ✅ Browser console is open
- [ ] ✅ `[HomeClient]` logs appear in console
- [ ] ✅ `[SceneEditor]` logs appear in console
- [ ] ✅ Model loads (visible in 3D scene)
- [ ] ✅ Measurements appear (if JSON metadata available)

---

## 🎯 Summary

| Log Type | Where to Find | When They Appear |
|----------|--------------|------------------|
| **Upload/Conversion** | Vercel Logs | During upload/conversion |
| **HomeClient (iOS redirect)** | Browser Console | When user views export |
| **SceneEditor (model loading)** | Browser Console | When model path changes |
| **Zustand Store** | Browser Console | When store updates |

**Remember:** Server logs (Vercel) and client logs (browser) are **separate**. You need to check **both** to debug the full flow!

