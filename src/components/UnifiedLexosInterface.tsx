import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAIAPI } from '@/hooks/use-ai-api-local';
import { useVoiceConversation } from '@/hooks/use-voice-conversation';
import { useSmartOrchestrator } from '@/hooks/use-smart-orchestrator';
import { MultimodalMessageRenderer } from './MultimodalMessageRenderer';
import { MultimodalUpload } from './MultimodalUpload';
import { HttpsStatus } from './HttpsStatus';
import { MicrophoneTest } from './MicrophoneTest';
import { API_ENDPOINTS, API_BASE_URL } from '@/config/api';
import { 
  Send, 
  Mic, 
  MicOff, 
  Paperclip,
  Globe,
  CheckSquare,
  TrendingUp,
  FileText,
  Image,
  Video,
  Brain,
  Sparkles,
  Eye,
  X,
  Maximize,
  Minimize,
  RefreshCw,
  Download,
  Search,
  Play,
  Pause,
  Camera,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Settings
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  files?: Array<{
    type: 'image' | 'video' | 'document' | 'code';
    url?: string;
    name: string;
    content?: string;
  }>;
  browserPreview?: {
    url: string;
    screenshot?: string;
  };
  dataVisualization?: any;
  tasks?: Array<{
    id: string;
    text: string;
    completed: boolean;
  }>;
}

interface BrowserSession {
  id: string;
  url: string;
  isActive: boolean;
  screenshot?: string;
}

export const UnifiedLexosInterface = () => {
  const { toast } = useToast();
  const { sendMessage: sendAIMessage, loading: aiLoading } = useAIAPI();
  const { sendMessage: sendOrchestratedMessage, loading: orchestratorLoading } = useSmartOrchestrator();
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm Lexos, your unified AI assistant. I can help you with:

🧠 **Smart Conversations** - Ask me anything, I'll orchestrate the best AI models
📋 **Task Management** - I'll track and help complete your tasks  
🎤 **Voice Chat** - Just click the mic to talk to me
🌐 **Web Browsing** - I can browse websites and help with automation
📊 **Data Visualization** - I'll show charts and real-time data
📁 **Document Analysis** - Upload any file and I'll help you understand it
🚀 **App Building** - Use DeepAgent to build full applications

What would you like to do today?`,
      timestamp: new Date(),
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [browserSession, setBrowserSession] = useState<BrowserSession | null>(null);
  const [showBrowserPanel, setShowBrowserPanel] = useState(false);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [isThinking, setIsThinking] = useState(false);
  const [showMicTest, setShowMicTest] = useState(false);
  
  // Task tracking
  const [activeTasks, setActiveTasks] = useState<Array<{
    id: string;
    text: string;
    completed: boolean;
  }>>([]);

  // Voice recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Enhanced voice conversation hook
  const {
    isListening,
    isSpeaking,
    transcript,
    conversationMode,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleConversationMode
  } = useVoiceConversation({
    autoSpeak: true,
    voice: 'rachel',
    continuous: true
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Handle voice transcript in conversation mode
  useEffect(() => {
    if (transcript && conversationMode && !isListening) {
      setInput(transcript);
      handleSend();
    }
  }, [transcript, conversationMode, isListening]);
  
  // Update input when transcript changes (manual mode)
  useEffect(() => {
    if (transcript && !conversationMode) {
      setInput(prev => prev + ' ' + transcript);
    }
  }, [transcript, conversationMode]);

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      files: attachments.map(file => ({
        type: file.type.startsWith('image/') ? 'image' : 
              file.type.startsWith('video/') ? 'video' : 'document',
        name: file.name,
        url: URL.createObjectURL(file)
      }))
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    const savedAttachments = [...attachments];
    setAttachments([]);
    setIsThinking(true);

    try {
      // Check if we have image attachments for vision processing
      const hasImages = savedAttachments.some(f => f.type.startsWith('image/'));
      
      if (hasImages) {
        // Process with vision models
        await handleVisionAnalysis(input, savedAttachments);
      } else {
        // Analyze intent
        const intent = analyzeIntent(input);
        
        // Handle different intents
        if (intent.includes('browse') || intent.includes('web')) {
          await handleBrowserRequest(input);
        } else if (intent.includes('task') || intent.includes('todo')) {
          await handleTaskManagement(input);
        } else if (intent.includes('chart') || intent.includes('data')) {
          await handleDataVisualization(input);
        } else {
          // Use Smart Orchestrator for intelligent routing
          let response;
          try {
            // Try orchestrator first for smart routing
            response = await sendOrchestratedMessage(input, savedAttachments);
          } catch (orchError) {
            console.log('Orchestrator failed, falling back to direct AI...');
            // Fallback to direct AI with proper schema
            response = await sendAIMessage(input, {
              taskType: 'general',
              complexity: 'medium',
              quality: 'standard',
              files: savedAttachments,
              systemPrompt: `You are Lexos, a unified AI assistant. Be helpful, concise, and proactive. 
              If the user asks about tasks, help them manage tasks.
              If they ask about browsing, offer to open websites.
              If they ask about data, create visualizations.
              Always be ready to help with any request.`
            });
          }

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response,
            timestamp: new Date(),
          };

          setMessages(prev => [...prev, assistantMessage]);
          
          // Auto-speak the response if in conversation mode
          if (conversationMode && response) {
            const plainText = response
              .replace(/```[\s\S]*?```/g, '') // Remove code blocks
              .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // Remove images
              .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
              .replace(/<[^>]*>/g, '') // Remove HTML tags
              .replace(/[#*_~`]/g, '') // Remove markdown formatting
              .trim();
            
            if (plainText && plainText.length > 0) {
              console.log('Speaking AI response:', plainText.substring(0, 100) + '...');
              speak(plainText);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing request:', error);
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsThinking(false);
    }
  };

  const analyzeIntent = (text: string): string[] => {
    const lower = text.toLowerCase();
    const intents = [];
    
    if (lower.includes('browse') || lower.includes('website') || lower.includes('go to') || lower.includes('navigate')) {
      intents.push('browse');
    }
    if (lower.includes('task') || lower.includes('todo') || lower.includes('checklist')) {
      intents.push('task');
    }
    if (lower.includes('chart') || lower.includes('graph') || lower.includes('visualiz') || lower.includes('data')) {
      intents.push('chart');
    }
    
    return intents;
  };

  const handleBrowserRequest = async (input: string) => {
    // Extract URL from input
    const urlMatch = input.match(/https?:\/\/[^\s]+/);
    const url = urlMatch ? urlMatch[0] : 'https://google.com';
    
    setShowBrowserPanel(true);
    setBrowserSession({
      id: Date.now().toString(),
      url,
      isActive: true
    });

    // Call browser agent API
    try {
      const response = await fetch(`${API_BASE_URL}/browser-agent/navigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error(`Browser request failed: ${response.status}`);
      }

      const data = await response.json();
      
      setBrowserSession(prev => prev ? {
        ...prev,
        screenshot: data.screenshot
      } : null);

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🌐 **Browser Navigation:**\n\nSuccessfully navigated to: ${url}\n\n*Browser session is now active. You can ask me to interact with the page.*`,
        timestamp: new Date(),
        browserPreview: {
          url,
          screenshot: data.screenshot
        }
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Auto-speak if in conversation mode
      if (conversationMode) {
        speak(`Successfully navigated to ${url}. The browser session is now active.`);
      }
    } catch (error) {
      console.error('Browser error:', error);
      
      // Fallback message
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🌐 **Browser Navigation:**\n\nI'll help you navigate to: ${url}\n\n*Note: Browser automation is being set up. You can ask me to browse websites and interact with them.*`,
        timestamp: new Date(),
        browserPreview: {
          url
        }
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      if (conversationMode) {
        speak(`I'll help you navigate to ${url}. Browser automation is being set up.`);
      }
    }
  };

  const handleTaskManagement = async (input: string) => {
    // Extract tasks from input
    const taskMatch = input.match(/(?:add|create|new)\s+(?:task|todo)[:\s]+(.*)/i);
    
    if (taskMatch) {
      const newTask = {
        id: Date.now().toString(),
        text: taskMatch[1],
        completed: false
      };
      
      setActiveTasks(prev => [...prev, newTask]);
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I've added "${newTask.text}" to your task list. You now have ${activeTasks.length + 1} active tasks.`,
        timestamp: new Date(),
        tasks: [...activeTasks, newTask]
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Auto-speak the response if in conversation mode
      if (conversationMode) {
        speak(assistantMessage.content);
      }
    }
  };

  const handleDataVisualization = async (input: string) => {
    // Generate sample data visualization
    const assistantMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Here's a visualization based on your request:`,
      timestamp: new Date(),
      dataVisualization: {
        type: 'chart',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
          datasets: [{
            label: 'Performance',
            data: [65, 75, 70, 85, 90],
            borderColor: 'rgb(99, 102, 241)',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
          }]
        }
      }
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    
    // Auto-speak the visualization announcement
    if (conversationMode) {
      speak("Here's a visualization based on your request. You can see the chart in the conversation.");
    }
    
    // Auto-speak the response if in conversation mode
    if (conversationMode) {
      speak(assistantMessage.content);
    }
  };

  const toggleRecording = async () => {
    if (!isListening) {
      console.log('Starting microphone...');
      try {
        await startListening();
        toast({
          title: "Listening...",
          description: "Speak naturally, I'm listening",
        });
      } catch (error) {
        console.error('Failed to start listening:', error);
        toast({
          title: "Microphone Error",
          description: "Could not access microphone. Make sure you're using HTTPS.",
          variant: "destructive"
        });
      }
    } else {
      console.log('Stopping microphone...');
      stopListening();
    }
  };

  const handleAudioInput = async (audioBlob: Blob) => {
    // Convert to text using STT
    const formData = new FormData();
    formData.append('audio', audioBlob);
    
    try {
      const response = await fetch(API_ENDPOINTS.stt.transcribe, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const data = await response.json();
      const transcribedText = data.text || '';
      
      if (transcribedText.trim()) {
        setInput(transcribedText);
        toast({
          title: "Transcribed",
          description: transcribedText,
        });
      } else {
        toast({
          title: "No Speech Detected",
          description: "Please speak clearly and try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Transcription Failed",
        description: "Could not transcribe audio. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    
    // Check if any images for vision processing
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length > 0 && !input) {
      setInput('Please analyze this image');
    }
  };

  const handleVisionAnalysis = async (prompt: string, files: File[]) => {
    const imageFile = files.find(f => f.type.startsWith('image/'));
    if (!imageFile) return;
    
    try {
      // First, try OCR if text extraction is mentioned
      if (prompt.toLowerCase().includes('text') || prompt.toLowerCase().includes('ocr')) {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('model', 'easyocr');
        
        const ocrResponse = await fetch(`${API_BASE_URL}/vision/ocr`, {
          method: 'POST',
          body: formData
        });
        
        if (ocrResponse.ok) {
          const ocrData = await ocrResponse.json();
          const assistantMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `🔍 **Text Extraction Results:**\n\n${ocrData.text}\n\n*Processed with ${ocrData.model} on H100 GPU*`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMessage]);
          return;
        }
      }
      
      // General vision analysis
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('model', 'qwen2.5-vl-7b');
      formData.append('task', 'general');
      
      const visionResponse = await fetch(`${API_BASE_URL}/vision/analyze`, {
        method: 'POST',
        body: formData
      });
      
      if (visionResponse.ok) {
        const visionData = await visionResponse.json();
        const result = visionData.result;
        
        let formattedContent = `🖼️ **Vision Analysis:**\n\n`;
        
        if (typeof result === 'string') {
          formattedContent += result;
        } else if (result.description) {
          formattedContent += `**Description:** ${result.description}\n\n`;
          
          if (result.detailed_analysis) {
            formattedContent += `**Detailed Analysis:**\n`;
            for (const [key, value] of Object.entries(result.detailed_analysis)) {
              formattedContent += `\n*${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:*\n`;
              if (Array.isArray(value)) {
                value.forEach(item => formattedContent += `• ${item}\n`);
              } else {
                formattedContent += `${value}\n`;
              }
            }
          }
          
          if (result.confidence) {
            formattedContent += `\n**Confidence:** ${Math.round(result.confidence * 100)}%`;
          }
        } else {
          formattedContent += JSON.stringify(result, null, 2);
        }
        
        formattedContent += `\n\n*Analyzed with ${visionData.model} on H100 GPU*`;
        
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: formattedContent,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Auto-speak if in conversation mode
        if (conversationMode) {
          const description = typeof result === 'string' ? result : 
                           result.description || result.text || 'Image analyzed';
          speak(description);
        }
      } else {
        // Fallback to regular AI with image description request
        const response = await sendAIMessage(prompt || 'Please describe this image', {
          files: files,
          taskType: 'general',
          systemPrompt: 'You are analyzing an image. Describe what you see.'
        });
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Vision analysis error:', error);
      
      // Fallback to regular AI
      try {
        const response = await sendAIMessage(prompt || 'Please describe this image', { 
          files: files,
          taskType: 'general'
        });
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } catch (fallbackError) {
        console.error('Fallback AI also failed:', fallbackError);
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I'm having trouble analyzing this image right now. Please try again later or describe what you see in the image.",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    }
  };
  
  const toggleTask = (taskId: string) => {
    setActiveTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  return (
    <div className="h-full flex bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Lexos AI Assistant</h2>
              <p className="text-xs text-muted-foreground">Smart orchestration • Voice enabled • Browser ready</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {conversationMode && (
              <Badge variant="default" className="text-xs animate-pulse">
                Conversation Mode
              </Badge>
            )}
            {isListening && (
              <Badge variant="destructive" className="text-xs animate-pulse">
                Listening...
              </Badge>
            )}
            {isSpeaking && (
              <Badge variant="secondary" className="text-xs">
                Speaking...
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              Model: {selectedModel === 'auto' ? 'Auto-select' : selectedModel}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBrowserPanel(!showBrowserPanel)}
            >
              <Globe className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* HTTPS Status Alert */}
        {window.location.protocol === 'http:' && (
          <div className="px-4 pt-2">
            <HttpsStatus />
          </div>
        )}
        
        {/* Conversation Mode Banner */}
        {conversationMode && (
          <div className="bg-primary/10 border-b border-primary/20 p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Phone className="w-5 h-5 text-primary animate-pulse" />
              <span className="font-medium">Conversation Mode Active</span>
              <span className="text-sm text-muted-foreground">Speak naturally, I'm listening...</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleConversationMode}
              className="text-destructive hover:bg-destructive/10"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              End Conversation
            </Button>
          </div>
        )}
        
        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${
                  message.role === 'user' ? 'order-2' : 'order-1'
                }`}>
                  <div className={`rounded-lg p-4 ${
                    message.role === 'user' 
                      ? 'bg-primary/10 border-primary/20' 
                      : 'bg-muted border-border'
                  } border`}>
                    {/* Message content */}
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <MultimodalMessageRenderer content={message.content} />
                    </div>

                    {/* Attachments */}
                    {message.files && message.files.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.files.map((file, idx) => (
                          <div key={idx} className="relative group">
                            {file.type === 'image' ? (
                              <img 
                                src={file.url} 
                                alt={file.name}
                                className="w-32 h-32 object-cover rounded border"
                              />
                            ) : (
                              <div className="w-32 h-32 bg-muted rounded border flex items-center justify-center">
                                <FileText className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                              <p className="text-white text-xs px-2 text-center truncate">
                                {file.name}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tasks */}
                    {message.tasks && message.tasks.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.tasks.map((task) => (
                          <div 
                            key={task.id}
                            className="flex items-center space-x-2 p-2 bg-background rounded"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={() => toggleTask(task.id)}
                            >
                              <CheckSquare className={`w-4 h-4 ${
                                task.completed ? 'text-primary' : 'text-muted-foreground'
                              }`} />
                            </Button>
                            <span className={`text-sm ${
                              task.completed ? 'line-through text-muted-foreground' : ''
                            }`}>
                              {task.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Browser Preview */}
                    {message.browserPreview && (
                      <div className="mt-3">
                        <div className="bg-background rounded p-2 border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">{message.browserPreview.url}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => setShowBrowserPanel(true)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                          {message.browserPreview.screenshot && (
                            <img 
                              src={message.browserPreview.screenshot} 
                              alt="Browser preview"
                              className="w-full rounded border"
                            />
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                      {message.role === 'assistant' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const plainText = message.content
                              .replace(/```[\s\S]*?```/g, '')
                              .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
                              .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                              .replace(/<[^>]*>/g, '')
                              .replace(/[#*_~`]/g, '')
                              .trim();
                            if (plainText) speak(plainText);
                          }}
                          className="h-6 px-2"
                        >
                          <Volume2 className="w-3 h-3 mr-1" />
                          Speak
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-muted border-border border rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 animate-pulse text-primary" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Microphone Test */}
        {showMicTest && (
          <div className="p-4 border-t border-border/50">
            <MicrophoneTest />
          </div>
        )}
        
        {/* Input Area */}
        <div className="border-t border-border/50 p-4">
          {/* Quick Action Buttons */}
          <div className="flex items-center justify-center space-x-4 mb-3">
            <Button
              variant={conversationMode ? "default" : "outline"}
              size="default"
              onClick={toggleConversationMode}
              className="flex items-center space-x-2"
            >
              {conversationMode ? (
                <>
                  <PhoneOff className="w-4 h-4" />
                  <span>End Conversation</span>
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  <span>Start Conversation Mode</span>
                </>
              )}
            </Button>
            
            <Button
              variant={isListening ? "destructive" : "outline"}
              size="default"
              onClick={toggleRecording}
              className="flex items-center space-x-2"
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Stop Recording</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Push to Talk</span>
                </>
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="default"
              onClick={() => setShowMicTest(!showMicTest)}
              className="flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>Test Mic</span>
            </Button>
            
            <Button
              variant="ghost"
              size="default"
              onClick={() => {
                console.log('Testing TTS...');
                speak('Hello! This is a test of the text to speech system. If you can hear this, the audio is working correctly.');
              }}
              className="flex items-center space-x-2"
            >
              <Volume2 className="w-4 h-4" />
              <span>Test TTS</span>
            </Button>
            
            <Button
              variant="ghost"
              size="default"
              onClick={() => speak("Hello! This is a test of the text-to-speech system. Can you hear me?")}
              className="flex items-center space-x-2"
            >
              <Volume2 className="w-4 h-4" />
              <span>Test TTS</span>
            </Button>
          </div>
          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center space-x-2 bg-muted px-3 py-1 rounded-full text-sm">
                  <Paperclip className="w-3 h-3" />
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0"
                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Active Tasks Summary */}
          {activeTasks.length > 0 && (
            <div className="flex items-center space-x-2 mb-3 text-sm text-muted-foreground">
              <CheckSquare className="w-4 h-4" />
              <span>
                {activeTasks.filter(t => t.completed).length}/{activeTasks.length} tasks completed
              </span>
            </div>
          )}

          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  isListening 
                    ? "Listening... speak now" 
                    : conversationMode 
                    ? "Conversation mode active..." 
                    : "Ask me anything... (@ to mention files, / for commands)"
                }
                className="min-h-[60px] max-h-[200px] resize-none"
                disabled={isListening}
              />
            </div>
            
            <div className="flex flex-col space-y-2">
              <div className="flex space-x-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button
                  variant={isListening ? "destructive" : "outline"}
                  size="icon"
                  onClick={toggleRecording}
                  className="relative"
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isListening && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                  )}
                </Button>
              </div>
              <Button 
                onClick={handleSend}
                disabled={aiLoading || (!input.trim() && attachments.length === 0)}
                className="bg-primary hover:bg-primary/90"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Browser Panel */}
      {showBrowserPanel && (
        <div className="w-[600px] border-l border-border/50 flex flex-col">
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-semibold">Browser</h3>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Camera className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBrowserPanel(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {browserSession ? (
            <div className="flex-1 bg-white">
              <div className="p-2 bg-muted border-b">
                <Input 
                  value={browserSession.url}
                  className="text-sm"
                  readOnly
                />
              </div>
              <div className="flex-1 flex items-center justify-center p-8">
                {browserSession.screenshot ? (
                  <img 
                    src={browserSession.screenshot} 
                    alt="Browser view"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Globe className="w-16 h-16 mx-auto mb-4" />
                    <p>Browser preview will appear here</p>
                    <p className="text-sm mt-2">You can interact with the page</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Globe className="w-16 h-16 mx-auto mb-4" />
                <p>No active browser session</p>
                <p className="text-sm mt-2">Ask me to browse a website!</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};