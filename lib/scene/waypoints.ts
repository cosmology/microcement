export function dispatchGoToWaypoint(index: number) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('camera-goto-waypoint', { detail: { index } }));
}

export const WAYPOINTS = {
  kitchen: 2,
  bath: 6,
  living: 9,
} as const;


