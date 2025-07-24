import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mic, MicOff, Zap, Wifi, WifiOff } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'warning';
}

export const LexOSHeader = () => {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [shadowMode, setShadowMode] = useState(false);

  const services: ServiceStatus[] = [
    { name: 'Core AI', status: 'connected' },
    { name: 'SSH', status: 'connected' },
    { name: 'Shadow Stack', status: 'warning' },
    { name: 'Multimodal', status: 'connected' },
    { name: 'Memory', status: 'connected' },
  ];

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'connected': return 'status-connected';
      case 'disconnected': return 'status-disconnected';
      case 'warning': return 'status-warning';
      default: return 'status-disconnected';
    }
  };

  return (
    <header className="h-14 md:h-16 bg-card/80 backdrop-blur-md border-b border-border/50 px-3 md:px-6 flex items-center justify-between">
      {/* LexOS Branding */}
      <div className="flex items-center space-x-2 md:space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-accent rounded-lg flex items-center justify-center glow">
            <span className="text-xs md:text-sm font-bold text-lexos-blue-dark">L</span>
          </div>
          <h1 className="text-lg md:text-xl font-bold text-foreground">LexOS</h1>
        </div>
        
        {/* Service Status - Hidden on small screens */}
        <div className="hidden md:flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${services.every(s => s.status === 'connected') ? 'status-connected' : 'status-warning'}`} />
          <span className="text-sm text-muted-foreground">
            {services.filter(s => s.status === 'connected').length}/{services.length} Connected
          </span>
        </div>
      </div>

      {/* Center Controls - Responsive */}
      <div className="flex items-center space-x-1 md:space-x-3 overflow-x-auto flex-1 justify-center max-w-lg">
        {/* Service Indicators - Better spacing and alignment */}
        <div className="hidden sm:flex space-x-1 md:space-x-2">
          {services.map((service) => (
            <Badge 
              key={service.name}
              variant="secondary" 
              className="text-xs glass border-0 px-2 py-1 whitespace-nowrap"
            >
              <div className={`w-2 h-2 rounded-full mr-1.5 ${getStatusColor(service.status)}`} />
              <span className="hidden lg:inline">{service.name}</span>
              <span className="lg:hidden">{service.name.slice(0, 3)}</span>
            </Badge>
          ))}
        </div>
      </div>

      {/* User Controls */}
      <div className="flex items-center space-x-4">
        {/* Removed duplicate voice toggle - use Real-time Orchestrator interface */}

        {/* Shadow Mode Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShadowMode(!shadowMode)}
          className={`relative ${shadowMode ? 'text-red-400 glow' : 'text-muted-foreground'} hover:text-red-300`}
        >
          <Zap className="w-4 h-4" />
          {shadowMode && (
            <span className="absolute -top-2 -right-2 text-xs text-red-400">SHADOW</span>
          )}
        </Button>

        {/* User Profile */}
        <div className="flex items-center space-x-2">
          <Avatar className="w-8 h-8 ring-2 ring-lexos-blue/30">
            <AvatarFallback className="bg-lexos-blue text-lexos-blue-dark text-sm font-semibold">
              U
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground">User</span>
        </div>
      </div>
    </header>
  );
};