import { Hono } from 'hono';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const ideRouter = new Hono();
const execAsync = promisify(exec);

// Schema definitions
const listFilesSchema = z.object({
  directory: z.string(),
  recursive: z.boolean().optional().default(false)
});

const readFileSchema = z.object({
  filePath: z.string()
});

const writeFileSchema = z.object({
  filePath: z.string(),
  content: z.string()
});

const executeCommandSchema = z.object({
  command: z.string(),
  cwd: z.string().optional()
});

const createItemSchema = z.object({
  path: z.string(),
  type: z.enum(['file', 'directory'])
});

const deleteItemSchema = z.object({
  path: z.string()
});

// Helper function to ensure path is within allowed directory
function isPathSafe(requestedPath: string): boolean {
  const normalizedPath = path.normalize(requestedPath);
  const resolvedPath = path.resolve(requestedPath);
  
  // Define allowed base directories (you can customize this)
  const allowedDirs = [
    '/home/user/lexos-combined',
    '/tmp'
  ];
  
  return allowedDirs.some(dir => resolvedPath.startsWith(dir));
}

// List files and directories
ideRouter.post('/list', async (c) => {
  try {
    const body = await c.req.json();
    const { directory, recursive } = listFilesSchema.parse(body);
    
    if (!isPathSafe(directory)) {
      return c.json({ error: 'Access denied: Path outside allowed directories' }, 403);
    }
    
    const items: any[] = [];
    
    async function scanDirectory(dir: string, depth = 0): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const stats = await fs.stat(fullPath);
          
          items.push({
            name: entry.name,
            path: fullPath,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime,
            created: stats.ctime
          });
          
          if (recursive && entry.isDirectory() && depth < 5) { // Limit recursion depth
            await scanDirectory(fullPath, depth + 1);
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${dir}:`, error);
      }
    }
    
    await scanDirectory(directory);
    
    return c.json({
      status: 'success',
      directory,
      items: items.sort((a, b) => {
        // Directories first, then files
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      })
    });
    
  } catch (error) {
    console.error('List files error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: errorMessage }, 500);
  }
});

// Read file contents
ideRouter.post('/read', async (c) => {
  try {
    const body = await c.req.json();
    const { filePath } = readFileSchema.parse(body);
    
    if (!isPathSafe(filePath)) {
      return c.json({ error: 'Access denied: Path outside allowed directories' }, 403);
    }
    
    const stats = await fs.stat(filePath);
    
    // Check if file is too large (limit to 10MB)
    if (stats.size > 10 * 1024 * 1024) {
      return c.json({ error: 'File too large (max 10MB)' }, 413);
    }
    
    const content = await fs.readFile(filePath, 'utf-8');
    
    return c.json({
      status: 'success',
      filePath,
      content,
      size: stats.size,
      modified: stats.mtime
    });
    
  } catch (error) {
    console.error('Read file error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: errorMessage }, 500);
  }
});

// Write/save file contents
ideRouter.post('/write', async (c) => {
  try {
    const body = await c.req.json();
    const { filePath, content } = writeFileSchema.parse(body);
    
    if (!isPathSafe(filePath)) {
      return c.json({ error: 'Access denied: Path outside allowed directories' }, 403);
    }
    
    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, content, 'utf-8');
    
    const stats = await fs.stat(filePath);
    
    return c.json({
      status: 'success',
      filePath,
      size: stats.size,
      modified: stats.mtime
    });
    
  } catch (error) {
    console.error('Write file error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: errorMessage }, 500);
  }
});

// Execute terminal commands
ideRouter.post('/execute', async (c) => {
  try {
    const body = await c.req.json();
    const { command, cwd } = executeCommandSchema.parse(body);
    
    // Security check for dangerous commands
    const dangerousCommands = ['rm -rf /', 'format', 'del /f', 'shutdown'];
    if (dangerousCommands.some(cmd => command.includes(cmd))) {
      return c.json({ error: 'Command not allowed for security reasons' }, 403);
    }
    
    const workingDir = cwd || process.cwd();
    
    if (cwd && !isPathSafe(workingDir)) {
      return c.json({ error: 'Access denied: Working directory outside allowed paths' }, 403);
    }
    
    const { stdout, stderr } = await execAsync(command, {
      cwd: workingDir,
      timeout: 30000, // 30 second timeout
      maxBuffer: 1024 * 1024 // 1MB buffer
    });
    
    return c.json({
      status: 'success',
      command,
      stdout,
      stderr,
      cwd: workingDir
    });
    
  } catch (error) {
    console.error('Execute command error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ 
      error: errorMessage,
      stderr: (error as any).stderr || ''
    }, 500);
  }
});

// Create new files/folders
ideRouter.post('/create', async (c) => {
  try {
    const body = await c.req.json();
    const { path: itemPath, type } = createItemSchema.parse(body);
    
    if (!isPathSafe(itemPath)) {
      return c.json({ error: 'Access denied: Path outside allowed directories' }, 403);
    }
    
    if (type === 'directory') {
      await fs.mkdir(itemPath, { recursive: true });
    } else {
      // Create parent directory if it doesn't exist
      const dir = path.dirname(itemPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Create empty file
      await fs.writeFile(itemPath, '', 'utf-8');
    }
    
    const stats = await fs.stat(itemPath);
    
    return c.json({
      status: 'success',
      path: itemPath,
      type,
      created: stats.ctime
    });
    
  } catch (error) {
    console.error('Create item error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: errorMessage }, 500);
  }
});

// Delete files/folders
ideRouter.post('/delete', async (c) => {
  try {
    const body = await c.req.json();
    const { path: itemPath } = deleteItemSchema.parse(body);
    
    if (!isPathSafe(itemPath)) {
      return c.json({ error: 'Access denied: Path outside allowed directories' }, 403);
    }
    
    // Check if path exists
    const stats = await fs.stat(itemPath);
    
    if (stats.isDirectory()) {
      await fs.rm(itemPath, { recursive: true, force: true });
    } else {
      await fs.unlink(itemPath);
    }
    
    return c.json({
      status: 'success',
      path: itemPath,
      deleted: true
    });
    
  } catch (error) {
    console.error('Delete item error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: errorMessage }, 500);
  }
});

// IDE status endpoint
ideRouter.get('/status', (c) => {
  return c.json({
    status: 'active',
    features: ['code_editing', 'syntax_highlighting', 'auto_completion', 'debugging'],
    supported_languages: ['javascript', 'typescript', 'python', 'java', 'cpp', 'rust']
  });
});

export default ideRouter;