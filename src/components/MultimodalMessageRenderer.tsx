import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Image as ImageIcon, 
  Video, 
  FileText, 
  Download, 
  Maximize2, 
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  BarChart,
  GitBranch,
  Code
} from 'lucide-react';
import mermaid from 'mermaid';
import { Chart, registerables } from 'chart.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

Chart.register(...registerables);

interface ContentBlock {
  type: 'text' | 'image' | 'video' | 'audio' | 'code' | 'mermaid' | 'chart' | 'tree' | 'table';
  content: string;
  metadata?: {
    alt?: string;
    title?: string;
    language?: string;
    chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' | 'scatter';
    chartData?: any;
    mimeType?: string;
    width?: number;
    height?: number;
    caption?: string;
  };
}

interface MultimodalMessageRendererProps {
  content: string;
  contentBlocks?: ContentBlock[];
}

export const MultimodalMessageRenderer: React.FC<MultimodalMessageRendererProps> = ({ 
  content, 
  contentBlocks 
}) => {
  const [parsedBlocks, setParsedBlocks] = useState<ContentBlock[]>([]);
  const [fullscreenMedia, setFullscreenMedia] = useState<{type: string; src: string; title?: string} | null>(null);
  const [videoStates, setVideoStates] = useState<{[key: string]: {playing: boolean; muted: boolean}}>({});

  useEffect(() => {
    // Initialize mermaid
    mermaid.initialize({ 
      theme: 'dark',
      themeVariables: {
        primaryColor: '#6366f1',
        primaryTextColor: '#fff',
        primaryBorderColor: '#4f46e5',
        lineColor: '#e5e7eb',
        secondaryColor: '#8b5cf6',
        tertiaryColor: '#ec4899',
        background: '#1f2937',
        mainBkg: '#111827',
        secondBkg: '#1f2937',
        tertiaryBkg: '#374151',
        secondaryBorderColor: '#7c3aed',
        tertiaryBorderColor: '#db2777',
        textColor: '#e5e7eb',
        taskTextColor: '#fff',
        altBackground: '#374151',
        nodeTextColor: '#e5e7eb'
      }
    });

    // Parse content if no blocks provided
    if (!contentBlocks) {
      const blocks = parseMultimodalContent(content);
      setParsedBlocks(blocks);
    } else {
      setParsedBlocks(contentBlocks);
    }
  }, [content, contentBlocks]);

  const parseMultimodalContent = (text: string): ContentBlock[] => {
    const blocks: ContentBlock[] = [];
    
    // Parse markdown-style image tags
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;
    
    while ((match = imageRegex.exec(text)) !== null) {
      // Add text before image
      if (match.index > lastIndex) {
        blocks.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }
      
      // Add image
      blocks.push({
        type: 'image',
        content: match[2],
        metadata: { alt: match[1], caption: match[1] }
      });
      
      lastIndex = imageRegex.lastIndex;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      
      // Check for code blocks
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
      let codeLastIndex = 0;
      let codeMatch;
      
      while ((codeMatch = codeBlockRegex.exec(remainingText)) !== null) {
        // Add text before code
        if (codeMatch.index > codeLastIndex) {
          blocks.push({
            type: 'text',
            content: remainingText.slice(codeLastIndex, codeMatch.index)
          });
        }
        
        const language = codeMatch[1] || 'plaintext';
        const codeContent = codeMatch[2];
        
        // Check if it's a mermaid diagram
        if (language === 'mermaid') {
          blocks.push({
            type: 'mermaid',
            content: codeContent,
            metadata: { language }
          });
        } else if (language === 'chart' || language === 'json-chart') {
          // Parse chart data
          try {
            const chartData = JSON.parse(codeContent);
            blocks.push({
              type: 'chart',
              content: codeContent,
              metadata: { 
                chartType: chartData.type || 'line',
                chartData: chartData
              }
            });
          } catch {
            blocks.push({
              type: 'code',
              content: codeContent,
              metadata: { language }
            });
          }
        } else {
          blocks.push({
            type: 'code',
            content: codeContent,
            metadata: { language }
          });
        }
        
        codeLastIndex = codeBlockRegex.lastIndex;
      }
      
      // Add final text
      if (codeLastIndex < remainingText.length) {
        blocks.push({
          type: 'text',
          content: remainingText.slice(codeLastIndex)
        });
      }
    }
    
    return blocks.filter(block => block.content.trim() !== '');
  };

  const renderMermaidDiagram = (block: ContentBlock, index: number) => {
    useEffect(() => {
      const element = document.getElementById(`mermaid-${index}`);
      if (element && block.content) {
        mermaid.render(`mermaid-svg-${index}`, block.content).then(({ svg }) => {
          element.innerHTML = svg;
        }).catch(err => {
          console.error('Mermaid rendering error:', err);
          element.innerHTML = `<pre>${block.content}</pre>`;
        });
      }
    }, [block.content]);

    return (
      <Card className="p-4 bg-secondary/10 border-secondary/30">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">
            <GitBranch className="h-3 w-3 mr-1" />
            Diagram
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFullscreenMedia({
              type: 'mermaid',
              src: block.content,
              title: 'Diagram View'
            })}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        <div id={`mermaid-${index}`} className="mermaid-container" />
      </Card>
    );
  };

  const renderChart = (block: ContentBlock, index: number) => {
    useEffect(() => {
      const canvas = document.getElementById(`chart-${index}`) as HTMLCanvasElement;
      if (canvas && block.metadata?.chartData) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          new Chart(ctx, block.metadata.chartData);
        }
      }
    }, [block.metadata]);

    return (
      <Card className="p-4 bg-secondary/10 border-secondary/30">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">
            <BarChart className="h-3 w-3 mr-1" />
            {block.metadata?.chartType || 'Chart'}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFullscreenMedia({
              type: 'chart',
              src: block.content,
              title: 'Chart View'
            })}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        <canvas id={`chart-${index}`} width="400" height="200" />
      </Card>
    );
  };

  const renderImage = (block: ContentBlock) => {
    return (
      <Card className="p-2 bg-secondary/10 border-secondary/30 overflow-hidden">
        <div className="relative group">
          <img 
            src={block.content} 
            alt={block.metadata?.alt || 'AI Generated Image'}
            className="w-full h-auto rounded-lg cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => setFullscreenMedia({
              type: 'image',
              src: block.content,
              title: block.metadata?.caption || block.metadata?.alt
            })}
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="h-8 w-8 text-white" />
          </div>
        </div>
        {block.metadata?.caption && (
          <p className="text-sm text-muted-foreground mt-2 text-center">
            {block.metadata.caption}
          </p>
        )}
      </Card>
    );
  };

  const renderVideo = (block: ContentBlock, index: number) => {
    const videoId = `video-${index}`;
    const state = videoStates[videoId] || { playing: false, muted: false };

    const togglePlay = () => {
      const video = document.getElementById(videoId) as HTMLVideoElement;
      if (video) {
        if (state.playing) {
          video.pause();
        } else {
          video.play();
        }
        setVideoStates(prev => ({
          ...prev,
          [videoId]: { ...state, playing: !state.playing }
        }));
      }
    };

    const toggleMute = () => {
      const video = document.getElementById(videoId) as HTMLVideoElement;
      if (video) {
        video.muted = !video.muted;
        setVideoStates(prev => ({
          ...prev,
          [videoId]: { ...state, muted: !state.muted }
        }));
      }
    };

    return (
      <Card className="p-2 bg-secondary/10 border-secondary/30 overflow-hidden">
        <div className="relative group">
          <video 
            id={videoId}
            src={block.content}
            className="w-full h-auto rounded-lg"
            controls={false}
            loop
            muted={state.muted}
          />
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/70 rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                className="h-8 w-8 p-0 text-white hover:text-white"
              >
                {state.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="h-8 w-8 p-0 text-white hover:text-white"
              >
                {state.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFullscreenMedia({
                type: 'video',
                src: block.content,
                title: block.metadata?.caption
              })}
              className="h-8 w-8 p-0 text-white hover:text-white"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {block.metadata?.caption && (
          <p className="text-sm text-muted-foreground mt-2 text-center">
            {block.metadata.caption}
          </p>
        )}
      </Card>
    );
  };

  const renderCode = (block: ContentBlock) => {
    return (
      <Card className="p-4 bg-secondary/10 border-secondary/30">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">
            <Code className="h-3 w-3 mr-1" />
            {block.metadata?.language || 'code'}
          </Badge>
        </div>
        <pre className="overflow-x-auto">
          <code className={`language-${block.metadata?.language || 'plaintext'}`}>
            {block.content}
          </code>
        </pre>
      </Card>
    );
  };

  const renderBlock = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case 'text':
        return (
          <div key={index} className="whitespace-pre-wrap">
            {block.content}
          </div>
        );
      case 'image':
        return <div key={index} className="my-4">{renderImage(block)}</div>;
      case 'video':
        return <div key={index} className="my-4">{renderVideo(block, index)}</div>;
      case 'mermaid':
        return <div key={index} className="my-4">{renderMermaidDiagram(block, index)}</div>;
      case 'chart':
        return <div key={index} className="my-4">{renderChart(block, index)}</div>;
      case 'code':
        return <div key={index} className="my-4">{renderCode(block)}</div>;
      default:
        return <div key={index}>{block.content}</div>;
    }
  };

  return (
    <>
      <div className="space-y-2">
        {parsedBlocks.map((block, index) => renderBlock(block, index))}
      </div>

      {/* Fullscreen Media Dialog */}
      <Dialog open={!!fullscreenMedia} onOpenChange={() => setFullscreenMedia(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{fullscreenMedia?.title || 'Media View'}</DialogTitle>
          </DialogHeader>
          <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
            {fullscreenMedia?.type === 'image' && (
              <img 
                src={fullscreenMedia.src} 
                alt={fullscreenMedia.title || 'Fullscreen view'}
                className="w-full h-auto"
              />
            )}
            {fullscreenMedia?.type === 'video' && (
              <video 
                src={fullscreenMedia.src}
                controls
                autoPlay
                className="w-full h-auto"
              />
            )}
            {fullscreenMedia?.type === 'mermaid' && (
              <div id="fullscreen-mermaid" className="flex justify-center" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};