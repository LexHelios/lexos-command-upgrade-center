import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  Download, 
  Eye, 
  Search,
  Brain,
  Zap,
  Trash2,
  FileImage,
  FileVideo,
  Music
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProcessedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  status: 'processing' | 'completed' | 'error';
  extractedText?: string;
  summary?: string;
  insights?: string[];
  tags?: string[];
  url?: string;
}

export const DocumentProcessor = () => {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;

    setIsProcessing(true);
    
    for (const file of Array.from(files)) {
      const doc: ProcessedDocument = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date(),
        status: 'processing',
        url: URL.createObjectURL(file)
      };

      setDocuments(prev => [doc, ...prev]);

      // Simulate processing
      try {
        await processDocument(file, doc.id);
      } catch (error) {
        updateDocumentStatus(doc.id, 'error');
      }
    }
    
    setIsProcessing(false);
  };

  const processDocument = async (file: File, docId: string) => {
    // Simulate AI processing with delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

    const mockExtractedText = generateMockText(file.type);
    const mockSummary = generateMockSummary(file.name);
    const mockInsights = generateMockInsights();
    const mockTags = generateMockTags(file.name);

    setDocuments(prev => prev.map(doc => 
      doc.id === docId 
        ? {
            ...doc,
            status: 'completed' as const,
            extractedText: mockExtractedText,
            summary: mockSummary,
            insights: mockInsights,
            tags: mockTags
          }
        : doc
    ));

    toast({
      title: "Document Processed",
      description: `${file.name} has been analyzed successfully`,
    });
  };

  const updateDocumentStatus = (docId: string, status: ProcessedDocument['status']) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === docId ? { ...doc, status } : doc
    ));
  };

  const generateMockText = (fileType: string): string => {
    const texts = {
      'application/pdf': 'This is extracted text from a PDF document. It contains important information about business processes, financial data, and strategic planning initiatives.',
      'image/': 'This image contains text that has been extracted using OCR technology. The content includes charts, graphs, and textual information.',
      'text/': 'This is a text document containing valuable information that has been processed and analyzed.',
      'default': 'Document content has been extracted and is ready for analysis.'
    };

    for (const [type, text] of Object.entries(texts)) {
      if (fileType.startsWith(type)) return text;
    }
    return texts.default;
  };

  const generateMockSummary = (fileName: string): string => {
    const summaries = [
      `Summary of ${fileName}: This document discusses key business strategies and implementation plans.`,
      `${fileName} contains important financial data and quarterly projections for analysis.`,
      `This document outlines project requirements, timelines, and deliverables for the upcoming initiative.`,
      `${fileName} provides comprehensive analysis of market trends and competitive landscape.`
    ];
    return summaries[Math.floor(Math.random() * summaries.length)];
  };

  const generateMockInsights = (): string[] => {
    const insights = [
      'Key financial metrics show positive growth trend',
      'Project timeline appears aggressive but achievable',
      'Resource allocation may need optimization',
      'Market opportunity identified in Q3-Q4',
      'Risk mitigation strategies recommended',
      'Stakeholder alignment required for next phase'
    ];
    return insights.slice(0, 3 + Math.floor(Math.random() * 3));
  };

  const generateMockTags = (fileName: string): string[] => {
    const allTags = ['business', 'finance', 'project', 'analysis', 'strategy', 'planning', 'data', 'report', 'presentation', 'meeting'];
    return allTags.slice(0, 2 + Math.floor(Math.random() * 3));
  };

  const deleteDocument = (docId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
    toast({
      title: "Document Deleted",
      description: "Document has been removed from your library",
    });
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <FileImage className="h-6 w-6" />;
    if (type.startsWith('video/')) return <FileVideo className="h-6 w-6" />;
    if (type.startsWith('audio/')) return <Music className="h-6 w-6" />;
    if (type.includes('pdf')) return <FileText className="h-6 w-6" />;
    return <File className="h-6 w-6" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    doc.extractedText?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: documents.length,
    processed: documents.filter(d => d.status === 'completed').length,
    processing: documents.filter(d => d.status === 'processing').length,
    totalSize: documents.reduce((sum, doc) => sum + doc.size, 0)
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Document Processor
          </h2>
          <p className="text-muted-foreground">AI-powered document analysis and text extraction</p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Documents
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.processed}</p>
                <p className="text-sm text-muted-foreground">Processed</p>
              </div>
              <Brain className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.processing}</p>
                <p className="text-sm text-muted-foreground">Processing</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</p>
                <p className="text-sm text-muted-foreground">Total Size</p>
              </div>
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents, content, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Documents Grid */}
      <div className="grid gap-4">
        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No documents yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload your first document to start AI-powered analysis
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Documents
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredDocuments.map((doc) => (
            <Card key={doc.id} className="animate-fade-in">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIcon(doc.type)}
                    <div>
                      <CardTitle className="text-lg">{doc.name}</CardTitle>
                      <CardDescription>
                        {formatFileSize(doc.size)} • {doc.uploadedAt.toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(doc.status)}>
                      {doc.status}
                    </Badge>
                    {doc.status !== 'processing' && (
                      <Button variant="ghost" size="sm" onClick={() => deleteDocument(doc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {doc.status === 'processing' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Processing document...</span>
                      <span className="text-muted-foreground">AI Analysis in progress</span>
                    </div>
                    <Progress value={65} className="w-full" />
                  </div>
                )}

                {doc.status === 'completed' && (
                  <Tabs defaultValue="summary" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                      <TabsTrigger value="insights">Insights</TabsTrigger>
                      <TabsTrigger value="content">Content</TabsTrigger>
                      <TabsTrigger value="tags">Tags</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="summary" className="mt-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">AI Summary</h4>
                        <p className="text-sm text-muted-foreground">{doc.summary}</p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="insights" className="mt-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Key Insights</h4>
                        <ul className="space-y-1">
                          {doc.insights?.map((insight, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="content" className="mt-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Extracted Text</h4>
                        <div className="bg-muted p-3 rounded-lg text-sm">
                          {doc.extractedText}
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="tags" className="mt-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Auto-Generated Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {doc.tags?.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                )}

                {doc.status === 'error' && (
                  <div className="text-center py-4">
                    <p className="text-sm text-destructive">
                      Failed to process document. Please try uploading again.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
      />
    </div>
  );
};