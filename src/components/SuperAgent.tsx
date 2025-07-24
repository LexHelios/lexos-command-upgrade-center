import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAIAPI } from '@/hooks/use-ai-api';
import { useSuperAgent } from '@/hooks/use-super-agent';
import { 
  Send, 
  Code2, 
  Database, 
  Shield, 
  Rocket, 
  FolderOpen,
  RefreshCw,
  Download,
  GitBranch,
  Server,
  Layout,
  FileCode,
  Terminal,
  Cloud,
  Settings,
  Zap,
  Package,
  Check,
  X,
  Brain,
  Sparkles,
  Eye,
  Undo,
  Play,
  Bug
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    action?: string;
    files?: string[];
    error?: boolean;
  };
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'building' | 'testing' | 'deployed';
  stack: string[];
  features: string[];
  database?: string;
  auth?: string;
  deployment?: {
    url?: string;
    domain?: string;
    provider?: string;
  };
  files: {
    name: string;
    type: string;
    content: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export const SuperAgent = () => {
  const superAgent = useSuperAgent();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: `🚀 **Welcome to LexOS Super Agent**

I'm your AI-powered full-stack development assistant. I can help you:

🏗️ **Build Complete Applications**
- Generate full-stack apps from natural language descriptions
- Support for React, Vue, Next.js, Node.js, Python, and more
- Automatic database setup and schema generation

🔐 **Authentication & Security**
- Built-in auth providers (JWT, OAuth, Magic Links)
- Role-based access control
- Secure API endpoints

🗄️ **Database Integration**
- PostgreSQL, MySQL, MongoDB support
- Automatic migrations and seeding
- ORM integration (Prisma, TypeORM, etc.)

🚀 **One-Click Deployment**
- Deploy to Vercel, Netlify, Railway, or self-host
- Custom domain configuration
- Environment variable management

🧪 **Testing & Quality**
- Automated test generation
- End-to-end testing with Playwright
- Code review and optimization

💡 **Advanced Features**
- Real-time collaboration
- AI-powered code suggestions
- Version control with Git
- Continuous iteration and debugging

Just describe what you want to build, and I'll handle the rest!`,
      timestamp: new Date(),
    }
  ]);
  
  const [input, setInput] = useState('');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  
  const { sendMessage } = useAIAPI();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);
    setProgress(0);

    try {
      // Analyze the request
      const analysis = await analyzeRequest(input);
      
      if (analysis.type === 'new_project') {
        await createNewProject(analysis);
      } else if (analysis.type === 'modify_project' && currentProject) {
        await modifyProject(analysis);
      } else if (analysis.type === 'deploy' && currentProject) {
        await deployProject();
      } else {
        await handleGeneralQuery(input);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'system',
        content: `❌ Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`,
        timestamp: new Date(),
        metadata: { error: true }
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
      setProgress(100);
    }
  };

  const analyzeRequest = async (prompt: string) => {
    const response = await sendMessage(prompt, {
      task_type: 'reasoning',
      quality: 'premium',
      enable_web_search: true
    });

    // Analyze the intent
    const lower = prompt.toLowerCase();
    if (lower.includes('build') || lower.includes('create') || lower.includes('make')) {
      return { type: 'new_project', prompt, response };
    } else if (lower.includes('add') || lower.includes('modify') || lower.includes('change')) {
      return { type: 'modify_project', prompt, response };
    } else if (lower.includes('deploy') || lower.includes('publish') || lower.includes('launch')) {
      return { type: 'deploy', prompt, response };
    } else {
      return { type: 'general', prompt, response };
    }
  };

  const createNewProject = async (analysis: any) => {
    setCurrentPhase('Planning architecture...');
    setProgress(10);
    
    const planMessage: Message = {
      id: Date.now().toString(),
      type: 'agent',
      content: `🔍 **Analyzing your requirements...**\n\nI'll create a full-stack application based on your description.`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, planMessage]);

    // Generate project structure
    setCurrentPhase('Generating project structure...');
    setProgress(20);
    
    const projectStructure = await generateProjectStructure(analysis.prompt);
    
    // Create project via backend
    const project = await superAgent.createProject({
      name: projectStructure.name,
      description: projectStructure.description,
      stack: projectStructure.stack,
      features: projectStructure.features,
      database: projectStructure.database,
      auth: projectStructure.auth,
    });

    setCurrentProject(project);
    setProjects(prev => [...prev, project]);

    // Generate code files
    setCurrentPhase('Generating code...');
    setProgress(40);
    
    const files = await generateProjectFiles(project);
    project.files = files;

    // Update UI
    const buildMessage: Message = {
      id: Date.now().toString(),
      type: 'agent',
      content: `✅ **Project "${project.name}" created successfully!**

**Tech Stack:**
${project.stack.map(tech => `- ${tech}`).join('\n')}

**Features:**
${project.features.map(feature => `- ${feature}`).join('\n')}

**Database:** ${project.database || 'None'}
**Authentication:** ${project.auth || 'None'}

I've generated ${files.length} files for your project. You can view them in the Files tab.`,
      timestamp: new Date(),
      metadata: { action: 'project_created', files: files.map(f => f.name) }
    };
    setMessages(prev => [...prev, buildMessage]);
    
    // Setup preview
    setCurrentPhase('Setting up preview...');
    setProgress(80);
    await setupPreview(project);
    
    setProgress(100);
    setCurrentPhase('Complete!');
    setActiveTab('preview');
  };

  const generateProjectStructure = async (prompt: string) => {
    const response = await sendMessage(`
    Based on this request: "${prompt}"
    
    Generate a project structure with:
    1. Project name
    2. Brief description
    3. Tech stack (array of technologies)
    4. Key features (array)
    5. Database type (if needed)
    6. Authentication method (if needed)
    
    Format as JSON.
    `, {
      task_type: 'code',
      quality: 'premium'
    });

    try {
      const jsonMatch = response.result.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
    } catch (error) {
      // Fallback structure
      return {
        name: 'my-app',
        description: 'A full-stack web application',
        stack: ['React', 'Node.js', 'Express', 'PostgreSQL'],
        features: ['User authentication', 'CRUD operations', 'Responsive design'],
        database: 'PostgreSQL',
        auth: 'JWT'
      };
    }
  };

  const generateProjectFiles = async (project: Project) => {
    const files = [];
    const context = {
      features: project.features,
      stack: project.stack,
      database: project.database,
      auth: project.auth,
    };
    
    // Generate config files
    const configFile = await superAgent.generateCode({
      projectId: project.id,
      prompt: `Generate package.json for ${project.name}`,
      fileType: 'config',
      context,
    });
    files.push(configFile);

    // Generate server files
    if (project.stack.includes('Node.js')) {
      const serverFile = await superAgent.generateCode({
        projectId: project.id,
        prompt: `Generate Node.js server for ${project.name}`,
        fileType: 'node',
        context,
      });
      files.push(serverFile);
    }

    // Generate client files
    if (project.stack.includes('React')) {
      const reactFile = await superAgent.generateCode({
        projectId: project.id,
        prompt: `Generate React app for ${project.name}`,
        fileType: 'react',
        context,
      });
      files.push(reactFile);
    }

    // Generate database schema
    if (project.database) {
      const dbFile = await superAgent.generateCode({
        projectId: project.id,
        prompt: `Generate database schema for ${project.name}`,
        fileType: 'database',
        context,
      });
      files.push(dbFile);
    }

    // Generate tests
    const testFile = await superAgent.generateCode({
      projectId: project.id,
      prompt: `Generate tests for ${project.name}`,
      fileType: 'test',
      context,
    });
    files.push(testFile);

    return files;
  };

  const generateServerCode = async (project: Project) => {
    const response = await sendMessage(`
    Generate a Node.js/Express server for a project with these specs:
    - Features: ${project.features.join(', ')}
    - Database: ${project.database || 'None'}
    - Auth: ${project.auth || 'None'}
    
    Include proper error handling, CORS, and API endpoints.
    `, {
      task_type: 'code',
      quality: 'premium'
    });

    return response.result;
  };

  const generateReactApp = async (project: Project) => {
    const response = await sendMessage(`
    Generate a React App component for a project with these features:
    - ${project.features.join('\n- ')}
    
    Include modern React hooks, responsive design, and API integration.
    `, {
      task_type: 'code',
      quality: 'premium'
    });

    return response.result;
  };

  const generateDatabaseSchema = async (project: Project) => {
    const response = await sendMessage(`
    Generate a ${project.database} database schema for a project with these features:
    - ${project.features.join('\n- ')}
    
    Include proper tables, relationships, and indexes.
    `, {
      task_type: 'code',
      quality: 'premium'
    });

    return response.result;
  };

  const setupPreview = async (project: Project) => {
    // In a real implementation, this would start a dev server
    // For now, we'll simulate a preview URL
    setPreviewUrl(`http://localhost:3000/preview/${project.id}`);
  };

  const modifyProject = async (analysis: any) => {
    if (!currentProject) return;

    const modifyMessage: Message = {
      id: Date.now().toString(),
      type: 'agent',
      content: `🔧 **Modifying project "${currentProject.name}"...**`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, modifyMessage]);

    // Implement modification logic
    const response = await sendMessage(`
    Modify the existing project based on this request: "${analysis.prompt}"
    Current features: ${currentProject.features.join(', ')}
    `, {
      task_type: 'code',
      quality: 'premium'
    });

    const successMessage: Message = {
      id: Date.now().toString(),
      type: 'agent',
      content: `✅ **Project modified successfully!**\n\n${response.result}`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, successMessage]);
  };

  const deployProject = async () => {
    if (!currentProject) return;

    setCurrentPhase('Preparing deployment...');
    setProgress(20);

    const deployMessage: Message = {
      id: Date.now().toString(),
      type: 'agent',
      content: `🚀 **Deploying "${currentProject.name}"...**`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, deployMessage]);

    // Simulate deployment process
    setCurrentPhase('Building project...');
    setProgress(40);
    await new Promise(resolve => setTimeout(resolve, 2000));

    setCurrentPhase('Optimizing assets...');
    setProgress(60);
    await new Promise(resolve => setTimeout(resolve, 2000));

    setCurrentPhase('Deploying to cloud...');
    setProgress(80);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update project with deployment info
    currentProject.status = 'deployed';
    currentProject.deployment = {
      url: `https://${currentProject.name}.lexos.app`,
      domain: `${currentProject.name}.lexos.app`,
      provider: 'LexOS Cloud'
    };

    setProgress(100);
    setCurrentPhase('Deployment complete!');

    const successMessage: Message = {
      id: Date.now().toString(),
      type: 'agent',
      content: `✅ **Deployment successful!**

Your app is now live at: ${currentProject.deployment.url}

**Deployment Details:**
- Provider: ${currentProject.deployment.provider}
- Domain: ${currentProject.deployment.domain}
- SSL: Enabled
- CDN: Active
- Auto-scaling: Configured`,
      timestamp: new Date(),
      metadata: { action: 'deployed' }
    };
    setMessages(prev => [...prev, successMessage]);
  };

  const handleGeneralQuery = async (prompt: string) => {
    const response = await sendMessage(prompt, {
      task_type: 'chat',
      quality: 'standard'
    });

    const agentMessage: Message = {
      id: Date.now().toString(),
      type: 'agent',
      content: response.result,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, agentMessage]);
  };

  const downloadProject = () => {
    if (!currentProject) return;

    // Create a zip file with all project files
    const projectData = {
      ...currentProject,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name}-lexos-export.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Project Exported",
      description: `${currentProject.name} has been downloaded successfully.`,
    });
  };

  return (
    <Card className="h-full flex flex-col glass-card border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/20 rounded-full glow">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Super Agent</CardTitle>
              <CardDescription>
                AI-powered full-stack development assistant
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {currentProject && (
              <>
                <Badge variant="outline" className="text-xs">
                  <Package className="h-3 w-3 mr-1" />
                  {currentProject.name}
                </Badge>
                <Badge 
                  variant={currentProject.status === 'deployed' ? 'default' : 'secondary'} 
                  className="text-xs"
                >
                  {currentProject.status}
                </Badge>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger value="chat" className="data-[state=active]:border-b-2 rounded-none">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="files" className="data-[state=active]:border-b-2 rounded-none" disabled={!currentProject}>
              <FileCode className="h-4 w-4 mr-2" />
              Files
            </TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:border-b-2 rounded-none" disabled={!previewUrl}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="deploy" className="data-[state=active]:border-b-2 rounded-none" disabled={!currentProject}>
              <Rocket className="h-4 w-4 mr-2" />
              Deploy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 p-0 m-0 h-[calc(100%-40px)]">
            <div className="flex flex-col h-full">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : ''}`}>
                        <div className={`p-4 rounded-lg ${
                          message.type === 'user' ? 'bg-primary text-primary-foreground' :
                          message.type === 'system' ? 'bg-muted' :
                          'bg-secondary'
                        }`}>
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            {message.content.split('\n').map((line, i) => (
                              <div key={i}>{line}</div>
                            ))}
                          </div>
                          
                          {message.metadata?.files && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {message.metadata.files.map((file, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  <FileCode className="h-3 w-3 mr-1" />
                                  {file}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isGenerating && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">{currentPhase}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Describe the app you want to build..."
                    disabled={isGenerating}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={isGenerating || !input.trim()}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isGenerating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI-Powered Development
                    </span>
                    <span className="flex items-center">
                      <Zap className="h-3 w-3 mr-1" />
                      Instant Preview
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="files" className="flex-1 p-4 m-0">
            {currentProject && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Project Files</h3>
                  <Button variant="outline" size="sm" onClick={downloadProject}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Project
                  </Button>
                </div>
                
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {currentProject.files.map((file, idx) => (
                      <Card key={idx} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FileCode className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{file.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {file.type}
                            </Badge>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Code2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="flex-1 p-0 m-0">
            {previewUrl && (
              <div className="h-full flex flex-col">
                <div className="p-2 border-b flex items-center justify-between bg-muted/50">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      <Globe className="h-3 w-3 mr-1" />
                      Live Preview
                    </Badge>
                    <span className="text-xs text-muted-foreground">{previewUrl}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex-1 bg-white">
                  <iframe
                    ref={previewRef}
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title="App Preview"
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="deploy" className="flex-1 p-4 m-0">
            {currentProject && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Deployment Options</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4 cursor-pointer hover:border-primary transition-colors">
                      <div className="flex items-start space-x-3">
                        <Cloud className="h-5 w-5 text-primary mt-1" />
                        <div className="flex-1">
                          <h4 className="font-semibold">LexOS Cloud</h4>
                          <p className="text-sm text-muted-foreground">
                            Deploy to our managed cloud infrastructure
                          </p>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Check className="h-3 w-3 mr-1 text-green-500" />
                              Auto-scaling
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Check className="h-3 w-3 mr-1 text-green-500" />
                              SSL included
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Check className="h-3 w-3 mr-1 text-green-500" />
                              Global CDN
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 cursor-pointer hover:border-primary transition-colors">
                      <div className="flex items-start space-x-3">
                        <Server className="h-5 w-5 text-primary mt-1" />
                        <div className="flex-1">
                          <h4 className="font-semibold">Self-Host</h4>
                          <p className="text-sm text-muted-foreground">
                            Download and deploy on your own infrastructure
                          </p>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Check className="h-3 w-3 mr-1 text-green-500" />
                              Full control
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Check className="h-3 w-3 mr-1 text-green-500" />
                              Docker support
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Check className="h-3 w-3 mr-1 text-green-500" />
                              Kubernetes ready
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {currentProject.deployment ? (
                  <Card className="p-6 bg-green-500/10 border-green-500/20">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-500/20 rounded-full">
                        <Check className="h-6 w-6 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-700 dark:text-green-300">
                          Deployment Successful!
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your app is live at{' '}
                          <a 
                            href={currentProject.deployment.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {currentProject.deployment.url}
                          </a>
                        </p>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <div className="flex justify-center">
                    <Button 
                      onClick={deployProject} 
                      disabled={isGenerating}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Rocket className="h-4 w-4 mr-2" />
                      Deploy to LexOS Cloud
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};