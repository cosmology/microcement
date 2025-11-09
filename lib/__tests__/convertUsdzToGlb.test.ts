/**
 * Tests for USDZ to GLB conversion module
 */

import { describe, test, expect } from 'vitest';
import { convertUsdzToGlb, createPlaceholderGLB, CONVERSION_ERRORS } from '../convertUsdzToGlb';

describe('convertUsdzToGlb', () => {
  test('should reject empty buffer', async () => {
    const result = await convertUsdzToGlb({
      usdzBuffer: Buffer.alloc(0),
      fileName: 'empty.usdz'
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(CONVERSION_ERRORS.EMPTY_FILE);
  });

  test('should reject null buffer', async () => {
    const result = await convertUsdzToGlb({
      usdzBuffer: null as any,
      fileName: 'null.usdz'
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(CONVERSION_ERRORS.EMPTY_FILE);
  });

  test('should reject files that are too large', async () => {
    const largeBuffer = Buffer.alloc(100 * 1024 * 1024 + 1); // 100MB + 1 byte
    const result = await convertUsdzToGlb({
      usdzBuffer: largeBuffer,
      fileName: 'large.usdz',
      maxFileSize: 100 * 1024 * 1024
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('too large');
  });

  test('should reject invalid USDZ format', async () => {
    const invalidBuffer = Buffer.from('This is not a USDZ file');
    const result = await convertUsdzToGlb({
      usdzBuffer: invalidBuffer,
      fileName: 'invalid.usdz'
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(CONVERSION_ERRORS.INVALID_FORMAT);
  });

  test('should use fallback conversion when USDZ parsing fails', async () => {
    // Create a mock USDZ file (ZIP format)
    const mockUsdzBuffer = Buffer.from([
      0x50, 0x4B, 0x03, 0x04, // ZIP magic bytes
      0x14, 0x00, 0x00, 0x00, // Version needed to extract
      0x00, 0x00, 0x00, 0x00, // General purpose bit flag
      0x00, 0x00, 0x00, 0x00, // Compression method
      0x00, 0x00, 0x00, 0x00, // Last mod file time
      0x00, 0x00, 0x00, 0x00, // Last mod file date
      0x00, 0x00, 0x00, 0x00, // CRC-32
      0x00, 0x00, 0x00, 0x00, // Compressed size
      0x00, 0x00, 0x00, 0x00, // Uncompressed size
      0x00, 0x00, 0x00, 0x00, // File name length
      0x00, 0x00, 0x00, 0x00  // Extra field length
    ]);

    const result = await convertUsdzToGlb({
      usdzBuffer: mockUsdzBuffer,
      fileName: 'mock.usdz'
    });

    // The fallback conversion should succeed and create a placeholder GLB
    expect(result.success).toBe(true);
    expect(result.glbBuffer).toBeDefined();
    if (result.glbBuffer) {
      expect(result.glbBuffer).toBeInstanceOf(Buffer);
      expect(result.glbBuffer.length).toBeGreaterThan(0);
    }
  });
});

describe('createPlaceholderGLB', () => {
  test('should create a valid GLB buffer', () => {
    const glbBuffer = createPlaceholderGLB(2, 2, 2);
    
    expect(glbBuffer).toBeInstanceOf(Buffer);
    expect(glbBuffer.length).toBeGreaterThan(0);
    
    // Check GLB magic bytes
    const magic = glbBuffer.readUInt32LE(0);
    expect(magic).toBe(0x46546C67); // "glTF"
  });

  test('should create GLB with custom dimensions', () => {
    const glbBuffer = createPlaceholderGLB(4, 6, 8);
    
    expect(glbBuffer).toBeInstanceOf(Buffer);
    expect(glbBuffer.length).toBeGreaterThan(0);
    
    // Check GLB magic bytes
    const magic = glbBuffer.readUInt32LE(0);
    expect(magic).toBe(0x46546C67); // "glTF"
  });
});
