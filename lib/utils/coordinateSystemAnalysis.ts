/**
 * Coordinate System Analysis and Calibration Utility
 * Phase 1: Extract and analyze model and RoomPlan coordinate systems
 * Goal: Achieve 1:1 pixel/mm precision alignment between model and measurements
 */

import * as THREE from 'three';

/**
 * Model transformation details captured after loading
 */
export interface ModelTransform {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
  boundingBox: THREE.Box3;
  boundingSphere: THREE.Sphere;
  vertexSample: THREE.Vector3[]; // Sample of actual vertices (max 100)
  center: THREE.Vector3;
  size: THREE.Vector3;
  matrix: THREE.Matrix4; // Complete transformation matrix
}

/**
 * RoomPlan coordinate system analysis
 */
export interface RoomPlanCoordinateSystem {
  units: 'meters' | 'unknown';
  origin: THREE.Vector3 | null; // Detected origin point
  boundingBox: THREE.Box3 | null; // Bounding box of all RoomPlan elements
  wallCount: number;
  hasVertexData: boolean; // Whether JSON includes actual vertex positions
  averageWallWidth: number;
  averageWallHeight: number;
  totalSurfaceArea: number | null;
}

/**
 * Precise scale factor calculation result
 */
export interface ScaleFactorAnalysis {
  scaleX: number; // Scale factor for X axis (model / roomplan)
  scaleY: number; // Scale factor for Y axis (model / roomplan)
  scaleZ: number; // Scale factor for Z axis (model / roomplan)
  uniformHorizontalScale: number; // Average of X and Z for walls
  verticalScale: number; // Y scale for height
  centerOffset: THREE.Vector3; // Offset to align centers
  rotationDifference: THREE.Quaternion; // Rotation difference between systems
  precision: number; // Precision achieved (in meters, target: 0.001m = 1mm)
  confidence: 'high' | 'medium' | 'low'; // Confidence in alignment
}

/**
 * Extract model transformation details after loading
 * This captures the exact transformation state of the model in the scene
 */
export function extractModelTransform(model: THREE.Object3D, maxVertexSample: number = 100): ModelTransform {
  // Update matrix world to ensure accurate bounding box calculation
  model.updateMatrixWorld(true);
  
  // Get bounding box and sphere
  const boundingBox = new THREE.Box3().setFromObject(model);
  const center = boundingBox.getCenter(new THREE.Vector3());
  const size = boundingBox.getSize(new THREE.Vector3());
  const boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
  
  // Extract position, rotation, scale
  const position = model.position.clone();
  const rotation = model.quaternion.clone();
  const scale = model.scale.clone();
  
  // Get transformation matrix
  const matrix = model.matrixWorld.clone();
  
  // Sample vertices from the model (for precise dimension verification)
  const vertexSample: THREE.Vector3[] = [];
  let vertexCount = 0;
  
  model.traverse((child) => {
    if (vertexCount >= maxVertexSample) return;
    
    if (child instanceof THREE.Mesh && child.geometry) {
      const geometry = child.geometry;
      const positions = geometry.attributes.position;
      
      if (positions) {
        const positionArray = positions.array;
        const vertexCountInMesh = positions.count;
        
        // Sample vertices from this mesh (every Nth vertex to get distribution)
        const sampleInterval = Math.max(1, Math.floor(vertexCountInMesh / (maxVertexSample - vertexCount)));
        
        for (let i = 0; i < vertexCountInMesh && vertexCount < maxVertexSample; i += sampleInterval) {
          const vertex = new THREE.Vector3(
            positionArray[i * 3],
            positionArray[i * 3 + 1],
            positionArray[i * 3 + 2]
          );
          
          // Transform to world space
          child.localToWorld(vertex);
          vertexSample.push(vertex);
          vertexCount++;
        }
      }
    }
  });
  
  return {
    position,
    rotation,
    scale,
    boundingBox,
    boundingSphere,
    vertexSample,
    center,
    size,
    matrix,
  };
}

/**
 * Analyze RoomPlan JSON coordinate system
 */
export function analyzeRoomPlanCoordinateSystem(
  metadata: any,
  walls: Array<{ dimensions: [number, number, number]; transform: number[] }> = []
): RoomPlanCoordinateSystem {
  // Default analysis
  const analysis: RoomPlanCoordinateSystem = {
    units: 'meters', // RoomPlan uses meters by default
    origin: null,
    boundingBox: null,
    wallCount: walls?.length || 0,
    hasVertexData: false, // Check if actual vertex positions are available
    averageWallWidth: 0,
    averageWallHeight: 0,
    totalSurfaceArea: null,
  };
  
  if (!walls || walls.length === 0) {
    return analysis;
  }
  
  // Calculate bounding box from wall transforms
  const positions: THREE.Vector3[] = [];
  let totalWidth = 0;
  let totalHeight = 0;
  let totalSurfaceArea = 0;
  
  walls.forEach((wall) => {
    if (wall.transform && wall.transform.length === 16 && wall.dimensions && wall.dimensions.length === 3) {
      const transform = new THREE.Matrix4().fromArray(wall.transform);
      const position = new THREE.Vector3();
      const rotation = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      
      transform.decompose(position, rotation, scale);
      positions.push(position);
      
      const [width, height, depth] = wall.dimensions;
      totalWidth += width;
      totalHeight += height;
      totalSurfaceArea += width * height; // Wall surface area (m²)
      
      // Check for vertex data in metadata (if available)
      if ((metadata as any).vertices || (wall as any).vertices) {
        analysis.hasVertexData = true;
      }
    }
  });
  
  if (positions.length > 0) {
    // Calculate bounding box from wall positions
    const min = new THREE.Vector3(
      Math.min(...positions.map(p => p.x)),
      Math.min(...positions.map(p => p.y)),
      Math.min(...positions.map(p => p.z))
    );
    const max = new THREE.Vector3(
      Math.max(...positions.map(p => p.x)),
      Math.max(...positions.map(p => p.y)),
      Math.max(...positions.map(p => p.z))
    );
    
    analysis.boundingBox = new THREE.Box3(min, max);
    analysis.origin = analysis.boundingBox.getCenter(new THREE.Vector3());
    analysis.averageWallWidth = totalWidth / walls.length;
    analysis.averageWallHeight = totalHeight / walls.length;
    analysis.totalSurfaceArea = totalSurfaceArea;
  }
  
  return analysis;
}

/**
 * Calculate precise scale factors between model and RoomPlan coordinate systems
 * Target: 1mm precision (0.001m)
 */
export function calculatePreciseScaleFactor(
  modelTransform: ModelTransform,
  roomPlanSystem: RoomPlanCoordinateSystem,
  walls: Array<{ dimensions: [number, number, number]; transform: number[] }> = []
): ScaleFactorAnalysis {
  const result: ScaleFactorAnalysis = {
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    uniformHorizontalScale: 1,
    verticalScale: 1,
    centerOffset: new THREE.Vector3(),
    rotationDifference: new THREE.Quaternion(),
    precision: Infinity,
    confidence: 'low',
  };
  
  // If we don't have both model and RoomPlan bounding boxes, return default
  if (!roomPlanSystem.boundingBox || modelTransform.size.length() === 0) {
    console.warn('⚠️ [CoordinateSystem] Cannot calculate scale: missing bounding box data');
    return result;
  }
  
  // CRITICAL FIX: Use ModelLoader's scale factor directly, not bounding box comparison
  // The ModelLoader applies: scale = (targetSize / maxDim) * scaleMultiplier
  // This scale factor (e.g., 11.086784) is what transforms RoomPlan meters to model units
  // We should use this directly instead of comparing bounding boxes which gives wrong results
  
  // Extract ModelLoader's scale factor from model transform
  // The model.scale is the uniform scale applied by ModelLoader
  const modelLoaderScale = modelTransform.scale.x; // ModelLoader applies uniform scale (x=y=z)
  
  // For coordinate system alignment, we need to scale RoomPlan coordinates (in meters)
  // to match the model's coordinate system (already scaled by ModelLoader)
  // So: scaleFactor = ModelLoader scale (e.g., 11.086784 units per meter)
  result.scaleX = modelLoaderScale;
  result.scaleY = modelLoaderScale; // Vertical scale should match (walls are vertical)
  result.scaleZ = modelLoaderScale;
  
  // Log for debugging
  const modelSize = modelTransform.size;
  const roomPlanSize = roomPlanSystem.boundingBox.getSize(new THREE.Vector3());
  
  console.log('📊 [ScaleFactor] Using ModelLoader scale directly (not bounding box comparison):', {
    modelLoaderScale: modelLoaderScale.toFixed(6),
    modelSize: { x: modelSize.x.toFixed(6), y: modelSize.y.toFixed(6), z: modelSize.z.toFixed(6) },
    roomPlanSize: { x: roomPlanSize.x.toFixed(6), y: roomPlanSize.y.toFixed(6), z: roomPlanSize.z.toFixed(6) },
    note: 'Using ModelLoader scale factor directly (model units per meter)',
  });
  
  console.log('📊 [ScaleFactor] Model vs RoomPlan size comparison:', {
    modelSize: { x: modelSize.x.toFixed(6), y: modelSize.y.toFixed(6), z: modelSize.z.toFixed(6) },
    roomPlanSize: { x: roomPlanSize.x.toFixed(6), y: roomPlanSize.y.toFixed(6), z: roomPlanSize.z.toFixed(6) },
    calculatedScaleX: result.scaleX.toFixed(6),
    calculatedScaleY: result.scaleY.toFixed(6),
    calculatedScaleZ: result.scaleZ.toFixed(6),
    modelScale: { x: modelTransform.scale.x.toFixed(6), y: modelTransform.scale.y.toFixed(6), z: modelTransform.scale.z.toFixed(6) },
  });
  
  // For walls, use uniform horizontal scale (all axes use ModelLoader scale)
  result.uniformHorizontalScale = modelLoaderScale;
  result.verticalScale = modelLoaderScale; // Walls are vertical, use same scale
  
  // Calculate center offset (difference between model center and scaled RoomPlan center)
  // This offset aligns RoomPlan origin with model center after scaling
  const modelCenter = modelTransform.center;
  const roomPlanCenter = roomPlanSystem.boundingBox.getCenter(new THREE.Vector3());
  
  // Scale the RoomPlan center to match model scale
  const scaledRoomPlanCenter = new THREE.Vector3(
    roomPlanCenter.x * result.uniformHorizontalScale,
    roomPlanCenter.y * result.verticalScale,
    roomPlanCenter.z * result.uniformHorizontalScale
  );
  
  // Calculate center offset WITHOUT rotation
  // Positions will have offset applied FIRST, then rotate around model center
  // This matches how the model works: it's positioned, then rotated around its center
  result.centerOffset = modelCenter.clone().sub(scaledRoomPlanCenter);
  
  console.log('📊 [ScaleFactor] Center offset calculation (NO rotation - will rotate around model center):', {
    roomPlanCenter: roomPlanCenter.toArray().map(n => n.toFixed(3)),
    scaledRoomPlanCenter: scaledRoomPlanCenter.toArray().map(n => n.toFixed(3)),
    modelCenter: modelCenter.toArray().map(n => n.toFixed(3)),
    centerOffset: result.centerOffset.toArray().map(n => n.toFixed(3)),
    modelRotationY: `${(Math.atan2(2 * modelTransform.rotation.y * modelTransform.rotation.w, 1 - 2 * modelTransform.rotation.y * modelTransform.rotation.y) * 180 / Math.PI).toFixed(1)}°`,
    note: 'Center offset calculated without rotation - positions will be offset first, then rotated around model center'
  });
  
  // Calculate rotation difference (currently model rotation, RoomPlan assumed to be identity)
  // This will be refined based on actual alignment needs
  result.rotationDifference = modelTransform.rotation.clone();
  
  // Precision: Since we're using ModelLoader's scale directly, precision is high
  // The precision depends on how well RoomPlan dimensions match real-world measurements
  // Assuming RoomPlan is accurate to ~1cm, precision = 1cm / modelLoaderScale (in model units)
  const roomPlanPrecisionMeters = 0.01; // 1cm precision assumption for RoomPlan
  result.precision = roomPlanPrecisionMeters * modelLoaderScale; // Convert to model units
  
  // Confidence is high since we're using the same scale factor that was applied to the model
  result.confidence = 'high';
  
  return result;
}

/**
 * Convert Three.js ModelTransform to serializable format for Zustand
 * Only includes lightweight, serializable data (excludes vertex samples for performance)
 */
export function serializeModelTransform(transform: ModelTransform): {
  position: { x: number; y: number; z: number };
  rotation: [number, number, number, number];
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
} {
  return {
    position: { x: transform.position.x, y: transform.position.y, z: transform.position.z },
    rotation: [transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w],
    scale: { x: transform.scale.x, y: transform.scale.y, z: transform.scale.z },
    boundingBox: {
      min: { x: transform.boundingBox.min.x, y: transform.boundingBox.min.y, z: transform.boundingBox.min.z },
      max: { x: transform.boundingBox.max.x, y: transform.boundingBox.max.y, z: transform.boundingBox.max.z },
      center: { x: transform.center.x, y: transform.center.y, z: transform.center.z },
      size: { x: transform.size.x, y: transform.size.y, z: transform.size.z },
    },
    boundingSphere: {
      center: { x: transform.boundingSphere.center.x, y: transform.boundingSphere.center.y, z: transform.boundingSphere.center.z },
      radius: transform.boundingSphere.radius,
    },
  };
}

/**
 * Convert RoomPlanCoordinateSystem to serializable format for Zustand
 */
export function serializeRoomPlanSystem(system: RoomPlanCoordinateSystem): {
  units: 'meters' | 'unknown';
  origin: { x: number; y: number; z: number } | null;
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
    center: { x: number; y: number; z: number };
    size: { x: number; y: number; z: number };
  } | null;
  wallCount: number;
  hasVertexData: boolean;
  averageWallWidth: number;
  averageWallHeight: number;
  totalSurfaceArea: number | null;
} {
  if (!system.boundingBox) {
    return {
      units: system.units,
      origin: null,
      boundingBox: null,
      wallCount: system.wallCount,
      hasVertexData: system.hasVertexData,
      averageWallWidth: system.averageWallWidth,
      averageWallHeight: system.averageWallHeight,
      totalSurfaceArea: system.totalSurfaceArea,
    };
  }
  
  const center = system.boundingBox.getCenter(new THREE.Vector3());
  const size = system.boundingBox.getSize(new THREE.Vector3());
  
  return {
    units: system.units,
    origin: system.origin ? { x: system.origin.x, y: system.origin.y, z: system.origin.z } : null,
    boundingBox: {
      min: { x: system.boundingBox.min.x, y: system.boundingBox.min.y, z: system.boundingBox.min.z },
      max: { x: system.boundingBox.max.x, y: system.boundingBox.max.y, z: system.boundingBox.max.z },
      center: { x: center.x, y: center.y, z: center.z },
      size: { x: size.x, y: size.y, z: size.z },
    },
    wallCount: system.wallCount,
    hasVertexData: system.hasVertexData,
    averageWallWidth: system.averageWallWidth,
    averageWallHeight: system.averageWallHeight,
    totalSurfaceArea: system.totalSurfaceArea,
  };
}

/**
 * Convert ScaleFactorAnalysis to serializable format for Zustand
 */
export function serializeScaleFactor(scaleFactor: ScaleFactorAnalysis): {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  uniformHorizontalScale: number;
  verticalScale: number;
  centerOffset: { x: number; y: number; z: number };
  precision: number;
  confidence: 'high' | 'medium' | 'low';
} {
  return {
    scaleX: scaleFactor.scaleX,
    scaleY: scaleFactor.scaleY,
    scaleZ: scaleFactor.scaleZ,
    uniformHorizontalScale: scaleFactor.uniformHorizontalScale,
    verticalScale: scaleFactor.verticalScale,
    centerOffset: { x: scaleFactor.centerOffset.x, y: scaleFactor.centerOffset.y, z: scaleFactor.centerOffset.z },
    precision: scaleFactor.precision,
    confidence: scaleFactor.confidence,
  };
}

/**
 * Log comprehensive transformation analysis for debugging
 */
export function logTransformationAnalysis(
  modelTransform: ModelTransform,
  roomPlanSystem: RoomPlanCoordinateSystem,
  scaleFactor: ScaleFactorAnalysis
): void {
  console.log('📊 [CoordinateSystem] ========== TRANSFORMATION ANALYSIS ==========');
  
  console.log('📦 [Model Transform]:', {
    position: `(${modelTransform.position.x.toFixed(6)}, ${modelTransform.position.y.toFixed(6)}, ${modelTransform.position.z.toFixed(6)})`,
    rotation: `(${modelTransform.rotation.x.toFixed(6)}, ${modelTransform.rotation.y.toFixed(6)}, ${modelTransform.rotation.z.toFixed(6)}, ${modelTransform.rotation.w.toFixed(6)})`,
    scale: `(${modelTransform.scale.x.toFixed(6)}, ${modelTransform.scale.y.toFixed(6)}, ${modelTransform.scale.z.toFixed(6)})`,
    center: `(${modelTransform.center.x.toFixed(6)}, ${modelTransform.center.y.toFixed(6)}, ${modelTransform.center.z.toFixed(6)})`,
    size: `(${modelTransform.size.x.toFixed(6)}, ${modelTransform.size.y.toFixed(6)}, ${modelTransform.size.z.toFixed(6)})`,
    boundingBox: {
      min: `(${modelTransform.boundingBox.min.x.toFixed(6)}, ${modelTransform.boundingBox.min.y.toFixed(6)}, ${modelTransform.boundingBox.min.z.toFixed(6)})`,
      max: `(${modelTransform.boundingBox.max.x.toFixed(6)}, ${modelTransform.boundingBox.max.y.toFixed(6)}, ${modelTransform.boundingBox.max.z.toFixed(6)})`,
    },
    vertexSampleCount: modelTransform.vertexSample.length,
  });
  
  console.log('📐 [RoomPlan System]:', {
    units: roomPlanSystem.units,
    origin: roomPlanSystem.origin 
      ? `(${roomPlanSystem.origin.x.toFixed(6)}, ${roomPlanSystem.origin.y.toFixed(6)}, ${roomPlanSystem.origin.z.toFixed(6)})`
      : 'null',
    wallCount: roomPlanSystem.wallCount,
    hasVertexData: roomPlanSystem.hasVertexData,
    averageWallWidth: `${roomPlanSystem.averageWallWidth.toFixed(6)}m`,
    averageWallHeight: `${roomPlanSystem.averageWallHeight.toFixed(6)}m`,
    totalSurfaceArea: roomPlanSystem.totalSurfaceArea ? `${roomPlanSystem.totalSurfaceArea.toFixed(6)}m²` : 'null',
    boundingBox: roomPlanSystem.boundingBox
      ? {
          min: `(${roomPlanSystem.boundingBox.min.x.toFixed(6)}, ${roomPlanSystem.boundingBox.min.y.toFixed(6)}, ${roomPlanSystem.boundingBox.min.z.toFixed(6)})`,
          max: `(${roomPlanSystem.boundingBox.max.x.toFixed(6)}, ${roomPlanSystem.boundingBox.max.y.toFixed(6)}, ${roomPlanSystem.boundingBox.max.z.toFixed(6)})`,
          size: `(${roomPlanSystem.boundingBox.getSize(new THREE.Vector3()).x.toFixed(6)}, ${roomPlanSystem.boundingBox.getSize(new THREE.Vector3()).y.toFixed(6)}, ${roomPlanSystem.boundingBox.getSize(new THREE.Vector3()).z.toFixed(6)})`,
        }
      : 'null',
  });
  
  console.log('⚖️ [Scale Factor Analysis]:', {
    scaleX: scaleFactor.scaleX.toFixed(6),
    scaleY: scaleFactor.scaleY.toFixed(6),
    scaleZ: scaleFactor.scaleZ.toFixed(6),
    uniformHorizontalScale: scaleFactor.uniformHorizontalScale.toFixed(6),
    verticalScale: scaleFactor.verticalScale.toFixed(6),
    centerOffset: `(${scaleFactor.centerOffset.x.toFixed(6)}, ${scaleFactor.centerOffset.y.toFixed(6)}, ${scaleFactor.centerOffset.z.toFixed(6)})`,
    precision: `${(scaleFactor.precision * 1000).toFixed(3)}mm`,
    confidence: scaleFactor.confidence,
  });
  
  // Log first few vertex samples for verification
  if (modelTransform.vertexSample.length > 0) {
    console.log('📍 [Model Vertex Samples] (first 5):');
    modelTransform.vertexSample.slice(0, 5).forEach((vertex, i) => {
      console.log(`  Vertex ${i}: (${vertex.x.toFixed(6)}, ${vertex.y.toFixed(6)}, ${vertex.z.toFixed(6)})`);
    });
  }
  
  console.log('📊 [CoordinateSystem] ========== ANALYSIS COMPLETE ==========');
}
