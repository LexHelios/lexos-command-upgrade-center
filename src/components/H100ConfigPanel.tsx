import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Server, 
  Zap, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Settings,
  Cloud
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { h100Manager, H100Config, H100Status } from '@/services/H100Manager';

export const H100ConfigPanel = () => {
  const [config, setConfig] = useState<H100Config>({
    preferred_models: [],
    fallback_to_cloud: true,
    auto_failover: true,
    max_retry_attempts: 3,
    health_check_interval: 30
  });
  const [status, setStatus] = useState<H100Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
    loadStatus();
  }, []);

  const loadConfig = async () => {
    const loadedConfig = await h100Manager.loadConfig();
    if (loadedConfig) {
      setConfig(loadedConfig);
    }
  };

  const loadStatus = async () => {
    const currentStatus = h100Manager.getStatus();
    setStatus(currentStatus);
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      const success = await h100Manager.saveConfig(config);
      if (success) {
        toast({
          title: "Configuration Saved",
          description: "H100 configuration has been updated successfully.",
        });
        
        // Start health checking if endpoint is configured
        if (config.h100_endpoint) {
          h100Manager.startHealthChecking();
        }
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save H100 configuration.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.h100_endpoint) {
      toast({
        title: "Error",
        description: "Please enter an H100 endpoint URL first.",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    try {
      // Save config first if not saved
      await h100Manager.saveConfig(config);
      
      const newStatus = await h100Manager.checkH100Health();
      setStatus(newStatus);
      
      if (newStatus.online) {
        toast({
          title: "Connection Successful",
          description: `H100 is online with ${newStatus.models_available.length} models available.`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: newStatus.error || "Unable to connect to H100 server.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Connection test failed.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = () => {
    if (!status) {
      return <Badge variant="outline">Unknown</Badge>;
    }
    
    if (status.online) {
      return (
        <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Online
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Offline
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Server className="w-5 h-5 text-primary" />
              <CardTitle>H100 Configuration</CardTitle>
            </div>
            {getStatusBadge()}
          </div>
          <CardDescription>
            Configure your H100 GPU server for high-performance AI inference. 
            When online, H100 models will be prioritized for faster responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="h100-endpoint">H100 Server Endpoint</Label>
              <Input
                id="h100-endpoint"
                placeholder="https://your-h100-server.com"
                value={config.h100_endpoint || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, h100_endpoint: e.target.value }))}
              />
              <p className="text-sm text-muted-foreground">
                The base URL of your H100 server API
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="h100-api-key">API Key</Label>
              <Input
                id="h100-api-key"
                type="password"
                placeholder="Enter your H100 API key"
                value={config.h100_api_key || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, h100_api_key: e.target.value }))}
              />
              <p className="text-sm text-muted-foreground">
                Authentication key for your H100 server
              </p>
            </div>

            <div className="flex space-x-2">
              <Button onClick={handleTestConnection} disabled={testing} variant="outline">
                {testing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Test Connection
              </Button>
              <Button onClick={handleSaveConfig} disabled={loading}>
                {loading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                Save Configuration
              </Button>
            </div>
          </div>

          <Separator />

          {/* Fallback Settings */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center">
              <Cloud className="w-4 h-4 mr-2" />
              Fallback & Reliability
            </h4>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Cloud Fallback</Label>
                <p className="text-sm text-muted-foreground">
                  Use cloud models when H100 is unavailable
                </p>
              </div>
              <Switch
                checked={config.fallback_to_cloud}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, fallback_to_cloud: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Failover</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically switch to fallback on errors
                </p>
              </div>
              <Switch
                checked={config.auto_failover}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, auto_failover: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="retry-attempts">Max Retry Attempts</Label>
              <Input
                id="retry-attempts"
                type="number"
                min="1"
                max="10"
                value={config.max_retry_attempts}
                onChange={(e) => setConfig(prev => ({ ...prev, max_retry_attempts: parseInt(e.target.value) || 3 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="health-interval">Health Check Interval (seconds)</Label>
              <Input
                id="health-interval"
                type="number"
                min="10"
                max="300"
                value={config.health_check_interval}
                onChange={(e) => setConfig(prev => ({ ...prev, health_check_interval: parseInt(e.target.value) || 30 }))}
              />
            </div>
          </div>

          {/* Status Information */}
          {status && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Status Information
                </h4>

                {status.online ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p>H100 server is online and healthy</p>
                        <p className="text-sm text-muted-foreground">
                          Response time: {status.response_time_ms}ms • 
                          Models available: {status.models_available.length} • 
                          Last check: {status.last_check.toLocaleTimeString()}
                        </p>
                        {status.models_available.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium">Available models:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {status.models_available.map((model, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {model}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p>H100 server is currently offline</p>
                        <p className="text-sm">
                          Error: {status.error} • 
                          Last check: {status.last_check.toLocaleTimeString()}
                        </p>
                        {config.fallback_to_cloud && (
                          <p className="text-sm text-muted-foreground">
                            ✓ Cloud models will be used as fallback
                          </p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};