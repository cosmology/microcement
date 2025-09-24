/**
 * Local Follow Paths Configuration
 * 
 * This file contains follow path data for development and testing.
 * Set LOCAL_FOLLOW_PATHS=true in your environment to use this data
 * instead of the database data.
 */

export interface LocalFollowPath {
  id: string;
  scene_design_config_id: string;
  path_name: string;
  camera_points: Array<{ x: number; y: number; z: number }>;
  look_at_targets: Array<{ x: number; y: number; z: number }>;
  is_active: boolean;
}

export const LOCAL_FOLLOW_PATHS: LocalFollowPath[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891',
    scene_design_config_id: 'cb3d6b5e-0f47-4f7e-9333-5ccbdeda2636', // Default config ID
    path_name: 'current',
    camera_points: [
      { x: 20, y: 5, z: 0 },
      { x: -8, y: 6.5, z: 2 },
      { x: -14, y: 6.75, z: 7 },
      { x: -8, y: 7, z: 24 },
      { x: -4, y: 7, z: 30 },
      { x: -2, y: 7.25, z: 32 },
      { x: 12, y: 7.5, z: 32 },
      { x: 20, y: 8, z: 25 },
      { x: 16, y: 8, z: 0 }
    ],
    look_at_targets: [
      { x: 0, y: 0, z: 0 },
      { x: 4, y: 3, z: 0 },
      { x: 6, y: 4, z: 0 },
      { x: 7, y: 5, z: 30 },
      { x: 10, y: 6, z: 50 },
      { x: 20, y: 7, z: 60 },
      { x: 30, y: 8, z: 40 },
      { x: 30, y: 8, z: 20 },
      { x: 0, y: 8, z: -40 }
    ],
    is_active: true
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678912',
    scene_design_config_id: 'cb3d6b5e-0f47-4f7e-9333-5ccbdeda2636',
    path_name: 'bathroom_walkthrough',
    camera_points: [
      { x: 20, y: 5, z: 0 },    // Start position
      { x: 15, y: 5, z: -5 },   // Approach bathroom area
      { x: 10, y: 5, z: -10 },  // Enter bathroom
      { x: 5, y: 5, z: -15 },   // Bathroom center
      { x: 0, y: 5, z: -20 },   // Show bathroom features
      { x: -5, y: 5, z: -15 },  // Bathroom exit
      { x: -10, y: 5, z: -10 }, // Return to main area
      { x: -8, y: 6.5, z: 2 },  // Continue original path
      { x: -14, y: 6.75, z: 7 }
    ],
    look_at_targets: [
      { x: 0, y: 0, z: 0 },     // Start look at
      { x: 5, y: 2, z: -8 },    // Look at bathroom entrance
      { x: 0, y: 3, z: -15 },   // Look at bathroom center
      { x: -5, y: 2, z: -8 },   // Look at bathroom features
      { x: -10, y: 1, z: 0 },   // Look at bathroom exit
      { x: -8, y: 6.5, z: 2 },  // Continue original look at
      { x: -14, y: 6.75, z: 7 },
      { x: -8, y: 7, z: 24 },
      { x: -4, y: 7, z: 30 }
    ],
    is_active: false
  },
  {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789123',
    scene_design_config_id: 'cb3d6b5e-0f47-4f7e-9333-5ccbdeda2636',
    path_name: 'kitchen_tour',
    camera_points: [
      { x: 20, y: 5, z: 0 },    // Start position
      { x: 15, y: 5, z: 5 },    // Move towards kitchen
      { x: 10, y: 5, z: 10 },   // Kitchen entrance
      { x: 5, y: 5, z: 15 },    // Kitchen center
      { x: 0, y: 5, z: 20 },    // Kitchen features
      { x: -5, y: 5, z: 15 },   // Kitchen exit
      { x: -8, y: 6.5, z: 2 },  // Continue original path
      { x: -14, y: 6.75, z: 7 },
      { x: -8, y: 7, z: 24 }
    ],
    look_at_targets: [
      { x: 0, y: 0, z: 0 },     // Start look at
      { x: 8, y: 2, z: 8 },     // Look at kitchen entrance
      { x: 5, y: 3, z: 15 },    // Look at kitchen center
      { x: 0, y: 4, z: 25 },    // Look at kitchen features
      { x: -2, y: 3, z: 20 },   // Look at kitchen exit
      { x: -5, y: 2, z: 10 },   // Transition look at
      { x: -8, y: 6.5, z: 2 },  // Continue original look at
      { x: -14, y: 6.75, z: 7 },
      { x: -8, y: 7, z: 24 }
    ],
    is_active: false
  },
  {
    id: 'd4e5f6a7-b8c9-0123-def4-567890123456',
    scene_design_config_id: 'cb3d6b5e-0f47-4f7e-9333-5ccbdeda2636',
    path_name: 'living_room_tour',
    camera_points: [
      { x: 20, y: 5, z: 0 },    // Start position
      { x: 25, y: 5, z: 5 },    // Move towards living room
      { x: 30, y: 5, z: 10 },   // Living room entrance
      { x: 35, y: 5, z: 15 },   // Living room center
      { x: 40, y: 5, z: 20 },   // Living room features
      { x: 35, y: 5, z: 25 },   // Living room exit
      { x: 30, y: 5, z: 20 },   // Return to main area
      { x: -8, y: 6.5, z: 2 },  // Continue original path
      { x: -14, y: 6.75, z: 7 }
    ],
    look_at_targets: [
      { x: 0, y: 0, z: 0 },     // Start look at
      { x: 12, y: 2, z: 8 },    // Look at living room entrance
      { x: 15, y: 3, z: 15 },   // Look at living room center
      { x: 20, y: 4, z: 25 },   // Look at living room features
      { x: 18, y: 3, z: 30 },   // Look at living room exit
      { x: 15, y: 2, z: 20 },   // Transition look at
      { x: -8, y: 6.5, z: 2 },  // Continue original look at
      { x: -14, y: 6.75, z: 7 },
      { x: -8, y: 7, z: 24 }
    ],
    is_active: false
  }
];

/**
 * Get follow paths based on environment flag
 * @param sceneDesignConfigId - The scene design config ID
 * @returns Array of follow paths
 */
export function getFollowPaths(sceneDesignConfigId: string): LocalFollowPath[] {
  const useLocalPaths = process.env.NEXT_PUBLIC_LOCAL_FOLLOW_PATHS === 'true';
  
  if (useLocalPaths) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🏠 [LocalFollowPaths] Using local follow paths data');
    }
    return LOCAL_FOLLOW_PATHS.filter(path => path.scene_design_config_id === sceneDesignConfigId);
  }
  
  return [];
}
