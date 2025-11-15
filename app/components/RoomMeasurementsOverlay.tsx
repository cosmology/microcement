/**
 * RoomPlan Measurements Visualization Utility
 * Creates Three.js objects for wall lines, doors, and windows
 */

import * as THREE from 'three';
import { createWallDimensionLabel } from '@/lib/utils/wallDimensionLabels';

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
 * Model transform data from Zustand (serializable format)
 */
export interface ModelTransformData {
  position: { x: number; y: number; z: number };
  rotation: [number, number, number, number]; // quaternion [x, y, z, w]
  scale: { x: number; y: number; z: number };
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
    center: { x: number; y: number; z: number };
    size: { x: number; y: number; z: number };
  };
  boundingSphere: {
    center: { x: number; y: number; z: number };
    radius: number;
  };
}

/**
 * Scale factor data from Zustand (for 1mm precision alignment)
 */
export interface ScaleFactorData {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  uniformHorizontalScale: number; // Average of X and Z for walls
  verticalScale: number; // Y scale for height
  centerOffset: { x: number; y: number; z: number }; // Offset to align centers (meters)
  precision: number; // Precision achieved (meters, target: 0.001m = 1mm)
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Create a THREE.Group containing all measurement visualizations
 * Phase 2: Uses precise model transform and scale factors from Zustand for 1mm alignment
 * 
 * @param metadata - RoomPlan metadata with walls, doors, windows
 * @param visible - Whether measurements should be visible
 * @param modelTransform - Model transformation data from Zustand store (null = use fallback)
 * @param scaleFactor - Precise scale factor data from Zustand store (null = use fallback)
 * @param isDarkMode - Whether dark mode is active (for theme-aware labels)
 */
export function createRoomMeasurements(
  metadata: RoomPlanMetadata | null,
  visible: boolean = false,
  modelTransform: ModelTransformData | null = null,
  scaleFactor: ScaleFactorData | null = null,
  roomPlanSystem: { boundingBox: { min: { y: number }; center: { y: number } } | null; averageWallHeight?: number } | null = null,
  isDarkMode: boolean = false
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'room-measurements';
  
  if (!metadata || !visible) {
    return group;
  }

  console.log('📐 [Measurements] Creating visualizations with precise alignment (Phase 2)');
  console.log('📐 [Measurements] Metadata:', {
    wallCount: metadata.walls?.length || 0,
    doorCount: metadata.doors?.length || 0,
    windowCount: metadata.windows?.length || 0,
  });
  console.log('📐 [Measurements] Model transform:', modelTransform ? 'provided ✅' : 'fallback ⚠️');
  console.log('📐 [Measurements] Scale factor:', scaleFactor ? `provided ✅ (precision: ${(scaleFactor.precision * 1000).toFixed(3)}mm)` : 'fallback ⚠️');

  // Phase 2: Calculate precise transformation using Zustand store data
  // If modelTransform and scaleFactor are provided, use them for 1mm precision
  // Otherwise, fall back to bounding-box approximation (legacy behavior)
  let finalScaleFactor: number;
  let modelFloorY: number;
  let centerOffset: THREE.Vector3;
  let modelRotation: THREE.Quaternion;
  
  if (modelTransform && scaleFactor) {
    // Phase 2: Use precise scale factor from Zustand store (1mm precision)
    finalScaleFactor = scaleFactor.uniformHorizontalScale; // Use uniform horizontal scale for walls
    console.log('📐 [Measurements] Using precise scale factor from Zustand:', {
      scaleX: scaleFactor.scaleX.toFixed(6),
      scaleY: scaleFactor.scaleY.toFixed(6),
      scaleZ: scaleFactor.scaleZ.toFixed(6),
      uniformHorizontalScale: scaleFactor.uniformHorizontalScale.toFixed(6),
      verticalScale: scaleFactor.verticalScale.toFixed(6),
      precision: `${(scaleFactor.precision * 1000).toFixed(3)}mm`,
      confidence: scaleFactor.confidence,
      modelBoundingBox: {
        min: `${modelTransform.boundingBox.min.x.toFixed(3)}, ${modelTransform.boundingBox.min.y.toFixed(3)}, ${modelTransform.boundingBox.min.z.toFixed(3)}`,
        max: `${modelTransform.boundingBox.max.x.toFixed(3)}, ${modelTransform.boundingBox.max.y.toFixed(3)}, ${modelTransform.boundingBox.max.z.toFixed(3)}`,
        center: `${modelTransform.boundingBox.center.x.toFixed(3)}, ${modelTransform.boundingBox.center.y.toFixed(3)}, ${modelTransform.boundingBox.center.z.toFixed(3)}`,
        size: `${modelTransform.boundingBox.size.x.toFixed(3)}, ${modelTransform.boundingBox.size.y.toFixed(3)}, ${modelTransform.boundingBox.size.z.toFixed(3)}`,
      },
    });
    
    // Use actual model floor Y position from bounding box (no hardcoded offset)
    modelFloorY = modelTransform.boundingBox.min.y;
    console.log('📐 [Measurements] Model floor Y (from bounding box):', modelFloorY.toFixed(6));
    console.log('📐 [Measurements] Model center Y:', modelTransform.boundingBox.center.y.toFixed(6));
    console.log('📐 [Measurements] Model top Y:', modelTransform.boundingBox.max.y.toFixed(6));
    
    // Get RoomPlan floor Y
    // RoomPlan coordinate system: positions are relative to RoomPlan origin (center)
    // The bounding box min.y is the minimum wall center Y
    // RoomPlan floor is at min.y - (wallHeight/2) since walls are positioned at their center
    const roomPlanCenterY = roomPlanSystem?.boundingBox?.center?.y ?? 0;
    const roomPlanMinY = roomPlanSystem?.boundingBox?.min?.y ?? 0;
    const averageWallHeight = roomPlanSystem?.averageWallHeight ?? 2.5; // Default to 2.5m if not available
    // Calculate the RoomPlan floor: wall centers are at min.y, so floor is min.y - (height/2)
    const roomPlanFloorY = roomPlanMinY - (averageWallHeight / 2);
    
    // Calculate the offset from RoomPlan center to RoomPlan floor
    const roomPlanCenterToFloorOffset = roomPlanFloorY - roomPlanCenterY;
    
    console.log('📐 [Measurements] RoomPlan floor Y (calculated):', roomPlanFloorY.toFixed(6));
    console.log('📐 [Measurements] RoomPlan center Y (from bounding box):', roomPlanCenterY.toFixed(6));
    console.log('📐 [Measurements] RoomPlan min Y (from bounding box):', roomPlanMinY.toFixed(6));
    console.log('📐 [Measurements] Average wall height:', averageWallHeight.toFixed(6));
    console.log('📐 [Measurements] RoomPlan center-to-floor offset:', roomPlanCenterToFloorOffset.toFixed(6));
    
    // SIMPLE APPROACH: Align bounding boxes by aligning min X,Z points
    // 1. Calculate RoomPlan bounding box after scaling
    // 2. Align RoomPlan min X,Z with model min X,Z
    const modelMinX = modelTransform.boundingBox.min.x;
    const modelMinZ = modelTransform.boundingBox.min.z;
    
    // Collect all scaled RoomPlan positions to calculate bounding box
    // Include walls, doors, and windows
    const scaledRoomPlanPositions: THREE.Vector3[] = [];
    
    // Collect wall positions and dimensions for accurate bounding box
    if (metadata.walls) {
      metadata.walls.forEach((wall) => {
        if (wall.transform && Array.isArray(wall.transform) && wall.transform.length === 16) {
          const transform = new THREE.Matrix4().fromArray(wall.transform);
          const position = new THREE.Vector3();
          const rotation = new THREE.Quaternion();
          const scale = new THREE.Vector3();
          transform.decompose(position, rotation, scale);
          
          const scaledPos = new THREE.Vector3(
            position.x * finalScaleFactor,
            0, // We don't need Y for bounding box
            position.z * finalScaleFactor
          );
          
          // Account for wall dimensions (width and depth) for accurate bounding box
          // Walls are positioned at their center, so we need to add/subtract half dimensions
          if (wall.dimensions && Array.isArray(wall.dimensions) && wall.dimensions.length >= 2) {
            const [width, , depth] = wall.dimensions;
            const actualDepth = depth === 0 ? 0.1 : depth; // Use minimum depth if 0
            const halfWidth = (width * finalScaleFactor) / 2;
            const halfDepth = (actualDepth * finalScaleFactor) / 2;
            
            // Get wall corners in local space (relative to wall center)
            // Then transform to world space by rotating and translating
            const corners = [
              new THREE.Vector3(-halfWidth, 0, -halfDepth),
              new THREE.Vector3(halfWidth, 0, -halfDepth),
              new THREE.Vector3(halfWidth, 0, halfDepth),
              new THREE.Vector3(-halfWidth, 0, halfDepth),
            ];
            
            // Transform corners: rotate first (local space), then add center position (world space)
            corners.forEach(corner => {
              corner.applyQuaternion(rotation);
              corner.add(scaledPos);
              scaledRoomPlanPositions.push(corner);
            });
          } else {
            // Fallback to center position if dimensions not available
            scaledRoomPlanPositions.push(scaledPos);
          }
        }
      });
    }
    
    // Collect door positions
    if (metadata.doors) {
      metadata.doors.forEach((door) => {
        if (door.transform && Array.isArray(door.transform) && door.transform.length === 16) {
          const transform = new THREE.Matrix4().fromArray(door.transform);
          const position = new THREE.Vector3();
          const rotation = new THREE.Quaternion();
          const scale = new THREE.Vector3();
          transform.decompose(position, rotation, scale);
          
          scaledRoomPlanPositions.push(new THREE.Vector3(
            position.x * finalScaleFactor,
            0,
            position.z * finalScaleFactor
          ));
        }
      });
    }
    
    // Collect window positions
    if (metadata.windows) {
      metadata.windows.forEach((window) => {
        if (window.transform && Array.isArray(window.transform) && window.transform.length === 16) {
          const transform = new THREE.Matrix4().fromArray(window.transform);
          const position = new THREE.Vector3();
          const rotation = new THREE.Quaternion();
          const scale = new THREE.Vector3();
          transform.decompose(position, rotation, scale);
          
          scaledRoomPlanPositions.push(new THREE.Vector3(
            position.x * finalScaleFactor,
            0,
            position.z * finalScaleFactor
          ));
        }
      });
    }
    
    // Calculate RoomPlan bounding box min/max X,Z and center
    let roomPlanMinX = 0;
    let roomPlanMaxX = 0;
    let roomPlanMinZ = 0;
    let roomPlanMaxZ = 0;
    
    if (scaledRoomPlanPositions.length > 0) {
      roomPlanMinX = Infinity;
      roomPlanMaxX = -Infinity;
      roomPlanMinZ = Infinity;
      roomPlanMaxZ = -Infinity;
      
      scaledRoomPlanPositions.forEach(pos => {
        roomPlanMinX = Math.min(roomPlanMinX, pos.x);
        roomPlanMaxX = Math.max(roomPlanMaxX, pos.x);
        roomPlanMinZ = Math.min(roomPlanMinZ, pos.z);
        roomPlanMaxZ = Math.max(roomPlanMaxZ, pos.z);
      });
    }
    
    // Calculate RoomPlan center X,Z
    const roomPlanCenterX = (roomPlanMinX + roomPlanMaxX) / 2;
    const roomPlanCenterZ = (roomPlanMinZ + roomPlanMaxZ) / 2;
    
    // Get model center X,Z from bounding box
    const modelCenterX = modelTransform.boundingBox.center.x;
    const modelCenterZ = modelTransform.boundingBox.center.z;
    
    // Try multiple alignment strategies and log all of them
    const minToMinOffsetX = modelMinX - roomPlanMinX;
    const minToMinOffsetZ = modelMinZ - roomPlanMinZ;
    
    const centerToCenterOffsetX = modelCenterX - roomPlanCenterX;
    const centerToCenterOffsetZ = modelCenterZ - roomPlanCenterZ;
    
    // Try aligning first wall position to model min (more precise for L-shapes)
    let firstWallOffsetX = 0;
    let firstWallOffsetZ = 0;
    if (metadata.walls && metadata.walls.length > 0 && metadata.walls[0].transform) {
      const firstWallTransform = new THREE.Matrix4().fromArray(metadata.walls[0].transform);
      const firstWallPos = new THREE.Vector3();
      const firstWallRot = new THREE.Quaternion();
      const firstWallScale = new THREE.Vector3();
      firstWallTransform.decompose(firstWallPos, firstWallRot, firstWallScale);
      
      const firstWallScaledX = firstWallPos.x * finalScaleFactor;
      const firstWallScaledZ = firstWallPos.z * finalScaleFactor;
      
      // Align first wall to model's min corner
      firstWallOffsetX = modelMinX - firstWallScaledX;
      firstWallOffsetZ = modelMinZ - firstWallScaledZ;
    }
    
    // Try max-to-max alignment (alternative corner)
    const maxToMaxOffsetX = modelTransform.boundingBox.max.x - roomPlanMaxX;
    const maxToMaxOffsetZ = modelTransform.boundingBox.max.z - roomPlanMaxZ;
    
    // For L-shapes, try aligning the corner where walls meet
    // Use min-to-min as default, but also calculate wall-corner alignment
    let wallCornerOffsetX = 0;
    let wallCornerOffsetZ = 0;
    if (metadata.walls && metadata.walls.length >= 2) {
      // Find the closest wall corner to the model's min corner
      // For now, use min-to-min, but we could refine this
      wallCornerOffsetX = minToMinOffsetX;
      wallCornerOffsetZ = minToMinOffsetZ;
    }
    
    // Try firstWallToMin alignment for L-shapes (align first wall to model's min corner)
    // This is more precise than bounding box alignment for simple shapes
    // Use this if we have walls, otherwise fallback to min-to-min
    let xzOffsetX: number;
    let xzOffsetZ: number;
    let selectedStrategy = 'minToMin';
    
    if (metadata.walls && metadata.walls.length > 0 && metadata.walls[0].transform) {
      // Use first wall alignment (more precise for L-shapes)
      xzOffsetX = firstWallOffsetX;
      xzOffsetZ = firstWallOffsetZ;
      selectedStrategy = 'firstWallToMin';
    } else {
      // Fallback to min-to-min alignment
      xzOffsetX = minToMinOffsetX;
      xzOffsetZ = minToMinOffsetZ;
    }
    
    centerOffset = new THREE.Vector3(
      xzOffsetX,
      0, // Y offset not used - we position relative to floor
      xzOffsetZ
    );
    
    console.log('📐 [Measurements] Bounding box alignment (XZ - all strategies):', {
      modelBoundingBox: {
        minX: modelMinX.toFixed(6),
        minZ: modelMinZ.toFixed(6),
        maxX: modelTransform.boundingBox.max.x.toFixed(6),
        maxZ: modelTransform.boundingBox.max.z.toFixed(6),
        centerX: modelCenterX.toFixed(6),
        centerZ: modelCenterZ.toFixed(6),
      },
      scaledRoomPlanBoundingBox: {
        minX: roomPlanMinX.toFixed(6),
        minZ: roomPlanMinZ.toFixed(6),
        maxX: roomPlanMaxX.toFixed(6),
        maxZ: roomPlanMaxZ.toFixed(6),
        centerX: roomPlanCenterX.toFixed(6),
        centerZ: roomPlanCenterZ.toFixed(6),
        positionCount: scaledRoomPlanPositions.length,
      },
      alignmentStrategies: {
        minToMin: `(${minToMinOffsetX.toFixed(6)}, ${minToMinOffsetZ.toFixed(6)})${selectedStrategy === 'minToMin' ? ' - SELECTED' : ''}`,
        maxToMax: `(${maxToMaxOffsetX.toFixed(6)}, ${maxToMaxOffsetZ.toFixed(6)})`,
        centerToCenter: `(${centerToCenterOffsetX.toFixed(6)}, ${centerToCenterOffsetZ.toFixed(6)})`,
        firstWallToMin: `(${firstWallOffsetX.toFixed(6)}, ${firstWallOffsetZ.toFixed(6)})${selectedStrategy === 'firstWallToMin' ? ' - SELECTED' : ''}`,
      },
      selectedStrategy,
      xzOffset: `(${xzOffsetX.toFixed(6)}, ${xzOffsetZ.toFixed(6)})`,
      note: selectedStrategy === 'firstWallToMin' 
        ? 'First wall aligned to model min corner (more precise for L-shapes)'
        : 'Min-to-min aligns bottom-left corners of bounding boxes',
      help: 'If still misaligned, try switching to minToMin or centerToCenter manually',
    });
    
    // Model rotation from Zustand store (quaternion)
    modelRotation = new THREE.Quaternion(
      modelTransform.rotation[0],
      modelTransform.rotation[1],
      modelTransform.rotation[2],
      modelTransform.rotation[3]
    );
    const euler = new THREE.Euler().setFromQuaternion(modelRotation);
    console.log('📐 [Measurements] Model rotation:', {
      quaternion: `(${modelRotation.x.toFixed(6)}, ${modelRotation.y.toFixed(6)}, ${modelRotation.z.toFixed(6)}, ${modelRotation.w.toFixed(6)})`,
      euler: `(${(euler.x * 180 / Math.PI).toFixed(2)}°, ${(euler.y * 180 / Math.PI).toFixed(2)}°, ${(euler.z * 180 / Math.PI).toFixed(2)}°)`,
    });
    
    // Create 180° Y rotation quaternion for RoomPlan alignment (reused throughout)
    // RoomPlan coordinate system is 180° opposite to model coordinates
    const roomPlanToModelRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  } else {
    // Fallback to legacy behavior (bounding-box approximation)
    console.warn('⚠️ [Measurements] Using fallback scaling - precise alignment not available');
    console.warn('   → Model transform or scale factor not provided');
    console.warn('   → This will use approximate alignment');
    console.warn('   → Measurements may appear small or misaligned');
    console.warn('   → Solution: Ensure model is loaded and Phase 1 transform extraction completed');
    
    // CRITICAL: Without transform data, we can't properly scale measurements
    // The model is scaled by ModelLoader (typically ~11x), but measurements use 1.0 scale
    // This causes measurements to appear much smaller than the model
    finalScaleFactor = 1.0; // Fallback (WRONG - should match model scale ~11x)
    modelFloorY = 0; // Fallback
    centerOffset = new THREE.Vector3(0, 0, 0);
    modelRotation = new THREE.Quaternion(0, 0, 0, 1); // Identity
  }
  
  // Create 180° Y rotation quaternion for RoomPlan alignment (reused throughout all measurements)
  // RoomPlan coordinate system is 180° opposite to model coordinates
  const roomPlanToModelRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

  // Phase 1: Calculate and collect surface areas for all walls
  let totalSurfaceArea = 0;
  const wallSurfaceAreas: Map<string, number> = new Map(); // Map wall identifier to surface area

  // Create wall visualizations with precise alignment
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
        
        // Phase 2: Apply precise transformations using Zustand store data
        // 1. Scale RoomPlan coordinates to match model scale (1mm precision)
        const verticalScale = scaleFactor?.verticalScale || finalScaleFactor;
        let scaledPosition = new THREE.Vector3(
          position.x * finalScaleFactor,
          position.y * verticalScale, // Use vertical scale for Y
          position.z * finalScaleFactor
        );
        
        // 2. Store Y position separately (Y is vertical, not affected by rotation)
        // RoomPlan positions are relative to RoomPlan center, NOT floor
        // We need to convert from center-relative to floor-relative before scaling
        const roomPlanCenterY = roomPlanSystem?.boundingBox?.center?.y ?? 0;
        const roomPlanMinY = roomPlanSystem?.boundingBox?.min?.y ?? 0;
        const averageWallHeight = roomPlanSystem?.averageWallHeight ?? 2.5;
        const roomPlanFloorY = roomPlanMinY - (averageWallHeight / 2);
        
        // Convert RoomPlan position from absolute to floor-relative
        // position.y from the transform matrix is already the absolute wall center Y
        // RoomPlan floor is at (roomPlanMinY - averageWallHeight/2)
        // So wall center relative to floor = position.y - roomPlanFloorY
        const positionYRelativeToFloor = position.y - roomPlanFloorY;
        const scaledY = positionYRelativeToFloor * verticalScale; // Scaled RoomPlan Y (now relative to floor)
        
        // 3. Align RoomPlan positions to model coordinate system
        // RoomPlan wall positions are relative to RoomPlan origin (which is RoomPlan center)
        // Model is centered at modelCenter
        // For XZ (horizontal): apply center offset to align RoomPlan center with model center
        // For Y (vertical): position relative to model floor, NOT model center
        // IMPORTANT: Don't add centerOffset.y for Y - we want positions relative to floor, not center
        
        // Log XZ positioning details for debugging
        const beforeOffsetX = scaledPosition.x;
        const beforeOffsetZ = scaledPosition.z;
        
        scaledPosition.x += centerOffset.x; // Translate X from RoomPlan space to model space
        scaledPosition.z += centerOffset.z; // Translate Z from RoomPlan space to model space
        scaledPosition.y = modelFloorY + scaledY; // Set Y position relative to model floor (vertical)
        
        console.log(`📐 [Phase 2] Wall ${i} XZ positioning:`, {
          originalRoomPlanPos: `(${position.x.toFixed(6)}, ${position.z.toFixed(6)})`,
          afterScaling: `(${beforeOffsetX.toFixed(6)}, ${beforeOffsetZ.toFixed(6)})`,
          centerOffset: `(${centerOffset.x.toFixed(6)}, ${centerOffset.z.toFixed(6)})`,
          finalPosition: `(${scaledPosition.x.toFixed(6)}, ${scaledPosition.z.toFixed(6)})`,
          modelCenter: `(${modelTransform!.boundingBox.center.x.toFixed(6)}, ${modelTransform!.boundingBox.center.z.toFixed(6)})`,
          roomPlanCenter: roomPlanSystem?.boundingBox?.center ? `(Y: ${(roomPlanSystem.boundingBox.center.y * finalScaleFactor).toFixed(6)})` : 'N/A',
        });
        
        console.log(`📐 [Phase 2] Wall ${i} Y calculation:`, {
          originalPositionY: position.y.toFixed(6),
          roomPlanFloorY: roomPlanFloorY.toFixed(6),
          roomPlanCenterY: roomPlanCenterY.toFixed(6),
          roomPlanMinY: roomPlanMinY.toFixed(6),
          averageWallHeight: averageWallHeight.toFixed(6),
          positionYRelativeToFloor: positionYRelativeToFloor.toFixed(6),
          scaledY: scaledY.toFixed(6),
          modelFloorY: modelFloorY.toFixed(6),
          finalY: scaledPosition.y.toFixed(6),
        });
        
        // 5. Use wall's native rotation (no model rotation compensation needed if positions align)
        const finalRotation = rotation.clone();
        
        // Use minimum thickness for walls when depth is 0 (RoomPlan walls are planar)
        const actualDepth = depth === 0 ? 0.1 : depth;
        
        // Apply precise scale to measurements to match model scale (1mm precision)
        const scaledWidth = width * finalScaleFactor;
        const scaledHeight = height * (scaleFactor?.verticalScale || finalScaleFactor);
        const scaledDepth = actualDepth * finalScaleFactor;
        
        // Phase 1: Calculate surface area (width × height in m²)
        // This is the paintable/surface area of the wall
        const surfaceArea = width * height; // m²
        const wallId = wall.identifier || `wall-${i}`;
        
        // Store surface area for this wall
        wallSurfaceAreas.set(wallId, surfaceArea);
        totalSurfaceArea += surfaceArea;
        
        console.log(`🔍 [Phase 2] Wall ${i} transformation:`, {
          wallIdentifier: wallId,
          realDimensions: `${width.toFixed(6)}m x ${height.toFixed(6)}m x ${depth.toFixed(6)}m`,
          surfaceArea: `${surfaceArea.toFixed(2)}m²`, // Added surface area
          scaledDimensions: `${scaledWidth.toFixed(6)} x ${scaledHeight.toFixed(6)} x ${scaledDepth.toFixed(6)}`,
          scaleFactor: finalScaleFactor.toFixed(6),
          verticalScale: verticalScale.toFixed(6),
          originalRoomPlanPosition: `(${position.x.toFixed(6)}, ${position.y.toFixed(6)}, ${position.z.toFixed(6)})`,
          afterScaling: `(${(position.x * finalScaleFactor).toFixed(6)}, ${(position.y * verticalScale).toFixed(6)}, ${(position.z * finalScaleFactor).toFixed(6)})`,
          afterCenterOffset: `(${(position.x * finalScaleFactor + centerOffset.x).toFixed(6)}, ${(position.y * verticalScale + centerOffset.y).toFixed(6)}, ${(position.z * finalScaleFactor + centerOffset.z).toFixed(6)})`,
          finalScaledPosition: `(${scaledPosition.x.toFixed(6)}, ${scaledPosition.y.toFixed(6)}, ${scaledPosition.z.toFixed(6)})`,
          modelFloorY: modelFloorY.toFixed(6),
          centerOffset: `(${centerOffset.x.toFixed(6)}, ${centerOffset.y.toFixed(6)}, ${centerOffset.z.toFixed(6)})`,
          rotation: `(${finalRotation.x.toFixed(6)}, ${finalRotation.y.toFixed(6)}, ${finalRotation.z.toFixed(6)}, ${finalRotation.w.toFixed(6)})`
        });
        
        // Phase 2: Create wall visualization using LineSegments for dimensions and Points for labels
        // Extract wall vertices from transform + dimensions (reconstruct if not in JSON)
        const halfWidth = scaledWidth / 2;
        const halfHeight = scaledHeight / 2;
        const halfDepth = scaledDepth / 2;
        
        // Calculate wall corner vertices in local space (at wall center)
        // Wall extends along X axis (width), Y axis (height), Z axis (depth)
        const wallVertices: THREE.Vector3[] = [
          // Bottom face (at y = -halfHeight)
          new THREE.Vector3(-halfWidth, -halfHeight, -halfDepth), // Bottom-left-back
          new THREE.Vector3( halfWidth, -halfHeight, -halfDepth), // Bottom-right-back
          new THREE.Vector3( halfWidth, -halfHeight,  halfDepth), // Bottom-right-front
          new THREE.Vector3(-halfWidth, -halfHeight,  halfDepth), // Bottom-left-front
          // Top face (at y = +halfHeight)
          new THREE.Vector3(-halfWidth,  halfHeight, -halfDepth), // Top-left-back
          new THREE.Vector3( halfWidth,  halfHeight, -halfDepth), // Top-right-back
          new THREE.Vector3( halfWidth,  halfHeight,  halfDepth), // Top-right-front
          new THREE.Vector3(-halfWidth,  halfHeight,  halfDepth), // Top-left-front
        ];
        
        // Transform vertices to world space using wall's rotation and position
        wallVertices.forEach(vertex => {
          vertex.applyQuaternion(finalRotation);
          vertex.add(scaledPosition);
        });
        
        // Create LineSegments for wall edges (wireframe visualization)
        // Bottom face edges
        const bottomEdges = [
          [0, 1], [1, 2], [2, 3], [3, 0], // Bottom face perimeter
        ];
        // Top face edges
        const topEdges = [
          [4, 5], [5, 6], [6, 7], [7, 4], // Top face perimeter
        ];
        // Vertical edges (connecting bottom to top)
        const verticalEdges = [
          [0, 4], [1, 5], [2, 6], [3, 7], // Vertical edges
        ];
        
        // Create line geometry for all edges
        const edgeIndices = [...bottomEdges, ...topEdges, ...verticalEdges];
        const linePoints: number[] = [];
        edgeIndices.forEach(([start, end]) => {
          const startVertex = wallVertices[start];
          const endVertex = wallVertices[end];
          linePoints.push(
            startVertex.x, startVertex.y, startVertex.z,
            endVertex.x, endVertex.y, endVertex.z
          );
        });
        
        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePoints, 3));
        
        const lineMaterial = new THREE.LineBasicMaterial({
          color: isDarkMode ? 0xa78bfa : 0x9333ea, // Accent purple
          linewidth: 2,
          transparent: true,
          opacity: 0.8,
        });
        
        const wallLines = new THREE.LineSegments(lineGeometry, lineMaterial);
        wallLines.name = `wall-${i}-lines`;
        group.add(wallLines);
        
        // Create Points for corner markers (small spheres at vertices)
        const pointGeometry = new THREE.BufferGeometry();
        const pointPositions: number[] = [];
        wallVertices.forEach(vertex => {
          pointPositions.push(vertex.x, vertex.y, vertex.z);
        });
        pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));
        
        const pointMaterial = new THREE.PointsMaterial({
          color: isDarkMode ? 0xffffff : 0x000000,
          size: 3,
          transparent: true,
          opacity: 0.9,
        });
        
        // Removed: Points visualization (user doesn't want squared points)
        // const wallPoints = new THREE.Points(pointGeometry, pointMaterial);
        // wallPoints.name = `wall-${i}-points`;
        // group.add(wallPoints);
        
        console.log(`✅ [Phase 2] Created wall ${i} visualization with LineSegments and Points`);
        
        // Create dimension label (SketchUp style) using precise scale factor
        // Include surface area in label: "2.31m × 2.49m (5.75m²)"
        try {
          const dimensionLabel = createWallDimensionLabel({
            width,
            height,
            surfaceArea, // Pass surface area for label display
            position: scaledPosition,
            rotation: finalRotation,
            measurementScale: finalScaleFactor, // Use precise scale factor
            isDarkMode,
            labelOffset: 0.05,
            extensionLineLength: 0.2,
          });

          // Add text sprite
          group.add(dimensionLabel.textSprite);
          console.log(`📐 [Measurements] Added dimension label for wall ${i}: ${width.toFixed(2)}m × ${height.toFixed(2)}m (${surfaceArea.toFixed(2)}m²)`);

          // Add extension lines
          dimensionLabel.extensionLines.forEach((line) => {
            group.add(line);
          });

          // Removed: Corner markers (user doesn't want squared points)
          // dimensionLabel.cornerMarkers.forEach((marker) => {
          //   group.add(marker);
          // });
        } catch (labelError) {
          console.warn(`⚠️ [Measurements] Failed to create dimension label for wall ${i}:`, labelError);
          // Don't fail wall creation if label creation fails
        }
      } catch (error) {
        console.error(`❌ [Measurements] Error creating wall ${i}:`, error);
      }
    });
  }

  // Create door markers (Phase 2: using precise transformations)
  if (metadata.doors && Array.isArray(metadata.doors)) {
    metadata.doors.forEach((door, i) => {
      if (!door || !door.transform || !Array.isArray(door.transform) || door.transform.length !== 16) {
        console.warn(`⚠️ [Measurements] Invalid door data at index ${i}:`, door);
        return;
      }
      
      try {
        const transform = new THREE.Matrix4().fromArray(door.transform);
        const rotation = new THREE.Quaternion();
        const position = new THREE.Vector3();
        const scale = new THREE.Vector3();
        transform.decompose(position, rotation, scale);
        
        // Phase 2: Apply precise transformations using Zustand store data (same as walls)
        // 1. Scale RoomPlan coordinates to match model scale (1mm precision)
        const verticalScale = scaleFactor?.verticalScale || finalScaleFactor;
        let scaledPosition = new THREE.Vector3(
          position.x * finalScaleFactor,
          position.y * verticalScale, // Use vertical scale for Y
          position.z * finalScaleFactor
        );
        
        // 2. Store Y position separately (Y is vertical, not affected by rotation)
        // RoomPlan positions are relative to RoomPlan center, NOT floor
        // We need to convert from center-relative to floor-relative before scaling
        const roomPlanCenterY = roomPlanSystem?.boundingBox?.center?.y ?? 0;
        const roomPlanMinY = roomPlanSystem?.boundingBox?.min?.y ?? 0;
        const averageWallHeight = roomPlanSystem?.averageWallHeight ?? 2.5;
        const roomPlanFloorY = roomPlanMinY - (averageWallHeight / 2);
        
        // Convert RoomPlan position from absolute to floor-relative
        // position.y from the transform matrix is already the absolute wall center Y
        // RoomPlan floor is at (roomPlanMinY - averageWallHeight/2)
        // So wall center relative to floor = position.y - roomPlanFloorY
        const positionYRelativeToFloor = position.y - roomPlanFloorY;
        const scaledY = positionYRelativeToFloor * verticalScale; // Scaled RoomPlan Y (now relative to floor)
        
        // 3. Align RoomPlan positions to model coordinate system (same as walls)
        // For XZ (horizontal): apply center offset to align RoomPlan center with model center
        // For Y (vertical): position relative to model floor, NOT model center
        // IMPORTANT: Don't add centerOffset.y for Y - we want positions relative to floor, not center
        scaledPosition.x += centerOffset.x; // Translate X from RoomPlan space to model space
        scaledPosition.z += centerOffset.z; // Translate Z from RoomPlan space to model space
        scaledPosition.y = modelFloorY + scaledY; // Set Y position relative to model floor (vertical)
        
        console.log(`📐 [Phase 2] Door ${i} Y calculation:`, {
          originalPositionY: position.y.toFixed(6),
          roomPlanFloorY: roomPlanFloorY.toFixed(6),
          roomPlanCenterY: roomPlanCenterY.toFixed(6),
          roomPlanMinY: roomPlanMinY.toFixed(6),
          averageWallHeight: averageWallHeight.toFixed(6),
          positionYRelativeToFloor: positionYRelativeToFloor.toFixed(6),
          scaledY: scaledY.toFixed(6),
          modelFloorY: modelFloorY.toFixed(6),
          finalY: scaledPosition.y.toFixed(6),
        });
        
        // 4. Use door's native rotation (no model rotation compensation needed if positions align)
        const finalRotation = rotation.clone();
        
        // Create door visualization with proper dimensions
        // Door: 0.9m wide x 2.0m high x 0.1m thick (standard door size)
        const doorWidth = 0.9 * finalScaleFactor;
        const doorHeight = 2.0 * (scaleFactor?.verticalScale || finalScaleFactor);
        const doorThickness = 0.1 * finalScaleFactor;
        
        console.log(`🔍 [Phase 2] Door ${i} transformation:`, {
          doorIndex: i,
          originalRoomPlanPosition: `(${position.x.toFixed(6)}, ${position.y.toFixed(6)}, ${position.z.toFixed(6)})`,
          afterScaling: `(${(position.x * finalScaleFactor).toFixed(6)}, ${(position.y * verticalScale).toFixed(6)}, ${(position.z * finalScaleFactor).toFixed(6)})`,
          afterCenterOffset: `(${scaledPosition.x.toFixed(6)}, ${scaledPosition.y.toFixed(6)}, ${scaledPosition.z.toFixed(6)})`,
          finalScaledPosition: `(${scaledPosition.x.toFixed(6)}, ${scaledPosition.y.toFixed(6)}, ${scaledPosition.z.toFixed(6)})`,
          modelFloorY: modelFloorY.toFixed(6),
          centerOffset: `(${centerOffset.x.toFixed(6)}, ${centerOffset.y.toFixed(6)}, ${centerOffset.z.toFixed(6)})`,
          rotation: `(${finalRotation.x.toFixed(6)}, ${finalRotation.y.toFixed(6)}, ${finalRotation.z.toFixed(6)}, ${finalRotation.w.toFixed(6)})`,
          doorDimensions: `0.9m x 2.0m x 0.1m (scaled: ${doorWidth.toFixed(3)} x ${doorHeight.toFixed(3)} x ${doorThickness.toFixed(3)})`,
        });
        
        const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, doorThickness);
        const doorMaterial = new THREE.MeshBasicMaterial({ 
          color: 0x00ff00, // Green
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide
        });
        const doorMesh = new THREE.Mesh(doorGeometry, doorMaterial);
        doorMesh.quaternion.copy(finalRotation);
        doorMesh.position.copy(scaledPosition);
        doorMesh.name = `door-${i}`;
        group.add(doorMesh);
        
        // Add door frame outline for better visibility
        const doorFrameEdges = new THREE.EdgesGeometry(doorGeometry);
        const doorFrameLines = new THREE.LineSegments(
          doorFrameEdges,
          new THREE.LineBasicMaterial({ 
            color: 0x00aa00, // Darker green
            linewidth: 2
          })
        );
        doorFrameLines.position.copy(scaledPosition);
        doorFrameLines.quaternion.copy(finalRotation);
        doorFrameLines.name = `door-${i}-frame`;
        group.add(doorFrameLines);
      } catch (error) {
        console.error(`❌ [Measurements] Error creating door ${i}:`, error);
      }
    });
  }

  // Create window markers (Phase 2: using precise transformations)
  if (metadata.windows && Array.isArray(metadata.windows)) {
    metadata.windows.forEach((window, i) => {
      if (!window || !window.transform || !Array.isArray(window.transform) || window.transform.length !== 16) {
        console.warn(`⚠️ [Measurements] Invalid window data at index ${i}:`, window);
        return;
      }
      
      try {
        const transform = new THREE.Matrix4().fromArray(window.transform);
        const rotation = new THREE.Quaternion();
        const position = new THREE.Vector3();
        const scale = new THREE.Vector3();
        transform.decompose(position, rotation, scale);
        
        // Phase 2: Apply precise transformations using Zustand store data (same as walls)
        // 1. Scale RoomPlan coordinates to match model scale (1mm precision)
        const verticalScale = scaleFactor?.verticalScale || finalScaleFactor;
        let scaledPosition = new THREE.Vector3(
          position.x * finalScaleFactor,
          position.y * verticalScale, // Use vertical scale for Y
          position.z * finalScaleFactor
        );
        
        // 2. Store Y position separately (Y is vertical, not affected by rotation)
        // RoomPlan positions are relative to RoomPlan center, NOT floor
        // We need to convert from center-relative to floor-relative before scaling
        const roomPlanCenterY = roomPlanSystem?.boundingBox?.center?.y ?? 0;
        const roomPlanMinY = roomPlanSystem?.boundingBox?.min?.y ?? 0;
        const averageWallHeight = roomPlanSystem?.averageWallHeight ?? 2.5;
        const roomPlanFloorY = roomPlanMinY - (averageWallHeight / 2);
        
        // Convert RoomPlan position from absolute to floor-relative
        // position.y from the transform matrix is already the absolute wall center Y
        // RoomPlan floor is at (roomPlanMinY - averageWallHeight/2)
        // So wall center relative to floor = position.y - roomPlanFloorY
        const positionYRelativeToFloor = position.y - roomPlanFloorY;
        const scaledY = positionYRelativeToFloor * verticalScale; // Scaled RoomPlan Y (now relative to floor)
        
        // 3. Align RoomPlan positions to model coordinate system (same as walls/doors)
        // For XZ (horizontal): apply center offset to align RoomPlan center with model center
        // For Y (vertical): position relative to model floor, NOT model center
        // IMPORTANT: Don't add centerOffset.y for Y - we want positions relative to floor, not center
        scaledPosition.x += centerOffset.x; // Translate X from RoomPlan space to model space
        scaledPosition.z += centerOffset.z; // Translate Z from RoomPlan space to model space
        scaledPosition.y = modelFloorY + scaledY; // Set Y position relative to model floor (vertical)
        
        console.log(`📐 [Phase 2] Window ${i} Y calculation:`, {
          originalPositionY: position.y.toFixed(6),
          roomPlanFloorY: roomPlanFloorY.toFixed(6),
          roomPlanCenterY: roomPlanCenterY.toFixed(6),
          roomPlanMinY: roomPlanMinY.toFixed(6),
          averageWallHeight: averageWallHeight.toFixed(6),
          positionYRelativeToFloor: positionYRelativeToFloor.toFixed(6),
          scaledY: scaledY.toFixed(6),
          modelFloorY: modelFloorY.toFixed(6),
          finalY: scaledPosition.y.toFixed(6),
        });
        
        // 4. Use window's native rotation (no model rotation compensation needed if positions align)
        const finalRotation = rotation.clone();
        
        // Create window visualization with proper dimensions
        // Window: 1.2m wide x 1.5m high x 0.1m thick (standard window size)
        const windowWidth = 1.2 * finalScaleFactor;
        const windowHeight = 1.5 * (scaleFactor?.verticalScale || finalScaleFactor);
        const windowThickness = 0.1 * finalScaleFactor;
        
        const windowGeometry = new THREE.BoxGeometry(windowWidth, windowHeight, windowThickness);
        const windowMaterial = new THREE.MeshBasicMaterial({ 
          color: 0x0080ff, // Blue
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide
        });
        const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
        windowMesh.quaternion.copy(finalRotation);
        windowMesh.position.copy(scaledPosition);
        windowMesh.name = `window-${i}`;
        group.add(windowMesh);
        
        // Add window frame outline for better visibility
        const windowFrameEdges = new THREE.EdgesGeometry(windowGeometry);
        const windowFrameLines = new THREE.LineSegments(
          windowFrameEdges,
          new THREE.LineBasicMaterial({ 
            color: 0x0066cc, // Darker blue
            linewidth: 2
          })
        );
        windowFrameLines.position.copy(scaledPosition);
        windowFrameLines.quaternion.copy(finalRotation);
        windowFrameLines.name = `window-${i}-frame`;
        group.add(windowFrameLines);
      } catch (error) {
        console.error(`❌ [Measurements] Error creating window ${i}:`, error);
      }
    });
  }

  // Phase 1: Log total surface area
  if (totalSurfaceArea > 0) {
    console.log(`📐 [Measurements] Total surface area calculated: ${totalSurfaceArea.toFixed(2)}m²`, {
      wallCount: wallSurfaceAreas.size,
      averageWallArea: (totalSurfaceArea / wallSurfaceAreas.size).toFixed(2) + 'm²',
    });
    
    // Store surface areas in metadata if it has the surfaceArea property
    // Note: This mutates the metadata, but it's okay since we're storing calculated values
    if (metadata.walls) {
      metadata.walls.forEach((wall) => {
        const wallId = wall.identifier || `wall-${metadata.walls?.indexOf(wall) || 0}`;
        const area = wallSurfaceAreas.get(wallId);
        if (area !== undefined && 'surfaceArea' in wall) {
          (wall as any).surfaceArea = area;
        }
      });
      
      // Store total surface area in metadata (always add it, even if property doesn't exist)
      (metadata as any).totalSurfaceArea = totalSurfaceArea;
    }
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
