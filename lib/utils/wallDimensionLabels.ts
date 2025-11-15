/**
 * Wall Dimension Labels - SketchUp Style
 * Creates dimension labels, extension lines, and corner markers for walls
 */

import * as THREE from 'three';

export interface WallDimensionLabel {
  textSprite: THREE.Sprite;
  extensionLines: THREE.Line[];
  cornerMarkers: THREE.Mesh[];
}

export interface CreateWallDimensionLabelOptions {
  width: number; // meters
  height: number; // meters
  surfaceArea?: number; // m² - optional, will be calculated if not provided
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  measurementScale: number;
  isDarkMode: boolean;
  labelOffset?: number; // Offset from wall face (default: 0.05m)
  extensionLineLength?: number; // Length of extension lines (default: 0.2m)
}

/**
 * Creates a canvas texture with text for use in a THREE.Sprite
 */
function createTextTexture(text: string, isDarkMode: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not get 2D context');
  }

          // Set canvas size - increased for larger, more visible text
          canvas.width = 512; // Increased from 384
          canvas.height = 128; // Increased from 96

          // Clear canvas
          context.clearRect(0, 0, canvas.width, canvas.height);

          // Set font - much larger for better readability at model scale
          context.font = 'bold 36px Arial, sans-serif'; // Increased from 28px
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  // Set colors based on theme
  const textColor = isDarkMode ? '#ffffff' : '#000000';
  const strokeColor = isDarkMode ? '#000000' : '#ffffff';
  const strokeWidth = 4; // Increased stroke width for better visibility

  // Draw text with outline for readability
  context.strokeStyle = strokeColor;
  context.lineWidth = strokeWidth;
  context.strokeText(text, canvas.width / 2, canvas.height / 2);

  // Draw text
  context.fillStyle = textColor;
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  // Create texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates extension lines (dashed perpendicular lines) from wall edges to label
 * Extension lines connect wall edges to the label position
 */
function createExtensionLines(
  wallBox: THREE.Box3,
  wallPosition: THREE.Vector3,
  wallRotation: THREE.Quaternion,
  wallWidth: number,
  wallHeight: number,
  labelPosition: THREE.Vector3,
  extensionLineLength: number,
  isDarkMode: boolean,
  measurementScale: number
): THREE.Line[] {
  const lines: THREE.Line[] = [];
  const lineColor = isDarkMode ? 0xffffff : 0x000000;

  // Calculate wall edges in local space (at wall center height, Y = 0)
  const halfWidth = (wallWidth * measurementScale) / 2;

  // Extension points: left and right edges at wall center height
  const leftEdgeLocal = new THREE.Vector3(-halfWidth, 0, 0);  // Left edge, center height
  const rightEdgeLocal = new THREE.Vector3(halfWidth, 0, 0);   // Right edge, center height

  // Transform edges to world space
  const leftEdgeWorld = leftEdgeLocal.clone().applyQuaternion(wallRotation).add(wallPosition);
  const rightEdgeWorld = rightEdgeLocal.clone().applyQuaternion(wallRotation).add(wallPosition);

  // Project label position onto wall plane to get extension line endpoint
  // Extension lines should connect wall edges to label position (at same height)
  const labelOnWallPlane = labelPosition.clone();
  labelOnWallPlane.y = wallPosition.y; // Keep label at wall center height
  
  // Calculate projection of label onto the line connecting left and right edges
  const wallDir = rightEdgeWorld.clone().sub(leftEdgeWorld).normalize();
  const toLabel = labelOnWallPlane.clone().sub(leftEdgeWorld);
  const projectionLength = toLabel.dot(wallDir);
  
  // Clamp projection to be between left and right edges
  const clampedProjection = Math.max(0, Math.min(wallWidth * measurementScale, projectionLength));
  const labelProjected = leftEdgeWorld.clone().add(wallDir.multiplyScalar(clampedProjection));
  labelProjected.y = wallPosition.y; // Ensure same height

  // Create extension lines: from wall edges to projected label position
  const edges = [leftEdgeWorld, rightEdgeWorld];
  
  edges.forEach((edge, i) => {
    // Calculate extension endpoint: extend towards label, but keep it at wall height
    const toLabelDir = labelProjected.clone().sub(edge).normalize();
    const extensionEnd = edge.clone().add(toLabelDir.multiplyScalar(extensionLineLength * measurementScale));
    extensionEnd.y = wallPosition.y; // Keep at wall center height

    // Create dashed line geometry
    const geometry = new THREE.BufferGeometry().setFromPoints([edge, extensionEnd]);
    const material = new THREE.LineDashedMaterial({
      color: lineColor,
      dashSize: 0.1 * measurementScale,
      gapSize: 0.05 * measurementScale,
      opacity: 0.5,
      transparent: true,
      linewidth: 1,
    });

    const line = new THREE.Line(geometry, material);
    line.computeLineDistances(); // Required for LineDashedMaterial
    line.name = `dimension-extension-${i === 0 ? 'left' : 'right'}`;
    lines.push(line);
  });

  return lines;
}

/**
 * Creates corner markers (small spheres) at wall corners
 * Simplified: Only markers at the extension line endpoints (left and right edges)
 */
function createCornerMarkers(
  wallBox: THREE.Box3,
  wallPosition: THREE.Vector3,
  wallRotation: THREE.Quaternion,
  wallWidth: number,
  wallHeight: number,
  markerRadius: number,
  isDarkMode: boolean,
  measurementScale: number
): THREE.Mesh[] {
  const markers: THREE.Mesh[] = [];
  const markerColor = isDarkMode ? 0xffffff : 0x000000;

  // Calculate wall edges at center height (where extension lines connect)
  const halfWidth = (wallWidth * measurementScale) / 2;
  
  // Markers at left and right edges (at wall center height)
  const edges = [
    new THREE.Vector3(-halfWidth, 0, 0),  // Left edge
    new THREE.Vector3(halfWidth, 0, 0),   // Right edge
  ];

  edges.forEach((edge, i) => {
    // Transform edge to world space
    const worldEdge = edge.clone();
    worldEdge.applyQuaternion(wallRotation);
    worldEdge.add(wallPosition);

    // Create small sphere marker
    const geometry = new THREE.SphereGeometry(markerRadius * measurementScale, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: markerColor,
      transparent: false,
    });

    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(worldEdge);
    marker.name = `dimension-marker-${i === 0 ? 'left' : 'right'}`;
    markers.push(marker);
  });

  return markers;
}

/**
 * Creates a complete wall dimension label with SketchUp-style visualization
 */
export function createWallDimensionLabel(
  options: CreateWallDimensionLabelOptions
): WallDimensionLabel {
  const {
    width,
    height,
    surfaceArea,
    position,
    rotation,
    measurementScale,
    isDarkMode,
    labelOffset = 0.05,
    extensionLineLength = 0.2,
  } = options;

  // Calculate surface area if not provided
  const calculatedSurfaceArea = surfaceArea ?? (width * height);
  
  // Format dimension text: "3.50m × 2.50m (8.75m²)"
  const dimensionText = `${width.toFixed(2)}m × ${height.toFixed(2)}m (${calculatedSurfaceArea.toFixed(2)}m²)`;

  // Create text texture
  const textTexture = createTextTexture(dimensionText, isDarkMode);

  // Create sprite for text label
  const spriteMaterial = new THREE.SpriteMaterial({
    map: textTexture,
    transparent: true,
    opacity: 1.0,
  });

  const sprite = new THREE.Sprite(spriteMaterial);
  
  // Calculate label position (in front of wall face, at wall center height)
  // Wall normal points outward from wall face (in local space: 0, 0, -1)
  const wallNormal = new THREE.Vector3(0, 0, -1);
  wallNormal.applyQuaternion(rotation);
  
  const labelPos = position.clone();
  labelPos.add(wallNormal.multiplyScalar(labelOffset * measurementScale));

  sprite.position.copy(labelPos);
  
  // Scale sprite to appropriate size (billboard - always faces camera)
  // Make labels much larger - measurementScale is ModelLoader scale (~11x), but labels need to be visible
  // Use a larger multiplier so labels are clearly readable at model scale
  const spriteScale = 3.0 * measurementScale; // Increased from 1.2 - make labels much larger
  sprite.scale.set(spriteScale, spriteScale * 0.35, 1); // Aspect ratio for text
  sprite.name = 'dimension-label';
  
  console.log(`📐 [DimensionLabel] Created label "${dimensionText}" at position:`, {
    x: labelPos.x.toFixed(2),
    y: labelPos.y.toFixed(2),
    z: labelPos.z.toFixed(2),
    spriteScale: spriteScale.toFixed(2),
  });

  // Create wall bounding box for extension lines and markers
  const wallBox = new THREE.Box3();
  const halfWidth = (width * measurementScale) / 2;
  const halfHeight = (height * measurementScale) / 2;
  wallBox.setFromCenterAndSize(position, new THREE.Vector3(width * measurementScale, height * measurementScale, 0.1));

  // Create extension lines (dashed perpendicular lines from wall edges to label)
  const extensionLines = createExtensionLines(
    wallBox,
    position,
    rotation,
    width,
    height,
    labelPos,
    extensionLineLength,
    isDarkMode,
    measurementScale
  );

  // Create corner markers (small spheres at wall edges where extension lines connect)
  const cornerMarkers = createCornerMarkers(
    wallBox,
    position,
    rotation,
    width,
    height,
    0.03, // 3cm radius
    isDarkMode,
    measurementScale
  );

  console.log(`📐 [DimensionLabel] Created visualization for wall:`, {
    dimensions: dimensionText,
    position: { x: position.x.toFixed(2), y: position.y.toFixed(2), z: position.z.toFixed(2) },
    labelPosition: { x: labelPos.x.toFixed(2), y: labelPos.y.toFixed(2), z: labelPos.z.toFixed(2) },
    extensionLinesCount: extensionLines.length,
    cornerMarkersCount: cornerMarkers.length,
  });

  return {
    textSprite: sprite,
    extensionLines,
    cornerMarkers,
  };
}

