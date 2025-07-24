import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ValidationUtils, ValidationError } from '../../../src/utils/ValidationUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, numResults } = await req.json();

    const validatedQuery = ValidationUtils.validateString(query, 'query', { required: true, minLength: 1, maxLength: 1000 });
    const validatedNumResults = ValidationUtils.validateNumber(numResults, 'numResults', { required: false, min: 1, max: 10, integer: true });

    // Use Perplexity API for web search
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY') || Deno.env.get('Perplexity API Key');
    if (!perplexityApiKey) {
      throw new Error('Perplexity API key not configured');
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a web search assistant. Provide accurate, current information based on your search capabilities. Include relevant sources and be concise but comprehensive.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1000,
        return_images: false,
        return_related_questions: true,
        search_recency_filter: 'month'
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Perplexity API error: ${error.error?.message || 'Search failed'}`);
    }

    const data = await response.json();
    const searchResult = data.choices[0].message.content;

    // Log the search for analytics
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (user) {
      await supabase
        .from('api_usage')
        .insert({
          user_id: user.id,
          function_name: 'web-search',
          model_used: 'perplexity/llama-3.1-sonar-small',
          input_tokens: query.length,
          output_tokens: searchResult.length,
          cost: 0.001, // Approximate cost
          metadata: { query, num_results: numResults }
        });
    }

    return new Response(
      JSON.stringify({ 
        result: searchResult,
        query,
        timestamp: new Date().toISOString(),
        source: 'Perplexity Search'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Web Search Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});