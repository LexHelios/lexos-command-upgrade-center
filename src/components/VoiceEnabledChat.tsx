import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAIAPI } from '@/hooks/use-ai-api-local';
import { useVoiceConversation } from '@/hooks/use-voice-conversation';
import { useRasaChat } from '@/hooks/use-rasa-chat';
import { useSmartRouter } from '@/hooks/use-smart-router';
import { MultimodalMessageRenderer } from './MultimodalMessageRenderer';
import { HttpsStatus } from './HttpsStatus';
import { MicrophoneTest } from './MicrophoneTest';
import { 
  Send, 
  Mic, 
  MicOff, 
  Paperclip,
  Brain,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Settings,
  Loader2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from '@/config/api';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

export const VoiceEnabledChat = () => {
  const { toast } = useToast();
  const { sendMessage: sendAIMessage, loading: aiLoading } = useAIAPI();
  const { sendMessage: sendRasaMessage, loading: rasaLoading, checkHealth } = useRasaChat({
    onError: (error) => {
      console.warn('Rasa unavailable, falling back to AI API');
    }
  });
  const { sendMessage: sendSmartMessage, loading: smartLoading, routingInfo } = useSmartRouter();
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm Lexos with enhanced voice capabilities. I can:

🎤 **Voice Conversation** - Click the phone icon for continuous conversation
🔊 **Auto-Speak** - I'll read my responses aloud
🎙️ **Voice Commands** - Just speak naturally
♿ **Accessibility** - Full support for users who can't type or read

Say "Hey Lexos" or click the microphone to start!`,
      timestamp: new Date()
    }
  ]);
  
  const [showMicTest, setShowMicTest] = useState(false);
  
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // Voice settings
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('rachel');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [rasaHealth, setRasaHealth] = useState<{core: boolean, actions: boolean}>({ core: false, actions: false });
  const [lastModelUsed, setLastModelUsed] = useState<string>('');
  
  // Voice conversation hook
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
    autoSpeak,
    voice: selectedVoice,
    continuous: true
  });

  // Load available voices and check Rasa health
  useEffect(() => {
    fetch(`${API_BASE_URL}/tts/voices`)
      .then(res => res.json())
      .then(data => setAvailableVoices(data.voices || []))
      .catch(console.error);
    
    // Check Rasa health
    checkHealth().then(health => {
      if (health) {
        setRasaHealth(health);
      }
    });
  }, [checkHealth]);

  // Update input when transcript changes (manual mode)
  useEffect(() => {
    if (transcript && !conversationMode) {
      setInput(prev => prev + ' ' + transcript);
    }
  }, [transcript, conversationMode]);

  // Handle voice transcript in conversation mode
  useEffect(() => {
    if (transcript && conversationMode && !isListening) {
      handleSend(transcript);
    }
  }, [transcript, conversationMode, isListening]);

  // Auto-speak AI responses
  useEffect(() => {
    if (autoSpeak && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && !isSpeaking) {
        // Extract plain text from content
        const plainText = lastMessage.content
          .replace(/```[\s\S]*?```/g, '') // Remove code blocks
          .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // Remove images
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/[#*_~`]/g, '') // Remove markdown formatting
          .trim();
        
        if (plainText && plainText.length > 0) {
          // Limit to first 500 chars for long responses
          const textToSpeak = plainText.length > 500 
            ? plainText.substring(0, 500) + '... (response truncated for speech)'
            : plainText;
          speak(textToSpeak);
        }
      }
    }
  }, [messages, autoSpeak, isSpeaking, speak]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (voiceInput?: string) => {
    const userInput = (voiceInput || input).trim();
    if (!userInput && attachments.length === 0) return;

    // Stop any ongoing speech
    if (isSpeaking) {
      stopSpeaking();
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user`,
      content: userInput,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      // First, try Rasa for simple conversational commands
      const rasaMessages = await sendRasaMessage(userInput);
      
      if (rasaMessages && rasaMessages.length > 0 && rasaMessages[0].text) {
        // Process Rasa responses for recognized intents
        rasaMessages.forEach((msg: any, index: number) => {
          const assistantMessage: Message = {
            id: (Date.now() + index + 1).toString(),
            role: 'assistant`,
            content: msg.text || msg.custom?.message || '',
            timestamp: new Date()
          };
          
          if (assistantMessage.content) {
            setMessages(prev => [...prev, assistantMessage]);
          }
        });
      } else {
        // Use Smart Router for intelligent model selection
        const response = await sendSmartMessage(userInput, {
          show_routing: true // Show routing decision in toast
        });
        
        if (response.result) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.result,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMessage]);
          
          // Show model info if routing info available
          if (response.routing_info) {
            const modelUsed = response.model_used?.model || response.routing_info.decision.recommended_model;
            setLastModelUsed(modelUsed);
            console.log('Smart routing used:', {
              model: modelUsed,
              task_type: response.routing_info.decision.task_type,
              confidence: response.routing_info.decision.confidence,
              time_ms: response.routing_info.total_time_ms
            });
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to get response",
        variant: "destructive"
      });
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
      }
    } else {
      console.log('Stopping microphone...');
      stopListening();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Lexos Voice Assistant</h2>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              {conversationMode && (
                <Badge variant="default" className="text-xs">
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
              {rasaHealth.core && (
                <Badge variant="outline" className="text-xs text-green-600">
                  Rasa AI Active
                </Badge>
              )}
              {lastModelUsed && (
                <Badge variant="outline" className="text-xs text-blue-600">
                  Model: {lastModelUsed}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Voice Settings */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <h3 className="font-semibold">Voice Settings</h3>
              
              <div className="space-y-2">
                <Label>Voice</Label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVoices.map(voice => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name} ({voice.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-speak">Auto-speak responses</Label>
                <Switch
                  id="auto-speak"
                  checked={autoSpeak}
                  onCheckedChange={setAutoSpeak}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* HTTPS Status Alert */}
      {window.location.protocol === 'http:' && (
        <div className="px-4 pt-2">
          <HttpsStatus />
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className={`max-w-[80%] ${
                message.role === 'user' ? 'order-1' : ''
              }`}>
                <div className={`rounded-lg p-4 ${
                  message.role === 'user' 
                    ? 'bg-primary/10 border-primary/20' 
                    : 'bg-muted border-border'
                } border`}>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <MultimodalMessageRenderer content={message.content} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                    {message.role === 'assistant' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => speak(message.content)}
                        className="h-6 px-2"
                      >
                        <Volume2 className="w-3 h-3 mr-1" />
                        Replay
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={chatScrollRef} />
        </div>
      </ScrollArea>

      {/* Conversation Mode Banner */}
      {conversationMode && (
        <div className="bg-primary/10 border-t border-primary/20 p-3 flex items-center justify-between">
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

      {/* Input Area */}
      <div className="p-4 border-t border-border/50">
        {/* Quick Actions */}
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
        </div>

        {/* Microphone Test */}
        {showMicTest && (
          <div className="mb-4">
            <MicrophoneTest />
          </div>
        )}

        <div className="flex items-center space-x-2">
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
          
          <Button
            variant={conversationMode ? "default" : "outline"}
            size="icon"
            onClick={toggleConversationMode}
            title={conversationMode ? "End conversation mode" : "Start conversation mode"}
          >
            {conversationMode ? <PhoneOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          </Button>
          
          <Button
            variant={autoSpeak ? "default" : "outline"}
            size="icon"
            onClick={() => setAutoSpeak(!autoSpeak)}
            title={autoSpeak ? "Disable auto-speak" : "Enable auto-speak"}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          
          <Input
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
                : "Type a message or click the mic..."
            }
            className="flex-1"
            disabled={isListening}
          />
          
          <Button 
            onClick={() => handleSend()}
            disabled={loading || (!input.trim() && attachments.length === 0)}
            className="bg-primary hover:bg-primary/90"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        
        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {attachments.map((file, idx) => (
              <Badge key={idx} variant="secondary" className="flex items-center space-x-1">
                <span className="text-xs">{file.name}</span>
                <button
                  onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};