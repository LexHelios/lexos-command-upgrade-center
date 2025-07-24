import { Hono } from 'hono';
import { z } from 'zod';
import { promises as fs } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);

const app = new Hono();

// Project storage directory
const PROJECTS_DIR = path.join(process.cwd(), 'deep-agent-projects');

// Ensure projects directory exists
async function ensureProjectsDir() {
  try {
    await fs.mkdir(PROJECTS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating projects directory:', error);
  }
}

// Initialize
ensureProjectsDir();

// Schemas
const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  type: z.enum(['react', 'nodejs', 'python', 'fullstack']),
  features: z.array(z.string()).optional(),
});

const generateCodeSchema = z.object({
  projectId: z.string(),
  prompt: z.string(),
  context: z.string().optional(),
  model: z.string().optional(),
});

const updateCodeSchema = z.object({
  projectId: z.string(),
  filePath: z.string(),
  prompt: z.string(),
  currentCode: z.string(),
});

const deployProjectSchema = z.object({
  projectId: z.string(),
  platform: z.enum(['vercel', 'netlify', 'heroku', 'custom']),
  config: z.record(z.string()).optional(),
});

// Helper functions
async function getProjectPath(projectId: string): Promise<string> {
  return path.join(PROJECTS_DIR, projectId);
}

async function projectExists(projectId: string): Promise<boolean> {
  try {
    const projectPath = await getProjectPath(projectId);
    await fs.access(projectPath);
    return true;
  } catch {
    return false;
  }
}

// Generate project structure based on type
async function generateProjectStructure(projectId: string, type: string, features: string[] = []) {
  const projectPath = await getProjectPath(projectId);
  
  switch (type) {
    case 'react':
      return generateReactProject(projectPath, features);
    case 'nodejs':
      return generateNodeProject(projectPath, features);
    case 'python':
      return generatePythonProject(projectPath, features);
    case 'fullstack':
      return generateFullstackProject(projectPath, features);
    default:
      throw new Error(`Unknown project type: ${type}`);
  }
}

async function generateReactProject(projectPath: string, features: string[]) {
  // Create React project structure
  const structure = {
    'package.json': JSON.stringify({
      name: path.basename(projectPath),
      version: '1.0.0',
      private: true,
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-router-dom': '^6.22.3',
        ...(features.includes('tailwind') && { tailwindcss: '^3.4.1' }),
        ...(features.includes('supabase') && { '@supabase/supabase-js': '^2.39.0' }),
      },
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.2.1',
        vite: '^5.1.6',
        typescript: '^5.2.2',
        '@types/react': '^18.2.61',
        '@types/react-dom': '^18.2.19',
      },
    }, null, 2),
    'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
      },
      include: ['src'],
      references: [{ path: './tsconfig.node.json' }],
    }, null, 2),
    'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DeepAgent App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    'src/main.tsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
    'src/App.tsx': `import React from 'react'

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome to Your DeepAgent App
        </h1>
        <p className="mt-4 text-gray-600">
          Start building your application with natural language!
        </p>
      </div>
    </div>
  )
}

export default App`,
    'src/index.css': features.includes('tailwind') 
      ? `@tailwind base;
@tailwind components;
@tailwind utilities;`
      : `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`,
  };

  // Create directory structure
  await fs.mkdir(projectPath, { recursive: true });
  await fs.mkdir(path.join(projectPath, 'src'), { recursive: true });
  await fs.mkdir(path.join(projectPath, 'public'), { recursive: true });

  // Write files
  for (const [filePath, content] of Object.entries(structure)) {
    await fs.writeFile(path.join(projectPath, filePath), content);
  }

  // Initialize git
  await execAsync('git init', { cwd: projectPath });
  await execAsync('git add .', { cwd: projectPath });
  await execAsync('git commit -m "Initial commit"', { cwd: projectPath });
}

async function generateNodeProject(projectPath: string, features: string[]) {
  const structure = {
    'package.json': JSON.stringify({
      name: path.basename(projectPath),
      version: '1.0.0',
      description: 'Node.js project generated by DeepAgent',
      main: 'index.js',
      scripts: {
        start: 'node index.js',
        dev: 'nodemon index.js',
      },
      dependencies: {
        express: '^4.18.2',
        ...(features.includes('database') && { 
          '@prisma/client': '^5.8.0',
          prisma: '^5.8.0' 
        }),
        ...(features.includes('auth') && { 
          jsonwebtoken: '^9.0.2',
          bcrypt: '^5.1.1' 
        }),
      },
      devDependencies: {
        nodemon: '^3.0.2',
      },
    }, null, 2),
    'index.js': `const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to your DeepAgent API' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`,
    '.env.example': `PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/mydb`,
  };

  await fs.mkdir(projectPath, { recursive: true });
  for (const [filePath, content] of Object.entries(structure)) {
    await fs.writeFile(path.join(projectPath, filePath), content);
  }

  await execAsync('git init', { cwd: projectPath });
  await execAsync('git add .', { cwd: projectPath });
  await execAsync('git commit -m "Initial commit"', { cwd: projectPath });
}

async function generatePythonProject(projectPath: string, features: string[]) {
  const structure = {
    'requirements.txt': [
      'flask==3.0.0',
      features.includes('database') && 'sqlalchemy==2.0.23',
      features.includes('auth') && 'flask-jwt-extended==4.5.3',
      features.includes('ml') && 'scikit-learn==1.3.2',
    ].filter(Boolean).join('\n'),
    'app.py': `from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({'message': 'Welcome to your DeepAgent API'})

if __name__ == '__main__':
    app.run(debug=True)`,
    '.env.example': `FLASK_APP=app.py
FLASK_ENV=development`,
    'README.md': `# DeepAgent Python Project

## Setup
\`\`\`bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
pip install -r requirements.txt
\`\`\`

## Run
\`\`\`bash
flask run
\`\`\``,
  };

  await fs.mkdir(projectPath, { recursive: true });
  for (const [filePath, content] of Object.entries(structure)) {
    await fs.writeFile(path.join(projectPath, filePath), content);
  }

  await execAsync('git init', { cwd: projectPath });
  await execAsync('git add .', { cwd: projectPath });
  await execAsync('git commit -m "Initial commit"', { cwd: projectPath });
}

async function generateFullstackProject(projectPath: string, features: string[]) {
  // Create both frontend and backend
  await fs.mkdir(path.join(projectPath, 'frontend'), { recursive: true });
  await fs.mkdir(path.join(projectPath, 'backend'), { recursive: true });

  // Generate frontend (React)
  await generateReactProject(path.join(projectPath, 'frontend'), features);

  // Generate backend (Node.js)
  await generateNodeProject(path.join(projectPath, 'backend'), features);

  // Root package.json for managing both
  const rootPackage = {
    'package.json': JSON.stringify({
      name: path.basename(projectPath),
      version: '1.0.0',
      scripts: {
        'dev': 'concurrently "npm run dev:frontend" "npm run dev:backend"',
        'dev:frontend': 'cd frontend && npm run dev',
        'dev:backend': 'cd backend && npm run dev',
        'install:all': 'npm install && cd frontend && npm install && cd ../backend && npm install',
      },
      devDependencies: {
        concurrently: '^8.2.2',
      },
    }, null, 2),
    'README.md': `# ${path.basename(projectPath)}

A fullstack application generated by DeepAgent.

## Setup
\`\`\`bash
npm run install:all
\`\`\`

## Development
\`\`\`bash
npm run dev
\`\`\`

Frontend: http://localhost:5173
Backend: http://localhost:3000`,
  };

  for (const [filePath, content] of Object.entries(rootPackage)) {
    await fs.writeFile(path.join(projectPath, filePath), content);
  }
}

// Routes

// Create a new project
app.post('/create', async (c) => {
  try {
    const body = createProjectSchema.parse(await c.req.json());
    const projectId = crypto.randomBytes(8).toString('hex');
    
    // Create project directory
    const projectPath = await getProjectPath(projectId);
    await fs.mkdir(projectPath, { recursive: true });

    // Generate project structure
    await generateProjectStructure(projectId, body.type, body.features);

    // Save project metadata
    const metadata = {
      id: projectId,
      name: body.name,
      description: body.description,
      type: body.type,
      features: body.features || [],
      createdAt: new Date().toISOString(),
      checkpoints: [],
    };

    await fs.writeFile(
      path.join(projectPath, '.deepagent.json'),
      JSON.stringify(metadata, null, 2)
    );

    return c.json({
      success: true,
      projectId,
      message: 'Project created successfully',
      metadata,
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// Generate code using AI
app.post('/generate', async (c) => {
  try {
    const body = generateCodeSchema.parse(await c.req.json());
    
    if (!await projectExists(body.projectId)) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    // This would integrate with your AI models to generate code
    // For now, returning a mock response
    const generatedCode = {
      files: [
        {
          path: 'src/components/NewComponent.tsx',
          content: `// Generated component based on: ${body.prompt}\n\nconst NewComponent = () => {\n  return <div>Generated component</div>;\n};\n\nexport default NewComponent;`,
        }
      ],
      explanation: 'Generated a new React component based on your description.',
    };

    // In real implementation, this would:
    // 1. Use the AI model to understand the prompt
    // 2. Generate appropriate code files
    // 3. Write them to the project directory
    // 4. Create a checkpoint

    return c.json({
      success: true,
      generated: generatedCode,
    });
  } catch (error) {
    console.error('Error generating code:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// Update existing code
app.post('/update', async (c) => {
  try {
    const body = updateCodeSchema.parse(await c.req.json());
    
    if (!await projectExists(body.projectId)) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    // This would use AI to understand the changes requested
    // and apply them to the existing code
    
    return c.json({
      success: true,
      message: 'Code updated successfully',
    });
  } catch (error) {
    console.error('Error updating code:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// List all projects
app.get('/list', async (c) => {
  try {
    const projects = [];
    const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const metadataPath = path.join(PROJECTS_DIR, entry.name, '.deepagent.json');
        try {
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
          projects.push(metadata);
        } catch (error) {
          console.error(`Error reading metadata for ${entry.name}:`, error);
        }
      }
    }

    return c.json({
      success: true,
      projects: projects.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    });
  } catch (error) {
    console.error('Error listing projects:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// Get project details
app.get('/project/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId');
    
    if (!await projectExists(projectId)) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    const projectPath = await getProjectPath(projectId);
    const metadataPath = path.join(projectPath, '.deepagent.json');
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

    // Get file structure
    const getFileStructure = async (dir: string, basePath: string = ''): Promise<any[]> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files = [];

      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);
        
        if (entry.isDirectory()) {
          files.push({
            name: entry.name,
            path: relativePath,
            type: 'directory',
            children: await getFileStructure(fullPath, relativePath),
          });
        } else {
          files.push({
            name: entry.name,
            path: relativePath,
            type: 'file',
          });
        }
      }

      return files;
    };

    const fileStructure = await getFileStructure(projectPath);

    return c.json({
      success: true,
      metadata,
      files: fileStructure,
    });
  } catch (error) {
    console.error('Error getting project details:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// Create checkpoint
app.post('/checkpoint/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId');
    const { message } = await c.req.json();
    
    if (!await projectExists(projectId)) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    const projectPath = await getProjectPath(projectId);
    
    // Create git commit as checkpoint
    await execAsync(`git add . && git commit -m "${message || 'Checkpoint'}"`, { 
      cwd: projectPath 
    });

    // Update metadata
    const metadataPath = path.join(projectPath, '.deepagent.json');
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    
    metadata.checkpoints.push({
      id: crypto.randomBytes(4).toString('hex'),
      message: message || 'Checkpoint',
      createdAt: new Date().toISOString(),
    });

    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    return c.json({
      success: true,
      message: 'Checkpoint created successfully',
    });
  } catch (error) {
    console.error('Error creating checkpoint:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// Deploy project
app.post('/deploy', async (c) => {
  try {
    const body = deployProjectSchema.parse(await c.req.json());
    
    if (!await projectExists(body.projectId)) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    // This would implement actual deployment logic
    // For now, returning mock deployment info
    const deploymentInfo = {
      url: `https://${body.projectId}.deepagent-apps.com`,
      platform: body.platform,
      status: 'deploying',
      deployedAt: new Date().toISOString(),
    };

    return c.json({
      success: true,
      deployment: deploymentInfo,
      message: 'Deployment initiated. Your app will be live in a few minutes.',
    });
  } catch (error) {
    console.error('Error deploying project:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// Preview project (development server)
app.post('/preview/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId');
    
    if (!await projectExists(projectId)) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    const projectPath = await getProjectPath(projectId);
    const metadataPath = path.join(projectPath, '.deepagent.json');
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

    // Start development server based on project type
    let command = '';
    let port = 3000 + Math.floor(Math.random() * 1000);

    switch (metadata.type) {
      case 'react':
        command = `cd ${projectPath} && PORT=${port} npm run dev`;
        break;
      case 'nodejs':
        command = `cd ${projectPath} && PORT=${port} npm run dev`;
        break;
      case 'python':
        command = `cd ${projectPath} && FLASK_RUN_PORT=${port} flask run`;
        break;
      case 'fullstack':
        command = `cd ${projectPath} && npm run dev`;
        port = 5173; // Vite default
        break;
    }

    // In a real implementation, you'd manage these processes properly
    // For now, just returning the preview URL
    return c.json({
      success: true,
      previewUrl: `http://localhost:${port}`,
      message: 'Preview server starting...',
    });
  } catch (error) {
    console.error('Error starting preview:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// Deep Agent status endpoint
app.get('/status', (c) => {
  return c.json({
    status: 'active',
    capabilities: ['code_generation', 'project_creation', 'deployment', 'testing'],
    models: ['deep-coder', 'project-builder', 'deploy-master']
  });
});

export default app;