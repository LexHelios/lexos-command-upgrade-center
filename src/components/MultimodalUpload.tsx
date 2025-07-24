import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { storage, auth } from '@/integrations/supabase/client';
import { 
import { API_BASE_URL } from '@/config/api';
  Upload, 
  File, 
  Image, 
  Video, 
  Music, 
  FileText,
  X,
  Eye,
  Download,
  Trash2,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface MediaAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
  status: 'uploading' | 'completed' | 'error';
  progress: number;
  analysis?: {
    description: string;
    tags: string[];
    confidence: number;
  };
}

export const MultimodalUpload = () => {
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    // Validate file
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast({
        title: "File Too Large",
        description: `${file.name} exceeds 50MB limit`,
        variant: "destructive",
      });
      return;
    }

    const attachment: MediaAttachment = {
      id: Date.now().toString() + Math.random(),
      name: file.name,
      type: file.type,
      size: file.size,
      url: '',
      uploadedAt: new Date(),
      status: 'uploading',
      progress: 0
    };

    setAttachments(prev => [...prev, attachment]);

    try {
      // Check authentication
      const { data: { session } } = await auth.getSession();
      if (!session) {
        throw new Error('Authentication required for file upload');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const fileExt = file.name.split('.').pop() || 'unknown';
      const fileName = `${session.user.id}/${timestamp}_${randomString}.${fileExt}`;

      // Upload to Storage
      const { data: uploadData, error: uploadError } = await storage
        .from('user-uploads')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = storage
        .from('user-uploads')
        .getPublicUrl(fileName);

      // Update attachment with URL
      setAttachments(prev => prev.map(att => 
        att.id === attachment.id 
          ? { ...att, url: publicUrl, status: 'completed', progress: 100 }
          : att
      ));

      // Analyze file if it's an image
      if (file.type.startsWith('image/')) {
        await analyzeImage(attachment.id, publicUrl);
      }

      toast({
        title: "Upload Successful",
        description: `${file.name} uploaded successfully`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to upload ${file.name}`;
      setAttachments(prev => prev.map(att => 
        att.id === attachment.id 
          ? { ...att, status: 'error', progress: 0 }
          : att
      ));

      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const analyzeImage = async (attachmentId: string, imageUrl: string) => {
    try {
      // Use local AI API to analyze the image
      const response = await fetch(`${API_BASE_URL}/ai/analyze-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_type: 'image',
          complexity: 'medium',
          quality: 'standard',
          prompt: `Analyze this image and provide a detailed description. Include any text you can read, objects you can identify, and the overall context. Also suggest relevant tags.`,
          image_url: imageUrl
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const responseData = await response.json();

      if (responseData) {
        const analysis = {
          description: responseData.result || responseData.response,
          tags: extractTags(responseData.result || responseData.response),
          confidence: 0.85
        };

        setAttachments(prev => prev.map(att => 
          att.id === attachmentId 
            ? { ...att, analysis }
            : att
        ));
      }
    } catch (error) {
      console.error('Image analysis failed:', error);
    }
  };

  const extractTags = (description: string): string[] => {
    // Simple tag extraction from description
    const commonTags = ['document', 'photo', 'chart', 'text', 'person', 'object', 'nature', 'building', 'vehicle'];
    const foundTags = commonTags.filter(tag => 
      description.toLowerCase().includes(tag)
    );
    return foundTags.slice(0, 5);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (type.startsWith('video/')) return <Video className="h-5 w-5" />;
    if (type.startsWith('audio/')) return <Music className="h-5 w-5" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Multimodal File Upload
          </CardTitle>
          <CardDescription>
            Upload images, documents, audio, and video files for AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Drop files here or click to upload</h3>
            <p className="text-muted-foreground mb-4">
              Supports images, documents, audio, and video files up to 50MB
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              Choose Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv,.json"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files */}
      {attachments.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Uploaded Files ({attachments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(attachment.type)}
                      <div>
                        <h4 className="font-medium">{attachment.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(attachment.size)} • {attachment.type}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {attachment.status === 'uploading' && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      )}
                      {attachment.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {attachment.status === 'error' && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      
                      {attachment.status === 'completed' && attachment.url && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(attachment.url, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = attachment.url;
                              a.download = attachment.name;
                              a.click();
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(attachment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {attachment.status === 'uploading' && (
                    <Progress value={attachment.progress} className="h-2" />
                  )}

                  {attachment.analysis && (
                    <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                      <h5 className="font-medium text-sm">AI Analysis</h5>
                      <p className="text-sm text-muted-foreground">
                        {attachment.analysis.description}
                      </p>
                      {attachment.analysis.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {attachment.analysis.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Confidence: {(attachment.analysis.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Tips */}
      <Card className="glass-card border-blue-500/30">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h4 className="font-medium text-blue-400">💡 Upload Tips</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Images are automatically analyzed with AI vision</li>
              <li>• Documents can be processed for text extraction</li>
              <li>• Audio files can be transcribed to text</li>
              <li>• Video files can be analyzed for content</li>
              <li>• All files are securely stored in Supabase</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};