import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { DocumentOutline } from './DocumentOutline';
import { RichTextBlock } from './RichTextBlockEditor';


const FloatingOutlinePortal = ({ children }: {children: React.ReactNode;}) => {
  return ReactDOM.createPortal(
    children,
    document.body
  );
};

export interface DocumentSideOutlineProps {
  blocks: RichTextBlock[];
  onItemClick?: (blockId: string) => void;
  className?: string;
  docTitle?: string;
}


const OUTLINE_EXPANDED_STORAGE_KEY = 'document-outline-expanded';




export function DocumentSideOutline({
  blocks,
  onItemClick,
  className = '',
  docTitle = '无标题文档'
}: DocumentSideOutlineProps) {

  const getStoredExpandState = () => {
    const storedState = localStorage.getItem(OUTLINE_EXPANDED_STORAGE_KEY);
    return storedState === null ? true : storedState === 'true';
  };

  const [isExpanded, setIsExpanded] = useState(getStoredExpandState);
  const [activeBlockId, setActiveBlockId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBlocks, setFilteredBlocks] = useState<RichTextBlock[]>(blocks);
  const [isHovering, setIsHovering] = useState(false);
  const [showFloatingOutline, setShowFloatingOutline] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);


  const sidebarWidth = 240;
  const collapsedWidth = 24;

  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hoverTimerRef = useRef<number | null>(null);


  const saveExpandedState = (expanded: boolean) => {
    localStorage.setItem(OUTLINE_EXPANDED_STORAGE_KEY, expanded.toString());
  };


  const handleExpandToggle = () => {
    const newExpandState = !isExpanded;
    setIsExpanded(newExpandState);
    saveExpandedState(newExpandState);

    if (newExpandState && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300);
    }
  };


  const handleItemClick = (blockId: string) => {
    setActiveBlockId(blockId);
    onItemClick?.(blockId);


    if (isSmallScreen && isExpanded) {
      handleExpandToggle();
    }
  };


  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);


    if (query.trim()) {
      const filtered = blocks.filter((block) => {

        if (!block.type.startsWith('heading-')) {
          return false;
        }

        const content = block.content.toLowerCase();
        return content.includes(query.toLowerCase());
      });
      setFilteredBlocks(filtered);
    } else {
      setFilteredBlocks(blocks);
    }
  };


  const clearSearch = () => {
    setSearchQuery('');
    setFilteredBlocks(blocks);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };


  const handleMouseEnter = () => {
    setIsHovering(true);
    if (!isExpanded && !showFloatingOutline && isSmallScreen) {

      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }


      hoverTimerRef.current = window.setTimeout(() => {

        setButtonPosition(getButtonPosition());
        setShowFloatingOutline(true);
      }, 200);
    }
  };


  const getButtonPosition = () => {
    if (!sidebarRef.current) return { top: 140, left: 24 };

    const rect = sidebarRef.current.getBoundingClientRect();
    return {
      top: rect.top + 140,
      left: rect.left + rect.width
    };
  };

  const [buttonPosition, setButtonPosition] = useState({ top: 140, left: 24 });


  useEffect(() => {
    const updateButtonPosition = () => {
      setButtonPosition(getButtonPosition());
    };


    updateButtonPosition();


    window.addEventListener('resize', updateButtonPosition);
    window.addEventListener('scroll', updateButtonPosition);

    return () => {
      window.removeEventListener('resize', updateButtonPosition);
      window.removeEventListener('scroll', updateButtonPosition);
    };
  }, []);

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }


    setTimeout(() => {
      if (!isHovering) {
        setShowFloatingOutline(false);
      }
    }, 300);
  };


  const handleFloatingOutlineClose = () => {
    setShowFloatingOutline(false);
  };


  useEffect(() => {
    const checkScreenSize = () => {
      const isSmall = window.innerWidth < 768;
      setIsSmallScreen(isSmall);


      if (isSmall && isExpanded) {
        setIsExpanded(false);
        saveExpandedState(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, [isExpanded]);

  useEffect(() => {
    setFilteredBlocks(blocks);
  }, [blocks]);

  return (
    <div
      ref={sidebarRef}
      className={`Nexus-document-outline ${className} ${isExpanded ? 'expanded' : 'collapsed'}`}
      style={{ width: isExpanded ? `${sidebarWidth}px` : `${collapsedWidth}px` }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      
      {}
      {!isExpanded &&
      <div className="h-full flex flex-col">
          <button
          className={`
              collapsed-toggle-button flex items-center justify-center h-8 w-8 mx-auto mt-28
              ${isSmallScreen ?
          'text-blue-400 hover:text-blue-600' :
          'text-gray-400 hover:text-gray-700'}
              transition-colors duration-200
            `
          }
          onClick={isSmallScreen ? undefined : handleExpandToggle}
          title={isSmallScreen ? "鼠标悬停显示目录" : "展开目录"}
          disabled={isSmallScreen}
          style={{ cursor: isSmallScreen ? 'default' : 'pointer' }}>
          
            <span className="material-icons" style={{ fontSize: '18px' }}>menu</span>
          </button>
        </div>
      }

      {}
      {isExpanded &&
      <div className="h-full flex flex-col pt-28">
          {}
          <div className="Nexus-outline-header flex items-center px-3 py-2">
            <button
            className="text-gray-400 hover:text-gray-700 p-1 rounded-sm hover:bg-gray-100"
            onClick={handleExpandToggle}
            title="收起目录">
            
              <span className="material-icons" style={{ fontSize: '18px' }}>menu_open</span>
            </button>
          </div>

          {}
          <div className="px-3 py-2">
            <div className="Nexus-search-box flex items-center bg-gray-100 rounded-md group-hover:bg-gray-200 transition-colors">
              <span className="material-icons ml-2 text-gray-400" style={{ fontSize: '16px' }}>search</span>
              <input
              ref={searchInputRef}
              type="text"
              className="block w-full py-1 px-2 text-sm bg-transparent border-none focus:outline-none focus:ring-0"
              placeholder="搜索标题..."
              value={searchQuery}
              onChange={handleSearchChange} />
            
              {searchQuery &&
            <button
              onClick={clearSearch}
              className="text-gray-400 hover:text-gray-600 focus:outline-none mr-2"
              title="清除搜索">
              
                  <span className="material-icons" style={{ fontSize: '16px' }}>close</span>
                </button>
            }
            </div>
          </div>

          {}
          <div className="flex-1 overflow-y-auto px-1">
            {filteredBlocks.length > 0 ?
          <DocumentOutline
            blocks={filteredBlocks}
            activeBlockId={activeBlockId}
            onItemClick={handleItemClick}
            observeHeadings={true}
            className="Nexus-style"
            docTitle={docTitle} /> :


          <div className="flex flex-col items-center justify-center p-8 text-gray-400 h-32">
                {searchQuery ?
            <>
                    <span className="material-icons mb-2" style={{ fontSize: '24px' }}>search_off</span>
                    <p className="text-xs text-gray-400">未找到匹配的标题</p>
                    <button
                onClick={clearSearch}
                className="mt-2 text-xs text-blue-500 hover:text-blue-600">
                
                      清除搜索
                    </button>
                  </> :

            <>
                    <span className="material-icons mb-2" style={{ fontSize: '24px' }}>menu_book</span>
                    <p className="text-xs text-gray-400">文档中没有标题</p>
                    <p className="text-xs text-gray-400 mt-1">添加标题后将自动生成目录</p>
                  </>
            }
              </div>
          }
          </div>
        </div>
      }

      {}
      {!isExpanded && showFloatingOutline && isSmallScreen &&
      <FloatingOutlinePortal>
          <div
          className="Nexus-floating-outline-container"
          style={{
            position: 'fixed',
            top: `${buttonPosition.top}px`,
            left: `${buttonPosition.left}px`,
            zIndex: 9999,
            pointerEvents: 'none',
            transition: 'opacity 0.2s ease-in-out',
            opacity: 1
          }}
          onMouseEnter={() => setShowFloatingOutline(true)}
          onMouseLeave={() => setShowFloatingOutline(false)}>
          
            <div className="Nexus-floating-outline" style={{ pointerEvents: 'auto' }}>
              <div className="p-2 border-b border-gray-100 flex items-center">
                <div className="flex items-center px-1">
                  <button
                  className="text-gray-400 hover:text-gray-700 focus:outline-none p-1 rounded-sm hover:bg-gray-100"
                  onClick={isSmallScreen ? undefined : handleExpandToggle}
                  disabled={isSmallScreen}
                  title={isSmallScreen ? "屏幕宽度不足，无法固定" : "固定目录"}>
                  
                    <span className="material-icons" style={{ fontSize: '18px' }}>push_pin</span>
                  </button>
                </div>
                <span className="text-sm font-medium text-gray-700 ml-1">文档目录</span>
              </div>
              {filteredBlocks.length > 0 ?
            <div className="p-1 max-h-[60vh] overflow-y-auto">
                  <DocumentOutline
                blocks={filteredBlocks}
                activeBlockId={activeBlockId}
                onItemClick={handleItemClick}
                observeHeadings={true}
                className="Nexus-style"
                docTitle={docTitle} />
              
                </div> :

            <div className="p-4 text-center text-gray-400">
                  <span className="material-icons mb-2" style={{ fontSize: '24px' }}>menu_book</span>
                  <p className="text-xs">文档中没有标题</p>
                </div>
            }
            </div>
          </div>
        </FloatingOutlinePortal>
      }

      {}
      <style>
        {`
        .Nexus-document-outline {
          position: relative;
          height: 100%;
          border-right: none;
          background-color: #fff;
          transition: width 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          flex-shrink: 0;
          z-index: 40; 
          pointer-events: auto; 
        }

        .Nexus-document-outline::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          pointer-events: none; 
        }

        .Nexus-document-outline.expanded {
          box-shadow: none;
          width: 240px !important; 
          max-width: 240px !important;
        }

        .Nexus-document-outline.collapsed {
          width: 24px !important;
          overflow: hidden;
          border-right: none;
        }

        .Nexus-outline-header {
          display: flex;
          align-items: center;
        }

        .Nexus-search-box {
          transition: background-color 0.2s;
        }

        .Nexus-search-box:hover,
        .Nexus-search-box:focus-within {
          background-color: #f5f5f5;
        }

        body.resizing {
          cursor: col-resize;
          user-select: none;
        }

        body.resizing * {
          pointer-events: none !important;
          user-select: none !important;
        }

        .Nexus-floating-outline {
          width: 240px;
          background-color: #fff;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          pointer-events: all;
          overflow: hidden;
          border: 1px solid #f0f0f0;
        }

        .Nexus-style {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          color: #1f2329;
        }

        @media (max-width: 768px) {
          .Nexus-document-outline {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            z-index: 50;
          }

          .Nexus-document-outline.collapsed {
            width: 24px !important;
            background-color: transparent;
            box-shadow: none;
          }

          .Nexus-document-outline.collapsed:hover {
            background-color: #fff;
          }
        }
        `}
      </style>
    </div>);

}