// Main SceneEditor component (default export for dynamic import)
// NOTE: Bridge removed - SceneEditor now subscribes to stores directly
export { default } from '../SceneEditor'
export { default as SceneEditor } from '../SceneEditor'

// Types
export type { CameraPoint, SceneEditorProps, ModelLoadResult, PathVisualsConfig } from './types'

// Utils
export { CameraController } from './utils/cameraController'
export { ModelLoader } from './utils/modelLoader'
export { PathVisualsManager } from './utils/pathVisuals'

// Hooks
export { useSceneEditorStores } from './hooks/useSceneEditorStores'

