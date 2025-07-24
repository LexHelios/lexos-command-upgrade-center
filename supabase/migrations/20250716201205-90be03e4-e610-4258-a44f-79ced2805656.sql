-- Populate model pricing data with your available models
INSERT INTO model_pricing (provider, model, input_cost_per_1k, output_cost_per_1k, is_free, is_self_hosted, priority_order) VALUES
-- Self-hosted models (highest priority)
('lexcommand', 'llama-3.3-405b', 0, 0, true, true, 1),
('lexcommand', 'llama-3.1-70b', 0, 0, true, true, 2),
('lexcommand', 'deepseek-v3', 0, 0, true, true, 3),

-- Free/Open models (medium priority)
('together', 'llama-3.3-70b', 0, 0, true, false, 10),
('together', 'qwen-2.5-72b', 0, 0, true, false, 11),
('together', 'mixtral-8x7b', 0, 0, true, false, 12),

-- Premium models (lowest priority, used when quality is critical)
('openai', 'gpt-4.1-2025-04-14', 0.01, 0.03, false, false, 50),
('openai', 'o4-mini-2025-04-16', 0.003, 0.012, false, false, 51),
('anthropic', 'claude-sonnet-4-20250514', 0.003, 0.015, false, false, 52),
('anthropic', 'claude-opus-4-20250514', 0.015, 0.075, false, false, 53),
('openrouter', 'google/gemini-2.0-flash-exp', 0.001, 0.002, false, false, 54),

-- ElevenLabs for voice
('elevenlabs', 'eleven-monolingual-v1', 0, 0.3, false, false, 60);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_model_pricing_priority ON model_pricing(priority_order);
CREATE INDEX IF NOT EXISTS idx_model_pricing_provider_model ON model_pricing(provider, model);