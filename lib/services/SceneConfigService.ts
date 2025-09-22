import { supabase, UserSceneConfig } from '@/lib/supabase'
import { SCENE_CONFIG } from '@/lib/config/sceneConfig'

export class SceneConfigService {
  private static instance: SceneConfigService
  private currentUser: any = null
  private migrationChecked = false

  static getInstance(): SceneConfigService {
    if (!SceneConfigService.instance) {
      SceneConfigService.instance = new SceneConfigService()
    }
    return SceneConfigService.instance
  }

  setUser(user: any) {
    this.currentUser = user
  }

  // Auto-migration method
  private async ensureMigration() {
    if (this.migrationChecked) return
    
    try {
      // Try to query the table to see if it exists
      await supabase.from('user_scene_configs').select('id').limit(1)
      this.migrationChecked = true
      return
    } catch (error) {
      console.log('🔄 Table not found, running migration...')
      
      // Run migration via API
      try {
        const response = await fetch('/api/migrate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        const result = await response.json()
        if (result.success) {
          console.log('✅ Migration completed:', result.message)
        } else {
          console.error('❌ Migration failed:', result.error)
        }
      } catch (migrationError) {
        console.error('❌ Failed to run migration:', migrationError)
      }
      
      this.migrationChecked = true
    }
  }

  async getUserConfigs(): Promise<UserSceneConfig[]> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }

    // Ensure migration is run
    await this.ensureMigration()

    // Special case: ivanprokic@yahoo.com should NEVER have scene configs
    if (this.currentUser.email === 'ivanprokic@yahoo.com') {
      console.log('🚫 User ivanprokic@yahoo.com is blocked from accessing scene configs');
      return [];
    }

    const { data, error } = await supabase
      .from('user_scene_configs')
      .select('*')
      .eq('user_id', this.currentUser.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  }

  async getConfigById(id: string): Promise<UserSceneConfig | null> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('user_scene_configs')
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

    // Special case: ivanprokic@yahoo.com should NEVER have scene configs
    if (this.currentUser.email === 'ivanprokic@yahoo.com') {
      console.log('🚫 User ivanprokic@yahoo.com is blocked from accessing default config');
      return null;
    }

    const { data, error } = await supabase
      .from('user_scene_configs')
      .select('*')
      .eq('user_id', this.currentUser.id)
      .eq('is_default', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // No default config found
      }
      throw new Error(error.message)
    }

    return data
  }

  async createConfig(configData: Partial<UserSceneConfig>, configName: string = 'default'): Promise<UserSceneConfig> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }

    // Special case: ivanprokic@yahoo.com should NEVER have scene configs
    if (this.currentUser.email === 'ivanprokic@yahoo.com') {
      throw new Error('Scene configurations are not allowed for this user')
    }

    const { data, error } = await supabase
      .from('user_scene_configs')
      .insert({
        user_id: this.currentUser.id,
        config_name: configName,
        ...configData
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
      .from('user_scene_configs')
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
      .from('user_scene_configs')
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
      .from('user_scene_configs')
      .update({ is_default: false })
      .eq('user_id', this.currentUser.id)

    // Then set the specified config as default
    const { error } = await supabase
      .from('user_scene_configs')
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

    // Special case: ivanprokic@yahoo.com should NEVER have scene configs
    if (this.currentUser.email === 'ivanprokic@yahoo.com') {
      throw new Error('Scene configurations are not allowed for this user')
    }

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
