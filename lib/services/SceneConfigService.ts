import { supabase, UserSceneConfig } from '@/lib/supabase'
import { SCENE_CONFIG } from '@/lib/config/sceneConfig'
import { getFollowPaths } from '@/lib/config/localFollowPaths'

export class SceneConfigService {
  private static instance: SceneConfigService
  private currentUser: any = null
  // Simple in-memory caches per user to avoid repeated network calls
  private userConfigsCache: Map<string, UserSceneConfig[]> = new Map()
  private defaultConfigCache: Map<string, UserSceneConfig | null> = new Map()
  private pendingUserConfigs: Map<string, Promise<UserSceneConfig[]>> = new Map()
  private pendingDefaultConfig: Map<string, Promise<UserSceneConfig | null>> = new Map()

  static getInstance(): SceneConfigService {
    if (!SceneConfigService.instance) {
      SceneConfigService.instance = new SceneConfigService()
    }
    return SceneConfigService.instance
  }

  setUser(user: any) {
    this.currentUser = user
    // Optional: clear caches when switching user to avoid leakage
    // Keep only the active user's entries to minimize memory
    if (user?.id) {
      const keepId = user.id as string
      ;[...this.userConfigsCache.keys()].forEach(k => { if (k !== keepId) this.userConfigsCache.delete(k) })
      ;[...this.defaultConfigCache.keys()].forEach(k => { if (k !== keepId) this.defaultConfigCache.delete(k) })
      this.pendingUserConfigs.clear()
      this.pendingDefaultConfig.clear()
    }
  }

  async getUserConfigs(): Promise<UserSceneConfig[]> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }

    // All authenticated users can access their scene configs

    const userId: string = this.currentUser.id

    // Serve from cache if available
    const cached = this.userConfigsCache.get(userId)
    if (cached) return cached

    // Deduplicate concurrent requests
    const pending = this.pendingUserConfigs.get(userId)
    if (pending) return pending

    const promise = (async () => {
      const { data, error } = await supabase
        .from('scene_design_configs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      const result = data || []
      this.userConfigsCache.set(userId, result)
      this.pendingUserConfigs.delete(userId)
      return result
    })()

    this.pendingUserConfigs.set(userId, promise)
    return promise
  }

  async getConfigById(id: string): Promise<UserSceneConfig | null> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('scene_design_configs')
      .select('*')
      .eq('id', id)
      .eq('user_id', this.currentUser.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Config not found
      }
      throw new Error(error.message)
    }

    return data
  }

  async getDefaultConfig(): Promise<UserSceneConfig | null> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }

    // All authenticated users can access their default config

    const userId: string = this.currentUser.id

    // Serve from cache if available
    if (this.defaultConfigCache.has(userId)) {
      return this.defaultConfigCache.get(userId) ?? null
    }

    // Deduplicate concurrent requests
    const pending = this.pendingDefaultConfig.get(userId)
    if (pending) return pending

    const promise = (async () => {
      const { data, error } = await supabase
        .from('scene_design_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single()

      if (error) {
        if ((error as any).code === 'PGRST116') {
          this.defaultConfigCache.set(userId, null)
          this.pendingDefaultConfig.delete(userId)
          return null // No default config found
        }
        throw new Error(error.message)
      }

      this.defaultConfigCache.set(userId, data)
      this.pendingDefaultConfig.delete(userId)
      return data
    })()

    this.pendingDefaultConfig.set(userId, promise)
    return promise
  }

  // Fetch all follow paths for a given scene design config
  async getAllFollowPathsForConfig(sceneDesignConfigId: string): Promise<Array<{ id: string; scene_design_config_id: string; path_name: string; camera_points: Array<{ x: number; y: number; z: number }>; look_at_targets: Array<{ x: number; y: number; z: number }>; is_active: boolean }>> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [SceneConfigService] getAllFollowPathsForConfig called with sceneDesignConfigId:', sceneDesignConfigId);
    }

    // Check if we should use local follow paths
    const useLocalPaths = process.env.NEXT_PUBLIC_LOCAL_FOLLOW_PATHS === 'true';
    
    if (useLocalPaths) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🏠 [SceneConfigService] Using local follow paths data');
      }
      const localPaths = getFollowPaths(sceneDesignConfigId);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 [SceneConfigService] Local follow paths result:', localPaths.length, 'paths found');
        localPaths.forEach(path => {
          console.log(`  - "${path.path_name}" (active: ${path.is_active}) with ${path.camera_points?.length || 0} points`);
        });
      }
      
      return localPaths;
    }

    // Use database data
    const { data, error } = await supabase
      .from('scene_follow_paths')
      .select('id, scene_design_config_id, path_name, camera_points, look_at_targets, is_active')
      .eq('scene_design_config_id', sceneDesignConfigId)
      .order('created_at', { ascending: false })

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [SceneConfigService] Error fetching all follow paths:', error);
      }
      throw new Error(error.message)
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 [SceneConfigService] Database follow paths result:', data?.length || 0, 'paths found');
      data?.forEach(path => {
        console.log(`  - "${path.path_name}" (active: ${path.is_active}) with ${path.camera_points?.length || 0} points`);
      });
    }

    return data || []
  }

  // Fetch the active follow path for a given scene design config
  async getActiveFollowPathForConfig(sceneDesignConfigId: string): Promise<{ id: string; scene_design_config_id: string; path_name: string; camera_points: Array<{ x: number; y: number; z: number }>; look_at_targets: Array<{ x: number; y: number; z: number }>; is_active: boolean } | null> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [SceneConfigService] getActiveFollowPathForConfig called with sceneDesignConfigId:', sceneDesignConfigId);
    }

    // Check if we should use local follow paths
    const useLocalPaths = process.env.NEXT_PUBLIC_LOCAL_FOLLOW_PATHS === 'true';
    
    if (useLocalPaths) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🏠 [SceneConfigService] Using local follow paths data for active path');
      }
      const localPaths = getFollowPaths(sceneDesignConfigId);
      const activePath = localPaths.find(path => path.is_active) || null;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 [SceneConfigService] Local active follow path result:', activePath ? `Found path "${activePath.path_name}" with ${activePath.camera_points?.length || 0} points` : 'No active path found');
      }
      
      return activePath;
    }

    // Use database data
    const { data, error } = await supabase
      .from('scene_follow_paths')
      .select('id, scene_design_config_id, path_name, camera_points, look_at_targets, is_active')
      .eq('scene_design_config_id', sceneDesignConfigId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [SceneConfigService] Error fetching active follow path:', error);
      }
      throw new Error(error.message)
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 [SceneConfigService] Database active follow path result:', data ? `Found path "${data.path_name}" with ${data.camera_points?.length || 0} points` : 'No active path found');
    }

    return data || null
  }

  async createConfig(configData: Partial<UserSceneConfig>, configName: string = 'default'): Promise<UserSceneConfig> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }

    // All authenticated users can create scene configs

    const { data, error } = await supabase
      .from('scene_design_configs')
      .insert({
        user_id: this.currentUser.id,
        config_name: configName,
        // Only fields that exist on scene_design_configs
        model_path: (configData as any).model_path,
        camera_fov: (configData as any).camera_fov,
        camera_near: (configData as any).camera_near,
        camera_far: (configData as any).camera_far,
        orbital_height: (configData as any).orbital_height,
        orbital_radius_multiplier: (configData as any).orbital_radius_multiplier,
        orbital_speed: (configData as any).orbital_speed,
        target_size: (configData as any).target_size,
        scale_multiplier: (configData as any).scale_multiplier,
        rotation_y: (configData as any).rotation_y,
        intro_duration: (configData as any).intro_duration,
        intro_start_pos: (configData as any).intro_start_pos,
        intro_end_pos: (configData as any).intro_end_pos,
        hotspot_colors: (configData as any).hotspot_colors,
        pulse_animation: (configData as any).pulse_animation,
        hotspot_focal_distances: (configData as any).hotspot_focal_distances,
        hotspot_categories: (configData as any).hotspot_categories,
        look_at_targets: (configData as any).look_at_targets,
        api_hotspot_key_aliases: (configData as any).api_hotspot_key_aliases,
        is_default: (configData as any).is_default ?? false
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  async updateConfig(id: string, configData: Partial<UserSceneConfig>): Promise<UserSceneConfig> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('scene_design_configs')
      .update(configData)
      .eq('id', id)
      .eq('user_id', this.currentUser.id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  async deleteConfig(id: string): Promise<void> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }

    const { error } = await supabase
      .from('scene_design_configs')
      .delete()
      .eq('id', id)
      .eq('user_id', this.currentUser.id)

    if (error) {
      throw new Error(error.message)
    }
  }

  async setDefaultConfig(id: string): Promise<void> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }

    // First, unset all other default configs for this user
    await supabase
      .from('scene_design_configs')
      .update({ is_default: false })
      .eq('user_id', this.currentUser.id)

    // Then set the specified config as default
    const { error } = await supabase
      .from('scene_design_configs')
      .update({ is_default: true })
      .eq('id', id)
      .eq('user_id', this.currentUser.id)

    if (error) {
      throw new Error(error.message)
    }
  }

  async createDefaultConfigIfNotExists(): Promise<UserSceneConfig> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }

    // All authenticated users can create default configs

    // Check if default config already exists
    const existingDefault = await this.getDefaultConfig()
    if (existingDefault) {
      return existingDefault
    }

    // Create default config from SCENE_CONFIG
    const defaultConfig = {
      config_name: 'default',
      model_path: SCENE_CONFIG.DEFAULT_MODEL_PATH,
      camera_fov: SCENE_CONFIG.CAMERA_FOV,
      camera_near: SCENE_CONFIG.CAMERA_NEAR,
      camera_far: SCENE_CONFIG.CAMERA_FAR,
      orbital_height: SCENE_CONFIG.ORBITAL_HEIGHT,
      orbital_radius_multiplier: SCENE_CONFIG.ORBITAL_RADIUS_MULTIPLIER,
      orbital_speed: SCENE_CONFIG.ORBITAL_SPEED,
      target_size: SCENE_CONFIG.TARGET_SIZE,
      scale_multiplier: SCENE_CONFIG.SCALE_MULTIPLIER,
      rotation_y: SCENE_CONFIG.ROTATION_Y,
      intro_duration: SCENE_CONFIG.INTRO_DURATION,
      intro_start_pos: {
        x: SCENE_CONFIG.INTRO_START_POS.x,
        y: SCENE_CONFIG.INTRO_START_POS.y,
        z: SCENE_CONFIG.INTRO_START_POS.z
      },
      intro_end_pos: {
        x: SCENE_CONFIG.INTRO_END_POS.x,
        y: SCENE_CONFIG.INTRO_END_POS.y,
        z: SCENE_CONFIG.INTRO_END_POS.z
      },
      hotspot_colors: {
        normal: SCENE_CONFIG.HOTSPOT_COLORS.NORMAL,
        hover: SCENE_CONFIG.HOTSPOT_COLORS.HOVER,
        pulse: SCENE_CONFIG.HOTSPOT_COLORS.PULSE
      },
      pulse_animation: {
        duration: SCENE_CONFIG.PULSE_ANIMATION.DURATION,
        scale: SCENE_CONFIG.PULSE_ANIMATION.SCALE,
        opacity: SCENE_CONFIG.PULSE_ANIMATION.OPACITY
      },
      hotspot_focal_distances: SCENE_CONFIG.HOTSPOT_FOCAL_DISTANCES,
      hotspot_categories: SCENE_CONFIG.HOTSPOT_CATEGORIES,
      camera_points: SCENE_CONFIG.DEFAULT_CAMERA_POINTS.map(point => ({
        x: point.x,
        y: point.y,
        z: point.z
      })),
      look_at_targets: SCENE_CONFIG.DEFAULT_LOOK_AT_TARGETS.map(target => ({
        x: target.x,
        y: target.y,
        z: target.z
      })),
      api_hotspot_key_aliases: SCENE_CONFIG.API_HOTSPOT_KEY_ALIASES,
      is_default: true
    }

    return await this.createConfig(defaultConfig, 'default')
  }

  // Convert UserSceneConfig to format expected by the 3D scene
  convertToSceneConfig(userConfig: UserSceneConfig) {
    return {
      DEFAULT_MODEL_PATH: userConfig.model_path,
      CAMERA_FOV: userConfig.camera_fov,
      CAMERA_NEAR: userConfig.camera_near,
      CAMERA_FAR: userConfig.camera_far,
      ORBITAL_HEIGHT: userConfig.orbital_height,
      ORBITAL_RADIUS_MULTIPLIER: userConfig.orbital_radius_multiplier,
      ORBITAL_SPEED: userConfig.orbital_speed,
      TARGET_SIZE: userConfig.target_size,
      SCALE_MULTIPLIER: userConfig.scale_multiplier,
      ROTATION_Y: userConfig.rotation_y,
      INTRO_DURATION: userConfig.intro_duration,
      INTRO_START_POS: userConfig.intro_start_pos,
      INTRO_END_POS: userConfig.intro_end_pos,
      HOTSPOT_COLORS: userConfig.hotspot_colors,
      PULSE_ANIMATION: userConfig.pulse_animation,
      HOTSPOT_FOCAL_DISTANCES: userConfig.hotspot_focal_distances,
      HOTSPOT_CATEGORIES: userConfig.hotspot_categories,
      DEFAULT_CAMERA_POINTS: userConfig.camera_points,
      DEFAULT_LOOK_AT_TARGETS: userConfig.look_at_targets,
      API_HOTSPOT_KEY_ALIASES: userConfig.api_hotspot_key_aliases
    }
  }
}
