import { Hono } from 'hono';
import { z } from 'zod';

const imageRouter = new Hono();

// HuggingFace API configuration
const HF_API_KEY = process.env.HF_TOKEN || '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';

// Available open-source models on HuggingFace
const MODELS = {
  // General purpose models (uncensored)
  'stable-diffusion-xl': 'stabilityai/stable-diffusion-xl-base-1.0',
  'stable-diffusion-2-1': 'stabilityai/stable-diffusion-2-1',
  'openjourney': 'prompthero/openjourney',
  'dreamlike-photoreal': 'dreamlike-art/dreamlike-photoreal-2.0',
  'deliberate': 'XpucT/Deliberate',
  'realistic-vision': 'SG161222/Realistic_Vision_V5.1_noVAE',
  'juggernaut-xl': 'kandinsky-community/kandinsky-2-2-decoder',
  
  // Anime/artistic models  
  'anything-v5': 'stablediffusionapi/anything-v5',
  'waifu-diffusion': 'hakurei/waifu-diffusion',
  'pastel-mix': 'andite/pastel-mix',
};

const imageRequestSchema = z.object({
  prompt: z.string().min(1).max(1000),
  model: z.string().optional(),
  size: z.enum(['square', 'portrait', 'landscape']).optional(),
  negative_prompt: z.string().optional(),
  num_outputs: z.number().min(1).max(4).optional(),
  guidance_scale: z.number().min(1).max(20).optional(),
  num_inference_steps: z.number().min(1).max(100).optional(),
  seed: z.number().optional(),
});

imageRouter.post('/generate', async (c) => {
  try {
    const body = await c.req.json();
    const request = imageRequestSchema.parse(body);
    
    // Determine which model to use based on prompt content
    let modelId = MODELS['stable-diffusion-xl']; // Default
    const promptLower = request.prompt.toLowerCase();
    
    // Select appropriate model based on content
    if (request.model && MODELS[request.model as keyof typeof MODELS]) {
      modelId = MODELS[request.model as keyof typeof MODELS];
    } else if (promptLower.includes('anime') || promptLower.includes('manga') || promptLower.includes('waifu')) {
      modelId = MODELS['anything-v5'];
    } else if (promptLower.includes('realistic') || promptLower.includes('photorealistic') || promptLower.includes('real')) {
      modelId = MODELS['realistic-vision'];
    } else if (promptLower.includes('art') || promptLower.includes('artistic') || promptLower.includes('painting')) {
      modelId = MODELS['openjourney'];
    }
    
    // Determine dimensions based on size preference
    let width = 1024;
    let height = 1024;
    if (request.size === 'portrait') {
      width = 768;
      height = 1024;
    } else if (request.size === 'landscape') {
      width = 1024;
      height = 768;
    }
    
    // Ensure we have a valid model
    if (!modelId) {
      console.error('No model selected, using default');
      modelId = MODELS['stable-diffusion-xl'];
    }
    
    console.log(`Generating image with model: ${modelId}`);
    console.log(`Prompt: ${request.prompt}`);
    
    // Call HuggingFace Inference API
    const response = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: request.prompt,
        parameters: {
          negative_prompt: request.negative_prompt || 'blurry, low quality, distorted, disfigured, bad anatomy',
          width,
          height,
          num_inference_steps: request.num_inference_steps || 50,
          guidance_scale: request.guidance_scale || 7.5,
          seed: request.seed,
        },
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('HuggingFace API error:', error);
      
      // If model is loading, wait and retry
      if (error.includes('loading') || response.status === 503) {
        return c.json({
          status: 'loading',
          message: 'Model is loading, please try again in a few seconds...',
          estimated_time: 20,
        }, 503);
      }
      
      throw new Error(`HuggingFace API error: ${response.status} - ${error}`);
    }
    
    // HuggingFace returns the image as a blob
    const imageBlob = await response.blob();
    const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());
    const base64Image = imageBuffer.toString('base64');
    
    return c.json({
      status: 'success',
      model: Object.keys(MODELS).find(key => MODELS[key as keyof typeof MODELS] === modelId) || 'unknown',
      images: [{
        url: `data:image/png;base64,${base64Image}`,
        prompt: request.prompt,
        size: `${width}x${height}`,
      }],
    });
    
  } catch (error) {
    console.error('Image generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: errorMessage }, 500);
  }
});

// List available models
imageRouter.get('/models', async (c) => {
  return c.json({
    models: Object.keys(MODELS).map(key => ({
      id: key,
      name: key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: key.includes('anime') || key.includes('anything') ? 'anime' :
            key.includes('realistic') || key.includes('vision') ? 'realistic' :
            'general',
      nsfw_capable: true, // Together AI models are generally unrestricted
    })),
  });
});

export default imageRouter;