import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Utility function for timeout handling
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 15000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`)
    }
    throw error
  }
}

// Input validation
// function validateTTSInput(data: unknown): void {
//   if (!data || typeof data !== 'object') {
//     throw new Error('Invalid input data')
//   }
  
//   if (!data.text || typeof data.text !== 'string' || data.text.trim().length === 0) {
//     throw new Error('Text must be a non-empty string')
//   }
  
//   if (data.text.length > 4096) {
//     throw new Error('Text too long (max 4096 characters)')
//   }
  
//   const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
//   if (data.voice && !validVoices.includes(data.voice)) {
//     throw new Error(`Invalid voice. Must be one of: ${validVoices.join(', ')}`)
//   }
// }

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    
    // Validate input
    validateTTSInput(requestData);
    
    const { text, voice = 'alloy' } = requestData;

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetchWithTimeout('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text.slice(0, 4000), // Ensure we don't exceed OpenAI limits
        voice: voice,
        response_format: 'mp3',
      }),
    }, 30000); // 30 second timeout for TTS

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to generate speech';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      
      console.error('OpenAI TTS Error:', response.status, errorMessage);
      throw new Error(errorMessage);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('TTS Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});