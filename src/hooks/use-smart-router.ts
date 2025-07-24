import { useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { API_ENDPOINTS, API_BASE_URL } from '@/config/api';

interface RoutingAnalysis {
  task_type: string;
  complexity: 'low' | 'medium' | 'high';
  requires_context: boolean;
  requires_creativity: boolean;
  requires_accuracy: boolean;
  is_conversational: boolean;
  estimated_tokens: number;
  recommended_model: string;
  confidence: number;
}

interface RoutingInfo {
  analysis_time_ms: number;
  routing_time_ms: number;
  total_time_ms: number;
  decision: RoutingAnalysis;
  router_confidence: number;
}

interface SmartRouterResponse {
  result: string;
  model_used?: {
    model: string;
    provider: string;
    cost: number;
    tokens: number;
  };
  routing_info?: RoutingInfo;
}

export const useSmartRouter = () => {
  const [loading, setLoading] = useState(false);
  const [routingInfo, setRoutingInfo] = useState<RoutingInfo | null>(null);
  const { toast } = useToast();

  const sendMessage = useCallback(async (
    prompt: string,
    options?: {
      preferred_model?: string;
      show_routing?: boolean;
    }
  ): Promise<SmartRouterResponse> => {
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/smart-router/route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          preferred_model: options?.preferred_model
        })
      });

      if (!response.ok) {
        throw new Error('Smart routing failed');
      }

      const data = await response.json() as SmartRouterResponse;
      
      // Store routing info
      if (data.routing_info) {
        setRoutingInfo(data.routing_info);
        
        // Show routing toast if requested
        if (options?.show_routing) {
          toast({
            title: "Smart Routing",
            description: `Routed to ${data.routing_info.decision.recommended_model} (${data.routing_info.decision.task_type}) in ${data.routing_info.total_time_ms}ms`,
            duration: 3000
          });
        }
      }
      
      return data;
    } catch (error) {
      console.error('Smart router error:', error);
      
      // Fallback to regular AI endpoint
      try {
        const fallbackResponse = await fetch(API_ENDPOINTS.ai.chat, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            task_type: 'general',
            complexity: 'medium',
            quality: 'standard'
          })
        });
        
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          toast({
            title: "Routing Fallback",
            description: "Using fallback routing due to smart router error",
            variant: "default"
          });
          return data;
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const analyzeRequest = useCallback(async (prompt: string): Promise<RoutingAnalysis | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/smart-router/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      return data.analysis;
    } catch (error) {
      console.error('Analysis error:', error);
      return null;
    }
  }, []);

  const sendConversation = useCallback(async (
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    preferred_model?: string
  ): Promise<SmartRouterResponse> => {
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/smart-router/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          preferred_model
        })
      });

      if (!response.ok) {
        throw new Error('Conversation routing failed');
      }

      const data = await response.json() as SmartRouterResponse;
      
      if (data.routing_info) {
        setRoutingInfo(data.routing_info);
      }
      
      return data;
    } catch (error) {
      console.error('Conversation routing error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRouterStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/smart-router/status`);
      if (!response.ok) {
        throw new Error('Failed to get router status');
      }
      return await response.json();
    } catch (error) {
      console.error('Status error:', error);
      return null;
    }
  }, []);

  return {
    sendMessage,
    analyzeRequest,
    sendConversation,
    getRouterStatus,
    loading,
    routingInfo
  };
};