// Services
export { ModelLoader } from './ModelLoader';
export { UserLoader } from './UserLoader';
export { AuthService } from './AuthService';
export { createExport } from './ExportService';
// Note: convertExport is NOT exported here to avoid client-side bundling
// It uses Node.js-only modules (fs/promises, path, crypto) and should only
// be imported directly in server-side code (API routes, server components)
export type { 
  ModelLoadResult, 
  ModelLoadOptions, 
  CameraPathData 
} from './ModelLoader';
export type { 
  User, 
  UserPreferences, 
  UserLoadResult, 
  HotspotSettings 
} from './UserLoader';
export type {
  CreateExportParams,
  CreateExportResult
} from './ExportService';
// Note: ConvertExportResult type is not exported to avoid bundling ConvertService
// Import it directly from './ConvertService' in server-side code if needed

// Configuration
export { SCENE_CONFIG, getCameraPathData, getHotspotSettings, getUserSceneConfig } from '../config/sceneConfig';
