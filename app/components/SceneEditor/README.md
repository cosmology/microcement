# SceneEditor Package

## Overview

The SceneEditor package is a modular, store-based architecture for managing 3D scenes with Three.js and Zustand state management. This refactor eliminates window globals and event dispatching in favor of reactive store subscriptions.

## Architecture

```
SceneEditor/
├── index.ts                          # Main exports
├── SceneEditorContainer.tsx          # Bridge component (store ↔ legacy)
├── types/
│   └── index.ts                      # TypeScript interfaces
├── utils/
│   ├── cameraController.ts           # Camera animations and controls
│   ├── modelLoader.ts                # GLTF/GLB model loading
│   └── pathVisuals.ts                # Camera path visualization
└── hooks/
    └── useSceneEditorStores.ts       # Store subscriptions hook
```

## Components

### SceneEditorContainer

The main entry point that bridges Zustand stores with the legacy SceneEditor component.

**Responsibilities:**
- Subscribe to camera and scene stores
- Dispatch custom events to legacy SceneEditor (temporary bridge)
- Sync state changes between stores and legacy code

**Store Integration:**
- `useCameraStore()` - Camera controls, bird view, editor state
- `useSceneStore()` - Scene config, model loading, progress

## Utilities

### CameraController

Manages all camera animations and positioning.

**Methods:**
- `animateToBirdView()` - Animate to overhead view
- `animateToPathPosition()` - Animate to specific point on path
- `animateIntro()` - Intro sequence animation
- `updateCameraOnPath()` - Update camera based on scroll progress
- `killAllTweens()` - Cancel all animations

### ModelLoader

Handles 3D model loading and preparation.

**Methods:**
- `loadModel(path, onProgress)` - Load GLTF/GLB model
- `prepareModel(model, config)` - Apply scale, position, rotation
- `centerModel(model)` - Center model to origin
- `getModelBounds(model)` - Get bounding box info
- `disposeModel(model)` - Clean up model resources

### PathVisualsManager

Manages camera path visualization in the scene.

**Methods:**
- `addPathVisuals(cameraPoints, lookAtTargets, config)` - Add visual markers
- `removePathVisuals()` - Remove all visuals
- `updatePathVisuals(cameraPoints, lookAtTargets)` - Update existing visuals
- `toggleVisibility(visible)` - Show/hide visuals

## Hooks

### useSceneEditorStores

Custom hook for managing store subscriptions and Three.js scene sync.

**Returns:**
- `isBirdView` - Current bird view state
- `cameraPoints` - Camera path points
- `lookAtTargets` - Camera look-at targets
- `currentFollowPath` - Active follow path config
- `setModelLoadingProgress` - Function to update loading progress

**Side Effects:**
- Syncs bird view changes with CameraController
- Syncs follow path data to camera store

## Store Integration

### Camera Store (`useCameraStore`)

**State:**
- `isBirdView` - Bird view active/inactive
- `isBirdViewLocked` - Prevent auto-switching on scroll
- `isEditorEnabled` - Camera path editor enabled
- `showLookAtTargets` - Display lookAt target spheres
- `showHeightPanel` - Height adjustment panel visible
- `cameraPoints` - Array of camera positions
- `lookAtTargets` - Array of lookAt positions
- `currentPosition` - Current camera position
- `currentLookAt` - Current lookAt target
- `currentFOV` - Current field of view

**Actions:**
- `toggleBirdView()` - Toggle bird view
- `toggleEditor()` - Toggle editor
- `toggleLookAtTargets()` - Toggle target visibility
- `toggleHeightPanel()` - Toggle height panel
- `setCameraPoints(points)` - Update camera points
- `updateCameraPoint(index, point)` - Update single point
- `setLookAtTargets(targets)` - Update lookAt targets
- `updateLookAtTarget(index, target)` - Update single target

### Scene Store (`useSceneStore`)

**State:**
- `currentConfig` - Active scene configuration
- `currentFollowPath` - Active camera path
- `modelLoaded` - Model load status
- `modelPath` - Path to current model
- `modelLoadingProgress` - Loading percentage (0-100)
- `sceneStage` - Current animation stage
- `currentSection` - Current page section
- `introComplete` - Intro animation finished
- `scrollEnabled` - Scroll input enabled

**Actions:**
- `setCurrentConfig(config)` - Set scene config
- `setModelLoaded(loaded)` - Update load status
- `setModelLoadingProgress(progress)` - Update progress
- `clearScene()` - Clear current scene
- `reset()` - Reset all state

### Docked Navigation Store (`useDockedNavigationStore`)

**State:**
- `isCollapsed` - Navigation collapsed/expanded
- `showModelsList` - Models panel visible
- `showUploadModal` - Upload modal visible
- `showUploads` - Uploads panel visible

**Actions:**
- `openModelsList()` - Open models panel
- `openUploads()` - Open uploads panel
- `openUploadModal()` - Open upload modal
- `closeAllPanels()` - Close all panels

## Migration Strategy

### Phase 1: Bridge Layer (✅ COMPLETED)

- ✅ Create store architecture
- ✅ Create utility classes
- ✅ Create `SceneEditorContainer` bridge
- ✅ Dispatch events from stores to legacy code
- ✅ Listen to events from legacy code and sync to stores

### Phase 2: Gradual Refactor (IN PROGRESS)

1. Migrate camera animations to use `CameraController`
2. Migrate model loading to use `ModelLoader`
3. Migrate path visuals to use `PathVisualsManager`
4. Remove event listeners from legacy SceneEditor
5. Replace window globals with store subscriptions

### Phase 3: Full Migration (FUTURE)

1. Rewrite SceneEditor core logic
2. Remove event bridge entirely
3. Direct store subscriptions throughout
4. Remove all legacy code

## Usage Example

```tsx
import { SceneEditor } from './SceneEditor'

export default function MyComponent() {
  return (
    <SceneEditor
      sceneStage={0}
      currentSection="hero"
      onIntroComplete={() => console.log('Intro done')}
      user={currentUser}
    />
  )
}
```

## Benefits of This Architecture

### 1. **Centralized State**
- All state in Zustand stores
- No scattered `useState` hooks
- Single source of truth

### 2. **No Window Globals**
- Eliminated `window.__isBirdView`, etc.
- Clean, testable code
- No global pollution

### 3. **No Event Dispatching**
- Direct store actions replace events
- Better TypeScript support
- Easier to trace data flow

### 4. **Modular & Testable**
- Utility classes can be tested independently
- Clear separation of concerns
- Easier to maintain

### 5. **Performance**
- Zustand subscriptions are optimized
- Only re-render on relevant changes
- Reduced unnecessary updates

## Testing

Each utility class can be tested independently:

```ts
import { CameraController } from './utils/cameraController'
import * as THREE from 'three'

const camera = new THREE.PerspectiveCamera()
const controller = new CameraController(camera)

controller.animateToBirdView(() => {
  console.log('Animation complete')
})
```

## Future Enhancements

1. **Scene State Persistence** - Save/load scene state from localStorage
2. **Undo/Redo** - Implement command pattern for camera edits
3. **Animation Timeline** - Visual timeline for intro sequences
4. **Camera Presets** - Save/load camera position presets
5. **Multi-scene Support** - Switch between multiple scenes

## Contributing

When adding new features:

1. Add state to appropriate store (`cameraStore`, `sceneStore`, etc.)
2. Create utility classes for complex logic
3. Use hooks to subscribe to store changes
4. Keep components thin - delegate to utilities
5. Document all exports in this README

## Migration Checklist

- [x] Create store architecture
- [x] Create utility classes
- [x] Create bridge container
- [x] Update DockedNavigation to use stores
- [x] Update HomeClient imports
- [ ] Migrate camera animations
- [ ] Migrate model loading
- [ ] Migrate path visuals
- [ ] Remove event system
- [ ] Remove window globals
- [ ] Rewrite SceneEditor core
- [ ] Remove bridge layer

