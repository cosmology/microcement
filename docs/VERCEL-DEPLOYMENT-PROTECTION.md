# Vercel Deployment Protection - Background Conversion

## Problem

When Vercel Deployment Protection is enabled, HTTP calls between serverless functions (e.g., from `/api/upload-from-ios` to `/api/background/convert`) are blocked at the edge level, returning an "Authentication Required" HTML page instead of allowing the request through.

## Solution Options

### Option 1: Disable Deployment Protection for Internal API Routes (Recommended)

1. Go to **Vercel Dashboard** → **Your Project** → **Settings** → **Deployment Protection**
2. Add exception rules for internal API routes:
   - Path: `/api/background/*`
   - Path: `/api/exports`
3. Save changes and redeploy

### Option 2: Use Vercel Protection Bypass Token

1. Get the bypass token from Vercel Dashboard → **Settings** → **Deployment Protection** → **Bypass Token**
2. Add it as an environment variable in Vercel:
   ```
   VERCEL_PROTECTION_BYPASS_TOKEN=your-bypass-token-here
   ```
3. The code will automatically append it to background conversion URLs

### Option 3: Use Vercel Cron Jobs (Best for Production)

Process queued exports periodically using Vercel Cron Jobs:

1. Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/process-exports",
    "schedule": "*/5 * * * *"
  }]
}
```

2. Create `/app/api/cron/process-exports/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  // Verify this is a cron job call
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all queued exports
  const { data: exports, error } = await supabaseAdmin
    .from('exports')
    .select('id')
    .eq('status', 'queued')
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Process each export
  for (const exportItem of exports || []) {
    // Trigger conversion directly (no HTTP call needed)
    // This would call the conversion logic directly
    console.log(`Processing export ${exportItem.id}`);
  }

  return NextResponse.json({ processed: exports?.length || 0 });
}
```

3. Set `CRON_SECRET` environment variable in Vercel

### Option 4: Direct Function Call (No HTTP)

Extract the background conversion logic into a shared function and call it directly:

```typescript
// lib/services/ConvertService.ts
export async function convertExport(exportId: string) {
  // Conversion logic here (extracted from /api/background/convert)
}

// In ExportService.ts
import { convertExport } from '@/lib/services/ConvertService';
await convertExport(exportId); // Direct call, no HTTP
```

## Current Implementation

The current code:
1. ✅ Creates export records successfully (no HTTP call needed)
2. ⚠️ Attempts to trigger background conversion via HTTP (may be blocked)
3. ✅ Handles failures gracefully (export is still created)
4. ✅ Logs helpful error messages with solutions

## Recommended Approach

For production, use **Option 3 (Vercel Cron Jobs)** or **Option 4 (Direct Function Call)**:
- Most reliable (no dependency on HTTP calls)
- Better error handling and retries
- Can process multiple exports in batch
- No issues with Vercel Deployment Protection

## Environment Variables

Add these to Vercel if using bypass tokens:

```
VERCEL_PROTECTION_BYPASS_TOKEN=your-bypass-token
INTERNAL_API_KEY=your-internal-api-key (optional)
CRON_SECRET=your-cron-secret (if using cron jobs)
```

