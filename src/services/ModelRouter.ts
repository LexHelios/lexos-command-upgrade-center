import { from } from '@/integrations/supabase/client';
import { CostTracker, ModelInfo } from './CostTracker';

export interface TaskRequirements {
  type: 'text' | 'code' | 'image' | 'voice' | 'reasoning' | 'general';
  complexity: 'low' | 'medium' | 'high';
  quality: 'basic' | 'standard' | 'premium';
  maxCost?: number;
  preferSelfHosted?: boolean;
}

export interface SelectedModel {
  provider: string;
  model: string;
  estimatedCost: number;
  reason: string;
  isSelfHosted: boolean;
  endpoint?: string;
}

export class ModelRouter {
  private static instance: ModelRouter;
  private costTracker: CostTracker;
  private modelPricing: ModelInfo[] = [];

  static getInstance(): ModelRouter {
    if (!ModelRouter.instance) {
      ModelRouter.instance = new ModelRouter();
    }
    return ModelRouter.instance;
  }

  constructor() {
    this.costTracker = CostTracker.getInstance();
    this.loadModelPricing();
  }

  private async loadModelPricing(): Promise<void> {
    try {
      const { data, error } = await from('model_pricing')
        .select('*')
        .execute();

      if (error) throw error;

      this.modelPricing = data.map(model => ({
        provider: model.provider,
        model: model.model,
        cost: Number(model.input_cost_per_1k), // Use input cost as the base cost
        priority: model.priority_order,
        capabilities: model.capabilities ? Object.keys(model.capabilities) : [],
        h100_available: model.h100_available || false,
        is_self_hosted: model.is_self_hosted || false,
        // Additional properties for compatibility
        inputCostPer1k: Number(model.input_cost_per_1k),
        outputCostPer1k: Number(model.output_cost_per_1k),
        isFree: model.is_free,
        isSelfHosted: model.is_self_hosted,
        priorityOrder: model.priority_order
      }));
    } catch (error) {
      console.error('Failed to load model pricing:', error);
    }
  }

  async selectModel(requirements: TaskRequirements, estimatedTokens = 1000): Promise<SelectedModel> {
    await this.loadModelPricing(); // Refresh pricing data

    // Filter models based on task type and requirements
    let candidates = this.modelPricing.filter(model => 
      this.isModelSuitableForTask(model, requirements)
    );

    // Prefer self-hosted models if available and requested
    if (requirements.preferSelfHosted !== false) {
      const selfHostedCandidates = candidates.filter(m => m.is_self_hosted || m.isSelfHosted);
      if (selfHostedCandidates.length > 0) {
        candidates = selfHostedCandidates;
      }
    }

    // Sort by priority (cost-effectiveness and quality)
    candidates.sort((a, b) => {
      // Self-hosted and free models have highest priority
      const aSelfHosted = a.is_self_hosted || a.isSelfHosted;
      const bSelfHosted = b.is_self_hosted || b.isSelfHosted;
      const aFree = a.isFree;
      const bFree = b.isFree;
      const aPriority = a.priority || a.priorityOrder || 100;
      const bPriority = b.priority || b.priorityOrder || 100;
      
      if (aSelfHosted && !bSelfHosted) return -1;
      if (!aSelfHosted && bSelfHosted) return 1;
      if (aFree && !bFree) return -1;
      if (!aFree && bFree) return 1;
      
      // Then by priority order
      return aPriority - bPriority;
    });

    // Check budget constraints
    for (const model of candidates) {
      const estimatedCost = this.calculateEstimatedCost(model, estimatedTokens);
      
      if (requirements.maxCost && estimatedCost > requirements.maxCost) {
        continue;
      }

      const canAfford = await this.costTracker.canMakeRequest(estimatedCost);
      if (!canAfford) {
        continue;
      }

      return {
        provider: model.provider,
        model: model.model,
        estimatedCost,
        reason: this.getSelectionReason(model, requirements),
        isSelfHosted: model.is_self_hosted || model.isSelfHosted || false,
        endpoint: this.getModelEndpoint(model)
      };
    }

    // If no suitable model found within budget, suggest the cheapest option
    const cheapest = candidates[0];
    if (cheapest) {
      return {
        provider: cheapest.provider,
        model: cheapest.model,
        estimatedCost: this.calculateEstimatedCost(cheapest, estimatedTokens),
        reason: 'Budget exceeded - this is the most cost-effective option',
        isSelfHosted: cheapest.is_self_hosted || cheapest.isSelfHosted || false,
        endpoint: this.getModelEndpoint(cheapest)
      };
    }

    throw new Error('No suitable models available for this task');
  }

  private isModelSuitableForTask(model: ModelInfo, requirements: TaskRequirements): boolean {
    // Define model capabilities
    const modelCapabilities = this.getModelCapabilities(model);
    
    switch (requirements.type) {
      case 'code':
        return modelCapabilities.coding >= this.getRequiredCapabilityLevel(requirements.complexity);
      case 'reasoning':
        return modelCapabilities.reasoning >= this.getRequiredCapabilityLevel(requirements.complexity);
      case 'image':
        return modelCapabilities.vision || model.provider === 'huggingface';
      case 'voice':
        return model.provider === 'elevenlabs' || model.provider === 'openai';
      case 'text':
      case 'general':
      default:
        return modelCapabilities.general >= this.getRequiredCapabilityLevel(requirements.complexity);
    }
  }

  private getModelCapabilities(model: ModelInfo): { general: number; coding: number; reasoning: number; vision: boolean } {
    // Define capabilities for each model
    const capabilities: Record<string, { general: number; coding: number; reasoning: number; vision: boolean }> = {
      // Self-hosted H100 models
      'h100-llama-3.1-70b': { general: 9, coding: 9, reasoning: 8, vision: false },
      'h100-llama-3.1-8b': { general: 7, coding: 7, reasoning: 6, vision: false },
      'h100-codestral': { general: 6, coding: 10, reasoning: 7, vision: false },
      
      // Together.ai models
      'together-meta-llama/Llama-3.1-8B-Instruct-Turbo': { general: 7, coding: 7, reasoning: 6, vision: false },
      'together-meta-llama/Llama-3.1-70B-Instruct-Turbo': { general: 9, coding: 8, reasoning: 8, vision: false },
      
      // OpenAI models
      'openai-gpt-4.1-2025-04-14': { general: 10, coding: 9, reasoning: 9, vision: true },
      'openai-o3-2025-04-16': { general: 10, coding: 10, reasoning: 10, vision: true },
      'openai-gpt-4o-mini': { general: 8, coding: 7, reasoning: 7, vision: true },
      
      // Anthropic models
      'anthropic-claude-sonnet-4-20250514': { general: 10, coding: 9, reasoning: 10, vision: true },
      'anthropic-claude-opus-4-20250514': { general: 10, coding: 10, reasoning: 10, vision: true },
      'anthropic-claude-3-5-haiku-20241022': { general: 8, coding: 7, reasoning: 7, vision: true },
    };

    const key = `${model.provider}-${model.model}`;
    return capabilities[key] || { general: 5, coding: 5, reasoning: 5, vision: false };
  }

  private getRequiredCapabilityLevel(complexity: string): number {
    switch (complexity) {
      case 'low': return 6;
      case 'medium': return 7;
      case 'high': return 9;
      default: return 6;
    }
  }

  private calculateEstimatedCost(model: ModelInfo, estimatedTokens: number): number {
    const isFree = model.isFree;
    const isSelfHosted = model.is_self_hosted || model.isSelfHosted;
    
    if (isFree || isSelfHosted) return 0;
    
    // Assume 70% input, 30% output token distribution
    const inputTokens = estimatedTokens * 0.7;
    const outputTokens = estimatedTokens * 0.3;
    
    const inputCost = (inputTokens / 1000) * (model.inputCostPer1k || model.cost || 0);
    const outputCost = (outputTokens / 1000) * (model.outputCostPer1k || model.cost || 0);
    
    return inputCost + outputCost;
  }

  private getSelectionReason(model: ModelInfo, requirements: TaskRequirements): string {
    const isSelfHosted = model.is_self_hosted || model.isSelfHosted;
    const isFree = model.isFree;
    
    if (isSelfHosted) {
      return `Self-hosted ${model.model} - No API costs, maximum privacy`;
    }
    if (isFree) {
      return `Free ${model.model} - No cost for this request`;
    }
    
    const qualityMap = {
      'low': 'basic',
      'medium': 'standard', 
      'high': 'premium'
    };
    
    return `${model.model} - Optimal balance of ${qualityMap[requirements.complexity] || 'standard'} quality and cost`;
  }

  private getModelEndpoint(model: ModelInfo): string | undefined {
    const isSelfHosted = model.is_self_hosted || model.isSelfHosted;
    if (isSelfHosted && model.provider === 'h100') {
      // Environment variables are not available in frontend context
      // This should be handled by the edge function instead
      return 'http://159.26.94.122:8080';
    }
    return undefined;
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    await this.loadModelPricing();
    return this.modelPricing;
  }

  async getModelStats(userId: string): Promise<{ provider: string; model: string; totalCost: number; requestCount: number; successRate: number; successCount: number }[]> {
    const { data, error } = await supabase
      .from('api_usage')
      .select('provider, model, cost_usd, success')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const stats = data.reduce((acc: Record<string, { provider: string; model: string; totalCost: number; requestCount: number; successRate: number; successCount: number }>, usage) => {
      const key = `${usage.provider}-${usage.model}`;
      if (!acc[key]) {
        acc[key] = {
          provider: usage.provider,
          model: usage.model,
          totalCost: 0,
          requestCount: 0,
          successRate: 0,
          successCount: 0
        };
      }
      
      acc[key].totalCost += Number(usage.cost_usd);
      acc[key].requestCount++;
      if (usage.success) {
        acc[key].successCount++;
      }
      acc[key].successRate = (acc[key].successCount / acc[key].requestCount) * 100;
      
      return acc;
    }, {});

    return Object.values(stats);
  }
}