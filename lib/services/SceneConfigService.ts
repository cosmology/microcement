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
    const prevId = this.currentUser?.id
    const nextId = user?.id
    // Only reset caches if the user actually changed
    this.currentUser = user
    if (prevId !== nextId) {
      this.userConfigsCache.clear()
      this.defaultConfigCache.clear()
      this.pendingUserConfigs.clear()
      this.pendingDefaultConfig.clear()
    }
  }

  async getUserConfigs(): Promise<UserSceneConfig[]> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }

    const userId: string = this.currentUser.id

    // Serve from cache if available
    const cached = this.userConfigsCache.get(userId)
    if (cached) return cached

    // Deduplicate concurrent requests
    const pending = this.pendingUserConfigs.get(userId)
    if (pending) return pending

    const promise = (async () => {
      // First, try to get the user's own configs
      const { data, error } = await supabase
        .from('scene_design_configs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      const userConfigs = data || []
      
      // If user has their own configs, return them
      if (userConfigs.length > 0) {
        const result = userConfigs
        this.userConfigsCache.set(userId, result)
        this.pendingUserConfigs.delete(userId)
        return result
      }

      // If no own configs, check for architect relationship (for end_users)
      const { data: architectRelationship } = await supabase
        .from('architect_clients')
        .select('architect_id')
        .eq('client_id', userId)
        .eq('status', 'active')
        .single()

      if (architectRelationship) {
        // Get architect's configs
        const { data: architectConfigs, error: architectError } = await supabase
          .from('scene_design_configs')
          .select('*')
          .eq('user_id', architectRelationship.architect_id)
          .order('created_at', { ascending: false })

        if (architectError) {
          console.warn('Error fetching architect configs:', architectError)
        }

        const result = architectConfigs || []
        this.userConfigsCache.set(userId, result)
        this.pendingUserConfigs.delete(userId)
        return result
      }

      // No configs found
      const result: UserSceneConfig[] = []
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

    const userId = this.currentUser.id

    // Query by ID only and let RLS handle access control
    // RLS policy allows access if user_id, client_id, or architect_id matches
    const { data, error } = await supabase
      .from('scene_design_configs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('🔍 [SceneConfigService] Config not found or access denied for ID:', id)
        return null // Config not found or access denied by RLS
      }
      throw new Error(error.message)
    }

    // Verify user has access (redundant check, RLS already handles this)
    const hasAccess = 
      data.user_id === userId || 
      data.client_id === userId || 
      data.architect_id === userId

    if (!hasAccess) {
      console.log('🔍 [SceneConfigService] User does not have access to config:', id)
      return null
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
      // First, try to get the user's own default config
      let { data, error } = await supabase
        .from('scene_design_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle()

      if (!error && data) {
        console.log('✅ [SceneConfigService] Found user\'s own default config:', data.config_name)
        this.defaultConfigCache.set(userId, data)
        this.pendingDefaultConfig.delete(userId)
        return data
      }

      // If no own config found, check if user is an end_user with an architect relationship
      const { data: architectData, error: architectError } = await supabase
        .from('architect_clients')
        .select('architect_id')
        .eq('client_id', userId)
        .eq('status', 'active')
        .maybeSingle()

      if (!architectError && architectData) {
        console.log('🔍 [SceneConfigService] No own config found, checking architect relationship')
        
        // Get the architect's default config directly
        const architectConfig = await this.getArchitectDefaultConfig(userId)
        if (architectConfig) {
          console.log('✅ [SceneConfigService] Loaded architect config for end_user')
          this.defaultConfigCache.set(userId, architectConfig)
          this.pendingDefaultConfig.delete(userId)
          return architectConfig
        }
      }

      // If no own config found, check if user is an architect with active clients
      const { data: clientData, error: clientError } = await supabase
        .from('architect_clients')
        .select('client_id')
        .eq('architect_id', userId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      if (!clientError && clientData) {
        console.log('🔍 [SceneConfigService] No own config found, checking if architect has clients')
        
        // Get the collaborative project config where this user is the architect
        const { data: collabConfig, error: collabError } = await supabase
          .from('scene_design_configs')
          .select('*')
          .eq('architect_id', userId)
          .eq('is_default', true)
          .maybeSingle()

        if (!collabError && collabConfig) {
          console.log('✅ [SceneConfigService] Loaded collaborative config for architect:', collabConfig.config_name)
          this.defaultConfigCache.set(userId, collabConfig)
          this.pendingDefaultConfig.delete(userId)
          return collabConfig
        }
      }

      // No config found
      if (error) {
        if ((error as any).code === 'PGRST116') {
          this.defaultConfigCache.set(userId, null)
          this.pendingDefaultConfig.delete(userId)
          return null // No default config found
        }
        throw new Error(error.message)
      }

      this.defaultConfigCache.set(userId, null)
      this.pendingDefaultConfig.delete(userId)
      return null
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
    // Use model_path from database first, then fallback to config name, then default
    let modelPath = '/models/no-material.glb'; // Default
    
    if ((userConfig as any).model_path) {
      modelPath = (userConfig as any).model_path;
      console.log('🎯 [SceneConfigService] Using model_path from database:', modelPath);
    } else if (userConfig.config_name === 'ema_showcase') {
      modelPath = '/models/ema.glb';
      console.log('🎯 [SceneConfigService] Using ema_showcase config name fallback:', modelPath);
    } else {
      console.log('🎯 [SceneConfigService] Using default model path:', modelPath);
    }
    
    console.log('🎯 [SceneConfigService] Final model path:', modelPath, 'for config:', userConfig.config_name);
    
    return {
      DEFAULT_MODEL_PATH: modelPath,
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

  /**
   * Get architect's default config for end_user collaboration
   */
  async getArchitectDefaultConfig(userId: string): Promise<UserSceneConfig | null> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }

    try {
      // Check if user is an end_user with an architect
      const { data: architectData, error: architectError } = await supabase
        .from('architect_clients')
        .select('architect_id')
        .eq('client_id', userId)
        .eq('status', 'active')
        .single()

      console.log('🔍 [SceneConfigService] Architect clients query result:', architectData)
      console.log('🔍 [SceneConfigService] Architect clients query error:', architectError)
      console.log('🔍 [SceneConfigService] User ID being queried:', userId)

      if (architectError || !architectData) {
        console.log('🔍 [SceneConfigService] No architect relationship found for user:', userId)
        return null
      }

      console.log('🔍 [SceneConfigService] Found architect relationship, fetching architect config')
      console.log('🔍 [SceneConfigService] Architect ID:', architectData.architect_id)
      console.log('🔍 [SceneConfigService] Current user ID:', this.currentUser?.id)

      // Check if we have a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('🔍 [SceneConfigService] Session check:', session ? 'valid' : 'invalid', sessionError)

      if (sessionError || !session) {
        console.error('❌ [SceneConfigService] No valid session for architect config query')
        return null
      }

      // Get the architect's default config
      // Filter by the specific architect's user_id OR architect_id
      const { data: architectConfig, error: architectConfigError } = await supabase
        .from('scene_design_configs')
        .select('*')
        .or(`user_id.eq.${architectData.architect_id},architect_id.eq.${architectData.architect_id}`)
        .eq('is_default', true)
        .maybeSingle()

      console.log('🔍 [SceneConfigService] Architect config query result:', architectConfig)
      console.log('🔍 [SceneConfigService] Architect config query error:', architectConfigError)

      if (architectConfigError) {
        console.error('❌ [SceneConfigService] Error fetching architect config:', architectConfigError)
        return null
      }

      if (architectConfig) {
        console.log('✅ [SceneConfigService] Loaded architect config for end_user:', architectConfig.id)
        return architectConfig as UserSceneConfig
      }

      return null
    } catch (error) {
      console.error('❌ [SceneConfigService] Error in getArchitectDefaultConfig:', error)
      return null
    }
  }
}
