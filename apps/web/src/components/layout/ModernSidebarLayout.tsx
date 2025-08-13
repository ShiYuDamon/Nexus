import React from 'react';
import { ModernSidebar } from './sidebar/ModernSidebar';

interface ModernSidebarLayoutProps {
  children: React.ReactNode;
}




export function ModernSidebarLayout({ children }: ModernSidebarLayoutProps) {
  return (
    <ModernSidebar>
      {children}
    </ModernSidebar>);

}