-- Drop all existing policies on user_permissions
DROP POLICY IF EXISTS "Admin management policy" ON public.user_permissions;
DROP POLICY IF EXISTS "Users can view own permissions" ON public.user_permissions;

-- Create a simple, non-recursive policy that allows users to see their own permissions
CREATE POLICY "Users can view their own permissions" 
ON public.user_permissions 
FOR SELECT 
USING (user_id = auth.uid());

-- Create a policy for inserts (users can insert their own permissions)
CREATE POLICY "Users can insert their own permissions" 
ON public.user_permissions 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Create a policy for updates (users can update their own permissions)
CREATE POLICY "Users can update their own permissions" 
ON public.user_permissions 
FOR UPDATE 
USING (user_id = auth.uid());

-- Create a policy for deletes (users can delete their own permissions)
CREATE POLICY "Users can delete their own permissions" 
ON public.user_permissions 
FOR DELETE 
USING (user_id = auth.uid());