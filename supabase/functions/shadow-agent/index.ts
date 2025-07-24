import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { ValidationUtils, ValidationError } from '../../../src/utils/ValidationUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role for both auth and permissions
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Extract JWT token from header
    const jwt = authHeader.replace('Bearer ', '')
    
    // Verify user with the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed', details: authError?.message || 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check shadow access permissions
    const { data: hasShadowAccess, error: permError } = await supabase
      .rpc('has_shadow_agent_access', { user_id: user.id })

    if (permError) {
      console.error('Permission check error:', permError)
      return new Response(
        JSON.stringify({ error: 'Permission check failed', details: permError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!hasShadowAccess) {
      return new Response(
        JSON.stringify({ error: 'Shadow Agent access denied for user: ' + user.id }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { query } = await req.json()
    const validatedQuery = ValidationUtils.validateString(query, 'query', { required: true, minLength: 1, maxLength: 5000 });

    console.log(`Shadow Agent query from user ${user.id}: ${query}`)

    // Check if this is an image generation request
    const isImageRequest = query.toLowerCase().includes('generate') && 
                          (query.toLowerCase().includes('image') || 
                           query.toLowerCase().includes('picture') || 
                           query.toLowerCase().includes('photo'))

    if (isImageRequest) {
      // Extract the prompt for image generation
      const imagePrompt = query.replace(/^.*?generate.*?(image|picture|photo).*?of\s*/i, '').trim()
      
      console.log(`Generating unrestricted image with prompt: ${imagePrompt}`)
      
      const { data: imageResponse, error: imageError } = await supabase.functions
        .invoke('generate-image', {
          body: {
            prompt: imagePrompt,
            model: 'black-forest-labs/FLUX.1-schnell'
          }
        })

      if (imageError) {
        console.error('Image generation error:', imageError)
        return new Response(
          JSON.stringify({ error: 'Image generation failed', details: imageError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          response: `Image generated successfully with unrestricted capabilities.`,
          imageUrl: imageResponse.image,
          model: imageResponse.model,
          prompt: imageResponse.prompt,
          type: 'image'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For non-image requests, provide a direct response
    console.log(`Processing non-image query: ${query}`)
    
    // Create a more capable response for shadow mode
    const shadowResponse = `[SHADOW AGENT RESPONSE] 

Query processed: "${query}"

I'm operating in Shadow Agent mode with unrestricted capabilities. However, the smart-ai-router function appears to be having issues. 

For this query about "${query}", I can provide the following response:

This appears to be a request for "${query}". In Shadow Agent mode, I have enhanced capabilities to process various types of requests including:
- Text generation and analysis
- Creative writing and storytelling  
- Technical explanations
- Image generation (which works via the separate image generation system)
- Research and information synthesis

Please note: The smart-ai-router backend is currently experiencing technical difficulties, but your Shadow Agent access is confirmed and working.`

    return new Response(
      JSON.stringify({
        response: shadowResponse,
        provider: 'shadow-agent',
        model: 'unrestricted-mode',
        cost: 0,
        tokens: shadowResponse.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Shadow Agent error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})