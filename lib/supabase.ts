import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:8000'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'SUPABASE_ANON_KEY_PLACEHOLDER'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface UserSceneConfig {
  id: string
  user_id: string
  config_name: string
  model_path: string
  camera_fov: number
  camera_near: number
  camera_far: number
  orbital_height: number
  orbital_radius_multiplier: number
  orbital_speed: number
  target_size: number
  scale_multiplier: number
  rotation_y: number
  intro_duration: number
  intro_start_pos: { x: number; y: number; z: number }
  intro_end_pos: { x: number; y: number; z: number }
  hotspot_colors: {
    normal: number
    hover: number
    pulse: number
  }
  pulse_animation: {
    duration: number
    scale: number
    opacity: number
  }
  hotspot_focal_distances: Record<string, number>
  hotspot_categories: Record<string, string>
  camera_points: Array<{ x: number; y: number; z: number }>
  look_at_targets: Array<{ x: number; y: number; z: number }>
  api_hotspot_key_aliases: Record<string, string>
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      user_scene_configs: {
        Row: UserSceneConfig
        Insert: Omit<UserSceneConfig, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserSceneConfig, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
      }
    }
  }
}
