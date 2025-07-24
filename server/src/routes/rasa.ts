import { Hono } from 'hono';
import fetch from 'node-fetch';

const rasaRouter = new Hono();

// Rasa server configuration
const RASA_REST_URL = process.env.RASA_REST_URL || 'http://localhost:5005';
const RASA_ACTION_URL = process.env.RASA_ACTION_URL || 'http://localhost:5055';

// Send message to Rasa
rasaRouter.post('/message', async (c) => {
  try {
    const { message, sender = 'default' } = await c.req.json();
    
    // Send message to Rasa
    const response = await fetch(`${RASA_REST_URL}/webhooks/rest/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender,
        message
      })
    });
    
    if (response.ok) {
      const messages = await response.json() as any[];
      return c.json({ messages });
    } else {
      const error = await response.text();
      console.error('Rasa error:', error);
      return c.json({ error: 'Failed to get response from Rasa' }, 500);
    }
  } catch (error) {
    console.error('Rasa connection error:', error);
    return c.json({ 
      error: 'Could not connect to Rasa. Make sure Rasa server is running.',
      fallback: true 
    }, 503);
  }
});

// Get conversation tracker
rasaRouter.get('/conversations/:senderId/tracker', async (c) => {
  try {
    const senderId = c.req.param('senderId');
    
    const response = await fetch(`${RASA_REST_URL}/conversations/${senderId}/tracker`);
    
    if (response.ok) {
      const tracker = await response.json();
      return c.json(tracker);
    } else {
      return c.json({ error: 'Failed to get tracker' }, 500);
    }
  } catch (error) {
    console.error('Rasa tracker error:', error);
    return c.json({ error: 'Could not retrieve conversation tracker' }, 503);
  }
});

// Predict next action
rasaRouter.post('/conversations/:senderId/predict', async (c) => {
  try {
    const senderId = c.req.param('senderId');
    
    const response = await fetch(`${RASA_REST_URL}/conversations/${senderId}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const prediction = await response.json();
      return c.json(prediction);
    } else {
      return c.json({ error: 'Failed to predict next action' }, 500);
    }
  } catch (error) {
    console.error('Rasa prediction error:', error);
    return c.json({ error: 'Could not predict next action' }, 503);
  }
});

// Execute action
rasaRouter.post('/conversations/:senderId/execute', async (c) => {
  try {
    const senderId = c.req.param('senderId');
    const { name } = await c.req.json();
    
    const response = await fetch(`${RASA_REST_URL}/conversations/${senderId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    if (response.ok) {
      const result = await response.json();
      return c.json(result);
    } else {
      return c.json({ error: 'Failed to execute action' }, 500);
    }
  } catch (error) {
    console.error('Rasa execution error:', error);
    return c.json({ error: 'Could not execute action' }, 503);
  }
});

// Health check for Rasa
rasaRouter.get('/health', async (c) => {
  try {
    const [coreResponse, actionResponse] = await Promise.allSettled([
      fetch(`${RASA_REST_URL}/`),
      fetch(`${RASA_ACTION_URL}/health`)
    ]);
    
    return c.json({
      core: coreResponse.status === 'fulfilled' && coreResponse.value.ok,
      actions: actionResponse.status === 'fulfilled' && actionResponse.value.ok,
      status: 'checking'
    });
  } catch (error) {
    return c.json({
      core: false,
      actions: false,
      status: 'error',
      error: error.message
    });
  }
});

// Train model
rasaRouter.post('/model/train', async (c) => {
  try {
    const response = await fetch(`${RASA_REST_URL}/model/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const result = await response.json();
      return c.json(result);
    } else {
      return c.json({ error: 'Failed to train model' }, 500);
    }
  } catch (error) {
    console.error('Rasa training error:', error);
    return c.json({ error: 'Could not train model' }, 503);
  }
});

// Rasa status endpoint
rasaRouter.get('/status', (c) => {
  return c.json({
    status: 'active',
    intents: ['greeting', 'goodbye', 'help', 'task_management'],
    confidence_threshold: 0.7
  } as any);
});

export default rasaRouter;