# RoomPlan JSON Metadata Support

## Overview

This implementation adds support for uploading and storing RoomPlan JSON metadata files alongside USDZ files from the iOS RoomPlan scanner.

## Architecture

### File Upload Flow

1. **iOS App** sends both files via `multipart/form-data`:
   - `file` - USDZ 3D geometry file
   - `jsonFile` - RoomPlan JSON metadata (optional)

2. **Backend API** (`/api/upload-from-ios`) processes both files:
   - Validates USDZ file type
   - Validates JSON file type (if provided)
   - Stores both files in `public/models/scanned-rooms/{userId}/`
   - Generates matching filenames with UUID prefixes

3. **File Storage Structure**:
   ```
   public/models/scanned-rooms/{userId}/
   ├── {UUID}-Room.usdz
   └── {UUID}-room.json
   ```

## API Changes

### Request Format

```typescript
// Form data fields:
{
  file: File,           // USDZ file (required)
  jsonFile: File,       // RoomPlan JSON metadata (optional)
  userId: string,       // User UUID (required)
  sceneId: string       // Scene identifier (optional)
}
```

### Response Format

```typescript
{
  message: string,
  fileUrl: string,      // USDZ file URL
  jsonFileUrl: string | null,  // JSON file URL (if provided)
  userId: string,
  sceneId: string,
  exportId: string | null
}
```

## Filename Generation

- **USDZ**: `{randomUUID()}-Room.usdz`
- **JSON**: `{UUID}-room.json` (extracted from USDZ filename)

Example:
- USDZ: `a1b2c3d4-e5f6-7890-abcd-ef1234567890-Room.usdz`
- JSON: `a1b2c3d4-e5f6-7890-abcd-ef1234567890-room.json`

## Implementation Details

### Key Changes

1. **Import Update**: Replaced `uuid` package with Node.js built-in `randomUUID()` from `crypto`
2. **Multipart Handling**: Added `jsonFile` field extraction from form data
3. **Validation**: Added JSON file type validation
4. **File Processing**: Separate handling for USDZ and JSON files
5. **Response**: Includes `jsonFileUrl` in successful upload response

### Code Structure

```typescript
// Process USDZ file
const buffer = Buffer.from(await file.arrayBuffer());
const filename = `${randomUUID()}-${file.name}`;
await writeFile(filePath, buffer);

// Process JSON metadata file (if provided)
if (jsonFile) {
  const jsonFilename = filename.replace('.usdz', '-room.json');
  const jsonBuffer = Buffer.from(await jsonFile.arrayBuffer());
  await writeFile(jsonFilePath, jsonBuffer);
}
```

## Usage

### Frontend (iOS) Integration

The iOS app sends both files in the upload request. The implementation is in `RoomCaptureViewController.swift`:

**Export Process:**
1. Export USDZ file: `finalResults.export(to: destinationURL, exportOptions: .parametric)`
2. Encode and save JSON: `try jsonData.write(to: capturedRoomURL)`
3. Upload both files via multipart form data

**Implementation Details:**
- The `exportToWeb` method exports both USDZ and JSON files
- The `uploadUSDZ(fileURL:jsonURL:)` method accepts both file URLs
- Both files are added to the multipart form data with proper Content-Type headers
- The backend receives both files and stores them in the same directory with matching UUID prefixes

**Code Location:**
- File: `/Users/ivanprokic/workspace/xcode/room-plan-demo/RoomPlanExampleApp/RoomCaptureViewController.swift`
- Method: `uploadUSDZ(fileURL:jsonURL:)` (line ~247)
- Export: `exportToWeb(_:)` (line ~207)

### Backend Response Handling

The response includes both file URLs:

```json
{
  "fileUrl": "/models/scanned-rooms/user-id/UUID-Room.usdz",
  "jsonFileUrl": "/models/scanned-rooms/user-id/UUID-room.json"
}
```

## Next Steps

1. **Parse JSON Metadata**: Implement parser for RoomPlan JSON format
2. **Extract Measurements**: Parse dimensions, object types, and anchors
3. **Display in UI**: Show measurements as overlays in 3D viewer
4. **Database Storage**: Store JSON metadata in database for querying
5. **Measurement Display**: Render measurement lines and text in React Three Fiber scene

## References

- [RoomPlan Documentation](https://developer.apple.com/documentation/roomplan)
- USDZ File Format
- RoomPlan JSON Schema
