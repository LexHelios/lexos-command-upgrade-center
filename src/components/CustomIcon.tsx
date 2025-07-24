import React from 'react';
import { cn } from '@/lib/utils';

interface CustomIconProps {
  type: 'messaging' | 'gpu' | 'agents' | 'lex';
  className?: string;
  size?: number;
  alt?: string;
}

const iconSources = {
  messaging: '/lovable-uploads/ef5662f5-5879-4d17-8c7f-957c22b0fa5f.png',
  gpu: '/lovable-uploads/7a0607a8-034e-4c8a-8447-7fa88bce8407.png', 
  agents: '/lovable-uploads/74e46bfe-d1f4-4ae6-aea2-32abed48afa9.png',
  lex: '/lovable-uploads/fff15ad3-d652-4c0e-a372-0440bdf1a8ae.png'
};

export const CustomIcon: React.FC<CustomIconProps> = ({ 
  type, 
  className, 
  size = 24,
  alt 
}) => {
  return (
    <div className={cn(
      "relative cyber-hover transition-all duration-300",
      "hover:scale-110 hover:drop-shadow-[0_0_8px_hsl(var(--primary))]",
      className
    )}>
      <img
        src={iconSources[type]}
        alt={alt || `${type} icon`}
        width={size}
        height={size}
        className={cn(
          "object-contain filter brightness-110 contrast-110",
          "hover:brightness-125 transition-all duration-300"
        )}
      />
      {/* Cyber glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 hover:opacity-50 transition-opacity duration-300" />
    </div>
  );
};