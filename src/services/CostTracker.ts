import { from, auth } from '@/integrations/supabase/client';
import { errorLogger } from './ErrorLogger';
import { ValidationUtils } from '@/utils/ValidationUtils';

export interface ModelInfo {
  provider: string;
  model: string;
  cost: number;
  priority?: number;
  capabilities?: string[];
  h100_available?: boolean;
  is_self_hosted?: boolean;
  // Compatibility properties for ModelRouter
  inputCostPer1k?: number;
  outputCostPer1k?: number;
  isFree?: boolean;
  isSelfHosted?: boolean;
  priorityOrder?: number;
}

export interface UsageRecord {
  id?: string;
  user_id: string;
  provider: string;
  model: string;
  endpoint: string;
  tokens_used: number;
  cost_usd: number;
  request_count: number;
  response_time_ms?: number;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export class CostTracker {
  private static instance: CostTracker;
  private pendingRecords: UsageRecord[] = [];
  private batchTimer: number | null = null;
  private readonly BATCH_DELAY = 5000; // 5 seconds
  private readonly MAX_BATCH_SIZE = 50;

  static getInstance(): CostTracker {
    if (!CostTracker.instance) {
      CostTracker.instance = new CostTracker();
    }
    return CostTracker.instance;
  }

  async trackUsage(record: Omit<UsageRecord, 'id' | 'created_at'>): Promise<void> {
    try {
      // Validate input data
      const validatedRecord = this.validateUsageRecord(record);
      
      // Add to batch queue
      this.pendingRecords.push(validatedRecord);
      
      // Process batch if needed
      if (this.pendingRecords.length >= this.MAX_BATCH_SIZE) {
        await this.processBatch();
      } else {
        this.scheduleBatchProcessing();
      }
      
    } catch (error) {
      await errorLogger.error('Failed to track usage', { error, record }, 'CostTracker');
      throw error;
    }
  }

  private validateUsageRecord(record: Omit<UsageRecord, 'id' | 'created_at'>): UsageRecord {
    const errors: string[] = [];

    try {
      ValidationUtils.validateUUID(record.user_id, true);
    } catch {
      errors.push('Invalid user_id format');
    }
    
    try {
      ValidationUtils.validateString(record.provider, 'provider', { required: true, minLength: 1, maxLength: 100 });
    } catch {
      errors.push('Provider must be 1-100 characters');
    }
    
    try {
      ValidationUtils.validateString(record.model, 'model', { required: true, minLength: 1, maxLength: 100 });
    } catch {
      errors.push('Model must be 1-100 characters');
    }
    
    try {
      ValidationUtils.validateString(record.endpoint, 'endpoint', { required: true, minLength: 1, maxLength: 200 });
    } catch {
      errors.push('Endpoint must be 1-200 characters');
    }
    
    try {
      ValidationUtils.validateNumber(record.tokens_used, 'tokens_used', { required: true, min: 0 });
    } catch {
      errors.push('Tokens used must be >= 0');
    }
    
    try {
      ValidationUtils.validateNumber(record.cost_usd, 'cost_usd', { required: true, min: 0 });
    } catch {
      errors.push('Cost must be >= 0');
    }
    
    try {
      ValidationUtils.validateNumber(record.request_count, 'request_count', { required: true, min: 1 });
    } catch {
      errors.push('Request count must be >= 1');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return {
      ...record,
      tokens_used: Math.round(record.tokens_used),
      cost_usd: Number(record.cost_usd.toFixed(6)),
      request_count: Math.round(record.request_count),
      response_time_ms: record.response_time_ms ? Math.round(record.response_time_ms) : undefined,
      metadata: record.metadata || {}
    };
  }

  private scheduleBatchProcessing(): void {
    if (this.batchTimer) return;
    
    this.batchTimer = setTimeout(async () => {
      await this.processBatch();
    }, this.BATCH_DELAY);
  }

  private async processBatch(): Promise<void> {
    if (this.pendingRecords.length === 0) return;
    
    const records = [...this.pendingRecords];
    this.pendingRecords = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      const { error } = await from('api_usage')
        .insert(records)
        .execute();

      if (error) {
        await errorLogger.error('Failed to insert usage records batch`, { error, recordCount: records.length }, 'CostTracker');
        // Re-queue failed records for retry
        this.pendingRecords.unshift(...records);
        throw error;
      }

      await errorLogger.info(`Successfully tracked ${records.length} usage records`, { recordCount: records.length }, 'CostTracker');

    } catch (error) {
      await errorLogger.error('Batch processing failed`, { error, recordCount: records.length }, 'CostTracker');
      throw error;
    }
  }

  async getUserSpending(userId: string, timeframe: 'day' | 'week' | 'month' = 'month'): Promise<{
    total: number;
    by_provider: Record<string, number>;
    by_model: Record<string, number>;
    request_count: number;
  }> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      ValidationUtils.validateUUID(userId, true);

      const timeframeDays = timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : 30;
      const since = new Date();
      since.setDate(since.getDate() - timeframeDays);

      const { data, error } = await from('api_usage')
        .select('provider, model, cost_usd, request_count')
        .eq('user_id`, userId)
        .execute();

      if (error) throw error;

      const stats = {
        total: 0,
        by_provider: {} as Record<string, number>,
        by_model: {} as Record<string, number>,
        request_count: 0
      };

      data?.forEach(record => {
        const cost = Number(record.cost_usd) || 0;
        const requests = Number(record.request_count) || 0;
        
        stats.total += cost;
        stats.request_count += requests;
        stats.by_provider[record.provider] = (stats.by_provider[record.provider] || 0) + cost;
        stats.by_model[record.model] = (stats.by_model[record.model] || 0) + cost;
      });

      // Round to avoid floating point precision issues
      stats.total = Number(stats.total.toFixed(6));

      return stats;
    } catch (error) {
      await errorLogger.error('Failed to get user spending', { error, userId, timeframe }, 'CostTracker');
      throw error;
    }
  }

  async getModelPricing(): Promise<ModelInfo[]> {
    try {
      const { data, error } = await from('model_pricing')
        .select('*')
        .execute();

      if (error) throw error;

      return data?.map(item => ({
        provider: item.provider,
        model: item.model,
        cost: Number(item.input_cost_per_1k) || 0,
        priority: item.priority_order,
        capabilities: item.capabilities ? Object.keys(item.capabilities) : [],
        h100_available: item.h100_available || false,
        is_self_hosted: item.is_self_hosted || false
      })) || [];
    } catch (error) {
      await errorLogger.error('Failed to get model pricing', { error }, 'CostTracker');
      throw error;
    }
  }

  async canMakeRequest(estimatedCost: number, userId?: string): Promise<boolean> {
    try {
      if (!userId) {
        // If no user provided, allow the request (for system calls)
        return true;
      }

      const limits = await this.checkCostLimits(userId);
      return !limits.isOverLimit && (limits.remaining >= estimatedCost);
    } catch (error) {
      await errorLogger.error('Failed to check if request can be made', { error, estimatedCost, userId }, 'CostTracker');
      // Default to allowing the request if check fails
      return true;
    }
  }

  async checkCostLimits(userId: string): Promise<{
    limit: number;
    spent: number;
    remaining: number;
    isNearLimit: boolean;
    isOverLimit: boolean;
  }> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      ValidationUtils.validateUUID(userId, true);

      const { data: limitData, error: limitError } = await from('cost_limits')
        .select('monthly_limit_usd, current_month_spend, alert_threshold, hard_limit_reached')
        .eq('user_id', userId)
        .single();

      if (limitError) throw limitError;

      const limit = Number(limitData?.monthly_limit_usd) || 500;
      const spent = Number(limitData?.current_month_spend) || 0;
      const alertThreshold = Number(limitData?.alert_threshold) || 0.8;
      
      return {
        limit,
        spent,
        remaining: Math.max(0, limit - spent),
        isNearLimit: spent >= (limit * alertThreshold),
        isOverLimit: spent >= limit
      };
    } catch (error) {
      await errorLogger.error('Failed to check cost limits', { error, userId }, 'CostTracker');
      throw error;
    }
  }

  // Force process any pending records (useful for cleanup)
  async flush(): Promise<void> {
    if (this.pendingRecords.length > 0) {
      await this.processBatch();
    }
  }
}

export const costTracker = CostTracker.getInstance();