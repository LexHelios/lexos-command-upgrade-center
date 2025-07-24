import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { API_ENDPOINTS } from '@/config/api';

interface OrchestrationResult {
  success: boolean;
  routing: {
    route: string;
    model?: string;
    tool?: string;
    reason: string;
    confidence: number;
  };
  result: any;
  timestamp: Date;
}

export const useSmartOrchestrator = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async (message: string, files?: File[], context?: any): Promise<string> => {
    setLoading(true);
    
    try {
      // First try the master orchestrator
      console.log('🧭 Routing through Master Orchestrator...');
      
      const orchestratorResponse = await fetch(API_ENDPOINTS.orchestrator.route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          files: files?.map(f => ({
            name: f.name,
            type: f.type,
            size: f.size
          })),
          context
        })
      });

      if (orchestratorResponse.ok) {
        const data: OrchestrationResult = await orchestratorResponse.json();
        
        // Show routing decision
        toast({
          title: "Smart Routing",
          description: `${data.routing.reason} → ${data.routing.route} (${Math.round(data.routing.confidence * 100)}% confidence)`,
        });
        
        // Handle based on route
        switch (data.routing.route) {
          case 'vision-analyze':
          case 'vision-ocr':
            if (files && files[0]) {
              return await handleVisionRequest(files[0], message, data.routing.route === 'vision-ocr');
            }
            break;
            
          case 'browser-agent':
            return await handleBrowserRequest(message);
            
          case 'task-manager':
            return await handleTaskRequest(message);
            
          default:
            // Use the orchestrator's AI result
            if (data.result?.result) {
              return data.result.result;
            }
        }
      }
      
      // Fallback to smart router
      console.log('Falling back to smart router...');
      const response = await fetch(`${API_BASE_URL}/smart-router/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.result || data.response || 'No response';
      }
      
      // Final fallback to basic AI
      const aiResponse = await fetch(API_ENDPOINTS.ai.chat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      if (aiResponse.ok) {
        const data = await aiResponse.json();
        return data.result || data.response || 'No response';
      }
      
      throw new Error('All routing methods failed');
      
    } catch (error) {
      console.error('Orchestration error:', error);
      toast({
        title: "Routing Error",
        description: "Failed to route request intelligently",
        variant: "destructive"
      });
      
      // Return a helpful error message
      return `I encountered an error routing your request. Please try again or be more specific about what you need.`;
      
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for specific routes
  async function handleVisionRequest(file: File, prompt: string, isOCR: boolean = false): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('model', 'qwen2.5-vl-7b');
    formData.append('task', isOCR ? 'ocr' : 'general');
    
    const endpoint = isOCR ? '/vision/ocr' : '/vision/analyze';
    const response = await fetch(`http://localhost:5000${endpoint}`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('Vision request failed');
    
    const data = await response.json();
    
    if (isOCR) {
      return `📝 **Text Extracted:**\n\n${data.text}\n\n*Processed with ${data.model} on H100*`;
    }
    
    // Format vision analysis
    const result = data.result;
    let formatted = `🔍 **Vision Analysis:**\n\n`;
    
    if (typeof result === 'string') {
      formatted += result;
    } else {
      formatted += `**${result.description}**\n\n`;
      
      if (result.detailed_analysis) {
        formatted += `**Detailed Analysis:**\n`;
        for (const [key, value] of Object.entries(result.detailed_analysis)) {
          formatted += `\n*${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:*\n`;
          if (Array.isArray(value)) {
            value.forEach(item => formatted += `• ${item}\n`);
          } else {
            formatted += `${value}\n`;
          }
        }
      }
      
      if (result.confidence) {
        formatted += `\n**Confidence:** ${Math.round(result.confidence * 100)}%`;
      }
    }
    
    formatted += `\n\n*Analyzed with ${data.model} on ${data.gpu}*`;
    return formatted;
  }
  
  async function handleBrowserRequest(message: string): Promise<string> {
    const urlMatch = message.match(/https?:\/\/[^\s]+/);
    const url = urlMatch ? urlMatch[0] : 'https://google.com';
    
    const response = await fetch(`${API_BASE_URL}/browser-agent/navigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) throw new Error('Browser request failed');
    
    const data = await response.json();
    return `🌐 **Browser Navigation:**\n\nNavigated to: ${url}\nStatus: ${data.status}\n\n*Screenshot captured and session active*`;
  }
  
  async function handleTaskRequest(message: string): Promise<string> {
    if (message.toLowerCase().includes('create') || message.toLowerCase().includes('add')) {
      const response = await fetch(`${API_BASE_URL}/tasks/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: message.replace(/create task:?|add task:?/i, '').trim(),
          status: 'pending'
        })
      });
      
      if (!response.ok) throw new Error('Task creation failed');
      
      const data = await response.json();
      return `✅ **Task Created:**\n\n"${data.task.title}"\nID: ${data.task.id}\nStatus: ${data.task.status}`;
    }
    
    // List tasks
    const response = await fetch(`${API_BASE_URL}/tasks/list`);
    if (!response.ok) throw new Error('Task list failed');
    
    const data = await response.json();
    let result = `📋 **Your Tasks:**\n\n`;
    data.tasks.forEach((task: any) => {
      result += `• ${task.title} [${task.status}]\n`;
    });
    return result;
  }

  return {
    sendMessage,
    loading
  };
};