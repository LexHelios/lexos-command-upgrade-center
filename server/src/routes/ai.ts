import { Hono } from 'hono';
import { z } from 'zod';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OllamaService } from '../ollama-service.js';

// Production-ready imports
interface RequestMetrics {
  startTime: number;
  modelAttempts: string[];
  totalLatency: number;
  provider: string;
  success: boolean;
  errorCount: number;
}

// Rate limiting and caching
const requestCache = new Map<string, { response: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 100;

const aiRouter = new Hono();

// Initialize Ollama service
const ollamaService = new OllamaService();

// Production helper functions
function generateCacheKey(request: z.infer<typeof aiRequestSchema>): string {
  return `${request.task_type}-${request.complexity}-${request.quality}-${Buffer.from(request.prompt).toString('base64').slice(0, 32)}`;
}

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (clientData.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  clientData.count++;
  return true;
}

function getCachedResponse(cacheKey: string): any | null {
  const cached = requestCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }
  if (cached) {
    requestCache.delete(cacheKey);
  }
  return null;
}

function setCachedResponse(cacheKey: string, response: any): void {
  requestCache.set(cacheKey, { response, timestamp: Date.now() });
  
  // Cleanup old cache entries
  if (requestCache.size > 1000) {
    const now = Date.now();
    for (const [key, value] of requestCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        requestCache.delete(key);
      }
    }
  }
}

// Enhanced error handling with retry logic
async function callProviderWithRetry(
  provider: string, 
  model: string, 
  prompt: string, 
  maxTokens: number, 
  retries = 2
): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      let result = null;
      
      switch (provider) {
        case 'groq':
          result = await callGroq(model, prompt, maxTokens);
          break;
        case 'deepseek':
          result = await callDeepSeek(model, prompt, maxTokens);
          break;
        case 'h100':
          result = await callH100(model, prompt, maxTokens);
          break;
      }
      
      if (result) return result;
      
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed for ${provider}:${model}:`, error);
      
      if (attempt === retries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  return null;
}

// Separate H100 call function for better organization
async function callH100(model: string, prompt: string, maxTokens: number): Promise<any> {
  // Use Ollama for text models
  if (!model.includes('stable-diffusion') && !model.includes('anything') && 
      !model.includes('revanimated') && !model.includes('eimis') && 
      !model.includes('cascade') && !model.includes('kandinsky') &&
      !model.includes('sora') && !model.includes('video')) {
    
    const ollamaAvailable = await ollamaService.isAvailable();
    if (ollamaAvailable) {
      const ollamaResponse = await ollamaService.generateResponse(model, prompt, maxTokens);
      
      if (ollamaResponse) {
        return {
          result: ollamaResponse.text,
          usage: { total_tokens: ollamaResponse.tokens_used },
          model: ollamaResponse.model,
          provider: 'ollama'
        };
      }
    }
  }
  
  // Fallback to H100 API if available for image/video or if Ollama fails
  if (!process.env.H100_API_URL) return null;
  
  let endpoint = '/generate';
  let payload: any = { 
    prompt, 
    max_tokens: maxTokens,
    model
  };
  
  // Special handling for different model types
  if (model.includes('stable-diffusion') || model.includes('anything') || 
      model.includes('revanimated') || model.includes('eimis') || 
      model.includes('cascade') || model.includes('kandinsky')) {
    endpoint = '/generate-image';
    
    const modelMap: Record<string, string> = {
      'stable-diffusion-1.5': 'runwayml/stable-diffusion-v1-5',
      'stable-diffusion-2.1': 'stabilityai/stable-diffusion-2-1',
      'anything-v5': 'andite/anything-v5',
      'revanimated': 'stablediffusionapi/rev-animated',
      'eimisanimediffusion': 'eimis/EimisAnimeDiffusion_v1',
      'stable-cascade-2024': 'stabilityai/stable-cascade',
      'kandinsky-3-nsfw-fork': 'kandinsky-community/kandinsky-3'
    };
    
    payload = {
      prompt,
      negative_prompt: '',
      steps: 50,
      guidance_scale: 7.5,
      model: modelMap[model] || model,
      width: 1024,
      height: 1024,
      nsfw_filter: false
    };
  } else if (model.includes('open-sora') || model.includes('video')) {
    endpoint = '/generate-video';
    
    const videoModelMap: Record<string, string> = {
      'open-sora': 'hpcaitech/open-sora',
      'open-sora-nsfw': 'hpcaitech/open-sora-nsfw',
      'text2video-zero-nsfw': 'text2video-zero/stable-diffusion-nsfw',
      'videocrafter2-nsfw': 'videocrafter/videocrafter2-nsfw'
    };
    
    payload = {
      prompt,
      duration: model.includes('text2video') ? 3 : 5,
      fps: 15,
      resolution: '720p',
      model: videoModelMap[model] || model,
      nsfw_filter: false
    };
  }
  
  const h100Response = await fetch(`${process.env.H100_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.H100_API_KEY}`
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000) // 30 second timeout
  });
  
  if (!h100Response.ok) {
    throw new Error(`H100 API error: ${h100Response.status}`);
  }
  
  const data = await h100Response.json();
  
  // Handle different response types from H100
  let resultContent = '';
  let tokens = 1000;
  
  if (data.image_url) {
    resultContent = `![Generated Image](${data.image_url})\n\n*Generated with ${model}*`;
    tokens = 77;
  } else if (data.video_url) {
    resultContent = `<video controls width="100%"><source src="${data.video_url}" type="video/mp4"></video>\n\n*Generated with ${model}*`;
    tokens = 100;
  } else {
    resultContent = data.text || data.content || data.output || data.response || data.result || JSON.stringify(data);
    tokens = data.tokens_used || 1000;
  }
  
  return {
    result: resultContent,
    usage: { total_tokens: tokens },
    model,
    provider: 'h100'
  };
}

// Request validation schema
const aiRequestSchema = z.object({
  task_type: z.enum(['text', 'code', 'image', 'video', 'voice', 'reasoning', 'general', 'realtime', 'chat', 'financial', 'nsfw', 'roleplay', 'creative', 'storytelling', 'anime', 'realistic']),
  complexity: z.enum(['low', 'medium', 'high']),
  quality: z.enum(['basic', 'standard', 'premium']),
  prompt: z.string().min(1).max(50000),
  max_cost: z.number().optional(),
  prefer_self_hosted: z.boolean().optional(),
  estimated_tokens: z.number().optional()
});

// Initialize API clients (lazy initialization)
let openai: OpenAI | null = null;
let anthropic: Anthropic | null = null;
let gemini: GoogleGenerativeAI | null = null;

function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

function getAnthropic() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
  return anthropic;
}

function getGemini() {
  if (!gemini && process.env.GEMINI_API_KEY) {
    gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return gemini;
}

// Model configuration with pricing and capabilities
interface ModelConfig {
  input: number;  // per 1K tokens
  output: number; // per 1K tokens
  provider: string;
  is_free: boolean;
  capabilities: string[];
  max_tokens: number;
  quality_score: number; // 1-10
  tier?: number; // 1, 2, or 3 for fallback priority
}

const MODELS: Record<string, ModelConfig> = {
  // TIER 1: H100 Self-hosted models (best open-source)
  'command-r-plus': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['text', 'general', 'code', 'reasoning', 'financial', 'chat'], max_tokens: 131072, quality_score: 9.9
  },
  'gemma-2-27b': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['text', 'general', 'code', 'reasoning', 'chat'], max_tokens: 8192, quality_score: 9.7
  },
  'am-thinking-v1-32b': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['text', 'general', 'code', 'reasoning', 'financial'], max_tokens: 32768, quality_score: 9.8
  },
  'mistral-magistral-small-24b': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['text', 'general', 'code', 'reasoning', 'chat'], max_tokens: 32768, quality_score: 9.5
  },
  'qwen2.5-omni-7b': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['text', 'general', 'chat', 'image', 'voice'], max_tokens: 32768, quality_score: 9
  },
  
  // TIER 1: Unrestricted/NSFW Chat Models (H100)
  'pygmalion-7b': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['text', 'chat', 'nsfw', 'roleplay'], max_tokens: 4096, quality_score: 8.5
  },
  'mythomax-l2-13b': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['text', 'chat', 'nsfw', 'roleplay', 'creative'], max_tokens: 8192, quality_score: 9
  },
  'openhermes-2.5-mistral-7b': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['text', 'chat', 'nsfw', 'roleplay', 'general'], max_tokens: 8192, quality_score: 8.8
  },
  'stheno-llama-13b': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['text', 'chat', 'nsfw', 'creative', 'storytelling'], max_tokens: 8192, quality_score: 9.2
  },
  
  // TIER 1: Multimodal Models (H100)
  'open-sora': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['video'], max_tokens: 2048, quality_score: 8.5
  },
  'open-sora-nsfw': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['video', 'nsfw'], max_tokens: 2048, quality_score: 7.5
  },
  'text2video-zero-nsfw': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['video', 'nsfw'], max_tokens: 1024, quality_score: 7
  },
  'videocrafter2-nsfw': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['video', 'nsfw'], max_tokens: 2048, quality_score: 8
  },
  // Image Generation Models - NSFW Fine-tuned
  'stable-diffusion-1.5': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['image', 'nsfw'], max_tokens: 77, quality_score: 8.5
  },
  'stable-diffusion-2.1': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['image', 'nsfw'], max_tokens: 77, quality_score: 9
  },
  'anything-v5': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['image', 'nsfw', 'anime'], max_tokens: 77, quality_score: 9.2
  },
  'revanimated': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['image', 'nsfw', 'anime', 'realistic'], max_tokens: 77, quality_score: 9.3
  },
  'eimisanimediffusion': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['image', 'nsfw', 'anime'], max_tokens: 77, quality_score: 9.1
  },
  'stable-cascade-2024': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['image', 'nsfw'], max_tokens: 77, quality_score: 9.5
  },
  'kandinsky-3-nsfw-fork': { 
    input: 0, output: 0, provider: 'h100', is_free: true, tier: 1,
    capabilities: ['image', 'nsfw', 'multilingual'], max_tokens: 77, quality_score: 8.8
  },
  
  // TIER 2: Free Groq models (fallback)
  'llama-3.3-70b-versatile': { 
    input: 0, output: 0, provider: 'groq', is_free: true, tier: 2,
    capabilities: ['text', 'general', 'code', 'reasoning'], max_tokens: 32768, quality_score: 8.5
  },
  'llama-3.1-8b-instant': { 
    input: 0, output: 0, provider: 'groq', is_free: true, tier: 2,
    capabilities: ['text', 'general', 'code'], max_tokens: 131072, quality_score: 7
  },
  'gemma2-9b-it': { 
    input: 0, output: 0, provider: 'groq', is_free: true, tier: 2,
    capabilities: ['text', 'general'], max_tokens: 8192, quality_score: 7.5
  },
  
  // TIER 3: DeepSeek R1 (cheap API as last resort)
  'deepseek-r1': { 
    input: 0.14, output: 0.28, provider: 'deepseek', is_free: false, tier: 3,
    capabilities: ['text', 'general', 'code', 'reasoning', 'financial'], max_tokens: 131072, quality_score: 9.5
  }
  
  // REMOVED ALL OTHER PAID MODELS - Only free Tier 1&2 + DeepSeek R1 remain
};

// 3-Tier model selection system with task-specific optimization
function selectBestModel(request: z.infer<typeof aiRequestSchema>): string[] {
  const { task_type, complexity, quality } = request;
  
  // Task-specific model recommendations
  const taskSpecificModels: Record<string, string[]> = {
    'reasoning': ['command-r-plus', 'gemma-2-27b', 'am-thinking-v1-32b', 'deepseek-r1', 'mistral-magistral-small-24b'],
    'code': ['command-r-plus', 'gemma-2-27b', 'am-thinking-v1-32b', 'deepseek-r1', 'llama-3.3-70b-versatile'],
    'chat': ['command-r-plus', 'gemma-2-27b', 'qwen2.5-omni-7b', 'mistral-magistral-small-24b', 'openhermes-2.5-mistral-7b', 'llama-3.3-70b-versatile'],
    'general': ['command-r-plus', 'gemma-2-27b', 'am-thinking-v1-32b', 'mistral-magistral-small-24b'],
    'image': [], // Handled by dedicated image endpoint
    'video': ['open-sora', 'videocrafter2-nsfw', 'open-sora-nsfw', 'text2video-zero-nsfw'],
    'voice': ['qwen2.5-omni-7b'],
    'financial': ['command-r-plus', 'am-thinking-v1-32b', 'deepseek-r1'],
    'nsfw': ['mythomax-l2-13b', 'stheno-llama-13b', 'pygmalion-7b', 'openhermes-2.5-mistral-7b'],
    'roleplay': ['stheno-llama-13b', 'mythomax-l2-13b', 'pygmalion-7b', 'openhermes-2.5-mistral-7b'],
    'creative': ['command-r-plus', 'stheno-llama-13b', 'mythomax-l2-13b'],
    'storytelling': ['command-r-plus', 'stheno-llama-13b', 'mythomax-l2-13b'],
    'anime': [], // Handled by dedicated image endpoint
    'realistic': [] // Handled by dedicated image endpoint
  };
  
  // Get task-specific preferences
  const preferredModels = taskSpecificModels[task_type] || [];
  
  // Filter models by capability
  let eligibleModels = Object.entries(MODELS).filter(([name, config]) => {
    // Check if model supports the task
    const supportsTask = config.capabilities.includes(task_type) || config.capabilities.includes('general');
    if (!supportsTask) return false;
    
    // For high complexity tasks, ensure high quality
    if (complexity === 'high' && config.quality_score < 8.5) return false;
    
    return true;
  });
  
  // Sort by tier and preference
  eligibleModels.sort((a, b) => {
    const nameA = a[0];
    const nameB = b[0];
    const tierA = a[1].tier || 99;
    const tierB = b[1].tier || 99;
    
    // Check if models are in preferred list
    const aPreferred = preferredModels.includes(nameA);
    const bPreferred = preferredModels.includes(nameB);
    
    // Preferred models come first within each tier
    if (tierA === tierB) {
      if (aPreferred && !bPreferred) return -1;
      if (!aPreferred && bPreferred) return 1;
      
      // If both preferred or both not, sort by quality
      return b[1].quality_score - a[1].quality_score;
    }
    
    // Otherwise sort by tier
    return tierA - tierB;
  });
  
  return eligibleModels.map(([name]) => name);
}

// Provider-specific API calls
async function callGroq(model: string, prompt: string, maxTokens: number) {
  if (!process.env.GROQ_API_KEY) {
    console.log('No GROQ_API_KEY found');
    return null;
  }
  
  try {
    console.log(`Calling Groq with model: ${model}`);
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });
    
    if (response.ok) {
      const data = await response.json() as any;
      return {
        result: data.choices[0].message.content,
        usage: data.usage,
        model,
        provider: 'groq'
      };
    } else {
      const errorText = await response.text();
      console.error(`Groq API error: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('Groq error:', error);
  }
  
  return null;
}

async function callDeepSeek(model: string, prompt: string, maxTokens: number) {
  if (!process.env.DEEPSEEK_API_KEY) return null;
  
  try {
    // Use the correct model name for DeepSeek R1
    const apiModel = model === 'deepseek-r1' ? 'deepseek-r1' : 'deepseek-chat';
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: apiModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });
    
    if (response.ok) {
      const data = await response.json() as any;
      return {
        result: data.choices[0].message.content,
        usage: data.usage,
        model,
        provider: 'deepseek'
      };
    } else {
      const errorText = await response.text();
      console.error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('DeepSeek error:', error);
  }
  
  return null;
}

// Removed Together AI - no longer needed in 3-tier system

// Removed Perplexity - no longer needed in 3-tier system

aiRouter.post('/chat', async (c) => {
  const metrics: RequestMetrics = {
    startTime: Date.now(),
    modelAttempts: [],
    totalLatency: 0,
    provider: '',
    success: false,
    errorCount: 0
  };

  try {
    const body = await c.req.json();
    
    // Rate limiting
    const clientId = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    if (!checkRateLimit(clientId)) {
      return c.json({ 
        error: 'Rate limit exceeded. Please try again later.',
        retry_after: 60 
      }, 429);
    }
    
    // Handle both direct calls and smart-ai-router format
    const requestData = body.task_type ? body : {
      task_type: 'general',
      complexity: 'medium', 
      quality: 'standard',
      prompt: body.message || body.prompt || '',
      ...body
    };
    
    const request = aiRequestSchema.parse(requestData);
    
    // Check cache first
    const cacheKey = generateCacheKey(request);
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      console.log('🚀 Cache hit for request');
      return c.json({
        ...cachedResponse,
        cached: true,
        cache_key: cacheKey.slice(0, 16) + '...'
      });
    }
    
    // Special handling for image generation - use dedicated endpoint
    if (request.task_type === 'image' || request.task_type === 'anime' || request.task_type === 'realistic') {
      try {
        // Extract the actual user prompt, removing any web search context
        let cleanPrompt = request.prompt;
        const searchIndex = cleanPrompt.indexOf('User question:');
        if (searchIndex !== -1) {
          cleanPrompt = cleanPrompt.substring(searchIndex + 14).trim();
        }
        
        const imageResponse = await fetch('http://localhost:3000/api/image/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: cleanPrompt,
            num_outputs: 1
          })
        });
        
        if (imageResponse.ok) {
          const data = await imageResponse.json() as any;
          if (data.images && data.images.length > 0) {
            return c.json({
              result: `![${data.images[0].prompt}](${data.images[0].url})\n\n*Generated with ${data.model} via HuggingFace*`,
              model_used: {
                model: data.model,
                provider: 'huggingface',
                cost: 0,
                tokens: 77
              },
              processing_time: Date.now() - startTime
            });
          }
        }
      } catch (error) {
        console.error('Image generation error:', error);
      }
    }
    
    // Get prioritized list of models
    const modelPriority = selectBestModel(request);
    console.log('🎯 Selected model priority:', modelPriority.slice(0, 3));
    console.log('📊 Request:', { task_type: request.task_type, quality: request.quality, complexity: request.complexity });
    
    let response = null;
    metrics.modelAttempts = [];
    
    // Try models in order of priority with enhanced retry logic
    for (const modelName of modelPriority) {
      const config = MODELS[modelName];
      metrics.modelAttempts.push(modelName);
      console.log(`🚀 Attempting model: ${modelName} (${config.provider}, free: ${config.is_free})`);
      
      try {
        const modelStartTime = Date.now();
        
        // Use the enhanced retry function
        response = await callProviderWithRetry(
          config.provider, 
          modelName, 
          request.prompt, 
          config.max_tokens
        );
        
        if (response) {
          metrics.provider = config.provider;
          metrics.success = true;
          metrics.totalLatency = Date.now() - modelStartTime;
          console.log(`✅ Success with ${modelName} in ${metrics.totalLatency}ms`);
          break;
        }
        
      } catch (error) {
        metrics.errorCount++;
        console.error(`❌ Error with ${modelName}:`, error);
        // Continue to next model
      }
    }
    
    // Legacy fallback for H100 (keeping for compatibility)
    if (!response) {
      for (const modelName of modelPriority.filter(m => MODELS[m].provider === 'h100')) {
        const config = MODELS[modelName];
        console.log(`🔄 Legacy H100 fallback: ${modelName}`);
        
        try {
          // Use Ollama for text models
            if (!modelName.includes('stable-diffusion') && !modelName.includes('anything') && 
                !modelName.includes('revanimated') && !modelName.includes('eimis') && 
                !modelName.includes('cascade') && !modelName.includes('kandinsky') &&
                !modelName.includes('sora') && !modelName.includes('video')) {
              
              // Check if Ollama is available
              const ollamaAvailable = await ollamaService.isAvailable();
              if (ollamaAvailable) {
                const ollamaResponse = await ollamaService.generateResponse(
                  modelName, 
                  request.prompt, 
                  config.max_tokens
                );
                
                if (ollamaResponse) {
                  response = {
                    result: ollamaResponse.text,
                    usage: { total_tokens: ollamaResponse.tokens_used },
                    model: ollamaResponse.model,
                    provider: 'ollama'
                  };
                  break;
                }
              }
            }
            
            // Fallback to H100 API if available for image/video or if Ollama fails
            if (process.env.H100_API_URL) {
              // Route to appropriate H100 model based on task
              let endpoint = '/generate';
              let payload: any = { 
                prompt: request.prompt, 
                max_tokens: config.max_tokens,
                model: modelName
              };
              
              // Special handling for image/video generation
              if (modelName.includes('stable-diffusion') || modelName.includes('anything') || 
                  modelName.includes('revanimated') || modelName.includes('eimis') || 
                  modelName.includes('cascade') || modelName.includes('kandinsky')) {
                endpoint = '/generate-image';
                
                // Map model names to actual model IDs
                const modelMap: Record<string, string> = {
                  'stable-diffusion-1.5': 'runwayml/stable-diffusion-v1-5',
                  'stable-diffusion-2.1': 'stabilityai/stable-diffusion-2-1',
                  'anything-v5': 'andite/anything-v5',
                  'revanimated': 'stablediffusionapi/rev-animated',
                  'eimisanimediffusion': 'eimis/EimisAnimeDiffusion_v1',
                  'stable-cascade-2024': 'stabilityai/stable-cascade',
                  'kandinsky-3-nsfw-fork': 'kandinsky-community/kandinsky-3'
                };
                
                payload = {
                  prompt: request.prompt,
                  negative_prompt: '',
                  steps: 50,
                  guidance_scale: 7.5,
                  model: modelMap[modelName] || modelName,
                  width: 1024,
                  height: 1024,
                  nsfw_filter: false
                };
              } else if (modelName.includes('open-sora') || modelName.includes('video')) {
                endpoint = '/generate-video';
                
                // Map model names to actual model IDs
                const videoModelMap: Record<string, string> = {
                  'open-sora': 'hpcaitech/open-sora',
                  'open-sora-nsfw': 'hpcaitech/open-sora-nsfw',
                  'text2video-zero-nsfw': 'text2video-zero/stable-diffusion-nsfw',
                  'videocrafter2-nsfw': 'videocrafter/videocrafter2-nsfw'
                };
                
                payload = {
                  prompt: request.prompt,
                  duration: modelName.includes('text2video') ? 3 : 5,
                  fps: 15,
                  resolution: '720p',
                  model: videoModelMap[modelName] || modelName,
                  nsfw_filter: false
                };
              }
              
              const h100Response = await fetch(`${process.env.H100_API_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.H100_API_KEY}`
                },
                body: JSON.stringify(payload)
              });
              
              if (h100Response.ok) {
                const data = await h100Response.json() as any;
                
                // Handle different response types from H100
                let resultContent = '';
                let tokens = 1000;
                
                if (data.image_url) {
                  // Image generation response
                  resultContent = `![Generated Image](${data.image_url})\n\n*Generated with ${modelName}*`;
                  tokens = 77;
                } else if (data.video_url) {
                  // Video generation response
                  resultContent = `<video controls width="100%"><source src="${data.video_url}" type="video/mp4"></video>\n\n*Generated with ${modelName}*`;
                  tokens = 100;
                } else {
                  // Text generation response
                  resultContent = data.text || data.content || data.output || data.response || data.result || JSON.stringify(data);
                  tokens = data.tokens_used || 1000;
                }
                
                response = {
                  result: resultContent,
                  usage: { total_tokens: tokens },
                  model: modelName,
                  provider: 'h100'
                };
              }
            }
            
            if (response) break; // Success! Stop trying other models
            
        } catch (error) {
          console.error(`❌ Legacy H100 fallback error with ${modelName}:`, error);
          // Continue to next model
        }
      }
    }
    
    // Fallback if all models fail
    if (!response) {
      // Special handling for NSFW tasks when H100 isn't available
      if (request.task_type === 'nsfw' || (request.task_type === 'image' && request.prompt.toLowerCase().match(/naked|nude|nsfw|adult|sex|erotic|porn|explicit/))) {
        // Try DeepSeek R1 as last resort for NSFW
        if (!attemptedModels.includes('deepseek-r1') && process.env.DEEPSEEK_API_KEY) {
          console.log('Attempting DeepSeek R1 for NSFW content as last resort');
          try {
            attemptedModels.push('deepseek-r1');
            response = await callDeepSeek('deepseek-r1', request.prompt, 131072);
            if (response) {
              console.log('DeepSeek R1 successfully handled NSFW request');
            }
          } catch (error) {
            console.error('DeepSeek R1 error:', error);
          }
        } else {
          console.log('DeepSeek R1 not available for NSFW fallback');
        }
        
        if (!response) {
          response = {
            result: `## H100 Uncensored Models Not Available\n\nI detected an NSFW request, but the uncensored H100 models are not currently running:\n- ${attemptedModels.filter(m => MODELS[m]?.capabilities.includes('nsfw')).join('\n- ')}\n\n**Options:**\n1. Set up H100 API server with uncensored models\n2. Use DeepSeek R1 (paid, but unrestricted)\n3. The free Groq models are censored and will refuse\n\n*Note: All H100 models failed with ECONNREFUSED - the H100 API server at localhost:5000 is not running.*`,
            usage: { total_tokens: 200 },
            model: 'fallback-nsfw',
            provider: 'mock'
          };
        }
      } else if (request.task_type === 'image') {
        // Use Replicate for image generation
        try {
          console.log('Using Replicate for image generation');
          const imageResponse = await fetch('http://localhost:3000/api/image/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: request.prompt,
              num_outputs: 1
            })
          });
          
          if (imageResponse.ok) {
            const data = await imageResponse.json() as any;
            if (data.images && data.images.length > 0) {
              response = {
                result: `![${data.images[0].prompt}](${data.images[0].url})\n\n*Generated with ${data.model} via Replicate*`,
                usage: { total_tokens: 77 },
                model: data.model,
                provider: 'replicate'
              };
            }
          }
        } catch (error) {
          console.error('Replicate image generation error:', error);
        }
        
        if (!response) {
          response = {
            result: `Image generation failed. Please check if the Replicate API token is configured correctly.`,
            usage: { total_tokens: 20 },
            model: 'error',
            provider: 'system'
          };
        }
      } else {
        response = {
          result: `🚨 All AI models failed. Attempted: ${metrics.modelAttempts.join(', ')}. Please check API keys in server/.env file.`,
          usage: { total_tokens: 100 },
          model: 'fallback',
          provider: 'mock'
        };
      }
    }
    
    // Calculate final metrics
    const totalResponseTime = Date.now() - metrics.startTime;
    const cost = calculateCost(response.model, response.usage);
    
    // Prepare final response
    const finalResponse = {
      result: response.result,
      model_used: {
        provider: response.provider,
        model: response.model,
        cost: cost,
        tokens: response.usage?.total_tokens || 0,
        response_time_ms: totalResponseTime,
        model_latency_ms: metrics.totalLatency,
        is_self_hosted: MODELS[response.model]?.is_free || false,
        attempted_models: metrics.modelAttempts,
        error_count: metrics.errorCount,
        cache_status: 'miss'
      },
      performance: {
        total_time: totalResponseTime,
        model_time: metrics.totalLatency,
        overhead_time: totalResponseTime - metrics.totalLatency,
        success_rate: metrics.success ? 1 : 0,
        models_tried: metrics.modelAttempts.length
      }
    };
    
    // Cache successful responses (but not errors or fallbacks)
    if (metrics.success && response.provider !== 'mock' && response.provider !== 'system') {
      setCachedResponse(cacheKey, finalResponse);
      console.log(`💾 Cached response for ${cacheKey.slice(0, 16)}...`);
    }
    
    return c.json(finalResponse);
    
  } catch (error) {
    metrics.errorCount++;
    console.error('🔥 AI Router critical error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ 
      error: errorMessage,
      metrics: {
        total_time: Date.now() - metrics.startTime,
        models_attempted: metrics.modelAttempts,
        error_count: metrics.errorCount
      }
    }, 500);
  }
});

// H100 direct endpoint with model selection
aiRouter.post('/h100', async (c) => {
  try {
    const body = await c.req.json();
    const { prompt, model = 'am-thinking-v1-32b', task_type = 'general' } = body;
    
    if (!process.env.H100_API_URL) {
      return c.json({ error: 'H100 not configured' }, 503);
    }
    
    // Select endpoint based on model type
    let endpoint = '/generate';
    let payload: any = { prompt, max_tokens: 32768, model };
    
    if (model.includes('stable-diffusion')) {
      endpoint = '/generate-image';
      payload = {
        prompt,
        negative_prompt: '',
        steps: 50,
        guidance_scale: 7.5,
        model: 'stabilityai/stable-diffusion-2-1'
      };
    } else if (model === 'open-sora') {
      endpoint = '/generate-video';
      payload = {
        prompt,
        duration: 5,
        fps: 15,
        resolution: '720p'
      };
    }
    
    const response = await fetch(`${process.env.H100_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.H100_API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`H100 API error: ${response.status}`);
    }
    
    const data = await response.json() as any;
    return c.json({
      result: data.text || data.content || data.url || data.video_url || JSON.stringify(data),
      model_used: {
        provider: 'h100',
        model: model,
        cost: 0,
        is_self_hosted: true
      }
    });
    
  } catch (error) {
    console.error('H100 error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: errorMessage }, 500);
  }
});

function calculateCost(model: string, usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; input_tokens?: number; output_tokens?: number } | undefined): number {
  const pricing = MODELS[model];
  if (!pricing || !usage) return 0;
  
  // Handle different usage formats
  const inputTokens = usage.prompt_tokens || usage.input_tokens || (usage.total_tokens ? usage.total_tokens * 0.7 : 0);
  const outputTokens = usage.completion_tokens || usage.output_tokens || (usage.total_tokens ? usage.total_tokens * 0.3 : 0);
  
  return (inputTokens / 1000) * pricing.input + 
         (outputTokens / 1000) * pricing.output;
}

// Enhanced system status endpoint with health checks
aiRouter.get('/status', async (c) => {
  const startTime = Date.now();
  
  // Test connectivity to each provider
  const healthChecks = {
    h100: false,
    groq: false,
    deepseek: false,
    ollama: false
  };
  
  // Quick health check for H100
  if (process.env.H100_API_URL) {
    try {
      const response = await fetch(`${process.env.H100_API_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      healthChecks.h100 = response.ok;
    } catch (error) {
      console.log('H100 health check failed:', error.message);
    }
  }
  
  // Quick health check for Ollama
  try {
    healthChecks.ollama = await ollamaService.isAvailable();
  } catch (error) {
    console.log('Ollama health check failed:', error.message);
  }
  
  // Check Groq with a minimal request
  if (process.env.GROQ_API_KEY) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
        signal: AbortSignal.timeout(2000)
      });
      healthChecks.groq = response.ok;
    } catch (error) {
      console.log('Groq health check failed:', error.message);
    }
  }
  
  // Check DeepSeek
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const response = await fetch('https://api.deepseek.com/v1/models', {
        headers: { 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` },
        signal: AbortSignal.timeout(2000)
      });
      healthChecks.deepseek = response.ok;
    } catch (error) {
      console.log('DeepSeek health check failed:', error.message);
    }
  }
  
  const status = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    health_check_time: Date.now() - startTime,
    
    providers: {
      tier1_h100: {
        available: !!process.env.H100_API_URL,
        healthy: healthChecks.h100,
        models: Object.entries(MODELS)
          .filter(([_, cfg]) => cfg.provider === 'h100')
          .map(([name, cfg]) => ({ name, capabilities: cfg.capabilities, quality: cfg.quality_score }))
      },
      tier2_groq: {
        available: !!process.env.GROQ_API_KEY,
        healthy: healthChecks.groq,
        models: Object.entries(MODELS)
          .filter(([_, cfg]) => cfg.provider === 'groq')
          .map(([name, cfg]) => ({ name, capabilities: cfg.capabilities, quality: cfg.quality_score }))
      },
      tier3_deepseek: {
        available: !!process.env.DEEPSEEK_API_KEY,
        healthy: healthChecks.deepseek,
        models: Object.entries(MODELS)
          .filter(([_, cfg]) => cfg.provider === 'deepseek')
          .map(([name, cfg]) => ({ name, capabilities: cfg.capabilities, cost_per_1k: (cfg.input + cfg.output) / 2, quality: cfg.quality_score }))
      },
      ollama: {
        available: true,
        healthy: healthChecks.ollama,
        local: true
      }
    },
    
    task_support: {
      reasoning: ['command-r-plus', 'am-thinking-v1-32b', 'deepseek-r1', 'mistral-magistral-small-24b'],
      code: ['command-r-plus', 'am-thinking-v1-32b', 'deepseek-r1', 'llama-3.3-70b-versatile'],
      chat: ['command-r-plus', 'qwen2.5-omni-7b', 'mistral-magistral-small-24b', 'mythomax-l2-13b'],
      image: ['stable-diffusion-2.1', 'anything-v5', 'revanimated'],
      video: ['open-sora', 'videocrafter2-nsfw'],
      voice: ['qwen2.5-omni-7b'],
      financial: ['command-r-plus', 'am-thinking-v1-32b', 'deepseek-r1'],
      nsfw: ['mythomax-l2-13b', 'stheno-llama-13b', 'pygmalion-7b']
    },
    
    cache: {
      size: requestCache.size,
      max_size: 1000,
      ttl_minutes: CACHE_TTL / 60000
    },
    
    rate_limiting: {
      max_requests_per_minute: MAX_REQUESTS_PER_MINUTE,
      window_ms: RATE_LIMIT_WINDOW,
      active_clients: rateLimitMap.size
    },
    
    system: {
      node_version: process.version,
      memory_usage: process.memoryUsage(),
      cpu_usage: process.cpuUsage()
    }
  };
  
  return c.json(status);
});

// New metrics endpoint for monitoring
aiRouter.get('/metrics', async (c) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    cache: {
      size: requestCache.size,
      hit_ratio: 'N/A', // Would need to track hits/misses
      oldest_entry: Math.min(...Array.from(requestCache.values()).map(v => v.timestamp)),
      newest_entry: Math.max(...Array.from(requestCache.values()).map(v => v.timestamp))
    },
    rate_limiting: {
      active_clients: rateLimitMap.size,
      clients: Array.from(rateLimitMap.entries()).map(([ip, data]) => ({
        ip: ip.replace(/\d+\.\d+\.\d+\./, 'xxx.xxx.xxx.'),
        requests: data.count,
        reset_time: new Date(data.resetTime).toISOString()
      }))
    },
    models: Object.entries(MODELS).map(([name, config]) => ({
      name,
      provider: config.provider,
      tier: config.tier,
      is_free: config.is_free,
      quality_score: config.quality_score,
      capabilities: config.capabilities
    }))
  };
  
  return c.json(metrics);
});

export default aiRouter;