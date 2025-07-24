import { Hono } from 'hono';
import { z } from 'zod';
import puppeteer, { Browser, Page } from 'puppeteer';

const browserAgentRouter = new Hono();

// Production-ready browser management
let browser: Browser | null = null;
let browserStartTime: number = 0;
const BROWSER_RESTART_INTERVAL = 30 * 60 * 1000; // 30 minutes
const MAX_CONCURRENT_PAGES = 5;
let activePagesCount = 0;

// Performance metrics
interface BrowserMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  browserRestarts: number;
  lastRestartTime: number;
}

const metrics: BrowserMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  browserRestarts: 0,
  lastRestartTime: 0
};

// Rate limiting for browser operations
const browserRateLimit = new Map<string, { count: number; resetTime: number }>();
const BROWSER_RATE_LIMIT = 20; // requests per minute
const BROWSER_RATE_WINDOW = 60 * 1000;

// Schema definitions
const browserRequestSchema = z.object({
  action: z.enum(['navigate', 'click', 'type', 'screenshot', 'extract', 'wait']),
  url: z.string().url().optional(),
  selector: z.string().optional(),
  text: z.string().optional(),
  instructions: z.string().optional(),
  timeout: z.number().optional().default(30000),
  waitFor: z.string().optional()
});

const navigateSchema = z.object({
  url: z.string().url(),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2']).optional().default('networkidle2')
});

const clickSchema = z.object({
  selector: z.string(),
  clickCount: z.number().optional().default(1),
  button: z.enum(['left', 'right', 'middle']).optional().default('left')
});

const typeSchema = z.object({
  selector: z.string(),
  text: z.string(),
  delay: z.number().optional().default(100)
});

const extractSchema = z.object({
  selector: z.string().optional(),
  extractType: z.enum(['text', 'html', 'attribute', 'all']).optional().default('text'),
  attribute: z.string().optional()
});

const screenshotSchema = z.object({
  fullPage: z.boolean().optional().default(false),
  selector: z.string().optional()
});

// Production helper functions
function checkBrowserRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientData = browserRateLimit.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    browserRateLimit.set(clientId, { count: 1, resetTime: now + BROWSER_RATE_WINDOW });
    return true;
  }
  
  if (clientData.count >= BROWSER_RATE_LIMIT) {
    return false;
  }
  
  clientData.count++;
  return true;
}

// Enhanced browser management with automatic restarts
async function getBrowser(): Promise<Browser> {
  const now = Date.now();
  
  // Check if browser needs restart (memory management)
  if (browser && browserStartTime && (now - browserStartTime > BROWSER_RESTART_INTERVAL)) {
    console.log('🔄 Restarting browser for memory management...');
    try {
      await browser.close();
    } catch (error) {
      console.error('Error closing browser:', error);
    }
    browser = null;
    metrics.browserRestarts++;
    metrics.lastRestartTime = now;
  }
  
  if (!browser || !browser.isConnected()) {
    console.log('🚀 Launching new browser instance...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
      timeout: 30000
    });
    browserStartTime = now;
    
    // Handle browser crashes
    browser.on('disconnected', () => {
      console.log('⚠️ Browser disconnected');
      browser = null;
      browserStartTime = 0;
    });
  }
  
  return browser;
}

// Enhanced page management with concurrency control
async function createManagedPage(): Promise<Page | null> {
  if (activePagesCount >= MAX_CONCURRENT_PAGES) {
    throw new Error(`Maximum concurrent pages (${MAX_CONCURRENT_PAGES}) reached`);
  }
  
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();
  activePagesCount++;
  
  // Set production-ready page configuration
  await page.setViewport({ width: 1280, height: 720 });
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Block unnecessary resources for performance
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
      req.abort();
    } else {
      req.continue();
    }
  });
  
  // Set timeouts
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);
  
  return page;
}

function closeManagedPage(page: Page): Promise<void> {
  activePagesCount = Math.max(0, activePagesCount - 1);
  return page.close();
}

// Main execute endpoint with production enhancements
browserAgentRouter.post('/execute', async (c) => {
  const startTime = Date.now();
  let page: Page | null = null;
  
  try {
    // Rate limiting
    const clientId = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    if (!checkBrowserRateLimit(clientId)) {
      return c.json({ 
        error: 'Browser rate limit exceeded. Please try again later.',
        retry_after: 60 
      }, 429);
    }
    
    const body = await c.req.json();
    const request = browserRequestSchema.parse(body);
    
    metrics.totalRequests++;
    
    // Create managed page with concurrency control
    page = await createManagedPage();
    if (!page) {
      throw new Error('Failed to create browser page');
    }
    
    let result: any = null;
    
    switch (request.action) {
      case 'navigate':
        const navParams = navigateSchema.parse({ url: request.url });
        await page.goto(navParams.url, { 
          waitUntil: navParams.waitUntil,
          timeout: request.timeout 
        });
        result = { url: page.url(), title: await page.title() };
        break;
        
      case 'click':
        const clickParams = clickSchema.parse({ selector: request.selector });
        await page.waitForSelector(clickParams.selector, { timeout: request.timeout });
        await page.click(clickParams.selector, {
          clickCount: clickParams.clickCount,
          button: clickParams.button
        });
        result = { clicked: true, selector: clickParams.selector };
        break;
        
      case 'type':
        const typeParams = typeSchema.parse({ 
          selector: request.selector, 
          text: request.text 
        });
        await page.waitForSelector(typeParams.selector, { timeout: request.timeout });
        await page.type(typeParams.selector, typeParams.text, { 
          delay: typeParams.delay 
        });
        result = { typed: true, selector: typeParams.selector, text: typeParams.text };
        break;
        
      case 'extract':
        const extractParams = extractSchema.parse({ 
          selector: request.selector,
          extractType: 'text'
        });
        
        if (extractParams.selector) {
          await page.waitForSelector(extractParams.selector, { timeout: request.timeout });
          
          result = await page.evaluate((selector, type, attr) => {
            const elements = document.querySelectorAll(selector);
            const data = Array.from(elements).map(el => {
              switch (type) {
                case 'text':
                  return el.textContent?.trim();
                case 'html':
                  return el.innerHTML;
                case 'attribute':
                  return attr ? el.getAttribute(attr) : null;
                case 'all':
                  return {
                    text: el.textContent?.trim(),
                    html: el.innerHTML,
                    attributes: Array.from(el.attributes).reduce((acc, attr) => {
                      acc[attr.name] = attr.value;
                      return acc;
                    }, {} as Record<string, string>)
                  };
                default:
                  return el.textContent?.trim();
              }
            });
            return data.length === 1 ? data[0] : data;
          }, extractParams.selector, extractParams.extractType, extractParams.attribute);
        } else {
          // Extract full page content
          result = await page.evaluate(() => {
            return {
              title: document.title,
              url: window.location.href,
              text: document.body.innerText,
              html: document.documentElement.outerHTML
            };
          });
        }
        break;
        
      case 'screenshot':
        const screenshotParams = screenshotSchema.parse({
          fullPage: request.selector ? false : true,
          selector: request.selector
        });
        
        let screenshotBuffer: Buffer;
        
        if (screenshotParams.selector) {
          await page.waitForSelector(screenshotParams.selector, { timeout: request.timeout });
          const element = await page.$(screenshotParams.selector);
          if (element) {
            screenshotBuffer = await element.screenshot({ encoding: 'base64' }) as unknown as Buffer;
          } else {
            throw new Error('Element not found for screenshot');
          }
        } else {
          screenshotBuffer = await page.screenshot({ 
            fullPage: screenshotParams.fullPage,
            encoding: 'base64'
          }) as unknown as Buffer;
        }
        
        result = {
          screenshot: screenshotBuffer.toString(),
          mimeType: 'image/png'
        };
        break;
        
      case 'wait':
        if (request.waitFor) {
          // Wait for selector
          await page.waitForSelector(request.waitFor, { timeout: request.timeout });
        } else if (request.timeout) {
          // Just wait for timeout
          await new Promise(resolve => setTimeout(resolve, request.timeout));
        }
        result = { waited: true };
        break;
        
      default:
        throw new Error(`Unknown action: ${request.action}`);
    }
    
    // Calculate metrics
    const responseTime = Date.now() - startTime;
    metrics.successfulRequests++;
    metrics.averageResponseTime = (metrics.averageResponseTime * (metrics.successfulRequests - 1) + responseTime) / metrics.successfulRequests;
    
    return c.json({
      status: 'success',
      action: request.action,
      data: result,
      performance: {
        response_time_ms: responseTime,
        active_pages: activePagesCount,
        browser_uptime: browserStartTime ? Date.now() - browserStartTime : 0
      }
    });
    
  } catch (error) {
    metrics.failedRequests++;
    console.error('🔥 Browser agent error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ 
      error: errorMessage,
      performance: {
        response_time_ms: Date.now() - startTime,
        active_pages: activePagesCount
      }
    }, 500);
  } finally {
    if (page) {
      await closeManagedPage(page);
    }
  }
});

// Navigate to URL
browserAgentRouter.post('/navigate', async (c) => {
  let page: Page | null = null;
  
  try {
    const body = await c.req.json();
    const params = navigateSchema.parse(body);
    
    const browserInstance = await getBrowser();
    page = await browserInstance.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    await page.goto(params.url, { 
      waitUntil: params.waitUntil,
      timeout: 30000 
    });
    
    return c.json({
      status: 'success',
      url: page.url(),
      title: await page.title()
    });
    
  } catch (error) {
    console.error('Navigate error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: errorMessage }, 500);
  } finally {
    if (page) {
      await page.close();
    }
  }
});

// Take screenshot
browserAgentRouter.post('/screenshot', async (c) => {
  let page: Page | null = null;
  
  try {
    const body = await c.req.json();
    const params = screenshotSchema.parse(body);
    
    const browserInstance = await getBrowser();
    page = await browserInstance.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    if (body.url) {
      await page.goto(body.url, { waitUntil: 'networkidle2' });
    }
    
    const screenshotBuffer = await page.screenshot({ 
      fullPage: params.fullPage,
      encoding: 'base64'
    });
    
    return c.json({
      status: 'success',
      screenshot: screenshotBuffer.toString(),
      mimeType: 'image/png'
    });
    
  } catch (error) {
    console.error('Screenshot error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: errorMessage }, 500);
  } finally {
    if (page) {
      await page.close();
    }
  }
});

// Extract data from page
browserAgentRouter.post('/extract', async (c) => {
  let page: Page | null = null;
  
  try {
    const body = await c.req.json();
    
    const browserInstance = await getBrowser();
    page = await browserInstance.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    if (body.url) {
      await page.goto(body.url, { waitUntil: 'networkidle2' });
    }
    
    let result: any;
    
    if (body.instructions) {
      // Use AI to extract based on instructions
      // This would integrate with your AI service
      result = {
        message: 'AI-based extraction would be implemented here',
        instructions: body.instructions
      };
    } else {
      // Extract basic page data
      result = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          meta: Array.from(document.querySelectorAll('meta')).map(meta => ({
            name: meta.getAttribute('name') || meta.getAttribute('property'),
            content: meta.getAttribute('content')
          })).filter(m => m.name && m.content),
          headings: {
            h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.trim()),
            h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim())
          },
          links: Array.from(document.querySelectorAll('a')).map(a => ({
            text: a.textContent?.trim(),
            href: a.href
          })).filter(l => l.href)
        };
      });
    }
    
    return c.json({
      status: 'success',
      data: result
    });
    
  } catch (error) {
    console.error('Extract error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: errorMessage }, 500);
  } finally {
    if (page) {
      await page.close();
    }
  }
});

// Browser metrics and health endpoint
browserAgentRouter.get('/metrics', async (c) => {
  const browserStatus = {
    timestamp: new Date().toISOString(),
    browser: {
      connected: browser?.isConnected() || false,
      uptime_ms: browserStartTime ? Date.now() - browserStartTime : 0,
      restart_count: metrics.browserRestarts,
      last_restart: metrics.lastRestartTime ? new Date(metrics.lastRestartTime).toISOString() : null
    },
    performance: {
      total_requests: metrics.totalRequests,
      successful_requests: metrics.successfulRequests,
      failed_requests: metrics.failedRequests,
      success_rate: metrics.totalRequests > 0 ? (metrics.successfulRequests / metrics.totalRequests * 100).toFixed(2) + '%' : '0%',
      average_response_time_ms: Math.round(metrics.averageResponseTime)
    },
    resources: {
      active_pages: activePagesCount,
      max_concurrent_pages: MAX_CONCURRENT_PAGES,
      rate_limit_clients: browserRateLimit.size
    },
    configuration: {
      restart_interval_minutes: BROWSER_RESTART_INTERVAL / 60000,
      rate_limit_per_minute: BROWSER_RATE_LIMIT,
      headless: true,
      resource_blocking: true
    }
  };
  
  return c.json(browserStatus);
});

// Browser health check endpoint
browserAgentRouter.get('/health', async (c) => {
  try {
    const isHealthy = browser?.isConnected() || false;
    const status = isHealthy ? 'healthy' : 'unhealthy';
    
    return c.json({
      status,
      timestamp: new Date().toISOString(),
      browser_connected: isHealthy,
      active_pages: activePagesCount,
      uptime_seconds: browserStartTime ? Math.floor((Date.now() - browserStartTime) / 1000) : 0
    }, isHealthy ? 200 : 503);
    
  } catch (error) {
    return c.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Enhanced cleanup with graceful shutdown
async function gracefulShutdown() {
  console.log('🛑 Shutting down browser agent gracefully...');
  
  if (browser) {
    try {
      const pages = await browser.pages();
      await Promise.all(pages.map(page => page.close()));
      await browser.close();
      console.log('✅ Browser closed successfully');
    } catch (error) {
      console.error('❌ Error closing browser:', error);
    }
  }
  
  console.log('📊 Final metrics:', metrics);
}

process.on('SIGINT', async () => {
  await gracefulShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await gracefulShutdown();
  process.exit(0);
});

export default browserAgentRouter;