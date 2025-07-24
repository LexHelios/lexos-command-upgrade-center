import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// Enable CORS
app.use('*', cors());

// Mock text generation endpoint
app.post('/generate', async (c) => {
  const { prompt, model } = await c.req.json();
  
  // Mock responses based on model
  const responses: Record<string, string> = {
    'am-thinking-v1-32b': `After careful analysis: ${prompt}\n\nThis requires deep reasoning...`,
    'mythomax-l2-13b': `*adjusts mystical robes* ${prompt}\n\nAh, what an intriguing request...`,
    'stheno-llama-13b': `Once upon a time... ${prompt}\n\nLet me weave you a tale...`,
    'default': `I understand your request: "${prompt}". Here's my response...`
  };
  
  return c.json({
    text: responses[model || 'default'] || responses.default,
    tokens_used: 100
  });
});

// Mock image generation endpoint
app.post('/generate-image', async (c) => {
  const { prompt, model } = await c.req.json();
  
  // Return a mock image URL based on the model
  const imageUrls: Record<string, string> = {
    'anything-v5': 'https://via.placeholder.com/1024x1024/FF6B6B/FFFFFF?text=Anime+Style+Image',
    'stable-diffusion-2.1': 'https://via.placeholder.com/1024x1024/4ECDC4/FFFFFF?text=Photorealistic+Image',
    'revanimated': 'https://via.placeholder.com/1024x1024/45B7D1/FFFFFF?text=Hybrid+Style+Image',
    'stable-cascade-2024': 'https://via.placeholder.com/1024x1024/96CEB4/FFFFFF?text=High+Quality+Image',
    'default': 'https://via.placeholder.com/1024x1024/DDA0DD/FFFFFF?text=Generated+Image'
  };
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return c.json({
    image_url: imageUrls[model] || imageUrls.default,
    prompt: prompt,
    model: model,
    nsfw_detected: false
  });
});

// Mock video generation endpoint
app.post('/generate-video', async (c) => {
  const { prompt, model } = await c.req.json();
  
  return c.json({
    video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    prompt: prompt,
    model: model,
    duration: 10,
    fps: 30
  });
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok', models_loaded: true }));

const port = 5000;
console.log(`H100 Mock Server running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};