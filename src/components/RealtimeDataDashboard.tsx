import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAIAPI } from '@/hooks/use-ai-api';
import { Clock, TrendingUp, Globe, RefreshCw, Zap } from 'lucide-react';

interface RealtimeData {
  query: string;
  response: string;
  timestamp: string;
  model: string;
  provider: string;
  cost: number;
}

export const RealtimeDataDashboard: React.FC = () => {
  const [query, setQuery] = useState('');
  const [realtimeData, setRealtimeData] = useState<RealtimeData[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { sendMessage, loading } = useAIAPI();

  const fetchRealtimeData = useCallback(async (searchQuery: string) => {
    try {
      const response = await sendMessage(
        `Provide real-time information about: ${searchQuery}. Include current data, trends, and sources with timestamps.`,
        {
          task_type: 'realtime',
          quality: 'premium',
          complexity: 'medium'
        }
      );

      const newData: RealtimeData = {
        query: searchQuery,
        response: response.result,
        timestamp: new Date().toLocaleString(),
        model: response.model_used.model,
        provider: response.model_used.provider,
        cost: response.model_used.cost
      };

      setRealtimeData(prev => [newData, ...prev.slice(0, 4)]);
    } catch (error) {
      console.error('Failed to fetch real-time data:', error);
    }
  }, [sendMessage, setRealtimeData]);

  const handleSearch = () => {
    if (query.trim()) {
      fetchRealtimeData(query.trim());
    }
  };

  const predefinedQueries = [
    "Latest AI technology trends",
    "Current cryptocurrency prices",
    "Breaking news in technology",
    "Stock market updates",
    "Weather patterns and climate data"
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && realtimeData.length > 0) {
      interval = setInterval(() => {
        const lastQuery = realtimeData[0]?.query;
        if (lastQuery) {
          fetchRealtimeData(lastQuery);
        }
      }, 30000); // Refresh every 30 seconds
    }
    return () => clearInterval(interval);
  }, [autoRefresh, realtimeData, fetchRealtimeData]);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/10">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Zap className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">⏱️ Real-time Data Dashboard</CardTitle>
          </div>
          <CardDescription>
            Get live information powered by Grok 3 & Grok 4 (X AI) - Real-time web data and trending insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Ask for real-time information..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button 
              onClick={handleSearch} 
              disabled={loading || !query.trim()}
              className="min-w-[100px]"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              {loading ? 'Fetching...' : 'Get Live Data'}
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-primary/10' : ''}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
            </Button>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Live data updates every 30s</span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Quick Queries:</h4>
            <div className="flex flex-wrap gap-2">
              {predefinedQueries.map((predefinedQuery, index) => (
                <Badge 
                  key={index}
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setQuery(predefinedQuery)}
                >
                  {predefinedQuery}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {realtimeData.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Live Data Results
          </h3>
          {realtimeData.map((data, index) => (
            <Card key={index} className="border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{data.query}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {data.provider}/{data.model}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {data.timestamp}
                  </span>
                  <span>${data.cost.toFixed(4)}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-sm bg-muted/30 p-3 rounded-md">
                    {data.response}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">Real-time Capabilities</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Powered by Grok AI with live web access, trending information, and up-to-the-minute data insights
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};