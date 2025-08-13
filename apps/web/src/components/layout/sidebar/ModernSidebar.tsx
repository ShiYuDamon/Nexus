import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { SidebarContainer } from './SidebarContainer';
import { SidebarSearch } from './SidebarSearch';
import { SidebarNavigation } from './SidebarNavigation';
import { RecentDocuments } from './RecentDocuments';
import { WorkspaceList } from './WorkspaceList';
import { UserProfile } from './UserProfile';

interface ModernSidebarProps {
  children?: React.ReactNode;
}




export function ModernSidebar({ children }: ModernSidebarProps) {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [canTriggerHover, setCanTriggerHover] = useState(true);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const hoverAreaRef = useRef<HTMLDivElement>(null);


  const handleSearch = (query: string) => {
    setSearchQuery(query);

  };


  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);

    if (!isCollapsed) {
      setIsHovering(false);


      setCanTriggerHover(false);


      setTimeout(() => {
        setCanTriggerHover(true);
      }, 1000);
    }
  };


  const handleMouseEnter = () => {

    if (isCollapsed && canTriggerHover) {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      hoverTimerRef.current = setTimeout(() => {
        setIsHovering(true);
      }, 500);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = setTimeout(() => {
      setIsHovering(false);
    }, 300);
  };


  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isHovering && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setIsHovering(false);
      }
    };

    if (isHovering) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, [isHovering]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-white relative">
      {}
      {isCollapsed &&
      <div
        ref={hoverAreaRef}
        className="fixed left-0 top-0 bottom-0 w-1 z-[1001]"
        onMouseEnter={handleMouseEnter}
        style={{ pointerEvents: canTriggerHover ? 'auto' : 'none' }} />

      }

      {}
      <button
        onClick={toggleSidebar}
        className={`
          absolute z-[1002] rounded-md shadow-sm bg-white text-gray-500
          hover:bg-gray-50 transition-all duration-200 w-6 h-6 flex items-center justify-center
          ${isCollapsed ? 'top-4 left-4' : 'top-4 left-4'}
        `}
        aria-label={isCollapsed ? '展开侧边栏' : '收起侧边栏'}>
        
        <span className="material-icons" style={{ fontSize: '18px' }}>
          {isCollapsed ? 'menu' : 'menu_open'}
        </span>
      </button>

      {}
      <div
        ref={sidebarRef}
        className={`
          fixed left-0 top-0 bottom-0 z-[1000]
          transition-all duration-300 ease-in-out
          ${isCollapsed && !isHovering ? 'w-0 opacity-0 -translate-x-full' : 'w-72 opacity-100 translate-x-0'}
          ${isHovering ? 'shadow-xl' : ''}
        `}
        onMouseEnter={() => isCollapsed && setIsHovering(true)}
        onMouseLeave={handleMouseLeave}>
        
        <SidebarContainer>
          <div className="flex flex-col h-full overflow-hidden">
            {}
            <div className="pt-14">
              <SidebarSearch onSearch={handleSearch} />
            </div>

            {}
            <SidebarNavigation />

            {}
            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none">
              {}
              <RecentDocuments />

              {}
              <WorkspaceList />

              {}
              <div className="h-4"></div>
            </div>

            {}
            <UserProfile />
          </div>
        </SidebarContainer>
      </div>

      {}
      <div
        className={`
          flex-1 flex flex-col overflow-hidden
          transition-all duration-300 ease-in-out
          ${!isCollapsed ? 'ml-72' : 'ml-0'}
        `}>
        
        {children}
      </div>
    </div>);

}