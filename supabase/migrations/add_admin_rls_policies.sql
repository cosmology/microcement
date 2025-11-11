-- Add RLS policies to allow admins to access all data

-- First, let's update the scene_configs_read_own policy to include admin role check
DROP POLICY IF EXISTS scene_configs_read_own ON public.scene_design_configs;

CREATE POLICY scene_configs_read_own ON public.scene_design_configs
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR client_id = auth.uid() 
    OR architect_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role = 'admin'
    )
  );

-- Allow admins to update any config
DROP POLICY IF EXISTS scene_configs_update_own ON public.scene_design_configs;

CREATE POLICY scene_configs_update_own ON public.scene_design_configs
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid() 
    OR architect_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role = 'admin'
    )
  );

-- Allow admins to read all user profiles
DROP POLICY IF EXISTS user_profiles_read_related ON public.user_profiles;

CREATE POLICY user_profiles_read_related ON public.user_profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.architect_clients ac
      WHERE (ac.architect_id = auth.uid() AND ac.client_id = public.user_profiles.user_id)
         OR (ac.client_id = auth.uid() AND ac.architect_id = public.user_profiles.user_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role = 'admin'
    )
  );

-- Allow admins to read all architect_clients relationships
DROP POLICY IF EXISTS architect_clients_manage_rel ON public.architect_clients;

CREATE POLICY architect_clients_manage_rel ON public.architect_clients
  FOR ALL TO authenticated
  USING (
    architect_id = auth.uid() 
    OR client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role = 'admin'
    )
  );

-- Allow admins to read all scene_follow_paths
DROP POLICY IF EXISTS scene_follow_paths_read ON public.scene_follow_paths;

CREATE POLICY scene_follow_paths_read ON public.scene_follow_paths
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scene_design_configs sdc
      WHERE sdc.id = public.scene_follow_paths.scene_design_config_id
        AND (
          sdc.user_id = auth.uid() 
          OR sdc.client_id = auth.uid() 
          OR sdc.architect_id = auth.uid()
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role = 'admin'
    )
  );

-- Allow admins to manage all scene_follow_paths
DROP POLICY IF EXISTS scene_follow_paths_manage ON public.scene_follow_paths;

CREATE POLICY scene_follow_paths_manage ON public.scene_follow_paths
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scene_design_configs sdc
      WHERE sdc.id = public.scene_follow_paths.scene_design_config_id
        AND (sdc.user_id = auth.uid() OR sdc.architect_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role = 'admin'
    )
  );

-- Allow admins to read all user_assets
DROP POLICY IF EXISTS user_assets_read_own ON public.user_assets;

CREATE POLICY user_assets_read_own ON public.user_assets
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
      AND up.role = 'admin'
    )
  );

COMMENT ON POLICY scene_configs_read_own ON public.scene_design_configs IS 
'Allows users to read their own configs, configs where they are client/architect, or all configs if admin';

COMMENT ON POLICY user_profiles_read_related ON public.user_profiles IS 
'Allows users to read their own profile, related profiles via architect_clients, or all profiles if admin';

COMMENT ON POLICY architect_clients_manage_rel ON public.architect_clients IS 
'Allows users to manage relationships where they are architect/client, or all relationships if admin';

