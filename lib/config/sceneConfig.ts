import * as THREE from 'three';
import { SceneConfigService } from '@/lib/services/SceneConfigService';

/**
 * Global configuration constants for the 3D scene
 * These can be overridden by user preferences or loaded from a database
 */
export const SCENE_CONFIG = {
  // Model loading
  DEFAULT_MODEL_PATH: '/models/no-material.glb',
  
  // Camera settings
  CAMERA_FOV: 75,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 1000,
  ORBITAL_HEIGHT: 40,
  ORBITAL_RADIUS_MULTIPLIER: 6,
  ORBITAL_SPEED: 0.2,
  
  // Model transformations
  TARGET_SIZE: 30,
  SCALE_MULTIPLIER: 2,
  ROTATION_Y: Math.PI / 2,
  
  // Intro animation
  INTRO_DURATION: 3000,
  INTRO_START_POS: new THREE.Vector3(0, 20, 0),
  INTRO_END_POS: new THREE.Vector3(-6.554798188035982, 7.001298362376955, 26.293127720925533),
  
  // Hotspot settings
  HOTSPOT_COLORS: {
    NORMAL: 0x8C33FF,
    HOVER: 0xb2d926,
    PULSE: 0x8C33FF
  },
  
  PULSE_ANIMATION: {
    DURATION: 800,
    SCALE: 1.5,
    OPACITY: 0.8
  },
  
  // Focal distances for each hotspot
  HOTSPOT_FOCAL_DISTANCES: {
    "Hotspot_geo_accent_wall": 8,
    "Hotspot_geo_backsplash": 5,
    "Hotspot_geo_kitchen_cabinet": 5,
    "Hotspot_geo_bath_countertop": 5,
    "Hotspot_geo_floor": 10,
    "Hotspot_geo_fireplace": 12,
    "Hotspot_geo_coffee_table": 5,
    "Hotspot_geo_kitchen_countertop": 5,
    "Hotspot_geo_island": 5,
    "Hotspot_geo_shelves": 5,
  },
  
  // Hotspot category mapping for display labels
  HOTSPOT_CATEGORIES: {
    "Hotspot_geo_shelves": "Furniture",
    "Hotspot_geo_accent_wall": "Accent Wall",
    "Hotspot_geo_bath_countertop": "Bath Countertops",
    "Hotspot_geo_kitchen_cabinet": "Kitchen Cabinets",
    "Hotspot_geo_fireplace": "Fireplaces",
    "Hotspot_geo_floor": "Floors",
    "Hotspot_geo_kitchen_countertop": "Kitchen Countertops",
    "Hotspot_geo_coffee_table": "Furniture",
    "Hotspot_geo_island": "Kitchen Islands",
    "Hotspot_geo_backsplash": "Kitchen Backsplashes",
    "Hotspot_geo_bathroom_walls": "Bathroom Walls"
  },
  
  // Default camera path data
  DEFAULT_CAMERA_POINTS: [
    new THREE.Vector3(20, 5, 0),
    new THREE.Vector3(-8, 6.5, 2),
    new THREE.Vector3(-14, 6.75, 7),
    new THREE.Vector3(-8, 7, 24),
    new THREE.Vector3(-4, 7, 30),
    new THREE.Vector3(-2, 7.25, 32),
    new THREE.Vector3(12, 7.5, 32),
    new THREE.Vector3(20, 8, 25),
    new THREE.Vector3(16, 8, 0),
  ],
  
  DEFAULT_LOOK_AT_TARGETS: [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(4, 3, 0),
    new THREE.Vector3(6, 4, 0),
    new THREE.Vector3(7, 5, 30),
    new THREE.Vector3(10, 6, 50),
    new THREE.Vector3(20, 7, 60),
    new THREE.Vector3(30, 8, 40),
    new THREE.Vector3(30, 8, 20),
    new THREE.Vector3(0, 8, -40),
  ],
  
  // API settings
  API_HOTSPOT_KEY_ALIASES: {
    'bathroom_countertop': 'bath_countertop',
    'bathroom_countertops': 'bath_countertop',
    'kitchen_countertops': 'kitchen_countertop',
    'backsplashes': 'backsplash',
    'islands': 'island',
    'cabinets': 'kitchen_cabinet',
    'coffee_tables': 'coffee_table',
  }
} as const;

/**
 * Get camera path data for a specific model
 * Now supports user-specific configurations from the database
 */
export async function getCameraPathData(modelPath: string = SCENE_CONFIG.DEFAULT_MODEL_PATH, userId?: string) {
  if (userId) {
    try {
      const sceneConfigService = SceneConfigService.getInstance();
      sceneConfigService.setUser({ id: userId });
      
      // Try to get user's default config first
      let userConfig = await sceneConfigService.getDefaultConfig();
      
      // If no default config exists, create one
      if (!userConfig) {
        userConfig = await sceneConfigService.createDefaultConfigIfNotExists();
      }
      
      if (userConfig) {
        return {
          cameraPoints: userConfig.camera_points.map(point => new THREE.Vector3(point.x, point.y, point.z)),
          lookAtTargets: userConfig.look_at_targets.map(target => new THREE.Vector3(target.x, target.y, target.z))
        };
      }
    } catch (error) {
      console.warn('Failed to load user config, falling back to default:', error);
    }
  }
  
  // Fallback to default data
  return {
    cameraPoints: SCENE_CONFIG.DEFAULT_CAMERA_POINTS.map(point => point.clone()),
    lookAtTargets: SCENE_CONFIG.DEFAULT_LOOK_AT_TARGETS.map(target => target.clone())
  };
}

/**
 * Get hotspot settings for a specific model/user combination
 * Now supports user-specific configurations from the database
 */
export async function getHotspotSettings(modelPath: string = SCENE_CONFIG.DEFAULT_MODEL_PATH, userId?: string) {
  if (userId) {
    try {
      const sceneConfigService = SceneConfigService.getInstance();
      sceneConfigService.setUser({ id: userId });
      
      // Try to get user's default config first
      let userConfig = await sceneConfigService.getDefaultConfig();
      
      // If no default config exists, create one
      if (!userConfig) {
        userConfig = await sceneConfigService.createDefaultConfigIfNotExists();
      }
      
      if (userConfig) {
        return {
          colors: userConfig.hotspot_colors,
          pulseAnimation: userConfig.pulse_animation,
          focalDistances: userConfig.hotspot_focal_distances,
          categories: userConfig.hotspot_categories
        };
      }
    } catch (error) {
      console.warn('Failed to load user config, falling back to default:', error);
    }
  }
  
  // Fallback to default settings
  return {
    colors: SCENE_CONFIG.HOTSPOT_COLORS,
    pulseAnimation: SCENE_CONFIG.PULSE_ANIMATION,
    focalDistances: SCENE_CONFIG.HOTSPOT_FOCAL_DISTANCES,
    categories: SCENE_CONFIG.HOTSPOT_CATEGORIES
  };
}

/**
 * Get complete scene configuration for a user
 * This is the main function to use for getting user-specific scene configs
 */
export async function getUserSceneConfig(userId?: string) {
  if (userId) {
    try {
      const sceneConfigService = SceneConfigService.getInstance();
      sceneConfigService.setUser({ id: userId });
      
      // Try to get user's default config first
      let userConfig = await sceneConfigService.getDefaultConfig();
      
      // If no default config exists, create one
      if (!userConfig) {
        userConfig = await sceneConfigService.createDefaultConfigIfNotExists();
      }
      
      if (userConfig) {
        return sceneConfigService.convertToSceneConfig(userConfig);
      }
    } catch (error) {
      console.warn('Failed to load user config, falling back to default:', error);
    }
  }
  
  // Fallback to default configuration
  return SCENE_CONFIG;
}
