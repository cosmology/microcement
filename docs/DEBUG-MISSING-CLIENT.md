# Debug Guide: Missing Client in Architect's Panel

## Issue
Architect Ivan (225a781d-0944-4c2c-9b7a-bb353175c323) can see client Biljana but not client Emilija (5c439016-9865-44af-88bc-478fff32ae36).

---

## Step 1: Check Console Logs

Open browser console and look for these logs when loading Client Models panel:

### Expected Logs:
```
🔍 [ArchitectModelsList] Loading projects for architect: 225a781d...
🔍 [ArchitectModelsList] Found relationships: [...]
🔍 [ArchitectModelsList] Total relationships found: 2
  Relationship 1: {client_id: '12c23ebf...', project_name: '...', status: '...'}
  Relationship 2: {client_id: '5c439016...', project_name: '...', status: '...'}
```

### If Emilija is Missing:
You'll see:
```
🔍 [ArchitectModelsList] Total relationships found: 1
  Relationship 1: {client_id: '12c23ebf...', project_name: 'Biljana Project', status: 'pending_architect'}
```

**Problem**: `architect_clients` relationship doesn't exist for Emilija!

### If Emilija Shows but Without Scene Config:
You'll see:
```
⚠️ No scene config found for client: 5c439016-9865-44af-88bc-478fff32ae36 Project: Emilija Project
```

**Problem**: Emilija has a relationship but no `scene_design_configs` record!

---

## Step 2: Check Database - architect_clients

### Query to check relationships:
```sql
SELECT 
  id,
  architect_id,
  client_id,
  project_name,
  status,
  created_at
FROM architect_clients
WHERE architect_id = '225a781d-0944-4c2c-9b7a-bb353175c323'
ORDER BY created_at DESC;
```

### Expected Results:
| client_id | project_name | status |
|-----------|--------------|--------|
| 12c23ebf-446e-4223-a351-737c97bd6e93 | Biljana Project | pending_architect |
| 5c439016-9865-44af-88bc-478fff32ae36 | Emilija Project | pending_architect |

### If Emilija Missing:
**Fix**: Create the relationship:
```sql
INSERT INTO architect_clients (
  architect_id,
  client_id,
  project_name,
  project_description,
  status,
  start_date
) VALUES (
  '225a781d-0944-4c2c-9b7a-bb353175c323',
  '5c439016-9865-44af-88bc-478fff32ae36',
  'Emilija Project',
  'Project description',
  'pending_architect',
  CURRENT_DATE
);
```

---

## Step 3: Check Database - scene_design_configs

### Query to check scene configs:
```sql
SELECT 
  id,
  user_id,
  config_name,
  model_path,
  created_at
FROM scene_design_configs
WHERE user_id IN (
  '12c23ebf-446e-4223-a351-737c97bd6e93',
  '5c439016-9865-44af-88bc-478fff32ae36'
)
ORDER BY created_at DESC;
```

### Expected Results:
| user_id | config_name | model_path |
|---------|-------------|------------|
| 12c23ebf... | Biljana Design | /uploads/.../model.glb |
| 5c439016... | Emilija Design | /uploads/.../model.glb |

### If Emilija's Config Missing:
**Fix**: She needs to upload a model through the "New Project Brief" form!

Or manually create:
```sql
INSERT INTO scene_design_configs (
  user_id,
  config_name,
  model_path,
  camera_fov,
  initial_camera_position
) VALUES (
  '5c439016-9865-44af-88bc-478fff32ae36',
  'Emilija Design',
  '/uploads/5c439016.../model.glb',
  75,
  '{"x": 50, "y": 25, "z": 0}'::jsonb
);
```

---

## Step 4: Check Database - user_assets

### Query to check uploaded files:
```sql
SELECT 
  id,
  owner_id,
  object_path,
  scene_config_id,
  architect_id,
  created_at
FROM user_assets
WHERE owner_id = '5c439016-9865-44af-88bc-478fff32ae36'
ORDER BY created_at DESC;
```

### Expected Result:
| owner_id | object_path | architect_id | scene_config_id |
|----------|-------------|--------------|-----------------|
| 5c439016... | /uploads/.../model.glb | 225a781d... | [uuid] |

### If No Assets:
**Problem**: Emilija hasn't uploaded a model yet!

**Fix**: 
1. Login as Emilija
2. Click "New Project Brief"
3. Upload model and select Architect Ivan
4. Submit

---

## Step 5: Full Project Flow Check

### Complete workflow for a client to appear in architect's panel:

1. **End User Uploads**:
   ```
   User: Emilija (5c439016-9865-44af-88bc-478fff32ae36)
   → Clicks "New Project Brief"
   → Uploads model.glb
   → Selects Architect: Ivan (225a781d-0944-4c2c-9b7a-bb353175c323)
   → Submits
   ```

2. **Backend Creates**:
   ```sql
   -- 1. user_assets record
   INSERT INTO user_assets (
     owner_id: '5c439016...',
     architect_id: '225a781d...',
     object_path: '/uploads/.../model.glb',
     scene_config_id: [new-uuid]
   )

   -- 2. scene_design_configs record
   INSERT INTO scene_design_configs (
     user_id: '5c439016...',
     config_name: 'Project Name',
     model_path: '/uploads/.../model.glb'
   )

   -- 3. scene_follow_paths record (orbital path)
   INSERT INTO scene_follow_paths (
     scene_design_config_id: [new-uuid],
     path_name: 'Default Orbital Path',
     camera_points: [9 waypoints],
     is_active: true
   )

   -- 4. architect_clients relationship
   INSERT INTO architect_clients (
     architect_id: '225a781d...',
     client_id: '5c439016...',
     project_name: 'Project Name',
     status: 'pending_architect'
   )
   ```

3. **Architect Sees**:
   ```
   Client Models Panel:
   
   Emilija Surname
   1 project
     📁 Project Name
        📁 model.glb        [START]
   ```

---

## Common Issues & Fixes

### Issue 1: Relationship Exists but No Scene Config
**Symptoms**: Console shows "⚠️ No scene config found for client: ..."

**Fix**: 
- Client needs to upload model
- Or manually create scene_design_configs record

### Issue 2: Scene Config Exists but No Relationship
**Symptoms**: Client uploaded but doesn't appear in architect's panel

**Fix**: Create architect_clients relationship:
```sql
INSERT INTO architect_clients (
  architect_id,
  client_id,
  project_name,
  status
) VALUES (
  '225a781d-0944-4c2c-9b7a-bb353175c323',
  '5c439016-9865-44af-88bc-478fff32ae36',
  'Project Name',
  'pending_architect'
);
```

### Issue 3: Both Exist but Still Not Showing
**Symptoms**: Database has both records, console logs show relationships, but UI doesn't display

**Check**:
1. Status filter - Make sure "All Statuses" is selected
2. Console logs - Look for "✅ Found scene config for client: 5c439016..."
3. Filtered groups - Check if `filteredGroups.length > 0`

**Debug**:
```javascript
// In browser console after page loads:
console.log('Status Filter:', statusFilter)
console.log('Client Groups:', clientGroups)
console.log('Filtered Groups:', filteredGroups)
```

---

## Quick Debug Commands

### Check from browser console:
```javascript
// Check what the component sees
console.log('Client Groups:', clientGroups)
console.log('Status Filter:', statusFilter)
console.log('Filtered Groups:', filteredGroups)
```

### Check from Supabase:
```sql
-- Full check for both clients
SELECT 
  ac.id as relationship_id,
  ac.client_id,
  ac.project_name,
  ac.status,
  up.first_name || ' ' || up.last_name as client_name,
  sdc.id as scene_config_id,
  sdc.config_name,
  sdc.model_path
FROM architect_clients ac
LEFT JOIN user_profiles up ON ac.client_id = up.user_id
LEFT JOIN scene_design_configs sdc ON sdc.user_id = ac.client_id
WHERE ac.architect_id = '225a781d-0944-4c2c-9b7a-bb353175c323'
ORDER BY ac.created_at DESC;
```

Expected to see both Biljana and Emilija with all fields populated.

---

## Resolution Checklist

- [ ] Relationship exists in `architect_clients`
- [ ] Scene config exists in `scene_design_configs`
- [ ] Scene config has `user_id` matching client
- [ ] Console logs show relationship found
- [ ] Console logs show scene config found
- [ ] Status filter is set to "All Statuses"
- [ ] No errors in console
- [ ] Client appears in UI grouped under their name

If all checked and still not showing, refresh the page or re-login.

