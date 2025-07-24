-- Fix RLS policies for api_usage and cost_limits tables

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own api usage" ON public.api_usage;
DROP POLICY IF EXISTS "Users can view their own api usage" ON public.api_usage;
DROP POLICY IF EXISTS "Users can insert their own cost limits" ON public.cost_limits;
DROP POLICY IF EXISTS "Users can view their own cost limits" ON public.cost_limits;

-- Create proper RLS policies for api_usage table
CREATE POLICY "Users can insert their own api usage" 
ON public.api_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own api usage" 
ON public.api_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own api usage" 
ON public.api_usage 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create proper RLS policies for cost_limits table
CREATE POLICY "Users can insert their own cost limits" 
ON public.cost_limits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own cost limits" 
ON public.cost_limits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own cost limits" 
ON public.cost_limits 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create a function to get the current user ID safely
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
$$;