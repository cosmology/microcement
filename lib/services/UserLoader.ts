import * as THREE from 'three';

export interface User {
  id: string;
  name: string;
  email: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  modelPath: string;
  customCameraPaths?: Map<string, CameraPathData>;
  hotspotSettings?: HotspotSettings;
}

export interface CameraPathData {
  cameraPoints: THREE.Vector3[];
  lookAtTargets: THREE.Vector3[];
}

export interface HotspotSettings {
  colors: {
    normal: number;
    hover: number;
    pulse: number;
  };
  pulseAnimation: {
    duration: number;
    scale: number;
    opacity: number;
  };
  focalDistances: Record<string, number>;
}

export interface UserLoadResult {
  user: User | null;
  isAuthenticated: boolean;
  modelPath: string;
  cameraPathData: CameraPathData;
  hotspotSettings: HotspotSettings;
}

export class UserLoader {
  private static instance: UserLoader;
  private currentUser: User | null = null;
  private isInitialized = false;
  
  // Default settings for non-authenticated users
  private defaultSettings = {
    modelPath: '/models/no-material.glb',
    cameraPathData: {
      cameraPoints: [
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
      lookAtTargets: [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(4, 3, 0),
        new THREE.Vector3(6, 4, 0),
        new THREE.Vector3(7, 5, 30),
        new THREE.Vector3(10, 6, 50),
        new THREE.Vector3(20, 7, 60),
        new THREE.Vector3(30, 8, 40),
        new THREE.Vector3(30, 8, 20),
        new THREE.Vector3(0, 8, -40),
      ]
    },
    hotspotSettings: {
      colors: {
        normal: 0x8C33FF,
        hover: 0xb2d926,
        pulse: 0x8C33FF
      },
      pulseAnimation: {
        duration: 800,
        scale: 1.5,
        opacity: 0.8
      },
      focalDistances: {
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
      }
    }
  };

  private constructor() {}

  public static getInstance(): UserLoader {
    if (!UserLoader.instance) {
      UserLoader.instance = new UserLoader();
    }
    return UserLoader.instance;
  }

  /**
   * Initialize the UserLoader
   * This would typically check for authentication tokens, load user data, etc.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // TODO: Implement actual authentication logic
      // This could include:
      // 1. Checking for JWT tokens in localStorage/cookies
      // 2. Validating tokens with backend
      // 3. Loading user preferences from database
      // 4. Setting up real-time updates for user data
      
      console.log('UserLoader initialized');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize UserLoader:', error);
      throw error;
    }
  }

  /**
   * Load user data and preferences
   */
  public async loadUser(): Promise<UserLoadResult> {
    await this.initialize();

    // TODO: Implement actual user loading logic
    // For now, return default settings for anonymous users
    
    const result: UserLoadResult = {
      user: this.currentUser,
      isAuthenticated: !!this.currentUser,
      modelPath: this.currentUser?.preferences.modelPath || this.defaultSettings.modelPath,
      cameraPathData: this.currentUser?.preferences.customCameraPaths?.get(this.defaultSettings.modelPath) || this.defaultSettings.cameraPathData,
      hotspotSettings: this.currentUser?.preferences.hotspotSettings || this.defaultSettings.hotspotSettings
    };

    return result;
  }

  /**
   * Authenticate user (placeholder for future implementation)
   */
  public async authenticate(credentials: { email: string; password: string }): Promise<User> {
    // TODO: Implement actual authentication
    // This would typically:
    // 1. Send credentials to backend
    // 2. Receive JWT token
    // 3. Store token securely
    // 4. Load user data
    // 5. Update currentUser
    
    throw new Error('Authentication not implemented yet');
  }

  /**
   * Logout user
   */
  public async logout(): Promise<void> {
    // TODO: Implement logout logic
    // This would typically:
    // 1. Clear stored tokens
    // 2. Clear user data
    // 3. Redirect to login page
    
    this.currentUser = null;
    console.log('User logged out');
  }

  /**
   * Update user preferences
   */
  public async updatePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    // TODO: Implement actual preference saving
    // This would typically:
    // 1. Send updated preferences to backend
    // 2. Update local user data
    // 3. Trigger re-render of components that depend on preferences
    
    this.currentUser.preferences = {
      ...this.currentUser.preferences,
      ...preferences
    };
    
    console.log('User preferences updated:', preferences);
  }

  /**
   * Get current user
   */
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  public isUserAuthenticated(): boolean {
    return !!this.currentUser;
  }

  /**
   * Get user's model path
   */
  public getUserModelPath(): string {
    return this.currentUser?.preferences.modelPath || this.defaultSettings.modelPath;
  }

  /**
   * Get user's camera path data for a specific model
   */
  public getUserCameraPathData(modelPath: string): CameraPathData {
    if (this.currentUser?.preferences.customCameraPaths?.has(modelPath)) {
      return this.currentUser.preferences.customCameraPaths.get(modelPath)!;
    }
    return this.defaultSettings.cameraPathData;
  }

  /**
   * Get user's hotspot settings
   */
  public getUserHotspotSettings(): HotspotSettings {
    return this.currentUser?.preferences.hotspotSettings || this.defaultSettings.hotspotSettings;
  }

  /**
   * Set custom camera path for a model (placeholder for future implementation)
   */
  public async setCustomCameraPath(modelPath: string, cameraPathData: CameraPathData): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    // TODO: Implement actual saving to database
    if (!this.currentUser.preferences.customCameraPaths) {
      this.currentUser.preferences.customCameraPaths = new Map();
    }
    
    this.currentUser.preferences.customCameraPaths.set(modelPath, cameraPathData);
    console.log('Custom camera path saved for model:', modelPath);
  }
}
