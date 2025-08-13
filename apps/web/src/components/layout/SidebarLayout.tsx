import React from 'react';
import { ModernSidebarLayout } from './ModernSidebarLayout';

interface SidebarLayoutProps {
  children: React.ReactNode;
}





export function SidebarLayout({ children }: SidebarLayoutProps) {
  return (
    <ModernSidebarLayout>
          {children}
    </ModernSidebarLayout>);

}