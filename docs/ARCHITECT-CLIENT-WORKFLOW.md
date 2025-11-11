# Architect-Client Workflow - Fixed Implementation

## Overview
Complete workflow for architect managing client projects from initial upload to final approval.

---

## User Roles

### End User (Biljana - 12c23ebf-446e-4223-a351-737c97bd6e93)
- Uploads project brief with 3D model
- Reviews architect's designs
- Approves final walkthrough

### Architect (Ivan - 225a781d-0944-4c2c-9b7a-bb353175c323)
- Receives project notifications
- Creates custom camera paths
- Submits designs for review

---

## Fixed Issues

### 1. ✅ Architect Sees All Client Projects
**Was**: Only showing `status = 'active'` projects
**Now**: Shows ALL statuses (`pending_architect`, `in_progress`, `pending_review`, `active`, etc.)

```typescript
// OLD (ArchitectModelsList.tsx line 39)
.eq('status', 'active')

// NEW - Shows all statuses
.order('created_at', { ascending: false })
```

### 2. ✅ Project Display with Action Buttons
**Format**: 
```
[📁 Icon] [Project Name]
         [Client Name]
         [📁 model-filename.glb]          [BUTTON]
```

**Button Text Based on Status**:
- `PENDING_ARCHITECT` → **START** (green)
- `IN_PROGRESS` → **CONTINUE** (blue)
- `PENDING_REVIEW` → **REVIEW** (yellow)
- `ACTIVE` → **FINALIZE** (purple)

### 3. ✅ Status Update on START Click
**Flow**:
1. Architect clicks **START** button
2. API call to `/api/architect-clients/update-status`
3. Status changes: `PENDING_ARCHITECT` → `IN_PROGRESS`
4. Model loads with default orbital path
5. Camera controls enabled automatically

### 4. ✅ Camera Controls Enabled
When architect clicks START/CONTINUE:
- `enableCameraControls: true` passed in event
- `SceneEditor` enables camera path editor
- All editing tools available:
  - Bird View toggle
  - Waypoint editing
  - LookAt target editing
  - Height adjustment
  - Path visuals
  - Model rotation

---

## Complete Workflow

### Step 1: End User Uploads Model
```
End User (Biljana):
1. Clicks "New Project Brief"
2. Fills form:
   - Project Name: "Living Room Renovation"
   - Description: "Need microcement for living room"
   - Area Type: "Living Room"
   - Square Footage: 500
   - Select Architect: Ivan
   - Upload: living-room.glb
3. Clicks "Submit"
```

**Backend Actions** (`/app/api/upload/route.ts`):
```sql
-- Creates user_assets
INSERT INTO user_assets (
  owner_id: '12c23ebf-446e-4223-a351-737c97bd6e93',
  object_path: '/uploads/12c23ebf.../living-room.glb',
  scene_config_id: [new-config-id],
  architect_id: '225a781d-0944-4c2c-9b7a-bb353175c323'
)

-- Creates scene_design_configs
INSERT INTO scene_design_configs (
  user_id: '12c23ebf-446e-4223-a351-737c97bd6e93',
  model_path: '/uploads/12c23ebf.../living-room.glb',
  config_name: 'Living Room Renovation',
  ...
)

-- Creates default orbital path
INSERT INTO scene_follow_paths (
  scene_design_config_id: [new-config-id],
  path_name: 'Default Orbital Path',
  camera_points: [9 waypoints in circle],
  is_active: true
)

-- Creates/updates architect_clients relationship
INSERT INTO architect_clients (
  architect_id: '225a781d-0944-4c2c-9b7a-bb353175c323',
  client_id: '12c23ebf-446e-4223-a351-737c97bd6e93',
  project_name: 'Living Room Renovation',
  status: 'pending_architect'  ← CRITICAL!
)
```

### Step 2: Architect Sees Project
```
Architect (Ivan):
1. Logs in
2. Opens DockedNavigation → "Client Models"
3. Sees:

   📁 Living Room Renovation
      Biljana Surname
      📁 living-room.glb                [START]
                                        ↑ green button
```

**What Architect Sees**:
- **Folder icon** at start
- **Project Name**: "Living Room Renovation"
- **Client Name**: "Biljana Surname"
- **File Path**: "living-room.glb"
- **Button**: "START" (green, with Play icon)

### Step 3: Architect Clicks START
```
Architect (Ivan):
1. Clicks "START" button
```

**Frontend Actions** (`ArchitectModelsList.tsx`):
```typescript
// 1. Update status via API
POST /api/architect-clients/update-status
{
  relationshipId: [architect-client-id],
  status: 'in_progress'
}

// 2. Load model with controls enabled
window.dispatchEvent(new CustomEvent('load-collaborative-model', {
  detail: { 
    sceneConfigId: [scene-config-id],
    clientId: '12c23ebf-446e-4223-a351-737c97bd6e93',
    enableCameraControls: true  ← CRITICAL!
  }
}))
```

**Backend Actions** (`/app/api/architect-clients/update-status/route.ts`):
```sql
UPDATE architect_clients
SET 
  status = 'in_progress',
  updated_at = NOW()
WHERE id = [relationship-id]
```

**SceneEditor Actions**:
```typescript
// 1. Load scene config
loadCollaborativeSceneConfig(sceneConfigId)

// 2. Enable camera controls
if (enableCameraControls) {
  useCameraStore.getState().toggleEditorEnabled()
}

// Result: Camera Path Editor appears in DockedNavigation
```

### Step 4: Architect Edits Camera Path
```
Architect (Ivan):
1. Model loads with default orbital path
2. Camera controls panel appears
3. Can now:
   - Toggle Bird View
   - Drag waypoints
   - Edit lookAt targets
   - Adjust heights
   - Show/hide path visuals
   - Rotate model
   - Auto-save changes
```

**All Changes Auto-Save**:
- Debounced API calls to save camera points
- Updates `scene_follow_paths` table
- Client will see updated path when reviewing

---

## API Endpoints

### POST `/api/upload`
Creates complete project setup:
- `user_assets` record
- `scene_design_configs` record
- `scene_follow_paths` with orbital path
- `architect_clients` relationship (status: `pending_architect`)

### POST `/api/architect-clients/update-status`
Updates project status:
```json
{
  "relationshipId": "uuid",
  "status": "in_progress" // or pending_review, active, etc.
}
```

### GET `/api/scene-configs/{id}`
Loads scene configuration with camera path for collaborative editing.

---

## Database Schema

### architect_clients
```sql
CREATE TABLE architect_clients (
  id UUID PRIMARY KEY,
  architect_id UUID REFERENCES user_profiles(user_id),
  client_id UUID REFERENCES user_profiles(user_id),
  project_name VARCHAR(255),
  project_description TEXT,
  status project_status DEFAULT 'pending_upload',
  -- statuses: pending_upload, pending_architect, in_progress, 
  --           pending_review, active, completed, on_hold, cancelled
  start_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### user_assets
```sql
CREATE TABLE user_assets (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id),
  object_path TEXT,
  scene_config_id UUID REFERENCES scene_design_configs(id),
  architect_id UUID REFERENCES user_profiles(user_id),  ← Links to architect
  created_at TIMESTAMP
)
```

### scene_design_configs
```sql
CREATE TABLE scene_design_configs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),  ← Client user ID
  config_name VARCHAR(255),
  model_path TEXT,
  camera_fov INTEGER DEFAULT 75,
  initial_camera_position JSONB,
  ...
)
```

### scene_follow_paths
```sql
CREATE TABLE scene_follow_paths (
  id UUID PRIMARY KEY,
  scene_design_config_id UUID REFERENCES scene_design_configs(id) ON DELETE CASCADE,
  path_name VARCHAR(255),
  camera_points JSONB,  ← Array of {x, y, z} waypoints
  look_at_targets JSONB,  ← Array of {x, y, z} targets
  is_active BOOLEAN DEFAULT TRUE,
  path_order INTEGER
)
```

---

## Status Transitions

```
PENDING_UPLOAD (client filling form)
    ↓
PENDING_ARCHITECT (uploaded, waiting for architect)
    ↓ [Architect clicks START]
IN_PROGRESS (architect editing camera path)
    ↓ [Architect clicks "Send for Review"]
PENDING_REVIEW (client reviewing design)
    ↓ [Client approves]
ACTIVE (design approved, ready for implementation)
    ↓
COMPLETED (project finished)
```

---

## Testing Checklist

### As End User (Biljana)
- [ ] Can upload project brief
- [ ] Architect is assigned (`architect_id` in `user_assets`)
- [ ] `architect_clients` created with `status: 'pending_architect'`
- [ ] Default orbital path created
- [ ] Can see own uploads in "My Uploads"

### As Architect (Ivan)
- [ ] Can see client project in "Client Models"
- [ ] Project shows: folder icon, name, client, file path
- [ ] Button shows "START" for `pending_architect`
- [ ] Clicking START updates status to `in_progress`
- [ ] Model loads with default orbital path
- [ ] Camera controls appear automatically
- [ ] Can edit waypoints, lookAt targets
- [ ] Changes auto-save to database
- [ ] Button changes to "CONTINUE" after status update

### Status Transitions
- [ ] `pending_architect` → `in_progress` on START click
- [ ] `in_progress` → `pending_review` on "Send for Review"
- [ ] `pending_review` → `active` on client approval
- [ ] `pending_review` → `in_progress` on client "Request Revisions"

---

## Console Logs to Watch

### On Upload (End User):
```
📤 [Upload API] Creating orbital camera path with 9 waypoints
📤 [Upload API] Relationship updated: {status: 'pending_architect', architect_id: '225a...'}
```

### On Architect Load:
```
🔍 [ArchitectModelsList] Loading projects for architect: 225a781d...
🔍 [ArchitectModelsList] Found relationships: [{...status: 'pending_architect'...}]
```

### On START Click:
```
🎯 [ArchitectModelsList] Project action: {status: 'pending_architect', sceneConfigId: ...}
🔄 [Update Status API] Updating relationship: ... to status: in_progress
✅ [Update Status API] Status updated successfully
🔍 [ArchitectModelsList] Loading model with scene config ID: ...
🤝 [ScrollScene] Load collaborative model event received
🎛️ [ScrollScene] Enabling camera controls for architect
✅ [ScrollScene] Camera controls enabled
```

---

## Troubleshooting

### Issue: Architect doesn't see client project
**Check**: Query in `ArchitectModelsList.tsx` line 35-39
```typescript
// Should NOT filter by status
.from('architect_clients')
.select('...')
.eq('architect_id', architectId)
// ❌ .eq('status', 'active')  <- Remove this!
```

### Issue: START button doesn't appear
**Check**: Status mapping in `ArchitectModelsList.tsx`
```typescript
const STATUS_BUTTON_CONFIG = {
  'pending_architect': { label: 'START', ... },
  // ...
}
```

### Issue: Camera controls don't enable
**Check**: Event detail includes `enableCameraControls: true`
```typescript
window.dispatchEvent(new CustomEvent('load-collaborative-model', {
  detail: { 
    sceneConfigId,
    clientId,
    enableCameraControls: true  ← Must be present!
  }
}))
```

### Issue: Status doesn't update
**Check**: API endpoint exists at `/api/architect-clients/update-status/route.ts`
**Check**: Relationship ID is correct
**Check**: Valid status value passed

---

## Next Steps

After architect finishes editing:
1. Add "Send for Review" button
2. Update status to `pending_review`
3. Notify client
4. Client reviews and approves/requests revisions

