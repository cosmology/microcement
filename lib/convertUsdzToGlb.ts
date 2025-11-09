/**
 * USDZ to GLB Conversion Module
 * 
 * This module provides robust USDZ to GLB conversion with proper error handling.
 * Since USDZ parsing is complex and requires specialized libraries, this implementation
 * provides clear error messages and fallback strategies.
 */

import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';

/**
 * Configuration constants for USDZ conversion
 */
const USDZ_CONFIG = {
  // Minimum wall thickness to ensure walls are visible in 3D viewers
  // This overrides the extremely thin (0.0001) thickness from RoomPlan scans
  MIN_WALL_THICKNESS: 0.1, // 10cm (0.1 meters)
  
  // Maximum room dimensions (meters)
  MAX_ROOM_DIMENSION: 100
} as const;

export interface ConversionResult {
  success: boolean;
  glbBuffer?: Buffer;
  error?: string;
  warning?: string;
}

export interface ConversionOptions {
  usdzBuffer: Buffer;
  fileName?: string;
  maxFileSize?: number; // in bytes
  enableFallback?: boolean;
  roomPlanJson?: {
    path?: string;
    buffer?: Buffer;
  };
}

/**
 * Main USDZ to GLB conversion function
 * 
 * This function attempts to convert USDZ files to GLB format.
 * Since USDZ parsing requires specialized libraries that may not be available,
 * it provides clear error messages and fallback strategies.
 */
export async function convertUsdzToGlb(options: ConversionOptions): Promise<ConversionResult> {
  const { usdzBuffer, fileName = 'unknown', maxFileSize = 50 * 1024 * 1024, enableFallback = false, roomPlanJson } = options;

  try {
    // Validate input
    const validation = validateUsdzInput(usdzBuffer, maxFileSize);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Load RoomPlan JSON if provided
    let roomPlanData: any = null;
    if (roomPlanJson) {
      if (roomPlanJson.buffer) {
        roomPlanData = JSON.parse(roomPlanJson.buffer.toString('utf8'));
      } else if (roomPlanJson.path) {
        const jsonBuffer = await readFile(roomPlanJson.path);
        roomPlanData = JSON.parse(jsonBuffer.toString('utf8'));
      }
      console.log('📐 [RoomPlan] Loaded JSON metadata with', roomPlanData?.walls?.length || 0, 'walls');
    }

    // Attempt real USDZ parsing (when libraries are available)
    const conversionResult = await attemptRealUsdzConversion(usdzBuffer, fileName, roomPlanData);
    
    if (conversionResult.success) {
      return conversionResult;
    }

    // If real conversion fails and fallback is enabled, try fallback
    if (enableFallback) {
      console.log('Real USDZ conversion failed, attempting fallback...');
      const fallbackResult = await attemptFallbackConversion(usdzBuffer, fileName);
      console.log('Fallback result:', fallbackResult.success ? 'SUCCESS' : 'FAILED', fallbackResult.error || '');
      if (fallbackResult.success) {
        return fallbackResult;
      }
    }

    // If all conversion attempts fail, provide clear error message
    return {
      success: false,
      error: `USDZ conversion failed: ${conversionResult.error}`,
      warning: "USDZ to GLB conversion failed. Please check the USDZ file format or contact support for assistance."
    };

  } catch (error) {
    console.error('USDZ conversion error:', error);
    return {
      success: false,
      error: `Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      warning: "USDZ conversion is currently not supported. Please use GLB files directly."
    };
  }
}

/**
 * Validates USDZ input buffer
 */
function validateUsdzInput(buffer: Buffer, maxFileSize: number): { valid: boolean; error?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'USDZ file is empty or invalid' };
  }

  if (buffer.length > maxFileSize) {
    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    const maxMB = (maxFileSize / (1024 * 1024)).toFixed(0);
    return { 
      valid: false, 
      error: `USDZ file is too large (${sizeMB}MB). Maximum size is ${maxMB}MB` 
    };
  }

  // Check if it looks like a USDZ file (ZIP format)
  if (!isValidUsdzFormat(buffer)) {
    return { 
      valid: false, 
      error: 'File does not appear to be a valid USDZ format' 
    };
  }

  return { valid: true };
}

/**
 * Checks if buffer appears to be a valid USDZ file (ZIP format)
 */
function isValidUsdzFormat(buffer: Buffer): boolean {
  // USDZ files are ZIP archives, so check for ZIP magic bytes
  if (buffer.length < 4) return false;
  
  // ZIP file magic bytes: PK (0x50 0x4B)
  const zipMagic = buffer.readUInt16LE(0) === 0x4B50; // "PK"
  
  // Also check for ZIP64 or other ZIP variants
  const zip64Magic = buffer.readUInt32LE(0) === 0x504B0304; // "PK\x03\x04"
  
  return zipMagic || zip64Magic;
}

/**
 * Attempts real USDZ conversion by parsing USD files directly
 * 
 * This function extracts and parses USD files from USDZ archives to create
 * actual room geometry with walls, openings, and proper structure.
 */
async function attemptRealUsdzConversion(usdzBuffer: Buffer, fileName: string, roomPlanJson?: any): Promise<ConversionResult> {
  // Python conversion removed - use custom parsing directly
  console.log(`Attempting USDZ parsing for file: ${fileName} (${usdzBuffer.length} bytes)`);
  return await attemptCustomUsdzParsing(usdzBuffer, fileName, roomPlanJson);
}

async function attemptCustomUsdzParsing(usdzBuffer: Buffer, fileName: string, roomPlanJson?: any): Promise<ConversionResult> {
  try {
    console.log(`Attempting custom USDZ parsing for file: ${fileName} (${usdzBuffer.length} bytes)`);
    
    // USDZ is a ZIP archive, so we need to extract and parse USD files
    const zipEntries = parseZipArchive(usdzBuffer);
    
    console.log(`Found ${zipEntries.length} entries in USDZ archive`);
    
    // Look for USD files
    const usdFiles = zipEntries.filter(entry => 
      entry.name.endsWith('.usd') || 
      entry.name.endsWith('.usda') || 
      entry.name.endsWith('.usdc')
    );
    
    console.log(`Found ${usdFiles.length} USD files:`, usdFiles.map(f => f.name));
    
    if (usdFiles.length === 0) {
      return {
        success: false,
        error: 'No USD files found in USDZ archive',
        warning: 'USDZ file does not contain valid USD scene data'
      };
    }
    
    // Parse all USD files to extract room geometry
    let roomData: any = {
      walls: [],
      openings: [],
      dimensions: { width: 0, depth: 0, height: 2.5 }
    };
    
    console.log(`Processing ${usdFiles.length} USD files to extract geometry...`);
    
    for (const usdFile of usdFiles) {
      console.log(`Parsing USD file: ${usdFile.name}`);
      
      const usdContent = Buffer.from(usdFile.data).toString('utf8');
      console.log(`USD file ${usdFile.name} content length: ${usdContent.length} chars`);
      console.log(`USD file ${usdFile.name} preview: ${usdContent.substring(0, 200)}...`);
      
      // Log if file contains "Mesh" definitions (actual vertex data) vs "Cube" definitions (parametric)
      const hasMeshDefs = usdContent.includes('def Mesh') || usdContent.includes('def "Mesh"');
      const hasCubeDefs = usdContent.includes('def Cube');
      console.log(`🔍 [USD Parse] File ${usdFile.name}: Mesh definitions=${hasMeshDefs}, Cube definitions=${hasCubeDefs}`);
      
      // Count how many of each
      const meshCount = (usdContent.match(/def Mesh/g) || []).length + (usdContent.match(/def "Mesh"/g) || []).length;
      const cubeCount = (usdContent.match(/def Cube/g) || []).length;
      console.log(`🔍 [USD Parse] Counts: ${meshCount} meshes, ${cubeCount} cubes`);
      
      // Log first 500 chars to see what's in the file
      console.log(`🔍 [USD Parse] First 500 chars of ${usdFile.name}:`);
      console.log(usdContent.substring(0, 500));
      
      const parseResult = parseUsdContent(usdContent, usdFile.name);
      if (parseResult.success && parseResult.data) {
        console.log(`Successfully parsed ${usdFile.name}:`, {
          walls: parseResult.data.walls?.length || 0,
          openings: parseResult.data.openings?.length || 0,
          dimensions: parseResult.data.dimensions,
          totalVertices: parseResult.data.walls?.reduce((sum: number, wall: any) => sum + (wall.vertices?.length || 0), 0) || 0,
          totalFaces: parseResult.data.walls?.reduce((sum: number, wall: any) => sum + (wall.faces?.length || 0), 0) || 0
        });
        
        // Merge room data
        if (parseResult.data.walls && parseResult.data.walls.length > 0) {
          roomData.walls.push(...parseResult.data.walls);
          console.log(`Added ${parseResult.data.walls.length} walls from ${usdFile.name}`);
        }
        if (parseResult.data.openings && parseResult.data.openings.length > 0) {
          roomData.openings.push(...parseResult.data.openings);
          console.log(`Added ${parseResult.data.openings.length} openings from ${usdFile.name}`);
        }
        if (parseResult.data.dimensions) {
          roomData.dimensions = { ...roomData.dimensions, ...parseResult.data.dimensions };
          console.log(`Updated dimensions from ${usdFile.name}:`, parseResult.data.dimensions);
        }
      } else {
        console.log(`Failed to parse ${usdFile.name}:`, parseResult.error);
      }
    }
    
    // Apply RoomPlan JSON metadata if provided (for slanted walls)
    if (roomPlanJson && roomPlanJson.walls) {
      console.log('📐 [RoomPlan] Applying polygonCorners from JSON...');
      applyRoomPlanJsonGeometry(roomData, roomPlanJson);
    }
    
    // Update room height from max wall height to ensure proper elevation
    if (roomPlanJson && roomPlanJson.walls && roomPlanJson.walls.length > 0) {
      const maxHeight = roomPlanJson.walls.reduce((max: number, wall: any) => {
        const height = wall.dimensions?.[1] || 0;
        return Math.max(max, height);
      }, 0);
      if (maxHeight > 0) {
        console.log(`📐 [RoomPlan] Updating room height from ${roomData.dimensions.height} to ${maxHeight}m (max wall height)`);
        roomData.dimensions.height = maxHeight;
      }
    }
    
    console.log(`Final merged room data:`, {
      walls: roomData.walls.length,
      openings: roomData.openings.length,
      dimensions: roomData.dimensions,
      totalVertices: roomData.walls.reduce((sum: number, wall: any) => sum + (wall.vertices?.length || 0), 0),
      totalFaces: roomData.walls.reduce((sum: number, wall: any) => sum + (wall.faces?.length || 0), 0)
    });
    
    // Generate GLB from parsed room geometry
    const glbBuffer = createRoomGLB(roomData);
    
    console.log(`Custom USDZ conversion successful: ${fileName} -> ${glbBuffer.length} bytes GLB`);
    
    return {
      success: true,
      glbBuffer: glbBuffer,
      warning: 'Successfully parsed USDZ using custom parser (fallback)'
    };

  } catch (error) {
    console.error('Custom USDZ conversion error:', error);
    console.log('[FALLBACK] Custom USDZ parsing failed, trying fallback conversion...');
    // Try the final fallback
    return await attemptFallbackConversion(usdzBuffer, fileName);
  }
}

/**
 * Parses ZIP archive using native JavaScript (no external dependencies)
 */
function parseZipArchive(buffer: Buffer): Array<{name: string, data: Buffer}> {
  try {
    const entries: Array<{name: string, data: Buffer}> = [];
    let offset = 0;
    
    // Look for ZIP central directory
    // ZIP files have a central directory at the end
    let centralDirOffset = -1;
    
    // Search for end of central directory signature (0x06054b50)
    for (let i = buffer.length - 22; i >= 0; i--) {
      if (buffer.readUInt32LE(i) === 0x06054b50) {
        centralDirOffset = buffer.readUInt32LE(i + 16);
        break;
      }
    }
    
    if (centralDirOffset === -1) {
      throw new Error('Invalid ZIP file: Central directory not found');
    }
    
    // Parse central directory entries
    offset = centralDirOffset;
    while (offset < buffer.length - 22) {
      const signature = buffer.readUInt32LE(offset);
      if (signature !== 0x02014b50) break; // Central directory file header
      
      const compressionMethod = buffer.readUInt16LE(offset + 10);
      const compressedSize = buffer.readUInt32LE(offset + 20);
      const uncompressedSize = buffer.readUInt32LE(offset + 24);
      const fileNameLength = buffer.readUInt16LE(offset + 28);
      const extraFieldLength = buffer.readUInt16LE(offset + 30);
      const commentLength = buffer.readUInt16LE(offset + 32);
      const localHeaderOffset = buffer.readUInt32LE(offset + 42);
      
      // Read filename
      const fileName = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString('utf8');
      
      // Read file data from local header
      const localHeaderOffsetActual = localHeaderOffset + 30 + fileNameLength + extraFieldLength;
      const fileData = buffer.subarray(localHeaderOffsetActual, localHeaderOffsetActual + compressedSize);
      
      // For now, only handle uncompressed files (compression method 0)
      if (compressionMethod === 0) {
        entries.push({
          name: fileName,
          data: fileData
        });
      }
      
      offset += 46 + fileNameLength + extraFieldLength + commentLength;
    }
    
    return entries;
    
  } catch (error) {
    console.error('ZIP parsing error:', error);
    throw new Error(`Failed to parse ZIP archive: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parses USD content to extract room geometry information
 */
function parseUsdContent(usdContent: string, fileName: string): { success: boolean; data?: any; error?: string } {
  try {
    console.log(`=== Parsing USD content for room geometry ===`);
    console.log(`USD content length: ${usdContent.length} characters`);
    console.log(`USD content preview: ${usdContent.substring(0, 200)}...`);
    
    // Look for room-related geometry in USD content
    const lines = usdContent.split('\n');
    console.log(`USD content split into ${lines.length} lines`);
    
    let roomData: any = {
      walls: [],
      openings: [],
      dimensions: { width: 0, depth: 0, height: 2.5 }
    };
    
    let meshCount = 0;
    let polygonCount = 0;
    
    // Parse USD content for room information
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for mesh definitions
      if (line.includes('def Mesh') || line.includes('def "Mesh"')) {
        meshCount++;
        console.log(`Found mesh definition #${meshCount} at line ${i}: ${line}`);
        
        // Extract mesh data from subsequent lines
        let meshData = extractMeshData(lines, i);
        if (meshData) {
          console.log(`Mesh #${meshCount} extracted: ${meshData.vertices.length} vertices, ${meshData.faces.length} faces`);
          roomData.walls.push(meshData);
        } else {
          console.log(`Mesh #${meshCount} extraction failed`);
        }
      }
      
      // Look for parametric primitives (Cube, Cylinder, etc.)
      if (line.includes('def Cube') || line.includes('def Cylinder') || line.includes('def Sphere')) {
        meshCount++;
        console.log(`Found parametric primitive #${meshCount} at line ${i}: ${line}`);
        
        // Extract parametric primitive data from subsequent lines
        let primitiveData = extractParametricPrimitive(lines, i, fileName);
        if (primitiveData) {
          console.log(`Primitive #${meshCount} extracted: ${primitiveData.vertices.length} vertices, ${primitiveData.faces.length} faces`);
          // Categorize as opening or wall
          if (primitiveData.isOpening) {
            roomData.openings.push(primitiveData);
            console.log(`  → Classified as OPENING`);
          } else {
            roomData.walls.push(primitiveData);
            console.log(`  → Classified as WALL`);
          }
        } else {
          console.log(`Primitive #${meshCount} extraction failed`);
        }
      }
      
      // Look for polygon definitions
      if (line.includes('def Polygon') || line.includes('def "Polygon"')) {
        polygonCount++;
        console.log(`Found polygon definition #${polygonCount} at line ${i}: ${line}`);
      }
      
      // Look for room dimensions or bounding box
      if (line.includes('extent') || line.includes('bbox')) {
        console.log(`Found dimension info at line ${i}: ${line}`);
        const dimensions = extractDimensions(line);
        if (dimensions) {
          console.log(`Extracted dimensions: ${JSON.stringify(dimensions)}`);
          roomData.dimensions = { ...roomData.dimensions, ...dimensions };
        }
      }
      
      // Look for point data
      if (line.includes('point3f[] points')) {
        console.log(`Found point data at line ${i}: ${line.substring(0, 100)}...`);
      }
    }
    
    console.log(`USD parsing summary: ${meshCount} meshes, ${polygonCount} polygons found`);
    
    // If no specific geometry found, create room based on file analysis
    if (roomData.walls.length === 0) {
      console.log('No specific mesh data found, analyzing USD structure...');
      const analyzedData = analyzeUsdStructure(usdContent, fileName);
      // Only add walls with actual geometry (vertices)
      if (analyzedData.walls && analyzedData.walls.length > 0) {
        const validWalls = analyzedData.walls.filter((wall: any) => wall.vertices && wall.vertices.length > 0);
        if (validWalls.length > 0) {
          roomData.walls = validWalls;
          console.log(`Added ${validWalls.length} valid walls from structure analysis`);
        } else {
          console.log('No valid geometry found in structure analysis - skipping');
        }
      }
      // Always update dimensions if available
      if (analyzedData.dimensions) {
        roomData.dimensions = analyzedData.dimensions;
      }
    }
    
    console.log(`Final parsed room data:`, {
      walls: roomData.walls.length,
      openings: roomData.openings.length,
      dimensions: roomData.dimensions,
      totalVertices: roomData.walls.reduce((sum: number, wall: any) => sum + (wall.vertices?.length || 0), 0),
      totalFaces: roomData.walls.reduce((sum: number, wall: any) => sum + (wall.faces?.length || 0), 0)
    });
    
    return { success: true, data: roomData };
    
  } catch (error) {
    console.error('USD parsing error:', error);
    console.error('USD parsing error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return {
      success: false,
      error: `Failed to parse USD content: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Extracts mesh data from USD lines
 */
function extractMeshData(lines: string[], startIndex: number): any {
  try {
    console.log(`Extracting mesh data starting from line ${startIndex}`);
    let meshData: any = { vertices: [], faces: [] };
    let inMesh = false;
    let braceCount = 0;
    let foundMeshStart = false;
    
    // Track if we're in a mesh block
    for (let i = startIndex; i < Math.min(startIndex + 200, lines.length); i++) {
      const line = lines[i].trim();
      
      // Count braces to handle nested structures
      if (line.includes('{')) {
        braceCount++;
        if (line.includes('def Mesh') || line.includes('def "Mesh"')) {
          foundMeshStart = true;
          inMesh = true;
          console.log(`Found mesh definition at line ${i}`);
        }
      }
      if (line.includes('}')) {
        braceCount--;
        if (inMesh && braceCount === 0) {
          console.log(`End of mesh block at line ${i}`);
          break;
        }
      }
      
      // Extract point data - handle multiline values
      if (line.includes('point3f[] points')) {
        console.log(`Found point data at line ${i}`);
        meshData.vertices = extractMultiLineArray(lines, i, 'point3f[] points');
        console.log(`Extracted ${meshData.vertices.length} vertices from point data`);
      }
      
      // Extract face indices - handle multiline values
      if (line.includes('int[] faceVertexIndices')) {
        console.log(`Found face data at line ${i}`);
        meshData.faces = extractMultiLineArray(lines, i, 'int[] faceVertexIndices');
        console.log(`Extracted ${meshData.faces.length} face indices`);
      }
    }
    
    const hasVertices = meshData.vertices.length > 0;
    const hasFaces = meshData.faces.length > 0;
    console.log(`Mesh extraction result: ${hasVertices ? 'SUCCESS' : 'FAILED'} vertices (${meshData.vertices.length}), ${hasFaces ? 'SUCCESS' : 'FAILED'} faces (${meshData.faces.length})`);
    
    return hasVertices ? meshData : null;
  } catch (error) {
    console.error('Mesh extraction error:', error);
    return null;
  }
}

// Helper function to extract multiline array data
function extractMultiLineArray(lines: string[], startIndex: number, arrayName: string): number[] {
  const result: number[] = [];
  let insideArray = false;
  let arrayContent = '';
  
  for (let i = startIndex; i < Math.min(startIndex + 100, lines.length); i++) {
    const line = lines[i].trim();
    
    if (line.includes('[')) {
      insideArray = true;
      // Extract everything after the opening bracket
      const afterBracket = line.substring(line.indexOf('[') + 1);
      if (afterBracket.includes(']')) {
        // Array closes on same line
        arrayContent += afterBracket.substring(0, afterBracket.indexOf(']'));
        break;
      } else {
        arrayContent += afterBracket;
      }
    } else if (insideArray) {
      if (line.includes(']')) {
        // End of array
        arrayContent += line.substring(0, line.indexOf(']'));
        break;
      } else {
        arrayContent += line;
      }
    }
  }
  
  // Parse the array content
  const values = arrayContent.split(/[,\s]+/).filter(v => v.trim() !== '');
  return values.map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
}

/**
 * Extracts parametric primitive data from USD lines (Cube, Cylinder, etc.)
 */
function extractParametricPrimitive(lines: string[], startIndex: number, fileName?: string): any {
  try {
    console.log(`Extracting parametric primitive starting from line ${startIndex}`);
    let primitiveData: any = { vertices: [], faces: [] };
    let scale = [1, 1, 1];
    let transform: number[][] | null = null;
    let primitiveType = 'Cube';
    
    // Check if this is a door/window/opening based on filename or content
    const isOpening = fileName && (
      fileName.toLowerCase().includes('door') || 
      fileName.toLowerCase().includes('window') ||
      fileName.toLowerCase().includes('opening')
    );
    
    // Determine primitive type
    const startLine = lines[startIndex].trim();
    if (startLine.includes('def Cube')) {
      primitiveType = 'Cube';
    } else if (startLine.includes('def Cylinder')) {
      primitiveType = 'Cylinder';
    } else if (startLine.includes('def Sphere')) {
      primitiveType = 'Sphere';
    }
    
    console.log(`Processing ${primitiveType} primitive${isOpening ? ' (OPENING)' : ''}`);
    
    for (let i = startIndex; i < Math.min(startIndex + 50, lines.length); i++) {
      const line = lines[i].trim();
      
      // Extract scale
      if (line.includes('xformOp:scale')) {
        console.log(`Found scale at line ${i}: ${line}`);
        const scaleMatch = line.match(/double3 xformOp:scale = \(([^)]+)\)/);
        if (scaleMatch) {
          scale = scaleMatch[1].split(',').map((s: string) => parseFloat(s.trim()));
          console.log(`Extracted scale (before min thickness): [${scale.join(', ')}]`);
          
          // Apply minimum wall thickness to prevent extremely thin walls
          // RoomPlan walls have thickness ~0.0001, which is nearly invisible in 3D viewers
          if (scale[2] < USDZ_CONFIG.MIN_WALL_THICKNESS) {
            console.log(`  ⚠️ Wall thickness ${scale[2]} is too thin, applying minimum thickness ${USDZ_CONFIG.MIN_WALL_THICKNESS}`);
            scale[2] = USDZ_CONFIG.MIN_WALL_THICKNESS;
          }
          console.log(`Extracted scale (after min thickness): [${scale.join(', ')}]`);
        }
      }
      
      // Extract transform matrix
      if (line.includes('matrix4d xformOp:transform')) {
        console.log(`Found transform matrix at line ${i}: ${line.substring(0, 100)}...`);
        const transformMatch = line.match(/matrix4d xformOp:transform = \( \(([^)]+)\), \(([^)]+)\), \(([^)]+)\), \(([^)]+)\) \)/);
        if (transformMatch) {
          // USD matrix4d is stored in column-major order
          // Each match group is a COLUMN, not a ROW
          const col0 = transformMatch[1].split(',').map((s: string) => parseFloat(s.trim()));
          const col1 = transformMatch[2].split(',').map((s: string) => parseFloat(s.trim()));
          const col2 = transformMatch[3].split(',').map((s: string) => parseFloat(s.trim()));
          const col3 = transformMatch[4].split(',').map((s: string) => parseFloat(s.trim()));
          
          // Convert to row-major for easier use
          // translation is in col3 (last column)
          transform = [
            [col0[0], col1[0], col2[0], col3[0]],
            [col0[1], col1[1], col2[1], col3[1]],
            [col0[2], col1[2], col2[2], col3[2]],
            [col0[3], col1[3], col2[3], col3[3]]
          ];
          console.log(`[ORIGINAL] Extracted transform matrix from line ${i}`);
          console.log(`[ORIGINAL] Full matrix:`, JSON.stringify(transform, null, 2));
          console.log(`[ORIGINAL] Matrix structure:`);
          console.log(`[ORIGINAL]   Row 0: [${transform[0]}]`);
          console.log(`[ORIGINAL]   Row 1: [${transform[1]}]`);
          console.log(`[ORIGINAL]   Row 2: [${transform[2]}]`);
          console.log(`[ORIGINAL]   Row 3: [${transform[3]}]`);
          // Translation is the 4th element of first 3 rows OR the first 3 elements of the 4th row
          console.log(`[ORIGINAL] Translation from columns: [${transform[0][3]}, ${transform[1][3]}, ${transform[2][3]}]`);
          console.log(`[ORIGINAL] Translation from row 4: [${transform[3][0]}, ${transform[3][1]}, ${transform[3][2]}]`);
        }
      }
      
      if (line.includes('}') && i > startIndex) {
        console.log(`End of primitive definition at line ${i}`);
        break;
      }
    }
    
    // Generate geometry based on primitive type
    if (primitiveType === 'Cube') {
      primitiveData = generateCubeGeometry(scale, transform);
    } else if (primitiveType === 'Cylinder') {
      primitiveData = generateCylinderGeometry(scale, transform);
    } else if (primitiveType === 'Sphere') {
      primitiveData = generateSphereGeometry(scale, transform);
    }
    
    // Mark as opening if detected
    if (isOpening) {
      primitiveData.isOpening = true;
      primitiveData.type = 'opening';
      // Store a marker color for openings (red tint for debugging)
      primitiveData.color = [1.0, 0.3, 0.3]; // Red color for openings
    }
    
    const hasVertices = primitiveData.vertices.length > 0;
    const hasFaces = primitiveData.faces.length > 0;
    console.log(`Parametric primitive extraction result: ${hasVertices ? 'SUCCESS' : 'FAILED'} vertices (${primitiveData.vertices.length}), ${hasFaces ? 'SUCCESS' : 'FAILED'} faces (${primitiveData.faces.length})${isOpening ? ' [OPENING]' : ''}`);
    
    return hasVertices ? primitiveData : null;
    
  } catch (error) {
    console.error('Parametric primitive extraction error:', error);
    return null;
  }
}

/**
 * Generates cube geometry from scale and transform
 */
function generateCubeGeometry(scale: number[], transform: number[][] | null): any {
  try {
    console.log(`Generating cube geometry with scale [${scale.join(', ')}]`);
    
    // Create unit cube vertices
    const unitVertices = [
      // Front face
      -0.5, -0.5,  0.5,  // 0
       0.5, -0.5,  0.5,  // 1
       0.5,  0.5,  0.5,  // 2
      -0.5,  0.5,  0.5,  // 3
      // Back face
      -0.5, -0.5, -0.5,  // 4
       0.5, -0.5, -0.5,  // 5
       0.5,  0.5, -0.5,  // 6
      -0.5,  0.5, -0.5,  // 7
    ];
    
    // Apply transform first, then scale (xformOpOrder: ["xformOp:transform", "xformOp:scale"])
    // NOTE: The correct order is: 1) Apply rotation, 2) Apply scale, 3) Apply translation
    // This is because scale should affect the geometry size but NOT the translation offset
    
    const finalVertices: number[] = [];
    
    for (let i = 0; i < unitVertices.length; i += 3) {
      const x = unitVertices[i];
      const y = unitVertices[i + 1];
      const z = unitVertices[i + 2];
      
      let transformedX = x;
      let transformedY = y;
      let transformedZ = z;
      
      // Scale first (on unit cube)
      const scaledX = x * scale[0];
      const scaledY = y * scale[1];
      const scaledZ = z * scale[2];
      
      if (transform) {
        // Then apply transform (rotation + translation) on the scaled geometry
        transformedX = transform[0][0] * scaledX + transform[0][1] * scaledY + transform[0][2] * scaledZ + transform[0][3];
        transformedY = transform[1][0] * scaledX + transform[1][1] * scaledY + transform[1][2] * scaledZ + transform[1][3];
        transformedZ = transform[2][0] * scaledX + transform[2][1] * scaledY + transform[2][2] * scaledZ + transform[2][3];
      } else {
        // No transform, just use scaled coordinates
        transformedX = scaledX;
        transformedY = scaledY;
        transformedZ = scaledZ;
      }
      
      finalVertices.push(transformedX, transformedY, transformedZ);
    }
    
    if (transform) {
      console.log(`Applied rotation, then scale, then translation`);
      console.log(`  Translation: [${transform[0][3]}, ${transform[1][3]}, ${transform[2][3]}]`);
      console.log(`  Scale: [${scale[0]}, ${scale[1]}, ${scale[2]}]`);
      // Log all 8 vertices for debugging
      console.log(`  All 8 vertices:`);
      for (let v = 0; v < 8; v++) {
        const idx = v * 3;
        console.log(`    Vertex ${v}: [${finalVertices[idx].toFixed(3)}, ${finalVertices[idx+1].toFixed(3)}, ${finalVertices[idx+2].toFixed(3)}]`);
      }
    } else {
      console.log(`Applied scale only: [${scale[0]}, ${scale[1]}, ${scale[2]}]`);
      console.log(`  First vertex: [${finalVertices[0]}, ${finalVertices[1]}, ${finalVertices[2]}]`);
    }
    
    // Cube faces (triangles)
    const faces = [
      // Front face
      0, 1, 2,  0, 2, 3,
      // Back face
      4, 6, 5,  4, 7, 6,
      // Left face
      4, 0, 3,  4, 3, 7,
      // Right face
      1, 5, 6,  1, 6, 2,
      // Top face
      3, 2, 6,  3, 6, 7,
      // Bottom face
      4, 5, 1,  4, 1, 0
    ];
    
    console.log(`Generated cube: ${finalVertices.length/3} vertices, ${faces.length} faces`);
    
    return {
      vertices: finalVertices,
      faces: faces
    };
    
  } catch (error) {
    console.error('Cube geometry generation error:', error);
    return { vertices: [], faces: [] };
  }
}

/**
 * Generates cylinder geometry from scale and transform
 */
function generateCylinderGeometry(scale: number[], transform: number[][] | null): any {
  // Simplified cylinder - just return empty for now
  console.log(`Cylinder geometry generation not implemented yet`);
  return { vertices: [], faces: [] };
}

/**
 * Generates sphere geometry from scale and transform
 */
function generateSphereGeometry(scale: number[], transform: number[][] | null): any {
  // Simplified sphere - just return empty for now
  console.log(`Sphere geometry generation not implemented yet`);
  return { vertices: [], faces: [] };
}

/**
 * Extracts dimensions from USD line
 */
function extractDimensions(line: string): any {
  try {
    const match = line.match(/extent.*?\[(.*?)\]/);
    if (match) {
      const coords = match[1].split(',').map((c: string) => parseFloat(c.trim()));
      if (coords.length >= 6) {
        return {
          width: Math.abs(coords[3] - coords[0]),
          depth: Math.abs(coords[4] - coords[1]),
          height: Math.abs(coords[5] - coords[2])
        };
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Analyzes USD structure when no specific geometry is found
 */
function analyzeUsdStructure(usdContent: string, fileName: string): any {
  try {
    // Analyze USD content for room characteristics
    const lines = usdContent.split('\n');
    let roomComplexity = 0;
    let hasWalls = false;
    let hasOpenings = false;
    
    // Count geometry-related keywords
    lines.forEach(line => {
      if (line.includes('Mesh') || line.includes('Polygon')) roomComplexity++;
      if (line.includes('wall') || line.includes('Wall')) hasWalls = true;
      if (line.includes('door') || line.includes('window') || line.includes('opening')) hasOpenings = true;
    });
    
    // Estimate room size based on content complexity
    const baseSize = Math.max(2.0, Math.min(8.0, roomComplexity / 10));
    const roomWidth = baseSize + (hasWalls ? 1.0 : 0);
    const roomDepth = baseSize * 0.8 + (hasOpenings ? 0.5 : 0);
    
    console.log(`Analyzed USD structure: complexity=${roomComplexity}, walls=${hasWalls}, openings=${hasOpenings}`);
    
    return {
      walls: hasWalls ? [{ type: 'wall', vertices: [], faces: [] }] : [],
      openings: hasOpenings ? [{ type: 'opening', vertices: [], faces: [] }] : [],
      dimensions: { width: roomWidth, depth: roomDepth, height: 2.5 }
    };
  } catch (error) {
    console.error('USD structure analysis error:', error);
    return {
      walls: [],
      openings: [],
      dimensions: { width: 4.0, depth: 3.0, height: 2.5 }
    };
  }
}

/**
 * Applies Y-offset to vertex positions to elevate room geometry
 */
function applyYOffset(vertices: number[], yOffset: number): number[] {
  const elevated = [...vertices];
  for (let i = 1; i < elevated.length; i += 3) {
    elevated[i] = elevated[i] + yOffset;
  }
  return elevated;
}

/**
 * Adds geometry data to the GLB positions and indices arrays
 */
function addGeometry(
  geometry: any,
  positions: number[],
  indices: number[],
  vertexOffset: number,
  logPrefix: string
): number {
  if (!geometry.vertices || geometry.vertices.length === 0) {
    return vertexOffset;
  }

  const vertexCount = geometry.vertices.length / 3;
  console.log(`${logPrefix}: ${geometry.vertices.length} coordinates (${vertexCount} vertices), ${geometry.faces?.length || 0} faces`);

  // Add vertices
  positions.push(...geometry.vertices);

  // Add faces with proper offset
  if (geometry.faces && geometry.faces.length > 0) {
    const offsetFaces = geometry.faces.map((face: number) => face + vertexOffset);
    indices.push(...offsetFaces);
    console.log(`${logPrefix} faces: ${geometry.faces.length} faces added with offset ${vertexOffset}`);
  } else {
    // Generate faces if not provided (triangulate)
    for (let i = 0; i < vertexCount - 2; i++) {
      indices.push(vertexOffset + i, vertexOffset + i + 1, vertexOffset + i + 2);
    }
    console.log(`${logPrefix} generated ${vertexCount - 2} triangular faces`);
  }

  return vertexOffset + vertexCount;
}

/**
 * Adds walls to the GLB geometry
 */
function addWalls(
  walls: any[],
  positions: number[],
  indices: number[],
  yOffset: number,
  vertexOffset: number
): number {
  walls.forEach((wall: any, wallIndex: number) => {
    if (wall.vertices && wall.vertices.length > 0) {
      // polygonCorners walls are already aligned by floorOffset, don't apply additional elevation
      // Parametric walls need elevation to center them at Y=0 (floor at Y=0)
      const elevatedVertices = wall.isPolygonCorners ? wall.vertices : applyYOffset(wall.vertices, yOffset);
      const wallGeometry = {
        vertices: elevatedVertices,
        faces: wall.faces
      };
      vertexOffset = addGeometry(wallGeometry, positions, indices, vertexOffset, `Wall ${wallIndex}`);
      const actualOffset = wall.isPolygonCorners ? 0 : yOffset;
      console.log(`Wall ${wallIndex} vertices [0-5] (after elevation by ${actualOffset.toFixed(2)}m): [${elevatedVertices[0].toFixed(3)}, ${elevatedVertices[1].toFixed(3)}, ${elevatedVertices[2].toFixed(3)}, ${elevatedVertices[3].toFixed(3)}, ${elevatedVertices[4].toFixed(3)}, ${elevatedVertices[5].toFixed(3)}]`);
    }
  });
  return vertexOffset;
}

/**
 * Adds openings (doors/windows) to the GLB geometry
 */
function addOpenings(
  openings: any[],
  positions: number[],
  indices: number[],
  yOffset: number,
  vertexOffset: number
): number {
  if (!openings || openings.length === 0) {
    return vertexOffset;
  }

  console.log(`Adding ${openings.length} openings from USD...`);
  openings.forEach((opening: any, openingIndex: number) => {
    if (opening.vertices && opening.vertices.length > 0) {
      // Apply Y offset to elevate openings
      const elevatedVertices = applyYOffset(opening.vertices, yOffset);
      const openingGeometry = {
        vertices: elevatedVertices,
        faces: opening.faces
      };
      vertexOffset = addGeometry(openingGeometry, positions, indices, vertexOffset, `Opening ${openingIndex}`);
      console.log(`Opening ${openingIndex} vertices [0-5] (after elevation): [${elevatedVertices[0].toFixed(3)}, ${elevatedVertices[1].toFixed(3)}, ${elevatedVertices[2].toFixed(3)}, ${elevatedVertices[3].toFixed(3)}, ${elevatedVertices[4].toFixed(3)}, ${elevatedVertices[5].toFixed(3)}]`);
    }
  });
  return vertexOffset;
}

/**
 * Builds GLTF JSON structure from geometry data
 */
function buildGLTFStructure(vertexCount: number, indexCount: number): any {
  return {
    asset: { version: "2.0", generator: "Real USDZ-to-GLB Converter" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0 },
        indices: 1,
        material: 0
      }]
    }],
    materials: [{
      pbrMetallicRoughness: {
        baseColorFactor: [0.8, 0.8, 0.8, 1.0],
        metallicFactor: 0.0,
        roughnessFactor: 0.8
      }
    }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: vertexCount,
        type: "VEC3",
        min: [0, 0, 0],
        max: [0, 0, 0]
      },
      {
        bufferView: 1,
        componentType: 5123,
        count: indexCount,
        type: "SCALAR"
      }
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: vertexCount * 3 * 4 },
      { buffer: 0, byteOffset: vertexCount * 3 * 4, byteLength: indexCount * 2 }
    ],
    buffers: [{ byteLength: vertexCount * 3 * 4 + indexCount * 2 }]
  };
}

/**
 * Calculates min/max bounds for GLTF accessor
 */
function calculateBounds(positions: number[]): number[][] {
  if (positions.length === 0) {
    return [[0, 0, 0], [0, 0, 0]];
  }

  const xCoords: number[] = [];
  const yCoords: number[] = [];
  const zCoords: number[] = [];

  for (let i = 0; i < positions.length; i += 3) {
    xCoords.push(positions[i]);
    yCoords.push(positions[i + 1]);
    zCoords.push(positions[i + 2]);
  }

  return [
    [Math.min(...xCoords), Math.min(...yCoords), Math.min(...zCoords)],
    [Math.max(...xCoords), Math.max(...yCoords), Math.max(...zCoords)]
  ];
}

/**
 * Converts GLTF structure to GLB buffer format
 */
function convertToGLB(gltf: any, positions: number[], indices: number[]): Buffer {
  // Update min/max bounds
  const [min, max] = calculateBounds(positions);
  gltf.accessors[0].min = min;
  gltf.accessors[0].max = max;

  console.log('GLTF structure created:', {
    vertices: positions.length / 3,
    indices: indices.length,
    jsonSize: JSON.stringify(gltf).length,
    binarySize: positions.length * 4 + indices.length * 2
  });

  // Convert to GLB format
  const jsonStr = JSON.stringify(gltf);
  console.log('JSON string length before padding:', jsonStr.length);
  const jsonBuffer = Buffer.from(jsonStr);
  const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
  console.log('JSON padding:', jsonPadding);
  const jsonPadded = Buffer.concat([jsonBuffer, Buffer.alloc(jsonPadding, 0x20)]); // Pad with spaces
  console.log('JSON buffer length after padding:', jsonPadded.length);

  const binaryBuffer = Buffer.concat([
    Buffer.from(new Float32Array(positions).buffer),
    Buffer.from(new Uint16Array(indices).buffer)
  ]);
  const binaryPadding = (4 - (binaryBuffer.length % 4)) % 4;
  const binaryPadded = Buffer.concat([binaryBuffer, Buffer.alloc(binaryPadding)]);

  // GLB header
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0); // "glTF"
  header.writeUInt32LE(2, 4); // Version
  header.writeUInt32LE(jsonPadded.length + binaryPadded.length + 24, 8); // Total length

  // JSON chunk
  const jsonChunk = Buffer.alloc(8);
  jsonChunk.writeUInt32LE(jsonPadded.length, 0);
  jsonChunk.writeUInt32LE(0x4E4F534A, 4); // "JSON"

  // Binary chunk
  const binaryChunk = Buffer.alloc(8);
  binaryChunk.writeUInt32LE(binaryPadded.length, 0);
  binaryChunk.writeUInt32LE(0x004E4942, 4); // "BIN\0"

  return Buffer.concat([header, jsonChunk, jsonPadded, binaryChunk, binaryPadded]);
}

/**
 * Creates GLB from parsed room geometry
 */
function createRoomGLB(roomData: any): Buffer {
  try {
    console.log('=== Creating GLB from room geometry ===');
    console.log('[DEBUG] Room data received:');
    console.log(`  Walls: ${roomData.walls?.length || 0}`);
    console.log(`  Openings: ${roomData.openings?.length || 0}`);
    console.log(`  Dimensions: ${JSON.stringify(roomData.dimensions)}`);
    
    // Validate room data
    if (roomData.walls && roomData.walls.length > 0) {
      roomData.walls.forEach((wall: any, idx: number) => {
        console.log(`  Wall ${idx}: vertices=${wall.vertices?.length || 0}, faces=${wall.faces?.length || 0}`);
        if (wall.vertices && wall.vertices.length > 0) {
          console.log(`    First 6 vertices: ${wall.vertices.slice(0, 6).join(', ')}`);
        }
      });
    }
    
    const { width, depth, height } = roomData.dimensions;
    console.log(`Room dimensions: ${width} x ${depth} x ${height}`);
    
    // Initialize geometry arrays
    const positions: number[] = [];
    const indices: number[] = [];
    let vertexOffset = 0;
    
    // Check if we have real USD geometry
    const hasRealGeometry = roomData.walls && roomData.walls.length > 0 && 
                           roomData.walls.some((wall: any) => wall.vertices && wall.vertices.length > 0);
    
    if (hasRealGeometry) {
      console.log('Using real USD geometry - skipping basic room generation');
      
      // Calculate the Y offset to center the room at Y=0 (floor on Y=0)
      const roomHeight = roomData.dimensions.height || 2.5;
      const yOffset = roomHeight / 2;
      console.log(`  Elevating room by +${yOffset}m to center floor at Y=0`);
      
      // Add walls and openings using helper functions
      vertexOffset = addWalls(roomData.walls, positions, indices, yOffset, vertexOffset);
      vertexOffset = addOpenings(roomData.openings, positions, indices, yOffset, vertexOffset);
      
    } else {
      console.log('No real USD geometry found - using basic room generation');
      
      // Add floor
      console.log('Adding floor...');
      const floorVertices = [
        -width/2, -height/2, -depth/2,
        width/2, -height/2, -depth/2,
        width/2, -height/2, depth/2,
        -width/2, -height/2, depth/2
      ];
      positions.push(...floorVertices);
      indices.push(0, 1, 2, 0, 2, 3);
      vertexOffset += 4;
      console.log(`Floor added: ${floorVertices.length/3} vertices, vertexOffset now ${vertexOffset}`);
      
      // Add ceiling
      console.log('Adding ceiling...');
      const ceilingVertices = [
        -width/2, height/2, -depth/2,
        width/2, height/2, -depth/2,
        width/2, height/2, depth/2,
        -width/2, height/2, depth/2
      ];
      positions.push(...ceilingVertices);
      indices.push(vertexOffset, vertexOffset+2, vertexOffset+1, vertexOffset, vertexOffset+3, vertexOffset+2);
      vertexOffset += 4;
      console.log(`Ceiling added: ${ceilingVertices.length/3} vertices, vertexOffset now ${vertexOffset}`);
      
      // Add walls (with potential openings)
      const wallThickness = 0.1;
      console.log(`Adding walls with thickness ${wallThickness}...`);
      
      // Left wall
      const leftWallVertices = [
        -width/2, -height/2, -depth/2,
        -width/2+wallThickness, -height/2, -depth/2,
        -width/2+wallThickness, height/2, -depth/2,
        -width/2, height/2, -depth/2,
        -width/2, -height/2, depth/2,
        -width/2+wallThickness, -height/2, depth/2,
        -width/2+wallThickness, height/2, depth/2,
        -width/2, height/2, depth/2
      ];
      positions.push(...leftWallVertices);
      indices.push(
        vertexOffset, vertexOffset+1, vertexOffset+2, vertexOffset, vertexOffset+2, vertexOffset+3,
        vertexOffset+4, vertexOffset+6, vertexOffset+5, vertexOffset+4, vertexOffset+7, vertexOffset+6,
        vertexOffset, vertexOffset+3, vertexOffset+7, vertexOffset, vertexOffset+7, vertexOffset+4,
        vertexOffset+1, vertexOffset+5, vertexOffset+6, vertexOffset+1, vertexOffset+6, vertexOffset+2
      );
      vertexOffset += 8;
      console.log(`Left wall added: ${leftWallVertices.length/3} vertices, vertexOffset now ${vertexOffset}`);
      
      // Right wall
      const rightWallVertices = [
        width/2-wallThickness, -height/2, -depth/2,
        width/2, -height/2, -depth/2,
        width/2, height/2, -depth/2,
        width/2-wallThickness, height/2, -depth/2,
        width/2-wallThickness, -height/2, depth/2,
        width/2, -height/2, depth/2,
        width/2, height/2, depth/2,
        width/2-wallThickness, height/2, depth/2
      ];
      positions.push(...rightWallVertices);
      indices.push(
        vertexOffset, vertexOffset+2, vertexOffset+1, vertexOffset, vertexOffset+3, vertexOffset+2,
        vertexOffset+4, vertexOffset+5, vertexOffset+6, vertexOffset+4, vertexOffset+6, vertexOffset+7,
        vertexOffset, vertexOffset+4, vertexOffset+7, vertexOffset, vertexOffset+7, vertexOffset+3,
        vertexOffset+1, vertexOffset+2, vertexOffset+6, vertexOffset+1, vertexOffset+6, vertexOffset+5
      );
      vertexOffset += 8;
      console.log(`Right wall added: ${rightWallVertices.length/3} vertices, vertexOffset now ${vertexOffset}`);
      
      // Back wall
      const backWallVertices = [
        -width/2, -height/2, -depth/2,
        width/2, -height/2, -depth/2,
        width/2, height/2, -depth/2,
        -width/2, height/2, -depth/2,
        -width/2, -height/2, -depth/2+wallThickness,
        width/2, -height/2, -depth/2+wallThickness,
        width/2, height/2, -depth/2+wallThickness,
        -width/2, height/2, -depth/2+wallThickness
      ];
      positions.push(...backWallVertices);
      indices.push(
        vertexOffset, vertexOffset+1, vertexOffset+2, vertexOffset, vertexOffset+2, vertexOffset+3,
        vertexOffset+4, vertexOffset+6, vertexOffset+5, vertexOffset+4, vertexOffset+7, vertexOffset+6,
        vertexOffset, vertexOffset+3, vertexOffset+7, vertexOffset, vertexOffset+7, vertexOffset+4,
        vertexOffset+1, vertexOffset+5, vertexOffset+6, vertexOffset+1, vertexOffset+6, vertexOffset+2
      );
      vertexOffset += 8;
      console.log(`Back wall added: ${backWallVertices.length/3} vertices, vertexOffset now ${vertexOffset}`);
      
      // Front wall
      const frontWallVertices = [
        -width/2, -height/2, depth/2-wallThickness,
        width/2, -height/2, depth/2-wallThickness,
        width/2, height/2, depth/2-wallThickness,
        -width/2, height/2, depth/2-wallThickness,
        -width/2, -height/2, depth/2,
        width/2, -height/2, depth/2,
        width/2, height/2, depth/2,
        -width/2, height/2, depth/2
      ];
      positions.push(...frontWallVertices);
      indices.push(
        vertexOffset, vertexOffset+2, vertexOffset+1, vertexOffset, vertexOffset+3, vertexOffset+2,
        vertexOffset+4, vertexOffset+5, vertexOffset+6, vertexOffset+4, vertexOffset+6, vertexOffset+7,
        vertexOffset, vertexOffset+4, vertexOffset+7, vertexOffset, vertexOffset+7, vertexOffset+3,
        vertexOffset+1, vertexOffset+2, vertexOffset+6, vertexOffset+1, vertexOffset+6, vertexOffset+5
      );
      vertexOffset += 8;
      console.log(`Front wall added: ${frontWallVertices.length/3} vertices, vertexOffset now ${vertexOffset}`);
    }
    
    console.log(`Total geometry: ${positions.length/3} vertices, ${indices.length} indices`);
    
    // Build and convert GLB using helper functions
    const vertexCount = positions.length / 3;
    const indexCount = indices.length;
    const gltf = buildGLTFStructure(vertexCount, indexCount);
    const finalGLB = convertToGLB(gltf, positions, indices);
    
    console.log(`GLB creation complete: ${finalGLB.length} bytes`);
    console.log('=== GLB Creation Summary ===');
    console.log(`- Total vertices: ${vertexCount}`);
    console.log(`- Total indices: ${indexCount}`);
    console.log(`- Final GLB size: ${finalGLB.length} bytes`);
    
    return finalGLB;
    
  } catch (error) {
    console.error('GLB creation error:', error);
    console.error('GLB creation error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

/**
 * Attempts fallback conversion using placeholder GLB generation
 */
async function attemptFallbackConversion(usdzBuffer: Buffer, fileName: string): Promise<ConversionResult> {
  try {
    console.log(`Attempting fallback conversion for file: ${fileName} (${usdzBuffer.length} bytes)`);
    
    // Create a room-like GLB based on USDZ file size
    const fileSize = usdzBuffer.length;
    const roomWidth = Math.max(2.0, Math.min(8.0, fileSize / 5000));  // Scale room size with file size
    const roomDepth = Math.max(2.0, Math.min(6.0, fileSize / 6000));
    const roomHeight = 2.5;
    
    console.log(`Fallback: Creating room geometry - Width: ${roomWidth}, Depth: ${roomDepth}, Height: ${roomHeight}`);
    
    const glbBuffer = createPlaceholderGLB(roomWidth, roomDepth, roomHeight);
    
    console.log(`Fallback conversion successful: ${fileName} -> ${glbBuffer.length} bytes GLB`);
    
    return {
      success: true,
      glbBuffer: glbBuffer,
      warning: 'Using fallback GLB generation based on USDZ file size. Real USD parsing not yet implemented.'
    };
    
  } catch (error) {
    console.error('Fallback conversion error:', error);
    console.error('Fallback error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return {
      success: false,
      error: `Fallback conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      warning: 'Both real USDZ conversion and fallback conversion failed.'
    };
  }
}

/**
 * Creates a placeholder GLB file for testing purposes
 * 
 * This function creates a simple cube GLB that can be used for testing
 * when real USDZ conversion is not available.
 */
export function createPlaceholderGLB(width: number = 2, height: number = 2, depth: number = 2): Buffer {
  // Create a simple cube geometry
  const positions = new Float32Array([
    // Front face
    -width/2, -height/2, depth/2,
    width/2, -height/2, depth/2,
    width/2, height/2, depth/2,
    -width/2, height/2, depth/2,
    
    // Back face
    -width/2, -height/2, -depth/2,
    width/2, -height/2, -depth/2,
    width/2, height/2, -depth/2,
    -width/2, height/2, -depth/2,
    
    // Top face
    -width/2, height/2, -depth/2,
    width/2, height/2, -depth/2,
    width/2, height/2, depth/2,
    -width/2, height/2, depth/2,
    
    // Bottom face
    -width/2, -height/2, -depth/2,
    width/2, -height/2, -depth/2,
    width/2, -height/2, depth/2,
    -width/2, -height/2, depth/2,
    
    // Right face
    width/2, -height/2, -depth/2,
    width/2, height/2, -depth/2,
    width/2, height/2, depth/2,
    width/2, -height/2, depth/2,
    
    // Left face
    -width/2, -height/2, -depth/2,
    -width/2, height/2, -depth/2,
    -width/2, height/2, depth/2,
    -width/2, -height/2, depth/2
  ]);

  const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3,    // Front
    4, 7, 6, 4, 6, 5,    // Back
    8, 9, 10, 8, 10, 11, // Top
    12, 15, 14, 12, 14, 13, // Bottom
    16, 17, 18, 16, 18, 19, // Right
    20, 23, 22, 20, 22, 21  // Left
  ]);

  // Create a minimal GLTF structure
  const gltf = {
    asset: { version: "2.0", generator: "USDZ-to-GLB Placeholder" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0 },
        indices: 1,
        material: 0
      }]
    }],
    materials: [{
      pbrMetallicRoughness: {
        baseColorFactor: [0.8, 0.8, 0.8, 1.0],
        metallicFactor: 0.0,
        roughnessFactor: 0.8
      }
    }],
    accessors: [
      { 
        bufferView: 0, 
        componentType: 5126, 
        count: positions.length / 3, 
        type: "VEC3",
        min: [-width/2, -height/2, -depth/2],
        max: [width/2, height/2, depth/2]
      },
      { 
        bufferView: 1, 
        componentType: 5123, 
        count: indices.length, 
        type: "SCALAR"
      }
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.length * 4 },
      { buffer: 0, byteOffset: positions.length * 4, byteLength: indices.length * 2 }
    ],
    buffers: [{ byteLength: positions.length * 4 + indices.length * 2 }]
  };

  // Convert to GLB format
  const jsonBuffer = Buffer.from(JSON.stringify(gltf));
  const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
  const jsonPadded = Buffer.concat([jsonBuffer, Buffer.alloc(jsonPadding)]);
  
  const binaryBuffer = Buffer.concat([Buffer.from(positions.buffer), Buffer.from(indices.buffer)]);
  const binaryPadding = (4 - (binaryBuffer.length % 4)) % 4;
  const binaryPadded = Buffer.concat([binaryBuffer, Buffer.alloc(binaryPadding)]);
  
  // GLB header
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0); // "glTF"
  header.writeUInt32LE(2, 4); // Version
  header.writeUInt32LE(jsonPadded.length + binaryPadded.length + 24, 8); // Total length
  
  // JSON chunk
  const jsonChunk = Buffer.alloc(8);
  jsonChunk.writeUInt32LE(jsonPadded.length, 0);
  jsonChunk.writeUInt32LE(0x4E4F534A, 4); // "JSON"
  
  // Binary chunk
  const binaryChunk = Buffer.alloc(8);
  binaryChunk.writeUInt32LE(binaryPadded.length, 0);
  binaryChunk.writeUInt32LE(0x004E4942, 4); // "BIN\0"
  
  return Buffer.concat([header, jsonChunk, jsonPadded, binaryChunk, binaryPadded]);
}

/**
 * Error messages for different conversion failure scenarios
 */
export const CONVERSION_ERRORS = {
  EMPTY_FILE: 'USDZ file is empty or invalid',
  TOO_LARGE: 'USDZ file is too large for processing',
  INVALID_FORMAT: 'File does not appear to be a valid USDZ format',
  PARSING_FAILED: 'USDZ parsing failed - file may be corrupted or unsupported',
  CONVERSION_FAILED: 'Failed to convert USDZ to GLB format',
  LIBRARY_UNAVAILABLE: 'USDZ conversion library is not available',
  UNSUPPORTED_FEATURES: 'USDZ file contains unsupported features'
} as const;

/**
 * User-friendly error messages with guidance
 */
export const USER_ERROR_MESSAGES = {
  [CONVERSION_ERRORS.EMPTY_FILE]: 'The uploaded file is empty. Please check your file and try again.',
  [CONVERSION_ERRORS.TOO_LARGE]: 'The file is too large for processing. Please use a smaller file or contact support.',
  [CONVERSION_ERRORS.INVALID_FORMAT]: 'The file does not appear to be a valid USDZ file. Please check the file format.',
  [CONVERSION_ERRORS.PARSING_FAILED]: 'The USDZ file could not be parsed. It may be corrupted or use unsupported features.',
  [CONVERSION_ERRORS.CONVERSION_FAILED]: 'Failed to convert the USDZ file to GLB format. Please try a different file.',
  [CONVERSION_ERRORS.LIBRARY_UNAVAILABLE]: 'USDZ conversion is not yet supported. Please use GLB files directly.',
  [CONVERSION_ERRORS.UNSUPPORTED_FEATURES]: 'The USDZ file contains features that are not yet supported.'
} as const;

/**
 * Applies RoomPlan JSON polygonCorners geometry to room data
 * This replaces parametric cubes with actual mesh geometry for slanted/non-rectangular walls
 */
function applyRoomPlanJsonGeometry(roomData: any, roomPlanJson: any): void {
  if (!roomPlanJson.walls || !Array.isArray(roomPlanJson.walls)) {
    console.log('📐 [RoomPlan] No walls in JSON metadata');
    return;
  }

  // Map JSON walls by their dimensions and position (approximate matching)
  // Match by identifier if available, otherwise use index
  roomPlanJson.walls.forEach((jsonWall: any, jsonIdx: number) => {
    if (!jsonWall.polygonCorners || jsonWall.polygonCorners.length === 0) {
      return; // Skip walls without polygon corners
    }

    const corners = jsonWall.polygonCorners;
    const wallHeight = jsonWall.dimensions?.[1] || 2.5; // Get height from wall's own dimensions
    const wallId = jsonWall.identifier;

    console.log(`📐 [RoomPlan] Wall ${jsonIdx} (ID: ${wallId}) has ${corners.length} polygon corners, height=${wallHeight}`);
    console.log(`📐 [RoomPlan] First corner (local): [${corners[0].join(', ')}]`);
    
    // Apply wall transform to convert polygonCorners from local to world space
    let transformedCorners = corners;
    if (jsonWall.transform && jsonWall.transform.length === 16) {
      console.log(`📐 [RoomPlan] Applying wall transform matrix`);
      transformedCorners = corners.map((corner: number[]) => {
        const x = corner[0];
        const y = corner[1];
        const z = corner[2];
        // Apply 4x4 transform matrix (column-major)
        const tx = jsonWall.transform[0] * x + jsonWall.transform[4] * y + jsonWall.transform[8] * z + jsonWall.transform[12];
        const ty = jsonWall.transform[1] * x + jsonWall.transform[5] * y + jsonWall.transform[9] * z + jsonWall.transform[13];
        const tz = jsonWall.transform[2] * x + jsonWall.transform[6] * y + jsonWall.transform[10] * z + jsonWall.transform[14];
        return [tx, ty, tz];
      });
      console.log(`📐 [RoomPlan] First transformed corner (world): [${transformedCorners[0].join(', ')}]`);
    }

    // Find minimum Y to align floor at Y=0
    const minY = Math.min(...transformedCorners.map(c => c[1]));
    const floorOffset = -minY;
    console.log(`📐 [RoomPlan] Min Y: ${minY.toFixed(3)}, applying floor offset: ${floorOffset.toFixed(3)} to align with Y=0`);
    
    // Apply floor offset to all corners
    transformedCorners = transformedCorners.map(corner => [corner[0], corner[1] + floorOffset, corner[2]]);

    // Calculate wall normal for inward offset (to create thickness)
    const wallNormal = calculateWallNormal(transformedCorners);
    const wallThickness = USDZ_CONFIG.MIN_WALL_THICKNESS;
    console.log(`📐 [RoomPlan] Wall normal: [${wallNormal.join(', ')}], applying thickness: ${wallThickness}`);

    // Create mesh geometry from polygon corners
    const vertices: number[] = [];
    const faces: number[] = [];

    // Bottom vertices (outer face)
    transformedCorners.forEach((corner: number[]) => {
      vertices.push(corner[0], corner[1], corner[2]);
    });

    // Bottom vertices (inner face - offset inward for thickness)
    transformedCorners.forEach((corner: number[]) => {
      vertices.push(
        corner[0] + wallNormal[0] * wallThickness,
        corner[1] + wallNormal[1] * wallThickness,
        corner[2] + wallNormal[2] * wallThickness
      );
    });

    // Top vertices (outer face) - same as bottom since polygonCorners are the full profile
    transformedCorners.forEach((corner: number[]) => {
      vertices.push(corner[0], corner[1], corner[2]);
    });

    // Top vertices (inner face) - same as bottom inner
    transformedCorners.forEach((corner: number[]) => {
      vertices.push(
        corner[0] + wallNormal[0] * wallThickness,
        corner[1] + wallNormal[1] * wallThickness,
        corner[2] + wallNormal[2] * wallThickness
      );
    });

    const numCorners = transformedCorners.length;
    console.log(`📐 [RoomPlan] Generated ${vertices.length / 3} vertices (${transformedCorners.length} corners × 4 layers)`);
    const offsetOuter = 0;
    const offsetInner = numCorners;
    const offsetTopOuter = numCorners * 2;
    const offsetTopInner = numCorners * 3;

    // Create side faces (vertical faces connecting bottom and top)
    for (let i = 0; i < numCorners; i++) {
      const next = (i + 1) % numCorners;
      
      // Outer side face
      faces.push(offsetOuter + i, offsetOuter + next, offsetTopOuter + i);
      faces.push(offsetOuter + next, offsetTopOuter + next, offsetTopOuter + i);
      
      // Inner side face
      faces.push(offsetInner + i, offsetTopInner + i, offsetInner + next);
      faces.push(offsetInner + next, offsetTopInner + i, offsetTopInner + next);
    }
    
    // Add bottom and top faces to close the wall
    // Bottom face (outer)
    for (let i = 1; i < numCorners - 1; i++) {
      faces.push(offsetOuter + 0, offsetOuter + i, offsetOuter + i + 1);
    }
    
    // Bottom face (inner - reversed winding)
    for (let i = 1; i < numCorners - 1; i++) {
      faces.push(offsetInner + 0, offsetInner + i + 1, offsetInner + i);
    }
    
    // Top face (outer)
    for (let i = 1; i < numCorners - 1; i++) {
      faces.push(offsetTopOuter + 0, offsetTopOuter + i + 1, offsetTopOuter + i);
    }
    
    // Top face (inner - reversed winding)
    for (let i = 1; i < numCorners - 1; i++) {
      faces.push(offsetTopInner + 0, offsetTopInner + i, offsetTopInner + i + 1);
    }
    
    console.log(`📐 [RoomPlan] Generated ${faces.length} face indices (${faces.length / 3} triangles)`);

    // Find the corresponding wall in roomData and replace it
    // Try to find by matching the closest dimensions first
    let minDiff = Infinity;
    let bestIdx = -1;

    for (let i = 0; i < roomData.walls.length; i++) {
      const wall = roomData.walls[i];
      // Calculate dimension similarity (simple heuristic)
      const diff = Math.abs((wall.scale?.[0] || 0) - jsonWall.dimensions[0]);
      if (diff < minDiff && wall.vertices && wall.vertices.length === 24) { // Only replace parametric cubes (8 vertices * 3)
        minDiff = diff;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0 && roomData.walls[bestIdx]) {
      const wallToReplace = roomData.walls[bestIdx];
      console.log(`📐 [RoomPlan] Replacing wall ${bestIdx} (dim diff: ${minDiff.toFixed(2)}) with mesh from polygonCorners`);
      wallToReplace.vertices = vertices;
      wallToReplace.faces = faces;
      wallToReplace.isPolygonCorners = true; // Mark this wall as polygonCorners to skip elevation
    } else {
      console.log(`📐 [RoomPlan] Could not find matching wall to replace for JSON wall ${jsonIdx}`);
    }
  });

  console.log(`📐 [RoomPlan] Applied polygonCorners geometry to walls`);
}

/**
 * Calculates the wall normal vector for inward offset
 * Uses the first 3 corners to calculate a normal pointing inward
 */
function calculateWallNormal(corners: number[][]): number[] {
  if (corners.length < 3) {
    return [0, 0, 1]; // Default: offset in Z direction
  }
  
  const v1 = [corners[1][0] - corners[0][0], corners[1][1] - corners[0][1], corners[1][2] - corners[0][2]];
  const v2 = [corners[2][0] - corners[0][0], corners[2][1] - corners[0][1], corners[2][2] - corners[0][2]];
  
  // Cross product to get normal
  const normal = [
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0]
  ];
  
  // Normalize
  const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
  if (length > 0) {
    return [normal[0] / length, normal[1] / length, normal[2] / length];
  }
  
  return [0, 0, 1];
}
