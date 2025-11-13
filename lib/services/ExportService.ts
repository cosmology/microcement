import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface CreateExportParams {
  sceneId: string;
  usdzPath: string;
  userId?: string | null;
  jsonPath?: string | null;
}

export interface CreateExportResult {
  id: string;
  status: string;
}

/**
 * Creates an export record in the database and triggers background conversion.
 * This is a shared service function to avoid HTTP calls that may be blocked
 * by Vercel Deployment Protection.
 */
export async function createExport(params: CreateExportParams): Promise<CreateExportResult> {
  const { sceneId, usdzPath, userId, jsonPath } = params;

  if (!sceneId || !usdzPath) {
    throw new Error('sceneId and usdzPath are required');
  }

  // Validate UUID format if userId is provided
  if (userId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new Error('Invalid user ID format. Must be a valid UUID.');
    }
  }

  // Insert metadata row
  const { data, error } = await supabaseAdmin
    .from('exports')
    .insert({
      user_id: userId || null,
      scene_id: sceneId,
      usdz_path: usdzPath,
      json_path: jsonPath || null,
      status: 'queued'
    })
    .select()
    .single();

  if (error) {
    console.error('Database error creating export:', error);
    throw new Error(`Failed to create export: ${error.message}`);
  }

  // Trigger background conversion asynchronously
  // Use internal URL or environment variable to bypass Vercel auth if needed
  triggerBackgroundConversion(data.id).catch((e) => {
    console.error('Background conversion trigger failed:', e);
  });

  return {
    id: data.id,
    status: data.status
  };
}

/**
 * Triggers background conversion for an export.
 * 
 * NOTE: On Vercel with Deployment Protection enabled, HTTP calls between
 * serverless functions may be blocked at the edge level. See
 * docs/VERCEL-DEPLOYMENT-PROTECTION.md for solutions.
 */
async function triggerBackgroundConversion(exportId: string): Promise<void> {
  const baseUrlEnv = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  const baseUrl = baseUrlEnv.startsWith('http') ? baseUrlEnv : `https://${baseUrlEnv}`;
  
  // Build URL with potential bypass token for Vercel Deployment Protection
  let bgUrl = `${baseUrl.replace(/\/+$/, '')}/api/background/convert`;
  if (process.env.VERCEL_PROTECTION_BYPASS_TOKEN) {
    bgUrl += `?x-vercel-protection-bypass=${process.env.VERCEL_PROTECTION_BYPASS_TOKEN}`;
  }

  try {
    // Add service role header for internal authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add service role key for internal service authentication
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      headers['x-service-role'] = serviceRoleKey;
    }

    // Add internal API key if available
    if (process.env.INTERNAL_API_KEY) {
      headers['x-internal-api-key'] = process.env.INTERNAL_API_KEY;
    }

    const response = await fetch(bgUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ exportId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Check if this is an HTML response (Vercel Deployment Protection page)
      const isHtmlError = errorText.trim().startsWith('<!') || errorText.includes('Authentication Required');
      
      if (isHtmlError || response.status === 401 || response.status === 403 || response.status === 451) {
        console.warn(`⚠️ Background conversion endpoint blocked by Vercel Deployment Protection. Export ${exportId} is queued.`);
        console.warn(`💡 Solutions:`);
        console.warn(`   1. Disable Deployment Protection for /api/background/* routes in Vercel Settings`);
        console.warn(`   2. Set VERCEL_PROTECTION_BYPASS_TOKEN environment variable with a bypass token`);
        console.warn(`   3. Use Vercel Cron Jobs to process queued exports (see docs/VERCEL-DEPLOYMENT.md)`);
        console.warn(`   4. Export ${exportId} can be processed manually via POST /api/background/convert`);
        return;
      }
      throw new Error(`Background conversion failed: ${response.status} ${errorText.substring(0, 200)}`);
    }

    console.log(`✅ Background conversion triggered successfully for export ${exportId}`);
  } catch (error) {
    // Log but don't throw - export is still created and can be processed later
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isNetworkError = errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED');
    
    if (isNetworkError && process.env.VERCEL) {
      console.warn(`⚠️ Network error triggering background conversion (likely Vercel Deployment Protection). Export ${exportId} is queued.`);
      console.warn(`💡 Configure Vercel Deployment Protection or use cron jobs to process exports.`);
    } else {
      console.error(`❌ Failed to trigger background conversion for export ${exportId}:`, errorMessage);
    }
    console.log(`💡 Export ${exportId} is queued. It can be processed via cron job, manual retry, or by disabling Deployment Protection.`);
  }
}

