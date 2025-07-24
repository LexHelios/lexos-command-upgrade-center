import { Hono } from 'hono';
import { z } from 'zod';
import fetch from 'node-fetch';

const ttsRouter = new Hono();

const ttsRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  voice: z.string().optional(),
  model: z.enum(['elevenlabs', 'openai']).optional().default('elevenlabs'),
  stream: z.boolean().optional().default(false)
});

// ElevenLabs voice IDs (you can add more)
const ELEVENLABS_VOICES = {
  'rachel': '21m00Tcm4TlvDq8ikWAM',  // Rachel - American female
  'josh': 'TxGEqnHWrfWFTfGW9XjX',    // Josh - American male  
  'bella': 'EXAVITQu4vr4xnSDxMaL',   // Bella - Young American female
  'antoni': 'ErXwobaYiN019PkySvjV',  // Antoni - American male
  'elli': 'MF3mGyEYCl7XYWbV9V6O',    // Elli - Young American female
  'adam': 'pNInz6obpgDQGcFmaJgB',    // Adam - Deep American male
  'arnold': 'VR6AewLTigWG4xSOukaG',  // Arnold - American male
  'sam': 'yoZ06aMxZJJ28mfd3POQ'      // Sam - American male
};

ttsRouter.post('/generate', async (c) => {
  try {
    const body = await c.req.json();
    const request = ttsRequestSchema.parse(body);
    
    if (request.model === 'elevenlabs' && process.env.ELEVENLABS_API_KEY) {
      // Use ElevenLabs API
      const voiceId = ELEVENLABS_VOICES[request.voice || 'rachel'] || ELEVENLABS_VOICES['rachel'];
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}${request.stream ? '/stream' : ''}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': process.env.ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: request.text,
            model_id: 'eleven_turbo_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5
            }
          })
        }
      );

      if (response.ok) {
        const audioBuffer = await response.buffer();
        const base64Audio = audioBuffer.toString('base64');
        
        return c.json({
          status: 'success',
          audio: `data:audio/mpeg;base64,${base64Audio}`,
          format: 'mp3'
        });
      } else {
        const error = await response.text();
        console.error('ElevenLabs error:', error);
      }
    }

    // Fallback to OpenAI TTS
    if (process.env.OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: request.text,
          voice: request.voice || 'alloy'
        })
      });

      if (response.ok) {
        const audioBuffer = await response.buffer();
        const base64Audio = audioBuffer.toString('base64');
        
        return c.json({
          status: 'success',
          audio: `data:audio/mpeg;base64,${base64Audio}`,
          format: 'mp3'
        });
      }
    }
    
    // Local browser-side TTS fallback
    console.log('Using browser-side TTS fallback for text:', request.text.substring(0, 50));
    
    // Return a response that tells the frontend to use browser TTS
    return c.json({
      status: 'success',
      text: request.text,
      voice: request.voice || 'default',
      use_browser_tts: true,
      note: 'Using browser Speech Synthesis API. For production, configure ElevenLabs or OpenAI API keys.'
    });
    
  } catch (error) {
    console.error('TTS error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: errorMessage }, 500);
  }
});

// Get available voices
ttsRouter.get('/voices', async (c) => {
  const voices = [];
  
  if (process.env.ELEVENLABS_API_KEY) {
    // Add ElevenLabs voices
    Object.entries(ELEVENLABS_VOICES).forEach(([name, id]) => {
      voices.push({
        id: name,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        provider: 'elevenlabs'
      });
    });
  }
  
  if (process.env.OPENAI_API_KEY) {
    // Add OpenAI voices
    ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].forEach(voice => {
      voices.push({
        id: voice,
        name: voice.charAt(0).toUpperCase() + voice.slice(1),
        provider: 'openai'
      });
    });
  }
  
  return c.json({ voices });
});

export default ttsRouter;