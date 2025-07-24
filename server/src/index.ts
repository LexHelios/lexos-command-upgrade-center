import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import aiRouter from './routes/ai.js';
import authRouter from './routes/auth.js';
import browserAgentRouter from './routes/browser-agent.js';
import ideRouter from './routes/ide.js';
import ttsRouter from './routes/tts.js';
import sttRouter from './routes/stt.js';
import imageRouter from './routes/image.js';
import orchestratorRouter from './routes/orchestrator.js';
import searchRouter from './routes/search.js';
import superAgentRouter from './routes/super-agent.js';
import deepAgentRouter from './routes/deep-agent.js';
import rasaRouter from './routes/rasa.js';
import smartRouter from './routes/smart-router.js';
import visionRouter from './routes/vision.js';

// Load environment variables
dotenv.config();

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Production configuration
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Enhanced logging
const log = {
  info: (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`, ...args);
  },
  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, error);
  },
  warn: (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN: ${message}`, ...args);
  }
};

const app = new Hono();

// Enhanced middleware with better error handling
app.use('*', async (c, next) => {
  const start = Date.now();
  try {
    await next();
    const duration = Date.now() - start;
    log.info(`${c.req.method} ${c.req.url} - ${c.res.status} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - start;
    log.error(`Request failed: ${c.req.method} ${c.req.url}`, error);
    return c.json({ 
      error: 'Internal server error', 
      message: isDevelopment ? error?.message || 'Unknown error' : 'Something went wrong',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Enhanced CORS configuration
const allowedOrigins = [
  'http://localhost:3001', 
  'http://localhost:5173', 
  'http://localhost:8080',
  'https://localhost:3001', 
  'https://localhost:5173', 
  'https://localhost:8080',
  'https://localhost:8081',
  'http://159.26.94.14:3001',
  'http://159.26.94.14:8080',
  'https://159.26.94.14:3001',
  'https://159.26.94.14:8080',
  'https://159.26.94.14:8081'
];

app.use('*', cors({
  origin: allowedOrigins,
  credentials: true
}));

// Enhanced health check with system information
app.get('/health', (c) => {
  const healthInfo = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  };
  return c.json(healthInfo);
});

// Enhanced status endpoint
app.get('/api/status', (c) => {
  return c.json({
    status: 'operational',
    services: {
      ai: 'active',
      auth: 'active',
      browser: 'active',
      ide: 'active',
      tts: 'active',
      stt: 'active',
      image: 'active',
      orchestrator: 'active'
    },
    timestamp: new Date().toISOString()
  });
});

// CORS preflight for all routes
app.options('*', (c) => {
  c.status(204);
  return c.text('');
});

// Import extended routes
import { browserAgentExtended } from './routes/browser-agent-extended.js';
import { taskManagerRouter } from './routes/task-manager.js';
import fileManagerRouter from './routes/file-manager.js';
import { ideExtended } from './routes/ide-extended.js';
import { realtimeRouter } from './routes/realtime.js';
import { adminRouter } from './routes/admin.js';
import masterOrchestrator from './routes/master-orchestrator.js';

// API routes with error handling
const setupRoutes = () => {
  try {
    app.route('/api/auth', authRouter);
    app.route('/api/ai', aiRouter);
    app.route('/api/browser-agent', browserAgentRouter);
    app.route('/api/ide', ideRouter);
    app.route('/api/tts', ttsRouter);
    app.route('/api/stt', sttRouter);
    app.route('/api/image', imageRouter);
    app.route('/api/orchestrator', orchestratorRouter);
    app.route('/api/search', searchRouter);
    app.route('/api/super-agent', superAgentRouter);
    app.route('/api/deep-agent', deepAgentRouter);
    app.route('/api/rasa', rasaRouter);
    app.route('/api/smart-router', smartRouter);
    app.route('/api/vision', visionRouter);

    // Extended features
    app.route('/api/browser-agent-v2', browserAgentExtended);
    app.route('/api/tasks', taskManagerRouter);
    app.route('/api/files', fileManagerRouter);
    app.route('/api/ide-v2', ideExtended);
    app.route('/api/realtime', realtimeRouter);
    app.route('/api/admin', adminRouter);

    // Master Orchestrator - Intelligent routing
    app.route('/api/orchestrator', masterOrchestrator);
    
    log.info('All routes configured successfully');
  } catch (error) {
    log.error('Failed to setup routes', error);
    throw error;
  }
};

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  log.info(`Received ${signal}, starting graceful shutdown...`);
  process.exit(0);
};

// Setup signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled error handlers
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const port = parseInt(process.env.PORT || '3000', 10);

// Check if certificates exist for HTTPS
const projectRoot = path.resolve(__dirname, '../../..');
const serverCertPath = path.join(projectRoot, 'certs', 'server.pem');
const serverKeyPath = path.join(projectRoot, 'certs', 'server-key.pem');
const localCertPath = path.join(projectRoot, 'certs', 'localhost.pem');
const localKeyPath = path.join(projectRoot, 'certs', 'localhost-key.pem');

// Use server certs if available, otherwise localhost certs
const certPath = fs.existsSync(serverCertPath) ? serverCertPath : localCertPath;
const keyPath = fs.existsSync(serverKeyPath) ? serverKeyPath : localKeyPath;
const httpsAvailable = fs.existsSync(certPath) && fs.existsSync(keyPath);

// Setup routes
setupRoutes();

if (httpsAvailable) {
  log.info('🔒 HTTPS certificates found, starting HTTPS server...');
  
  serve({
    fetch: app.fetch,
    port,
    hostname: '0.0.0.0', // Listen on all interfaces
    tls: {
      cert: fs.readFileSync(certPath, 'utf8'),
      key: fs.readFileSync(keyPath, 'utf8')
    }
  });
  
  log.info(`🔒 HTTPS Server is running on:`);
  log.info(`   - https://localhost:${port}`);
  log.info(`   - https://159.26.94.14:${port}`);
  log.info(`✅ Microphone access enabled with HTTPS`);
} else {
  // HTTP server (fallback)
  log.warn(`⚠️  No HTTPS certificates found at:`);
  log.warn(`   - ${certPath}`);
  log.warn(`   - ${keyPath}`);
  log.warn(`⚠️  Running on HTTP - Microphone access will be blocked!`);
  log.info(`💡 To enable HTTPS, run:`);
  log.info(`   cd ${projectRoot}`);
  log.info(`   npm run setup:https`);
  
  serve({
    fetch: app.fetch,
    port,
  });
  
  log.info(`Server is running on http://localhost:${port}`);
}

log.info(`🚀 LexOS Server started successfully in ${process.env.NODE_ENV || 'development'} mode`);
log.info(`📊 Health check available at: ${httpsAvailable ? 'https' : 'http'}://localhost:${port}/health`);