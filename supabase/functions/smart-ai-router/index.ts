import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { ValidationUtils, ValidationError } from '../../../src/utils/ValidationUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ModelRequest {
  task_type: 'text' | 'code' | 'image' | 'voice' | 'reasoning' | 'general' | 'realtime'
  complexity: 'low' | 'medium' | 'high'
  quality: 'basic' | 'standard' | 'premium'
  prompt: string
  max_cost?: number
  prefer_self_hosted?: boolean
  estimated_tokens?: number
}

interface ModelInfo {
  provider: string
  model: string
  input_cost_per_1k: number
  output_cost_per_1k: number
  is_free: boolean
  is_self_hosted: boolean
  priority_order: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    const requestData: ModelRequest = await req.json()
    
    // Validate input data
    validateInput(requestData)
    
    console.log('AI Router request:', {
      task_type: requestData.task_type,
      complexity: requestData.complexity,
      quality: requestData.quality,
      prompt_length: requestData.prompt?.length || 0
    })

    // Validate required fields
    if (!requestData.prompt || requestData.prompt.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required and cannot be empty' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if this is a web search request
    const searchKeywords = [
      'search', 'find', 'look up', 'latest', 'current', 'recent', 'news', 'today', 
      'what is happening', 'what\'s happening', 'real-time', 'browse', 'web', 
      'internet', 'google', 'information about', 'tell me about', 'as of', 
      'up to date', 'current events', 'trending', 'happening now', 'rebates',
      'incentives', 'programs', 'available', '2025', '2024', 'july', 'now',
      'status', 'updates', 'new', 'changes'
    ]
    
    const promptLower = requestData.prompt.toLowerCase()
    const isSearchRequest = searchKeywords.some(keyword => promptLower.includes(keyword)) ||
                           promptLower.includes('what are') ||
                           promptLower.includes('tell me') ||
                           promptLower.includes('can you')
    
    console.log(`Search detection: prompt="${requestData.prompt}", isSearchRequest=${isSearchRequest}`)
    
    // If this looks like a search request, route to web-search function
    if (isSearchRequest) {
      console.log('Detected search request, routing to web-search function')
      
      try {
        const searchResponse = await supabase.functions.invoke('web-search', {
          body: { 
            query: requestData.prompt,
            numResults: 5 
          },
          headers: {
            Authorization: authHeader
          }
        })

        if (searchResponse.error) {
          console.error('Search error:', searchResponse.error)
          throw new Error(searchResponse.error.message || 'Web search failed')
        }

        // Track usage for web search
        await supabase.from('api_usage').insert({
          user_id: user.id,
          provider: 'serpapi',
          model: 'web-search',
          endpoint: 'web-search',
          tokens_used: requestData.prompt.length + (searchResponse.data?.result?.length || 0),
          cost_usd: 0.001, // Approximate cost
          response_time_ms: Date.now() - Date.now(),
          success: true,
          metadata: {
            task_type: 'search',
            query: requestData.prompt
          }
        })

        return new Response(
          JSON.stringify({
            result: searchResponse.data?.result || 'Search completed',
            model_used: {
              provider: 'serpapi',
              model: 'web-search',
              cost: 0.001,
              tokens: requestData.prompt.length,
              response_time_ms: Date.now() - Date.now(),
              is_self_hosted: false
            },
            remaining_budget: remainingBudget - 0.001
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } catch (searchError) {
        console.error('Web search failed:', searchError)
        // Fall back to normal AI processing if search fails
      }
    }

    // Get available models sorted by priority
    const { data: models, error: modelsError } = await supabase
      .from('model_pricing')
      .select('*')
      .order('priority_order')

    if (modelsError) throw modelsError

    // Check current month spend
    const { data: costLimits, error: costError } = await supabase
      .from('cost_limits')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (costError) throw costError

    const currentSpend = costLimits?.current_month_spend || 0
    const monthlyLimit = costLimits?.monthly_limit_usd || 500
    const remainingBudget = monthlyLimit - currentSpend

    if (costLimits?.hard_limit_reached) {
      return new Response(
        JSON.stringify({ 
          error: 'Monthly cost limit reached',
          current_spend: currentSpend,
          monthly_limit: monthlyLimit
        }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Select best model based on requirements
    const selectedModel = await selectOptimalModel(
      models as ModelInfo[],
      requestData,
      remainingBudget,
      supabase,
      user.id
    )

    console.log('Selected model:', selectedModel)

    // Route to appropriate API with fallback
    const startTime = Date.now()
    let result
    let tokensUsed = 0
    let actualCost = 0
    let finalModel = selectedModel

    // Try the selected model, fall back to others if it fails
    const modelCandidates = models.filter(m => 
      isModelSuitableForTask(m, requestData)
    ).sort((a, b) => a.priority_order - b.priority_order)

    let lastError
    for (const model of modelCandidates) {
      try {
        console.log(`Trying model: ${model.provider}/${model.model}`)
        finalModel = model
        
         switch (model.provider) {
           case 'h100':
             result = await callH100API(model.model, requestData.prompt, authHeader.replace('Bearer ', ''))
             break
           case 'openai':
             result = await callOpenAI(model.model, requestData.prompt)
             tokensUsed = result.usage?.total_tokens || 0
             actualCost = calculateOpenAICost(model.model, result.usage)
             break
           case 'together':
             result = await callTogether(model.model, requestData.prompt)
             tokensUsed = result.usage?.total_tokens || 0
             actualCost = calculateTogetherCost(model.model, result.usage)
             break
          case 'huggingface':
            result = await callHuggingFace(model.model, requestData.prompt)
            break
          case 'xai':
            result = await callGrok(model.model, requestData.prompt)
            tokensUsed = result.usage?.total_tokens || 0
            actualCost = calculateGrokCost(model.model, result.usage)
            break
          default:
            throw new Error(`Unsupported provider: ${model.provider}`)
        }
        
        // If we get here, the call succeeded
        console.log(`Successfully used model: ${model.provider}/${model.model}`)
        break
        
      } catch (error) {
        console.error(`Failed to use ${model.provider}/${model.model}:`, error)
        lastError = error
        continue
      }
    }

    if (!result) {
      throw new Error(`All models failed. Last error: ${lastError?.message}`)
    }

    const responseTime = Date.now() - startTime

    // Track usage - with better error handling
    try {
      await supabase.from('api_usage').insert({
        user_id: user.id,
        provider: finalModel.provider,
        model: finalModel.model,
        endpoint: req.url,
        tokens_used: tokensUsed,
        cost_usd: actualCost,
        response_time_ms: responseTime,
        success: true,
        metadata: {
          task_type: requestData.task_type,
          complexity: requestData.complexity,
          estimated_cost: finalModel.estimated_cost
        }
      })
    } catch (usageError) {
      console.error('Failed to track API usage:', usageError)
      // Don't fail the entire request just because usage tracking failed
    }

    // Update monthly spend
    if (actualCost > 0) {
      try {
        const newSpend = currentSpend + actualCost
        const hardLimitReached = newSpend >= monthlyLimit

        await supabase
          .from('cost_limits')
          .upsert({
            user_id: user.id,
            current_month_spend: newSpend,
            hard_limit_reached: hardLimitReached,
            monthly_limit_usd: monthlyLimit
          })
      } catch (spendError) {
        console.error('Failed to update monthly spend:', spendError)
      }
    }

    return new Response(
      JSON.stringify({
        result: result.content || result.text || result,
        model_used: {
          provider: finalModel.provider,
          model: finalModel.model,
          cost: actualCost,
          tokens: tokensUsed,
          response_time_ms: responseTime,
          is_self_hosted: finalModel.is_self_hosted
        },
        remaining_budget: remainingBudget - actualCost
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Smart AI Router error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function selectOptimalModel(
  models: ModelInfo[],
  request: ModelRequest,
  remainingBudget: number,
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<ModelInfo & { estimated_cost: number }> {
  // Filter models suitable for task
  let candidates = models.filter(model => 
    isModelSuitableForTask(model, request)
  )

  // Check H100 availability and user preferences
  const { data: h100Config } = await supabase
    .from('h100_config')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  // If H100 is configured and available, prefer those models
  if (h100Config?.h100_endpoint && request.prefer_self_hosted !== false) {
    const h100Models = candidates.filter(m => m.h100_available);
    if (h100Models.length > 0) {
      candidates = h100Models;
    }
  } else {
    // TEMPORARY: Disable self-hosted models due to VM issues
    // Filter out self-hosted models (H100, lexcommand) unless H100 is configured
    candidates = candidates.filter(m => !m.is_self_hosted || m.h100_available);
  }
  
  if (candidates.length === 0) {
    throw new Error('No suitable models available for this task')
  }

  // Sort by priority (cost-effectiveness) - prioritize free cloud models, then H100, then paid cloud
  candidates.sort((a, b) => {
    // Prioritize H100 models if available and configured
    if (h100Config?.h100_endpoint) {
      if (a.h100_available && !b.h100_available) return -1
      if (!a.h100_available && b.h100_available) return 1
    }
    
    if (a.is_free && !b.is_free) return -1
    if (!a.is_free && b.is_free) return 1
    return a.priority_order - b.priority_order
  })

  // Check budget constraints
  const estimatedTokens = request.estimated_tokens || 1000
  
  for (const model of candidates) {
    const estimatedCost = calculateEstimatedCost(model, estimatedTokens)
    
    if (request.max_cost && estimatedCost > request.max_cost) continue
    if (estimatedCost > remainingBudget) continue

    return {
      ...model,
      estimated_cost: estimatedCost
    }
  }

  // Return cheapest option if budget exceeded
  return {
    ...candidates[0],
    estimated_cost: calculateEstimatedCost(candidates[0], estimatedTokens)
  }
}

function isModelSuitableForTask(model: ModelInfo, request: ModelRequest): boolean {
  // Define task-specific model requirements (REMOVED ANTHROPIC - TOO EXPENSIVE)
  const taskRequirements = {
    code: ['h100', 'openai', 'together'],
    reasoning: ['openai', 'together', 'h100'],
    image: ['huggingface', 'openai'],
    voice: ['elevenlabs', 'openai'],
    text: ['h100', 'together', 'openai'],
    general: ['h100', 'together', 'openai'],
    realtime: ['xai', 'openai'] // Grok excels at real-time data
  }

  const suitableProviders = taskRequirements[request.task_type] || taskRequirements.general
  return suitableProviders.includes(model.provider)
}

function calculateEstimatedCost(model: ModelInfo, tokens: number): number {
  if (model.is_free || model.is_self_hosted) return 0
  
  const inputTokens = tokens * 0.7
  const outputTokens = tokens * 0.3
  
  return (inputTokens / 1000) * model.input_cost_per_1k + 
         (outputTokens / 1000) * model.output_cost_per_1k
}

// Utility functions for reliability
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 30000): Promise<Response> {
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

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        break
      }
      
      // Skip retry for certain error types
      if (error.message.includes('Unauthorized') || 
          error.message.includes('Invalid API key') ||
          error.message.includes('400')) {
        break
      }
      
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

function validateInput(data: unknown): void {
  try {
    const request = data as ModelRequest;
    ValidationUtils.validateString(request.prompt, 'prompt', { required: true, minLength: 1, maxLength: 50000 });
    ValidationUtils.validateString(request.task_type, 'task_type', { required: true, pattern: /^(text|code|image|voice|reasoning|general|realtime)$/ });
    ValidationUtils.validateString(request.complexity, 'complexity', { required: true, pattern: /^(low|medium|high)$/ });
    ValidationUtils.validateString(request.quality, 'quality', { required: true, pattern: /^(basic|standard|premium)$/ });
    ValidationUtils.validateNumber(request.max_cost, 'max_cost', { required: false, min: 0 });
    ValidationUtils.validateBoolean(request.prefer_self_hosted, 'prefer_self_hosted', false);
    ValidationUtils.validateNumber(request.estimated_tokens, 'estimated_tokens', { required: false, min: 1 });
  } catch (error) {
    throw new Error(`Invalid input: ${error.message}`);
  }
}

// API calling functions
async function callH100API(model: string, prompt: string, userToken: string) {
  return retryWithBackoff(async () => {
    const h100Endpoint = Deno.env.get('LEXOS_BACKEND_URL') || 'http://159.26.94.122:3001'
    
    console.log(`Calling H100 Backend: ${h100Endpoint}/api/ai/chat`)
    
    const response = await fetchWithTimeout(`${h100Endpoint}/api/ai/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
        'User-Agent': 'Supabase-Edge-Function/1.0'
      },
      body: JSON.stringify({
        prompt: prompt.slice(0, 10000), // Limit prompt size
        model: model,
        taskType: 'general',
        preferSelfHosted: true,
        maxTokens: 2000
      })
    }, 20000) // 20 second timeout for H100

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`H100 Backend error: ${response.status} - ${errorText}`)
      throw new Error(`H100 API error: ${response.status} - ${response.statusText}`)
    }

    const data = await response.json()
    console.log('H100 Backend response received')
    
    if (!data || (!data.response && !data.content && !data.message && !data.text)) {
      throw new Error('Invalid response from H100 API')
    }
    
    return {
      content: data.response || data.content || data.message || data.text,
      usage: data.usage || { total_tokens: 0 }
    }
  }, 2, 2000) // 2 retries, 2 second base delay
}

async function callOpenAI(model: string, prompt: string) {
  return retryWithBackoff(async () => {
    const currentDate = new Date().toISOString().split('T')[0]
    const currentTime = new Date().toLocaleString('en-US', { timeZone: 'UTC' })
    
    const contextualPrompt = `Current date: ${currentDate} (${currentTime} UTC)

${prompt}`

    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { 
            role: 'system', 
            content: `You are a helpful AI assistant. The current date is ${currentDate} and current time is ${currentTime} UTC. Always consider this when answering questions about dates, times, or current events.` 
          },
          { role: 'user', content: contextualPrompt.slice(0, 15000) } // Limit prompt size
        ],
        max_tokens: 2000
      })
    }, 15000) // 15 second timeout

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`OpenAI API error: ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`)
    }
    
    const data = await response.json()
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI API')
    }
    
    return {
      content: data.choices[0].message.content,
      usage: data.usage
    }
  }, 3, 1000) // 3 retries, 1 second base delay
}

async function callAnthropic(model: string, prompt: string) {
  const currentDate = new Date().toISOString().split('T')[0]
  const currentTime = new Date().toLocaleString('en-US', { timeZone: 'UTC' })
  
  const contextualPrompt = `Current date: ${currentDate} (${currentTime} UTC)

${prompt}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY'),
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 2000,
      system: `You are a helpful AI assistant. The current date is ${currentDate} and current time is ${currentTime} UTC. Always consider this when answering questions about dates, times, or current events.`,
      messages: [{ role: 'user', content: contextualPrompt }]
    })
  })

  if (!response.ok) throw new Error(`Anthropic API error: ${response.statusText}`)
  const data = await response.json()
  return {
    content: data.content[0].text,
    usage: data.usage
  }
}

async function callTogether(model: string, prompt: string) {
  const apiKey = Deno.env.get('Together.AI_API')
  if (!apiKey) {
    throw new Error('Together AI API key not configured')
  }

  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000
    })
  })

  if (!response.ok) throw new Error(`Together API error: ${response.statusText}`)
  const data = await response.json()
  return {
    content: data.choices[0].message.content,
    usage: data.usage
  }
}

async function callHuggingFace(model: string, prompt: string) {
  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('HUGGINGFACE_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inputs: prompt })
  })

  if (!response.ok) throw new Error(`HuggingFace API error: ${response.statusText}`)
  return await response.json()
}

async function callGrok(model: string, prompt: string) {
  const apiKey = Deno.env.get('GROK_API_KEY')
  if (!apiKey) {
    throw new Error('Grok (X AI) API key not configured')
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { 
          role: 'system', 
          content: 'You are Grok, an AI with real-time web access. Provide current, trending information and live data insights. Include timestamps and sources when relevant.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: false
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Grok API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return {
    content: data.choices[0].message.content,
    usage: data.usage || { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
  }
}

// Cost calculation functions
function calculateOpenAICost(model: string, usage: { prompt_tokens: number; completion_tokens: number }): number {
  if (!usage) return 0
  
  const pricing: Record<string, { input: number, output: number }> = {
    'gpt-4.1-2025-04-14': { input: 2.50, output: 10.00 },
    'o3-2025-04-16': { input: 15.00, output: 60.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 }
  }
  
  const modelPricing = pricing[model] || pricing['gpt-4o-mini']
  return (usage.prompt_tokens / 1000) * modelPricing.input + 
         (usage.completion_tokens / 1000) * modelPricing.output
}

function calculateAnthropicCost(model: string, usage: { input_tokens: number; output_tokens: number }): number {
  if (!usage) return 0
  
  const pricing: Record<string, { input: number, output: number }> = {
    'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
    'claude-opus-4-20250514': { input: 15.00, output: 75.00 },
    'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 }
  }
  
  const modelPricing = pricing[model] || pricing['claude-3-5-haiku-20241022']
  return (usage.input_tokens / 1000) * modelPricing.input + 
         (usage.output_tokens / 1000) * modelPricing.output
}

function calculateTogetherCost(model: string, usage: { total_tokens: number }): number {
  if (!usage) return 0
  
  const pricing: Record<string, { input: number, output: number }> = {
    'meta-llama/Llama-3.1-8B-Instruct-Turbo': { input: 0.18, output: 0.18 },
    'meta-llama/Llama-3.1-70B-Instruct-Turbo': { input: 0.88, output: 0.88 }
  }
  
  const modelPricing = pricing[model] || { input: 0.18, output: 0.18 }
  return (usage.total_tokens / 1000) * ((modelPricing.input + modelPricing.output) / 2)
}

function calculateGrokCost(model: string, usage: { prompt_tokens: number; completion_tokens: number }): number {
  if (!usage) return 0
  
  const pricing: Record<string, { input: number, output: number }> = {
    'grok-3': { input: 0.5, output: 1.5 },
    'grok-4': { input: 1.0, output: 3.0 }
  }
  
  const modelPricing = pricing[model] || pricing['grok-3']
  return (usage.prompt_tokens / 1000) * modelPricing.input + 
         (usage.completion_tokens / 1000) * modelPricing.output
}