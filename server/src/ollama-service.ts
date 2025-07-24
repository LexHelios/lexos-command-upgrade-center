// Use native fetch (Node.js 18+)

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaService {
  private baseUrl: string;
  private availableModels: Set<string> = new Set();

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
    this.loadAvailableModels();
  }

  private async loadAvailableModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json() as { models: OllamaModel[] };
        this.availableModels = new Set(data.models.map(m => m.name));
        console.log('Available Ollama models:', Array.from(this.availableModels));
      }
    } catch (error) {
      console.error('Failed to load Ollama models:', error);
    }
  }

  // Model mapping from H100 names to Ollama models
  private modelMapping: Record<string, string> = {
    'am-thinking-v1-32b': 'llama3.1:8b',
    'mistral-magistral-small-24b': 'llama3.1:8b',
    'qwen2.5-omni-7b': 'llama3.1:8b',
    'pygmalion-7b': 'wizard-vicuna-uncensored:13b',
    'mythomax-l2-13b': 'wizard-vicuna-uncensored:13b',
    'openhermes-2.5-mistral-7b': 'openhermes:latest',
    'stheno-llama-13b': 'wizard-vicuna-uncensored:13b',
    'dolphin-mixtral': 'dolphin-mixtral:8x7b',
    'dolphin-llama': 'dolphin-llama3:8b',
    'command-r-plus': 'command-r-plus:latest',
    'gemma-2-27b': 'gemma2:27b'
  };

  private getOllamaModel(requestedModel: string): string {
    // Check if we have a direct mapping
    if (this.modelMapping[requestedModel]) {
      const mappedModel = this.modelMapping[requestedModel];
      if (this.availableModels.has(mappedModel)) {
        return mappedModel;
      }
    }

    // Check if the requested model exists directly
    if (this.availableModels.has(requestedModel)) {
      return requestedModel;
    }

    // Fallback based on capabilities
    if (requestedModel.includes('uncensored') || requestedModel.includes('nsfw') || 
        requestedModel.includes('pygmalion') || requestedModel.includes('mytho')) {
      if (this.availableModels.has('wizard-vicuna-uncensored:13b')) {
        return 'wizard-vicuna-uncensored:13b';
      }
      if (this.availableModels.has('dolphin-mixtral:8x7b')) {
        return 'dolphin-mixtral:8x7b';
      }
    }

    // Default fallback
    if (this.availableModels.has('llama3.1:8b')) {
      return 'llama3.1:8b';
    }

    // Return first available model
    return Array.from(this.availableModels)[0] || 'llama3.1:8b';
  }

  async generateResponse(model: string, prompt: string, maxTokens: number = 2048): Promise<{
    text: string;
    model: string;
    tokens_used: number;
    response_time_ms: number;
  } | null> {
    const ollamaModel = this.getOllamaModel(model);
    console.log(`Using Ollama model: ${ollamaModel} for requested model: ${model}`);

    try {
      const startTime = Date.now();
      
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: ollamaModel,
          prompt: prompt,
          stream: false,
          options: {
            num_predict: maxTokens,
            temperature: 0.8,
            top_p: 0.9
          }
        })
      });

      if (!response.ok) {
        console.error('Ollama API error:', response.status, response.statusText);
        return null;
      }

      const data = await response.json() as OllamaResponse;
      
      return {
        text: data.response,
        model: ollamaModel,
        tokens_used: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        response_time_ms: Date.now() - startTime
      };
    } catch (error) {
      console.error('Ollama generation error:', error);
      return null;
    }
  }

  async generateImage(prompt: string): Promise<{
    url: string;
    model: string;
  } | null> {
    // Check if llava model is available for image understanding
    if (this.availableModels.has('llava:13b')) {
      // LLaVA is for image understanding, not generation
      // For now, return null as Ollama doesn't support image generation
      console.log('Image generation not supported by Ollama');
    }
    return null;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`);
      return response.ok;
    } catch {
      return false;
    }
  }
}