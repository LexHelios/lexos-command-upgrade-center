import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Cpu, HardDrive, Wifi, Server, Zap, Globe, Database, Cloud, Shield, AlertTriangle, CheckCircle, RefreshCw, TrendingUp, Monitor, MemoryStick as Memory } from 'lucide-react';

interface SystemMetric {
  name: string;
  value: number;
  max: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'stable';
}

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  responseTime: number;
  uptime: number;
  lastCheck: Date;
}

export const SystemMonitor = () => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Initialize and update metrics
  useEffect(() => {
    updateMetrics();
    updateServices();
    
    const interval = setInterval(() => {
      updateMetrics();
      updateServices();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const updateMetrics = () => {
    const newMetrics: SystemMetric[] = [
      {
        name: 'CPU Usage',
        value: Math.round(Math.random() * 40 + 20), // 20-60%
        max: 100,
        unit: '%',
        status: 'good',
        icon: Cpu,
        trend: Math.random() > 0.5 ? 'up' : 'down'
      },
      {
        name: 'Memory',
        value: Math.round(Math.random() * 30 + 40), // 40-70%
        max: 100,
        unit: '%',
        status: 'good',
        icon: Memory,
        trend: 'stable'
      },
      {
        name: 'GPU Memory',
        value: Math.round(Math.random() * 50 + 30), // 30-80%
        max: 100,
        unit: '%',
        status: 'good',
        icon: Monitor,
        trend: 'up'
      },
      {
        name: 'Storage',
        value: Math.round((Math.random() * 2 + 1.5) * 10) / 10, // 1.5-3.5 TB
        max: 4,
        unit: 'TB',
        status: 'good',
        icon: HardDrive,
        trend: 'up'
      },
      {
        name: 'Network I/O',
        value: Math.round(Math.random() * 800 + 200), // 200-1000 Mbps
        max: 1000,
        unit: 'Mbps',
        status: 'good',
        icon: Wifi,
        trend: 'stable'
      },
      {
        name: 'API Calls/min',
        value: Math.round(Math.random() * 150 + 50), // 50-200
        max: 500,
        unit: '/min',
        status: 'good',
        icon: Zap,
        trend: 'up'
      }
    ];

    // Determine status based on usage
    newMetrics.forEach(metric => {
      const percentage = (metric.value / metric.max) * 100;
      if (percentage > 85) metric.status = 'critical';
      else if (percentage > 70) metric.status = 'warning';
      else metric.status = 'good';
    });

    setMetrics(newMetrics);
    setLastUpdate(new Date());
  };

  const updateServices = () => {
    const newServices: ServiceStatus[] = [
      {
        name: 'OpenAI API',
        status: Math.random() > 0.1 ? 'online' : 'degraded',
        responseTime: Math.round(Math.random() * 500 + 200),
        uptime: 99.9,
        lastCheck: new Date()
      },
      {
        name: 'Anthropic API',
        status: Math.random() > 0.05 ? 'online' : 'degraded',
        responseTime: Math.round(Math.random() * 800 + 300),
        uptime: 99.8,
        lastCheck: new Date()
      },
      {
        name: 'H100 Backend',
        status: Math.random() > 0.3 ? 'online' : 'offline',
        responseTime: Math.round(Math.random() * 200 + 100),
        uptime: 98.5,
        lastCheck: new Date()
      },
      {
        name: 'Supabase',
        status: 'online',
        responseTime: Math.round(Math.random() * 100 + 50),
        uptime: 99.99,
        lastCheck: new Date()
      },
      {
        name: 'ElevenLabs',
        status: Math.random() > 0.1 ? 'online' : 'degraded',
        responseTime: Math.round(Math.random() * 1000 + 500),
        uptime: 99.5,
        lastCheck: new Date()
      },
      {
        name: 'Web Search',
        status: Math.random() > 0.05 ? 'online' : 'degraded',
        responseTime: Math.round(Math.random() * 300 + 200),
        uptime: 99.7,
        lastCheck: new Date()
      }
    ];

    setServices(newServices);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate refresh
    updateMetrics();
    updateServices();
    setIsRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'good':
        return 'text-green-500';
      case 'degraded':
      case 'warning':
        return 'text-yellow-500';
      case 'offline':
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'offline':
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
      default:
        return <Activity className="h-3 w-3 text-gray-500" />;
    }
  };

  const overallHealth = services.filter(s => s.status === 'online').length / services.length * 100;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            System Monitor
          </h2>
          <p className="text-muted-foreground">Real-time system performance and service status</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Badge>
          <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Health */}
      <Card className="glass-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              System Health
            </span>
            <Badge className={`${overallHealth > 90 ? 'bg-green-500/20 text-green-400' : 
                              overallHealth > 70 ? 'bg-yellow-500/20 text-yellow-400' : 
                              'bg-red-500/20 text-red-400'}`}>
              {overallHealth.toFixed(1)}% Operational
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={overallHealth} className="h-3" />
          <div className="mt-2 text-sm text-muted-foreground">
            {services.filter(s => s.status === 'online').length} of {services.length} services operational
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          <TabsTrigger value="services">Service Status</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              const percentage = (metric.value / metric.max) * 100;
              
              return (
                <Card key={metric.name} className="glass-card cyber-hover">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">{metric.name}</CardTitle>
                      </div>
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(metric.trend)}
                        {getStatusIcon(metric.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-end justify-between">
                      <span className="text-2xl font-bold text-foreground">
                        {metric.value}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {metric.unit}
                      </span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className={`h-2 ${
                        metric.status === 'critical' ? '[&>div]:bg-red-500' :
                        metric.status === 'warning' ? '[&>div]:bg-yellow-500' :
                        '[&>div]:bg-green-500'
                      }`}
                    />
                    <div className="text-xs text-muted-foreground">
                      {metric.value} / {metric.max} {metric.unit} ({percentage.toFixed(1)}%)
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid gap-4">
            {services.map((service) => (
              <Card key={service.name} className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(service.status)}
                      <div>
                        <h3 className="font-medium text-foreground">{service.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Response: {service.responseTime}ms • Uptime: {service.uptime}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="outline" 
                        className={`${getStatusColor(service.status)} border-current`}
                      >
                        {service.status.toUpperCase()}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last check: {service.lastCheck.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Response Time</span>
                    <span className="font-medium">
                      {Math.round(services.reduce((sum, s) => sum + s.responseTime, 0) / services.length)}ms
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">System Load</span>
                    <span className="font-medium">
                      {metrics.find(m => m.name === 'CPU Usage')?.value || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Memory Efficiency</span>
                    <span className="font-medium text-green-500">Optimal</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Network Latency</span>
                    <span className="font-medium">
                      {Math.round(Math.random() * 50 + 10)}ms
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Resource Allocation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>AI Processing</span>
                      <span>45%</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Web Services</span>
                      <span>25%</span>
                    </div>
                    <Progress value={25} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Database</span>
                      <span>15%</span>
                    </div>
                    <Progress value={15} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>System Overhead</span>
                      <span>15%</span>
                    </div>
                    <Progress value={15} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card className="glass-card border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-12 flex flex-col">
              <Server className="h-4 w-4 mb-1" />
              <span className="text-xs">Restart Services</span>
            </Button>
            <Button variant="outline" className="h-12 flex flex-col">
              <Database className="h-4 w-4 mb-1" />
              <span className="text-xs">Clear Cache</span>
            </Button>
            <Button variant="outline" className="h-12 flex flex-col">
              <Cloud className="h-4 w-4 mb-1" />
              <span className="text-xs">Sync Data</span>
            </Button>
            <Button variant="outline" className="h-12 flex flex-col">
              <Shield className="h-4 w-4 mb-1" />
              <span className="text-xs">Security Scan</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};