# Architect-Client Relationship Design

## Current Problem

The `architect_clients` table is missing a direct foreign key to `scene_design_configs`, making it difficult to track which project config belongs to which client relationship.

## Current Schema (Before Migration)

### `architect_clients` table
```sql
- id UUID PRIMARY KEY
- architect_id UUID → user_profiles(user_id)
- client_id UUID → user_profiles(user_id)
- project_name VARCHAR
- status VARCHAR
- budget, notes, etc.
```

### `scene_design_configs` table
```sql
- id UUID PRIMARY KEY
- architect_id UUID → user_profiles(user_id)
- client_id UUID → user_profiles(user_id)
- config_name VARCHAR
- model_path TEXT
- camera settings, etc.
```

**Problem**: No direct link! Relationships are tracked implicitly by matching `(architect_id, client_id)` pairs.

### Issues with Current Design:

1. ❌ **Multiple configs per relationship**: A client can have multiple projects from one architect with no clear link to which `architect_clients` record they belong to
2. ❌ **Orphaned records**: Deleting a config doesn't update the relationship status
3. ❌ **Confusing queries**: Must join on `(architect_id, client_id)` pairs instead of simple FK
4. ❌ **No cascade deletes**: Can't automatically clean up relationships when configs are deleted
5. ❌ **Ambiguous ownership**: Which config is the "active" one for a relationship?

---

## New Schema (After Migration)

### `architect_clients` table (UPDATED)
```sql
- id UUID PRIMARY KEY
- architect_id UUID → user_profiles(user_id)
- client_id UUID → user_profiles(user_id)
- scene_design_config_id UUID → scene_design_configs(id) ON DELETE CASCADE  ✅ NEW!
- project_name VARCHAR
- status VARCHAR
- budget, notes, etc.
```

### Benefits:

1. ✅ **Clear 1:1 relationship**: Each `architect_clients` record links to exactly one `scene_design_config`
2. ✅ **Automatic cleanup**: When a config is deleted, the relationship is also deleted (CASCADE)
3. ✅ **Simple queries**: Just join on `scene_design_config_id`
4. ✅ **Prevents orphans**: Database enforces referential integrity
5. ✅ **Multiple projects supported**: One client can have multiple projects from one architect, each with its own relationship record

---

## Migration Steps

### 1. Run the Migration

```bash
./scripts/add-scene-config-fk.sh
```

Or manually:
```bash
docker exec -i microcement-supabase-db-1 psql -U postgres -d postgres < supabase/migrations/add_scene_design_config_fk.sql
```

### 2. What the Migration Does

1. Adds `scene_design_config_id` column to `architect_clients` (nullable at first)
2. Creates foreign key constraint with `ON DELETE CASCADE`
3. **Auto-links existing relationships** by matching `(architect_id, client_id)` pairs
4. Adds performance index
5. Adds documentation comment

### 3. Update Application Code

After running the migration, update queries to use the new FK:

**Before:**
```typescript
// Had to match by (architect_id, client_id)
const relationshipMap = new Map(relationships?.map(r => [r.client_id, r]))
const relationship = relationshipMap.get(config.user_id)
```

**After:**
```typescript
// Can directly match by config ID!
const relationshipMap = new Map(relationships?.map(r => [r.scene_design_config_id, r]))
const relationship = relationshipMap.get(config.id)
```

---

## Workflow After Migration

### Creating a New Project

```typescript
// 1. Create scene_design_config
const { data: config } = await supabase
  .from('scene_design_configs')
  .insert({
    user_id: clientId,
    architect_id: architectId,
    client_id: clientId,
    config_name: 'Kitchen Renovation',
    model_path: '/models/kitchen.glb'
  })
  .select()
  .single()

// 2. Create architect_clients relationship linked to the config
await supabase
  .from('architect_clients')
  .insert({
    architect_id: architectId,
    client_id: clientId,
    scene_design_config_id: config.id,  // ✅ Link to config!
    project_name: 'Kitchen Renovation',
    status: 'pending_architect'
  })
```

### Querying Projects

```typescript
// Get all projects for an architect with their configs
const { data } = await supabase
  .from('architect_clients')
  .select(`
    *,
    scene_design_config:scene_design_configs(*)
  `)
  .eq('architect_id', architectId)

// Access config directly:
data.forEach(relationship => {
  console.log(relationship.scene_design_config.model_path)
})
```

### Deleting a Project

```typescript
// Delete the config - relationship is automatically deleted (CASCADE)
await supabase
  .from('scene_design_configs')
  .delete()
  .eq('id', configId)

// No need to manually delete from architect_clients!
```

---

## Database Constraints

### Foreign Keys
- `architect_clients.architect_id` → `user_profiles.user_id` (CASCADE)
- `architect_clients.client_id` → `user_profiles.user_id` (CASCADE)
- `architect_clients.scene_design_config_id` → `scene_design_configs.id` (CASCADE) ✅ **NEW**

### Unique Constraints
- `(architect_id, client_id)` UNIQUE - Prevents duplicate relationships
  - **Note**: After migration, you can remove this if you want to allow multiple projects per client-architect pair

---

## FAQs

### Q: Can one client have multiple projects from the same architect?

**Before Migration**: Yes, but confusing - multiple `scene_design_configs` with the same `(architect_id, client_id)` but only one `architect_clients` record.

**After Migration**: Yes, and clear! Create multiple `architect_clients` records, each with its own `scene_design_config_id`.

You may want to remove the `(architect_id, client_id)` UNIQUE constraint:
```sql
ALTER TABLE architect_clients 
DROP CONSTRAINT architect_clients_unique;
```

### Q: What happens to existing data?

The migration automatically links existing relationships by matching `(architect_id, client_id)` pairs. If multiple configs exist for one relationship, it links to the most recent one.

### Q: What if I delete a scene_design_config?

The linked `architect_clients` record is **automatically deleted** due to `ON DELETE CASCADE`.

### Q: What if I don't want CASCADE delete?

Change the constraint to `ON DELETE SET NULL`:
```sql
ALTER TABLE architect_clients
DROP CONSTRAINT fk_architect_clients_scene_config;

ALTER TABLE architect_clients
ADD CONSTRAINT fk_architect_clients_scene_config
FOREIGN KEY (scene_design_config_id) 
REFERENCES scene_design_configs(id)
ON DELETE SET NULL;  -- Set to NULL instead of delete
```

---

## Testing

After migration, verify the relationships:

```sql
-- Check that relationships are properly linked
SELECT 
  ac.id,
  ac.project_name,
  ac.scene_design_config_id,
  sdc.config_name,
  sdc.model_path
FROM architect_clients ac
LEFT JOIN scene_design_configs sdc ON ac.scene_design_config_id = sdc.id;

-- Check for orphaned relationships (should be none)
SELECT * FROM architect_clients 
WHERE scene_design_config_id IS NULL;

-- Check for orphaned configs (should be handled by app logic)
SELECT * FROM scene_design_configs sdc
WHERE NOT EXISTS (
  SELECT 1 FROM architect_clients ac 
  WHERE ac.scene_design_config_id = sdc.id
);
```

