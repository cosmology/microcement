# Fresh Start Changes Summary

## ✅ Changes Applied for Fresh Container Start

### 1. Database Schema Updates

#### New Enum: `project_status`
```sql
CREATE TYPE public.project_status AS ENUM (
  'pending_upload',      -- Waiting for client to upload model
  'pending_details',     -- Model uploaded, waiting for details
  'pending_architect',   -- Waiting for architect to accept
  'in_progress',         -- Architect working on design
  'pending_review',      -- Sent to client for review
  'active',              -- Client approved, project live
  'on_hold',             -- Temporarily paused
  'completed',           -- Project finished
  'cancelled'            -- Project cancelled
);
```

#### Updated Table: `architect_clients`
- `status` column now uses `public.project_status` enum (not VARCHAR)
- `architect_id` is now nullable (for external onboarding)
- `end_date` field added
- Default status: `'pending_upload'`

### 2. Seed Data Updates

#### Biljana's Test Project (External Onboarding)
- Project Name: "New Collaboration Request"
- Status: `pending_upload`
- Architect: `NULL` (not assigned yet)
- Client: Biljana (`12c23ebf-446e-4223-a351-737c97bd6e93`)
- Purpose: Test external API onboarding workflow

### 3. Upload API Workflow Changes

#### File: `/app/api/upload/route.ts`

**Project Naming:**
- `project_name`: Saved as provided (e.g., "Bibi Model Kuhinja")
- `config_name`: Auto-generated lowercase with underscores (e.g., "bibi_model_kuhinja")

**Status Tracking:**
1. Checks for `pending_upload` relationship
2. Creates scene_design_config
3. Updates relationship status: `pending_upload` → `pending_details`
4. Assigns `architect_id`
5. Updates `project_name` with user input

### 4. UI Changes

#### ModelsList Component
- Queries all workflow statuses (not just `active`)
- Shows `pending_upload` projects with upload prompt
- Filters `pending_upload` from regular list (no duplicate cards)
- Status formatting improved (underscores → spaces)

#### DockedNavigation
- Always visible (not hidden on mobile)
- Responsive margins: `ml-12` (mobile collapsed) → `md:ml-48` (desktop expanded)

### 5. Expected Workflow Test

**As Biljana (biljana.h.g@gmail.com):**

1. **Initial State**
   - Login → See "My Models" with pending project
   - Project: "New Collaboration Request"
   - Status: `pending_upload`
   - Show: Upload button only

2. **After Upload** (e.g., "Bibi Model Kuhinja")
   - Database updates:
     - `scene_design_configs`: created with `config_name: "bibi_model_kuhinja"`
     - `architect_clients`: status → `pending_details`, project_name → "Bibi Model Kuhinja"
   - UI updates:
     - Project appears in regular list
     - Status shows: "Pending Details"
     - Model can be loaded

3. **Next Steps** (Manual or Future Implementation)
   - Architect accepts → status → `in_progress`
   - Architect creates camera path
   - Architect sends for review → status → `pending_review`
   - Client approves → status → `active`

---

**Date**: October 9, 2025
**Container Start**: Fresh (volumes removed)
**Status**: ✅ Ready for testing

