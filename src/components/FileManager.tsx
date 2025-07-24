import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  FolderOpen, 
  File, 
  Upload, 
  Download, 
  Search,
  Image,
  FileText,
  FileAudio,
  FileVideo,
  Archive,
  Brain,
  Eye,
  Share,
  Trash2,
  Star,
  Clock,
  Filter,
  Grid,
  List,
  MoreVertical,
  Play,
  Pause
} from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  size?: number;
  mimeType?: string;
  lastModified: Date;
  aiProcessed?: boolean;
  aiTags?: string[];
  starred?: boolean;
  thumbnail?: string;
  processing?: boolean;
  confidence?: number;
}

const mockFiles: FileItem[] = [
  {
    id: '1',
    name: 'AI Training Data',
    type: 'folder',
    lastModified: new Date(Date.now() - 86400000),
    aiProcessed: true
  },
  {
    id: '2',
    name: 'presentation.pdf',
    type: 'file',
    size: 2048000,
    mimeType: 'application/pdf',
    lastModified: new Date(Date.now() - 3600000),
    aiProcessed: true,
    aiTags: ['document', 'business', 'quarterly-report'],
    starred: true,
    confidence: 94.2
  },
  {
    id: '3',
    name: 'meeting-recording.mp4',
    type: 'file',
    size: 156000000,
    mimeType: 'video/mp4',
    lastModified: new Date(Date.now() - 7200000),
    processing: true,
    aiTags: ['video', 'meeting', 'transcription-pending']
  },
  {
    id: '4',
    name: 'project-images',
    type: 'folder',
    lastModified: new Date(Date.now() - 172800000),
    aiProcessed: true
  },
  {
    id: '5',
    name: 'analysis.jpg',
    type: 'file',
    size: 1024000,
    mimeType: 'image/jpeg',
    lastModified: new Date(Date.now() - 900000),
    aiProcessed: true,
    aiTags: ['chart', 'data-visualization', 'analytics'],
    confidence: 87.5
  }
];

export const FileManager = () => {
  const { toast } = useToast();
  const [files, setFiles] = useState<FileItem[]>(mockFiles);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'processed' | 'unprocessed' | 'starred'>('all');

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'folder') return FolderOpen;
    
    if (file.mimeType?.startsWith('image/')) return Image;
    if (file.mimeType?.startsWith('video/')) return FileVideo;
    if (file.mimeType?.startsWith('audio/')) return FileAudio;
    if (file.mimeType?.includes('pdf') || file.mimeType?.includes('document')) return FileText;
    if (file.mimeType?.includes('zip') || file.mimeType?.includes('rar')) return Archive;
    
    return File;
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         file.aiTags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = 
      filterType === 'all' ||
      (filterType === 'processed' && file.aiProcessed) ||
      (filterType === 'unprocessed' && !file.aiProcessed && !file.processing) ||
      (filterType === 'starred' && file.starred);
    
    return matchesSearch && matchesFilter;
  });

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    
    uploadedFiles.forEach(file => {
      const newFile: FileItem = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        type: 'file',
        size: file.size,
        mimeType: file.type,
        lastModified: new Date(file.lastModified),
        processing: true
      };
      
      setFiles(prev => [newFile, ...prev]);
      
      // Simulate AI processing
      setTimeout(() => {
        setFiles(prev => prev.map(f => 
          f.id === newFile.id 
            ? { 
                ...f, 
                processing: false, 
                aiProcessed: true, 
                aiTags: ['uploaded', 'auto-tagged'],
                confidence: Math.random() * 20 + 80
              } 
            : f
        ));
        
        toast({
          title: "File Processed",
          description: `${file.name} has been analyzed by AI successfully.`,
        });
      }, 3000);
    });

    toast({
      title: "Upload Started",
      description: `Processing ${uploadedFiles.length} file(s) with AI...`,
    });
  }, [toast]);

  const handleAIProcess = (fileId: string) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, processing: true }
        : file
    ));

    setTimeout(() => {
      setFiles(prev => prev.map(file => 
        file.id === fileId 
          ? { 
              ...file, 
              processing: false, 
              aiProcessed: true, 
              aiTags: ['reprocessed', 'enhanced'],
              confidence: Math.random() * 15 + 85
            }
          : file
      ));
      
      toast({
        title: "AI Processing Complete",
        description: "File has been reanalyzed with enhanced AI models.",
      });
    }, 2000);
  };

  const toggleStar = (fileId: string) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, starred: !file.starred }
        : file
    ));
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI File Manager</h1>
            <p className="text-muted-foreground">Intelligent file processing and organization</p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button className="bg-lexos-blue hover:bg-lexos-blue/80" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </span>
              </Button>
            </label>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search files and AI tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'processed' | 'unprocessed' | 'starred')}
            className="px-3 py-2 bg-background border border-border rounded-md text-sm"
          >
            <option value="all">All Files</option>
            <option value="processed">AI Processed</option>
            <option value="unprocessed">Unprocessed</option>
            <option value="starred">Starred</option>
          </select>

          <div className="flex border border-border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <Tabs defaultValue="files" className="space-y-4">
          <TabsList>
            <TabsTrigger value="files">File Browser</TabsTrigger>
            <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
            <TabsTrigger value="processing">Processing Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-4">
            <ScrollArea className="h-[600px]">
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-2'}>
                {filteredFiles.map((file) => {
                  const Icon = getFileIcon(file);
                  
                  if (viewMode === 'grid') {
                    return (
                      <Card key={file.id} className="glass hover:border-lexos-blue/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center space-y-3">
                            <div className="relative">
                              <Icon className="w-12 h-12 text-lexos-blue" />
                              {file.processing && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full animate-pulse" />
                              )}
                              {file.starred && (
                                <Star className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 fill-current" />
                              )}
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-medium text-foreground truncate w-full">
                                {file.name}
                              </div>
                              {file.size && (
                                <div className="text-xs text-muted-foreground">
                                  {formatFileSize(file.size)}
                                </div>
                              )}
                            </div>
                            {file.aiTags && (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {file.aiTags.slice(0, 2).map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  return (
                    <div
                      key={file.id}
                      className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-lexos-blue/30"
                    >
                      <div className="relative">
                        <Icon className="w-8 h-8 text-lexos-blue" />
                        {file.processing && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {file.name}
                          </span>
                          {file.starred && (
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          )}
                          {file.aiProcessed && (
                            <Badge variant="outline" className="bg-lexos-blue/10 text-lexos-blue border-lexos-blue/30">
                              AI
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          {file.size && <span>{formatFileSize(file.size)}</span>}
                          <span>{file.lastModified.toLocaleDateString()}</span>
                          {file.confidence && (
                            <span className="text-green-400">{file.confidence.toFixed(1)}% confidence</span>
                          )}
                        </div>

                        {file.aiTags && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {file.aiTags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {file.processing && (
                          <div className="mt-2">
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <Brain className="w-3 h-3 animate-pulse" />
                              <span>AI Processing...</span>
                            </div>
                            <Progress value={Math.random() * 60 + 20} className="h-1 mt-1" />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStar(file.id)}
                        >
                          <Star className={`w-4 h-4 ${file.starred ? 'text-yellow-400 fill-current' : 'text-muted-foreground'}`} />
                        </Button>
                        
                        {!file.processing && file.type === 'file' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAIProcess(file.id)}
                          >
                            <Brain className="w-4 h-4" />
                          </Button>
                        )}
                        
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="ai-insights" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-lg">Processing Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Files</span>
                      <span className="font-semibold">{files.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">AI Processed</span>
                      <span className="font-semibold text-green-400">
                        {files.filter(f => f.aiProcessed).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Processing</span>
                      <span className="font-semibold text-yellow-400">
                        {files.filter(f => f.processing).length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-lg">AI Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(files.flatMap(f => f.aiTags || []))).map((tag) => (
                      <Badge key={tag} variant="outline" className="bg-lexos-blue/10 text-lexos-blue border-lexos-blue/30">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-lg">File Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(
                      files.reduce((acc, file) => {
                        const type = file.type === 'folder' ? 'Folders' : file.mimeType?.split('/')[0] || 'Other';
                        acc[type] = (acc[type] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([type, count]) => (
                      <div key={type} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">{type}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="processing" className="space-y-4">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Processing Queue</CardTitle>
                <CardDescription>Files currently being analyzed by AI</CardDescription>
              </CardHeader>
              <CardContent>
                {files.filter(f => f.processing).length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No files currently processing</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {files.filter(f => f.processing).map((file) => (
                      <div key={file.id} className="flex items-center space-x-4 p-3 border border-border/30 rounded-lg">
                        <Brain className="w-6 h-6 text-lexos-blue animate-pulse" />
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{file.name}</div>
                          <div className="text-sm text-muted-foreground">Analyzing content and generating tags...</div>
                          <Progress value={Math.random() * 60 + 20} className="h-2 mt-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};