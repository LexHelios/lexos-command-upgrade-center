import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Monitor, ChevronLeft, ChevronRight } from 'lucide-react';
import { LexOSHeader } from './LexOSHeader';
import { LexOSSidebar } from './LexOSSidebar';
import { ChatInterface } from './ChatInterface';
import { SystemMonitor } from './SystemMonitor';
import { AgentDashboard } from './AgentDashboard';
import { VoiceInterface } from './VoiceInterface';
import { FileManager } from './FileManager';
import { SmartOrchestrator } from './SmartOrchestrator';
import { TaskManager } from './TaskManager';
import { EnhancedVoiceInterface } from './EnhancedVoiceInterface';
import { DocumentProcessor } from './DocumentProcessor';
import { ContactManager } from './ContactManager';
import { KnowledgeBase } from './KnowledgeBase';
import { CursorIDE } from './CursorIDE';
import { AutomationWorkflow } from './AutomationWorkflow';
import { H100ConfigPanel } from './H100ConfigPanel';
import RealtimeOrchestratorInterface from './RealtimeOrchestratorInterface';
import { ShadowAgentPanel } from './ShadowAgentPanel';
import { RealtimeDataDashboard } from './RealtimeDataDashboard';
import { BrowserAgent } from './BrowserAgent';
import { MedicalModule } from './MedicalModule';
import { RentManagerModule } from './RentManagerModule';
import { CostMonitor } from './CostMonitor';
import { useIsMobile } from '@/hooks/use-mobile';

export const MobileLexOSLayout = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [agentVisionActive, setAgentVisionActive] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const isMobile = useIsMobile();
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Auto-hide header on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setHeaderVisible(currentScrollY < lastScrollY || currentScrollY < 50);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Close sidebar when tab changes on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [activeTab, isMobile]);

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatInterface />;
      case 'shadow':
        return <ShadowAgentPanel />;
      case 'orchestrator':
        return <SmartOrchestrator />;
      case 'tasks':
        return <TaskManager />;
      case 'voice':
        return <EnhancedVoiceInterface />;
      case 'realtime-orchestrator':
        return <RealtimeOrchestratorInterface />;
      case 'realtime':
        return <RealtimeDataDashboard />;
      case 'browser':
        return <BrowserAgent />;
      case 'medical':
        return <MedicalModule />;
      case 'rentmanager':
        return <RentManagerModule />;
      case 'documents':
        return <DocumentProcessor />;
      case 'costs':
        return <CostMonitor />;
      case 'contacts':
        return <ContactManager />;
      case 'knowledge':
        return <KnowledgeBase />;
      case 'automation':
        return <AutomationWorkflow />;
      case 'agents':
        return <AgentDashboard />;
      case 'files':
        return <FileManager />;
      case 'monitor':
        return <SystemMonitor />;
      case 'ide':
        return <CursorIDE />;
      case 'h100-config':
        return <H100ConfigPanel />;
      case 'ssh':
        return (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto glow">
                <span className="text-2xl">🖥️</span>
              </div>
              <h3 className="text-xl font-bold text-foreground">SSH Terminal</h3>
              <p className="text-muted-foreground text-sm">Remote server access</p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto glow">
                <span className="text-2xl">⚙️</span>
              </div>
              <h3 className="text-xl font-bold text-foreground">Settings</h3>
              <p className="text-muted-foreground text-sm">System configuration</p>
            </div>
          </div>
        );
      default:
        return <ChatInterface />;
    }
  };

  return (
    <div className="h-screen w-full flex flex-col cyber-3d relative">
      {/* Auto-hiding Header */}
      <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
        headerVisible ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="glass-panel border-0 border-b border-primary/30">
          <LexOSHeader />
          {isMobile && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute left-2 top-1/2 -translate-y-1/2 md:hidden glass-card hover:glow-accent"
                >
                  <Menu className="w-4 h-4 text-primary" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="left" 
                className="w-64 p-0 glass-panel border-primary/30"
              >
                <LexOSSidebar 
                  activeTab={activeTab} 
                  onTabChange={setActiveTab}
                />
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden pt-16">
        {/* Collapsible Desktop Sidebar */}
        {!isMobile && (
          <div className={`glass-panel border-r border-primary/30 cyber-depth transition-all duration-300 ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          }`}>
            <LexOSSidebar 
              activeTab={activeTab} 
              onTabChange={setActiveTab}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </div>
        )}
        
        {/* Main Content */}
        <main ref={mainContentRef} className="flex-1 overflow-hidden relative">
          <div className="h-full glass-card m-1 md:m-2 rounded-lg cyber-hover">
            {renderContent()}
          </div>
        </main>

        {/* Floating Agent Vision */}
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            onClick={() => setAgentVisionActive(!agentVisionActive)}
            className={`w-14 h-14 rounded-full glass-panel border-primary/50 glow hover:scale-110 transition-all duration-300 ${
              agentVisionActive ? 'bg-primary/30 animate-pulse' : ''
            }`}
          >
            <Monitor className="w-6 h-6 text-primary" />
          </Button>
          
          {agentVisionActive && (
            <div className="absolute bottom-16 right-0 w-80 h-48 glass-panel rounded-lg border-primary/50 glow animate-fade-in">
              <div className="p-3 border-b border-primary/30">
                <h3 className="text-sm font-medium text-primary">Agent Vision Feed</h3>
                <p className="text-xs text-muted-foreground">Real-time system view</p>
              </div>
              <div className="p-3 h-32 bg-black/20 rounded-b-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-primary">Status:</span>
                    <span className="text-green-400">Cloud LLMs Online</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-primary">Active Models:</span>
                    <span className="text-blue-400">Claude, Anthropic</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-primary">Response Time:</span>
                    <span className="text-yellow-400">~2.3s avg</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-primary">Web Search:</span>
                    <span className="text-green-400">Active</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-primary">Voice Synthesis:</span>
                    <span className="text-green-400">ElevenLabs Ready</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};