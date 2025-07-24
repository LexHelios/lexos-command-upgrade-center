-- Fix infinite recursion in user_permissions RLS policies
-- Drop the problematic admin management policy
DROP POLICY IF EXISTS "Admin management policy" ON public.user_permissions;

-- Create separate, non-recursive policies for different operations
CREATE POLICY "Users can view their own permissions" 
ON public.user_permissions 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own permissions" 
ON public.user_permissions 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own permissions" 
ON public.user_permissions 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own permissions" 
ON public.user_permissions 
FOR DELETE 
USING (user_id = auth.uid());

-- Create a simple admin policy that doesn't cause recursion
CREATE POLICY "Admins can manage all permissions" 
ON public.user_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = auth.uid() 
    AND up.role = 'admin'::user_role 
    AND up.shadow_agent_access = true
    AND (up.expires_at IS NULL OR up.expires_at > now())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = auth.uid() 
    AND up.role = 'admin'::user_role 
    AND up.shadow_agent_access = true
    AND (up.expires_at IS NULL OR up.expires_at > now())
  )
);