import { Hono } from 'hono';
import { z } from 'zod';
import { AIRouter } from '../services/ai-router.js';

const smartRouter = new Hono();
const aiRouter = new AIRouter();

// Request schema
const smartRequestSchema = z.object({
  prompt: z.string().min(1).max(50000),
  preferred_model: z.string().optional(),
  context: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional(),
  stream: z.boolean().optional().default(false)
});

// Main routing endpoint
smartRouter.post('/route', async (c) => {
  try {
    const body = await c.req.json();
    const request = smartRequestSchema.parse(body);
    
    console.log('Smart router received request:', request.prompt.substring(0, 100) + '...');
    
    // Step 1: Analyze the request
    const startTime = Date.now();
    const analysis = await aiRouter.analyzeRequest(request.prompt);
    const analysisTime = Date.now() - startTime;
    
    console.log('Request analysis completed in', analysisTime, 'ms:', analysis);
    
    // Step 2: Route to appropriate model
    const routeStartTime = Date.now();
    const result = await aiRouter.routeRequest(
      request.prompt,
      analysis,
      request.preferred_model
    );
    const routeTime = Date.now() - routeStartTime;
    
    // Return enhanced response with routing information
    return c.json({
      ...result,
      routing_info: {
        analysis_time_ms: analysisTime,
        routing_time_ms: routeTime,
        total_time_ms: Date.now() - startTime,
        decision: analysis,
        router_confidence: analysis.confidence
      }
    });
    
  } catch (error) {
    console.error('Smart router error:', error);
    
    // Fallback to direct routing
    try {
      const body = await c.req.json();
      const fallbackResponse = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: body.prompt,
          task_type: 'general',
          complexity: 'medium',
          quality: 'standard'
        })
      });
      
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        return c.json({
          ...data,
          routing_info: {
            fallback: true,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: errorMessage }, 500);
  }
});

// Analyze endpoint - just returns routing analysis without executing
smartRouter.post('/analyze', async (c) => {
  try {
    const { prompt } = await c.req.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return c.json({ error: 'Invalid prompt' }, 400);
    }
    
    const analysis = await aiRouter.analyzeRequest(prompt);
    
    return c.json({
      analysis,
      recommendation: {
        model: analysis.recommended_model,
        reason: getRecommendationReason(analysis)
      }
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: errorMessage }, 500);
  }
});

// Multi-turn conversation routing
smartRouter.post('/conversation', async (c) => {
  try {
    const body = await c.req.json();
    const { messages, preferred_model } = body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return c.json({ error: 'Invalid messages array' }, 400);
    }
    
    // Get the latest user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      return c.json({ error: 'No user message found' }, 400);
    }
    
    // Build context-aware prompt
    const contextPrompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
    
    // Analyze with context
    const analysis = await aiRouter.analyzeRequest(contextPrompt);
    
    // Route the request
    const result = await aiRouter.routeRequest(
      lastUserMessage.content,
      {
        ...analysis,
        is_conversational: true,
        requires_context: true
      },
      preferred_model
    );
    
    return c.json({
      ...result,
      conversation_context: {
        message_count: messages.length,
        analyzed_as: analysis.task_type,
        model_selected: result.model_used?.model || analysis.recommended_model
      }
    });
    
  } catch (error) {
    console.error('Conversation routing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: errorMessage }, 500);
  }
});

// Batch routing - analyze multiple requests and route efficiently
smartRouter.post('/batch', async (c) => {
  try {
    const { requests } = await c.req.json();
    
    if (!Array.isArray(requests) || requests.length === 0) {
      return c.json({ error: 'Invalid requests array' }, 400);
    }
    
    const results = await Promise.all(
      requests.map(async (req) => {
        try {
          const analysis = await aiRouter.analyzeRequest(req.prompt);
          const result = await aiRouter.routeRequest(req.prompt, analysis, req.preferred_model);
          return {
            id: req.id,
            success: true,
            result
          };
        } catch (error) {
          return {
            id: req.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );
    
    return c.json({ results });
    
  } catch (error) {
    console.error('Batch routing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: errorMessage }, 500);
  }
});

// Get router status
smartRouter.get('/status', async (c) => {
  const status = await aiRouter.getStatus();
  
  // Get available models from AI service
  const aiStatusResponse = await fetch('http://localhost:3000/api/ai/status');
  const aiStatus = await aiStatusResponse.json() as any;
  
  return c.json({
    router: status,
    available_models: {
      tier1: aiStatus.tier1_h100?.models || [],
      tier2: aiStatus.tier2_groq?.models || [],
      tier3: aiStatus.tier3_deepseek?.models || []
    },
    routing_stats: {
      // In a real implementation, these would be tracked
      total_requests: 0,
      successful_routes: 0,
      fallback_routes: 0,
      average_routing_time_ms: 0
    }
  });
});

// Helper function to explain routing decisions
function getRecommendationReason(analysis: any): string {
  const reasons = [];
  
  if (analysis.task_type === 'code') {
    reasons.push('Code generation requires high accuracy and logical reasoning');
  }
  if (analysis.task_type === 'creative') {
    reasons.push('Creative tasks benefit from models with strong narrative capabilities');
  }
  if (analysis.requires_context) {
    reasons.push('Long context window needed for comprehensive understanding');
  }
  if (analysis.complexity === 'high') {
    reasons.push('Complex task requires advanced reasoning capabilities');
  }
  if (analysis.is_conversational) {
    reasons.push('Conversational context requires chat-optimized model');
  }
  
  return reasons.join('. ') || 'General-purpose model selected for balanced performance';
}

export default smartRouter;