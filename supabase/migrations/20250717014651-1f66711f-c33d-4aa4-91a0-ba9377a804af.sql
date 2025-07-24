-- Create user roles and permissions system for Shadow Agent access
CREATE TYPE public.user_role AS ENUM ('admin', 'shadow_agent', 'standard');

CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'standard',
  shadow_agent_access BOOLEAN NOT NULL DEFAULT false,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Admin can see all permissions
CREATE POLICY "Admins can view all permissions" ON public.user_permissions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = auth.uid() AND up.role = 'admin'
  )
);

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions" ON public.user_permissions
FOR SELECT USING (user_id = auth.uid());

-- Only admins can insert/update permissions
CREATE POLICY "Admins can manage permissions" ON public.user_permissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = auth.uid() AND up.role = 'admin'
  )
);

-- Grant yourself admin and shadow agent access
INSERT INTO public.user_permissions (user_id, role, shadow_agent_access, granted_by)
VALUES (
  '6aa5b0b5-1162-4727-9911-78efa7a5f00a', -- Your user ID from the auth logs
  'admin',
  true,
  '6aa5b0b5-1162-4727-9911-78efa7a5f00a'
);

-- Create function to check shadow agent access
CREATE OR REPLACE FUNCTION public.has_shadow_agent_access(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT shadow_agent_access 
     FROM public.user_permissions 
     WHERE user_permissions.user_id = $1 
     AND (expires_at IS NULL OR expires_at > now())),
    false
  );
$$;