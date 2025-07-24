import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { API_BASE_URL } from '@/config/api';
import { 
  Terminal, 
  Code, 
  Play, 
  Square, 
  FolderOpen, 
  Settings,
  Monitor,
  Wifi,
  WifiOff,
  Server,
  Activity,
  FileText,
  Download,
  Upload,
  RefreshCw,
  Eye,
  EyeOff,
  Maximize,
  Minimize,
  Save,
  File,
  Folder,
  Trash2,
  Edit,
  FolderPlus,
  FilePlus
} from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface OpenFile {
  path: string;
  content: string;
  language: string;
  modified: boolean;
}

export const IDEInterface = () => {
  const { toast } = useToast();
  const terminalRef = useRef<HTMLDivElement>(null);
  const [currentCommand, setCurrentCommand] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    'Welcome to LexOS IDE Terminal',
    'Connected to local server filesystem',
    '$ '
  ]);
  
  const [currentDirectory, setCurrentDirectory] = useState('/home/user');
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [openFiles, setOpenFiles] = useState<Record<string, OpenFile>>({});
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial file tree
  useEffect(() => {
    loadFileTree(currentDirectory);
  }, [currentDirectory]);

  const loadFileTree = async (path: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/ide/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, recursive: true })
      });

      if (!response.ok) throw new Error('Failed to load files');

      const data = await response.json();
      setFileTree(data.items);
    } catch (error) {
      toast({
        title: "Error loading files",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    // Add command to output
    setTerminalOutput(prev => [...prev, `$ ${command}`]);
    setCommandHistory(prev => [command, ...prev.slice(0, 99)]);
    setHistoryIndex(-1);

    try {
      // Handle cd command locally
      if (command.startsWith('cd ')) {
        const newPath = command.substring(3).trim();
        const response = await fetch(`${API_BASE_URL}/ide/list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: newPath })
        });

        if (response.ok) {
          setCurrentDirectory(newPath);
          setTerminalOutput(prev => [...prev, `Changed directory to ${newPath}`, '$ ']);
        } else {
          setTerminalOutput(prev => [...prev, `cd: ${newPath}: No such file or directory`, '$ ']);
        }
      } else {
        // Execute other commands
        const response = await fetch(`${API_BASE_URL}/ide/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            command,
            cwd: currentDirectory 
          })
        });

        const data = await response.json();

        if (response.ok) {
          const output = data.output.split('\n');
          setTerminalOutput(prev => [...prev, ...output, '$ ']);
        } else {
          setTerminalOutput(prev => [...prev, `Error: ${data.error}`, '$ ']);
        }
      }
    } catch (error) {
      setTerminalOutput(prev => [...prev, 
        `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        '$ '
      ]);
    }

    setCurrentCommand('');

    // Scroll to bottom
    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, 100);
  };

  const openFile = async (path: string) => {
    if (openFiles[path]) {
      setActiveFile(path);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ide/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });

      if (!response.ok) throw new Error('Failed to read file');

      const data = await response.json();
      const language = getLanguageFromPath(path);

      setOpenFiles(prev => ({
        ...prev,
        [path]: {
          path,
          content: data.content,
          language,
          modified: false
        }
      }));
      setActiveFile(path);
    } catch (error) {
      toast({
        title: "Error opening file",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  const saveFile = async (path: string) => {
    const file = openFiles[path];
    if (!file || !file.modified) return;

    try {
      const response = await fetch(`${API_BASE_URL}/ide/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          path,
          content: file.content 
        })
      });

      if (!response.ok) throw new Error('Failed to save file');

      setOpenFiles(prev => ({
        ...prev,
        [path]: { ...prev[path], modified: false }
      }));

      toast({
        title: "File saved",
        description: `Successfully saved ${path.split('/').pop()}`
      });
    } catch (error) {
      toast({
        title: "Error saving file",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  const createFile = async (name: string, isDirectory: boolean) => {
    try {
      const path = `${currentDirectory}/${name}`;
      const response = await fetch(`${API_BASE_URL}/ide/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          path,
          type: isDirectory ? 'directory' : 'file'
        })
      });

      if (!response.ok) throw new Error('Failed to create file/folder');

      await loadFileTree(currentDirectory);
      toast({
        title: isDirectory ? "Folder created" : "File created",
        description: `Successfully created ${name}`
      });
    } catch (error) {
      toast({
        title: "Error creating file/folder",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  const deleteFile = async (path: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/ide/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });

      if (!response.ok) throw new Error('Failed to delete');

      // Remove from open files if it's open
      if (openFiles[path]) {
        const newOpenFiles = { ...openFiles };
        delete newOpenFiles[path];
        setOpenFiles(newOpenFiles);
        if (activeFile === path) {
          setActiveFile(Object.keys(newOpenFiles)[0] || null);
        }
      }

      await loadFileTree(currentDirectory);
      toast({
        title: "Deleted",
        description: `Successfully deleted ${path.split('/').pop()}`
      });
    } catch (error) {
      toast({
        title: "Error deleting",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'md': 'markdown',
      'yml': 'yaml',
      'yaml': 'yaml',
      'sh': 'bash',
      'bash': 'bash'
    };
    return languageMap[ext || ''] || 'text';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(currentCommand);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentCommand('');
      }
    }
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.path} style={{ paddingLeft: `${level * 16}px` }}>
        <div 
          className="flex items-center space-x-2 p-1 rounded hover:bg-muted/50 cursor-pointer group"
          onClick={() => node.type === 'file' && openFile(node.path)}
        >
          {node.type === 'directory' ? (
            <Folder className="w-4 h-4 text-lexos-blue" />
          ) : (
            <FileText className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm flex-1">{node.name}</span>
          <Trash2 
            className="w-3 h-3 opacity-0 group-hover:opacity-100 text-destructive cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              deleteFile(node.path);
            }}
          />
        </div>
        {node.children && renderFileTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className={`h-full flex flex-col bg-background transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">IDE & Terminal</h1>
            <p className="text-muted-foreground">Direct server filesystem access</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <Wifi className="w-3 h-3 mr-1" />
              Connected to Local Server
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 border-r border-border/50 p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">File Explorer</h3>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const name = prompt('File name:');
                    if (name) createFile(name, false);
                  }}
                >
                  <FilePlus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const name = prompt('Folder name:');
                    if (name) createFile(name, true);
                  }}
                >
                  <FolderPlus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadFileTree(currentDirectory)}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground mb-2">
              {currentDirectory}
            </div>

            <ScrollArea className="h-[500px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-1">
                  {renderFileTree(fileTree)}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="terminal" className="flex-1">
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <TabsList>
                <TabsTrigger value="terminal">Terminal</TabsTrigger>
                <TabsTrigger value="editor">Code Editor</TabsTrigger>
              </TabsList>

              {activeFile && openFiles[activeFile]?.modified && (
                <Button
                  size="sm"
                  onClick={() => saveFile(activeFile)}
                  className="bg-lexos-blue hover:bg-lexos-blue/80"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              )}
            </div>

            <TabsContent value="terminal" className="flex-1 flex flex-col p-4 space-y-4">
              {/* Terminal Output */}
              <Card className="flex-1 glass">
                <CardContent className="p-4 h-full">
                  <div 
                    ref={terminalRef}
                    className="h-full bg-black/90 rounded-lg p-4 font-mono text-sm text-green-400 overflow-y-auto"
                  >
                    {terminalOutput.map((line, index) => (
                      <div key={index} className="whitespace-pre-wrap">
                        {line}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Command Input */}
              <div className="flex items-center space-x-2">
                <Terminal className="w-5 h-5 text-lexos-blue" />
                <Input
                  value={currentCommand}
                  onChange={(e) => setCurrentCommand(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter command..."
                  className="flex-1 font-mono bg-black/50 border-lexos-blue/30 text-green-400"
                />
                <Button 
                  onClick={() => executeCommand(currentCommand)}
                  className="bg-lexos-blue hover:bg-lexos-blue/80"
                >
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="editor" className="flex-1 p-4">
              {activeFile && openFiles[activeFile] ? (
                <Card className="glass h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center text-lg">
                        <Code className="w-5 h-5 mr-2" />
                        {activeFile.split('/').pop()}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        {openFiles[activeFile].modified && (
                          <Badge variant="outline" className="text-xs">Modified</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {openFiles[activeFile].language}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>{activeFile}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <Textarea
                      value={openFiles[activeFile].content}
                      onChange={(e) => {
                        setOpenFiles(prev => ({
                          ...prev,
                          [activeFile]: {
                            ...prev[activeFile],
                            content: e.target.value,
                            modified: true
                          }
                        }));
                      }}
                      className="w-full h-[500px] font-mono text-sm bg-black/90 text-green-400 border-0 resize-none"
                      spellCheck={false}
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4" />
                    <p>Select a file to edit</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};