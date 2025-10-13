# No Auto-Load Workflow - All Users Click to Load

## Overview
All users (guest, end_user, architect, admin) now start with a **blank scene**. Models load **only when explicitly clicked** from their respective panels.

---

## Current Behavior

### Step 1: User Logs In (Any Role)
```
🔐 User logs in
🚫 [HomeClient] Skipping auto-load - all users start with blank scene
🚫 [SceneEditor] User logged in - skipping auto-load of settings
✅ SceneEditor renders (blank, event listeners active)
```

**Result**: Blank scene, no model

---

### Step 2: User Opens Panel

#### End User (Biljana):
```
Opens: DockedNavigation → "Models" panel

Sees:
  📁 Snake Plant Planter
     📁 planter.glb
     Review (Step 2 of 5)
     
  📁 Rucak Nedelja
     📁 bedroom.glb
     Review (Step 2 of 5)
```

#### Architect (Ivan):
```
Opens: DockedNavigation → "Client Models" panel

Sees:
  Biljana Gavrilovic (2 projects)
    📁 Snake Plant Planter - planter.glb [CONTINUE]
    📁 Rucak Nedelja - bedroom.glb [CONTINUE]
```

---

### Step 3: User Clicks Project

#### End User Clicks:
```javascript
// ModelsList.tsx
handleModelSelect(model) {
  📤 [ModelsList] Dispatching load-collaborative-model event...
  
  window.dispatchEvent(new CustomEvent('load-collaborative-model', {
    detail: {
      sceneConfigId: 'e277bd4d...',
      clientId: '12c23ebf...',
      enableCameraControls: false  // End users view only
    }
  }))
  
  📤 [ModelsList] Event dispatched successfully: true
}
```

#### Architect Clicks:
```javascript
// ArchitectModelsList.tsx
handleProjectAction(project) {
  // 1. Update status if PENDING_ARCHITECT
  if (status === 'pending_architect') {
    POST /api/architect-clients/update-status
    status → 'in_progress'
  }
  
  // 2. Load model with controls
  🎯 [ArchitectModelsList] Dispatching load-collaborative-model event...
  
  window.dispatchEvent(new CustomEvent('load-collaborative-model', {
    detail: {
      sceneConfigId: 'e277bd4d...',
      clientId: '12c23ebf...',
      enableCameraControls: true  // Architect can edit
    }
  }))
  
  🔍 [ArchitectModelsList] Event dispatched successfully: true
}
```

---

### Step 4: SceneEditor Receives Event

```javascript
// SceneEditor.tsx - handleLoadCollaborativeModel
🤝 [ScrollScene] ========== LOAD COLLABORATIVE MODEL EVENT ==========
🤝 [ScrollScene] Event detail: {sceneConfigId, clientId, enableCameraControls}
🤝 [ScrollScene] Loading scene config: e277bd4d...

// Load config from database
const config = await sceneConfigService.getConfigById(sceneConfigId)
const followPath = await sceneConfigService.getActiveFollowPathForConfig(config.id)

🔍 [SceneConfigService] Total follow_paths: 1
   1. "Default Orbital Path" (active: true)
✅ [SceneConfigService] Active path: "Default Orbital Path"
🎯 [SceneConfigService] Orbital height: 25

// Update state to trigger model load
setUserSceneConfig(transformedConfig)
setCameraPathData({cameraPoints, lookAtTargets})
setStoreCameraPoints(cameraPoints)  // Sync to Zustand
setStoreLookAtTargets(lookAtTargets)

✅ [ScrollScene] Collaborative model loaded successfully!
✅ [ScrollScene] Using path: Default Orbital Path
✅ [ScrollScene] Camera waypoints: 9
✅ [ScrollScene] Synced to Zustand store
🎯 [ScrollScene] Camera will orbit at height: 25
🎯 [ScrollScene] Model should now load and start orbital animation
```

---

### Step 5: Model Loads & Animation Starts

```javascript
// useEffect triggers on userSceneConfig change
useEffect(() => {
  if (userSceneConfig && sceneRef.current && !loadingConfig) {
    if (isFirstConfigLoad.current) {
      🔄 Scene config loaded (first time), skipping auto-load
      return
    }
    
    🔄 Scene config loaded, reloading model...
    loadModelWithService()  // Loads the model!
  }
}, [userSceneConfig, loadingConfig])

// Animation loop runs
animate(camera, renderer, scene) {
  updateCameraAlongCurve(camera, pathProgressRef.current.t)
  
  📹 [Camera Animation] Position: {x: 35.4, y: 25, z: 35.4, progress: 0%}
  📹 [Camera Animation] Position: {x: 30.2, y: 25, z: 40.1, progress: 5%}
  📹 [Camera Animation] Position: {x: 20.5, y: 25, z: 45.3, progress: 10%}
  ...
}
```

---

## Expected Console Log Flow

### When Biljana Clicks "Snake Plant Planter":

```
📤 [ModelsList] Model selected: {project_name: 'snake_plant_planter', scene_config_id: 'e277bd4d...'}
📤 [ModelsList] Dispatching load-collaborative-model event...
📤 [ModelsList] Event dispatched successfully: true
📤 [ModelsList] Event detail: {sceneConfigId: 'e277bd4d...', enableCameraControls: false}

🤝 [ScrollScene] ========== LOAD COLLABORATIVE MODEL EVENT ==========
🤝 [ScrollScene] Event detail: {sceneConfigId: 'e277bd4d...', clientId: '12c23ebf...'}
🤝 [ScrollScene] Loading scene config: e277bd4d...
👁️ [ScrollScene] View-only mode (no camera controls)

🔍 [SceneConfigService] Total follow_paths for config: 1
   1. "Default Orbital Path" (active: true, order: 1)
✅ [SceneConfigService] Active path: "Default Orbital Path"
✅ [SceneConfigService] Camera waypoints: 9
🎯 [SceneConfigService] Orbital height: 25

✅ [ScrollScene] Collaborative model loaded successfully!
✅ [ScrollScene] Using path: Default Orbital Path
✅ [ScrollScene] Synced to Zustand store
🎯 [ScrollScene] Camera will orbit at height: 25
🎯 [ScrollScene] ========== MODEL LOAD COMPLETE ==========

🔄 Scene config loaded, reloading model...
🎯 [ScrollScene] Model loading details:
  - Model Path: /uploads/.../planter.glb
  - Config Name: snake_plant_planter

📹 [Camera Animation] Position: {x: 35.4, y: 25.0, z: 35.4, progress: 0.0%}
📹 [Camera Animation] Position: {x: 30.2, y: 25.0, z: 40.1, progress: 12.5%}
📹 [Camera Animation] Position: {x: 11.6, y: 25.0, z: 48.6, progress: 25.0%}
... (orbital animation continues as user scrolls)
```

---

## Troubleshooting

### Issue: No event logs when clicking project
**Symptom**: No "📤 [ModelsList] Dispatching..." logs

**Fix**: 
1. Check if Models panel is showing projects
2. Verify `scene_config_id` exists for the project
3. Check browser console for errors

### Issue: Event dispatched but not received
**Symptom**: "📤 Event dispatched" but no "🤝 Event received"

**Fix**: SceneEditor not mounted
- Check if SceneEditor renders: Look for "🎧 Registered: load-collaborative-model"
- If missing, SceneEditor didn't mount yet

### Issue: Event received but no model loads
**Symptom**: "🤝 Event received" but no "🔄 Scene config loaded, reloading model"

**Fix**: Check `isFirstConfigLoad.current` flag
- Should be `false` after first event
- If `true`, model load is skipped

### Issue: Model loads but no orbital animation
**Symptom**: Model visible but camera doesn't move

**Check**:
1. Is `WITH_ORBITAL` set to `true`? (Currently `false`)
2. Are camera waypoints loaded? Look for "🎯 Camera waypoints: 9"
3. Is scroll triggering animation? Scroll down to increase `pathProgressRef.current.t`

---

## Key Files

1. `/app/components/ModelsList.tsx` - End user clicks
2. `/app/components/ArchitectModelsList.tsx` - Architect clicks
3. `/app/components/SceneEditor.tsx` - Event handler & animation
4. `/lib/services/SceneConfigService.ts` - Path loading
5. `/lib/config/defaultOrbitalPath.ts` - Orbital path generator

---

## Animation Control

### Constants:
```typescript
const WITH_ORBITAL = false  // If true, auto-orbits (no scroll needed)
const WITH_INTRO = true     // If true, plays intro animation first
```

### Scroll-Based Animation:
- User scrolls down → `pathProgressRef.current.t` increases (0 to 1)
- Camera moves along path based on scroll progress
- At `t=0`: First waypoint (45° northeast)
- At `t=0.5`: Halfway around orbit
- At `t=1`: Complete circle (back to start)

### Auto-Orbit (if WITH_ORBITAL = true):
- Camera automatically orbits
- No scroll needed
- Infinite loop

---

## Next Steps to Enable Auto-Orbit

If you want infinite orbital rotation without scroll:

1. Set `WITH_ORBITAL = true` in SceneEditor.tsx
2. Implement or verify `animateOrbital()` function exists
3. Camera will automatically rotate around model

OR

Keep scroll-based and camera moves as user scrolls (current setup).

