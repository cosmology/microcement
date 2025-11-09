-- Fix storage RLS to allow service_role to bypass all policies
-- This ensures API routes with SERVICE_ROLE_KEY can upload files

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Service role can upload" ON storage.objects;
DROP POLICY IF EXISTS "Service role bypass" ON storage.objects;

-- Create permissive policy for service_role
CREATE POLICY "Service role bypass all RLS"
ON storage.objects
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure authenticated users can still access their own uploads
-- (This policy should already exist from 0005-storage.yaml, but recreate to be safe)
DROP POLICY IF EXISTS "objects_select_own_or_architect" ON storage.objects;

CREATE POLICY "Users can select own or architect uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'app-uploads' AND (
    split_part(name, '/', 1) = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.architect_clients ac
      WHERE ac.architect_id = auth.uid()
        AND ac.client_id::text = split_part(storage.objects.name, '/', 1)
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'admin'
    )
  )
);

-- Ensure bucket exists and is private
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-uploads', 'app-uploads', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Log success
SELECT 'Storage RLS fixed: service_role can now bypass all policies' AS status;

