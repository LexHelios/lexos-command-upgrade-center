import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Zap, Clock, TrendingUp, Settings, Play, Pause, RotateCcw } from 'lucide-react';
import { SecureAPIService, APIResponse } from '@/services/SecureAPIService';
import { useToast } from '@/hooks/use-toast';

interface OrchestrationTask {
  id: string;
  type: 'analysis' | 'creative' | 'research' | 'coding' | 'decision';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  assignedModel?: string;
  result?: APIResponse;
  startTime?: Date;
  endTime?: Date;
}

export const SmartOrchestrator = () => {
  const [tasks, setTasks] = useState<OrchestrationTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelPerformance, setModelPerformance] = useState({
    openai: { score: 95, tasks: 45, avgTime: 2.3 },
    anthropic: { score: 92, tasks: 38, avgTime: 2.8 },
    grok: { score: 88, tasks: 12, avgTime: 1.9 },
    perplexity: { score: 90, tasks: 23, avgTime: 3.1 }
  });
  const { toast } = useToast();
  const apiService = new SecureAPIService();

  const smartRouting = (taskType: string, complexity: number): { task_type: string, quality: string } => {
    // Updated routing logic for the new API system
    if (taskType === 'research' || taskType === 'analysis') {
      return { task_type: 'reasoning', quality: complexity > 0.7 ? 'premium' : 'standard' };
    }
    if (taskType === 'creative') {
      return { task_type: 'text', quality: complexity > 0.8 ? 'premium' : 'standard' };
    }
    if (taskType === 'coding') {
      return { task_type: 'code', quality: 'standard' };
    }
    if (taskType === 'decision') {
      return { task_type: 'reasoning', quality: 'premium' };
    }
    return { task_type: 'general', quality: 'standard' }; // Default fallback
  };

  const processTask = async (task: OrchestrationTask) => {
    setIsProcessing(true);
    const startTime = new Date();
    
    try {
      // Determine complexity (simple heuristic)
      const complexity = task.description.length / 500 + (task.priority === 'critical' ? 0.5 : 0);
      
      // Smart routing using the new unified API
      const routingConfig = smartRouting(task.type, complexity);
      
      // Update task status
      const updatedTask: OrchestrationTask = {
        ...task,
        status: 'processing',
        assignedModel: `${routingConfig.task_type}/${routingConfig.quality}`,
        startTime
      };
      
      setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));

      // Call the unified API service
      const result = await apiService.callAI(task.description, {
        task_type: routingConfig.task_type,
        complexity: complexity > 0.7 ? 'high' : complexity > 0.3 ? 'medium' : 'low',
        quality: routingConfig.quality,
        prefer_self_hosted: true // Prefer free H100 models when available
      });

      const endTime = new Date();
      
      // Update task with result
      setTasks(prev => prev.map(t => 
        t.id === task.id 
          ? { ...t, status: 'completed', result, endTime }
          : t
      ));

      toast({
        title: "Task Completed",
        description: `${task.type} task processed by ${result.provider}/${result.model}`,
      });

    } catch (error) {
      setTasks(prev => prev.map(t => 
        t.id === task.id 
          ? { ...t, status: 'failed' }
          : t
      ));
      
      toast({
        title: "Task Failed",
        description: `Error processing ${task.type} task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const addSampleTask = () => {
    const sampleTasks = [
      { type: 'analysis', description: 'Analyze quarterly business performance and identify growth opportunities', priority: 'high' },
      { type: 'creative', description: 'Write a compelling marketing copy for a new AI assistant product', priority: 'medium' },
      { type: 'research', description: 'Research the latest trends in personal productivity apps', priority: 'medium' },
      { type: 'coding', description: 'Generate Python code for data visualization dashboard', priority: 'low' },
      { type: 'decision', description: 'Should I invest in new productivity tools for my team?', priority: 'high' }
    ];

    const randomTask = sampleTasks[Math.floor(Math.random() * sampleTasks.length)];
    const newTask: OrchestrationTask = {
      id: Date.now().toString(),
      type: randomTask.type as 'analysis' | 'creative' | 'research' | 'coding' | 'decision',
      description: randomTask.description,
      priority: randomTask.priority as 'low' | 'medium' | 'high' | 'critical',
      status: 'pending'
    };

    setTasks(prev => [newTask, ...prev]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            Smart AI Orchestrator
          </h2>
          <p className="text-muted-foreground">Intelligent task routing across multiple AI models</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={addSampleTask} variant="outline">
            <Play className="h-4 w-4 mr-2" />
            Add Sample Task
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configure Routing
          </Button>
        </div>
      </div>

      <Tabs defaultValue="tasks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tasks">Active Tasks</TabsTrigger>
          <TabsTrigger value="performance">Model Performance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <div className="grid gap-4">
            {tasks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
                  <p className="text-muted-foreground mb-4">Add a sample task to see the orchestrator in action</p>
                  <Button onClick={addSampleTask}>
                    <Zap className="h-4 w-4 mr-2" />
                    Add Sample Task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              tasks.map((task) => (
                <Card key={task.id} className="animate-fade-in">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(task.status)}`} />
                        {task.type.charAt(0).toUpperCase() + task.type.slice(1)} Task
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        {task.assignedModel && (
                          <Badge variant="outline">
                            {task.assignedModel}
                          </Badge>
                        )}
                        {task.status === 'pending' && (
                          <Button 
                            size="sm" 
                            onClick={() => processTask(task)}
                            disabled={isProcessing}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Process
                          </Button>
                        )}
                      </div>
                    </div>
                    <CardDescription>{task.description}</CardDescription>
                  </CardHeader>
                  
                  {task.status === 'processing' && (
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Processing with {task.assignedModel}...</span>
                          <span className="text-muted-foreground">
                            {task.startTime && `Started ${task.startTime.toLocaleTimeString()}`}
                          </span>
                        </div>
                        <Progress value={65} className="w-full" />
                      </div>
                    </CardContent>
                  )}
                  
                  {task.result && task.status === 'completed' && (
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Completed by {task.result.provider}</span>
                          <span>
                            {task.endTime && task.startTime && 
                              `${((task.endTime.getTime() - task.startTime.getTime()) / 1000).toFixed(1)}s`
                            }
                          </span>
                        </div>
                        <div className="bg-muted p-4 rounded-lg">
                          <p className="text-sm">{task.result.text.substring(0, 200)}...</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Confidence: {(task.result.confidence * 100).toFixed(0)}%</span>
                          <span>Tokens: {task.result.usage?.tokens || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(modelPerformance).map(([model, stats]) => (
              <Card key={model}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg capitalize">{model}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Performance Score</span>
                      <span className="font-medium">{stats.score}%</span>
                    </div>
                    <Progress value={stats.score} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tasks</p>
                      <p className="font-medium">{stats.tasks}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Time</p>
                      <p className="font-medium">{stats.avgTime}s</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Total Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{tasks.length}</p>
                <p className="text-sm text-muted-foreground">All time</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Avg Response Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">2.5s</p>
                <p className="text-sm text-muted-foreground">Across all models</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">98.2%</p>
                <p className="text-sm text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};