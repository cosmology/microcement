# Architect Auto-Load Bug Fix

## Problem
When an architect (Ivan) logged in, their own model (`ema.glb` from `ema_showcase` config) would automatically load into the scene. After clearing the scene or switching to a client's model, Ivan's model would reload on top of the client's model after some time.

---

## Root Cause

### The Bug Flow:
1. Architect Ivan logs in
2. `HomeClient.checkUserConfigs()` runs
3. Finds Ivan has 2 `scene_design_configs` (ivanov_remodel, ema_showcase)
4. Sets `hasUserConfig = true`
5. `renderArchitectContent()` sees `hasUserConfig === true`
6. Renders `<SceneEditor />` which auto-loads Ivan's model
7. Even after clearing scene, `useEffect` keeps re-running and reloading Ivan's model

### The Log Evidence:
```
SceneConfigService.ts:71 Query result - data: (2) [{…}, {…}]
  0: {config_name: 'ivanov_remodel', user_id: '225a781d...'}  ← Ivan's own config
  1: {config_name: 'ema_showcase', model_path: '/models/ema.glb'}  ← Ivan's own config

HomeClient.tsx:106 User configs: 2 configs  ← Sets hasUserConfig = true

SceneEditor.tsx:402 Model Path: /models/ema.glb  ← Auto-loads Ivan's model!
```

---

## Solution

### Architects Should NOT Auto-Load Their Own Models

**For Architects**:
- ✅ Start with blank scene
- ✅ Only load models when explicitly clicking on client projects
- ✅ No auto-loading of own configs

**For End Users**:
- ✅ Auto-load their assigned models (existing behavior)
- ✅ Show models from their architect

---

## Code Fix

### File: `/app/components/HomeClient.tsx`

**Before**:
```typescript
const checkUserConfigs = async () => {
  if (user?.id) {
    const userConfigs = await sceneConfigService.getUserConfigs();
    const hasConfigs = userConfigs.length > 0;
    setHasUserConfig(hasConfigs);  // ❌ Sets true for architects too!
  }
}
```

**After**:
```typescript
const checkUserConfigs = async () => {
  if (user?.id) {
    // CRITICAL: Architects should NOT auto-load their own models
    if (role === 'architect') {
      console.log('👔 User is architect - skipping auto-load');
      setHasUserConfig(false);  // ✅ Force blank scene
      setConfigCheckComplete(true);
      return;
    }
    
    const userConfigs = await sceneConfigService.getUserConfigs();
    const hasConfigs = userConfigs.length > 0;
    setHasUserConfig(hasConfigs);  // Only for end users
  }
}
```

**Also added `role` dependency**:
```typescript
useEffect(() => {
  checkUserConfigs();
}, [user?.id, role]); // ✅ Now depends on role too
```

---

## Expected Behavior After Fix

### Architect Login Flow:
```
1. Ivan logs in as architect
   👔 User is architect - skipping auto-load of own models
   hasUserConfig = false

2. HomeClient renders blank scene
   ✅ No model auto-loads
   ✅ Scene is empty

3. Ivan opens "Client Models" panel
   📁 Biljana Gavrilovic: 2 projects
   📁 Ivan Prokic: 1 project
   📁 Emilija Prokic: 2 projects

4. Ivan clicks START on Biljana's project
   ✅ Loads Biljana's model explicitly
   ✅ Enables camera controls
   ✅ No interference from Ivan's models

5. Ivan switches to different client model
   ✅ Loads new model
   ✅ Ivan's ema.glb doesn't reload on top
```

### End User Login Flow (Unchanged):
```
1. Biljana logs in as end_user
   🔍 User is end_user - checking configs normally
   ✅ Found 2 configs

2. HomeClient renders scene with model
   ✅ Auto-loads assigned model
   ✅ Shows orbital camera path
```

---

## Console Logs After Fix

### Architect Login:
```
🔍 [HomeClient] Checking user configs for: ivanprokic@yahoo.com Role: architect
👔 [HomeClient] User is architect - skipping auto-load of own models
```

### End User Login:
```
🔍 [HomeClient] Checking user configs for: biljana@example.com Role: end_user
🔍 [HomeClient] User configs: 2 configs
```

---

## Why This Fixes the Auto-Reload Bug

### Before Fix:
```
Time: 0s    - Ivan logs in
Time: 0s    - hasUserConfig = true (found Ivan's configs)
Time: 0s    - SceneEditor loads ema.glb
Time: 30s   - Ivan clicks client model
Time: 30s   - Client model loads
Time: 60s   - useEffect re-runs (HMR, auth change, etc.)
Time: 60s   - checkUserConfigs() runs again
Time: 60s   - hasUserConfig = true (still finds Ivan's configs)
Time: 60s   - SceneEditor reloads ema.glb AGAIN! ❌
```

### After Fix:
```
Time: 0s    - Ivan logs in
Time: 0s    - Role = architect → skip config check
Time: 0s    - hasUserConfig = false
Time: 0s    - SceneEditor renders but no auto-load
Time: 30s   - Ivan clicks client model
Time: 30s   - Client model loads explicitly
Time: 60s   - useEffect re-runs
Time: 60s   - checkUserConfigs() runs
Time: 60s   - Role = architect → skip again
Time: 60s   - hasUserConfig = false
Time: 60s   - NO auto-reload! ✅
```

---

## Testing Checklist

### Test as Architect:
- [ ] Login as Ivan
- [ ] Verify no model auto-loads (blank scene)
- [ ] Click on client project from "Client Models"
- [ ] Verify client's model loads
- [ ] Wait 1-2 minutes
- [ ] Verify ema.glb doesn't reload on top
- [ ] Switch to different client model
- [ ] Verify new model loads without interference

### Test as End User:
- [ ] Login as Biljana
- [ ] Verify model auto-loads (existing behavior)
- [ ] Orbital camera works
- [ ] No regression

---

## Files Modified

1. `/app/components/HomeClient.tsx`
   - Added architect check in `checkUserConfigs()`
   - Added `role` dependency to useEffect
   - Added role change tracking with `prevRoleRef`

---

## Additional Safety

The fix also tracks role changes separately from user changes:
```typescript
const prevRoleRef = useRef<UserRole | null>(null);
const roleChanged = prevRoleRef.current !== role;
```

This ensures:
- ✅ Switching from guest → architect doesn't trigger auto-load
- ✅ Switching from end_user → architect doesn't trigger auto-load
- ✅ Role changes are handled gracefully

---

## Root Cause Summary

The bug was **role-agnostic config checking**. HomeClient checked for configs without considering the user's role. Architects have configs (their own models for showcasing), but shouldn't auto-load them when logging in - they should start with a blank canvas ready to work on client projects.

