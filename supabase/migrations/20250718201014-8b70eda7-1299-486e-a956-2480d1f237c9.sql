-- Check what policies exist and drop only the ones that need updating
DROP POLICY IF EXISTS "Users can update their own cost limits" ON public.cost_limits;
DROP POLICY IF EXISTS "Users can update their own api usage" ON public.api_usage;

-- Add the missing UPDATE policies
CREATE POLICY "Users can update their own cost limits" 
ON public.cost_limits 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own api usage" 
ON public.api_usage 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create H100 configuration table for future hosting
CREATE TABLE IF NOT EXISTS public.h100_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  h100_endpoint text,
  h100_api_key text,
  preferred_models jsonb DEFAULT '[]'::jsonb,
  fallback_to_cloud boolean DEFAULT true,
  auto_failover boolean DEFAULT true,
  max_retry_attempts integer DEFAULT 3,
  health_check_interval integer DEFAULT 30,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on H100 config table
ALTER TABLE public.h100_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for H100 config
CREATE POLICY "Users can manage their H100 config" 
ON public.h100_config 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Add H100 status tracking to model_pricing
ALTER TABLE public.model_pricing 
ADD COLUMN IF NOT EXISTS h100_available boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS h100_endpoint text,
ADD COLUMN IF NOT EXISTS cloud_fallback boolean DEFAULT true;