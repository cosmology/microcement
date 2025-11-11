# Complete Storyboard Button Fix Guide

## Problem
You see "Back to Web App" button and another button that's not visible. You need both "Save Locally" and "Export to Web" buttons to be visible.

## Solution: Update Storyboard Step by Step

### Step 1: Open Xcode and Main.storyboard
1. Open Xcode
2. Navigate to `Main.storyboard`
3. Find the `RoomCaptureViewController` scene

### Step 2: Locate Current Buttons
1. Look for the "Back to Web App" button (red button)
2. Look for the hidden button below it
3. These need to be replaced with two new buttons

### Step 3: Delete Old Buttons (Optional)
1. Select the hidden button below "Back to Web App"
2. Delete it (Backspace key)
3. Keep the "Back to Web App" button for now

### Step 4: Add "Save Locally" Button
1. **Drag a new UIButton** from Object Library
2. **Position it below the "Back to Web App" button**
3. **Set properties:**
   - Title: "Save Locally"
   - Style: `filled`
   - Corner Style: `capsule`
   - Tint Color: `systemGreen`

### Step 5: Add "Export to Web" Button
1. **Drag another new UIButton** from Object Library
2. **Position it below the "Save Locally" button**
3. **Set properties:**
   - Title: "Export to Web"
   - Style: `filled`
   - Corner Style: `capsule`
   - Tint Color: `systemBlue`

### Step 6: Connect Outlets and Actions

#### For "Save Locally" button:
1. **Control-drag** from "Save Locally" button to `RoomCaptureViewController`
2. Select `exportButton` outlet
3. **Control-drag again** from "Save Locally" button to `RoomCaptureViewController`
4. Select `exportResults:` action

#### For "Export to Web" button:
1. **Control-drag** from "Export to Web" button to `RoomCaptureViewController`
2. Select `exportToWebButton` outlet
3. **Control-drag again** from "Export to Web" button to `RoomCaptureViewController`
4. Select `exportToWeb:` action

### Step 7: Set Constraints
1. Select both new buttons
2. Add constraints to position them properly:
   - Center horizontally
   - Space them vertically
   - Make sure they're below the "Back to Web App" button

### Step 8: Test the Layout
1. Build and run the app
2. Scan a room
3. You should see:
   - "Back to Web App" button (red, at top)
   - "Save Locally" button (green, in middle)
   - "Export to Web" button (blue, at bottom)

## Alternative: Quick Fix
If you're having trouble with the above steps:

1. **Delete all buttons** except "Back to Web App"
2. **Add two new buttons** with the properties above
3. **Connect them** as described
4. **Set constraints** to stack them vertically

## What Should Happen
- **"Save Locally"** → Downloads USDZ file to your iPad (shows share sheet)
- **"Export to Web"** → Uploads USDZ to web app and triggers GLB conversion pipeline

The Swift code is ready - you just need to update the storyboard!
