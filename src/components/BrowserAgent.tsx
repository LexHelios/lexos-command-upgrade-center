import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAIAPI } from '@/hooks/use-ai-api';
import { auth } from '@/integrations/supabase/client';
import { API_BASE_URL } from '@/config/api';
import {
  Globe, 
  MousePointer, 
  Eye, 
  Shield, 
  Zap, 
  Brain, 
  Play, 
  Square, 
  RotateCcw,
  Monitor,
  Smartphone,
  Settings,
  Camera,
  Download,
  Upload,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface BrowserTask {
  id: string;
  url: string;
  task: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  screenshot?: string;
  timestamp: string;
}

interface CaptchaChallenge {
  type: 'recaptcha' | 'hcaptcha' | 'cloudflare' | 'custom';
  solved: boolean;
  solution?: string;
}

export const BrowserAgent: React.FC = () => {
  const [currentUrl, setCurrentUrl] = useState('https://example.com');
  const [taskDescription, setTaskDescription] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [browserTasks, setBrowserTasks] = useState<BrowserTask[]>([]);
  const [captchaChallenge, setCaptchaChallenge] = useState<CaptchaChallenge | null>(null);
  const [proxyEnabled, setProxyEnabled] = useState(true);
  const [stealthMode, setStealthMode] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState('desktop');
  const { sendMessage, loading } = useAIAPI();
  
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleStartTask = async () => {
    if (!taskDescription.trim() || !currentUrl.trim()) return;

    setIsRunning(true);
    
    const newTask: BrowserTask = {
      id: Date.now().toString(),
      url: currentUrl,
      task: taskDescription,
      status: 'running',
      timestamp: new Date().toLocaleString()
    };
    
    setBrowserTasks(prev => [newTask, ...prev]);

    try {
      // Get the current session
      const { data: { session } } = await auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call the browser automation backend
      const response = await fetch(`${API_BASE_URL}/browser-agent/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: currentUrl,
          action: 'navigate',
          task: taskDescription,
          options: {
            device: selectedDevice,
            stealth: stealthMode,
            proxy: proxyEnabled
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Browser automation failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Update task with results
      setBrowserTasks(prev => prev.map(task => 
        task.id === newTask.id 
          ? { 
              ...task, 
              status: 'completed', 
              result: data.result,
              screenshot: data.screenshot_url 
            }
          : task
      ));

      // Handle CAPTCHA if detected
      if (data.captcha_detected && !data.captcha_solved) {
        setCaptchaChallenge({
          type: 'recaptcha',
          solved: false
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Browser automation failed";
      setBrowserTasks(prev => prev.map(task => 
        task.id === newTask.id 
          ? { ...task, status: 'failed', result: errorMessage }
          : task
      ));
    } finally {
      setIsRunning(false);
    }
  };

  const handleSolveCaptcha = async () => {
    if (!captchaChallenge) return;
    
    // Simulate CAPTCHA solving
    setTimeout(() => {
      setCaptchaChallenge(prev => prev ? { ...prev, solved: true, solution: 'CAPTCHA_SOLVED_TOKEN' } : null);
      setTimeout(() => setCaptchaChallenge(null), 3000);
    }, 2000);
  };

  const takeScreenshot = () => {
    // Simulate screenshot capture
    console.log('Taking screenshot of current page...');
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-full">
                <Globe className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-2xl">🌐 Browser Agent</CardTitle>
                <CardDescription>
                  Autonomous web automation with AI-driven task execution
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-blue-500 border-blue-500/30">
              v2025.7 STABLE
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Tech Stack Display */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 mb-2">
              <Globe className="h-5 w-5 text-green-500" />
              <span className="font-semibold text-sm">Nano Browser</span>
            </div>
            <p className="text-xs text-muted-foreground">In-browser autonomy</p>
            <Badge variant="outline" className="text-green-500 border-green-500/30 mt-2 text-xs">
              Active
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-5 w-5 text-purple-500" />
              <span className="font-semibold text-sm">Stagehand</span>
            </div>
            <p className="text-xs text-muted-foreground">Stealth & Sessions</p>
            <Badge variant="outline" className="text-purple-500 border-purple-500/30 mt-2 text-xs">
              {stealthMode ? 'Enabled' : 'Disabled'}
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 mb-2">
              <Brain className="h-5 w-5 text-orange-500" />
              <span className="font-semibold text-sm">AgentGPT</span>
            </div>
            <p className="text-xs text-muted-foreground">LLM Task Chaining</p>
            <Badge variant="outline" className="text-orange-500 border-orange-500/30 mt-2 text-xs">
              Ready
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold text-sm">Capsolver</span>
            </div>
            <p className="text-xs text-muted-foreground">CAPTCHA Solving</p>
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 mt-2 text-xs">
              {captchaChallenge ? 'Active' : 'Standby'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* CAPTCHA Challenge Modal */}
      {captchaChallenge && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              CAPTCHA Challenge Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Type: {captchaChallenge.type.toUpperCase()}
                </p>
                {captchaChallenge.solved ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span className="text-sm">CAPTCHA Solved Successfully</span>
                  </div>
                ) : (
                  <Button 
                    onClick={handleSolveCaptcha}
                    size="sm"
                    variant="outline"
                    className="border-yellow-500/30"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Solve with Capsolver
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Control Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🎮 Control Panel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Target URL</label>
                <Input
                  placeholder="https://example.com"
                  value={currentUrl}
                  onChange={(e) => setCurrentUrl(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Task Description</label>
                <Textarea
                  placeholder="Describe what you want the browser agent to do..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium mb-2 block">Device</label>
                  <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desktop">
                        <div className="flex items-center">
                          <Monitor className="h-4 w-4 mr-2" />
                          Desktop
                        </div>
                      </SelectItem>
                      <SelectItem value="mobile">
                        <div className="flex items-center">
                          <Smartphone className="h-4 w-4 mr-2" />
                          Mobile
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Settings</label>
                  <div className="flex space-x-2">
                    <Button
                      variant={stealthMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStealthMode(!stealthMode)}
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={proxyEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setProxyEnabled(!proxyEnabled)}
                    >
                      <Globe className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button 
                  onClick={handleStartTask}
                  disabled={isRunning || loading || !taskDescription.trim()}
                  className="flex-1"
                >
                  {isRunning ? (
                    <>
                      <Square className="h-4 w-4 mr-2" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Task
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={takeScreenshot}
                  size="sm"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Task History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📋 Task History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {browserTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tasks executed yet
                  </p>
                ) : (
                  browserTasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant={
                            task.status === 'completed' ? 'default' :
                            task.status === 'failed' ? 'destructive' :
                            task.status === 'running' ? 'secondary' : 'outline'
                          }
                          className="text-xs"
                        >
                          {task.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{task.timestamp}</span>
                      </div>
                      <p className="text-sm font-medium truncate">{task.task}</p>
                      <p className="text-xs text-muted-foreground truncate">{task.url}</p>
                      {task.result && (
                        <div className="bg-muted/30 p-2 rounded text-xs">
                          {task.result.substring(0, 100)}...
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Browser View */}
        <div className="lg:col-span-2">
          <Card className="h-[600px]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">🌐 Browser View</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    <span>{isRunning ? 'Active' : 'Idle'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Globe className="h-4 w-4" />
                <span className="font-mono bg-muted px-2 py-1 rounded">{currentUrl}</span>
              </div>
            </CardHeader>
            <CardContent className="h-full p-0">
              <div className="w-full h-[500px] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700">
                <div className="text-center space-y-4">
                  <Globe className="h-16 w-16 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-muted-foreground">Browser Simulation</h3>
                    <p className="text-sm text-muted-foreground">
                      {isRunning ? 'Executing automation task...' : 'Ready for browser automation'}
                    </p>
                  </div>
                  {isRunning && (
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-4">🚀 Browser Agent Capabilities</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Autonomous Navigation</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Form Auto-Fill</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>CAPTCHA Solving</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Stealth Browsing</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Session Management</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Proxy Integration</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Human-like Behavior</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Multi-Device Support</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};