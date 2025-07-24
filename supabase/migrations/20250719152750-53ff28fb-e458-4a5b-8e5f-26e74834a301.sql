-- Fix infinite recursion by dropping and recreating the problematic policies
DROP POLICY IF EXISTS "Admin management policy" ON public.user_permissions;
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Users can insert their own permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Users can update their own permissions" ON public.user_permissions;  
DROP POLICY IF EXISTS "Users can delete their own permissions" ON public.user_permissions;

-- Create simplified policies that won't cause recursion
CREATE POLICY "Allow own permissions access" 
ON public.user_permissions 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());