import { useState } from 'react';
import { functions } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAIAPI = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async (prompt: string, options: {
    task_type?: 'text' | 'code' | 'image' | 'voice' | 'reasoning' | 'general' | 'realtime';
    complexity?: 'low' | 'medium' | 'high';
    quality?: 'basic' | 'standard' | 'premium';
    max_cost?: number;
    prefer_self_hosted?: boolean;
    enable_web_search?: boolean;
  } = {}) => {
    setLoading(true);
    try {
      // Validate prompt
      if (!prompt || prompt.trim() === '') {
        throw new Error('Message cannot be empty');
      }
      // Check if web search is needed
      if (options.enable_web_search || 
          prompt.toLowerCase().includes('search') ||
          prompt.toLowerCase().includes('latest') ||
          prompt.toLowerCase().includes('current') ||
          prompt.toLowerCase().includes('recent') ||
          prompt.toLowerCase().includes('news') ||
          prompt.toLowerCase().includes('today') ||
          prompt.toLowerCase().includes('what is happening')) {
        
        // First do web search with validation
        const searchQuery = prompt.trim();
        if (!searchQuery) {
          throw new Error('Search query cannot be empty');
        }
        
        const { data: searchData, error: searchError } = await functions.invoke('web-search', {
          body: { query: searchQuery }
        });
        
        if (!searchError && searchData) {
          // Use search results to enhance the prompt
          const enhancedPrompt = `Based on current web search results: ${searchData.result}\n\nUser question: ${prompt}`;
          
          const { data, error } = await functions.invoke('smart-ai-router', {
            body: {
              task_type: options.task_type || 'general',
              complexity: options.complexity || 'medium',
              quality: options.quality || 'standard',
              prompt: enhancedPrompt,
              max_cost: options.max_cost,
              prefer_self_hosted: options.prefer_self_hosted !== false,
              estimated_tokens: Math.max(100, enhancedPrompt.length * 2)
            }
          });
          
          if (error) throw error;
          
          toast({
            title: "AI Response with Web Search",
            description: `Used ${data.model_used.provider}/${data.model_used.model} with web search ($${data.model_used.cost.toFixed(4)})`,
          });
          
          return data;
        }
      }
      
      // Regular AI response without search
      const { data, error } = await functions.invoke('smart-ai-router', {
        body: {
          task_type: options.task_type || 'general',
          complexity: options.complexity || 'medium',
          quality: options.quality || 'standard',
          prompt,
          max_cost: options.max_cost,
          prefer_self_hosted: options.prefer_self_hosted !== false,
          estimated_tokens: Math.max(100, prompt.length * 2)
        }
      });

      if (error) throw error;
      
      toast({
        title: "AI Response",
        description: `Used ${data.model_used.provider}/${data.model_used.model} ($${data.model_used.cost.toFixed(4)})`,
      });
      
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    sendMessage,
    loading
  };
};