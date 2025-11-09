# Step-by-Step Storyboard Fix Guide

## Current Situation
You have:
- ✅ "Back to Web App" button (red, visible)
- ❌ "Export Button" (exists in outline but not visible)
- ❌ Missing "Export to Web" button

## Solution: Update Storyboard

### Step 1: Select the Hidden Export Button
1. In Xcode, open `Main.storyboard`
2. In the left panel (outline), find `RoomCaptureViewController Scene`
3. Expand it and find `Export Button`
4. Click on `Export Button` to select it
5. The button should now be highlighted in the storyboard canvas

### Step 2: Make the Export Button Visible
1. With `Export Button` selected, look at the **Attributes Inspector** (right panel)
2. Check if `Hidden` is checked - if so, **uncheck it**
3. Change the **Title** to "Save Locally"
4. Set **Style** to `filled`
5. Set **Tint Color** to `systemGreen`

### Step 3: Add the Second Button
1. **Drag a new UIButton** from Object Library (bottom right panel)
2. **Position it below the "Save Locally" button**
3. **Set its properties:**
   - Title: "Export to Web"
   - Style: `filled`
   - Tint Color: `systemBlue`

### Step 4: Connect Outlets and Actions

#### For "Save Locally" button (existing Export Button):
1. **Control-drag** from "Save Locally" button to `RoomCaptureViewController` (yellow circle)
2. Select `exportButton` outlet
3. **Control-drag again** from "Save Locally" button to `RoomCaptureViewController`
4. Select `exportResults:` action

#### For "Export to Web" button (new button):
1. **Control-drag** from "Export to Web" button to `RoomCaptureViewController`
2. Select `exportToWebButton` outlet
3. **Control-drag again** from "Export to Web" button to `RoomCaptureViewController`
4. Select `exportToWeb:` action

### Step 5: Set Constraints
1. **Select both buttons** (Cmd+click to select multiple)
2. **Add constraints:**
   - Center horizontally in container
   - Set vertical spacing between buttons
   - Position below "Back to Web App" button

### Step 6: Test
1. **Build** (Cmd+B)
2. **Run** (Cmd+R) on your iPad
3. **Scan a room**
4. **You should see:**
   - "Back to Web App" (red, at top)
   - "Save Locally" (green, in middle)
   - "Export to Web" (blue, at bottom)

## Troubleshooting
- If buttons still don't appear, check the outlet connections
- If actions don't work, verify the action connections
- If layout is broken, check the constraints
