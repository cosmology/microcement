# iOS App Update Guide: Adding Export to Web Functionality

## Overview
This guide explains how to update your iOS Room Plan Scanner app to include both "Save Locally" and "Export to Web" functionality.

## Changes Required

### 1. Update RoomCaptureViewController.swift
Replace the existing `RoomCaptureViewController.swift` with the updated version that includes:
- Renamed "Export" button to "Save Locally" 
- New "Export to Web" button functionality
- Direct upload to your web app's API endpoint

### 2. Update Main.storyboard

#### Add Second Export Button:
1. Open `Main.storyboard` in Xcode
2. Find the existing export button
3. Add a new `UIButton` next to it with these properties:
   - **Title**: "Export to Web"
   - **Style**: `filled`
   - **Corner Style**: `capsule`
   - **Tint Color**: `systemBlue`
   - **Initially Hidden**: `YES`

#### Connect Outlets and Actions:
1. **Connect the new button outlet**:
   - Control-drag from the new button to `RoomCaptureViewController`
   - Name it `exportToWebButton`

2. **Connect the action**:
   - Control-drag from the new button to `RoomCaptureViewController`
   - Select `exportToWeb:` action

3. **Update existing export button**:
   - Change the action connection from `exportResults:` to `saveLocally:`
   - Update the button title to "Save Locally"

#### Layout Constraints:
- Position the "Export to Web" button next to the "Save Locally" button
- Ensure both buttons are visible when scanning is complete
- Update constraints so both buttons fit properly

### 3. Update Button Visibility Logic
The updated code includes logic to show/hide both buttons based on scanning state:
- Both buttons are hidden during scanning
- Both buttons become visible when scanning is complete
- "Export to Web" button shows "Exporting..." during upload

## API Endpoint
The iOS app will upload to: `http://192.168.1.9:3000/api/upload-from-ios`

This endpoint:
- Accepts multipart form data with USDZ file
- Saves the file to your web app's file system
- Returns success/failure response
- Triggers the USDZ → GLB conversion pipeline

## User Flow
1. **Scan Room** → User scans room using Room Plan Scanner
2. **Choose Export Option**:
   - **"Save Locally"** → Downloads USDZ to iPad (original functionality)
   - **"Export to Web"** → Uploads USDZ to web app and triggers cloud conversion
3. **Web App Processing** → Automatic USDZ → GLB conversion in background
4. **Automatic Loading** → After conversion, iOS redirects to web app with URL parameters
5. **Zustand Store Integration** → Web app automatically loads model into SceneEditor via Zustand store (no intermediate viewer)

## Architecture Changes

### Removed Components
- ❌ **IOSExportViewer** component - No longer needed
- ❌ **`/app/[locale]/ios-export/page.tsx`** route - Removed

### Current Flow
1. iOS app uploads USDZ → `/api/upload-from-ios`
2. Backend triggers conversion → `/api/exports` (POST)
3. iOS redirects to web app → `/?exportId=xxx&userId=xxx`
4. **HomeClient** reads URL params → Fetches export data → Sets Zustand store
5. **SceneEditor** watches store → Automatically loads model when `modelPath` changes

### API Endpoints
- **POST `/api/upload-from-ios`** - Receives USDZ/JSON from iOS
- **POST `/api/exports`** - Creates export job (triggered by upload endpoint)
- **GET `/api/exports/[id]`** - Gets export status by ID
- **POST `/api/background/convert`** - Background conversion worker

All endpoints are RESTful and follow consistent naming conventions.

## Testing
1. Build and install the updated iOS app on your iPad
2. Test scanning a room
3. Try both "Save Locally" and "Export to Web" buttons
4. Verify that "Export to Web" successfully uploads to your web app
5. Check that the conversion pipeline triggers automatically

## Notes
- The "Export to Web" functionality requires network connectivity
- User ID is automatically generated for iOS users
- Scene ID is timestamp-based for uniqueness
- Error handling includes user-friendly alerts
- Success upload shows confirmation and option to return to web app
