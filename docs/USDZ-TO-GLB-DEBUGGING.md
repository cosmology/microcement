# USDZ to GLB Conversion - Debugging Guide

## Where Conversion Happens

- **Main File**: `lib/convertUsdzToGlb.ts` (does the actual conversion)
- **API Endpoint**: `app/api/background/convert/route.ts` (receives conversion requests)
- **Called From**: iOS upload triggers `/api/upload-from-ios` → `/api/exports` → `/api/background/convert`
- **Environment**: Runs in Next.js Docker container, NO separate pipeline needed

## How to Monitor Logs

### 1. Find Running Container
```bash
docker ps | grep -E "app-dev|microcement" | head -1
```

### 2. Watch Next.js Logs (Primary)
```bash
# Get container name first
CONTAINER=$(docker ps --format '{{.Names}}' | grep -E "app-dev|microcement" | head -1)
docker logs $CONTAINER --follow
```

### 3. Filter for Conversion Messages
```bash
CONTAINER=$(docker ps --format '{{.Names}}' | grep -E "app-dev|microcement" | head -1)
docker logs $CONTAINER --follow 2>&1 | grep -E 'convert|USDZ|GLB|FALLBACK|Wall|vertex'
```

### 4. Check Recent Attempts
```bash
CONTAINER=$(docker ps --format '{{.Names}}' | grep -E "app-dev|microcement" | head -1)
docker logs $CONTAINER 2>&1 | tail -200 | grep -E 'convert|USDZ|GLB'
```

## Expected Output

### Good Conversion (24-28KB GLB from 30KB USDZ)

You should see:
```
Attempting real USDZ parsing for file: Room.usdz (33865 bytes)
Found 16 entries in USDZ archive
Found 16 USD files
Processing 16 USD files to extract geometry...
Successfully parsed xxxx.usd: { walls: 4, openings: 2, ... }
Wall 0: vertices=240, faces=128
GLB created: 28934 bytes
```

**Indicators:**
- Multiple walls extracted (4+)
- Hundreds of vertices (not just 8)
- GLB size is 24-28KB (close to USDZ size)
- No fallback messages

### Bad Conversion (2-4KB GLB, Red Square)

You'll see:
```
Python conversion failed: [error]
[FALLBACK] Python conversion failed, trying custom USDZ parsing...
Found 0 walls
[FALLBACK] Custom USDZ parsing failed, trying fallback conversion...
Fallback: Creating room geometry...
Fallback conversion successful: Room.usdz -> 3468 bytes GLB
```

**Indicators:**
- Very small GLB file (2-4KB)
- Only 8 vertices (placeholder cube)
- Fallback messages appear
- USDZ parsing failed

## Troubleshooting Steps

### 1. Restart Services
```bash
# Get container name and restart
CONTAINER=$(docker ps --format '{{.Names}}' | grep -E "app-dev|microcement" | head -1)
docker restart $CONTAINER
```

### 2. Check if Conversion is Being Called
```bash
CONTAINER=$(docker ps --format '{{.Names}}' | grep -E "app-dev|microcement" | head -1)
docker logs $CONTAINER 2>&1 | grep -i "background/convert"
```

### 3. Check Generated GLB Files
```bash
ls -lh public/models/scanned-rooms/*/*.glb
```

Expected file size: **24-28KB** for a 30KB USDZ input.

### 4. Verify USDZ File Exists
```bash
ls -lh public/models/scanned-rooms/*/*.usdz
```

### 5. Check GLB File Content (should be ~25KB)
```bash
file public/models/scanned-rooms/*/latest.glb
stat -f%z public/models/scanned-rooms/*/latest.glb
```

## Key Debugging Points

### Conversion Flow
1. **Python Conversion** (attempts to use `tinyusdz`)
2. **Custom Parsing** (extracts geometry from USD files)
3. **Fallback** (creates placeholder room) ← **THIS IS THE PROBLEM**

### Why You See Red Square
The fallback creates a simple 8-vertex cube because:
- Python conversion fails (no `tinyusdz` in Next.js container)
- Custom USDZ parsing doesn't extract real geometry correctly
- Falls back to placeholder cube (2-4KB)

### How to Fix It
The custom USDZ parsing in `lib/convertUsdzToGlb.ts` needs to:
1. Actually extract vertices and faces from USD files
2. Parse the room geometry correctly
3. Generate proper GLB with hundreds of vertices
4. NOT fall back to placeholder geometry

## Testing

1. Upload USDZ from iOS Room Scanner app
2. Watch logs: `docker logs microcement-app-dev-1 --follow`
3. Look for conversion messages and file sizes
4. Check generated GLB file size
5. If GLB is 2-4KB, USDZ parsing failed → using fallback

## Target

- **Input**: 30KB USDZ file
- **Expected Output**: 24-28KB GLB file
- **Current Output**: 2-4KB GLB file (fallback geometry)
