-- Create API usage tracking table
CREATE TABLE public.api_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  request_count INTEGER DEFAULT 1,
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cost limits table
CREATE TABLE public.cost_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  monthly_limit_usd DECIMAL(10, 2) DEFAULT 500.00,
  current_month_spend DECIMAL(10, 2) DEFAULT 0,
  alert_threshold DECIMAL(3, 2) DEFAULT 0.80, -- Alert at 80%
  hard_limit_reached BOOLEAN DEFAULT false,
  reset_date DATE DEFAULT (date_trunc('month', now()) + interval '1 month')::date,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create model pricing table
CREATE TABLE public.model_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_cost_per_1k DECIMAL(10, 6) DEFAULT 0, -- Cost per 1K input tokens
  output_cost_per_1k DECIMAL(10, 6) DEFAULT 0, -- Cost per 1K output tokens
  is_free BOOLEAN DEFAULT false,
  is_self_hosted BOOLEAN DEFAULT false,
  priority_order INTEGER DEFAULT 100, -- Lower = higher priority
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(provider, model)
);

-- Insert model pricing data
INSERT INTO public.model_pricing (provider, model, input_cost_per_1k, output_cost_per_1k, is_free, is_self_hosted, priority_order) VALUES
-- Self-hosted (highest priority)
('h100', 'llama-3.1-70b', 0, 0, true, true, 1),
('h100', 'llama-3.1-8b', 0, 0, true, true, 2),
('h100', 'codestral', 0, 0, true, true, 3),

-- Free/Open Source models (high priority)
('together', 'meta-llama/Llama-3.1-8B-Instruct-Turbo', 0.18, 0.18, false, false, 10),
('together', 'meta-llama/Llama-3.1-70B-Instruct-Turbo', 0.88, 0.88, false, false, 11),
('huggingface', 'black-forest-labs/FLUX.1-schnell', 0, 0, true, false, 12),

-- Premium models (lower priority, higher cost)
('openai', 'gpt-4.1-2025-04-14', 2.50, 10.00, false, false, 50),
('openai', 'o3-2025-04-16', 15.00, 60.00, false, false, 51),
('anthropic', 'claude-sonnet-4-20250514', 3.00, 15.00, false, false, 52),
('anthropic', 'claude-opus-4-20250514', 15.00, 75.00, false, false, 53),

-- Medium cost models
('openai', 'gpt-4o-mini', 0.15, 0.60, false, false, 30),
('anthropic', 'claude-3-5-haiku-20241022', 0.25, 1.25, false, false, 31),
('grok', 'grok-2-1212', 2.00, 10.00, false, false, 32);

-- Enable RLS
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_usage
CREATE POLICY "Users can view their own API usage" 
ON public.api_usage FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API usage" 
ON public.api_usage FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for cost_limits
CREATE POLICY "Users can view their own cost limits" 
ON public.cost_limits FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own cost limits" 
ON public.cost_limits FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cost limits" 
ON public.cost_limits FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for model_pricing (public read-only)
CREATE POLICY "Everyone can view model pricing" 
ON public.model_pricing FOR SELECT 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_api_usage_user_created ON public.api_usage(user_id, created_at);
CREATE INDEX idx_api_usage_provider_model ON public.api_usage(provider, model);
CREATE INDEX idx_cost_limits_user ON public.cost_limits(user_id);
CREATE INDEX idx_model_pricing_priority ON public.model_pricing(priority_order);

-- Create trigger for cost_limits updated_at
CREATE TRIGGER update_cost_limits_updated_at
BEFORE UPDATE ON public.cost_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for model_pricing updated_at
CREATE TRIGGER update_model_pricing_updated_at
BEFORE UPDATE ON public.model_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();