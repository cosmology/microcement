# Event Listeners Migration to Zustand - Analysis & Plan

## 🐛 CRITICAL BUG FIXED: Infinite Render Loop

**Problem:** HomeClient was rendering infinitely, causing:
- SceneEditor to remount repeatedly  
- addPathVisuals to be called hundreds of times
- Severe performance degradation

**Root Cause:**
1. ❌ AuthHandler had `onUserChange` in useEffect deps
2. ❌ Every render created new `setUser` callback
3. ❌ New callback triggered AuthHandler re-registration
4. ❌ Re-registration called `onUserChange`
5. ❌ Loop continues forever!

**Fix Applied:**
```typescript
// AuthHandler.tsx - Line 31
}, []) // Removed onUserChange from deps
```

**Also Fixed:**
- Removed console.logs from JSX render (HomeClient.tsx lines 764, 767)
- Reduced excessive logging in checkUserConfigs
- Added userIdRef to prevent duplicate checks
- Changed useEffect to only depend on user.id, not entire user object

**Result:** HomeClient now renders only when user ID actually changes!

---

## Current State: Event Listeners Audit

### ✅ Properly Cleaned Up Listeners (No Memory Leaks)

1. **scene-reload-camera** - Camera path reload
   - Location: SceneEditor.tsx line ~641
   - Status: ✅ Has cleanup
   - Migration: Low priority

2. **camera-goto-waypoint** - Navigate to waypoint
   - Location: SceneEditor.tsx line ~692
   - Status: ✅ Has cleanup
   - Migration: Low priority

3. **mousemove (computeCurrentLookAt)** - Track mouse for lookAt
   - Location: SceneEditor.tsx line ~856
   - Status: ✅ Has cleanup
   - Migration: Low priority (needed for raycasting)

4. **Scroll tracking (7 listeners)** - wheel, touch, scroll, click, keydown
   - Location: SceneEditor.tsx line ~1149
   - Status: ✅ Has cleanup
   - Migration: Low priority (native DOM events)

5. **mousemove/click (raycasting)** - Hotspot detection
   - Location: SceneEditor.tsx line ~5393
   - Status: ✅ Has cleanup
   - Migration: Low priority (needs DOM events)

6. **resize** - Window resize handling
   - Location: SceneEditor.tsx line ~4283
   - Status: ✅ Has cleanup
   - Migration: Low priority (native DOM event)

---

## ⚠️ HIGH PRIORITY: Migrate to Zustand Store

These listeners should be replaced with Zustand store subscriptions:

### 1. **editor-toggle** ⚠️
- **Current:** Window event listener
- **Should be:** `useCameraStore()` subscription to `isEditorEnabled`
- **Impact:** Medium - used by CameraPathEditor3D
- **Migration:** Already partially migrated, remove event listener

### 2. **look-at-toggle** ⚠️
- **Current:** Window event listener
- **Should be:** `useCameraStore()` subscription to `showLookAtTargets`
- **Impact:** Medium - used by CameraPathEditor3D
- **Migration:** Already partially migrated, remove event listener

### 3. **height-panel-toggle** ⚠️
- **Current:** Window event listener
- **Should be:** `useCameraStore()` subscription to `selectedHeightIndex`
- **Impact:** Low - rarely used
- **Migration:** Already migrated, remove event listener

### 4. **clear-scene** ⚠️
- **Current:** Window event listener
- **Should be:** `useCameraStore()` subscription to `clearSceneRequested`
- **Impact:** Medium
- **Migration:** Already migrated to Zustand! Just needs listener removal

### 5. **rotate-model** ⚠️
- **Current:** Window event listener
- **Should be:** `useCameraStore()` subscription to `rotateModelRequested`
- **Impact:** Medium
- **Migration:** Already migrated to Zustand! Just needs listener removal

---

## 🐛 CRITICAL: Memory Leak Identified

### Path Visuals Leak

**Problem:**
```typescript
// This useEffect was triggering on EVERY render due to gsapCameraPoints/gsapLookAtTargets deps
useEffect(() => {
  addPathVisuals(visualCurve) // ← Called repeatedly!
}, [gsapCameraPoints, gsapLookAtTargets, ...]) // ← Recreated on every render!
```

**Fix Applied:**
```typescript
// Now uses hash-based change detection
const pointsHash = storeCameraPoints.map(p => `${p.x},${p.y},${p.z}`).join('|');
if (pointsHash === lastPointsHashRef.current) {
  return; // Skip if unchanged
}
// Only depends on store data (stable references)
}, [storeCameraPoints, storeLookAtTargets])
```

**Benefits:**
- ✅ Only updates when points actually change
- ✅ 300ms debounce prevents rapid re-renders
- ✅ Stable dependencies (store data, not derived arrays)

---

## Next Steps

### Phase 1: Remove Obsolete Event Listeners (Immediate)
1. Remove `editor-toggle` listener - already using Zustand
2. Remove `look-at-toggle` listener - already using Zustand
3. Remove `height-panel-toggle` listener - already using Zustand
4. Remove `clear-scene` listener - already using Zustand
5. Remove `rotate-model` listener - already using Zustand

### Phase 2: Monitor Performance (Next Session)
Run the app and check console for:
- 🎧 = Listener registered (should see on mount)
- 🔌 = Listener removed (should see on unmount)
- ⏭️ = Skipped update (hash unchanged)
- 🔄 = Update scheduled
- 🎨 = Update executed

If you still see excessive logs, we'll know which listener is the culprit.

### Phase 3: Consider Store-Based Architecture
Move remaining appropriate listeners to Zustand subscriptions:
- Model loading state
- Gallery mode
- Collaborative model loading
- Upload model loading

---

## Performance Metrics to Track

Before migration:
- Event listeners: ~30+
- addPathVisuals calls per minute: Unknown (check logs)

After migration:
- Event listeners: ~15-20 (only DOM-required)
- addPathVisuals calls: Only on actual data change
- Store subscriptions: 5-10 (efficient, no cleanup needed)

---

## Recommendations

1. **Keep as event listeners** (need DOM access):
   - Mouse/touch/scroll for raycasting
   - Window resize
   - Keyboard shortcuts
   - Model loading events

2. **Migrate to Zustand** (state-based):
   - All UI toggles (editor, lookAt, height panel)
   - All model utilities (clear, rotate)
   - All bird view controls

3. **Optimize with useEffect deps**:
   - Use stable references from store
   - Add hash-based change detection
   - Increase debounce times

