# Three-Panel Workflow

## Overview
Three distinct ways to view 3D models with different levels of customization.

---

## 1. 👋 Guest Experience (First Visit)

### Behavior:
- **Auto-loads**: Default showcase model (`/models/ema.glb` or configured default)
- **Animation**: Infinite orbital rotation (`WITH_ORBITAL = true`)
- **Camera**: Looks at center `(0, 0, 0)`
- **Purpose**: Demonstrate the platform's capabilities

### Console Logs:
```
👋 [SceneEditor] Guest user - loading default showcase scene
👋 [SceneEditor] WITH_ORBITAL is: ENABLED (infinite rotation)
🎯 [ScrollScene] Model loading details:
  - Model Path: /models/ema.glb
  - Config Name: default
📹 [Camera Animation] Position: {x: 35.4, y: 25, z: 35.4, progress: 0%}
... (camera orbits automatically)
```

### User Sees:
- Default model rotating smoothly
- Infinite orbit around center
- Can scroll to explore
- Prompt to login/register

---

## 2. 📦 My Uploads (Raw Model Only)

### Trigger:
End user or architect clicks on item in **"My Uploads"** panel

### Behavior:
- **Loads**: JUST the uploaded `.glb` file
- **No**: Architect hotspots
- **No**: Custom camera paths
- **No**: Materials/textures customizations
- **Yes**: Default orbital path from upload

### Event:
```javascript
window.dispatchEvent(new CustomEvent('load-uploaded-model', {
  detail: {
    modelPath: '/uploads/.../planter.glb',
    projectName: 'Snake Plant Planter',
    rawModelOnly: true  ← KEY FLAG
  }
}))
```

### Console Logs:
```
📤 [UploadsList] Asset selected: Snake Plant Planter
📤 [UploadsList] Loading RAW MODEL ONLY (no architect hotspots/paths)
📤 [UploadsList] Event dispatched successfully: true
📤 [UploadsList] Raw model flag: true

📤 [ScrollScene] ========== LOAD UPLOADED MODEL EVENT ==========
📦 [ScrollScene] RAW MODEL MODE - Loading without architect customizations
📦 [ScrollScene] No hotspots, no custom paths, just the uploaded file
🎯 Model loads with default orbital path (height: 25)
```

### User Sees:
- Their uploaded model only
- Default orbital camera (9 waypoints, height 25)
- No interactive hotspots
- Pure geometry preview

### Use Case:
- "I just want to see my uploaded file"
- "Preview before architect starts working"
- "Check if model uploaded correctly"

---

## 3. 🎨 Models (Full Architect Project)

### Trigger:
End user clicks on item in **"Models"** panel

### Behavior:
- **Loads**: Complete architect-designed project
- **Yes**: Custom hotspots (clickable areas)
- **Yes**: Custom camera paths (architect-created follow_paths)
- **Yes**: Materials/textures (future)
- **Yes**: Architect's creative work

### Event:
```javascript
window.dispatchEvent(new CustomEvent('load-collaborative-model', {
  detail: {
    sceneConfigId: 'e277bd4d...',
    clientId: '12c23ebf...',
    fullProject: true,  ← KEY FLAG
    enableCameraControls: false  // End user views, doesn't edit
  }
}))
```

### Console Logs:
```
📤 [ModelsList] Loading FULL PROJECT (with architect hotspots/paths)
📤 [ModelsList] Event dispatched successfully: true
📤 [ModelsList] Full project flag: true

🤝 [ScrollScene] ========== LOAD COLLABORATIVE MODEL EVENT ==========
🤝 [ScrollScene] Loading scene config: e277bd4d...
👁️ [ScrollScene] View-only mode (no camera controls)

🔍 [SceneConfigService] Total follow_paths: 1
   1. "Kitchen Walkthrough" (active: true)  ← Architect's custom path
✅ [SceneConfigService] Camera waypoints: 12 (architect edited)
🎯 [SceneConfigService] Orbital height: 15 (customized)

🎯 HOTSPOT #1 FOUND: Kitchen_Counter
🎯 HOTSPOT #2 FOUND: Backsplash
... (architect-placed hotspots)
```

### User Sees:
- Model with architect's customizations
- Interactive hotspots (click to zoom)
- Custom camera path (architect-designed tour)
- Professional walkthrough experience

### Use Case:
- "I want to see what my architect created"
- "Review the design before approval"
- "Experience the full interactive walkthrough"

---

## Comparison Table

| Feature | Guest | My Uploads | Models |
|---------|-------|------------|--------|
| **Model** | Default showcase | User's uploaded file | Architect's project |
| **Camera Path** | Default orbital | Default orbital | Architect-custom |
| **Hotspots** | Default (showcase) | ❌ None | ✅ Custom |
| **Materials** | Default | ❌ None | ✅ Custom (future) |
| **Animation** | Infinite orbit | Scroll-based | Scroll-based |
| **Editable** | ❌ No | ❌ No | ✅ By architect only |
| **Purpose** | Demo platform | Preview upload | Review design |

---

## Event Flags Summary

### load-uploaded-model
```typescript
{
  modelPath: string,
  projectName: string,
  assetId: string,
  rawModelOnly: true  // Load without architect customizations
}
```

### load-collaborative-model
```typescript
{
  sceneConfigId: string,
  clientId: string,
  fullProject: true,  // Load with all architect work
  enableCameraControls: boolean  // true for architect, false for end_user
}
```

---

## Database Mapping

### My Uploads → `user_assets`
```sql
SELECT 
  id,
  object_path,  ← Just the file path
  project_name
FROM user_assets
WHERE owner_id = '12c23ebf...'
```

### Models → `scene_design_configs` + `architect_clients`
```sql
SELECT 
  sdc.id as scene_config_id,
  sdc.model_path,  ← Model file
  ac.project_name,
  ac.status
FROM architect_clients ac
JOIN scene_design_configs sdc ON sdc.user_id = ac.client_id
WHERE ac.client_id = '12c23ebf...'
AND ac.architect_id IS NOT NULL

-- Then load:
- scene_follow_paths (custom camera paths)
- scene_hotspots (interactive areas)  
- future: materials, textures, etc.
```

---

## Architect Workflow

When architect clicks from "Client Models":
```typescript
{
  sceneConfigId: string,
  clientId: string,
  fullProject: true,
  enableCameraControls: true  ← KEY DIFFERENCE: Architect can edit!
}
```

**Result**:
- Loads full project
- Camera controls panel appears
- Can edit waypoints, lookAt targets, heights
- Auto-saves changes to database

---

## Implementation Status

✅ Guest - Default orbital (WITH_ORBITAL = true)
✅ My Uploads - Raw model flag added
✅ Models - Full project flag added
✅ Event handlers differentiate between modes
✅ Console logging for debugging

---

## Next Steps

### Immediate:
1. Test guest experience (should auto-orbit)
2. Test "My Uploads" click (raw model only)
3. Test "Models" click (full project)

### Future Enhancements:
1. Different default orbital speeds for different model types
2. Material/texture customization support
3. Lighting customization
4. Environment maps

