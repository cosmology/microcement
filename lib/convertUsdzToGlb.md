# USDZ to GLB Conversion Module

This module provides robust USDZ to GLB conversion with proper error handling and clear user feedback.

## 🎯 **Purpose**

The module handles the conversion of USDZ files (Apple's 3D format) to GLB files (web-compatible 3D format) with comprehensive error handling and user guidance.

## 🚨 **Current Status: NOT IMPLEMENTED**

**Important**: Real USDZ parsing is not yet implemented. The module currently provides clear error messages and fallback strategies.

## 📁 **Files**

- `convertUsdzToGlb.ts` - Main conversion module
- `__tests__/convertUsdzToGlb.test.ts` - Unit tests
- `convertUsdzToGlb.md` - This documentation

## 🔧 **API**

### `convertUsdzToGlb(options: ConversionOptions): Promise<ConversionResult>`

Main conversion function that attempts to convert USDZ files to GLB format.

#### Parameters:
```typescript
interface ConversionOptions {
  usdzBuffer: Buffer;        // USDZ file buffer
  fileName?: string;         // Optional filename for logging
  maxFileSize?: number;      // Maximum file size in bytes (default: 50MB)
  enableFallback?: boolean;  // Enable fallback strategies (default: false)
}
```

#### Returns:
```typescript
interface ConversionResult {
  success: boolean;          // Whether conversion succeeded
  glbBuffer?: Buffer;        // GLB file buffer (if successful)
  error?: string;            // Error code (if failed)
  warning?: string;          // Warning message (if applicable)
}
```

## 🚨 **Error Handling**

The module provides comprehensive error handling with user-friendly messages:

### Error Types:
- `EMPTY_FILE` - File is empty or invalid
- `TOO_LARGE` - File exceeds size limit
- `INVALID_FORMAT` - File is not a valid USDZ format
- `PARSING_FAILED` - USDZ parsing failed
- `CONVERSION_FAILED` - GLB conversion failed
- `LIBRARY_UNAVAILABLE` - USDZ parsing library not available
- `UNSUPPORTED_FEATURES` - USDZ contains unsupported features

### User-Friendly Messages:
Each error type has a corresponding user-friendly message that explains what went wrong and provides guidance.

## 🧪 **Testing**

Run the tests with:
```bash
npm test lib/__tests__/convertUsdzToGlb.test.ts
```

The tests cover:
- Empty file handling
- File size validation
- Format validation
- Error message generation
- Placeholder GLB creation

## 🔮 **Future Implementation**

When real USDZ parsing is implemented, the module will support:

### Option 1: WASM-based Conversion
```typescript
// Using tinyusdz compiled to WASM
import { usdModule } from 'usd-wasm';

async function realUsdzConversion(usdzBuffer: Buffer): Promise<Buffer> {
  const scene = usdModule.loadUSDZ(usdzBuffer);
  const glbArrayBuffer = scene.toGLTF({ format: 'glb' });
  return Buffer.from(glbArrayBuffer);
}
```

### Option 2: Python Subprocess
```typescript
// Using Python with USD libraries
import { spawn } from 'child_process';

async function pythonUsdzConversion(usdzBuffer: Buffer): Promise<Buffer> {
  // Call Python script with USD libraries
  // Return GLB buffer
}
```

### Option 3: Custom USDZ Parser
```typescript
// Custom implementation using ZIP parsing and USD format understanding
async function customUsdzConversion(usdzBuffer: Buffer): Promise<Buffer> {
  // Parse ZIP structure
  // Extract USD files
  // Convert to GLB
}
```

## 📋 **Integration**

### In API Routes:
```typescript
import { convertUsdzToGlb } from '@/lib/convertUsdzToGlb';

export async function POST(request: NextRequest) {
  const { usdzBuffer, fileName } = await request.json();
  
  const result = await convertUsdzToGlb({
    usdzBuffer: Buffer.from(usdzBuffer),
    fileName
  });
  
  if (!result.success) {
    return NextResponse.json({
      error: result.error,
      warning: result.warning
    }, { status: 400 });
  }
  
  // Process successful conversion
  return NextResponse.json({
    success: true,
    glbBuffer: result.glbBuffer
  });
}
```

### In Frontend:
```typescript
import { convertUsdzToGlb } from '@/lib/convertUsdzToGlb';

const handleFileUpload = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const result = await convertUsdzToGlb({
    usdzBuffer: Buffer.from(buffer),
    fileName: file.name
  });
  
  if (!result.success) {
    // Show user-friendly error message
    alert(result.warning || result.error);
    return;
  }
  
  // Use converted GLB file
  console.log('GLB file ready:', result.glbBuffer);
};
```

## 🎯 **Best Practices**

1. **Always check `result.success`** before using `result.glbBuffer`
2. **Display user-friendly error messages** using `result.warning` or `result.error`
3. **Validate file size** before conversion to avoid memory issues
4. **Provide fallback options** when conversion fails
5. **Log conversion attempts** for debugging and monitoring

## 🔍 **Debugging**

Enable detailed logging by setting:
```typescript
console.log('USDZ conversion debug mode enabled');
```

The module logs:
- File validation results
- Conversion attempts
- Error details
- Performance metrics

## 📚 **Related Documentation**

- [GLB Format Specification](https://github.com/KhronosGroup/glTF/tree/master/specification/2.0)
- [USD Format Documentation](https://graphics.pixar.com/usd/docs/index.html)
- [USDZ Format Overview](https://developer.apple.com/augmented-reality/quick-look/)
