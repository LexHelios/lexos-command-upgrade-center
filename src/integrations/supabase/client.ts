// Local API client to replace Supabase
// Use the same host as the frontend to avoid CORS issues
const API_BASE_URL = typeof window !== 'undefined' 
  ? `${window.location.protocol}//${window.location.hostname}:3000/api`
  : 'http://localhost:3000/api';

// Helper function for API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// Auth functions
export const auth = {
  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      }
      
      return { data: data.user, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Login failed') };
    }
  },

  signUp: async ({ email, password }: { email: string; password: string }) => {
    try {
      const data = await apiCall('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      }
      
      return { data: data.user, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Signup failed') };
    }
  },

  signOut: async () => {
    try {
      await apiCall('/auth/logout', { method: 'POST' });
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Logout failed') };
    }
  },

  getSession: async () => {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');
    
    if (!token) {
      return { data: { session: null }, error: null };
    }
    
    try {
      const data = await apiCall('/auth/session');
      return { data: { session: data }, error: null };
    } catch (error) {
      return { data: { session: null }, error: null };
    }
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    // Simple implementation - check localStorage changes
    const checkAuth = () => {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('user');
      
      if (token && user) {
        callback('SIGNED_IN', { user: JSON.parse(user), access_token: token });
      } else {
        callback('SIGNED_OUT', null);
      }
    };
    
    // Check initial state
    checkAuth();
    
    // Listen for storage changes
    window.addEventListener('storage', checkAuth);
    
    // Return unsubscribe function
    return {
      data: { subscription: true },
      error: null,
      unsubscribe: () => {
        window.removeEventListener('storage', checkAuth);
      }
    };
  }
};

// Functions API (for edge functions)
export const functions = {
  invoke: async (functionName: string, options: { body?: any } = {}) => {
    try {
      // Map function names to local API endpoints
      let endpoint = functionName;
      
      // Map Supabase function names to our local endpoints
      const functionMap: Record<string, string> = {
        'smart-ai-router': '/ai/chat',
        'web-search': '/search/web',
        'browser-agent': '/browser-agent/execute',
        'shadow-agent': '/ai/chat',  // Use same AI endpoint
        'elevenlabs-tts': '/tts/generate',
        'speech-to-text': '/stt/transcribe',
        'generate-image': '/image/generate',
        'realtime-orchestrator': '/orchestrator/execute',
        'h100-proxy': '/ai/h100',
      };
      
      // Get the mapped endpoint or use the function name as-is
      endpoint = functionMap[functionName] || `/${functionName}`;
      
      console.log(`Calling endpoint: ${endpoint} for function: ${functionName}`);
      
      const data = await apiCall(endpoint, {
        method: 'POST',
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      
      return { data, error: null };
    } catch (error) {
      console.error(`Function ${functionName} failed:`, error);
      
      // Don't mention "Edge Function" in errors anymore
      const errorMessage = error instanceof Error 
        ? error.message.replace('Edge Function', 'API endpoint')
        : 'API request failed';
        
      return { data: null, error: new Error(errorMessage) };
    }
  }
};

// Database operations
export const from = (table: string) => ({
  select: (columns = '*') => ({
    execute: async () => {
      try {
        const data = await apiCall(`/db/${table}?select=${columns}`);
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error instanceof Error ? error : new Error('Query failed') };
      }
    },
    eq: (column: string, value: any) => ({
      execute: async () => {
        try {
          const data = await apiCall(`/db/${table}?${column}=${value}&select=${columns}`);
          return { data, error: null };
        } catch (error) {
          return { data: null, error: error instanceof Error ? error : new Error('Query failed') };
        }
      },
      single: async () => {
        try {
          const data = await apiCall(`/db/${table}?${column}=${value}&select=${columns}&limit=1`);
          return { data: Array.isArray(data) ? data[0] : data, error: null };
        } catch (error) {
          return { data: null, error: error instanceof Error ? error : new Error('Query failed') };
        }
      }
    })
  }),
  
  insert: (data: any) => ({
    execute: async () => {
      try {
        const result = await apiCall(`/db/${table}`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return { data: result, error: null };
      } catch (error) {
        return { data: null, error: error instanceof Error ? error : new Error('Insert failed') };
      }
    },
    select: () => ({
      execute: async () => {
        try {
          const result = await apiCall(`/db/${table}`, {
            method: 'POST',
            body: JSON.stringify(data),
          });
          return { data: result, error: null };
        } catch (error) {
          return { data: null, error: error instanceof Error ? error : new Error('Insert failed') };
        }
      }
    })
  }),
  
  update: (data: any) => ({
    eq: (column: string, value: any) => ({
      execute: async () => {
        try {
          const result = await apiCall(`/db/${table}?${column}=${value}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
          });
          return { data: result, error: null };
        } catch (error) {
          return { data: null, error: error instanceof Error ? error : new Error('Update failed') };
        }
      }
    })
  }),
  
  delete: () => ({
    eq: (column: string, value: any) => ({
      execute: async () => {
        try {
          const result = await apiCall(`/db/${table}?${column}=${value}`, {
            method: 'DELETE',
          });
          return { data: result, error: null };
        } catch (error) {
          return { data: null, error: error instanceof Error ? error : new Error('Delete failed') };
        }
      }
    })
  })
});

// Storage operations
export const storage = {
  from: (bucket: string) => ({
    upload: async (path: string, file: File) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/storage/${bucket}/${path}`, {
          method: 'POST',
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        const data = await response.json();
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error instanceof Error ? error : new Error('Upload failed') };
      }
    },
    
    getPublicUrl: (path: string) => ({
      data: { publicUrl: `${API_BASE_URL}/storage/${bucket}/${path}` }
    })
  })
};

// Realtime operations (simplified)
export const channel = (name: string) => ({
  on: (event: string, filter: any, callback: (payload: any) => void) => {
    // This would need WebSocket implementation
    console.warn('Realtime functionality needs WebSocket implementation');
    return { subscribe: () => {} };
  },
  subscribe: () => {
    console.warn('Realtime functionality needs WebSocket implementation');
    return { error: null };
  }
});

// Export a default client object for compatibility
export const supabase = {
  auth,
  functions,
  from,
  storage,
  channel
};