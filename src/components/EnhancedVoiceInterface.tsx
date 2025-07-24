import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Settings, 
  Play, 
  Pause, 
  Square,
  MessageSquare,
  Brain,
  Zap,
  Users,
  Save,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/api';

interface VoiceConfig {
  elevenLabsApiKey: string;
  selectedVoice: string;
  model: string;
  speed: number;
  stability: number;
  clarity: number;
  style: number;
}

interface ConversationMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  voiceId?: string;
  audioUrl?: string;
}

// ElevenLabs default voices
const ELEVENLABS_VOICES = [
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', description: 'Warm and expressive' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', description: 'Deep and authoritative' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Clear and professional' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', description: 'Friendly and approachable' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'Energetic and youthful' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Calm and reassuring' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Sophisticated and elegant' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'Bright and cheerful' }
];

const ELEVENLABS_MODELS = [
  { id: 'eleven_multilingual_v2', name: 'Multilingual v2', description: 'Most lifelike, 29 languages' },
  { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5', description: 'High quality, low latency, 32 languages' },
  { id: 'eleven_turbo_v2', name: 'Turbo v2', description: 'English only, fastest' }
];

export const EnhancedVoiceInterface = () => {
  const [config, setConfig] = useState<VoiceConfig>({
    elevenLabsApiKey: '',
    selectedVoice: '9BWtsMINqrJLrRacOk9x', // Aria default
    model: 'eleven_turbo_v2_5',
    speed: 1.0,
    stability: 0.5,
    clarity: 0.75,
    style: 0.5
  });
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [volume, setVolume] = useState([0.8]);
  const [voiceActivated, setVoiceActivated] = useState(false);
  const [autoResponse, setAutoResponse] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved config
    const savedConfig = localStorage.getItem('lexos-voice-config');
    if (savedConfig) {
      setConfig(prevConfig => ({ ...prevConfig, ...JSON.parse(savedConfig) }));
    }
  }, []);

  const saveConfig = (newConfig: VoiceConfig) => {
    setConfig(newConfig);
    localStorage.setItem('lexos-voice-config', JSON.stringify(newConfig));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processAudioInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      toast({
        title: "Recording Started",
        description: "Speak now... Press stop when finished",
      });
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Unable to access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudioInput = async (audioBlob: Blob) => {
    if (!config.elevenLabsApiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your ElevenLabs API key in settings",
        variant: "destructive",
      });
      return;
    }

    try {
      // Here you would implement speech-to-text using ElevenLabs or another service
      // For now, we'll simulate with a placeholder
      const transcribedText = "Hello, this is a simulated transcription from your voice input.";
      
      const userMessage: ConversationMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: transcribedText,
        timestamp: new Date()
      };

      setConversationHistory(prev => [...prev, userMessage]);

      if (autoResponse) {
        await generateAIResponse(transcribedText);
      }

      toast({
        title: "Voice Processed",
        description: "Your speech has been transcribed",
      });
    } catch (error) {
      toast({
        title: "Processing Error",
        description: "Failed to process audio input",
        variant: "destructive",
      });
    }
  };

  const generateAIResponse = async (inputText: string) => {
    try {
      // Simulate AI response generation
      const responses = [
        "I understand. Let me help you with that.",
        "That's an interesting question. Based on what you've said...",
        "I can assist you with that task. Here's what I recommend...",
        "Let me analyze that information and provide you with a solution.",
        "Great question! I'll walk you through the process step by step."
      ];
      
      const aiResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const assistantMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        voiceId: config.selectedVoice
      };

      setConversationHistory(prev => [...prev, assistantMessage]);
      
      // Generate speech
      await generateSpeech(aiResponse);
      
    } catch (error) {
      toast({
        title: "AI Response Error",
        description: "Failed to generate AI response",
        variant: "destructive",
      });
    }
  };

  const generateSpeech = async (text: string) => {
    try {
      setIsSpeaking(true);
      
      // Use local API for ElevenLabs TTS
      const response = await fetch(`${API_BASE_URL}/tts/elevenlabs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: config.selectedVoice,
          model: config.model,
          stability: config.stability,
          similarity_boost: config.clarity,
          style: config.style,
          use_speaker_boost: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate speech');
      }

      const data = await response.json();
      const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
      audio.volume = volume[0];
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      
      await audio.play();

      toast({
        title: "Speech Generated",
        description: "AI response is now playing",
      });
    } catch (error) {
      setIsSpeaking(false);
      toast({
        title: "Speech Generation Error",
        description: `Failed to generate speech: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const sendTextMessage = async () => {
    if (!currentInput.trim()) return;

    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentInput,
      timestamp: new Date()
    };

    setConversationHistory(prev => [...prev, userMessage]);
    const messageText = currentInput;
    setCurrentInput('');

    if (autoResponse) {
      await generateAIResponse(messageText);
    }
  };

  const clearConversation = () => {
    setConversationHistory([]);
    toast({
      title: "Conversation Cleared",
      description: "Chat history has been reset",
    });
  };

  const exportConversation = () => {
    const data = JSON.stringify(conversationHistory, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Mic className="h-8 w-8 text-primary" />
            Voice Interface
          </h2>
          <p className="text-muted-foreground">AI-powered voice assistant with ElevenLabs integration</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearConversation}>
            Clear Chat
          </Button>
          <Button variant="outline" onClick={exportConversation}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="chat" className="space-y-6">
        <TabsList>
          <TabsTrigger value="chat">Voice Chat</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="voices">Voice Library</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Chat Interface */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Conversation
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={isSpeaking ? "default" : "outline"}>
                        {isSpeaking ? "Speaking" : "Ready"}
                      </Badge>
                      <Badge variant={isRecording ? "destructive" : "outline"}>
                        {isRecording ? "Recording" : "Idle"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Conversation History */}
                  <div className="h-96 overflow-y-auto space-y-3 border rounded-lg p-4">
                    {conversationHistory.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center space-y-2">
                          <MessageSquare className="h-12 w-12 mx-auto opacity-50" />
                          <p>Start a conversation by speaking or typing</p>
                        </div>
                      </div>
                    ) : (
                      conversationHistory.map((message) => (
                        <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-lg ${
                            message.type === 'user' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}>
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Input Controls */}
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your message..."
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
                        className="flex-1"
                      />
                      <Button onClick={sendTextMessage}>
                        Send
                      </Button>
                    </div>
                    <div className="flex justify-center">
                      <Button
                        size="lg"
                        variant={isRecording ? "destructive" : "default"}
                        onClick={isRecording ? stopRecording : startRecording}
                        className="w-20 h-20 rounded-full"
                      >
                        {isRecording ? (
                          <Square className="h-8 w-8" />
                        ) : (
                          <Mic className="h-8 w-8" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Controls Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Quick Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Volume</Label>
                    <div className="flex items-center gap-2">
                      <VolumeX className="h-4 w-4" />
                      <Slider
                        value={volume}
                        onValueChange={setVolume}
                        max={1}
                        min={0}
                        step={0.1}
                        className="flex-1"
                      />
                      <Volume2 className="h-4 w-4" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(volume[0] * 100)}%
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="voice-activated">Voice Activated</Label>
                      <Switch
                        id="voice-activated"
                        checked={voiceActivated}
                        onCheckedChange={setVoiceActivated}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-response">Auto Response</Label>
                      <Switch
                        id="auto-response"
                        checked={autoResponse}
                        onCheckedChange={setAutoResponse}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Current Voice</Label>
                    <div className="text-sm">
                      <p className="font-medium">
                        {ELEVENLABS_VOICES.find(v => v.id === config.selectedVoice)?.name || 'Aria'}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {ELEVENLABS_VOICES.find(v => v.id === config.selectedVoice)?.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Speech Recognition</span>
                    <Badge variant="outline">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Text-to-Speech</span>
                    <Badge variant={config.elevenLabsApiKey ? "default" : "destructive"}>
                      {config.elevenLabsApiKey ? "Ready" : "No API Key"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">AI Response</span>
                    <Badge variant="outline">Connected</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ElevenLabs Configuration</CardTitle>
              <CardDescription>
                Configure your ElevenLabs API key and voice settings for text-to-speech
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="api-key">ElevenLabs API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your ElevenLabs API key..."
                  value={config.elevenLabsApiKey}
                  onChange={(e) => saveConfig({ ...config, elevenLabsApiKey: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Get your API key from <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="underline">ElevenLabs</a>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Voice Model</Label>
                  <Select value={config.model} onValueChange={(value) => saveConfig({ ...config, model: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ELEVENLABS_MODELS.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div>
                            <p className="font-medium">{model.name}</p>
                            <p className="text-xs text-muted-foreground">{model.description}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Voice</Label>
                  <Select value={config.selectedVoice} onValueChange={(value) => saveConfig({ ...config, selectedVoice: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ELEVENLABS_VOICES.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          <div>
                            <p className="font-medium">{voice.name}</p>
                            <p className="text-xs text-muted-foreground">{voice.description}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Stability: {config.stability.toFixed(2)}</Label>
                  <Slider
                    value={[config.stability]}
                    onValueChange={([value]) => saveConfig({ ...config, stability: value })}
                    max={1}
                    min={0}
                    step={0.01}
                  />
                  <p className="text-xs text-muted-foreground">Voice consistency</p>
                </div>

                <div className="space-y-2">
                  <Label>Clarity: {config.clarity.toFixed(2)}</Label>
                  <Slider
                    value={[config.clarity]}
                    onValueChange={([value]) => saveConfig({ ...config, clarity: value })}
                    max={1}
                    min={0}
                    step={0.01}
                  />
                  <p className="text-xs text-muted-foreground">Voice similarity</p>
                </div>

                <div className="space-y-2">
                  <Label>Style: {config.style.toFixed(2)}</Label>
                  <Slider
                    value={[config.style]}
                    onValueChange={([value]) => saveConfig({ ...config, style: value })}
                    max={1}
                    min={0}
                    step={0.01}
                  />
                  <p className="text-xs text-muted-foreground">Expressiveness</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => generateSpeech("Hello! This is a test of your voice settings.")}>
                  <Play className="h-4 w-4 mr-2" />
                  Test Voice
                </Button>
                <Button variant="outline">
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Voice Library
              </CardTitle>
              <CardDescription>
                Choose from available voices for your AI assistant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ELEVENLABS_VOICES.map((voice) => (
                  <Card 
                    key={voice.id} 
                    className={`cursor-pointer transition-all ${
                      config.selectedVoice === voice.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => saveConfig({ ...config, selectedVoice: voice.id })}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{voice.name}</h3>
                          {config.selectedVoice === voice.id && (
                            <Badge>Selected</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{voice.description}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            generateSpeech(`Hi, I'm ${voice.name}. This is how I sound.`);
                          }}
                        >
                          <Play className="h-3 w-3 mr-2" />
                          Preview
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
};