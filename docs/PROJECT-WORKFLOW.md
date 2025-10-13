# Project Workflow States

## Project Status Enum

The `project_status` enum defines the lifecycle of a project from initial inquiry to completion.

### Status Flow

```
pending_upload → pending_architect → in_progress → pending_review → active → completed
                        ↓                                              ↓
                    cancelled                                      on_hold
                                                                       ↓
                                                                  cancelled
```

### Status Definitions

| Status | Description | Architect Assigned | Scene Config | Follow Path | Next Step |
|--------|-------------|-------------------|--------------|-------------|-----------|
| **pending_upload** | External ingestion - client needs to select architect and upload model | ❌ No | ❌ No | ❌ No | Client selects architect & uploads model |
| **pending_architect** | Model uploaded, waiting for architect to accept project | ✅ Yes | ✅ Yes | ✅ Default | Architect accepts/rejects project |
| **in_progress** | Architect accepted and is working on camera paths and design | ✅ Yes | ✅ Yes | 🔄 WIP | Architect creates/edits camera path |
| **pending_review** | Architect sent design to client for review/sign-off | ✅ Yes | ✅ Yes | ✅ Yes | Client reviews and approves |
| **active** | Client approved design, project is live | ✅ Yes | ✅ Yes | ✅ Yes | Normal operation |
| **on_hold** | Project temporarily paused (any reason) | ✅ Yes | ✅ Yes | ✅ Yes | Resume or cancel |
| **completed** | Project finished successfully | ✅ Yes | ✅ Yes | ✅ Yes | Archive |
| **cancelled** | Project cancelled before completion | ✅ Yes/No | ✅ Yes/No | ✅ Yes/No | Archive |

### Workflow Steps

#### 1. **pending_upload** (External Ingestion)
- External system or subscription service creates client account
- System creates `architect_clients` record with `architect_id = NULL`, `status = 'pending_upload'`
- **Client Action**: 
  1. Search/select architect from dropdown
  2. Upload 3D model via "Upload Project" button
- **System Action**: 
  1. Creates `scene_design_config` with default camera points
  2. Updates `architect_clients`: assigns selected `architect_id`, changes status to `'pending_architect'`
  3. Sets `start_date` to current date
  4. Sends notification to architect

#### 2. **pending_architect**
- Model uploaded, architect assigned, architect receives notification
- **Architect Action**: Review project brief and start working (button: "Start Project")
- **System Action**: 
  - Changes status to `'in_progress'`
  - Sends notification to client: "Your architect has started working on your design"
- **Note**: If architect cannot take the project, they contact admin to reassign

#### 4. **in_progress**
- Architect actively working on the design
- **Architect Action**: Create/edit camera paths, set up scene
- **System Action**: Autosave changes to scene_follow_paths

#### 5. **pending_review**
- Architect completed design
- **Architect Action**: Click "Send for Review" (button in architect view)
- **System Action**: 
  - Changes status to `'pending_review'`
  - Sends notification to client: "Your design is ready for review!"
- **Client Action**: 
  - Review 3D walkthrough
  - **Approve** (button: "Approve Design") → status changes to `'active'`
  - **Request Changes** (button: "Request Revisions") → status goes back to `'in_progress'` with feedback notes

#### 6. **active**
- Client approved the design
- Project is live and being implemented
- Both client and architect have full access

#### 7. **on_hold** (Optional)
- Temporary pause (budget, schedule, or other reasons)
- Can resume to `in_progress` or cancel

#### 8. **completed**
- Project finished successfully
- Archive but keep accessible

#### 9. **cancelled**
- Project terminated before completion
- Archive and mark as cancelled

### Database Schema

```sql
CREATE TYPE public.project_status AS ENUM (
  'pending_upload',      -- Waiting for end_user to upload model
  'pending_details',     -- Model uploaded, waiting for project details
  'pending_architect',   -- Waiting for architect to accept project
  'in_progress',         -- Architect working on camera paths and design
  'pending_review',      -- Sent to client for review/sign-off
  'active',              -- Client approved, project active
  'on_hold',             -- Temporarily paused
  'completed',           -- Project finished
  'cancelled'            -- Project cancelled
);

CREATE TABLE architect_clients (
  id UUID PRIMARY KEY,
  architect_id UUID REFERENCES user_profiles(user_id), -- NULL for pending_upload
  client_id UUID NOT NULL REFERENCES user_profiles(user_id),
  project_name VARCHAR(255),
  project_description TEXT,
  status public.project_status DEFAULT 'pending_upload',
  start_date DATE,
  end_date DATE,
  budget DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### UI Behavior by Status

**ModelsList.tsx - End User View:**
- `pending_upload`: Show project card with "Upload Project" button only
- `pending_details`: Show "Add Project Details" button
- `pending_architect`: Show "Waiting for Architect" message
- `in_progress`: Show "In Progress" badge
- `pending_review`: Show "Under Review" badge
- `active`: Show green "Active" badge, allow loading model
- `on_hold`: Show amber "On Hold" badge
- `completed`: Show gray "Completed" badge
- `cancelled`: Show "Cancelled" badge

**ArchitectModelsList.tsx - Architect View:**
- Filter by status to show relevant projects in different tabs/sections
- Pending projects needing attention
- Active projects being worked on
- Completed projects for reference

---

**Date**: October 9, 2025
**Status**: ✅ Implemented

