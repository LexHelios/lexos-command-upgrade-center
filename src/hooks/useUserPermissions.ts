import { useState, useEffect } from 'react';
import { auth, from } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserPermissions {
  role: 'admin' | 'shadow_agent' | 'standard';
  shadow_agent_access: boolean;
  expires_at?: string;
}

export const useUserPermissions = () => {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      // Get user from localStorage (set during login)
      const userJson = localStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;
      
      if (!user) {
        setPermissions(null);
        setLoading(false);
        return;
      }

      const { data, error } = await from('user_permissions')
        .select('role, shadow_agent_access, expires_at')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching permissions:', error);
        setPermissions({ role: 'standard', shadow_agent_access: false });
      } else if (data) {
        // Check if access has expired
        const hasValidAccess = !data.expires_at || new Date(data.expires_at) > new Date();
        setPermissions({
          ...data,
          shadow_agent_access: data.shadow_agent_access && hasValidAccess
        });
      } else {
        // No permissions record found, default to standard user
        setPermissions({ role: 'standard', shadow_agent_access: false });
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissions({ role: 'standard', shadow_agent_access: false });
    } finally {
      setLoading(false);
    }
  };

  const grantShadowAccess = async (targetUserId: string, expiresAt?: string) => {
    try {
      const userJson = localStorage.getItem('user');
      const currentUser = userJson ? JSON.parse(userJson) : null;
      
      const { error } = await from('user_permissions')
        .insert({
          user_id: targetUserId,
          shadow_agent_access: true,
          expires_at: expiresAt,
          granted_by: currentUser?.id
        }).execute();

      if (error) throw error;

      toast({
        title: "Access Granted",
        description: "Shadow Agent access has been granted successfully.",
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to grant access";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  const revokeShadowAccess = async (targetUserId: string) => {
    try {
      const { error } = await from('user_permissions')
        .update({
          shadow_agent_access: false
        })
        .eq('user_id', targetUserId)
        .execute();

      if (error) throw error;

      toast({
        title: "Access Revoked",
        description: "Shadow Agent access has been revoked.",
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to revoke access";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    permissions,
    loading,
    hasShadowAccess: permissions?.shadow_agent_access || false,
    isAdmin: permissions?.role === 'admin',
    grantShadowAccess,
    revokeShadowAccess,
    refreshPermissions: checkPermissions
  };
};