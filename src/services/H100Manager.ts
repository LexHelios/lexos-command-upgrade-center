import { from, auth } from '@/integrations/supabase/client';

export interface H100Config {
  id?: string;
  user_id?: string;
  h100_endpoint?: string;
  h100_api_key?: string;
  preferred_models: string[];
  fallback_to_cloud: boolean;
  auto_failover: boolean;
  max_retry_attempts: number;
  health_check_interval: number;
}

export interface H100Status {
  online: boolean;
  models_available: string[];
  response_time_ms: number;
  error?: string;
  last_check: Date;
}

export class H100Manager {
  private static instance: H100Manager;
  private config: H100Config | null = null;
  private status: H100Status | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  static getInstance(): H100Manager {
    if (!H100Manager.instance) {
      H100Manager.instance = new H100Manager();
    }
    return H100Manager.instance;
  }

  async loadConfig(): Promise<H100Config | null> {
    try {
      // Get user from localStorage (set during login)
      const userJson = localStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;
      if (!user) return null;

      const { data, error } = await from('h100_config')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading H100 config:', error);
        return null;
      }

      if (data) {
        // Handle JSONB conversion for preferred_models
        const config: H100Config = {
          ...data,
          preferred_models: Array.isArray(data.preferred_models) 
            ? data.preferred_models as string[]
            : (typeof data.preferred_models === 'string' 
                ? JSON.parse(data.preferred_models) as string[]
                : [])
        };
        this.config = config;
        return config;
      }

      return null;
    } catch (error) {
      console.error('Error loading H100 config:', error);
      return null;
    }
  }

  async saveConfig(config: Partial<H100Config>): Promise<boolean> {
    try {
      // Get user from localStorage (set during login)
      const userJson = localStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;
      if (!user) return false;

      const configData = {
        ...config,
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      const { error } = await from('h100_config')
        .insert(configData)
        .execute();

      if (error) {
        console.error('Error saving H100 config:', error);
        return false;
      }

      this.config = { ...this.config, ...configData } as H100Config;
      return true;
    } catch (error) {
      console.error('Error saving H100 config:', error);
      return false;
    }
  }

  async checkH100Health(): Promise<H100Status> {
    if (!this.config?.h100_endpoint) {
      return {
        online: false,
        models_available: [],
        response_time_ms: 0,
        error: 'No H100 endpoint configured',
        last_check: new Date()
      };
    }

    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.config.h100_endpoint}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.h100_api_key}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        this.status = {
          online: true,
          models_available: data.models || [],
          response_time_ms: responseTime,
          last_check: new Date()
        };
      } else {
        this.status = {
          online: false,
          models_available: [],
          response_time_ms: responseTime,
          error: `HTTP ${response.status}`,
          last_check: new Date()
        };
      }
    } catch (error) {
      this.status = {
        online: false,
        models_available: [],
        response_time_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        last_check: new Date()
      };
    }

    return this.status;
  }

  startHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const interval = (this.config?.health_check_interval || 30) * 1000;
    this.healthCheckInterval = setInterval(async () => {
      await this.checkH100Health();
    }, interval);
  }

  stopHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  isH100Available(): boolean {
    return this.status?.online === true;
  }

  shouldUseH100(modelName: string): boolean {
    if (!this.isH100Available()) return false;
    if (!this.config?.preferred_models.includes(modelName)) return false;
    return true;
  }

  async callH100API(endpoint: string, payload: unknown): Promise<unknown> {
    if (!this.config?.h100_endpoint) {
      throw new Error('H100 endpoint not configured');
    }

    const maxRetries = this.config.max_retry_attempts || 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.config.h100_endpoint}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.h100_api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        if (response.ok) {
          return await response.json();
        } else {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`H100 API attempt ${attempt}/${maxRetries} failed:`, lastError.message);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // If auto-failover is enabled and we have cloud fallback, don't throw
    if (this.config.auto_failover && this.config.fallback_to_cloud) {
      console.warn('H100 failed, will fallback to cloud models');
      return null; // Signal to use cloud fallback
    }

    throw lastError || new Error('H100 API failed after all retries');
  }

  getStatus(): H100Status | null {
    return this.status;
  }

  getConfig(): H100Config | null {
    return this.config;
  }
}

// Export singleton instance
export const h100Manager = H100Manager.getInstance();