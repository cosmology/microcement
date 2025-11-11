# Zustand Migration - Testing Checklist

## ✅ Completed Implementation

### Core Infrastructure
- [x] Zustand installed and configured
- [x] 4 core stores created (userProfile, scene, camera, dockedNavigation)
- [x] SceneEditor package structure created
- [x] Utility classes extracted (CameraController, ModelLoader, PathVisualsManager)
- [x] Bridge component created (SceneEditorContainer)
- [x] DockedNavigation migrated to stores
- [x] HomeClient updated to use new imports

## 🧪 Testing Steps

### 1. Application Startup
- [ ] App starts without errors
- [ ] No console warnings about Zustand
- [ ] Redux DevTools shows all 4 stores
- [ ] Models load correctly

### 2. Docked Navigation (Left Panel)
- [ ] Navigation expands/collapses on hover
- [ ] "My Models" / "Client Models" panel opens
- [ ] "Uploads" panel opens
- [ ] "Upload Project" / "Submit Brief" modal opens
- [ ] Panel close buttons work

### 3. Camera Controls (Admin/Architect only)
- [ ] **Bird View Button**
  - [ ] Clicking toggles bird view
  - [ ] Camera animates to overhead position
  - [ ] Button background turns purple when active
  - [ ] Clicking again returns to camera path view
  
- [ ] **Bird View Lock Button**
  - [ ] Shows next to bird view when active
  - [ ] Locks camera in bird view
  - [ ] Prevents auto-switching on scroll
  - [ ] Button background turns purple when locked
  
- [ ] **Editor Toggle Button**
  - [ ] Enables camera path editor
  - [ ] Shows editor overlay with path points
  - [ ] Button background turns purple when active
  - [ ] Reveals LookAt and Height Panel buttons
  
- [ ] **LookAt Targets Button** (only visible when editor enabled)
  - [ ] Shows orange spheres for lookAt targets
  - [ ] Button background turns purple when active
  - [ ] Targets can be dragged in editor
  
- [ ] **Height Panel Button** (only visible when editor enabled)
  - [ ] Opens height adjustment panel
  - [ ] Shows height slider for selected point
  - [ ] Updates camera point height in real-time

### 4. Model Operations
- [ ] **Upload Model**
  - [ ] Upload modal opens
  - [ ] Form validation works
  - [ ] Model uploads successfully
  - [ ] Model appears in "My Models" / "Client Models"
  - [ ] Docked navigation collapses after upload
  
- [ ] **Load Model**
  - [ ] Clicking model in list loads it
  - [ ] Loading progress shows
  - [ ] Model renders in scene
  - [ ] Camera path updates
  
- [ ] **Clear Scene**
  - [ ] Button removes current model
  - [ ] Scene resets to empty state
  - [ ] Camera path visuals removed
  
- [ ] **Rotate Model**
  - [ ] Button rotates model 90° around Y-axis
  - [ ] Rotation animates smoothly

### 5. Store State Verification

Open Redux DevTools and verify:

- [ ] **CameraStore** shows:
  - `isBirdView` updates on toggle
  - `isEditorEnabled` updates on toggle
  - `showLookAtTargets` updates on toggle
  - `cameraPoints` populated from database
  - `lookAtTargets` populated from database
  
- [ ] **SceneStore** shows:
  - `currentConfig` populated when model loads
  - `currentFollowPath` populated from database
  - `modelLoaded` true after load
  - `modelLoadingProgress` 0-100 during load
  
- [ ] **DockedNavigationStore** shows:
  - `isCollapsed` toggles on hover
  - `showModelsList` true when panel open
  - `showUploadModal` true when modal open
  - `showUploads` true when uploads panel open
  
- [ ] **UserProfileStore** shows:
  - `user` populated after login
  - `profile` with correct role
  - `isAuthenticated` true after login

### 6. Console Logs

Look for these key logs:

```
🎯 [CameraStore] Setting isBirdView: true
🔄 [SceneEditorContainer] Dispatching bird-view-animation: true
🦅 [CameraController] Bird view animation complete
📷 [CameraController] Path position animation complete
🔄 [SceneStore] Loading config: <uuid>
📦 [ModelLoader] Loading model: /models/ema.glb
✅ [ModelLoader] Model loaded successfully
🎨 [PathVisuals] Adding path visuals: { showPath: true, ... }
```

### 7. No Errors/Warnings

Verify NO errors for:
- [ ] "Property does not exist on window"
- [ ] "Cannot read property of undefined"
- [ ] "Missing event listener"
- [ ] "State update on unmounted component"
- [ ] TypeScript errors in console

### 8. Role-Based Behavior

#### Guest (not logged in)
- [ ] No docked navigation
- [ ] No camera controls
- [ ] Public content only

#### End User (biljana.h.g@gmail.com)
- [ ] Docked navigation shows
- [ ] "My Models" panel works
- [ ] "Upload Project" modal works
- [ ] **NO camera control buttons** (bird view, editor, etc.)

#### Architect (ivanprokic@yahoo.com)
- [ ] Docked navigation shows
- [ ] "Client Models" panel works
- [ ] **Camera control buttons visible**
- [ ] Bird view works
- [ ] Editor works
- [ ] Can edit camera paths

#### Admin (ivanprokic@gmail.com)
- [ ] All architect features
- [ ] Camera control buttons visible
- [ ] Full editing rights

### 9. Scroll Behavior
- [ ] Scroll updates camera position along path
- [ ] Timeline waypoints advance on scroll
- [ ] Bird view lock prevents auto-switching
- [ ] Intro animation plays on first load

### 10. Hotspots & Interactions
- [ ] Hotspots clickable
- [ ] Gallery modal opens from hotspots
- [ ] Gallery back button works (even in editor mode)
- [ ] Hotspot tooltips show

## 🐛 Known Issues (Expected)

These are temporary during migration:

1. **Event Bridge Still Active**
   - SceneEditorContainer dispatches events to legacy code
   - This is intentional - full migration pending

2. **Some Window Globals Remain**
   - `sceneEditorCamera`, `sceneEditorRenderer`, `sceneEditorScene`
   - Will be removed in Phase 2

3. **clear-scene and rotate-model Still Use Events**
   - Temporary until SceneEditor core is refactored

## 📊 Performance Checks

- [ ] Bird view animation smooth (no jank)
- [ ] Model loading doesn't freeze UI
- [ ] Scroll performance acceptable
- [ ] No memory leaks (check DevTools Memory tab)
- [ ] Store updates don't cause unnecessary re-renders

## 🎯 Success Criteria

### Must Work
✅ All camera controls update stores
✅ Stores sync with SceneEditor via bridge
✅ No TypeScript errors
✅ No runtime errors
✅ Bird view animation works
✅ Editor toggle works
✅ Models load/unload correctly

### Nice to Have
- Redux DevTools shows clean state history
- Console logs are informative, not spammy
- Performance is good (no lag)

## 🚀 Next Phase

Once testing passes, Phase 2 begins:

1. Remove event listeners from SceneEditor core
2. Replace window globals with store refs
3. Migrate camera animations to CameraController
4. Migrate model loading to ModelLoader
5. Remove event bridge entirely

## 📝 Notes

- Test on both desktop and mobile
- Test in both light and dark themes
- Test with different user roles
- Check browser console for any warnings
- Use Redux DevTools to inspect state changes

## ✉️ Report Issues

If any tests fail, note:
1. What you clicked/did
2. Expected behavior
3. Actual behavior
4. Console errors (if any)
5. Store state (from Redux DevTools)

