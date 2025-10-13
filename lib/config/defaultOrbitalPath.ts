/**
 * Default orbital camera path for newly uploaded models
 * Creates a circular path around the model for orbital preview
 */

const ORBITAL_RADIUS = 50  // Distance from center
const ORBITAL_HEIGHT = 25  // Height above ground
const WAYPOINT_COUNT = 9   // Number of waypoints in the circle

/**
 * Generate orbital camera path waypoints in a circle
 * Starting at 45 degrees (northeast), going counter-clockwise
 */
export function generateOrbitalCameraPath(): Array<{ x: number; y: number; z: number }> {
  const waypoints: Array<{ x: number; y: number; z: number }> = []
  const startAngle = 45 * (Math.PI / 180) // 45 degrees in radians
  
  for (let i = 0; i < WAYPOINT_COUNT; i++) {
    const angle = startAngle + (i * (2 * Math.PI / WAYPOINT_COUNT))
    
    waypoints.push({
      x: ORBITAL_RADIUS * Math.cos(angle),
      y: ORBITAL_HEIGHT,
      z: ORBITAL_RADIUS * Math.sin(angle)
    })
  }
  
  return waypoints
}

/**
 * Generate orbital lookAt targets (all pointing to center)
 */
export function generateOrbitalLookAtTargets(): Array<{ x: number; y: number; z: number }> {
  const targets: Array<{ x: number; y: number; z: number }> = []
  
  for (let i = 0; i < WAYPOINT_COUNT; i++) {
    targets.push({
      x: 0,  // Center of model
      y: 10, // Look at middle height of model
      z: 0
    })
  }
  
  return targets
}

export const DEFAULT_ORBITAL_CONFIG = {
  CAMERA_POINTS: generateOrbitalCameraPath(),
  LOOK_AT_TARGETS: generateOrbitalLookAtTargets(),
  ORBITAL_RADIUS,
  ORBITAL_HEIGHT,
  WAYPOINT_COUNT
}

