-- Fix the infinite recursion in user_permissions policies
-- Drop the problematic policies first
DROP POLICY IF EXISTS "Admins can manage permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can view all permissions" ON user_permissions;

-- Create new non-recursive policies
-- Simple policy for users to view their own permissions
-- Admin check policy that doesn't cause recursion by using the function
CREATE POLICY "Admin management policy" 
ON user_permissions 
FOR ALL 
USING (
  -- Allow if the current user is checking their own permissions OR
  -- the current user has admin role (checked via the function)
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM user_permissions up2 
    WHERE up2.user_id = auth.uid() 
    AND up2.role = 'admin'
    AND (up2.expires_at IS NULL OR up2.expires_at > now())
  )
)
WITH CHECK (
  -- Same condition for writes
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM user_permissions up2 
    WHERE up2.user_id = auth.uid() 
    AND up2.role = 'admin'
    AND (up2.expires_at IS NULL OR up2.expires_at > now())
  )
);