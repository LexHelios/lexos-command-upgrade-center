// Secure API Service - All API calls now go through backend API

export interface APIResponse {
  text: string;
  confidence: number;
  model: string;
  provider: string;
  usage?: {
    tokens: number;
    cost?: number;
  };
  metadata?: {
    responseTime?: number;
    cached?: boolean;
    retries?: number;
  };
}

export interface APIRequestOptions {
  task_type?: 'text' | 'code' | 'image' | 'voice' | 'reasoning' | 'general';
  complexity?: 'low' | 'medium' | 'high';
  quality?: 'basic' | 'standard' | 'premium';
  max_cost?: number;
  prefer_self_hosted?: boolean;
  model?: string;
  timeout?: number;
  retries?: number;
  cache?: boolean;
}

export class SecureAPIService {
  private cache = new Map<string, { data: APIResponse; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly DEFAULT_RETRIES = 2;

  private generateCacheKey(prompt: string, options: APIRequestOptions): string {
    const key = JSON.stringify({ prompt, options });
    return btoa(key).slice(0, 50); // Truncate to avoid too long keys
  }

  private async makeRequest(url: string, options: RequestInit, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retries: number,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === retries) {
          throw lastError;
        }

        // Exponential backoff
        const backoffDelay = delay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }

    throw lastError!;
  }

  // All AI API calls now go through the local backend API
  async callAI(prompt: string, options: APIRequestOptions = {}): Promise<APIResponse> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(prompt, options);
    const timeout = options.timeout || this.DEFAULT_TIMEOUT;
    const retries = options.retries ?? this.DEFAULT_RETRIES;

    // Check cache first
    if (options.cache !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return {
          ...cached.data,
          metadata: {
            ...cached.data.metadata,
            cached: true,
            responseTime: Date.now() - startTime
          }
        };
      }
    }

    const requestFn = async (): Promise<APIResponse> => {
      const response = await this.makeRequest('/api/ai/smart-router', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_type: options.task_type || 'general',
          complexity: options.complexity || 'medium',
          quality: options.quality || 'standard',
          prompt,
          max_cost: options.max_cost,
          prefer_self_hosted: options.prefer_self_hosted !== false,
          estimated_tokens: Math.max(100, prompt.length * 2)
        })
      }, timeout);

      if (!response.ok) {
        let errorMessage = 'AI request failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If we can't parse the error response, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        throw error;
      }

      const data = await response.json();
      
      const result: APIResponse = {
        text: data.response || data.result,
        confidence: 0.9,
        model: data.model_used?.model || data.model,
        provider: data.model_used?.provider || data.provider,
        usage: {
          tokens: data.tokens_used || 0,
          cost: data.model_used?.cost || data.cost || 0
        },
        metadata: {
          responseTime: Date.now() - startTime,
          cached: false
        }
      };

      // Cache the result
      if (options.cache !== false) {
        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      }

      return result;
    };

    try {
      return await this.retryRequest(requestFn, retries);
    } catch (error) {
      // Log the error for debugging
      console.error('AI API call failed:', {
        prompt: prompt.substring(0, 100) + '...',
        options,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  // Legacy method names for backwards compatibility - all route to secure AI router
  async callOpenAI(prompt: string, model = 'gpt-4.1-2025-04-14'): Promise<APIResponse> {
    return this.callAI(prompt, { model, quality: 'premium' });
  }

  async callAnthropic(prompt: string, model = 'claude-sonnet-4-20250514'): Promise<APIResponse> {
    return this.callAI(prompt, { model, quality: 'premium', task_type: 'reasoning' });
  }

  async callGrok(prompt: string): Promise<APIResponse> {
    return this.callAI(prompt, { quality: 'standard' });
  }

  async callPerplexity(prompt: string, model = 'llama-3.1-sonar-large-128k-online'): Promise<APIResponse> {
    return this.callAI(prompt, { model, task_type: 'general' });
  }

  async callCohere(prompt: string, model = 'command-r-plus'): Promise<APIResponse> {
    return this.callAI(prompt, { model, quality: 'standard' });
  }

  async callDeepSeek(prompt: string): Promise<APIResponse> {
    return this.callAI(prompt, { task_type: 'reasoning', quality: 'premium' });
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/health', {
        method: 'GET'
      }, 5000);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Make.com API Integration - Note: These methods are deprecated for security
  // All automation should be handled through secure backend APIs
  async createMakeScenario(): Promise<never> {
    throw new Error('Direct Make.com API calls are deprecated for security. Use backend API endpoints instead.');
  }

  async triggerMakeWebhook(): Promise<boolean> {
    throw new Error('Direct Make.com API calls are deprecated for security. Use backend API endpoints instead.');
  }

  async getMakeScenarios(): Promise<never> {
    throw new Error('Direct Make.com API calls are deprecated for security. Use backend API endpoints instead.');
  }

  async activateMakeScenario(): Promise<never> {
    throw new Error('Direct Make.com API calls are deprecated for security. Use backend API endpoints instead.');
  }
}