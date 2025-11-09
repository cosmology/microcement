import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_SERVER_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Support both SUPABASE_SERVICE_ROLE_KEY and SERVICE_ROLE_KEY for backwards compatibility
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY!;

if (!url || !serviceRole) {
  throw new Error('Missing Supabase environment variables for admin client. Required: SUPABASE_SERVER_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY)');
}

export const supabaseAdmin = createClient(url, serviceRole, {
  auth: {
    persistSession: false
  }
});

// Export types for the exports table
export interface ExportRecord {
  id: string;
  user_id: string | null;
  scene_id: string;
  usdz_path: string;
  glb_path: string | null;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  error: string | null;
  created_at: string;
  updated_at: string;
}
