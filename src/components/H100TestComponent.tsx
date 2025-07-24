import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
import { API_BASE_URL } from '@/config/api';
  Server, 
  Zap, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Terminal,
  Activity,
  Clock,
  Cpu
} from 'lucide-react';

interface TestResult {
  success: boolean;
  data?: unknown;
  error?: string;
  endpoint?: string;
  responseTime?: number;
  details?: string;
}

export const H100TestComponent = () => {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('Hello, this is a test message for the H100 backend.');
  const [h100Endpoint, setH100Endpoint] = useState('http://159.26.94.122:3001');
  const { toast } = useToast();

  const testH100Connection = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      const startTime = Date.now();
      
      // Test the H100 backend directly
      const response = await fetch(`${h100Endpoint}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LexOS-Frontend/1.0'
        },
        body: JSON.stringify({
          prompt: customPrompt,
          model: 'auto',
          taskType: 'general',
          maxTokens: 100,
          preferSelfHosted: true
        })
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        setTestResult({ 
          success: false, 
          error: `H100 Error: ${response.status} - ${errorText}`,
          endpoint: h100Endpoint,
          responseTime
        });
        return;
      }

      const data = await response.json();
      
      setTestResult({ 
        success: true, 
        data,
        endpoint: h100Endpoint,
        responseTime,
        details: 'Direct H100 backend connection successful'
      });

      toast({
        title: "H100 Test Successful",
        description: `Connected to H100 backend in ${responseTime}ms`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setTestResult({ 
        success: false, 
        error: errorMessage,
        endpoint: h100Endpoint,
        details: 'Network error or CORS issue'
      });

      toast({
        title: "H100 Test Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testSupabaseEdgeFunction = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      const startTime = Date.now();
      
      // Test through Supabase edge function
      const response = await fetch('/functions/v1/test-h100`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: customPrompt
        })
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();

      setTestResult({ 
        success: data.success, 
        data: data.success ? data : undefined,
        error: data.success ? undefined : data.error,
        endpoint: 'Supabase Edge Function',
        responseTime,
        details: data.success ? 'Edge function proxy working' : 'Edge function failed'
      });

      if (data.success) {
        toast({
          title: "Edge Function Test Successful",
          description: `H100 accessible via edge function in ${responseTime}ms`,
        });
      } else {
        toast({
          title: "Edge Function Test Failed",
          description: data.error,
          variant: "destructive",
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setTestResult({ 
        success: false, 
        error: errorMessage,
        endpoint: 'Supabase Edge Function',
        details: 'Edge function call failed'
      });

      toast({
        title: "Edge Function Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Server className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">H100 Backend Testing</h1>
      </div>

      {/* Configuration */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Test Configuration
          </CardTitle>
          <CardDescription>
            Configure and test your H100 backend connection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">H100 Endpoint URL</label>
            <Input
              value={h100Endpoint}
              onChange={(e) => setH100Endpoint(e.target.value)}
              placeholder="http://159.26.94.122:3001"
              className="glass-card border-primary/30"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Prompt</label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Enter a test message..."
              className="glass-card border-primary/30"
              rows={3}
            />
          </div>
          
          <div className="flex space-x-3">
            <Button 
              onClick={testH100Connection}
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Test Direct Connection
            </Button>
            
            <Button 
              onClick={testSupabaseEdgeFunction}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Server className="h-4 w-4 mr-2" />
              )}
              Test Edge Function
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResult && (
        <Card className={`glass-card ${testResult.success ? 'border-green-500/30' : 'border-red-500/30'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge className={testResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                    {testResult.success ? 'SUCCESS' : 'FAILED'}
                  </Badge>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Endpoint</span>
                  <span className="text-sm font-medium">{testResult.endpoint}</span>
                </div>
                
                {testResult.responseTime && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Response Time</span>
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {testResult.responseTime}ms
                    </span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                {testResult.details && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Details</span>
                    <span className="text-sm">{testResult.details}</span>
                  </div>
                )}
              </div>
            </div>

            {testResult.error && (
              <Alert className="border-red-500/30 bg-red-500/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-400">
                  <strong>Error:</strong> {testResult.error}
                </AlertDescription>
              </Alert>
            )}

            {testResult.success && testResult.data && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Response Data:</h4>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Connection Guide */}
      <Card className="glass-card border-blue-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-400" />
            Connection Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <p><strong>Direct Connection:</strong> Tests direct HTTP connection to your H100 backend</p>
            <p><strong>Edge Function:</strong> Tests connection through Supabase edge function proxy</p>
            <p><strong>Expected Response:</strong> JSON object with AI response and metadata</p>
          </div>
          
          <Alert className="border-blue-500/30 bg-blue-500/10">
            <Activity className="h-4 w-4" />
            <AlertDescription className="text-blue-400">
              <strong>Note:</strong> Direct connection may fail due to CORS policies. 
              Edge function provides secure proxy access to your H100 backend.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};