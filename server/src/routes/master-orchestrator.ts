import { Hono } from 'hono';

export const masterOrchestrator = new Hono();

// Enhanced interfaces for production
interface OrchestrationDecision {
  route: string;
  model?: string;
  tool?: string;
  reason: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_time_ms: number;
  fallback_routes: string[];
}

interface OrchestrationMetrics {
  totalRequests: number;
  successfulRoutes: number;
  failedRoutes: number;
  averageConfidence: number;
  routeDistribution: Record<string, number>;
  averageResponseTime: number;
  lastUpdated: number;
}

interface RequestContext {
  userId?: string;
  sessionId?: string;
  timestamp: number;
  userAgent?: string;
  previousRequests?: string[];
}

// Production metrics tracking
const metrics: OrchestrationMetrics = {
  totalRequests: 0,
  successfulRoutes: 0,
  failedRoutes: 0,
  averageConfidence: 0,
  routeDistribution: {},
  averageResponseTime: 0,
  lastUpdated: Date.now()
};

// Rate limiting for orchestrator
const orchestratorRateLimit = new Map<string, { count: number; resetTime: number }>();
const ORCHESTRATOR_RATE_LIMIT = 50; // requests per minute
const ORCHESTRATOR_RATE_WINDOW = 60 * 1000;

// Enhanced pattern matching with ML-like scoring
const INTENT_PATTERNS = {
  vision: {
    keywords: ['image', 'photo', 'picture', 'visual', 'see', 'look', 'analyze', 'ocr', 'text extraction'],
    weight: 0.9,
    priority: 'high' as const,
    estimated_time: 3000
  },
  code: {
    keywords: ['code', 'function', 'implement', 'debug', 'fix', 'program', 'script', 'algorithm', 'api'],
    weight: 0.85,
    priority: 'high' as const,
    estimated_time: 5000
  },
  browser: {
    keywords: ['browse', 'website', 'navigate', 'screenshot', 'automate', 'scrape', 'click', 'url'],
    weight: 0.8,
    priority: 'medium' as const,
    estimated_time: 8000
  },
  reasoning: {
    keywords: ['think', 'reason', 'analyze', 'explain', 'why', 'how', 'understand', 'logic', 'solve'],
    weight: 0.75,
    priority: 'medium' as const,
    estimated_time: 4000
  },
  creative: {
    keywords: ['story', 'creative', 'imagine', 'roleplay', 'character', 'write', 'generate', 'fiction'],
    weight: 0.7,
    priority: 'low' as const,
    estimated_time: 6000
  },
  search: {
    keywords: ['search', 'research', 'find', 'lookup', 'information', 'data', 'facts'],
    weight: 0.8,
    priority: 'medium' as const,
    estimated_time: 3000
  },
  task: {
    keywords: ['task', 'todo', 'remind', 'schedule', 'plan', 'organize', 'manage'],
    weight: 0.85,
    priority: 'high' as const,
    estimated_time: 2000
  },
  file: {
    keywords: ['file', 'upload', 'document', 'save', 'download', 'storage'],
    weight: 0.8,
    priority: 'medium' as const,
    estimated_time: 3000
  }
};

// Production helper functions
function checkOrchestratorRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientData = orchestratorRateLimit.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    orchestratorRateLimit.set(clientId, { count: 1, resetTime: now + ORCHESTRATOR_RATE_WINDOW });
    return true;
  }
  
  if (clientData.count >= ORCHESTRATOR_RATE_LIMIT) {
    return false;
  }
  
  clientData.count++;
  return true;
}

// Advanced ML-like intent analysis with scoring
function analyzeRequest(prompt: string, hasImage: boolean = false, hasCode: boolean = false, context?: RequestContext): OrchestrationDecision {
  const lower = prompt.toLowerCase();
  const words = lower.split(/\s+/);
  
  // Calculate intent scores for each category
  const intentScores: Record<string, number> = {};
  
  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    let score = 0;
    let matchCount = 0;
    
    // Keyword matching with position weighting
    for (const keyword of pattern.keywords) {
      const keywordIndex = lower.indexOf(keyword);
      if (keywordIndex !== -1) {
        matchCount++;
        // Earlier keywords get higher weight
        const positionWeight = 1 - (keywordIndex / lower.length) * 0.3;
        score += pattern.weight * positionWeight;
      }
    }
    
    // Boost score based on match density
    if (matchCount > 0) {
      const density = matchCount / words.length;
      score *= (1 + density);
    }
    
    intentScores[intent] = score;
  }
  
  // Context-based adjustments
  if (hasImage) {
    intentScores.vision = (intentScores.vision || 0) + 2.0;
  }
  
  if (hasCode || prompt.includes('```') || /\.(js|py|ts|java|cpp|c|go|rs)/.test(prompt)) {
    intentScores.code = (intentScores.code || 0) + 1.5;
  }
  
  // URL detection
  if (/https?:\/\//.test(prompt)) {
    intentScores.browser = (intentScores.browser || 0) + 1.0;
  }
  
  // Find the highest scoring intent
  const topIntent = Object.entries(intentScores).reduce((max, [intent, score]) => 
    score > max.score ? { intent, score } : max, 
    { intent: 'chat', score: 0 }
  );
  
  // Determine confidence based on score
  const confidence = Math.min(0.95, Math.max(0.3, topIntent.score / 3));
  
  // Route mapping with enhanced models and fallbacks
  const routeMap: Record<string, Partial<OrchestrationDecision>> = {
    vision: {
      route: hasImage && (lower.includes('ocr') || lower.includes('text') || lower.includes('read')) 
        ? 'vision-ocr' : 'vision-analyze',
      model: 'qwen2.5-vl-7b',
      tool: lower.includes('ocr') ? 'easyocr' : 'vision-ai',
      fallback_routes: ['ai-chat']
    },
    code: {
      route: 'ai-code',
      model: 'command-r-plus', // Updated to use our best H100 model
      fallback_routes: ['ai-reasoning', 'ai-chat']
    },
    browser: {
      route: 'browser-agent',
      tool: 'puppeteer',
      fallback_routes: ['search', 'ai-chat']
    },
    reasoning: {
      route: 'ai-reasoning',
      model: 'am-thinking-v1-32b',
      fallback_routes: ['ai-chat']
    },
    creative: {
      route: 'ai-creative',
      model: 'mythomax-l2-13b',
      fallback_routes: ['ai-chat']
    },
    search: {
      route: 'search',
      tool: 'web-search',
      fallback_routes: ['ai-chat']
    },
    task: {
      route: 'task-manager',
      tool: 'task-api',
      fallback_routes: ['ai-chat']
    },
    file: {
      route: 'file-manager',
      tool: 'file-api',
      fallback_routes: ['ai-chat']
    }
  };
  
  const selectedRoute = routeMap[topIntent.intent] || {
    route: 'ai-chat',
    model: 'command-r-plus',
    fallback_routes: []
  };
  
  const pattern = INTENT_PATTERNS[topIntent.intent as keyof typeof INTENT_PATTERNS];
  
  return {
    route: selectedRoute.route!,
    model: selectedRoute.model,
    tool: selectedRoute.tool,
    reason: `Intent: ${topIntent.intent} (score: ${topIntent.score.toFixed(2)})`,
    confidence,
    priority: pattern?.priority || 'medium',
    estimated_time_ms: pattern?.estimated_time || 5000,
    fallback_routes: selectedRoute.fallback_routes || []
  };
}

// Master orchestration endpoint with production enhancements
masterOrchestrator.post('/route', async (c) => {
  const startTime = Date.now();
  
  try {
    // Rate limiting
    const clientId = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    if (!checkOrchestratorRateLimit(clientId)) {
      return c.json({ 
        error: 'Orchestrator rate limit exceeded. Please try again later.',
        retry_after: 60 
      }, 429);
    }
    
    const body = await c.req.json();
    const { message, files, context } = body;
    
    // Build request context
    const requestContext: RequestContext = {
      userId: context?.userId,
      sessionId: context?.sessionId || `session_${Date.now()}`,
      timestamp: startTime,
      userAgent: c.req.header('user-agent'),
      previousRequests: context?.previousRequests || []
    };
    
    // Enhanced file analysis
    const hasImage = files?.some((f: any) => f.type?.startsWith('image/'));
    const hasCode = message.includes('```') || 
                   files?.some((f: any) => /\.(js|py|ts|java|cpp|c|go|rs|html|css|sql)$/i.test(f.name));
    
    // Advanced intent analysis
    const decision = analyzeRequest(message, hasImage, hasCode, requestContext);
    
    // Update metrics
    metrics.totalRequests++;
    metrics.routeDistribution[decision.route] = (metrics.routeDistribution[decision.route] || 0) + 1;
    metrics.averageConfidence = (metrics.averageConfidence * (metrics.totalRequests - 1) + decision.confidence) / metrics.totalRequests;
    
    // Log enhanced routing decision
    console.log('🧭 Master Orchestrator Decision:', {
      input: message.substring(0, 100) + '...',
      decision: {
        route: decision.route,
        confidence: decision.confidence,
        priority: decision.priority,
        estimated_time: decision.estimated_time_ms
      },
      context: {
        hasImage,
        hasCode,
        sessionId: requestContext.sessionId
      }
    });
    
    // Execute with fallback handling
    let result;
    let executionError = null;
    
    try {
      result = await executeRoute(decision, message, files, requestContext);
      metrics.successfulRoutes++;
    } catch (error) {
      executionError = error;
      console.error(`❌ Route ${decision.route} failed:`, error);
      
      // Try fallback routes
      for (const fallbackRoute of decision.fallback_routes) {
        try {
          console.log(`🔄 Trying fallback route: ${fallbackRoute}`);
          const fallbackDecision = { ...decision, route: fallbackRoute };
          result = await executeRoute(fallbackDecision, message, files, requestContext);
          metrics.successfulRoutes++;
          break;
        } catch (fallbackError) {
          console.error(`❌ Fallback ${fallbackRoute} also failed:`, fallbackError);
        }
      }
      
      if (!result) {
        metrics.failedRoutes++;
        throw executionError;
      }
    }
    
    // Calculate final metrics
    const responseTime = Date.now() - startTime;
    metrics.averageResponseTime = (metrics.averageResponseTime * (metrics.successfulRoutes - 1) + responseTime) / metrics.successfulRoutes;
    metrics.lastUpdated = Date.now();
    
    return c.json({
      success: true,
      routing: {
        ...decision,
        execution_time_ms: responseTime,
        fallback_used: executionError ? true : false
      },
      result,
      performance: {
        response_time_ms: responseTime,
        estimated_vs_actual: responseTime - decision.estimated_time_ms,
        confidence_score: decision.confidence
      },
      context: {
        session_id: requestContext.sessionId,
        timestamp: new Date(startTime).toISOString()
      }
    });
    
  } catch (error) {
    metrics.failedRoutes++;
    const responseTime = Date.now() - startTime;
    
    console.error('🔥 Orchestration critical error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Orchestration failed',
      fallback: 'Routing to general AI',
      performance: {
        response_time_ms: responseTime,
        error_type: error instanceof Error ? error.constructor.name : 'UnknownError'
      }
    }, 500);
  }
});

// Enhanced route execution with better error handling
async function executeRoute(decision: OrchestrationDecision, message: string, files: any[], context: RequestContext): Promise<any> {
  const timeout = decision.estimated_time_ms + 10000; // Add 10s buffer
  
  const executeWithTimeout = async (): Promise<any> => {
    switch (decision.route) {
      case 'vision-analyze':
        if (!files || files.length === 0) {
          throw new Error('No image provided for vision analysis');
        }
        return await handleVisionAnalysis(files[0], message);
        
      case 'vision-ocr':
        if (!files || files.length === 0) {
          throw new Error('No image provided for OCR');
        }
        return await handleOCR(files[0]);
        
      case 'browser-agent':
        return await handleBrowserRequest(message);
        
      case 'task-manager':
        return await handleTaskRequest(message);
        
      case 'search':
        return await handleSearch(message);
        
      case 'ai-code':
      case 'ai-reasoning':
      case 'ai-creative':
      case 'ai-chat':
      default:
        return await handleAIRequest(message, decision.model || 'auto', decision.route);
    }
  };
  
  // Execute with timeout
  return await Promise.race([
    executeWithTimeout(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Route execution timeout after ${timeout}ms`)), timeout)
    )
  ]);
}

// Handler functions
async function handleVisionAnalysis(file: any, prompt: string) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('model', 'qwen2.5-vl-7b');
  formData.append('task', 'analyze');
  
  const response = await fetch('http://localhost:5000/vision/analyze', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) throw new Error('Vision analysis failed');
  return await response.json();
}

async function handleOCR(file: any) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('model', 'easyocr');
  
  const response = await fetch('http://localhost:5000/vision/ocr', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) throw new Error('OCR failed');
  return await response.json();
}

async function handleBrowserRequest(message: string) {
  // Extract URL from message
  const urlMatch = message.match(/https?:\/\/[^\s]+/);
  const url = urlMatch ? urlMatch[0] : 'https://google.com';
  
  const response = await fetch('http://localhost:3000/api/browser-agent/navigate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  
  if (!response.ok) throw new Error('Browser navigation failed');
  return await response.json();
}

async function handleTaskRequest(message: string) {
  // Parse task operation
  if (message.includes('create') || message.includes('add')) {
    const response = await fetch('http://localhost:3000/api/tasks/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: message,
        status: 'pending',
        priority: 'medium'
      })
    });
    return await response.json();
  }
  
  // Default to list
  const response = await fetch('http://localhost:3000/api/tasks/list');
  return await response.json();
}

async function handleSearch(query: string) {
  const response = await fetch('http://localhost:3000/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  
  if (!response.ok) throw new Error('Search failed');
  return await response.json();
}

async function handleAIRequest(prompt: string, model: string, taskType: string) {
  const response = await fetch('http://localhost:3000/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      model,
      task_type: taskType.replace('ai-', ''),
      complexity: 'high',
      quality: 'premium'
    })
  });
  
  if (!response.ok) throw new Error('AI request failed');
  return await response.json();
}

// Status endpoint
masterOrchestrator.get('/status', async (c) => {
  return c.json({
    status: 'operational',
    capabilities: [
      'vision-analysis',
      'ocr',
      'code-generation',
      'browser-automation',
      'task-management',
      'file-management',
      'web-search',
      'reasoning',
      'creative-writing'
    ],
    models: {
      vision: ['qwen2.5-vl-7b', 'gpt-4-vision'],
      code: ['deepseek-coder-33b', 'gpt-4'],
      reasoning: ['am-thinking-v1-32b', 'claude-3-opus'],
      creative: ['mythomax-l2-13b', 'stheno-llama-13b'],
      general: ['mixtral-8x7b', 'llama3.1-70b']
    },
    routing_examples: [
      { input: 'analyze this image', route: 'vision-analyze' },
      { input: 'extract text from image', route: 'vision-ocr' },
      { input: 'write a python function', route: 'ai-code' },
      { input: 'browse to google.com', route: 'browser-agent' },
      { input: 'add task: review code', route: 'task-manager' },
      { input: 'search for AI news', route: 'search' },
      { input: 'explain quantum physics', route: 'ai-reasoning' },
      { input: 'write a story about', route: 'ai-creative' }
    ]
  });
});

export default masterOrchestrator;