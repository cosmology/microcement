// Central export for all Zustand stores
export { useUserProfileStore } from './userProfileStore'
export type { UserRole } from './userProfileStore'

export { useSceneStore } from './sceneStore'
export type { ProjectStatus } from './sceneStore'

export { useCameraStore } from './cameraStore'

export { useDockedNavigationStore } from './dockedNavigationStore'

// Export the old cameraEditorStore for backwards compatibility (will be removed)
export { useCameraEditorStore } from './cameraEditorStore'

