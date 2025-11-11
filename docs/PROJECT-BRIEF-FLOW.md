# Project Brief Upload Flow - Refactored

## Overview
Streamlined project brief submission with automatic orbital camera path generation.

---

## Happy Path Flow

### Step 1: User clicks "New Project Brief"
- `ProjectBriefModal` opens
- Form fields: Project Name, Description, Area Type, Model File

### Step 2: User fills out form and submits
**Backend Actions** (`/app/api/upload/route.ts`):

1. **Upload model file** to Supabase Storage
   - Path: `public/uploads/{userId}/{assetId}-{filename}.glb`
   
2. **Create `user_assets` record**
   ```sql
   INSERT INTO user_assets (user_id, asset_type, object_path, ...)
   ```

3. **Create `scene_design_configs` record**
   ```sql
   INSERT INTO scene_design_configs (
     user_id,
     config_name,
     model_path,
     camera_fov: 75,
     initial_camera_position: {x: 50, y: 25, z: 0},
     background_color: '#f5f3ed',
     ...
   )
   ```

4. **Create default orbital camera path** (NEW!)
   - Uses `/lib/config/defaultOrbitalPath.ts`
   - **9 waypoints** in a circle
   - **Radius**: 50 units
   - **Height**: 25 units (ORBITAL_HEIGHT)
   - **Start**: 45° (northeast)
   - **Direction**: Counter-clockwise
   
   ```sql
   INSERT INTO scene_follow_paths (
     scene_design_config_id,
     path_name: 'Default Orbital Path',
     camera_points: [9 waypoints in circle],
     look_at_targets: [all pointing to center (0, 10, 0)],
     is_active: true
   )
   ```

5. **Create `architect_clients` relationship** (if architect)
   ```sql
   INSERT INTO architect_clients (
     architect_id,
     client_id,
     project_name,
     status: 'pending_architect'
   )
   ```

### Step 3: User scrolls to see model
- Model loads with **orbital camera animation**
- Camera circles around model on default path
- No camera controls (scroll-based animation only)

### Step 4: User deletes the brief
**Cascade Delete** (`/app/api/user-assets/route.ts`):

1. **Delete physical file** from Supabase Storage
2. **Delete physical file** from public filesystem (`public/uploads/...`)
3. **Delete `architect_clients`** relationship (manual - no FK to scene_config)
4. **Delete `scene_design_configs`** record
   - ✅ Cascades to `scene_follow_paths` (via foreign key `ON DELETE CASCADE`)
5. **Delete `user_assets`** record

---

## Default Orbital Camera Path

### Waypoint Calculation
```typescript
const ORBITAL_RADIUS = 50
const ORBITAL_HEIGHT = 25
const WAYPOINT_COUNT = 9
const startAngle = 45° // Northeast

for (let i = 0; i < 9; i++) {
  const angle = 45° + (i * 360° / 9)
  waypoints[i] = {
    x: 50 * cos(angle),
    y: 25,
    z: 50 * sin(angle)
  }
}
```

### LookAt Targets
All lookAt targets point to model center:
```typescript
lookAtTargets = [
  {x: 0, y: 10, z: 0}, // repeated 9 times
  ...
]
```

### Waypoint Positions (approximate)
1. `(35.4, 25, 35.4)` - 45° (NE)
2. `(11.6, 25, 48.6)` - 85°
3. `(-15.3, 25, 47.6)` - 125°
4. `(-38.3, 25, 32.1)` - 165°
5. `(-48.3, 25, 8.7)` - 205° (SW)
6. `(-42.4, 25, -17.4)` - 245°
7. `(-23.9, 25, -43.8)` - 285°
8. `(4.4, 25, -49.8)` - 325°
9. `(32.1, 25, -38.3)` - 365° (back to start)

---

## Database Schema Requirements

### Foreign Key Constraints
Ensure cascade delete is configured:

```sql
-- scene_follow_paths
ALTER TABLE scene_follow_paths
  ADD CONSTRAINT fk_scene_design_config
  FOREIGN KEY (scene_design_config_id)
  REFERENCES scene_design_configs(id)
  ON DELETE CASCADE;

-- scene_hotspots
ALTER TABLE scene_hotspots
  ADD CONSTRAINT fk_scene_design_config
  FOREIGN KEY (scene_design_config_id)
  REFERENCES scene_design_configs(id)
  ON DELETE CASCADE;
```

---

## Files Modified

### Created
- `/lib/config/defaultOrbitalPath.ts` - Orbital path generator

### Modified
- `/app/api/upload/route.ts` - Use orbital path instead of static default
- `/app/api/user-assets/route.ts` - Verify cascade delete works

---

## Testing Checklist

- [ ] Upload new project brief
- [ ] Verify orbital camera path created (9 waypoints)
- [ ] Check database records created:
  - [ ] `user_assets`
  - [ ] `scene_design_configs`
  - [ ] `scene_follow_paths` (with orbital path)
  - [ ] `architect_clients` (if architect)
- [ ] Load model and verify orbital animation
- [ ] Delete brief
- [ ] Verify all records deleted:
  - [ ] Physical file removed from storage
  - [ ] `scene_design_configs` deleted
  - [ ] `scene_follow_paths` cascade deleted
  - [ ] `scene_hotspots` cascade deleted
  - [ ] `architect_clients` deleted
  - [ ] `user_assets` deleted

---

## Configuration

### Adjustable Constants
```typescript
// lib/config/defaultOrbitalPath.ts
const ORBITAL_RADIUS = 50  // Distance from center
const ORBITAL_HEIGHT = 25  // Height above ground
const WAYPOINT_COUNT = 9   // Number of waypoints
```

To adjust the orbital path:
1. Change `ORBITAL_RADIUS` for wider/tighter orbit
2. Change `ORBITAL_HEIGHT` for higher/lower camera
3. Change `WAYPOINT_COUNT` for smoother/coarser animation

---

## Future Enhancements

1. **Custom orbital paths** - Let architect adjust radius/height
2. **Multiple orbit layers** - High, medium, low views
3. **Auto-scaling orbit** - Calculate radius based on model size
4. **Orbit speed control** - Adjust animation speed

