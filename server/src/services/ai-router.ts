import { z } from 'zod';

// Request analysis schema
export const RequestAnalysis = z.object({
  task_type: z.enum(['text', 'code', 'image', 'video', 'voice', 'reasoning', 'general', 'realtime', 'chat', 'financial', 'nsfw', 'roleplay', 'creative', 'storytelling', 'anime', 'realistic']),
  complexity: z.enum(['low', 'medium', 'high']),
  requires_context: z.boolean(),
  requires_creativity: z.boolean(),
  requires_accuracy: z.boolean(),
  is_conversational: z.boolean(),
  estimated_tokens: z.number(),
  recommended_model: z.string(),
  confidence: z.number().min(0).max(1)
});

export type RequestAnalysisType = z.infer<typeof RequestAnalysis>;

export class AIRouter {
  private routerModel: string = 'gemma2:27b'; // Lightweight, fast model for routing decisions
  
  constructor() {
    console.log('AI Router initialized with model:', this.routerModel);
  }

  /**
   * Analyzes an incoming request and determines the best model to handle it
   */
  async analyzeRequest(userPrompt: string): Promise<RequestAnalysisType> {
    const analysisPrompt = `You are an AI request router. Analyze this user request and determine the best model to handle it.

User Request: "${userPrompt}"

Analyze and respond with a JSON object containing:
- task_type: The primary type of task (text/code/image/video/voice/reasoning/general/chat/financial/nsfw/roleplay/creative/storytelling)
- complexity: Task complexity (low/medium/high)
- requires_context: Whether this needs long context window (true/false)
- requires_creativity: Whether this needs creative capabilities (true/false)
- requires_accuracy: Whether this needs high accuracy/factual correctness (true/false)
- is_conversational: Whether this is part of a conversation (true/false)
- estimated_tokens: Rough estimate of tokens needed (number)
- recommended_model: The best model for this task from our available models
- confidence: Your confidence in this routing decision (0-1)

Available models and their strengths:
- command-r-plus: Best for complex reasoning, long context (131K), financial analysis, research
- gemma-2-27b: Fast, efficient, good for general tasks, coding, analysis
- am-thinking-v1-32b: Excellent reasoning, step-by-step thinking, mathematics
- mistral-magistral-small-24b: Balanced performance, good for chat and general tasks
- qwen2.5-omni-7b: Multimodal, voice, images, general chat
- llama-3.3-70b-versatile: Large, versatile, good for complex tasks
- mythomax-l2-13b: Creative writing, storytelling, roleplay
- stheno-llama-13b: Creative, uncensored, storytelling
- stable-diffusion-*: Image generation
- open-sora: Video generation

Respond ONLY with the JSON object, no other text.`;

    try {
      // Call the routing model
      const response = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: analysisPrompt,
          task_type: 'reasoning',
          complexity: 'low',
          quality: 'standard',
          model: this.routerModel
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze request');
      }

      const data = await response.json();
      const result = data.result;

      // Extract JSON from the response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in router response');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      
      // Validate and return
      return RequestAnalysis.parse(analysis);
      
    } catch (error) {
      console.error('Router analysis failed:', error);
      
      // Fallback analysis based on keywords
      return this.fallbackAnalysis(userPrompt);
    }
  }

  /**
   * Fallback analysis using keyword matching
   */
  private fallbackAnalysis(prompt: string): RequestAnalysisType {
    const lowerPrompt = prompt.toLowerCase();
    
    // Detect task type
    let task_type: RequestAnalysisType['task_type'] = 'general';
    let recommended_model = 'command-r-plus';
    let complexity: RequestAnalysisType['complexity'] = 'medium';
    
    // Image generation
    if (lowerPrompt.match(/\b(image|picture|photo|draw|generate.*image|create.*image)\b/)) {
      task_type = 'image';
      recommended_model = 'stable-diffusion-2.1';
    }
    // Code generation
    else if (lowerPrompt.match(/\b(code|program|function|class|script|implement|debug)\b/)) {
      task_type = 'code';
      recommended_model = 'command-r-plus';
      complexity = 'high';
    }
    // Reasoning/Analysis
    else if (lowerPrompt.match(/\b(analyze|reason|think|explain|why|how does|calculate|solve)\b/)) {
      task_type = 'reasoning';
      recommended_model = 'am-thinking-v1-32b';
      complexity = 'high';
    }
    // Creative writing
    else if (lowerPrompt.match(/\b(story|write|creative|fiction|roleplay|character)\b/)) {
      task_type = 'creative';
      recommended_model = 'stheno-llama-13b';
    }
    // Financial
    else if (lowerPrompt.match(/\b(financial|stock|trading|investment|market|economy)\b/)) {
      task_type = 'financial';
      recommended_model = 'command-r-plus';
      complexity = 'high';
    }
    // NSFW detection
    else if (lowerPrompt.match(/\b(nsfw|adult|explicit|uncensored)\b/)) {
      task_type = 'nsfw';
      recommended_model = 'mythomax-l2-13b';
    }
    // Chat/Conversation
    else if (lowerPrompt.match(/\b(chat|talk|conversation|hello|hi|hey)\b/)) {
      task_type = 'chat';
      recommended_model = 'gemma-2-27b';
      complexity = 'low';
    }

    return {
      task_type,
      complexity,
      requires_context: prompt.length > 1000,
      requires_creativity: task_type === 'creative' || task_type === 'storytelling',
      requires_accuracy: task_type === 'financial' || task_type === 'code',
      is_conversational: task_type === 'chat',
      estimated_tokens: Math.ceil(prompt.length / 4) * 2,
      recommended_model,
      confidence: 0.6
    };
  }

  /**
   * Routes a request to the appropriate model based on analysis
   */
  async routeRequest(
    userPrompt: string, 
    analysis?: RequestAnalysisType,
    preferredModel?: string
  ): Promise<any> {
    // Use provided analysis or analyze the request
    const routingDecision = analysis || await this.analyzeRequest(userPrompt);
    
    console.log('Routing decision:', routingDecision);
    
    // Override with preferred model if specified
    const targetModel = preferredModel || routingDecision.recommended_model;
    
    // Prepare the request for the target model
    const request = {
      prompt: userPrompt,
      task_type: routingDecision.task_type,
      complexity: routingDecision.complexity,
      quality: routingDecision.requires_accuracy ? 'premium' : 'standard',
      model: targetModel,
      estimated_tokens: routingDecision.estimated_tokens
    };
    
    // Route to appropriate endpoint
    let endpoint = '/api/ai/chat';
    
    if (routingDecision.task_type === 'image' || routingDecision.task_type === 'anime' || routingDecision.task_type === 'realistic') {
      endpoint = '/api/image/generate';
      return this.routeToImage(userPrompt, targetModel);
    }
    
    // Call the main AI endpoint
    const response = await fetch(`http://localhost:3000${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to route request: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Add routing metadata
    return {
      ...result,
      routing: {
        analysis: routingDecision,
        model_used: result.model_used?.model || targetModel,
        router_model: this.routerModel
      }
    };
  }

  /**
   * Special handling for image generation requests
   */
  private async routeToImage(prompt: string, model: string) {
    const response = await fetch('http://localhost:3000/api/image/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        num_outputs: 1,
        model: model.includes('stable-diffusion') ? model : 'stable-diffusion-2.1'
      })
    });
    
    if (!response.ok) {
      throw new Error('Image generation failed');
    }
    
    return response.json();
  }

  /**
   * Get router status and statistics
   */
  async getStatus() {
    return {
      router_model: this.routerModel,
      status: 'active',
      capabilities: {
        intelligent_routing: true,
        fallback_routing: true,
        model_selection: true,
        request_analysis: true
      }
    };
  }
}