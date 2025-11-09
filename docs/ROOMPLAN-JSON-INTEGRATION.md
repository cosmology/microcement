# RoomPlan JSON Metadata Integration

## Overview

This implementation adds support for loading and storing RoomPlan JSON metadata alongside scanned room GLB files, using the Zustand scene store for centralized state management.

## Architecture

### Data Flow

1. **iOS Upload** → Both USDZ and JSON files are uploaded to backend
2. **API Response** → Backend returns JSON path in metadata
3. **ScannedRoomsPanel** → Stores JSON path in Zustand store
4. **Event Dispatch** → Load room event includes JSON path
5. **SceneEditor** → Loads JSON metadata and stores in Zustand
6. **Visualization** → RoomPlan data available for 3D visualization

### Zustand Store Integration

#### Scene Store Addition (`lib/stores/sceneStore.ts`)

**New State:**
```typescript
interface RoomPlanMetadata {
  walls?: Array<{
    start: [number, number, number]
    end: [number, number, number]
    height: number
    confidence: number
  }>
  doors?: Array<{
    position: [number, number, number]
    transform: number[]
  }>
  windows?: Array<{
    position: [number, number, number]
    transform: number[]
  }>
  objects?: Array<{
    category: string
    transform: number[]
  }>
}

// State fields
roomPlanJsonPath: string | null
roomPlanMetadata: RoomPlanMetadata | null
```

**New Actions:**
- `setRoomPlanJsonPath(path)` - Store JSON file path
- `setRoomPlanMetadata(metadata)` - Store parsed JSON data
- Automatically cleared in `clearScene()` action

## Implementation

### 1. API Layer (`app/api/scanned-rooms/route.ts`)

Derives JSON path from USDZ path:
```typescript
const jsonPath = exportItem.usdz_path 
  ? exportItem.usdz_path.replace('-Room.usdz', '-room.json').replace('.usdz', '-room.json')
  : null;

metadata: {
  ...
  json_path: jsonPath
}
```

### 2. iOS Export Flow (HomeClient.tsx)

When iOS redirects to web app with URL parameters:
```typescript
// HomeClient.tsx - iOS export handling
const { setModelPath, setRoomPlanJsonPath, setRoomPlanMetadata } = useSceneStore();

if (exportData.status === 'ready' && exportData.glb_path) {
  setModelPath(exportData.glb_path);
  
  if (exportData.json_path) {
    setRoomPlanJsonPath(exportData.json_path);
    
    // Load and store JSON metadata
    const jsonResponse = await fetch(exportData.json_path);
    const roomPlanJson = await jsonResponse.json();
    setRoomPlanMetadata(roomPlanJson);
  }
}
```

### 3. SceneEditor (`app/components/SceneEditor.tsx`)

Automatically loads model when `modelPath` changes in store:
```typescript
const { modelPath, roomPlanJsonPath, roomPlanMetadata } = useSceneStore();

useEffect(() => {
  if (modelPath && modelPath !== previousStoreModelPathRef.current) {
    loadUploadedModel(modelPath);
    previousStoreModelPathRef.current = modelPath;
  }
}, [modelPath]);

// JSON metadata is already loaded by HomeClient and stored in Zustand
// Components can access it via: useSceneStore(state => state.roomPlanMetadata)
```

## Usage

### Accessing RoomPlan Metadata

```typescript
import { useSceneStore } from '@/lib/stores/sceneStore';

function MyComponent() {
  const roomPlanMetadata = useSceneStore(state => state.roomPlanMetadata);
  const roomPlanJsonPath = useSceneStore(state => state.roomPlanJsonPath);
  
  if (roomPlanMetadata?.walls) {
    // Visualize walls
    roomPlanMetadata.walls.forEach(wall => {
      // Draw wall lines
    });
  }
}
```

### Visualizing Measurements

```typescript
{roomPlanMetadata?.walls?.map((wall, i) => {
  const start = new THREE.Vector3(...wall.start);
  const end = new THREE.Vector3(...wall.end);
  return (
    <line key={i}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          count={2}
          array={new Float32Array([
            ...start.toArray(),
            ...end.toArray()
          ])}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial attach="material" color="yellow" />
    </line>
  );
})}
```

## File Storage Structure

```
public/models/scanned-rooms/{userId}/
├── {UUID}-Room.usdz        ← 3D geometry (USDZ format)
├── {UUID}-room.json        ← RoomPlan metadata
└── {UUID}-ios-scan-*.glb   ← Converted GLB (for display)
```

## Benefits

1. **Centralized State** - Single source of truth in Zustand store
2. **Reactive Updates** - Components automatically update when metadata changes
3. **Clean Cleanup** - Metadata cleared when scene is cleared
4. **Type Safety** - TypeScript interfaces for RoomPlan metadata
5. **Extensible** - Easy to add new metadata fields

## Next Steps

1. **Visualize Walls** - Draw wall boundaries from JSON
2. **Show Dimensions** - Display room measurements
3. **Highlight Openings** - Mark doors and windows
4. **Object Detection** - Show detected furniture/objects
5. **Interactive Labels** - Click walls to see dimensions

## Related Files

- `lib/stores/sceneStore.ts` - Zustand store with RoomPlan state
- `app/api/scanned-rooms/route.ts` - API that provides JSON path
- `app/components/ScannedRoomsList.tsx` - Displays scanned rooms (can set JSON path)
- `app/components/HomeClient.tsx` - Handles iOS export URL params and loads JSON metadata
- `app/components/SceneEditor.tsx` - Watches store for modelPath changes, loads model automatically
- `app/api/upload-from-ios/route.ts` - Handles upload of both USDZ and JSON
