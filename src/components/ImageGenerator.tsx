import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { API_ENDPOINTS } from '@/config/api';
import { 
  Sparkles, 
  Zap, 
  Palette, 
  Download,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const ImageGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [model, setModel] = useState('sdxl-lightning');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const models = [
    { id: 'sdxl-lightning', name: 'SDXL Lightning', icon: Zap, desc: '4-step ultra fast' },
    { id: 'hidream-i1', name: 'HiDream-I1', icon: Sparkles, desc: 'Highest quality' },
    { id: 'sd3.5-large', name: 'SD 3.5 Large', icon: Palette, desc: 'Max customization' }
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setGenerating(true);
    setError(null);
    
    try {
      const response = await fetch(API_ENDPOINTS.image.generate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          negative_prompt: negativePrompt,
          model,
          width: 1024,
          height: 1024
        })
      });
      
      if (!response.ok) throw new Error('Generation failed');
      
      const data = await response.json();
      if (data.success && data.image) {
        setGeneratedImage(data.image);
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      // Set a placeholder for demo
      setGeneratedImage('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iIzFhMWExYSIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5HZW5lcmF0aW5nLi4uPC90ZXh0Pgo8L3N2Zz4=');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">AI Image Generation</h1>
          <p className="text-muted-foreground">Create stunning images with our H100-powered models</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <Card className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Prompt</label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A majestic cybernetic sentinel standing guard in a neon-lit futuristic city..."
                className="mt-1 min-h-[100px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Negative Prompt (optional)</label>
              <Input
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="blurry, low quality, distorted"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Model</label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center space-x-2">
                        <m.icon className="w-4 h-4" />
                        <span>{m.name}</span>
                        <span className="text-xs text-muted-foreground">({m.desc})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="w-full"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Image
                </>
              )}
            </Button>

            {error && (
              <div className="text-sm text-destructive">
                {error}
              </div>
            )}
          </Card>

          {/* Output Panel */}
          <Card className="p-6">
            {generatedImage ? (
              <div className="space-y-4">
                <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                  <img 
                    src={generatedImage} 
                    alt="Generated" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <Badge variant="secondary">
                    Generated with {models.find(m => m.id === model)?.name}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = generatedImage;
                      a.download = `lexos-${Date.now()}.png`;
                      a.click();
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ) : (
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center space-y-3">
                  <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">Your generated image will appear here</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• SDXL Lightning: 4 steps, ~2 seconds</p>
                    <p>• HiDream-I1: 50 steps, highest quality</p>
                    <p>• SD 3.5: Full control & customization</p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Model Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-green-600">
                GPU: H100 80GB Active
              </Badge>
              <Badge variant="outline">
                Models Loading...
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              ComfyUI workflows coming soon
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};