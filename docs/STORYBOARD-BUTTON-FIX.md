# Fix Storyboard Buttons - Step by Step Guide

## Problem
You see the rotating 3D object but no "Save Locally" and "Export to Web" buttons because they're not connected in the storyboard.

## Solution: Update Main.storyboard

### Step 1: Open Storyboard
1. In Xcode, open `Main.storyboard`
2. Find the `RoomCaptureViewController` scene

### Step 2: Locate the Export Button
1. Look for the existing export button (it should be visible in the storyboard)
2. This button is currently connected to the original `exportResults:` action

### Step 3: Add Second Button
1. **Drag a new UIButton** from the Object Library onto the storyboard
2. Position it next to the existing export button
3. Set the button properties:
   - **Title**: "Export to Web"
   - **Style**: `filled`
   - **Corner Style**: `capsule`
   - **Tint Color**: `systemBlue`

### Step 4: Connect Outlets and Actions

#### A. Connect the new "Export to Web" button:
1. **Control-drag** from "Export to Web" button to `RoomCaptureViewController` (the yellow circle icon)
2. In the popup, select `exportToWebButton` outlet
3. **Control-drag again** from "Export to Web" button to `RoomCaptureViewController`
4. In the popup, select `exportToWeb:` action

#### B. Update the existing export button:
1. **Control-drag** from the existing export button to `RoomCaptureViewController`
2. In the popup, select `saveLocally:` action (this will replace the old `exportResults:` action)

### Step 5: Update Button Titles
1. Select the existing export button
2. In the Attributes Inspector, change the title to "Save Locally"
3. The "Export to Web" button should already have the correct title

### Step 6: Layout Constraints
1. Select both buttons
2. Add constraints to position them side by side
3. Make sure they're both visible when scanning is complete

### Step 7: Build and Test
1. Build the project (Cmd+B)
2. Run on your iPad (Cmd+R)
3. Scan a room
4. You should now see both buttons:
   - "Save Locally"
   - "Export to Web"

## Verification Checklist
- [ ] Both buttons are visible in the storyboard
- [ ] "Export to Web" button is connected to `exportToWebButton` outlet
- [ ] "Export to Web" button is connected to `exportToWeb:` action
- [ ] Existing button is connected to `saveLocally:` action
- [ ] Button titles are correct ("Save Locally" and "Export to Web")
- [ ] Buttons are positioned side by side
- [ ] Constraints are properly set

## Troubleshooting
- If buttons don't appear, check the outlet connections
- If actions don't work, verify the action connections
- If layout is broken, check the constraints
- If you see only one button, make sure both are added to the storyboard
