import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { API_ENDPOINTS } from '@/config/api';

interface AIOptions {
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  files?: File[];
  taskType?: 'text' | 'code' | 'image' | 'video' | 'voice' | 'reasoning' | 'general' | 'realtime' | 'chat' | 'financial' | 'nsfw' | 'roleplay' | 'creative' | 'storytelling' | 'anime' | 'realistic';
  complexity?: 'low' | 'medium' | 'high';
  quality?: 'basic' | 'standard' | 'premium';
}

export const useAIAPI = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async (prompt: string, options: AIOptions = {}) => {
    setLoading(true);
    try {
      // Validate prompt
      if (!prompt || prompt.trim() === '') {
        throw new Error('Message cannot be empty');
      }

      // Check if we have files (images) to process
      if (options.files && options.files.length > 0) {
        const imageFile = options.files.find(f => f.type.startsWith('image/'));
        if (imageFile) {
          // Route to vision analysis
          console.log('Routing to vision analysis for:', imageFile.name);
          const formData = new FormData();
          formData.append('image', imageFile);
          formData.append('model', 'qwen2.5-vl-7b');
          formData.append('task', 'general');
          
          const visionResponse = await fetch('http://localhost:5000/vision/analyze', {
            method: 'POST',
            body: formData
          });
          
          if (visionResponse.ok) {
            const visionData = await visionResponse.json();
            const result = visionData.result;
            return `🔍 **Vision Analysis Results:**\n\n${typeof result === 'string' ? result : JSON.stringify(result, null, 2)}\n\n*Analyzed with ${visionData.model} on H100 GPU*`;
          }
        }
      }

      // Determine task type based on content analysis
      const determineTaskType = (text: string): string => {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('code') || lowerText.includes('program') || lowerText.includes('function')) return 'code';
        if (lowerText.includes('image') || lowerText.includes('picture') || lowerText.includes('photo')) return 'image';
        if (lowerText.includes('video') || lowerText.includes('movie')) return 'video';
        if (lowerText.includes('voice') || lowerText.includes('audio') || lowerText.includes('speech')) return 'voice';
        if (lowerText.includes('reason') || lowerText.includes('logic') || lowerText.includes('think')) return 'reasoning';
        if (lowerText.includes('financial') || lowerText.includes('money') || lowerText.includes('investment')) return 'financial';
        if (lowerText.includes('story') || lowerText.includes('narrative') || lowerText.includes('tale')) return 'storytelling';
        if (lowerText.includes('creative') || lowerText.includes('artistic') || lowerText.includes('imaginative')) return 'creative';
        if (lowerText.includes('anime') || lowerText.includes('manga')) return 'anime';
        if (lowerText.includes('realistic') || lowerText.includes('photorealistic')) return 'realistic';
        if (lowerText.includes('chat') || lowerText.includes('conversation')) return 'chat';
        return 'general';
      };

      // Regular text request with proper schema
      const requestBody = {
        task_type: options.taskType || determineTaskType(prompt),
        complexity: options.complexity || 'medium',
        quality: options.quality || 'standard',
        prompt: prompt.trim(),
        max_cost: 0.10, // 10 cents max
        prefer_self_hosted: true,
        estimated_tokens: Math.ceil(prompt.length / 4) + 100
      };

      console.log('Sending AI request:', requestBody);

      const response = await fetch(API_ENDPOINTS.ai.chat, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get AI response');
      }

      const data = await response.json();
      
      // Show model used in toast
      if (data.model_used) {
        toast({
          title: "AI Response",
          description: `Using ${data.model_used.model} (${data.model_used.provider})`,
        });
      }
      
      return data.result || data.response || '';
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

  const generateImage = async (prompt: string) => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.image.generate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          num_outputs: 1,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();
      return data.images?.[0]?.url || '';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate image";
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

  const transcribeAudio = async (audioBlob: Blob) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch(API_ENDPOINTS.stt.transcribe, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const data = await response.json();
      return data.text || '';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to transcribe audio";
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

  const generateSpeech = async (text: string, voice?: string) => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.tts.generate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: voice || 'alloy',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate speech";
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
    generateImage,
    transcribeAudio,
    generateSpeech,
    loading,
  };
};