# iOS Storyboard Update Steps

## Current Issue
Your iOS app only shows one "Export" button. We need to add a second "Export to Web" button.

## Steps to Update Storyboard

### 1. Open Xcode Project
```bash
open /Users/ivanprokic/workspace/xcode/room-plan-demo/RoomPlanExampleApp.xcodeproj
```

### 2. Update Main.storyboard

#### A. Find the Export Button
1. Open `Main.storyboard` in Xcode
2. Find the existing export button (it should be connected to `exportResults:` action)
3. Change its title from "Export" to "Save Locally"

#### B. Add New Export to Web Button
1. Drag a new `UIButton` from the Object Library
2. Position it next to the "Save Locally" button
3. Set these properties:
   - **Title**: "Export to Web"
   - **Style**: `filled`
   - **Corner Style**: `capsule`
   - **Tint Color**: `systemBlue`
   - **Initially Hidden**: `YES`

#### C. Connect Outlets and Actions
1. **Connect the new button outlet**:
   - Control-drag from "Export to Web" button to `RoomCaptureViewController`
   - Name it `exportToWebButton`

2. **Connect the action**:
   - Control-drag from "Export to Web" button to `RoomCaptureViewController`
   - Select `exportToWeb:` action

3. **Update existing export button action**:
   - Control-drag from "Save Locally" button to `RoomCaptureViewController`
   - Change action from `exportResults:` to `saveLocally:`

#### D. Update Layout Constraints
1. Select both buttons
2. Add constraints to position them side by side
3. Ensure both buttons are visible when scanning is complete

### 3. Build and Run
1. Select your iPad as the target device
2. Build the project (Cmd+B)
3. Run on your iPad (Cmd+R)

## Alternative: Quick Storyboard Update

If you want to quickly test, you can:
1. Duplicate the existing export button
2. Change the title to "Export to Web"
3. Connect it to the new `exportToWeb:` action
4. Position them side by side

## Verification
After building and installing:
1. Open the app on your iPad
2. Scan a room
3. You should see TWO buttons:
   - "Save Locally" (original functionality)
   - "Export to Web" (new functionality)

## Troubleshooting
- If buttons don't appear, check the outlet connections
- If actions don't work, verify the action connections
- If layout is broken, check the constraints
