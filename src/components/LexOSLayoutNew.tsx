import React, { useState, useCallback, useMemo, Suspense } from 'react';
import { LexOSHeader } from './LexOSHeader';
import { LexOSSidebarNew } from './LexOSSidebarNew';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Loader2 } from 'lucide-react';

// Lazy load components for better performance
const UnifiedLexosInterface = React.lazy(() => import('./UnifiedLexosInterface').then(m => ({ default: m.UnifiedLexosInterface })));
const DeepAgent = React.lazy(() => import('./DeepAgent').then(m => ({ default: m.DeepAgent })));
const FileManager = React.lazy(() => import('./FileManager').then(m => ({ default: m.FileManager })));
const IDEInterface = React.lazy(() => import('./IDEInterface').then(m => ({ default: m.IDEInterface })));
const ShadowAgentPanel = React.lazy(() => import('./ShadowAgentPanel').then(m => ({ default: m.ShadowAgentPanel })));
const ImageGenerator = React.lazy(() => import('./ImageGenerator').then(m => ({ default: m.ImageGenerator })));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full">
    <div className="flex flex-col items-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Access denied component
const AccessDenied = React.memo(() => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center space-y-4">
      <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
        <span className="text-2xl">🔒</span>
      </div>
      <h3 className="text-xl font-bold">Admin Access Required</h3>
      <p className="text-muted-foreground">This section requires pro access.</p>
    </div>
  </div>
));

// Settings component
const SettingsPanel = React.memo(({ sidebarCollapsed, setSidebarCollapsed }: { 
  sidebarCollapsed: boolean; 
  setSidebarCollapsed: (collapsed: boolean) => void; 
}) => (
  <div className="p-6 max-w-4xl mx-auto">
    <h2 className="text-2xl font-bold mb-6">Settings</h2>
    <div className="space-y-6">
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">AI Model Preferences</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Default Model</label>
            <p className="text-sm text-muted-foreground">Auto-select (Recommended)</p>
          </div>
        </div>
      </div>
      
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Interface</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Dark Mode</label>
            <button className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm">
              Enabled
            </button>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Compact Sidebar</label>
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="bg-muted hover:bg-muted/80 px-3 py-1 rounded text-sm transition-colors"
            >
              {sidebarCollapsed ? 'Disabled' : 'Enabled'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">About</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Lexos Command Center v2025.7</p>
          <p>Running on H100 GPU</p>
          <p>© 2025 Lexos AI</p>
        </div>
      </div>
    </div>
  </div>
));

export const LexOSLayoutNew = React.memo(() => {
  const [activeTab, setActiveTab] = useState('main');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { hasShadowAccess } = useUserPermissions();

  // Memoized callbacks for better performance
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Memoized content renderer
  const renderContent = useMemo(() => {
    const componentMap = {
      main: <UnifiedLexosInterface />,
      deepagent: <DeepAgent />,
      imagegen: <ImageGenerator />,
      files: <FileManager />,
      ide: <IDEInterface />,
      admin: hasShadowAccess ? <ShadowAgentPanel /> : <AccessDenied />,
      settings: <SettingsPanel sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} />
    };

    return componentMap[activeTab as keyof typeof componentMap] || <UnifiedLexosInterface />;
  }, [activeTab, hasShadowAccess, sidebarCollapsed]);

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      <LexOSHeader />
      <div className="flex flex-1 overflow-hidden">
        <LexOSSidebarNew 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
        <main className="flex-1 overflow-hidden bg-background/95 backdrop-blur-sm">
          <Suspense fallback={<LoadingSpinner />}>
            {renderContent}
          </Suspense>
        </main>
      </div>
    </div>
  );
});