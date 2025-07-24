import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { API_ENDPOINTS } from '@/config/api';

interface VoiceConversationOptions {
  autoSpeak?: boolean;
  voice?: string;
  continuous?: boolean;
  language?: string;
}

export const useVoiceConversation = (options: VoiceConversationOptions = {}) => {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversationMode, setConversationMode] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check for Web Speech API support
  useEffect(() => {
    const hasSpeechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    const hasMediaRecorder = 'MediaRecorder' in window;
    setIsSupported(hasSpeechRecognition || hasMediaRecorder);
    
    if (!hasSpeechRecognition && !hasMediaRecorder) {
      toast({
        title: "Voice Not Supported",
        description: "Your browser doesn't support voice recognition. Please use text input.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Initialize Web Speech API for continuous listening (fallback)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window && isSupported) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.language = options.language || 'en-US';
      
      recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript;
        
        if (event.results[last].isFinal) {
          setTranscript(transcript);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'no-speech') {
          toast({
            title: "No Speech Detected",
            description: "Please speak clearly and try again.",
            variant: "destructive"
          });
        } else if (event.error === 'not-allowed') {
          toast({
            title: "Microphone Access Denied",
            description: "Please allow microphone access to use voice features.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Voice Recognition Error",
            description: `Error: ${event.error}`,
            variant: "destructive"
          });
        }
        
        // Restart recognition in continuous mode
        if (conversationMode && isListening) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {
              console.error('Failed to restart recognition:', e);
            }
          }, 1000);
        }
      };
      
      recognition.onend = () => {
        if (conversationMode && isListening) {
          // Restart in continuous mode
          setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {
              console.error('Failed to restart recognition:', e);
            }
          }, 100);
        }
      };
      
      recognitionRef.current = recognition;
    }
  }, [conversationMode, isListening, options.language, isSupported, toast]);

  // Start recording with MediaRecorder API
  const startListening = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Voice Not Supported",
        description: "Your browser doesn't support voice recording.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Try to get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;
      
      // Try MediaRecorder first (better quality)
      if ('MediaRecorder' in window) {
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
        
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorder.onstop = async () => {
          console.log('MediaRecorder stopped, chunks collected:', audioChunksRef.current.length);
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          console.log('Audio blob created, size:', audioBlob.size);
          
          if (audioBlob.size > 0) {
            try {
              const transcript = await transcribeAudio(audioBlob);
              console.log('Transcription result:', transcript);
              setTranscript(transcript);
            } catch (error) {
              console.error('Transcription failed:', error);
              toast({
                title: "Transcription Failed",
                description: "Could not transcribe audio. Please try again.",
                variant: "destructive"
              });
            }
          } else {
            console.error('Audio blob is empty!');
            toast({
              title: "Recording Error",
              description: "No audio was recorded. Please try again.",
              variant: "destructive"
            });
          }
          
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start(1000); // Collect data every second
        setIsListening(true);
        toast({
          title: "Listening",
          description: "Speak now...",
        });
        
        // Stop after 10 seconds
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            setIsListening(false);
          }
        }, 10000);
        
      } else {
        // Fallback to Web Speech API
        if (recognitionRef.current) {
          recognitionRef.current.start();
          setIsListening(true);
          toast({
            title: "Listening",
            description: "Speak now...",
          });
        }
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  }, [isSupported, toast]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setIsListening(false);
  }, []);

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
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
      console.error('Transcription error:', error);
      throw error;
    }
  };

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    setIsSpeaking(true);
    try {
      const response = await fetch(API_ENDPOINTS.tts.generate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: options.voice || 'alloy',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const data = await response.json();
      
      // Check if server wants us to use browser TTS
      if (data.use_browser_tts) {
        console.log('Using browser Speech Synthesis API');
        
        // Use browser's built-in Speech Synthesis API
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.voice = speechSynthesis.getVoices().find(v => 
            v.name.toLowerCase().includes(options.voice || 'default')
          ) || speechSynthesis.getVoices()[0];
          
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => {
            setIsSpeaking(false);
            console.error('Browser TTS error');
          };
          
          speechSynthesis.speak(utterance);
          return;
        } else {
          throw new Error('Browser TTS not supported');
        }
      }
      
      // Handle server-generated audio
      if (data.audio) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
        
        audioRef.current = new Audio(data.audio);
        audioRef.current.onended = () => setIsSpeaking(false);
        await audioRef.current.play();
      } else {
        throw new Error('No audio data received');
      }
      
    } catch (error) {
      console.error('Speech generation error:', error);
      
      // Ultimate fallback to browser TTS
      if ('speechSynthesis' in window) {
        console.log('Falling back to browser Speech Synthesis API');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
        toast({
          title: "Speech Error",
          description: "Speech synthesis not available.",
          variant: "destructive"
        });
      }
    }
  }, [options.voice, toast]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setIsSpeaking(false);
  }, []);

  const toggleConversationMode = useCallback(() => {
    setConversationMode(prev => !prev);
    if (isListening) {
      stopListening();
    }
  }, [isListening, stopListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    conversationMode,
    isSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleConversationMode,
    clearTranscript,
  };
};