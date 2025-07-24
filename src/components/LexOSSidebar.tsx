import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CustomIcon } from '@/components/CustomIcon';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { 
  Shield, 
  Terminal, 
  FolderOpen, 
  Activity, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Mic,
  Network,
  Webhook,
  Building,
  Code2,
  Users,
  MessageSquare,
  Bot,
  Clock,
  TrendingUp,
  Globe,
  MousePointer,
  Heart,
  Server,
  Brain,
  FileText,
  BookOpen
} from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }> | 'custom';
  customIconType?: 'messaging' | 'gpu' | 'agents' | 'lex';
  badge?: string;
  active?: boolean;
}

interface LexOSSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const LexOSSidebar = ({ activeTab = 'chat', onTabChange, collapsed: externalCollapsed, onToggleCollapse }: LexOSSidebarProps) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const { hasShadowAccess } = useUserPermissions();
  
  // Use external collapsed state if provided, otherwise use internal state
  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  const sidebarItems: SidebarItem[] = [
    { 
      id: 'chat', 
      label: 'Chat', 
      icon: 'custom',
      customIconType: 'messaging',
      active: activeTab === 'chat' 
    },
    // Shadow Agent - only show if user has access
    ...(hasShadowAccess ? [{ 
      id: 'shadow', 
      label: 'Shadow Agent', 
      icon: Shield,
      badge: 'RESTRICTED',
      active: activeTab === 'shadow'
    }] : []),
    { 
      id: 'super-agent', 
      label: 'Super Agent', 
      icon: Brain,
      badge: 'NEW',
      active: activeTab === 'super-agent'
    },
    { 
      id: 'orchestrator', 
      label: 'Smart Orchestrator', 
      icon: 'custom',
      customIconType: 'lex',
      badge: 'AI',
      active: activeTab === 'orchestrator'
    },
    { 
      id: 'tasks', 
      label: 'Task Manager', 
      icon: Terminal,
      active: activeTab === 'tasks'
    },
    { 
      id: 'voice', 
      label: 'Voice Interface', 
      icon: Mic,
      active: activeTab === 'voice'
    },
    { 
      id: 'realtime-orchestrator', 
      label: 'Real-time Orchestrator', 
      icon: Brain,
      badge: 'LIVE',
      active: activeTab === 'realtime-orchestrator'
    },
    { 
      id: 'realtime', 
      label: 'Real-time Data', 
      icon: TrendingUp,
      badge: 'LIVE',
      active: activeTab === 'realtime'
    },
    { 
      id: 'browser', 
      label: 'Browser Agent', 
      icon: Globe,
      badge: 'AUTO',
      active: activeTab === 'browser'
    },
    { 
      id: 'medical', 
      label: 'Medical', 
      icon: Heart,
      badge: 'HEALTH',
      active: activeTab === 'medical'
    },
    { 
      id: 'rentmanager', 
      label: 'Rent Manager', 
      icon: Building,
      badge: 'API',
      active: activeTab === 'rentmanager'
    },
    { 
      id: 'documents', 
      label: 'Document Processor', 
      icon: FolderOpen,
      active: activeTab === 'documents'
    },
    { 
      id: 'costs', 
      label: 'Cost Monitor', 
      icon: TrendingUp,
      badge: '$',
      active: activeTab === 'costs'
    },
    { 
      id: 'contacts', 
      label: 'Contact Manager', 
      icon: Users,
      active: activeTab === 'contacts'
    },
    { 
      id: 'knowledge', 
      label: 'Knowledge Base', 
      icon: Terminal,
      active: activeTab === 'knowledge'
    },
    { 
      id: 'automation', 
      label: 'Automation', 
      icon: Webhook,
      active: activeTab === 'automation'
    },
    { 
      id: 'deepagent', 
      label: 'DeepAgent', 
      icon: 'custom',
      customIconType: 'lex',
      badge: 'BUILDER',
      active: activeTab === 'deepagent'
    },
    { 
      id: 'ide', 
      label: 'Cursor IDE', 
      icon: Code2,
      badge: 'NEW',
      active: activeTab === 'ide'
    },
    { 
      id: 'ssh', 
      label: 'SSH Terminal', 
      icon: Terminal,
      badge: 'SSH',
      active: activeTab === 'ssh'
    },
    { 
      id: 'agents', 
      label: 'Agent Dashboard', 
      icon: 'custom',
      customIconType: 'agents',
      badge: '5',
      active: activeTab === 'agents'
    },
    { 
      id: 'files', 
      label: 'File Manager', 
      icon: FolderOpen,
      active: activeTab === 'files'
    },
    { 
      id: 'monitor', 
      label: 'System Monitor', 
      icon: 'custom',
      customIconType: 'gpu',
      badge: '3',
      active: activeTab === 'monitor'
    },
    { 
      id: 'h100-config', 
      label: 'H100 Setup', 
      icon: Server,
      badge: 'GPU',
      active: activeTab === 'h100-config'
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: Settings,
      active: activeTab === 'settings'
    },
  ];

  return (
    <aside 
      className={cn(
        "h-full glass-panel backdrop-blur-md border-r border-primary/30 transition-all duration-300 ease-in-out flex flex-col",
        collapsed ? "w-16" : "w-48 md:w-64"
      )}
    >
      {/* Collapse Toggle - show for both internal and external control */}
      <div className="flex justify-end p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleCollapse}
          className="text-primary hover:text-accent glow-accent transition-all duration-200"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-2 pb-4">
        <div className="space-y-2">
          {sidebarItems.map((item) => {
            return (
              <Button
                key={item.id}
                variant={item.active ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start text-left h-12 relative group transition-all duration-200 glass-card cyber-hover",
                  collapsed ? "px-3" : "px-4",
                  item.active && "bg-primary/20 text-primary border border-primary/40 glow"
                )}
                onClick={() => onTabChange?.(item.id)}
              >
                {item.icon === 'custom' && item.customIconType ? (
                  <CustomIcon 
                    type={item.customIconType}
                    size={20}
                    className={cn(
                      "flex-shrink-0",
                      item.active ? "brightness-125" : "brightness-90 group-hover:brightness-110"
                    )}
                  />
                ) : (
                  React.createElement(item.icon as React.ComponentType<{ className?: string }>, {
                    className: cn(
                      "w-5 h-5 flex-shrink-0",
                      item.active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )
                  })
                )}
                
                {!collapsed && (
                  <>
                    <span className={cn(
                      "ml-3 transition-colors duration-200",
                      item.active ? "text-lexos-blue font-medium" : "text-foreground"
                    )}>
                      {item.label}
                    </span>
                    
                    {item.badge && (
                      <Badge 
                        variant={item.badge === 'RESTRICTED' ? 'destructive' : 'default'}
                        className={cn(
                          "ml-auto text-xs",
                          item.badge === 'RESTRICTED' 
                            ? "bg-red-500/20 text-red-400 border-red-500/30" 
                            : "bg-lexos-blue/20 text-lexos-blue border-lexos-blue/30"
                        )}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}

                {collapsed && item.badge && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-lexos-accent rounded-full animate-pulse" />
                )}

                {/* Active indicator */}
                {item.active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-lexos-blue rounded-r-full" />
                )}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-border/50">
        {!collapsed && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">System Status</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-lexos-success rounded-full status-connected" />
                <span className="text-lexos-success">Optimal</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              CPU: {Math.round(Math.random() * 30 + 20)}% • Memory: {(
                (typeof performance !== 'undefined' && 'memory' in performance && performance.memory) ? 
                (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1) :
                (Math.random() * 500 + 100).toFixed(1)
              )}MB • {navigator.onLine ? 'Online' : 'Offline'}
            </div>
          </div>
        )}
        
        {collapsed && (
          <div className="flex justify-center">
            <div className="w-3 h-3 bg-lexos-success rounded-full status-connected" />
          </div>
        )}
      </div>
    </aside>
  );
};