import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAIAPI } from '@/hooks/use-ai-api-local';
import { API_BASE_URL } from '@/config/api';
import { 
  Code2, 
  Sparkles, 
  Rocket,
  Database,
  Shield,
  Globe,
  GitBranch,
  Play,
  Save,
  Upload,
  Download,
  Eye,
  FileCode,
  FolderOpen,
  Plus,
  MessageSquare,
  Cpu,
  Cloud,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Terminal,
  Palette,
  Package,
  Server,
  Smartphone,
  Monitor,
  Settings,
  History
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  type: 'react' | 'nodejs' | 'python' | 'fullstack';
  features: string[];
  createdAt: string;
  checkpoints: Array<{
    id: string;
    message: string;
    createdAt: string;
  }>;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  files?: Array<{ path: string; content: string }>;
}

export const DeepAgent = () => {
  const { toast } = useToast();
  const { sendMessage, loading } = useAIAPI();
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('am-thinking-v1-32b');
  
  // New project form
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectType, setNewProjectType] = useState<'react' | 'nodejs' | 'python' | 'fullstack'>('react');
  const [newProjectFeatures, setNewProjectFeatures] = useState<string[]>([]);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const loadProjects = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/deep-agent/list`);
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a project name",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingProject(true);
    try {
      const response = await fetch(`${API_BASE_URL}/deep-agent/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
          type: newProjectType,
          features: newProjectFeatures,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Project Created",
          description: `Successfully created ${newProjectName}`,
        });
        
        // Reset form
        setNewProjectName('');
        setNewProjectDescription('');
        setNewProjectFeatures([]);
        
        // Reload projects and select the new one
        await loadProjects();
        await loadProject(data.projectId);
        
        // Add welcome message
        setChatMessages([{
          id: Date.now().toString(),
          role: 'assistant',
          content: `🎉 Welcome to your new ${newProjectType} project! I'm ready to help you build amazing features. Just describe what you want to create, and I'll generate the code for you.`,
          timestamp: new Date().toISOString(),
        }]);
      } else {
        throw new Error(data.error || 'Failed to create project');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create project",
        variant: "destructive"
      });
    } finally {
      setIsCreatingProject(false);
    }
  };

  const loadProject = async (projectId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/deep-agent/project/${projectId}`);
      const data = await response.json();
      
      if (data.success) {
        setActiveProject(data.metadata);
        setFileTree(data.files);
      }
    } catch (error) {
      console.error('Error loading project:', error);
      toast({
        title: "Error",
        description: "Failed to load project",
        variant: "destructive"
      });
    }
  };

  const sendChatMessage = async () => {
    if (!userInput.trim() || !activeProject) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setUserInput('');

    try {
      // First, use the AI to understand the request
      const aiResponse = await sendMessage(userInput, {
        model: selectedModel,
        systemPrompt: `You are an expert ${activeProject.type} developer helping to build a project. 
        The project is: ${activeProject.name} - ${activeProject.description}.
        Project type: ${activeProject.type}
        Features: ${activeProject.features.join(', ')}
        
        Help the user by:
        1. Understanding their request
        2. Suggesting code implementations
        3. Explaining the approach
        4. Providing complete, working code
        
        Format your response clearly with explanations and code blocks.`,
      });

      // Add AI response
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, assistantMessage]);

      // Generate code if the user is asking for implementation
      if (userInput.toLowerCase().includes('create') || 
          userInput.toLowerCase().includes('add') || 
          userInput.toLowerCase().includes('implement') ||
          userInput.toLowerCase().includes('build')) {
        
        const generateResponse = await fetch(`${API_BASE_URL}/deep-agent/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: activeProject.id,
            prompt: userInput,
            context: aiResponse,
            model: selectedModel,
          }),
        });

        const generateData = await generateResponse.json();
        if (generateData.success && generateData.generated.files.length > 0) {
          const codeMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            role: 'system',
            content: `Generated ${generateData.generated.files.length} file(s):`,
            timestamp: new Date().toISOString(),
            files: generateData.generated.files,
          };
          setChatMessages(prev => [...prev, codeMessage]);
          
          // Reload file tree
          await loadProject(activeProject.id);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 3).toString(),
        role: 'system',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  };

  const startPreview = async () => {
    if (!activeProject) return;

    try {
      const response = await fetch(`${API_BASE_URL}/deep-agent/preview/${activeProject.id}`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        setPreviewUrl(data.previewUrl);
        toast({
          title: "Preview Started",
          description: "Your app is starting up...",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start preview",
        variant: "destructive"
      });
    }
  };

  const createCheckpoint = async () => {
    if (!activeProject) return;

    const message = prompt('Enter checkpoint message:');
    if (!message) return;

    try {
      const response = await fetch(`${API_BASE_URL}/deep-agent/checkpoint/${activeProject.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Checkpoint Created",
          description: message,
        });
        await loadProject(activeProject.id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create checkpoint",
        variant: "destructive"
      });
    }
  };

  const deployProject = async () => {
    if (!activeProject) return;

    try {
      const response = await fetch(`${API_BASE_URL}/deep-agent/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          platform: 'vercel',
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Deployment Started",
          description: `Your app will be live at ${data.deployment.url}`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deploy project",
        variant: "destructive"
      });
    }
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.path} style={{ paddingLeft: `${level * 16}px` }}>
        <div className="flex items-center space-x-2 p-1 rounded hover:bg-muted/50 cursor-pointer text-sm">
          {node.type === 'directory' ? (
            <FolderOpen className="w-4 h-4 text-lexos-blue" />
          ) : (
            <FileCode className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="flex-1">{node.name}</span>
        </div>
        {node.children && renderFileTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full">
              <Sparkles className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">DeepAgent</h1>
              <p className="text-muted-foreground">AI-powered full-stack app builder</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              <Cpu className="w-3 h-3 mr-1" />
              Powered by H100
            </Badge>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <CheckCircle className="w-3 h-3 mr-1" />
              Ready
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 border-r border-border/50 flex flex-col">
          <div className="p-4 border-b border-border/50">
            <Button 
              onClick={() => setActiveProject(null)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Projects</h3>
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No projects yet. Create your first one!
                </p>
              ) : (
                projects.map((project) => (
                  <Card 
                    key={project.id}
                    className={`cursor-pointer transition-colors ${
                      activeProject?.id === project.id 
                        ? 'border-purple-500/50 bg-purple-500/5' 
                        : 'hover:border-purple-500/30'
                    }`}
                    onClick={() => loadProject(project.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{project.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {project.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-1">
                          {project.features.includes('database') && (
                            <Database className="w-3 h-3 text-muted-foreground" />
                          )}
                          {project.features.includes('auth') && (
                            <Shield className="w-3 h-3 text-muted-foreground" />
                          )}
                          {project.features.includes('tailwind') && (
                            <Palette className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {project.checkpoints.length} checkpoints
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          {activeProject && (
            <div className="p-4 border-t border-border/50 space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={startPreview}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={createCheckpoint}
              >
                <GitBranch className="w-4 h-4 mr-2" />
                Checkpoint
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={deployProject}
              >
                <Rocket className="w-4 h-4 mr-2" />
                Deploy
              </Button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {!activeProject ? (
            // New Project Form
            <div className="flex-1 p-8">
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle>Create New Project</CardTitle>
                  <CardDescription>
                    Start building your app with natural language
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Project Name</label>
                    <Input
                      placeholder="My Awesome App"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea
                      placeholder="Describe what your app will do..."
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Project Type</label>
                    <Select value={newProjectType} onValueChange={(v: any) => setNewProjectType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="react">
                          <div className="flex items-center">
                            <Monitor className="w-4 h-4 mr-2" />
                            React App
                          </div>
                        </SelectItem>
                        <SelectItem value="nodejs">
                          <div className="flex items-center">
                            <Server className="w-4 h-4 mr-2" />
                            Node.js API
                          </div>
                        </SelectItem>
                        <SelectItem value="python">
                          <div className="flex items-center">
                            <Terminal className="w-4 h-4 mr-2" />
                            Python App
                          </div>
                        </SelectItem>
                        <SelectItem value="fullstack">
                          <div className="flex items-center">
                            <Package className="w-4 h-4 mr-2" />
                            Full Stack
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Features</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['database', 'auth', 'tailwind', 'supabase', 'ml'].map((feature) => (
                        <label key={feature} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={newProjectFeatures.includes(feature)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewProjectFeatures([...newProjectFeatures, feature]);
                              } else {
                                setNewProjectFeatures(newProjectFeatures.filter(f => f !== feature));
                              }
                            }}
                          />
                          <span className="text-sm capitalize">{feature}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Button 
                    onClick={createProject}
                    disabled={isCreatingProject}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {isCreatingProject ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create Project
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            // Project View
            <Tabs defaultValue="chat" className="flex-1">
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <TabsList>
                  <TabsTrigger value="chat">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Vibe Coding
                  </TabsTrigger>
                  <TabsTrigger value="files">
                    <FileCode className="w-4 h-4 mr-2" />
                    Files
                  </TabsTrigger>
                  <TabsTrigger value="preview">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="history">
                    <History className="w-4 h-4 mr-2" />
                    History
                  </TabsTrigger>
                </TabsList>

                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="am-thinking-v1-32b">AM Thinking (H100)</SelectItem>
                    <SelectItem value="mistral-magistral-small-24b">Mistral Magistral (H100)</SelectItem>
                    <SelectItem value="llama-3.3-70b-versatile">LLaMA 3.3 70B (Groq)</SelectItem>
                    <SelectItem value="deepseek-r1">DeepSeek R1</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <TabsContent value="chat" className="flex-1 flex flex-col p-4">
                <ScrollArea className="flex-1 mb-4" ref={chatScrollRef}>
                  <div className="space-y-4 pb-4">
                    {chatMessages.map((message) => (
                      <div key={message.id} className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}>
                        <div className={`max-w-[80%] ${
                          message.role === 'user' 
                            ? 'bg-purple-500/10 border-purple-500/30' 
                            : message.role === 'assistant'
                            ? 'bg-blue-500/10 border-blue-500/30'
                            : 'bg-green-500/10 border-green-500/30'
                        } border rounded-lg p-4`}>
                          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                          {message.files && (
                            <div className="mt-2 space-y-2">
                              {message.files.map((file, idx) => (
                                <div key={idx} className="bg-black/50 rounded p-2">
                                  <div className="text-xs text-muted-foreground mb-1">{file.path}</div>
                                  <pre className="text-xs overflow-x-auto">
                                    <code>{file.content}</code>
                                  </pre>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex space-x-2">
                  <Textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendChatMessage();
                      }
                    }}
                    placeholder="Describe what you want to build..."
                    className="flex-1 min-h-[80px] max-h-[200px]"
                  />
                  <Button 
                    onClick={sendChatMessage}
                    disabled={loading || !userInput.trim()}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="files" className="flex-1 p-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Project Files</CardTitle>
                    <CardDescription>{activeProject.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-1">
                        {renderFileTree(fileTree)}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 p-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Live Preview</CardTitle>
                    <CardDescription>
                      {previewUrl ? `Running at ${previewUrl}` : 'Click "Preview" to start'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-full">
                    {previewUrl ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-[600px] rounded-lg border"
                        title="App Preview"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-[600px] bg-muted/30 rounded-lg">
                        <div className="text-center">
                          <Monitor className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            Preview will appear here when you start the development server
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="flex-1 p-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Checkpoints</CardTitle>
                    <CardDescription>Version history for {activeProject.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {activeProject.checkpoints.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No checkpoints yet. Create one to save your progress!
                        </p>
                      ) : (
                        activeProject.checkpoints.map((checkpoint) => (
                          <div key={checkpoint.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{checkpoint.message}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(checkpoint.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <GitBranch className="w-4 h-4 text-muted-foreground" />
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Feature Banner */}
      <div className="p-4 border-t border-border/50 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
        <div className="flex items-center justify-center space-x-8 text-sm">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-purple-500" />
            <span>Natural Language Coding</span>
          </div>
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-purple-500" />
            <span>Built-in Database</span>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-purple-500" />
            <span>Authentication Ready</span>
          </div>
          <div className="flex items-center space-x-2">
            <Rocket className="w-4 h-4 text-purple-500" />
            <span>One-Click Deploy</span>
          </div>
          <div className="flex items-center space-x-2">
            <Cloud className="w-4 h-4 text-purple-500" />
            <span>Multi-Cloud Support</span>
          </div>
        </div>
      </div>
    </div>
  );
};