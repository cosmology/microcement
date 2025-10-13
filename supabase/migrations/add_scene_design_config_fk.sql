-- Add scene_design_config_id foreign key to architect_clients
-- This creates a proper 1:1 relationship between a client relationship and a project config

-- Add the column (nullable at first to handle existing data)
ALTER TABLE public.architect_clients 
ADD COLUMN IF NOT EXISTS scene_design_config_id UUID;

-- Add the foreign key constraint
ALTER TABLE public.architect_clients
ADD CONSTRAINT fk_architect_clients_scene_config
FOREIGN KEY (scene_design_config_id) 
REFERENCES public.scene_design_configs(id)
ON DELETE CASCADE;

-- Optional: Update existing relationships to link them to their configs
-- This matches architect_clients to scene_design_configs by (architect_id, client_id)
UPDATE public.architect_clients ac
SET scene_design_config_id = sdc.id
FROM public.scene_design_configs sdc
WHERE ac.scene_design_config_id IS NULL
  AND ac.architect_id = sdc.architect_id
  AND ac.client_id = sdc.client_id;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_architect_clients_scene_config 
ON public.architect_clients(scene_design_config_id);

-- Add comment explaining the relationship
COMMENT ON COLUMN public.architect_clients.scene_design_config_id IS 
'Links to the specific scene_design_config for this client-architect collaboration';

