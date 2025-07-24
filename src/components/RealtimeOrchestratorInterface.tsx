import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Brain, 
  Zap, 
  Globe,
  Activity,
  Settings,
  Play,
  Square,
  Wifi,
  WifiOff,
  MessageSquare,
  Bot,
  User,
  Clock,
  Headphones,
  Radio,
  Waves
} from 'lucide-react';

interface RealtimeMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'function_call';
  content: string;
  timestamp: Date;
  audioData?: ArrayBuffer;
  functionName?: string;
  functionArgs?: unknown;
  functionResult?: unknown;
}

interface ConnectionStatus {
  connected: boolean;
  latency: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  lastPing: Date;
}

const RealtimeOrchestratorInterface: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    latency: 0,
    quality: 'poor',
    lastPing: new Date()
  });
  const [audioLevel, setAudioLevel] = useState(0);
  const [voiceActivity, setVoiceActivity] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioWorkletRef = useRef<AudioWorkletNode | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const connect = async () => {
    try {
      // Initialize audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000
        } 
      });
      mediaStreamRef.current = stream;

      // Connect to WebSocket
      const wsUrl = `wss://hgnnbzlvqzmtnrzhicxr.supabase.co/functions/v1/realtime-orchestrator`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionStatus({
          connected: true,
          latency: 0,
          quality: 'excellent',
          lastPing: new Date()
        });
        
        addMessage({
          type: 'system',
          content: '🎙️ **Real-time Orchestrator Connected**\n\nVoice interface is now active. I can:\n\n• Execute web searches in real-time\n• Control browser automation\n• Monitor system status\n• Make intelligent AI calls\n• Coordinate multiple agents\n\nSpeak naturally - I\'m listening!'
        });

        toast({
          title: "Connected",
          description: "Real-time orchestrator is now active",
        });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to real-time orchestrator",
          variant: "destructive",
        });
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        setConnectionStatus(prev => ({ ...prev, connected: false }));
        addMessage({
          type: 'system',
          content: '🔌 **Connection Closed**\n\nReal-time orchestrator disconnected.'
        });
      };

      // Set up audio processing
      setupAudioProcessing(stream);

    } catch (error) {
      console.error('Connection failed:', error);
      toast({
        title: "Connection Failed",
        description: "Unable to access microphone or connect to server",
        variant: "destructive",
      });
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsConnected(false);
    setIsRecording(false);
    setIsSpeaking(false);
  };

  const setupAudioProcessing = async (stream: MediaStream) => {
    if (!audioContextRef.current) return;

    const source = audioContextRef.current.createMediaStreamSource(stream);
    const analyser = audioContextRef.current.createAnalyser();
    analyser.fftSize = 256;
    
    source.connect(analyser);
    
    // Monitor audio levels
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const updateAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setAudioLevel(average);
      setVoiceActivity(average > 20); // Threshold for voice activity
      
      if (isConnected) {
        requestAnimationFrame(updateAudioLevel);
      }
    };
    updateAudioLevel();
  };

  const handleWebSocketMessage = (data: { type: string; delta?: string; name?: string; arguments?: unknown; item?: { type: string; role: string; content: { text: string }[] | string }; error?: { message: string } }) => {
    switch (data.type) {
      case 'response.audio.delta':
        // Handle streaming audio response
        if (data.delta) {
          playAudioChunk(data.delta);
        }
        break;
        
      case 'response.text.delta':
        // Handle streaming text response
        updateStreamingMessage(data.delta);
        break;
        
      case 'response.function_call_arguments.done':
        // Handle function call completion
        addMessage({
          type: 'function_call',
          content: `🔧 **Function Called**: ${data.name}\n\nArguments: ${JSON.stringify(data.arguments, null, 2)}`,
          functionName: data.name,
          functionArgs: data.arguments
        });
        break;
        
      case 'conversation.item.created':
        // Handle new conversation item
        if (data.item.type === 'message') {
          addMessage({
            type: data.item.role === 'user' ? 'user' : 'assistant',
            content: data.item.content?.[0]?.text || data.item.content || ''
          });
        }
        break;
        
      case 'response.done':
        setIsSpeaking(false);
        updateConnectionLatency();
        break;
        
      case 'error':
        addMessage({
          type: 'system',
          content: `❌ **Error**: ${data.error?.message || 'Unknown error occurred'}`
        });
        break;
    }
  };

  const addMessage = (message: Partial<RealtimeMessage>) => {
    const newMessage: RealtimeMessage = {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...message
    } as RealtimeMessage;
    
    setMessages(prev => [...prev, newMessage]);
  };

  const updateStreamingMessage = (delta: string) => {
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && lastMessage.type === 'assistant') {
        return [
          ...prev.slice(0, -1),
          { ...lastMessage, content: lastMessage.content + delta }
        ];
      } else {
        return [...prev, {
          id: Date.now().toString(),
          type: 'assistant',
          content: delta,
          timestamp: new Date()
        }];
      }
    });
  };

  const playAudioChunk = (audioData: string) => {
    // Implement audio playback for streaming audio
    setIsSpeaking(true);
  };

  const updateConnectionLatency = () => {
    const latency = Math.random() * 200 + 50; // Simulate latency
    let quality: ConnectionStatus['quality'] = 'excellent';
    
    if (latency > 200) quality = 'poor';
    else if (latency > 150) quality = 'fair';
    else if (latency > 100) quality = 'good';
    
    setConnectionStatus(prev => ({
      ...prev,
      latency,
      quality,
      lastPing: new Date()
    }));
  };

  const toggleRecording = () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please connect to the orchestrator first",
        variant: "destructive",
      });
      return;
    }

    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'input_audio_buffer.commit'
        }));
      }
    } else {
      // Start recording
      setIsRecording(true);
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'input_audio_buffer.clear'
        }));
      }
    }
  };

  const sendTextMessage = (text: string) => {
    if (!isConnected || !wsRef.current) return;

    wsRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }]
      }
    }));

    wsRef.current.send(JSON.stringify({
      type: 'response.create'
    }));

    addMessage({
      type: 'user',
      content: text
    });
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border/50 glass-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/20 rounded-full glow">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Real-time Orchestrator</h1>
              <p className="text-muted-foreground">Voice-controlled AI agent with function calling</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {/* Connection Quality */}
            {isConnected && (
              <Badge variant="outline" className={getQualityColor(connectionStatus.quality)}>
                <Wifi className="h-3 w-3 mr-1" />
                {connectionStatus.latency.toFixed(0)}ms
              </Badge>
            )}
            
            {/* Connect/Disconnect Button */}
            <Button
              onClick={isConnected ? disconnect : connect}
              variant={isConnected ? "destructive" : "default"}
              className="glow"
            >
              {isConnected ? (
                <>
                  <WifiOff className="h-4 w-4 mr-2" />
                  Disconnect
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 mr-2" />
                  Connect
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex space-x-3 max-w-[80%] ${
                    message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.type === 'user' ? 'bg-primary text-primary-foreground' :
                      message.type === 'system' ? 'bg-secondary text-secondary-foreground' :
                      message.type === 'function_call' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-card text-card-foreground'
                    }`}>
                      {message.type === 'user' ? <User className="h-4 w-4" /> :
                       message.type === 'system' ? <Settings className="h-4 w-4" /> :
                       message.type === 'function_call' ? <Zap className="h-4 w-4" /> :
                       <Bot className="h-4 w-4" />}
                    </div>
                    
                    <div className={`glass-card p-4 rounded-lg ${
                      message.type === 'user' ? 'bg-primary/10 border-primary/30' :
                      message.type === 'system' ? 'bg-secondary/10 border-secondary/30' :
                      message.type === 'function_call' ? 'bg-yellow-500/10 border-yellow-500/30' :
                      'bg-card border-border/50'
                    }`}>
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{message.timestamp.toLocaleTimeString()}</span>
                        </div>
                        
                        {message.audioData && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Voice Controls */}
          <div className="p-6 border-t border-border/50 glass-panel">
            <div className="flex items-center justify-center space-x-6">
              {/* Audio Level Indicator */}
              <div className="flex items-center space-x-2">
                <Headphones className="h-4 w-4 text-muted-foreground" />
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-100"
                    style={{ width: `${(audioLevel / 255) * 100}%` }}
                  />
                </div>
              </div>

              {/* Main Voice Button */}
              <Button
                onClick={toggleRecording}
                disabled={!isConnected}
                size="lg"
                className={`w-20 h-20 rounded-full ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : 'bg-primary hover:bg-primary/90'
                } glow`}
              >
                {isRecording ? (
                  <Square className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </Button>

              {/* Voice Activity Indicator */}
              <div className="flex items-center space-x-2">
                <Radio className="h-4 w-4 text-muted-foreground" />
                <div className={`w-3 h-3 rounded-full ${
                  voiceActivity ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                }`} />
                <span className="text-xs text-muted-foreground">
                  {voiceActivity ? 'Voice Detected' : 'Listening'}
                </span>
              </div>
            </div>
            
            <div className="text-center mt-4">
              <p className="text-sm text-muted-foreground">
                {!isConnected ? 'Connect to start voice interaction' :
                 isRecording ? 'Speak now... Release to send' :
                 'Hold to speak or click to toggle recording'}
              </p>
            </div>
          </div>
        </div>

        {/* Status Panel */}
        <div className="w-80 border-l border-border/50 p-4 glass-panel">
          <Tabs defaultValue="status" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="functions">Functions</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-4">
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Connection Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">State</span>
                    <Badge className={isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  
                  {isConnected && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Latency</span>
                        <span className="text-sm font-medium">{connectionStatus.latency.toFixed(0)}ms</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Quality</span>
                        <span className={`text-sm font-medium ${getQualityColor(connectionStatus.quality)}`}>
                          {connectionStatus.quality}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Voice Activity</span>
                        <div className={`w-2 h-2 rounded-full ${voiceActivity ? 'bg-green-500' : 'bg-gray-500'}`} />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Audio Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Recording</span>
                    <Badge variant={isRecording ? "default" : "outline"}>
                      {isRecording ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Speaking</span>
                    <Badge variant={isSpeaking ? "default" : "outline"}>
                      {isSpeaking ? 'Playing' : 'Silent'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Input Level</span>
                      <span>{Math.round((audioLevel / 255) * 100)}%</span>
                    </div>
                    <Progress value={(audioLevel / 255) * 100} className="h-1" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="functions" className="space-y-4">
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Available Functions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-3 w-3 text-blue-400" />
                      <span>Web Search</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Bot className="h-3 w-3 text-green-400" />
                      <span>Browser Control</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Activity className="h-3 w-3 text-yellow-400" />
                      <span>System Status</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Brain className="h-3 w-3 text-purple-400" />
                      <span>Smart AI Call</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Recent Functions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    {messages
                      .filter(m => m.type === 'function_call')
                      .slice(-3)
                      .map((msg) => (
                        <div key={msg.id} className="flex items-center space-x-2">
                          <Zap className="h-3 w-3 text-yellow-400" />
                          <span>{msg.functionName}</span>
                          <span className="text-muted-foreground">
                            {msg.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default RealtimeOrchestratorInterface;