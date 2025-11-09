/**
 * RoomPlan Measurements Visualization Utility
 * Creates Three.js objects for wall lines, doors, and windows
 */

import * as THREE from 'three';

export interface Wall {
  dimensions: [number, number, number]; // [width, height, depth] in meters
  transform: number[]; // 4x4 matrix
  identifier: string;
}

export interface Opening {
  category: string; // 'door' or 'window'
  transform: number[]; // 4x4 matrix
}

export interface RoomPlanMetadata {
  walls?: Wall[];
  doors?: Opening[];
  windows?: Opening[];
  objects?: Array<{
    category: string;
    transform: number[];
  }>;
}

/**
 * Create a THREE.Group containing all measurement visualizations
 * The group should be added to the model's rotation group to inherit transforms
 * 
 * @param metadata - RoomPlan metadata with walls, doors, windows
 * @param visible - Whether measurements should be visible
 * @param measurementScale - Scale factor to apply to measurements (multiply dimensions by this value)
 */
export function createRoomMeasurements(
  metadata: RoomPlanMetadata | null,
  visible: boolean = false,
  measurementScale: number = 1.0
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'room-measurements';
  
  if (!metadata || !visible) {
    return group;
  }

  console.log('📐 [Measurements] Creating visualizations, metadata:', metadata);

  // Create wall visualizations
  if (metadata.walls && Array.isArray(metadata.walls)) {
    metadata.walls.forEach((wall, i) => {
      // Validate wall data structure
      if (!wall || typeof wall !== 'object') {
        console.warn(`⚠️ [Measurements] Invalid wall at index ${i}: not an object`, wall);
        return;
      }
      
      // RoomPlan walls use transform + dimensions
      if (!wall.dimensions || !Array.isArray(wall.dimensions) || wall.dimensions.length !== 3) {
        console.warn(`⚠️ [Measurements] Invalid wall dimensions at index ${i}:`, wall);
        return;
      }
      
      if (!wall.transform || !Array.isArray(wall.transform) || wall.transform.length !== 16) {
        console.warn(`⚠️ [Measurements] Invalid wall transform at index ${i}:`, wall);
        return;
      }
      
      try {
        const [width, height, depth] = wall.dimensions;
        const transform = new THREE.Matrix4().fromArray(wall.transform);
        
        // Extract rotation and position from the transform matrix
        // Scale should NOT be extracted because dimensions already define the size
        const rotation = new THREE.Quaternion();
        const position = new THREE.Vector3();
        const scale = new THREE.Vector3(); // Will be (1,1,1) after decompose
        
        transform.decompose(position, rotation, scale);
        
        // Apply measurement scale to the position as well, since positions are in meters
        // Also add Y offset to match the model elevation (model is elevated by roomHeight/2)
        // For typical 2.5m room height, yOffset = 1.25m, scaled by measurementScale
        const yOffset = 1.25 * measurementScale; // roomHeight (2.5m) / 2, scaled to match model scale
        const scaledPosition = new THREE.Vector3(
          position.x * measurementScale,
          (position.y * measurementScale) + yOffset,
          position.z * measurementScale
        );
        
        // Use minimum thickness for walls when depth is 0 (RoomPlan walls are planar)
        const actualDepth = depth === 0 ? 0.1 : depth;
        
        // Apply scale to measurements to match model scale
        const scaledWidth = width * measurementScale;
        const scaledHeight = height * measurementScale;
        const scaledDepth = actualDepth * measurementScale;
        
        console.log(`🔍 Wall ${i}:`, {
          realDimensions: `${width.toFixed(2)}x${height.toFixed(2)}x${depth.toFixed(2)}m`,
          scaledDimensions: `${scaledWidth.toFixed(2)}x${scaledHeight.toFixed(2)}x${scaledDepth.toFixed(2)}`,
          measurementScale,
          yOffset: yOffset.toFixed(2),
          originalPosition: `(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`,
          scaledPosition: `(${scaledPosition.x.toFixed(2)}, ${scaledPosition.y.toFixed(2)}, ${scaledPosition.z.toFixed(2)})`,
          scale: `(${scale.x.toFixed(3)}, ${scale.y.toFixed(3)}, ${scale.z.toFixed(3)})`,
          rotation: `(${rotation.x.toFixed(3)}, ${rotation.y.toFixed(3)}, ${rotation.z.toFixed(3)}, ${rotation.w.toFixed(3)})`
        });
        
        // Create a box geometry using the scaled dimensions
        const geometry = new THREE.BoxGeometry(scaledWidth, scaledHeight, scaledDepth);
        const material = new THREE.MeshBasicMaterial({ 
          color: 0xa78bfa, // Accent purple (purple-400)
          transparent: true,
          opacity: 0.3,
          wireframe: true,
          side: THREE.DoubleSide
        });
        const box = new THREE.Mesh(geometry, material);
        
        // Apply only rotation and scaled position (NOT scale, since dimensions define size)
        box.quaternion.copy(rotation);
        box.position.copy(scaledPosition);
        
        console.log(`📦 Box ${i} final:`, {
          position: `(${box.position.x.toFixed(2)}, ${box.position.y.toFixed(2)}, ${box.position.z.toFixed(2)})`,
          scale: `(${box.scale.x.toFixed(3)}, ${box.scale.y.toFixed(3)}, ${box.scale.z.toFixed(3)})`,
          rotation: `(${box.rotation.x.toFixed(3)}, ${box.rotation.y.toFixed(3)}, ${box.rotation.z.toFixed(3)})`,
          geometrySize: `(${geometry.parameters.width.toFixed(2)}, ${geometry.parameters.height.toFixed(2)}, ${geometry.parameters.depth.toFixed(2)})`
        });
        
        box.name = `wall-${i}`;
        group.add(box);
        console.log(`✅ [Measurements] Created wall ${i} with dimensions: ${width.toFixed(2)}x${height.toFixed(2)}x${actualDepth.toFixed(2)}`);
      } catch (error) {
        console.error(`❌ [Measurements] Error creating wall ${i}:`, error);
      }
    });
  }

  // Create door markers
  if (metadata.doors && Array.isArray(metadata.doors)) {
    metadata.doors.forEach((door, i) => {
      if (!door || !door.transform || !Array.isArray(door.transform) || door.transform.length !== 16) {
        console.warn(`⚠️ [Measurements] Invalid door data at index ${i}:`, door);
        return;
      }
      
      try {
        const transform = new THREE.Matrix4().fromArray(door.transform);
        const scale = new THREE.Vector3();
        const rotation = new THREE.Quaternion();
        const position = new THREE.Vector3();
        transform.decompose(position, rotation, scale);
        
        // Scale the position and add Y offset to match model elevation
        const yOffset = 1.25 * measurementScale; // roomHeight (2.5m) / 2, scaled to match model
        const scaledPosition = new THREE.Vector3(
          position.x * measurementScale,
          (position.y * measurementScale) + yOffset,
          position.z * measurementScale
        );
        
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.1 * measurementScale, 2.0 * measurementScale, 0.05 * measurementScale),
          new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, // Green
            transparent: true,
            opacity: 0.5
          })
        );
        box.scale.copy(scale);
        box.quaternion.copy(rotation);
        box.position.copy(scaledPosition);
        box.name = `door-${i}`;
        group.add(box);
      } catch (error) {
        console.error(`❌ [Measurements] Error creating door ${i}:`, error);
      }
    });
  }

  // Create window markers
  if (metadata.windows && Array.isArray(metadata.windows)) {
    metadata.windows.forEach((window, i) => {
      if (!window || !window.transform || !Array.isArray(window.transform) || window.transform.length !== 16) {
        console.warn(`⚠️ [Measurements] Invalid window data at index ${i}:`, window);
        return;
      }
      
      try {
        const transform = new THREE.Matrix4().fromArray(window.transform);
        const scale = new THREE.Vector3();
        const rotation = new THREE.Quaternion();
        const position = new THREE.Vector3();
        transform.decompose(position, rotation, scale);
        
        // Scale the position and add Y offset to match model elevation
        const yOffset = 1.25 * measurementScale; // roomHeight (2.5m) / 2, scaled to match model
        const scaledPosition = new THREE.Vector3(
          position.x * measurementScale,
          (position.y * measurementScale) + yOffset,
          position.z * measurementScale
        );
        
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(0.1 * measurementScale, 1.5 * measurementScale, 0.05 * measurementScale),
          new THREE.MeshBasicMaterial({ 
            color: 0x0080ff, // Blue
            transparent: true,
            opacity: 0.5
          })
        );
        box.scale.copy(scale);
        box.quaternion.copy(rotation);
        box.position.copy(scaledPosition);
        box.name = `window-${i}`;
        group.add(box);
      } catch (error) {
        console.error(`❌ [Measurements] Error creating window ${i}:`, error);
      }
    });
  }

  console.log(`📐 [Measurements] Created ${group.children.length} measurement objects`);
  return group;
}

/**
 * Update measurements visibility
 */
export function updateMeasurementsVisibility(
  group: THREE.Group,
  visible: boolean
): void {
  group.visible = visible;
  group.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.visible = visible;
    }
  });
}
