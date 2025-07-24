-- Add H100 models to model_pricing table with highest priority
INSERT INTO model_pricing (provider, model, input_cost_per_1k, output_cost_per_1k, is_free, is_self_hosted, priority_order)
VALUES
  ('h100', 'llama-3.1-70b', 0, 0, true, true, 1),
  ('h100', 'llama-3.1-8b', 0, 0, true, true, 2)
ON CONFLICT (provider, model) DO UPDATE SET
  priority_order = EXCLUDED.priority_order,
  is_free = EXCLUDED.is_free,
  is_self_hosted = EXCLUDED.is_self_hosted;