import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileLexOSLayout } from '@/components/MobileLexOSLayout';
import { LexOSLayoutNew } from '@/components/LexOSLayoutNew';

export default function Index() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileLexOSLayout />;
  }

  return <LexOSLayoutNew />;
}