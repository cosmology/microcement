import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization: only create the client when accessed (server-side only)
// This allows the module to be imported on client-side without errors
// The error will only occur if supabaseAdmin is actually used on the client
let adminClient: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  // Lazy initialization on first access (server-side only)
  if (!adminClient) {
    // Check if we're on the server (Node.js environment)
    // On the client side, process.env variables without NEXT_PUBLIC_ are undefined
    const isServer = typeof window === 'undefined';
    
    if (!isServer) {
      throw new Error(
        'supabaseAdmin can only be used on the server side. ' +
        'Use the regular supabase client from @/lib/supabase for client-side operations.'
      );
    }

    // Server-side: initialize the admin client
    // Only access env vars on server-side where they're available
    const url = process.env.SUPABASE_SERVER_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Support both SUPABASE_SERVICE_ROLE_KEY and SERVICE_ROLE_KEY for backwards compatibility
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

    if (!url || !serviceRole) {
      throw new Error(
        'Missing Supabase environment variables for admin client. ' +
        'Required: SUPABASE_SERVER_URL (or NEXT_PUBLIC_SUPABASE_URL) and ' +
        'SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY)'
      );
    }

    adminClient = createClient(url, serviceRole, {
      auth: {
        persistSession: false
      }
    });
  }

  return adminClient;
}

// Create a Proxy that lazily initializes on first property access
// This prevents any code from executing on module load
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    const value = client[prop as keyof SupabaseClient];
    // If the property is a function, bind it to the client
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

// Re-export types from the types file (safe to import on client-side)
export type { ExportRecord } from './types/exports';
