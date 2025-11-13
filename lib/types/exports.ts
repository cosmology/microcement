// Export types for the exports table
// Separated from supabaseAdmin.ts to avoid client-side import issues
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
  json_path?: string | null;
}

