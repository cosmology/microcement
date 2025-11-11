# Business Model & Project Workflow

## Overview
ProCemento is a 3D-powered microcement visualization platform connecting end-users (homeowners/businesses) with architects for collaborative design work.

---

## ⚡ Key Principle: Client Authority

**The CLIENT (end user) has final decision power:**
- ✅ CLIENT selects the architect
- ✅ CLIENT approves or rejects the architect's design
- ✅ CLIENT can request unlimited revisions
- ✅ CLIENT decides when design is acceptable (active status)

**The ARCHITECT is the service provider:**
- Creates the 3D walkthrough based on client brief
- Submits designs for client review
- Makes revisions based on client feedback
- Does NOT "accept/reject" the client or project
- Continues revising until client is satisfied

**Think of it like hiring a designer:**
- You (client) hire them
- They create designs for you
- You review and approve/reject their work
- They revise until you're happy
- You have the final say

---

## User Roles

### 1. **End User** (Client/Homeowner)
- Submits project briefs with 3D models
- Reviews architect's designs
- Approves final walkthrough
- **Primary Action**: Submit Brief → Review → Approve

### 2. **Architect**
- Reviews incoming project briefs
- Creates custom camera paths and walkthrough experiences
- Sends designs for client review
- **Primary Action**: Accept → Design → Submit for Review

### 3. **Admin**
- Manages all users and projects
- System-level controls
- Analytics and oversight

---

## Project Lifecycle (Status Flow)

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT ACTIONS                        │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 1. PENDING_UPLOAD           │
│                             │
│ Client fills brief form:    │
│  ✓ Project name             │
│  ✓ Description              │
│  ✓ Area type (visual icons) │
│  ✓ Square footage           │
│  ✓ Select architect         │
│  ✓ Upload 3D model          │
└────────┬────────────────────┘
         │ [Submit Brief]
         ▼
┌─────────────────────────────┐
│ 2. PENDING_ARCHITECT        │
│                             │
│ System Actions:             │
│  • Creates scene_config     │
│  • Assigns architect        │
│  • Sends notification       │
│                             │
│ Architect receives:         │
│  - Project brief            │
│  - 3D model                 │
│  - Client requirements      │
└────────┬────────────────────┘
         │
         │ [Architect: "Start Project"]
         ▼
┌─────────────────────────────┐
│ 3. IN_PROGRESS         ◄────┼─── [Client: "Request Revisions"]
│                             │
│ Architect Actions:          │
│  • Edit camera paths        │
│  • Set lookAt targets       │
│  • Configure hotspots       │
│  • Design 3D walkthrough    │
│  • Auto-save all changes    │
└────────┬────────────────────┘
         │
         │ [Architect: "Send for Review"]
         ▼
┌─────────────────────────────┐
│ 4. PENDING_REVIEW           │
│                             │
│ Client reviews design:      │
│  • View 3D walkthrough      │
│  • Test camera paths        │
│  • Check all areas          │
│                             │
│ Client Decision:            │
│  [Approve Design]           │
│  [Request Revisions] ───────┤ ← Back to IN_PROGRESS
│                             │    with feedback notes
└────────┬────────────────────┘
         │
         │ [Client: "Approve Design"]
         ▼
┌─────────────────────────────┐
│ 5. ACTIVE                   │
│                             │
│ Design approved:            │
│  • Client satisfied         │
│  • Implementation begins    │
│  • Both parties have access │
│  • Can be marked completed  │
└────────┬────────────────────┘
         │
         ├───────────────┬─────────────────┐
         │               │                 │
         ▼               ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────┐
│  COMPLETED   │  │   ON_HOLD    │  │ CANCELLED│
│              │  │              │  │          │
│ Project done │  │ Temp. paused │  │ Stopped  │
└──────────────┘  └──────────────┘  └──────────┘
```

---

## Detailed Workflow Steps

### 1. **PENDING_UPLOAD** → Client Submits Brief
**Client Action:**
- Opens "Submit Brief" form
- Fills all required fields
- Clicks "Upload" button

**System Action:**
- Creates `architect_clients` record
- Creates `scene_design_configs` with model path
- Creates `scene_follow_paths` with defaults
- Creates `user_assets` record
- Changes status to `pending_architect`
- Sends email to architect

**Next Status:** `pending_architect`

---

### 2. **PENDING_ARCHITECT** → Architect Reviews & Starts
**Architect Action:**
- Reviews project brief in "Client Models" panel
- Sees: Project name, description, area type, square footage, 3D model preview
- Clicks **"Start Project"** button

**System Action:**
- Changes status to `in_progress`
- Sends notification to client: "Your architect has started working"

**Next Status:** `in_progress`

**Edge Case:** If architect cannot take project:
- Contacts admin
- Admin reassigns to different architect
- Status remains `pending_architect`

---

### 3. **IN_PROGRESS** → Architect Designs
**Architect Action:**
- Opens 3D editor (Camera Controls menu visible)
- Creates custom camera paths
- Sets lookAt targets
- Configures height points
- Designs complete 3D walkthrough
- When satisfied, clicks **"Send for Review"** button

**System Action:**
- Auto-saves all changes to database
- Changes status to `pending_review`
- Sends notification to client: "Your design is ready for review!"

**Next Status:** `pending_review`

---

### 4. **PENDING_REVIEW** → Client Reviews & Decides
**CLIENT Action (Two Options):**

**Option A: Approve Design**
- Reviews 3D walkthrough
- Satisfied with design
- Clicks **"Approve Design"** button
- Status changes to `active` ✅

**Option B: Request Revisions**
- Reviews 3D walkthrough
- Not satisfied or wants changes
- Clicks **"Request Revisions"** button
- Modal appears: "What would you like changed?"
- Client enters feedback notes
- Clicks "Submit Feedback"
- Status changes back to `in_progress` 🔄
- Architect receives notification with feedback

**System Action (Option A - Approve):**
- Changes status to `active`
- Sends notification to architect: "Client approved your design! 🎉"
- Sends notification to client: "Your design is now active"

**System Action (Option B - Request Revisions):**
- Changes status back to `in_progress`
- Stores feedback in `notes` or new `project_revisions` table
- Sends notification to architect with client feedback
- Increments revision counter

**Next Status:** 
- `active` (if approved) ✅
- `in_progress` (if revisions requested) 🔄

---

### 5. **ACTIVE** → Design Approved & Live
**Both Parties Can:**
- View the 3D walkthrough
- Download materials/assets
- Mark project as `completed` when implementation finishes

**System Features:**
- Read-only for client (no more revisions)
- Architect can still make minor tweaks
- Both can export/share the design

**Next Status:** `completed` or `on_hold`

---

### 6. **COMPLETED** → Project Finished
- Implementation done
- Archive but keep accessible
- Generate final report
- Request testimonial/review

---

### 7. **ON_HOLD** → Temporarily Paused
- Budget constraints
- Schedule delays
- Client request
- Can resume to `in_progress` or `active`

---

### 8. **CANCELLED** → Project Terminated
- Client cancels before completion
- Architect unable to continue
- Archive with reason

---

## Revision Loop (Detailed)

```
IN_PROGRESS
     │
     │ [Architect: "Send for Review"]
     ▼
PENDING_REVIEW
     │
     ├─────────────────┬─────────────────┐
     │                 │                 │
[Approve Design]  [Request Revisions]  [Cancel]
     │                 │                 │
     ▼                 ▼                 ▼
  ACTIVE          IN_PROGRESS      CANCELLED
                       │
                       │ (Revision #2)
                       │
                       ▼
                  PENDING_REVIEW
                       │
                       ├──────────┬──────────┐
                       │          │          │
                  [Approve]  [Revisions] [Cancel]
                       │          │          │
                       ▼          ▼          ▼
                    ACTIVE   IN_PROGRESS  CANCELLED
                              (continues until approved)
```

**Revision Tracking:**
- Each revision cycle is logged
- Client feedback is stored
- Unlimited revisions until client approval
- Average: 1-3 revision cycles
- Premium tier: Guaranteed 24hr revision turnaround

---

## Data Capture & Storage

### Project Brief Submission (Form)
**Input Fields:**
1. **Project Name** * (required)
   - Example: "Kitchen Remodel 2025"
   - Stored in: `architect_clients.project_name` & `scene_design_configs.project_name`

2. **Project Description** * (required)
   - Example: "Modern minimalist kitchen with microcement floors and walls. Focus on durability and easy maintenance."
   - Stored in: `architect_clients.project_description` & `scene_design_configs.project_description`

3. **Area Type** * (required, visual icon selection)
   - Options: Kitchen, Bathroom, Living Room, Bedroom, Outdoor, Commercial, Floor
   - Icons: ChefHat, Droplet, Sofa, Bed, Tree, Building2, Square
   - Stored in: `scene_design_configs.showcase_areas` as jsonb array

4. **Square Footage** * (required, numeric)
   - Example: 500
   - Stored in: `scene_design_configs.notes` as "Square Footage: 500 sq ft"
   - Note: Future migration should add dedicated `square_footage` column

5. **Select Architect** * (required, dropdown)
   - Lists all architects with `user_role = 'architect'`
   - Stored in: `architect_clients.architect_id`

6. **3D Model File** * (required, file upload)
   - Formats: .glb, .gltf, .png, .jpg, .webp
   - Max size: 50MB
   - Stored in: `/public/uploads/{ownerId}/{uuid}-{filename}`
   - Path stored in: `scene_design_configs.model_path`

### Database Tables Updated on Submission

**1. `architect_clients`**
```sql
INSERT/UPDATE architect_clients:
- status: 'pending_architect'
- architect_id: {selected_architect_id}
- client_id: {user_id}
- project_name: {form_input}
- project_description: {form_input}
- start_date: {current_date}
```

**2. `scene_design_configs`**
```sql
INSERT scene_design_configs:
- user_id: {client_id}
- architect_id: {selected_architect_id}
- client_id: {client_id}
- model_path: {public_url}
- config_name: {slugified_project_name}
- project_name: {form_input}
- project_description: {form_input}
- showcase_areas: [{area_type_id}]
- notes: 'Square Footage: {footage} sq ft'
- is_default: true
```

**3. `scene_follow_paths`**
```sql
INSERT scene_follow_paths:
- scene_design_config_id: {created_config_id}
- path_name: 'Default Path'
- camera_points: {DEFAULT_CAMERA_POINTS}
- look_at_targets: {DEFAULT_LOOK_AT_TARGETS}
- is_active: true
```

**4. `user_assets`**
```sql
INSERT user_assets:
- owner_id: {client_id}
- scene_config_id: {created_config_id}
- object_path: {public_url}
- bucket: 'public'
- project_name: {form_input}
- architect_id: {selected_architect_id}
- content_type: {file.type}
- file_size: {file.size}
```

---

## Revenue Model Considerations

### Potential Monetization Strategies

**1. Per-Project Fee**
- Charge clients for each project submission
- Architect receives percentage (70-80%)
- Platform takes commission (20-30%)

**2. Subscription Tiers**

**End Users:**
- **Free**: 1 active project
- **Basic** ($29/mo): 3 active projects
- **Pro** ($99/mo): Unlimited projects

**Architects:**
- **Starter** ($99/mo): Up to 10 clients
- **Professional** ($299/mo): Up to 50 clients  
- **Studio** ($699/mo): Unlimited clients + team features

**3. Value-Added Services**
- Premium 3D rendering: $50-200/project
- Rush delivery (24hr turnaround): $100-300
- Revision packages: $50/revision
- Marketing materials export: $75

**4. Lead Generation**
- Architects pay for qualified leads
- $25-75 per matched client
- Success fee on project completion

---

## Key Actions & Decision Points

### Who Decides What?

**CLIENT (End User) Decisions:**
- ✅ Selects which architect to work with
- ✅ **APPROVES or REJECTS architect's design** (pending_review → active or back to in_progress)
- ✅ Can request unlimited revisions until satisfied
- ✅ Final say on whether design is acceptable

**ARCHITECT Decisions:**
- ✅ Decides when to start working (pending_architect → in_progress)
- ✅ Decides when design is complete (in_progress → pending_review)
- ✅ Can place project on_hold if needed
- ✅ Can contact admin if unable to take project (for reassignment)

**Important**: The architect does NOT "accept/reject" the client's project. Once assigned, they either:
1. Start working immediately (most common)
2. Contact admin if they cannot take the project (rare)

The CLIENT is the one who accepts/rejects the ARCHITECT'S WORK during the review phase.

---

## Status-Based Notifications

### `pending_architect`
- **To Architect**: "🔔 New project brief received from {client_name}"
  - Brief includes: area type, square footage, description, 3D model
  - Action: Click "Start Project" to begin
- **To Client**: "✅ Your brief has been sent to {architect_name}"

### `in_progress`
- **To Client**: "🚀 {Architect_name} has started working on your design"
- **To Architect**: "Remember to save your work regularly"

### `pending_review`
- **To Client**: "🎉 Your design is ready for review!"
  - Action buttons: "Approve Design" or "Request Revisions"
  - **Deadline**: 7 days to respond
- **To Architect**: "⏳ Waiting for {client_name} to review your design"

### `active` (After CLIENT approval)
- **To Client**: "✨ Your design has been approved and is now active!"
- **To Architect**: "💰 {Client_name} approved your design. Project is now active."

### `in_progress` (After CLIENT requests revisions)
- **To Architect**: "📝 {Client_name} requested revisions: {feedback_notes}"
- **To Client**: "Your revision request has been sent to {architect_name}"

### `on_hold` / `completed` / `cancelled`
- Status update emails to both parties

---

## Future Enhancements

### Database Schema Additions
```sql
-- Add dedicated columns for square footage and area type
ALTER TABLE scene_design_configs 
  ADD COLUMN area_type_id INTEGER REFERENCES area_types(id),
  ADD COLUMN square_footage DECIMAL(10, 2);

-- Add budget and timeline to architect_clients
ALTER TABLE architect_clients
  ADD COLUMN estimated_budget DECIMAL(12, 2),
  ADD COLUMN estimated_timeline_days INTEGER;

-- Track revisions
CREATE TABLE project_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES architect_clients(id),
  revision_number INTEGER,
  scene_config_id UUID REFERENCES scene_design_configs(id),
  notes TEXT,
  created_by UUID REFERENCES user_profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track status change history
CREATE TABLE project_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES architect_clients(id),
  previous_status public.project_status,
  new_status public.project_status,
  changed_by UUID REFERENCES user_profiles(user_id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Feature Roadmap
- [ ] Real-time collaboration (WebSocket)
- [ ] Comment threads on specific camera frames
- [ ] Revision comparison (side-by-side)
- [ ] Client feedback annotations on 3D walkthrough
- [ ] Automated cost estimation based on area type + square footage
- [ ] Material library integration
- [ ] Export to presentation format (video, PDF)
- [ ] Mobile AR preview (Apple ARKit / Android ARCore)
- [ ] Payment processing integration
- [ ] Analytics dashboard for architects

---

**Last Updated**: October 9, 2025

