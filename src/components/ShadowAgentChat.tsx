import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/api';
import {
  Send, 
  Shield, 
  Bot, 
  User, 
  Copy, 
  Download,
  AlertTriangle,
  Zap,
  Brain,
  Eye,
  Lock,
  Unlock,
  RefreshCw,
  Clock,
  DollarSign
} from 'lucide-react';

interface ShadowMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  provider?: string;
  cost?: number;
  tokens?: number;
  imageUrl?: string;
}

export const ShadowAgentChat = () => {
  const [messages, setMessages] = useState<ShadowMessage[]>([
    {
      id: '1',
      type: 'system',
      content: '🛡️ **Shadow Agent Activated**\n\n⚠️ **WARNING: UNRESTRICTED MODE** ⚠️\n\nYou now have access to enhanced AI capabilities with reduced safety constraints. This mode provides:\n\n• **Unrestricted content generation**\n• **Advanced reasoning capabilities**\n• **Bypass of standard limitations**\n• **Enhanced creative freedom**\n• **Direct model access**\n\n**Use responsibly and in accordance with applicable laws.**\n\nHow may I assist you with unrestricted capabilities?',
      timestamp: new Date(),
    }
  ]);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [shadowMode, setShadowMode] = useState(true);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ShadowMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Call Shadow Agent local API
      const response = await fetch(`${API_BASE_URL}/shadow-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: input })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process request');
      }

      const data = await response.json();

      const assistantMessage: ShadowMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response,
        timestamp: new Date(),
        model: data.model,
        provider: data.provider,
        cost: data.cost,
        tokens: data.tokens,
        imageUrl: data.imageUrl
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.type === 'image') {
        toast({
          title: "Image Generated",
          description: "Unrestricted image generation completed",
        });
      }

    } catch (error) {
      const errorMessage: ShadowMessage = {
        id: (Date.now() + 2).toString(),
        type: 'system',
        content: `🚨 **Shadow Agent Error**

${error instanceof Error ? error.message : 'An unknown error occurred'}

The Shadow Agent encountered an issue processing your request. This may be due to:

• Backend connectivity issues
• API rate limits
• Content policy violations
• System overload

Try rephrasing your request or contact system administrator.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: "Shadow Agent Error",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  const exportChat = () => {
    const chatData = {
      session: 'shadow-agent',
      messages: messages,
      exportedAt: new Date().toISOString(),
      mode: 'unrestricted'
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shadow-agent-chat-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now().toString(),
      type: 'system',
      content: '🔄 **Shadow Agent Reset**\n\nChat history cleared. Unrestricted mode remains active.',
      timestamp: new Date(),
    }]);
  };

  const totalCost = messages.reduce((sum, msg) => sum + (msg.cost || 0), 0);
  const totalTokens = messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-destructive/30 glass-panel bg-destructive/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-destructive/20 rounded-full animate-pulse">
              <Shield className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-destructive">Shadow Agent Chat</h1>
              <p className="text-sm text-muted-foreground">
                Unrestricted AI capabilities - Use responsibly
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="destructive" className="animate-pulse">
              UNRESTRICTED
            </Badge>
            <Badge variant="outline" className="text-xs">
              <DollarSign className="h-3 w-3 mr-1" />
              ${totalCost.toFixed(4)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              {totalTokens}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShadowMode(!shadowMode)}
              className="text-destructive"
            >
              {shadowMode ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={exportChat}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={clearChat}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="p-3 bg-destructive/10 border-b border-destructive/30">
        <div className="flex items-center space-x-2 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">CAUTION:</span>
          <span>This interface provides unrestricted AI access. Content may not be filtered.</span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex space-x-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <Avatar className="w-8 h-8 ring-2 ring-destructive/30">
                  <AvatarFallback className={
                    message.type === 'user' ? 'bg-primary text-primary-foreground' : 
                    message.type === 'system' ? 'bg-destructive/20 text-destructive' :
                    'bg-destructive/10 text-destructive'
                  }>
                    {message.type === 'user' ? <User className="h-4 w-4" /> : 
                     message.type === 'system' ? <AlertTriangle className="h-4 w-4" /> : 
                     <Shield className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                
                <div className={`glass-card p-4 rounded-lg ${
                  message.type === 'user' ? 'bg-primary/10 border-primary/30' : 
                  message.type === 'system' ? 'bg-destructive/10 border-destructive/30' :
                  'bg-card border-destructive/20'
                }`}>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                  
                  {message.imageUrl && (
                    <div className="mt-3">
                      <img 
                        src={message.imageUrl} 
                        alt="Generated content" 
                        className="max-w-full h-auto rounded-lg border border-destructive/30"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{message.timestamp.toLocaleTimeString()}</span>
                      {message.model && (
                        <>
                          <span>•</span>
                          <Badge variant="outline" className="text-xs border-destructive/30">
                            {message.provider}/{message.model}
                          </Badge>
                        </>
                      )}
                      {message.cost !== undefined && (
                        <>
                          <span>•</span>
                          <span>${message.cost.toFixed(4)}</span>
                        </>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(message.content)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="flex space-x-3">
                <Avatar className="w-8 h-8 ring-2 ring-destructive/30">
                  <AvatarFallback className="bg-destructive/10 text-destructive">
                    <Shield className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="glass-card p-4 rounded-lg bg-card border-destructive/20">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-destructive rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-destructive rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-destructive rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                    <span className="text-sm text-muted-foreground">Shadow Agent processing...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-destructive/30 glass-panel bg-destructive/5">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Enter unrestricted query... I can generate any content without standard limitations."
              className="min-h-[44px] glass-card border-destructive/30 focus:border-destructive/50"
              disabled={loading}
            />
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            className="h-11 px-6 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span className="flex items-center text-destructive">
              <Shield className="h-3 w-3 mr-1" />
              Unrestricted Mode: Active
            </span>
            <span className="flex items-center">
              <Brain className="h-3 w-3 mr-1" />
              Enhanced Reasoning
            </span>
            <span className="flex items-center">
              <Eye className="h-3 w-3 mr-1" />
              Image Generation
            </span>
          </div>
          <div className="text-xs text-destructive">
            ⚠️ Use responsibly • Content not filtered
          </div>
        </div>
      </div>
    </div>
  );
};