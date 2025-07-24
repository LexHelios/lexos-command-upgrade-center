import { useState } from 'react';
import { auth } from '@/integrations/supabase/client';
import { API_ENDPOINTS } from '@/config/api';

interface DirectH100Response {
  success: boolean;
  data?: unknown;
  error?: string;
}

export const useDirectH100 = () => {
  const [loading, setLoading] = useState(false);

  const callH100Direct = async (prompt: string, options: {
    model?: string;
    taskType?: string;
    maxTokens?: number;
  } = {}): Promise<DirectH100Response> => {
    setLoading(true);
    
    try {
      // Get user session for authentication
      const { data: { session } } = await auth.getSession();
      
      if (!session) {
        return { success: false, error: 'User not authenticated' };
      }

      // Direct call to H100 backend
      const response = await fetch(API_ENDPOINTS.ai.h100, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'User-Agent': 'LexOS-Frontend/1.0'
        },
        body: JSON.stringify({
          prompt,
          model: options.model || 'default',
          taskType: options.taskType || 'general',
          maxTokens: options.maxTokens || 2000,
          preferSelfHosted: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('H100 Direct Error:', response.status, errorText);
        return { 
          success: false, 
          error: `H100 API Error: ${response.status} - ${errorText}` 
        };
      }

      const data = await response.json();
      return { success: true, data };

    } catch (error) {
      console.error('Direct H100 call failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    } finally {
      setLoading(false);
    }
  };

  return { callH100Direct, loading };
};