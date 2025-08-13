import React, { ReactNode } from 'react';

interface SidebarContainerProps {
  children: ReactNode;
}




export function SidebarContainer({ children }: SidebarContainerProps) {
  return (
    <div
      className="w-full h-screen border-r border-gray-100/30 flex flex-col bg-white/90 shadow-lg backdrop-blur-md backdrop-saturate-150 overflow-hidden"
      style={{
        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
        backdropFilter: 'blur(12px) saturate(150%)'
      }}>
      
      {children}
    </div>);

}