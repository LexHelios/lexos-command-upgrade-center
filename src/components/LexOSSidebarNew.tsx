import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CustomIcon } from '@/components/CustomIcon';
import { 
  MessageSquare,
  FolderOpen,
  Code2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Shield,
  ImageIcon
} from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }> | 'custom';
  customIconType?: 'messaging' | 'gpu' | 'agents' | 'lex';
  badge?: string;
  description?: string;
}

interface LexOSSidebarNewProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const LexOSSidebarNew = ({ 
  activeTab = 'main', 
  onTabChange, 
  collapsed = false, 
  onToggleCollapse 
}: LexOSSidebarNewProps) => {
  
  // Simplified sidebar with only essential items
  const sidebarItems: SidebarItem[] = [
    { 
      id: 'main', 
      label: 'Lexos AI', 
      icon: 'custom',
      customIconType: 'lex',
      description: 'All-in-one AI assistant'
    },
    { 
      id: 'deepagent', 
      label: 'DeepAgent', 
      icon: Sparkles,
      badge: 'BUILD',
      description: 'AI app builder'
    },
    { 
      id: 'imagegen', 
      label: 'Image Gen', 
      icon: ImageIcon,
      badge: 'H100',
      description: 'AI image creation'
    },
    { 
      id: 'files', 
      label: 'Files & Docs', 
      icon: FolderOpen,
      description: 'Document library'
    },
    { 
      id: 'ide', 
      label: 'Code Editor', 
      icon: Code2,
      description: 'IDE & terminal'
    },
    { 
      id: 'admin', 
      label: 'Admin', 
      icon: Shield,
      badge: 'PRO',
      description: 'Advanced settings'
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: Settings,
      description: 'Preferences'
    }
  ];

  const handleItemClick = (itemId: string) => {
    if (onTabChange) {
      onTabChange(itemId);
    }
  };

  return (
    <aside className={cn(
      "h-full bg-card border-r border-border transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Toggle Button */}
      <div className="flex items-center justify-end p-2 border-b border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 w-8 p-0"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = activeTab === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start transition-all duration-200",
                  collapsed ? "px-0 justify-center" : "px-3",
                  isActive && "bg-primary/10 hover:bg-primary/20"
                )}
                onClick={() => handleItemClick(item.id)}
              >
                <div className={cn(
                  "flex items-center gap-3",
                  collapsed && "justify-center"
                )}>
                  {/* Icon */}
                  <div className={cn(
                    "flex items-center justify-center",
                    collapsed ? "w-8 h-8" : "w-5 h-5"
                  )}>
                    {item.icon === 'custom' && item.customIconType ? (
                      <CustomIcon type={item.customIconType} className={cn(
                        collapsed ? "w-6 h-6" : "w-5 h-5",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                    ) : (
                      React.createElement(item.icon as React.ComponentType<{ className?: string }>, {
                        className: cn(
                          collapsed ? "w-6 h-6" : "w-5 h-5",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )
                      })
                    )}
                  </div>

                  {/* Label and Description */}
                  {!collapsed && (
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-medium text-sm",
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {item.label}
                        </span>
                        {item.badge && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs px-1.5 py-0",
                              isActive ? "border-primary text-primary" : ""
                            )}
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <span className="sr-only">{item.label}</span>
                )}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Version Info */}
      {!collapsed && (
        <div className="p-4 border-t border-border/50">
          <div className="text-xs text-muted-foreground text-center">
            <p>Lexos Command Center</p>
            <p className="text-[10px] mt-1">v2025.7</p>
          </div>
        </div>
      )}
    </aside>
  );
};