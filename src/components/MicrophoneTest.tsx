import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, CheckCircle, XCircle } from 'lucide-react';

export const MicrophoneTest = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string>('');
  
  const testMicrophone = async () => {
    try {
      console.log('Testing microphone access...');
      setError('');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      console.log('Microphone access granted!');
      setHasPermission(true);
      
      // Create audio context to monitor levels
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
      
      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;
      
      microphone.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);
      
      scriptProcessor.onaudioprocess = () => {
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        const arraySum = array.reduce((a, value) => a + value, 0);
        const average = arraySum / array.length;
        setAudioLevel(Math.round(average));
      };
      
      setIsRecording(true);
      
      // Stop after 5 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        scriptProcessor.disconnect();
        microphone.disconnect();
        analyser.disconnect();
        audioContext.close();
        setIsRecording(false);
        setAudioLevel(0);
      }, 5000);
      
    } catch (err: any) {
      console.error('Microphone error:', err);
      setHasPermission(false);
      setError(err.message || 'Failed to access microphone');
    }
  };
  
  return (
    <Card className="p-6 max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">Microphone Test</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span>HTTPS:</span>
          <div className="flex items-center space-x-2">
            {window.location.protocol === 'https:' ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-600">Enabled</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-600">Disabled</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Microphone Access:</span>
          <div className="flex items-center space-x-2">
            {hasPermission === null ? (
              <span className="text-muted-foreground">Not tested</span>
            ) : hasPermission ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-600">Granted</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-600">Denied</span>
              </>
            )}
          </div>
        </div>
        
        {isRecording && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Audio Level:</span>
              <span>{audioLevel}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-100"
                style={{ width: `${Math.min(audioLevel, 100)}%` }}
              />
            </div>
          </div>
        )}
        
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
        
        <Button
          onClick={testMicrophone}
          disabled={isRecording}
          className="w-full"
          variant={isRecording ? "destructive" : "default"}
        >
          {isRecording ? (
            <>
              <MicOff className="w-4 h-4 mr-2" />
              Recording... (5s)
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 mr-2" />
              Test Microphone
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};