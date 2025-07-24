import { Hono } from 'hono';

const fileManagerRouter = new Hono();

// List files endpoint
fileManagerRouter.get('/list', (c) => {
  return c.json({
    files: [
      {
        id: '1',
        name: 'document.pdf',
        type: 'pdf',
        size: 1024000,
        modified: new Date().toISOString()
      },
      {
        id: '2',
        name: 'image.jpg',
        type: 'image',
        size: 512000,
        modified: new Date().toISOString()
      }
    ],
    total: 2
  });
});

// File status endpoint
fileManagerRouter.get('/status', (c) => {
  return c.json({
    status: 'active',
    storage: {
      used: '1.2GB',
      total: '10GB',
      available: '8.8GB'
    }
  });
});

export default fileManagerRouter;