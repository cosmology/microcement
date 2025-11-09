# API Directory Information

## Overview

The `/api` directory contains a standalone Express.js server that provides an image upload endpoint at `/microcement/api/upload-image`.

## Current Status

**This directory appears to be UNUSED or LEGACY.**

### Evidence:

1. **Not in docker-compose.yml**: The Express server (port 4000) is not configured in `docker-compose.yml`
2. **App uses Next.js API routes instead**: 
   - `/app/api/upload/route.ts` - Next.js API route for image uploads
   - `/app/api/upload-from-ios/route.ts` - Next.js API route for iOS uploads
   - `/app/api/upload-usdz/route.ts` - Next.js API route for USDZ uploads

3. **No references found**: No code references to `microcement/api/upload-image` or port 4000 in the codebase

## What It Contains

- `server.js` - Express server with Multer for file uploads
- `package.json` - Express dependencies
- `Dockerfile` - Docker configuration for the Express server
- Endpoint: `POST /microcement/api/upload-image`
- Port: 4000 (default)
- Max file size: 200kB
- Accepted formats: jpg, jpeg, png, webp, gif

## Recommendation

**Consider removing this directory** if:
- It's not being used
- No external services depend on it
- The Next.js API routes (`/app/api/upload*`) handle all upload needs

If you want to keep it as a fallback or for specific use cases, document when it should be used vs the Next.js routes.

## Current Upload Endpoints

### Next.js API Routes (Active):
- `POST /api/upload` - General image upload
- `POST /api/upload-from-ios` - iOS RoomPlan USDZ/JSON upload
- `POST /api/upload-usdz` - USDZ file upload

### Express Server (Unused):
- `POST /microcement/api/upload-image` - Legacy image upload endpoint

