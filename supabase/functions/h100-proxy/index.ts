import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ValidationUtils, ValidationError } from '../../../src/utils/ValidationUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const H100_BASE_URL = 'http://159.26.94.122:3000/api';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Extract the endpoint from the URL path
    const url = new URL(req.url);
    let endpoint = url.pathname.replace('/functions/v1/h100-proxy/', '');
    
    // Remove any leading slashes to avoid double slashes in final URL
    endpoint = endpoint.replace(/^\/+/, '');

    // Validate endpoint to prevent path traversal or unexpected behavior
    const validatedEndpoint = ValidationUtils.validateString(endpoint, 'endpoint', { 
      minLength: 1, 
      maxLength: 255, 
      pattern: /^[a-zA-Z0-9\-_\/]+$/ 
    });

    // Validate H100_BASE_URL to ensure it's a valid URL
    const validatedH100BaseUrl = ValidationUtils.validateUrl(H100_BASE_URL, true);
    
    // Forward the request to H100 backend
    const h100Url = `${validatedH100BaseUrl}/${validatedEndpoint}${url.search}`;
    
    console.log(`Proxying ${req.method} request to: ${h100Url}`);

    const requestInit: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Forward the Supabase JWT token
      },
    };

    // Add body for non-GET requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const body = await req.text();
      if (body) {
        requestInit.body = body;
      }
    }

    const h100Response = await fetch(h100Url, requestInit);
    
    if (!h100Response.ok) {
      throw new Error(`H100 API error: ${h100Response.status} ${h100Response.statusText}`);
    }

    const responseData = await h100Response.json();
    
    // Log usage for monitoring
    await logApiUsage(supabaseClient, user.id, endpoint, h100Response.status === 200);

    return new Response(JSON.stringify(responseData), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-H100-Status': h100Response.status.toString(),
      },
    });

  } catch (error) {
    console.error('H100 proxy error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function logApiUsage(supabaseClient: SupabaseClient, userId: string, endpoint: string, success: boolean) {
  try {
    await supabaseClient
      .from('api_usage')
      .insert({
        user_id: userId,
        endpoint: `h100/${endpoint}`,
        provider: 'h100',
        model: 'h100-backend',
        success,
        request_count: 1,
        created_at: new Date().toISOString(),
      });
  } catch (error) {
    console.error('Failed to log API usage:', error);
  }
}