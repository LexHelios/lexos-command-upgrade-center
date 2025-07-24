import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { ValidationUtils, ValidationError } from '../../../src/utils/ValidationUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  try {
    console.log("Starting WebSocket connection for orchestrator");
    
    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { socket, response } = Deno.upgradeWebSocket(req);
    
    // Connect to OpenAI Realtime API
    const openAISocket = new WebSocket(
      `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`,
      {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      }
    );

    // Handle OpenAI connection
    openAISocket.onopen = () => {
      console.log("Connected to OpenAI Realtime API");
      
      // Send session configuration
      openAISocket.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: `You are LexOS, an advanced AI orchestrator agent. You can:
          
1. Control and coordinate various AI agents and systems
2. Execute tasks through web browsing, file management, and system operations
3. Access real-time data and perform web searches
4. Manage costs and monitor system performance
5. Handle medical data analysis and documentation
6. Coordinate with specialized agents like the ShadowAgent

Available tools you can invoke:
- web_search: Search the internet for current information
- browser_control: Control web browsers and interact with websites
- file_operations: Manage files and documents
- system_monitor: Check system status and performance
- cost_analysis: Monitor API usage and costs
- medical_analysis: Process medical data and documentation
- h100_compute: Access high-performance computing resources

When users give you tasks, break them down into actionable steps and execute them using the appropriate tools. Always confirm understanding before proceeding with complex operations.

Speak naturally and conversationally. Be helpful, efficient, and proactive in suggesting solutions.`,
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 1000
          },
          tools: [
            {
              type: 'function',
              name: 'web_search',
              description: 'Search the internet for current information',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search query' },
                  num_results: { type: 'number', description: 'Number of results to return', default: 5 }
                },
                required: ['query']
              }
            },
            {
              type: 'function',
              name: 'browser_control',
              description: 'Control web browser and interact with websites',
              parameters: {
                type: 'object',
                properties: {
                  action: { type: 'string', enum: ['navigate', 'click', 'type', 'scroll', 'screenshot'] },
                  target: { type: 'string', description: 'URL or CSS selector' },
                  value: { type: 'string', description: 'Text to type or scroll amount' }
                },
                required: ['action']
              }
            },
            {
              type: 'function',
              name: 'system_status',
              description: 'Get current system status and performance metrics',
              parameters: {
                type: 'object',
                properties: {
                  component: { type: 'string', enum: ['all', 'h100', 'costs', 'agents'] }
                }
              }
            },
            {
              type: 'function',
              name: 'smart_ai_call',
              description: 'Make an intelligent AI API call using the smart router',
              parameters: {
                type: 'object',
                properties: {
                  prompt: { type: 'string', description: 'The prompt to send to the AI' },
                  task_type: { type: 'string', enum: ['text', 'code', 'reasoning', 'general'], default: 'general' },
                  complexity: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
                  quality: { type: 'string', enum: ['basic', 'standard', 'premium'], default: 'standard' }
                },
                required: ['prompt']
              }
            }
          ],
          tool_choice: 'auto',
          temperature: 0.8,
          max_response_output_tokens: 'inf'
        }
      }));
    };

    // Forward messages between client and OpenAI
    socket.onmessage = (event) => {
      console.log("Client message:", event.data);
      openAISocket.send(event.data);
    };

    openAISocket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      console.log("OpenAI message type:", data.type);

    // Handle function calls
      if (data.type === 'response.function_call_arguments.done') {
        const { call_id, name, arguments: args } = data;
        console.log('Function call received:', { call_id, name, args });
        
        try {
          const parsedArgs = JSON.parse(args);
          let result = null;

          // Validate function call arguments
          switch (name) {
            case 'web_search': {
              const query = ValidationUtils.validateString(parsedArgs.query, 'query', { required: true, minLength: 1 });
              const numResults = ValidationUtils.validateNumber(parsedArgs.num_results, 'num_results', { required: false, min: 1, max: 10, integer: true });
              console.log("Executing web search:", query);
              const searchResponse = await supabase.functions.invoke('web-search', {
                body: { query: query, numResults: numResults || 5 }
              });
              result = searchResponse.data;
              break;
            }
              
            case 'browser_control': {
              const action = ValidationUtils.validateString(parsedArgs.action, 'action', { required: true, pattern: /^(navigate|click|type|scroll|screenshot)$/ });
              const target = ValidationUtils.validateString(parsedArgs.target, 'target', { required: false });
              const value = ValidationUtils.validateString(parsedArgs.value, 'value', { required: false });
              console.log("Executing browser control:", { action, target, value });
              const browserResponse = await supabase.functions.invoke('browser-agent', {
                body: { action: action, target: target, value: value }
              });
              result = browserResponse.data;
              break;
            }
              
            case 'system_status': {
              const component = ValidationUtils.validateString(parsedArgs.component, 'component', { required: false, pattern: /^(all|h100|costs|agents)$/ });
              console.log("Getting system status");
              const { data: h100Config } = await supabase.from('h100_config').select('*').limit(1).single();
              const { data: costData } = await supabase.from('cost_limits').select('*').limit(1).single();
              result = {
                h100_status: h100Config ? 'configured' : 'not_configured',
                current_costs: costData?.current_month_spend || 0,
                cost_limit: costData?.monthly_limit_usd || 500,
                timestamp: new Date().toISOString()
              };
              break;
            }
              
            case 'smart_ai_call': {
              const prompt = ValidationUtils.validateString(parsedArgs.prompt, 'prompt', { required: true, minLength: 1 });
              const taskType = ValidationUtils.validateString(parsedArgs.task_type, 'task_type', { required: false, pattern: /^(text|code|reasoning|general)$/ });
              const complexity = ValidationUtils.validateString(parsedArgs.complexity, 'complexity', { required: false, pattern: /^(low|medium|high)$/ });
              const quality = ValidationUtils.validateString(parsedArgs.quality, 'quality', { required: false, pattern: /^(basic|standard|premium)$/ });
              console.log("Making smart AI call:", prompt);
              const aiResponse = await supabase.functions.invoke('smart-ai-router', {
                body: {
                  prompt: prompt,
                  task_type: taskType || 'general',
                  complexity: complexity || 'medium',
                  quality: quality || 'standard'
                }
              });
              result = aiResponse.data;
              break;
            }
              
            default:
              result = { error: 'Unknown function', function: name };
          }

          // Send function result back to OpenAI
          openAISocket.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: call_id,
              output: JSON.stringify(result)
            }
          }));
          
          // Trigger response generation
          openAISocket.send(JSON.stringify({ type: 'response.create' }));
          
        } catch (error) {
          console.error('Function execution error:', error);
          openAISocket.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: call_id,
              output: JSON.stringify({ error: error.message })
            }
          }));
        }
      }
      
      // Forward all messages to client
      socket.send(event.data);
    };

    openAISocket.onerror = (error) => {
      console.error("OpenAI WebSocket error:", error);
      socket.close(1011, "OpenAI connection error");
    };

    openAISocket.onclose = () => {
      console.log("OpenAI WebSocket closed");
      socket.close();
    };

    socket.onclose = () => {
      console.log("Client WebSocket closed");
      openAISocket.close();
    };

    socket.onerror = (error) => {
      console.error("Client WebSocket error:", error);
      openAISocket.close();
    };

    return response;

  } catch (error) {
    console.error('WebSocket setup error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});