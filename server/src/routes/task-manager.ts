import { Hono } from 'hono';

export const taskManagerRouter = new Hono();

const tasks = new Map();

taskManagerRouter.get('/list', async (c) => {
  return c.json({
    tasks: Array.from(tasks.values()),
    total: tasks.size
  });
});

taskManagerRouter.post('/create', async (c) => {
  const task = await c.req.json();
  const id = Date.now().toString();
  
  const newTask = {
    id,
    ...task,
    status: task.status || 'pending',
    created: new Date(),
    updated: new Date()
  };
  
  tasks.set(id, newTask);
  return c.json({ task: newTask });
});

taskManagerRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const updates = await c.req.json();
  
  const task = tasks.get(id);
  if (!task) return c.json({ error: 'Not found' }, 404);
  
  const updated = { ...task, ...updates, updated: new Date() };
  tasks.set(id, updated);
  
  return c.json({ task: updated });
});

taskManagerRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const deleted = tasks.delete(id);
  return c.json({ deleted });
});