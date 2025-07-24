import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ValidationUtils, ValidationError } from '../../../src/utils/ValidationUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      text,
      voice,
      model,
      stability,
      similarity_boost,
      style,
      use_speaker_boost
    } = await req.json();

    const validatedText = ValidationUtils.validateString(text, 'text', { required: true, minLength: 1, maxLength: 5000 });
    const validatedVoice = ValidationUtils.validateString(voice, 'voice', { required: false, minLength: 1, maxLength: 100 });
    const validatedModel = ValidationUtils.validateString(model, 'model', { required: false, minLength: 1, maxLength: 100 });
    const validatedStability = ValidationUtils.validateNumber(stability, 'stability', { required: false, min: 0, max: 1 });
    const validatedSimilarityBoost = ValidationUtils.validateNumber(similarity_boost, 'similarity_boost', { required: false, min: 0, max: 1 });
    const validatedStyle = ValidationUtils.validateNumber(style, 'style', { required: false, min: 0, max: 1 });
    const validatedUseSpeakerBoost = ValidationUtils.validateBoolean(use_speaker_boost, 'use_speaker_boost', false);

    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY') || Deno.env.get('Eleven_Lab_API');
    if (!elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability,
          similarity_boost,
          style,
          use_speaker_boost
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${error}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio,
        voice,
        model,
        contentType: 'audio/mpeg'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('ElevenLabs TTS Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});