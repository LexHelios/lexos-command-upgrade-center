import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Code2, 
  Bot, 
  FileText, 
  Terminal, 
  GitBranch,
  Search,
  Settings,
  Play,
  Save,
  FolderOpen,
  Plus,
  X,
  MessageSquare,
  Sparkles,
  GitCommit,
  GitPullRequest,
  Lightbulb,
  Zap,
  FileCode,
  Send,
  Copy,
  Check,
  AlertTriangle,
  Info
} from 'lucide-react';

interface FileTab {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  modified: boolean;
  isActive: boolean;
}

interface AICompletion {
  id: string;
  text: string;
  position: { line: number; character: number };
}

interface AIMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const CursorIDE = () => {
  const { toast } = useToast();
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  
  const [openTabs, setOpenTabs] = useState<FileTab[]>([
    {
      id: 'file-1',
      name: 'main.py',
      path: '/workspace/main.py',
      language: 'python',
      modified: false,
      isActive: true,
      content: `import torch
import numpy as np
from transformers import AutoTokenizer, AutoModelForCausalLM

# AI-powered code completion example
def generate_text(prompt: str, model_name: str = "gpt-4") -> str:
    """Generate text using the specified model."""
    # Your implementation here
    pass

def main():
    # Initialize model
    model = AutoModelForCausalLM.from_pretrained("microsoft/DialoGPT-medium")
    tokenizer = AutoTokenizer.from_pretrained("microsoft/DialoGPT-medium")
    
    # Example usage
    prompt = "Hello, how are you?"
    response = generate_text(prompt)
    print(f"AI Response: {response}")

if __name__ == "__main__":
    main()`
    },
    {
      id: 'file-2',
      name: 'config.json',
      path: '/workspace/config.json',
      language: 'json',
      modified: true,
      isActive: false,
      content: `{
  "model_settings": {
    "temperature": 0.7,
    "max_tokens": 1000,
    "top_p": 0.9
  },
  "api_keys": {
    "openai": "your-api-key-here",
    "anthropic": "your-anthropic-key"
  },
  "features": {
    "code_completion": true,
    "ai_chat": true,
    "git_integration": true
  }
}`
    }
  ]);

  const [activeTabId, setActiveTabId] = useState('file-1');
  const [aiChat, setAiChat] = useState<AIMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hi! I\'m your AI coding assistant. I can help you write code, debug issues, explain concepts, and more. What would you like to work on?',
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAISuggestion, setShowAISuggestion] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ line: 0, character: 0 });

  const activeTab = openTabs.find(tab => tab.id === activeTabId);

  const handleTabSwitch = (tabId: string) => {
    setOpenTabs(tabs => tabs.map(tab => ({
      ...tab,
      isActive: tab.id === tabId
    })));
    setActiveTabId(tabId);
  };

  const handleCloseTab = (tabId: string) => {
    const tabIndex = openTabs.findIndex(tab => tab.id === tabId);
    setOpenTabs(tabs => tabs.filter(tab => tab.id !== tabId));
    
    if (activeTabId === tabId && openTabs.length > 1) {
      const newActiveId = tabIndex > 0 ? openTabs[tabIndex - 1].id : openTabs[tabIndex + 1].id;
      setActiveTabId(newActiveId);
    }
  };

  const handleCodeChange = (value: string) => {
    setOpenTabs(tabs => tabs.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, content: value, modified: true }
        : tab
    ));

    // Simulate AI code completion trigger
    if (value.endsWith('.') || value.endsWith('(')) {
      setShowAISuggestion(true);
      setAiSuggestion('suggest_method()  # AI suggestion');
      setTimeout(() => setShowAISuggestion(false), 3000);
    }
  };

  const handleSaveFile = () => {
    setOpenTabs(tabs => tabs.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, modified: false }
        : tab
    ));
    toast({
      title: "File Saved",
      description: `${activeTab?.name} has been saved successfully.`,
    });
  };

  const handleAIChat = async () => {
    if (!chatInput.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setAiChat(prev => [...prev, userMessage]);
    setChatInput('');
    setIsGenerating(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: generateAIResponse(userMessage.content),
        timestamp: new Date()
      };
      setAiChat(prev => [...prev, aiResponse]);
      setIsGenerating(false);
    }, 1500);
  };

  const generateAIResponse = (input: string): string => {
    const responses = [
      "I can help you implement that function. Here's a suggested approach:\n\n```python\ndef your_function():\n    # Implementation here\n    pass\n```",
      "That's a great question! Let me break this down for you and provide some code examples.",
      "I notice you're working with Python. Here are some best practices for this scenario...",
      "Let me help you debug this. Can you share the specific error you're encountering?",
      "This looks like a good use case for the following pattern. Here's how you can implement it:"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleAcceptSuggestion = () => {
    if (activeTab && codeEditorRef.current) {
      const textarea = codeEditorRef.current;
      const cursorPos = textarea.selectionStart;
      const newContent = activeTab.content.slice(0, cursorPos) + aiSuggestion + activeTab.content.slice(cursorPos);
      handleCodeChange(newContent);
    }
    setShowAISuggestion(false);
  };

  const handleAIReview = () => {
    toast({
      title: "AI Code Review",
      description: "Analyzing your code for improvements and potential issues...",
    });
    
    setTimeout(() => {
      const aiMessage: AIMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `🔍 **Code Review Complete**

**Suggestions:**
- Consider adding error handling for the model loading
- The generate_text function needs implementation
- Add type hints for better code clarity
- Consider using environment variables for API keys

**Quality Score: 8/10** ✨`,
        timestamp: new Date()
      };
      setAiChat(prev => [...prev, aiMessage]);
    }, 2000);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Code2 className="w-6 h-6 text-lexos-blue" />
            <h1 className="text-xl font-bold">Cursor IDE</h1>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <GitBranch className="w-4 h-4 mr-2" />
              main
            </Button>
            <Button variant="ghost" size="sm">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={handleAIReview}>
            <Sparkles className="w-4 h-4 mr-2" />
            AI Review
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSaveFile}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-64 border-r border-border/50 p-4">
          <Tabs defaultValue="files" className="space-y-4">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="git">Git</TabsTrigger>
            </TabsList>

            <TabsContent value="files" className="space-y-4">
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                New File
              </Button>
              
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {openTabs.map((tab) => (
                    <div 
                      key={tab.id}
                      className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer hover:bg-muted/50 ${
                        tab.isActive ? 'bg-lexos-blue/10 border border-lexos-blue/30' : ''
                      }`}
                      onClick={() => handleTabSwitch(tab.id)}
                    >
                      <FileCode className="w-4 h-4 text-lexos-blue" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium flex items-center">
                          {tab.name}
                          {tab.modified && (
                            <div className="w-2 h-2 bg-orange-400 rounded-full ml-2" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {tab.path}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="git" className="space-y-4">
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full">
                  <GitCommit className="w-4 h-4 mr-2" />
                  Commit Changes
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  <GitPullRequest className="w-4 h-4 mr-2" />
                  Create PR
                </Button>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Changes</h4>
                {openTabs.filter(tab => tab.modified).map(tab => (
                  <div key={tab.id} className="text-xs text-muted-foreground flex items-center">
                    <span className="w-1 h-1 bg-orange-400 rounded-full mr-2" />
                    {tab.name}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Editor */}
        <div className="flex-1 flex flex-col">
          {/* File Tabs */}
          <div className="flex items-center border-b border-border/50 bg-muted/20">
            {openTabs.map((tab) => (
              <div 
                key={tab.id}
                className={`flex items-center space-x-2 px-4 py-2 border-r border-border/50 cursor-pointer ${
                  tab.isActive ? 'bg-background border-b-2 border-b-lexos-blue' : 'hover:bg-muted/50'
                }`}
                onClick={() => handleTabSwitch(tab.id)}
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm">{tab.name}</span>
                {tab.modified && (
                  <div className="w-2 h-2 bg-orange-400 rounded-full" />
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-4 h-4 p-0 hover:bg-red-500/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(tab.id);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>

          {/* Code Editor */}
          <div className="flex-1 relative">
            {activeTab && (
              <div className="h-full flex">
                <div className="flex-1 p-4">
                  <div className="relative h-full">
                    <Textarea
                      ref={codeEditorRef}
                      value={activeTab.content}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      className="h-full font-mono text-sm bg-black/90 text-green-400 border-none resize-none"
                      placeholder="Start coding..."
                    />
                    
                    {/* AI Suggestion Overlay */}
                    {showAISuggestion && (
                      <div className="absolute top-4 right-4 bg-lexos-blue/90 text-white p-3 rounded-lg shadow-lg max-w-xs">
                        <div className="flex items-center space-x-2 mb-2">
                          <Lightbulb className="w-4 h-4" />
                          <span className="text-sm font-medium">AI Suggestion</span>
                        </div>
                        <div className="text-xs mb-2 bg-black/20 p-2 rounded font-mono">
                          {aiSuggestion}
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={handleAcceptSuggestion}>
                            <Check className="w-3 h-3 mr-1" />
                            Accept
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setShowAISuggestion(false)}>
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Chat Panel */}
                <div className="w-80 border-l border-border/50 flex flex-col">
                  <div className="p-4 border-b border-border/50">
                    <div className="flex items-center space-x-2">
                      <Bot className="w-5 h-5 text-lexos-blue" />
                      <h3 className="font-medium">AI Assistant</h3>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {aiChat.map((message) => (
                        <div 
                          key={message.id}
                          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] p-3 rounded-lg ${
                            message.type === 'user' 
                              ? 'bg-lexos-blue text-white' 
                              : 'bg-muted'
                          }`}>
                            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                            <div className="text-xs opacity-70 mt-2">
                              {message.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))}
                      {isGenerating && (
                        <div className="flex justify-start">
                          <div className="bg-muted p-3 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-lexos-blue rounded-full animate-pulse" />
                              <span className="text-sm">AI is thinking...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  <div className="p-4 border-t border-border/50">
                    <div className="flex space-x-2">
                      <Input
                        ref={chatInputRef}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAIChat()}
                        placeholder="Ask AI anything..."
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleAIChat}
                        disabled={!chatInput.trim() || isGenerating}
                        size="sm"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};