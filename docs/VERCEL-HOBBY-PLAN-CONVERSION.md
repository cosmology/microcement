# Vercel Hobby Plan - USDZ to GLB Conversion Solution

## Problem

Vercel Hobby plan has strict limitations:
- **maxDuration**: 10 seconds maximum per serverless function
- **Cron Jobs**: Only 2 cron jobs that run once per day (not suitable for frequent processing)

The original approach of using background promises in serverless functions fails because Vercel kills background promises when the function returns, causing conversions to be interrupted.

## Solution: Awaitable Conversion with Timeout

We've implemented a solution that:
1. Starts conversion immediately when an export is created
2. Awaits conversion completion up to 8 seconds (leaving 2s buffer for Hobby's 10s limit)
3. If conversion completes within timeout, returns success immediately
4. If timeout occurs, returns immediately with "processing" status and conversion continues in background (though it may be killed by Vercel)

### Implementation

**New Function**: `createExportAndAwait()` in `lib/services/ExportService.ts`

- Creates export record first
- Starts conversion immediately
- Uses `Promise.race()` between conversion completion and timeout
- Returns conversion result if completed, otherwise returns "processing" status

**Updated Endpoint**: `app/api/upload-from-ios/route.ts`

- Now uses `createExportAndAwait()` instead of `createExport()`
- Includes conversion status in response
- Client can check `conversion.completed` to know if GLB is ready immediately

### Response Format

```json
{
  "message": "File uploaded successfully and conversion completed",
  "exportId": "uuid",
  "conversion": {
    "completed": true,
    "status": "ready", // or "processing", "failed"
    "glbPath": "supabase://...",
    "glbUrl": "https://...",
    "glbSignedUrl": "https://...",
    "error": null
  },
  "file": { ... },
  "json": { ... }
}
```

### Client Behavior

1. **Conversion completes within timeout** (< 8 seconds):
   - Response includes `conversion.completed: true` and `glbUrl`
   - Client can immediately use the GLB file
   - No polling or Realtime subscription needed

2. **Conversion times out** (> 8 seconds):
   - Response includes `conversion.completed: false` and `status: "processing"`
   - Client should:
     - Poll `/api/scanned-rooms` periodically to check export status, OR
     - Use Supabase Realtime to subscribe to `exports` table updates (already implemented in `hooks/useExportStatus.ts`)

## Alternative Solutions (Not Implemented)

### 1. Supabase Database Webhooks

Supabase supports database webhooks that can trigger HTTP requests when database events occur (INSERT, UPDATE, DELETE).

**Setup**:
1. Go to Supabase Dashboard → Database → Webhooks
2. Create a webhook that triggers on INSERT to `exports` table
3. Set webhook URL to `https://your-vercel-app.vercel.app/api/background/convert`
4. Webhook will call the endpoint when a new export is created

**Pros**:
- Automatic triggering when export is created
- No polling needed
- Works on Vercel Hobby plan

**Cons**:
- Requires Supabase Pro plan (webhooks may be a paid feature)
- Network latency for webhook delivery

### 2. Supabase Realtime + Client-Side Processing

Client-side code could:
1. Create export via API
2. Subscribe to Realtime changes on `exports` table
3. When status changes to "ready", trigger a conversion endpoint

**Pros**:
- Works with existing Realtime setup
- No Vercel limitations

**Cons**:
- Conversion happens on client request (not automatic)
- Client must remain connected

### 3. Third-Party Queue Services

Services like:
- **Upstash QStash** (free tier available)
- **Inngest** (has free tier)
- **RabbitMQ** (self-hosted)
- **AWS SQS** (pay-as-you-go)

**Pros**:
- True message queue pattern
- Reliable delivery
- Works on Vercel Hobby plan

**Cons**:
- Additional dependency
- May require paid plan for production usage
- Setup complexity

### 4. Supabase Edge Functions

Supabase Edge Functions run on Supabase infrastructure and can process conversions.

**Pros**:
- No Vercel limitations
- Can run longer than 10 seconds

**Cons**:
- Requires Supabase Pro plan
- Different deployment model

## Current Limitations

1. **Conversions taking > 8 seconds**: Will timeout and may be killed by Vercel when function returns
2. **Fallback needed**: For longer conversions, use one of:
   - Manual trigger: `GET /api/background/convert` (processes one queued export)
   - Client-side polling: Poll `/api/scanned-rooms` every few seconds
   - Supabase Realtime: Subscribe to `exports` table updates (already implemented)

## Future Improvements

1. **Upgrade to Vercel Pro Plan**: 
   - Allows `maxDuration` up to 5 minutes
   - Enables cron jobs that run every 5 minutes
   - Can use the GET `/api/background/convert` endpoint with cron

2. **Optimize Conversion Performance**:
   - Optimize USDZ to GLB conversion to complete faster
   - Cache converted GLBs for repeated scenes
   - Use streaming for large files

3. **Implement True Queue System**:
   - Add Upstash QStash or similar service
   - Queue conversions reliably
   - Process with dedicated worker

## Testing

To test the conversion:
1. Upload a USDZ file from iOS app
2. Check response for `conversion.completed` and `conversion.status`
3. If `completed: false`, poll `/api/scanned-rooms` or use Realtime subscription
4. Verify GLB file is created in Supabase Storage (`processed-glb` bucket)

## Monitoring

Check Vercel logs for:
- `🚀 [ExportService] Starting conversion with timeout` - Conversion started
- `✅ [ExportService] Conversion completed within timeout` - Conversion succeeded
- `⏱️ [ExportService] Conversion timeout` - Conversion took too long
- `❌ [ExportService] Conversion failed` - Conversion encountered error

