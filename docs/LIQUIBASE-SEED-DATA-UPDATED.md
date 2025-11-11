# Liquibase Seed Data Updated

## ✅ Completed: Current Database State Now Persists in Liquibase

### What Was Updated

Updated `/supabase/liquibase/changelogs/0003-add-user-data.yaml` to match the current localhost database snapshot.

### Seed Data Included

#### 1. Users (4 total)
All with production UUIDs:
- `ivanprokic@gmail.com` (admin) - `bd9be8f7-5217-43d7-a2ad-d9f2728a14e3`
- `ivanprokic@yahoo.com` (architect) - `225a781d-0944-4c2c-9b7a-bb353175c323`
- `biljana.h.g@gmail.com` (end_user) - `12c23ebf-446e-4223-a351-737c97bd6e93`
- `emilijaprokic2015@gmail.com` (end_user) - `5c439016-9865-44af-88bc-478fff32ae36`

#### 2. Architect-Client Relationships (4 total)
- Admin ↔ Architect: Kitchen & Bathroom Renovation (active)
- Admin ↔ Biljana: Future Project (paused)
- Architect ↔ Emilija: Collaborative Project (active)
- Architect ↔ Biljana: Collaborative Project (active)

#### 3. Scene Design Configs (3 core configs)

**a) Architect's ema_showcase** (`d4e5f6a7-b8c9-0123-4567-89abcdef0123`)
- User: `ivanprokic@yahoo.com` (architect)
- Model: `/models/ema.glb`
- Project: Kitchen & Bathroom Renovation
- Architect: Admin, Client: Architect
- Status: in_progress

**b) Admin's admin_default** (`e5f6a7b8-c9d0-1234-5678-9abcdef01234`)
- User: `ivanprokic@gmail.com` (admin)
- Model: `/models/no-material.glb`
- Project: Admin Default Configuration
- Architect: Admin, Client: Admin
- Status: completed

**c) Emilija's collaborative_project** (`da54fc29-0134-40fa-97cd-908def6d9c33`)
- User: `emilijaprokic2015@gmail.com` (end_user)
- Model: `/models/ema.glb`
- Project: Collaborative Project
- Architect: Architect, Client: Emilija
- Status: in_progress

#### 4. Scene Follow Paths (4 paths across 3 configs)

**Architect's ema_showcase:**
1. `default_path` - Original 9-point camera path
2. `current` - Edited camera path with custom positions

**Admin's admin_default:**
1. `default_path` - Simple 5-point camera path

**Emilija's collaborative_project:**
1. `default_path` - 9-point camera path (same as architect's default)

### Benefits

1. **Predictable Fresh Starts**: Every new container start will have this exact data
2. **Production-Ready UUIDs**: All UUIDs match production for seamless data transfer
3. **Complete Relationships**: All user connections, projects, and paths are seeded
4. **Ready for Testing**: Fresh containers immediately support all user roles and scenarios

### Testing Fresh Start

To verify this works on a fresh start:

```bash
# Stop and remove all containers and volumes
./scripts/dev-stop.sh
docker volume prune -f

# Start fresh
./scripts/dev-start.sh
```

Expected result:
- 4 users can log in immediately
- 3 scene configs with models load correctly
- 4 camera paths are available
- All architect-client relationships work

---

**Date**: October 9, 2025
**Status**: ✅ Complete

