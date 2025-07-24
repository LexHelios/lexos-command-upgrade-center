import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Play, Pause, ExternalLink, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SecureAPIService } from '@/services/SecureAPIService';

interface Scenario {
  id: string;
  name: string;
  isActive: boolean;
  webhookUrl?: string;
  lastRun?: string;
}

interface WebhookConfig {
  url: string;
  name: string;
  description: string;
}

export const AutomationWorkflow = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [newWebhook, setNewWebhook] = useState({ url: '', name: '', description: '' });
  const [testData, setTestData] = useState('{"message": "Test from LexOS Agent", "type": "test"}');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const apiService = new SecureAPIService();

  useEffect(() => {
    loadMakeScenarios();
    loadSavedWebhooks();
  }, [loadMakeScenarios]);

  const loadMakeScenarios = useCallback(async () => {
    try {
      // Make.com integration now requires secure edge functions
      toast({
        title: "Security Notice",
        description: "Make.com integration has been moved to secure edge functions for better security",
        variant: "default",
      });
    } catch (error) {
      console.error('Failed to load Make scenarios:', error);
    }
  }, [toast]);

  const loadSavedWebhooks = () => {
    const saved = localStorage.getItem('lexos-webhooks');
    if (saved) {
      setWebhooks(JSON.parse(saved));
    }
  };

  const saveWebhooks = (newWebhooks: WebhookConfig[]) => {
    setWebhooks(newWebhooks);
    localStorage.setItem('lexos-webhooks', JSON.stringify(newWebhooks));
  };

  const addWebhook = () => {
    if (!newWebhook.url || !newWebhook.name) {
      toast({
        title: "Error",
        description: "Please enter both webhook URL and name",
        variant: "destructive",
      });
      return;
    }

    const updatedWebhooks = [...webhooks, { ...newWebhook }];
    saveWebhooks(updatedWebhooks);
    setNewWebhook({ url: '', name: '', description: '' });
    
    toast({
      title: "Webhook Added",
      description: `${newWebhook.name} webhook has been saved`,
    });
  };

  const triggerWebhook = async (webhook: WebhookConfig) => {
    setIsLoading(true);
    try {
      const data = JSON.parse(testData);
      
      // Direct webhook trigger for security
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          source: 'LexOS-Agent-Orchestrator'
        }),
      });
      
      if (response.ok) {
        toast({
          title: "Webhook Triggered",
          description: `Successfully sent data to ${webhook.name}`,
        });
      } else {
        throw new Error("Webhook request failed");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to trigger ${webhook.name}: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleScenario = async (scenarioId: string, isActive: boolean) => {
    try {
      toast({
        title: "Security Notice",
        description: "Scenario management has been moved to secure edge functions. Please use the Make.com dashboard directly.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle scenario status",
        variant: "destructive",
      });
    }
  };

  const removeWebhook = (index: number) => {
    const updatedWebhooks = webhooks.filter((_, i) => i !== index);
    saveWebhooks(updatedWebhooks);
    toast({
      title: "Webhook Removed",
      description: "Webhook has been deleted",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Make.com Integration
          </CardTitle>
          <CardDescription>
            Connect your AI agents to Make.com scenarios for powerful automation workflows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Webhook Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Add Webhook</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  placeholder="https://hook.us1.make.com/..."
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook-name">Name</Label>
                <Input
                  id="webhook-name"
                  placeholder="Email Notification"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-description">Description (Optional)</Label>
              <Input
                id="webhook-description"
                placeholder="Sends email when agent completes task"
                value={newWebhook.description}
                onChange={(e) => setNewWebhook({ ...newWebhook, description: e.target.value })}
              />
            </div>
            <Button onClick={addWebhook} className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </div>

          <Separator />

          {/* Saved Webhooks */}
          {webhooks.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Saved Webhooks</h3>
              <div className="grid gap-4">
                {webhooks.map((webhook, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{webhook.name}</h4>
                        {webhook.description && (
                          <p className="text-sm text-muted-foreground">{webhook.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          {webhook.url.substring(0, 50)}...
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => triggerWebhook(webhook)}
                          disabled={isLoading}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeWebhook(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Test Data */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Test Data</h3>
            <div className="space-y-2">
              <Label htmlFor="test-data">JSON Data to Send</Label>
              <Textarea
                id="test-data"
                placeholder='{"message": "Hello from LexOS", "agent": "Assistant"}'
                value={testData}
                onChange={(e) => setTestData(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <Separator />

          {/* Make.com Scenarios */}
          {scenarios.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Make.com Scenarios</h3>
                <Button variant="outline" size="sm" onClick={loadMakeScenarios}>
                  Refresh
                </Button>
              </div>
              <div className="grid gap-4">
                {scenarios.map((scenario) => (
                  <Card key={scenario.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{scenario.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={scenario.isActive ? "default" : "secondary"}>
                            {scenario.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {scenario.lastRun && (
                            <span className="text-xs text-muted-foreground">
                              Last run: {new Date(scenario.lastRun).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleScenario(scenario.id, scenario.isActive)}
                        >
                          {scenario.isActive ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open('https://us1.make.com/scenarios', '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};