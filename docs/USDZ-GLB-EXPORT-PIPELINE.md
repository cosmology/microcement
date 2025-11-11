# USDZ → GLB Export Pipeline

This document describes the implementation of the USDZ to GLB export pipeline for the microcement project.

## Overview

The pipeline enables users to:
1. Upload USDZ files from iOS Room Plan Scanner apps
2. Convert USDZ files to GLB format in the background
3. View the converted 3D models in the web application
4. Receive real-time notifications when conversion is complete

## Architecture

```
[Room Scanner App] → [USDZ Upload] → [Export API] → [Background Worker] → [GLB Storage] → [3D Viewer]
```

### Components

1. **Frontend Components**
   - `RoomScanner.tsx` - Main scanner interface with upload and export functionality
   - `ExportButton.tsx` - Handles export initiation and status tracking
   - `GLBViewer.tsx` - Displays converted GLB files in 3D

2. **API Routes**
   - `/api/exports` (POST) - Enqueues export jobs
   - `/api/exports/[id]` (GET) - Gets export status by ID
   - `/api/background/convert` - Background worker for conversion

3. **Database**
   - `exports` table - Tracks export jobs and status
   - Real-time notifications via Supabase Realtime

4. **Storage**
   - Supabase Storage for USDZ and GLB files
   - Organized by user and scene ID

## Database Schema

### exports Table

```sql
CREATE TABLE exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  scene_id text NOT NULL,
  usdz_path text NOT NULL,
  glb_path text,
  status text DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'ready', 'failed')),
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Indexes

- `idx_exports_user_id` - For user-specific queries
- `idx_exports_status` - For status filtering
- `idx_exports_created_at` - For chronological ordering

### Notification Function

```sql
CREATE OR REPLACE FUNCTION notify_export_ready(export_id uuid, glb_url text)
RETURNS void AS $$
BEGIN
  PERFORM pg_notify('export_channel', json_build_object('exportId', export_id, 'glbUrl', glb_url)::text);
END;
$$ LANGUAGE plpgsql;
```

## Environment Variables

Add these to your `.env` file:

```env
# Supabase Admin Configuration
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Storage bucket name for USDZ/GLB files
BUCKET_NAME=exports

# Base URL for API calls (used by background functions)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## API Endpoints

### POST /api/exports

Enqueues a new export job.

**Request Body:**
```json
{
  "sceneId": "room-scan-123",
  "usdzPath": "/models/scanned-rooms/user123/file.usdz",
  "userId": "user-uuid"
}
```

**Response:**
```json
{
  "message": "Export queued successfully",
  "id": "export-uuid",
  "status": "queued"
}
```

### POST /api/background/convert

Background worker that processes the conversion.

**Request Body:**
```json
{
  "exportId": "export-uuid"
}
```

**Process:**
1. Updates status to "processing"
2. Downloads USDZ from storage
3. Converts USDZ to GLB (placeholder implementation)
4. Uploads GLB to storage
5. Updates status to "ready"
6. Sends notification via Supabase Realtime

## Usage

### 1. Upload USDZ File

Users can upload USDZ files through the Room Scanner interface:

```tsx
// In RoomScanner.tsx
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  
  // Upload to storage
  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', userId);
  
  const response = await fetch('/api/upload-usdz', {
    method: 'POST',
    body: formData,
  });
  
  const result = await response.json();
  setUploadedFilePath(result.fileUrl);
};
```

### 2. Export to GLB

Once uploaded, users can export to GLB:

```tsx
// In ExportButton.tsx
const handleExport = async () => {
  const response = await fetch('/api/exports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sceneId: `room-scan-${Date.now()}`,
      usdzPath: uploadedFilePath,
      userId
    }),
  });
  
  const data = await response.json();
  setExportId(data.id);
};
```

### 3. Monitor Export Status

The export status is tracked in real-time:

```tsx
// In useExportStatus.ts
const { exportStatus, loading } = useExportStatus(exportId);

useEffect(() => {
  if (exportStatus?.status === 'ready') {
    // Export completed, show GLB viewer
    onExportReady(exportStatus.glbPath);
  }
}, [exportStatus]);
```

### 4. View GLB Model

Display the converted GLB file:

```tsx
// In GLBViewer.tsx
<GLBViewer glbUrl={glbUrl} className="h-96" />
```

## Real-time Notifications

The pipeline uses Supabase Realtime for live updates:

```tsx
// Subscribe to export notifications
const channel = supabase
  .channel('export_channel')
  .on('broadcast', { event: 'export_ready' }, (payload) => {
    console.log('Export ready:', payload);
    // Handle completion
  })
  .subscribe();
```

## Conversion Implementation

**Current Status:** Placeholder implementation

The `convertUsdzToGlb` function in `/api/background/convert/route.ts` currently returns the input buffer unchanged. This needs to be replaced with a real USDZ to GLB conversion implementation.

### Implementation Options

1. **WASM-based Converter**
   - Compile existing USD → GLTF converter to WebAssembly
   - Pros: Runs in Node without native binaries
   - Cons: Build complexity

2. **Native Binary (usdcat)**
   - Bundle native `usdcat` and spawn child process
   - Pros: Reliable conversion if binary is supported
   - Cons: Not all serverless environments allow native binaries

3. **External Microservice**
   - Implement conversion on a small VM (Fly.io/DigitalOcean/Railway)
   - Call it from Vercel worker
   - Pros: Easiest to run heavy binaries and scale separately

## Deployment

### Docker Environment Setup

The pipeline is configured to run entirely in Docker containers. All components are properly configured:

#### Docker Compose Configuration

The `docker-compose.yml` file includes the necessary environment variables:

```yaml
environment:
  - SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  - BUCKET_NAME=exports
  - NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

#### Vercel Configuration

The `vercel.json` file includes configuration for the background function:

```json
{
  "functions": {
    "api/background/convert.ts": {
      "runtime": "nodejs20.x",
      "maxDuration": 900
    }
  }
}
```

### Database Migration

Run the Liquibase migration to create the exports table:

```bash
# Start Supabase services
docker-compose -f supabase/docker-compose.yml up -d

# Run the migration
docker-compose -f supabase/docker-compose.yml run --rm liquibase
```

### Storage Bucket Setup

The exports bucket is automatically created during migration, but you can verify it exists:

```bash
# Check if bucket exists
docker-compose -f supabase/docker-compose.yml exec db psql -U postgres -d postgres -c "SELECT * FROM storage.buckets;"

# Create bucket if needed
docker-compose -f supabase/docker-compose.yml exec db psql -U postgres -d postgres -c "INSERT INTO storage.buckets (id, name, public) VALUES ('exports', 'exports', false) ON CONFLICT (id) DO NOTHING;"
```

## Testing

### Docker Environment Testing

1. **Verify Setup:**
   ```bash
   # Run the Docker test script
   ./scripts/test-docker-export-pipeline.sh
   ```

2. **Start Development Environment:**
   ```bash
   # Start Supabase services
   docker-compose -f supabase/docker-compose.yml up -d
   
   # Start Next.js development server
   docker-compose up app-dev
   ```

3. **Test the Pipeline:**
   - Open http://localhost:3000 in your browser
   - Navigate to the Room Scanner panel
   - Upload a USDZ file through the Room Scanner interface
   - Click "Export to GLB" to test the pipeline
   - Monitor the export status in the browser console

4. **Monitor Logs:**
   ```bash
   # View application logs
   docker-compose logs -f app-dev
   
   # View Supabase logs
   docker-compose -f supabase/docker-compose.yml logs -f
   ```

### Production Testing

1. Deploy to Vercel with proper environment variables

2. Test with real USDZ files from iOS Room Plan Scanner apps

3. Verify GLB files are generated and viewable

## Troubleshooting

### Common Issues

1. **Export Status Stuck on "Processing"**
   - Check background function logs in Vercel dashboard
   - Verify `convertUsdzToGlb` implementation

2. **USDZ Upload Fails**
   - Check file size limits
   - Verify Supabase Storage permissions

3. **GLB Viewer Not Loading**
   - Check GLB file URL accessibility
   - Verify Three.js/React Three Fiber setup

### Logs

- Frontend: Browser console
- API: Vercel function logs
- Database: Supabase dashboard logs

## Future Enhancements

1. **Real USDZ Conversion**
   - Implement actual USDZ to GLB conversion
   - Support for different USDZ formats

2. **Batch Processing**
   - Support multiple file conversions
   - Queue management

3. **Advanced 3D Features**
   - Material preservation
   - Animation support
   - Lighting optimization

4. **Performance Optimization**
   - File compression
   - Progressive loading
   - Caching strategies
