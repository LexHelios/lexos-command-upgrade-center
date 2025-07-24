import { Hono } from 'hono';
import { z } from 'zod';

const orchestratorRouter = new Hono();

// Define agent types and their preferred models
const AGENT_MODELS = {
  'reasoning': ['command-r-plus', 'gemma-2-27b', 'am-thinking-v1-32b'],
  'coding': ['command-r-plus', 'gemma-2-27b', 'am-thinking-v1-32b'],
  'planning': ['command-r-plus', 'gemma-2-27b', 'mistral-magistral-small-24b'],
  'research': ['command-r-plus', 'llama-3.3-70b-versatile'],
  'creative': ['command-r-plus', 'stheno-llama-13b', 'mythomax-l2-13b'],
  'analysis': ['gemma-2-27b', 'command-r-plus', 'am-thinking-v1-32b']
};

const orchestratorRequestSchema = z.object({
  task: z.string(),
  agents: z.array(z.enum(['reasoning', 'coding', 'planning', 'research', 'creative', 'analysis'])).optional(),
  max_steps: z.number().min(1).max(10).optional().default(5),
  model_preference: z.enum(['command-r-plus', 'gemma-2-27b', 'auto']).optional().default('auto')
});

// Task state management
interface TaskState {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  steps: Array<{
    agent: string;
    model: string;
    input: string;
    output: string;
    timestamp: Date;
  }>;
  result?: string;
  error?: string;
}

const tasks = new Map<string, TaskState>();

// Call AI with specific model
async function callAI(prompt: string, model: string, taskType: string = 'general') {
  try {
    const response = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        task_type: taskType,
        complexity: 'high',
        quality: 'premium',
        prefer_self_hosted: true,
        model // Hint which model to use
      })
    });
    
    if (response.ok) {
      const data = await response.json() as any;
      return {
        result: data.result,
        model_used: data.model_used?.model || model
      };
    }
    
    throw new Error('AI call failed');
  } catch (error) {
    console.error('AI call error:', error);
    return null;
  }
}

orchestratorRouter.post('/execute', async (c) => {
  try {
    const body = await c.req.json();
    const request = orchestratorRequestSchema.parse(body);
    
    const taskId = crypto.randomUUID();
    const taskState: TaskState = {
      id: taskId,
      status: 'running',
      steps: []
    };
    
    tasks.set(taskId, taskState);
    
    // Determine which agents to use
    const agents = request.agents || ['planning', 'reasoning', 'coding'];
    
    // Select model based on preference
    let preferredModel = request.model_preference === 'auto' 
      ? 'command-r-plus' // Default to Command R+ for orchestration
      : request.model_preference;
    
    // Step 1: Planning Agent
    if (agents.includes('planning')) {
      const plannerModel = AGENT_MODELS.planning[0];
      const plannerPrompt = `You are a planning agent using ${plannerModel}. Break down this task into clear steps:

Task: ${request.task}

Provide a numbered list of steps to accomplish this task. Be specific and actionable.`;
      
      const planResult = await callAI(plannerPrompt, preferredModel || plannerModel, 'reasoning');
      
      if (planResult) {
        taskState.steps.push({
          agent: 'planning',
          model: planResult.model_used,
          input: request.task,
          output: planResult.result,
          timestamp: new Date()
        });
      }
    }
    
    // Step 2: Reasoning Agent
    if (agents.includes('reasoning') && taskState.steps.length > 0) {
      const reasoningModel = request.model_preference === 'gemma-2-27b' ? 'gemma-2-27b' : 'command-r-plus';
      const previousOutput = taskState.steps[taskState.steps.length - 1].output;
      const reasoningPrompt = `You are a reasoning agent using ${reasoningModel}. Analyze this plan and identify potential challenges or improvements:

Original Task: ${request.task}

Plan:
${previousOutput}

Provide insights on how to best execute this plan, potential issues, and optimizations.`;
      
      const reasonResult = await callAI(reasoningPrompt, reasoningModel, 'reasoning');
      
      if (reasonResult) {
        taskState.steps.push({
          agent: 'reasoning',
          model: reasonResult.model_used,
          input: previousOutput,
          output: reasonResult.result,
          timestamp: new Date()
        });
      }
    }
    
    // Step 3: Execution Agent (Coding/Creative/Analysis based on task)
    const executionAgent = agents.find(a => ['coding', 'creative', 'analysis'].includes(a)) || 'coding';
    if (agents.includes(executionAgent)) {
      const executionModel = AGENT_MODELS[executionAgent][0];
      const context = taskState.steps.map(s => `${s.agent}: ${s.output}`).join('\n\n');
      const executionPrompt = `You are a ${executionAgent} agent using ${executionModel}. Execute the following task based on the planning and reasoning:

Original Task: ${request.task}

Context from other agents:
${context}

Now provide the actual implementation, solution, or analysis as requested.`;
      
      const execResult = await callAI(executionPrompt, preferredModel || executionModel, executionAgent === 'coding' ? 'code' : 'general');
      
      if (execResult) {
        taskState.steps.push({
          agent: executionAgent,
          model: execResult.model_used,
          input: context,
          output: execResult.result,
          timestamp: new Date()
        });
        
        taskState.result = execResult.result;
      }
    }
    
    // Update task status
    taskState.status = taskState.result ? 'completed' : 'failed';
    
    return c.json({
      task_id: taskId,
      status: taskState.status,
      steps: taskState.steps,
      result: taskState.result,
      models_used: taskState.steps.map(s => s.model),
      message: `Task orchestrated using ${taskState.steps.length} agents with models: ${taskState.steps.map(s => s.model).join(', ')}`
    });
    
  } catch (error) {
    console.error('Orchestrator error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: errorMessage }, 500);
  }
});

// Get task status
orchestratorRouter.get('/task/:id', async (c) => {
  const taskId = c.req.param('id');
  const task = tasks.get(taskId);
  
  if (!task) {
    return c.json({ error: 'Task not found' }, 404);
  }
  
  return c.json(task);
});

// List available models
orchestratorRouter.get('/models', async (c) => {
  return c.json({
    models: {
      primary: {
        'command-r-plus': {
          name: 'Cohere Command R+',
          capabilities: ['reasoning', 'coding', 'planning', 'analysis', 'creative'],
          context_window: 131072,
          description: 'State-of-the-art model for complex reasoning and long-context tasks'
        },
        'gemma-2-27b': {
          name: 'Google Gemma 2 27B',
          capabilities: ['reasoning', 'coding', 'analysis'],
          context_window: 8192,
          description: 'Efficient and powerful model from Google optimized for performance'
        }
      },
      agents: AGENT_MODELS
    }
  });
});

// Health check for orchestrator
orchestratorRouter.get('/health', async (c) => {
  // Check if AI service is available
  try {
    const response = await fetch('http://localhost:3000/api/ai/status');
    const status = await response.json() as any;
    
    const commandRAvailable = status.tier1_h100?.models?.some((m: any) => m.name === 'command-r-plus');
    const gemmaAvailable = status.tier1_h100?.models?.some((m: any) => m.name === 'gemma-2-27b');
    
    return c.json({
      status: 'healthy',
      models: {
        'command-r-plus': commandRAvailable ? 'available' : 'not installed',
        'gemma-2-27b': gemmaAvailable ? 'available' : 'not installed'
      },
      active_tasks: tasks.size
    });
  } catch (error) {
    return c.json({
      status: 'unhealthy',
      error: 'Cannot connect to AI service'
    }, 503);
  }
});

// Manage tasks - create, list, delete
orchestratorRouter.post('/tasks', async (c) => {
  try {
    const { name, description, priority = 'medium' } = await c.req.json();
    
    const task = {
      id: crypto.randomUUID(),
      name,
      description,
      priority,
      status: 'pending',
      created: new Date().toISOString()
    };
    
    // In a real implementation, this would persist to a database
    return c.json(task);
  } catch (error) {
    return c.json({ error: 'Failed to create task' }, 500);
  }
});

orchestratorRouter.get('/tasks', async (c) => {
  // Return mock tasks for now
  return c.json([
    {
      id: '1',
      name: 'Review code changes',
      description: 'Review PR #123',
      priority: 'high',
      status: 'in_progress',
      created: new Date().toISOString()
    },
    {
      id: '2', 
      name: 'Update documentation',
      description: 'Update API docs for v2',
      priority: 'medium',
      status: 'pending',
      created: new Date().toISOString()
    }
  ]);
});

export default orchestratorRouter;