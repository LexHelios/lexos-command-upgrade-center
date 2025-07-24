-- Add Grok 3 & Grok 4 models with real-time capabilities
INSERT INTO public.model_pricing (provider, model, input_cost_per_1k, output_cost_per_1k, is_free, is_self_hosted, priority_order) VALUES
('xai', 'grok-3', 0.0005, 0.0015, false, false, 15),
('xai', 'grok-4', 0.001, 0.003, false, false, 14);

-- Add metadata column to track model capabilities
ALTER TABLE public.model_pricing 
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{}';

-- Update Grok models with real-time capabilities
UPDATE public.model_pricing 
SET capabilities = '{"real_time": true, "web_search": true, "trending_data": true, "live_responses": true}'
WHERE provider = 'xai';