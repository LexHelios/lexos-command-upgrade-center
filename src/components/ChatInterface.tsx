import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAIAPI } from '@/hooks/use-ai-api';
import { MultimodalMessageRenderer } from './MultimodalMessageRenderer';
import { API_BASE_URL } from '@/config/api';
import { 
  Send, 
  Mic, 
  MicOff, 
  Image, 
  Paperclip, 
  Bot, 
  User, 
  Copy, 
  Download,
  Sparkles,
  Brain,
  Zap,
  Globe,
  Clock,
  DollarSign,
  RefreshCw,
  Settings,
  Volume2,
  VolumeX,
  Play,
  Pause
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  provider?: string;
  cost?: number;
  tokens?: number;
  attachments?: Attachment[];
  isStreaming?: boolean;
  audioUrl?: string;
  contentBlocks?: Array<{
    type: 'text' | 'image' | 'video' | 'audio' | 'code' | 'mermaid' | 'chart' | 'tree' | 'table';
    content: string;
    metadata?: any;
  }>;
}

interface Attachment {
  name: string;
  size: number;
  type: string;
}

interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
  model?: string;
  totalCost: number;
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: '🚀 **LexOS Multimodal AI Command Center**\n\nWelcome to your advanced multimodal AI system! I can now:\n\n🧠 **Advanced Reasoning** with AM-Thinking-v1 and DeepSeek-R1\n🎨 **Image Generation** with Stable Diffusion (NSFW capable)\n🎥 **Video Creation** with Open-Sora (720p, 15 sec)\n💬 **Natural Conversations** with Qwen2.5-Omni and Mistral\n📊 **Data Visualization** with charts, graphs, and diagrams\n🌳 **Mermaid Diagrams** for flowcharts and trees\n💰 **Financial Analysis** with specialized models\n🔍 **Real-time Search** with web access\n\n**3-Tier System Active:**\n• Tier 1: H100 self-hosted models (free)\n• Tier 2: Groq open-source models (free)\n• Tier 3: DeepSeek R1 API (ultra-cheap fallback)\n\nTry asking me to:\n- Generate an image or video\n- Create a flowchart or diagram\n- Analyze data with charts\n- Reason through complex problems\n\nHow can I assist you today?',
      timestamp: new Date(),
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('default');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [typingIndicator, setTypingIndicator] = useState(false);
  
  const { sendMessage, loading } = useAIAPI();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() && selectedFiles.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
      attachments: selectedFiles.length > 0 ? selectedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })) : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedFiles([]);
    setTypingIndicator(true);

    try {
      // Determine task type based on input
      const taskType = determineTaskType(input);
      const complexity = determineComplexity(input);
      
      const response = await sendMessage(input, {
        task_type: taskType,
        complexity: complexity,
        quality: 'standard',  // Changed from 'premium' to use free models first
        prefer_self_hosted: true,
        enable_web_search: true
      });

      // Parse response for multimodal content
      const contentBlocks = parseResponseForMultimedia(response.result, taskType);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.result,
        contentBlocks: contentBlocks,
        timestamp: new Date(),
        model: response.model_used.model,
        provider: response.model_used.provider,
        cost: response.model_used.cost,
        tokens: response.model_used.tokens
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Generate voice response if enabled
      if (isVoiceEnabled) {
        await generateVoiceResponse(response.result);
      }

    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'system',
        content: `❌ **Error**: ${error instanceof Error ? error.message : 'An unknown error occurred'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setTypingIndicator(false);
    }
  };

  const determineTaskType = (input: string): 'code' | 'reasoning' | 'realtime' | 'image' | 'video' | 'chat' | 'financial' | 'nsfw' | 'roleplay' | 'creative' | 'storytelling' | 'anime' | 'realistic' | 'general' => {
    const lower = input.toLowerCase();
    
    // Check for image generation first (highest priority)
    if (lower.includes('image') || lower.includes('picture') || lower.includes('photo') || 
        lower.includes('draw') || lower.includes('generate') || lower.includes('create') ||
        lower.includes('illustration') || lower.includes('artwork')) {
      // Even if it says "realistic" or "anime", it's still an image request
      return 'image';
    }
    
    if (lower.includes('code') || lower.includes('program') || lower.includes('function')) return 'code';
    if (lower.includes('analyze') || lower.includes('think') || lower.includes('reason')) return 'reasoning';
    if (lower.includes('search') || lower.includes('find') || lower.includes('latest')) return 'realtime';
    if (lower.includes('video') || lower.includes('animation') || lower.includes('movie')) return 'video';
    if (lower.includes('anime') || lower.includes('manga') || lower.includes('waifu')) return 'anime';
    if (lower.includes('realistic') || lower.includes('photorealistic') || lower.includes('real life')) return 'realistic';
    if (lower.includes('roleplay') || lower.includes('character') || lower.includes('persona')) return 'roleplay';
    if (lower.includes('story') || lower.includes('tale') || lower.includes('narrative')) return 'storytelling';
    if (lower.includes('creative') || lower.includes('imaginative') || lower.includes('artistic')) return 'creative';
    if (lower.includes('chat') || lower.includes('conversation') || lower.includes('talk')) return 'chat';
    if (lower.includes('finance') || lower.includes('stock') || lower.includes('money') || lower.includes('investment')) return 'financial';
    // Check for NSFW/adult content
    if (lower.includes('naked') || lower.includes('nude') || lower.includes('nsfw') || lower.includes('adult') || 
        lower.includes('sex') || lower.includes('erotic') || lower.includes('porn') || lower.includes('explicit') ||
        lower.includes('topless') || lower.includes('unclothed') || lower.includes('undressed')) {
      return 'nsfw';
    }
    return 'general';
  };

  const determineComplexity = (input: string): 'high' | 'medium' | 'low' => {
    if (input.length > 500) return 'high';
    if (input.length > 200) return 'medium';
    return 'low';
  };

  const generateVoiceResponse = async (text: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/text-to-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 500), voice: 'alloy' })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (audioRef.current) {
          audioRef.current.src = `data:audio/mp3;base64,${data.audioContent}`;
          audioRef.current.play();
        }
      }
    } catch (error) {
      console.error('Voice generation failed:', error);
    }
  };

  const handleVoiceInput = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsRecording(true);
        // Voice recording implementation would go here
        toast({
          title: "Voice Recording",
          description: "Recording started... (Feature in development)",
        });
      } catch (error) {
        toast({
          title: "Microphone Error",
          description: "Unable to access microphone",
          variant: "destructive",
        });
      }
    } else {
      setIsRecording(false);
      toast({
        title: "Voice Recording",
        description: "Recording stopped",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  const exportChat = () => {
    const chatData = {
      session: activeChatId,
      messages: messages,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lexos-chat-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseResponseForMultimedia = (content: string, taskType: string) => {
    const blocks = [];
    
    // Check for markdown images first ![alt](url)
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let imageMatch;
    while ((imageMatch = markdownImageRegex.exec(content)) !== null) {
      blocks.push({
        type: 'image' as const,
        content: imageMatch[2], // URL is in the second capture group
        metadata: { 
          alt: imageMatch[1] || 'AI Generated Image',
          caption: imageMatch[1] || undefined
        }
      });
    }
    
    // If no markdown images found, check for direct URLs in image tasks
    if (blocks.length === 0 && taskType === 'image' && content.includes('http')) {
      const urlMatch = content.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/gi);
      if (urlMatch) {
        blocks.push({
          type: 'image' as const,
          content: urlMatch[0],
          metadata: { 
            alt: 'AI Generated Image',
            caption: 'Generated with AI'
          }
        });
      }
    }
    
    // Check for HTML video tags or video URLs
    if (taskType === 'video') {
      // Check for <video> tags
      const videoTagRegex = /<video[^>]*>.*?<source[^>]+src="([^"]+)"[^>]*>.*?<\/video>/gi;
      let videoMatch;
      while ((videoMatch = videoTagRegex.exec(content)) !== null) {
        blocks.push({
          type: 'video' as const,
          content: videoMatch[1],
          metadata: { 
            caption: 'Generated video'
          }
        });
      }
      
      // If no video tags, check for direct video URLs
      if (blocks.length === 0 && content.includes('http')) {
        const urlMatch = content.match(/https?:\/\/[^\s]+\.(mp4|webm|mov)/gi);
        if (urlMatch) {
          blocks.push({
            type: 'video' as const,
            content: urlMatch[0],
            metadata: { 
              caption: 'Generated video'
            }
          });
        }
      }
    }
    
    // Return null if no special blocks found (will use default renderer)
    return blocks.length > 0 ? blocks : undefined;
  };
  
  const clearChat = () => {
    setMessages([{
      id: Date.now().toString(),
      type: 'system',
      content: '🔄 **Chat Cleared** - Ready for new conversation',
      timestamp: new Date(),
    }]);
  };

  const totalCost = messages.reduce((sum, msg) => sum + (msg.cost || 0), 0);
  const totalTokens = messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border/50 glass-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/20 rounded-full glow">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">LexOS AI Chat</h1>
              <p className="text-sm text-muted-foreground">
                Multi-model AI with real-time capabilities
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              <DollarSign className="h-3 w-3 mr-1" />
              ${totalCost.toFixed(4)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              {totalTokens}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}>
              {isVoiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={exportChat}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={clearChat}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex space-x-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <Avatar className="w-8 h-8 ring-2 ring-primary/30">
                  <AvatarFallback className={message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                    {message.type === 'user' ? <User className="h-4 w-4" /> : 
                     message.type === 'system' ? <Settings className="h-4 w-4" /> : 
                     <Bot className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                
                <div className={`glass-card p-4 rounded-lg ${
                  message.type === 'user' ? 'bg-primary/10 border-primary/30' : 
                  message.type === 'system' ? 'bg-secondary/10 border-secondary/30' :
                  'bg-card border-border/50'
                }`}>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <MultimodalMessageRenderer 
                      content={message.content} 
                      contentBlocks={message.contentBlocks}
                    />
                  </div>
                  
                  {message.attachments && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.attachments.map((file, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          <Paperclip className="h-3 w-3 mr-1" />
                          {file.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{message.timestamp.toLocaleTimeString()}</span>
                      {message.model && (
                        <>
                          <span>•</span>
                          <Badge variant="outline" className="text-xs">
                            {message.provider}/{message.model}
                          </Badge>
                        </>
                      )}
                      {message.cost && (
                        <>
                          <span>•</span>
                          <span>${message.cost.toFixed(4)}</span>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(message.content)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      {message.audioUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            if (audioRef.current) {
                              audioRef.current.src = message.audioUrl!;
                              audioRef.current.play();
                            }
                          }}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {typingIndicator && (
            <div className="flex justify-start">
              <div className="flex space-x-3">
                <Avatar className="w-8 h-8 ring-2 ring-primary/30">
                  <AvatarFallback className="bg-secondary">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="glass-card p-4 rounded-lg bg-card border-border/50">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                    <span className="text-sm text-muted-foreground">AI is thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-border/50 glass-panel">
        {selectedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                <Paperclip className="h-3 w-3 mr-1" />
                {file.name}
                <button
                  onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Ask me anything... I have access to real-time data, multiple AI models, and advanced capabilities."
              className="pr-20 min-h-[44px] glass-card border-primary/30 focus:border-primary/50"
              disabled={loading}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 w-8 p-0"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVoiceInput}
                className={`h-8 w-8 p-0 ${isRecording ? 'text-red-500 animate-pulse' : ''}`}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={loading || (!input.trim() && selectedFiles.length === 0)}
            className="h-11 px-6 bg-primary hover:bg-primary/90 glow"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <Globe className="h-3 w-3 mr-1" />
              Web Search: Enabled
            </span>
            <span className="flex items-center">
              <Brain className="h-3 w-3 mr-1" />
              Smart Routing: Active
            </span>
            <span className="flex items-center">
              <Sparkles className="h-3 w-3 mr-1" />
              Premium Quality
            </span>
          </div>
          <div className="text-xs">
            Press Enter to send • Shift+Enter for new line
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileUpload}
        className="hidden"
      />
      
      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

// Example of how to format messages with rich content:
// 
// For images:
// ![Alt text](https://example.com/image.jpg)
// 
// For charts:
// ```chart
// {
//   "type": "line",
//   "data": {
//     "labels": ["Jan", "Feb", "Mar"],
//     "datasets": [{
//       "label": "Sales",
//       "data": [10, 20, 30]
//     }]
//   }
// }
// ```
// 
// For mermaid diagrams:
// ```mermaid
// graph TD
//   A[Start] --> B{Decision}
//   B -->|Yes| C[Do this]
//   B -->|No| D[Do that]
// ```