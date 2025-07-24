import { useState } from 'react';
import { LexOSHeader } from './LexOSHeader';
import { LexOSSidebar } from './LexOSSidebar';
import { ChatInterface } from './ChatInterface';
import { SystemMonitor } from './SystemMonitor';
import { CostMonitor } from './CostMonitor';
import { AgentDashboard } from './AgentDashboard';
import { RealtimeDataDashboard } from './RealtimeDataDashboard';
import { ShadowAgentPanel } from './ShadowAgentPanel';
import { BrowserAgent } from './BrowserAgent';
import { MedicalModule } from './MedicalModule';
import { RentManagerModule } from './RentManagerModule';
import { H100ConfigPanel } from './H100ConfigPanel';
import { SmartOrchestrator } from './SmartOrchestrator';
import { TaskManager } from './TaskManager';
import { EnhancedVoiceInterface } from './EnhancedVoiceInterface';
import { DocumentProcessor } from './DocumentProcessor';
import { ContactManager } from './ContactManager';
import { KnowledgeBase } from './KnowledgeBase';
import { CursorIDE } from './CursorIDE';
import { AutomationWorkflow } from './AutomationWorkflow';
import { IDEInterface } from './IDEInterface';
import { FileManager } from './FileManager';
import RealtimeOrchestratorInterface from './RealtimeOrchestratorInterface';
import { SuperAgent } from './SuperAgent';
import { DeepAgent } from './DeepAgent';

export const LexOSLayout = () => {
  const [activeTab, setActiveTab] = useState('chat');

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatInterface />;
      case 'monitor':
        return (
          <div className="space-y-4 p-6">
            <CostMonitor />
            <SystemMonitor />
          </div>
        );
      case 'shadow':
        return <ShadowAgentPanel />;
      case 'super-agent':
        return <SuperAgent />;
      case 'orchestrator':
        return <SmartOrchestrator />;
      case 'tasks':
        return <TaskManager />;
      case 'voice':
        return <EnhancedVoiceInterface />;
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
      case 'files':
        return <FileManager />;
      case 'ide':
        return <CursorIDE />;
      case 'agents':
        return <AgentDashboard />;
      case 'realtime':
        return <RealtimeDataDashboard />;
      case 'browser':
        return <BrowserAgent />;
      case 'medical':
        return <MedicalModule />;
      case 'rentmanager':
        return <RentManagerModule />;
      case 'h100-config':
        return <H100ConfigPanel />;
      case 'realtime-orchestrator':
        return <RealtimeOrchestratorInterface />;
      case 'ssh':
        return <IDEInterface />;
      case 'deepagent':
        return <DeepAgent />;
      case 'settings':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-lexos-blue/20 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl">⚙️</span>
              </div>
              <h3 className="text-xl font-bold text-foreground">Settings</h3>
              <p className="text-muted-foreground">System configuration</p>
            </div>
          </div>
        );
      default:
        return <ChatInterface />;
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      <LexOSHeader />
      <div className="flex flex-1 overflow-hidden">
        <LexOSSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-hidden bg-background/95 backdrop-blur-sm">
          <div className="h-full w-full p-4">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};