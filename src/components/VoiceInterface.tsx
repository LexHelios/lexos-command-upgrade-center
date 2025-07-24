import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Square, 
  Settings,
  MessageSquare,
  Bot,
  Users,
  Zap,
  Brain,
  Headphones,
  Speaker,
  Phone,
  PhoneOff
} from 'lucide-react';

// ElevenLabs API configuration - API key removed for security
// Use the EnhancedVoiceInterface component instead which handles API keys securely
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Available voices with their ElevenLabs voice IDs
const AVAILABLE_VOICES = [
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', description: 'Warm, friendly female voice' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', description: 'Professional male voice' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Clear, articulate female voice' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', description: 'Smooth, confident female voice' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'Young, energetic male voice' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Deep, authoritative male voice' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Elegant, sophisticated female voice' }
];

export const VoiceInterface = () => {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(AVAILABLE_VOICES[0].id);
  const [textToSpeak, setTextToSpeak] = useState('Hello! I am your AI assistant. How can I help you today?');
  const [volume, setVolume] = useState([0.8]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationLog, setConversationLog] = useState<Array<{
    id: string;
    type: 'user' | 'assistant';
    text: string;
    timestamp: Date;
    audioUrl?: string;
  }>>([]);

  // Text-to-Speech using ElevenLabs API - DISABLED FOR SECURITY
  const generateSpeech = async (text: string, voiceId: string = selectedVoice) => {
    try {
      setIsGenerating(true);
      
      toast({
        title: "Security Notice",
        description: "ElevenLabs integration has been disabled for security. Use the EnhancedVoiceInterface component which handles API keys securely through user input.",
        variant: "default"
      });
      
      return null;
    } catch (error) {
      console.error('Error generating speech:', error);
      toast({
        title: "Speech Generation Failed",
        description: "Unable to generate speech. Please use the secure voice interface.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlaySpeech = async () => {
    if (!textToSpeak.trim()) return;

    const audioUrl = await generateSpeech(textToSpeak);
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.volume = volume[0];
      
      try {
        setIsPlaying(true);
        await audioRef.current.play();
        
        // Add to conversation log
        const newEntry = {
          id: Date.now().toString(),
          type: 'assistant' as const,
          text: textToSpeak,
          timestamp: new Date(),
          audioUrl
        };
        setConversationLog(prev => [...prev, newEntry]);
        
        toast({
          title: "Playing Speech",
          description: `Voice: ${AVAILABLE_VOICES.find(v => v.id === selectedVoice)?.name}`,
        });
      } catch (error) {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
      }
    }
  };

  const handleStopSpeech = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleStartListening = () => {
    setIsListening(true);
    toast({
      title: "Voice Recognition",
      description: "Listening for speech input...",
    });
  };

  const handleStopListening = () => {
    setIsListening(false);
  };

  const toggleConnection = () => {
    setIsConnected(!isConnected);
    toast({
      title: isConnected ? "Disconnected" : "Connected",
      description: isConnected ? "ElevenLabs API disconnected" : "ElevenLabs API connected successfully",
    });
  };

  const selectedVoiceData = AVAILABLE_VOICES.find(v => v.id === selectedVoice);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onvolumechange = () => {
        if (audioRef.current) {
          setVolume([audioRef.current.volume]);
        }
      };
    }
    // Auto-connect on mount
    setIsConnected(true);
  }, []);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Voice Interface</h1>
            <p className="text-muted-foreground">ElevenLabs AI Voice Integration</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={isConnected ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
              <Headphones className="w-3 h-3 mr-1" />
              {isConnected ? 'ElevenLabs Connected' : 'Disconnected'}
            </Badge>
            <Button
              onClick={toggleConnection}
              variant={isConnected ? "destructive" : "default"}
              size="sm"
              className={isConnected ? "" : "bg-lexos-blue hover:bg-lexos-blue/80"}
            >
              {isConnected ? <PhoneOff className="w-4 h-4 mr-2" /> : <Phone className="w-4 h-4 mr-2" />}
              {isConnected ? 'Disconnect' : 'Connect'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Main Voice Controls */}
        <div className="flex-1 p-6 space-y-6">
          {/* Voice Configuration */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Speaker className="w-5 h-5 mr-2" />
                Voice Configuration
              </CardTitle>
              <CardDescription>Choose voice and customize speech settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Voice Selection</label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_VOICES.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{voice.name}</span>
                          <span className="text-xs text-muted-foreground">{voice.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Volume: {Math.round(volume[0] * 100)}%</label>
                <Slider
                  value={volume}
                  onValueChange={setVolume}
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Text to Speak</label>
                <Input
                  value={textToSpeak}
                  onChange={(e) => setTextToSpeak(e.target.value)}
                  placeholder="Enter text to convert to speech..."
                  className="mb-3"
                />
              </div>

              <div className="flex space-x-2">
                <Button 
                  onClick={handlePlaySpeech}
                  disabled={isGenerating || isPlaying || !textToSpeak.trim() || !isConnected}
                  className="flex-1 bg-lexos-blue hover:bg-lexos-blue/80"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Play Speech
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleStopSpeech}
                  disabled={!isPlaying}
                  variant="outline"
                >
                  <Square className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Voice Control Panel */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mic className="w-5 h-5 mr-2" />
                Voice Control
              </CardTitle>
              <CardDescription>Real-time voice interaction</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-6">
                <Button
                  size="lg"
                  disabled={!isConnected}
                  className={`w-24 h-24 rounded-full ${
                    isListening 
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                      : 'bg-lexos-blue hover:bg-lexos-blue/80'
                  }`}
                  onClick={isListening ? handleStopListening : handleStartListening}
                >
                  {isListening ? (
                    <MicOff className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </Button>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {!isConnected ? 'Connect to start voice input' : isListening ? 'Listening...' : 'Click to start voice input'}
                </p>
                <Badge className={isListening ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}>
                  {selectedVoiceData?.name} Ready
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* AI Agents Panel */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="w-5 h-5 mr-2" />
                AI Voice Agents
              </CardTitle>
              <CardDescription>Choose specialized AI personalities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <Button variant="outline" className="h-20 flex flex-col">
                  <Brain className="w-6 h-6 mb-2 text-lexos-blue" />
                  <span className="text-xs">Technical Expert</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <MessageSquare className="w-6 h-6 mb-2 text-green-400" />
                  <span className="text-xs">Creative Writer</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <Users className="w-6 h-6 mb-2 text-purple-400" />
                  <span className="text-xs">Assistant</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversation History */}
        <div className="w-80 border-l border-border/50 p-4">
          <h3 className="text-lg font-semibold mb-4">Conversation Log</h3>
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {conversationLog.map((entry) => (
                <Card key={entry.id} className="glass">
                  <CardContent className="p-3">
                    <div className="flex items-start space-x-2 mb-2">
                      {entry.type === 'user' ? (
                        <Mic className="w-4 h-4 text-blue-400 mt-1" />
                      ) : (
                        <Bot className="w-4 h-4 text-lexos-blue mt-1" />
                      )}
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">
                          {entry.type === 'user' ? 'You' : selectedVoiceData?.name} • {entry.timestamp.toLocaleTimeString()}
                        </div>
                        <p className="text-sm">{entry.text}</p>
                        {entry.audioUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-2 h-6 text-xs"
                            onClick={() => {
                              if (audioRef.current) {
                                audioRef.current.src = entry.audioUrl!;
                                audioRef.current.play();
                              }
                            }}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Replay
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};