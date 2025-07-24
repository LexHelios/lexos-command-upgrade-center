import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Bot, 
  Brain, 
  Zap, 
  Globe, 
  Mic, 
  Eye, 
  Shield, 
  Code, 
  FileText,
  Activity,
  Play,
  Pause,
  Square,
  Settings,
  TrendingUp,
  Clock,
  Users,
  MessageSquare,
  Cpu,
  Network
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  type: 'chat' | 'voice' | 'vision' | 'code' | 'browser' | 'shadow' | 'orchestrator';
  status: 'active' | 'idle' | 'busy' | 'offline';
  model: string;
  provider: string;
  tasksCompleted: number;
  avgResponseTime: number;
  successRate: number;
  lastActivity: Date;
  capabilities: string[];
  currentTask?: string;
  cost: number;
  tokens: number;
}

interface AgentMetrics {
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  avgResponseTime: number;
  totalCost: number;
  successRate: number;
}

export const AgentDashboard = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [metrics, setMetrics] = useState<AgentMetrics>({
    totalAgents: 0,
    activeAgents: 0,
    totalTasks: 0,
    avgResponseTime: 0,
    totalCost: 0,
    successRate: 0
  });
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    const initializeAgents = () => {
      const initialAgents: Agent[] = [
        {
          id: 'chat-agent',
          name: 'Chat Assistant',
          type: 'chat',
          status: 'active',
          model: 'gpt-4.1-2025-04-14',
          provider: 'openai',
          tasksCompleted: 1247,
          avgResponseTime: 2300,
          successRate: 98.5,
          lastActivity: new Date(),
          capabilities: ['Text Generation', 'Reasoning', 'Analysis', 'Code Review'],
          currentTask: 'Processing user query about AI capabilities',
          cost: 12.45,
          tokens: 45230
        },
        {
          id: 'voice-agent',
          name: 'Voice Synthesizer',
          type: 'voice',
          status: 'idle',
          model: 'eleven_turbo_v2_5',
          provider: 'elevenlabs',
          tasksCompleted: 342,
          avgResponseTime: 1800,
          successRate: 99.2,
          lastActivity: new Date(Date.now() - 300000),
          capabilities: ['Text-to-Speech', 'Voice Cloning', 'Multi-language'],
          cost: 3.21,
          tokens: 0
        },
        {
          id: 'vision-agent',
          name: 'Vision Processor',
          type: 'vision',
          status: 'busy',
          model: 'gpt-4-vision-preview',
          provider: 'openai',
          tasksCompleted: 156,
          avgResponseTime: 3200,
          successRate: 96.8,
          lastActivity: new Date(),
          capabilities: ['Image Analysis', 'OCR', 'Visual Reasoning', 'Chart Reading'],
          currentTask: 'Analyzing uploaded document images',
          cost: 8.92,
          tokens: 23400
        },
        {
          id: 'code-agent',
          name: 'Code Assistant',
          type: 'code',
          status: 'active',
          model: 'claude-sonnet-4-20250514',
          provider: 'anthropic',
          tasksCompleted: 89,
          avgResponseTime: 2800,
          successRate: 97.3,
          lastActivity: new Date(),
          capabilities: ['Code Generation', 'Debugging', 'Refactoring', 'Documentation'],
          currentTask: 'Generating React component',
          cost: 15.67,
          tokens: 34500
        },
        {
          id: 'browser-agent',
          name: 'Web Automator',
          type: 'browser',
          status: 'idle',
          model: 'playwright',
          provider: 'browser',
          tasksCompleted: 23,
          avgResponseTime: 5400,
          successRate: 94.1,
          lastActivity: new Date(Date.now() - 600000),
          capabilities: ['Web Scraping', 'Form Filling', 'Navigation', 'CAPTCHA Solving'],
          cost: 0.45,
          tokens: 0
        },
        {
          id: 'shadow-agent',
          name: 'Shadow Agent',
          type: 'shadow',
          status: 'offline',
          model: 'unrestricted',
          provider: 'shadow',
          tasksCompleted: 7,
          avgResponseTime: 1200,
          successRate: 100,
          lastActivity: new Date(Date.now() - 3600000),
          capabilities: ['Unrestricted Access', 'Advanced Reasoning', 'System Control'],
          cost: 0.00,
          tokens: 0
        },
        {
          id: 'orchestrator',
          name: 'Smart Orchestrator',
          type: 'orchestrator',
          status: 'active',
          model: 'multi-model',
          provider: 'lexos',
          tasksCompleted: 456,
          avgResponseTime: 1800,
          successRate: 99.1,
          lastActivity: new Date(),
          capabilities: ['Task Routing', 'Model Selection', 'Cost Optimization', 'Load Balancing'],
          currentTask: 'Optimizing model selection for incoming requests',
          cost: 8.23,
          tokens: 67890
        }
      ];

      setAgents(initialAgents);
      updateMetrics(initialAgents);
    };

    initializeAgents();
    const interval = setInterval(updateAgentStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const initializeAgents = () => {
    const initialAgents: Agent[] = [
      {
        id: 'chat-agent',
        name: 'Chat Assistant',
        type: 'chat',
        status: 'active',
        model: 'gpt-4.1-2025-04-14',
        provider: 'openai',
        tasksCompleted: 1247,
        avgResponseTime: 2300,
        successRate: 98.5,
        lastActivity: new Date(),
        capabilities: ['Text Generation', 'Reasoning', 'Analysis', 'Code Review'],
        currentTask: 'Processing user query about AI capabilities',
        cost: 12.45,
        tokens: 45230
      },
      {
        id: 'voice-agent',
        name: 'Voice Synthesizer',
        type: 'voice',
        status: 'idle',
        model: 'eleven_turbo_v2_5',
        provider: 'elevenlabs',
        tasksCompleted: 342,
        avgResponseTime: 1800,
        successRate: 99.2,
        lastActivity: new Date(Date.now() - 300000),
        capabilities: ['Text-to-Speech', 'Voice Cloning', 'Multi-language'],
        cost: 3.21,
        tokens: 0
      },
      {
        id: 'vision-agent',
        name: 'Vision Processor',
        type: 'vision',
        status: 'busy',
        model: 'gpt-4-vision-preview',
        provider: 'openai',
        tasksCompleted: 156,
        avgResponseTime: 3200,
        successRate: 96.8,
        lastActivity: new Date(),
        capabilities: ['Image Analysis', 'OCR', 'Visual Reasoning', 'Chart Reading'],
        currentTask: 'Analyzing uploaded document images',
        cost: 8.92,
        tokens: 23400
      },
      {
        id: 'code-agent',
        name: 'Code Assistant',
        type: 'code',
        status: 'active',
        model: 'claude-sonnet-4-20250514',
        provider: 'anthropic',
        tasksCompleted: 89,
        avgResponseTime: 2800,
        successRate: 97.3,
        lastActivity: new Date(),
        capabilities: ['Code Generation', 'Debugging', 'Refactoring', 'Documentation'],
        currentTask: 'Generating React component',
        cost: 15.67,
        tokens: 34500
      },
      {
        id: 'browser-agent',
        name: 'Web Automator',
        type: 'browser',
        status: 'idle',
        model: 'playwright',
        provider: 'browser',
        tasksCompleted: 23,
        avgResponseTime: 5400,
        successRate: 94.1,
        lastActivity: new Date(Date.now() - 600000),
        capabilities: ['Web Scraping', 'Form Filling', 'Navigation', 'CAPTCHA Solving'],
        cost: 0.45,
        tokens: 0
      },
      {
        id: 'shadow-agent',
        name: 'Shadow Agent',
        type: 'shadow',
        status: 'offline',
        model: 'unrestricted',
        provider: 'shadow',
        tasksCompleted: 7,
        avgResponseTime: 1200,
        successRate: 100,
        lastActivity: new Date(Date.now() - 3600000),
        capabilities: ['Unrestricted Access', 'Advanced Reasoning', 'System Control'],
        cost: 0.00,
        tokens: 0
      },
      {
        id: 'orchestrator',
        name: 'Smart Orchestrator',
        type: 'orchestrator',
        status: 'active',
        model: 'multi-model',
        provider: 'lexos',
        tasksCompleted: 456,
        avgResponseTime: 1800,
        successRate: 99.1,
        lastActivity: new Date(),
        capabilities: ['Task Routing', 'Model Selection', 'Cost Optimization', 'Load Balancing'],
        currentTask: 'Optimizing model selection for incoming requests',
        cost: 8.23,
        tokens: 67890
      }
    ];

    setAgents(initialAgents);
    updateMetrics(initialAgents);
  };

  const updateAgentStatus = () => {
    setAgents(prev => prev.map(agent => {
      // Randomly update some agents
      if (Math.random() > 0.7) {
        const statuses: Agent['status'][] = ['active', 'idle', 'busy'];
        const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        return {
          ...agent,
          status: newStatus,
          lastActivity: newStatus === 'active' || newStatus === 'busy' ? new Date() : agent.lastActivity,
          tasksCompleted: newStatus === 'active' ? agent.tasksCompleted + 1 : agent.tasksCompleted,
          avgResponseTime: agent.avgResponseTime + (Math.random() - 0.5) * 200
        };
      }
      return agent;
    }));
  };

  const updateMetrics = (agentList: Agent[]) => {
    const totalAgents = agentList.length;
    const activeAgents = agentList.filter(a => a.status === 'active' || a.status === 'busy').length;
    const totalTasks = agentList.reduce((sum, a) => sum + a.tasksCompleted, 0);
    const avgResponseTime = agentList.reduce((sum, a) => sum + a.avgResponseTime, 0) / totalAgents;
    const totalCost = agentList.reduce((sum, a) => sum + a.cost, 0);
    const successRate = agentList.reduce((sum, a) => sum + a.successRate, 0) / totalAgents;

    setMetrics({
      totalAgents,
      activeAgents,
      totalTasks,
      avgResponseTime,
      totalCost,
      successRate
    });
  };

  useEffect(() => {
    updateMetrics(agents);
  }, [agents]);

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'busy': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'idle': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'offline': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getAgentIcon = (type: Agent['type']) => {
    switch (type) {
      case 'chat': return MessageSquare;
      case 'voice': return Mic;
      case 'vision': return Eye;
      case 'code': return Code;
      case 'browser': return Globe;
      case 'shadow': return Shield;
      case 'orchestrator': return Brain;
      default: return Bot;
    }
  };

  const controlAgent = (agentId: string, action: 'start' | 'pause' | 'stop') => {
    setAgents(prev => prev.map(agent => {
      if (agent.id === agentId) {
        let newStatus: Agent['status'];
        switch (action) {
          case 'start': newStatus = 'active'; break;
          case 'pause': newStatus = 'idle'; break;
          case 'stop': newStatus = 'offline'; break;
          default: newStatus = agent.status;
        }
        return { ...agent, status: newStatus, lastActivity: new Date() };
      }
      return agent;
    }));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Agent Dashboard
          </h2>
          <p className="text-muted-foreground">Monitor and control your AI agent fleet</p>
        </div>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Configure Agents
        </Button>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{metrics.totalAgents}</p>
                <p className="text-sm text-muted-foreground">Total Agents</p>
              </div>
              <Bot className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-400">{metrics.activeAgents}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
              <Activity className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{metrics.totalTasks}</p>
                <p className="text-sm text-muted-foreground">Tasks Done</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{metrics.avgResponseTime.toFixed(0)}ms</p>
                <p className="text-sm text-muted-foreground">Avg Response</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">${metrics.totalCost.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Total Cost</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
              <Shield className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Agent Fleet</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid gap-4">
            {agents.map((agent) => {
              const Icon = getAgentIcon(agent.type);
              
              return (
                <Card key={agent.id} className="glass-card cyber-hover">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-12 h-12 ring-2 ring-primary/30">
                          <AvatarFallback className="bg-primary/20">
                            <Icon className="h-6 w-6 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-lg">{agent.name}</h3>
                            <Badge className={getStatusColor(agent.status)}>
                              {agent.status.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{agent.provider}/{agent.model}</span>
                            <span>•</span>
                            <span>{agent.tasksCompleted} tasks</span>
                            <span>•</span>
                            <span>{agent.avgResponseTime.toFixed(0)}ms avg</span>
                            <span>•</span>
                            <span>{agent.successRate}% success</span>
                          </div>
                          
                          {agent.currentTask && (
                            <div className="mt-2 text-sm text-primary">
                              Current: {agent.currentTask}
                            </div>
                          )}
                          
                          <div className="flex flex-wrap gap-1 mt-2">
                            {agent.capabilities.map((cap, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {cap}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="text-right text-sm">
                          <div className="font-medium">${agent.cost.toFixed(2)}</div>
                          <div className="text-muted-foreground">{agent.tokens} tokens</div>
                        </div>
                        
                        <div className="flex flex-col space-y-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => controlAgent(agent.id, agent.status === 'active' ? 'pause' : 'start')}
                            className="h-8 w-8 p-0"
                          >
                            {agent.status === 'active' ? 
                              <Pause className="h-4 w-4" /> : 
                              <Play className="h-4 w-4" />
                            }
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => controlAgent(agent.id, 'stop')}
                            className="h-8 w-8 p-0"
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {agent.status === 'busy' && (
                      <div className="mt-4">
                        <Progress value={Math.random() * 100} className="h-2" />
                        <div className="text-xs text-muted-foreground mt-1">
                          Processing... {Math.round(Math.random() * 100)}% complete
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Response Time Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {agents.map((agent) => (
                  <div key={agent.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{agent.name}</span>
                      <span>{agent.avgResponseTime.toFixed(0)}ms</span>
                    </div>
                    <Progress value={(agent.avgResponseTime / 5000) * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Success Rates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {agents.map((agent) => (
                  <div key={agent.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{agent.name}</span>
                      <span>{agent.successRate}%</span>
                    </div>
                    <Progress value={agent.successRate} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {agents.filter(a => a.cost > 0).map((agent) => (
                    <div key={agent.id} className="flex justify-between items-center">
                      <span className="text-sm">{agent.name}</span>
                      <span className="font-medium">${agent.cost.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Task Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {agents.map((agent) => (
                    <div key={agent.id} className="flex justify-between items-center">
                      <span className="text-sm">{agent.name}</span>
                      <span className="font-medium">{agent.tasksCompleted}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Efficiency Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Tasks per Hour</span>
                    <span className="font-medium">{Math.round(metrics.totalTasks / 24)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cost per Task</span>
                    <span className="font-medium">${(metrics.totalCost / metrics.totalTasks).toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Uptime</span>
                    <span className="font-medium text-green-400">99.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Load Balance</span>
                    <span className="font-medium text-blue-400">Optimal</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};