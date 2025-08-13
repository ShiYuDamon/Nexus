import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RichTextBlock } from './RichTextBlockEditor';

export interface OutlineItem {
  id: string;
  title: string;
  level: number;
  children: OutlineItem[];
  collapsed?: boolean;
  isDocumentTitle?: boolean;
}

export interface DocumentOutlineProps {
  blocks: RichTextBlock[];
  activeBlockId?: string;
  onItemClick?: (blockId: string) => void;
  className?: string;
  observeHeadings?: boolean;
  docTitle?: string;
}

export function DocumentOutline({
  blocks,
  activeBlockId,
  onItemClick,
  className = '',
  observeHeadings = true,
  docTitle = ''
}: DocumentOutlineProps) {
  const [outlineItems, setOutlineItems] = useState<OutlineItem[]>([]);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [visibleHeadingId, setVisibleHeadingId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>('');
  const [filteredItems, setFilteredItems] = useState<OutlineItem[]>([]);


  const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>({});


  const headingIdsRef = useRef<string[]>([]);

  const lastVisibleHeadingIdRef = useRef<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);


  const DOC_TITLE_ID = 'document-title';


  const observerRef = useRef<IntersectionObserver | null>(null);


  const buildOutlineTree = useCallback((blocks: RichTextBlock[]) => {

    const headingBlocks = blocks.filter((block) =>
    block.type === 'heading-1' ||
    block.type === 'heading-2' ||
    block.type === 'heading-3'
    );


    headingIdsRef.current = [];
    headingBlocks.forEach((block) => {
      headingIdsRef.current.push(block.id);
    });


    const outlineWithDocTitle: OutlineItem[] = [];


    if (docTitle) {
      outlineWithDocTitle.push({
        id: DOC_TITLE_ID,
        title: docTitle,
        level: 0,
        children: [],
        isDocumentTitle: true
      });
    }


    const getHeadingLevel = (blockType: string): number => {
      switch (blockType) {
        case 'heading-1':return 1;
        case 'heading-2':return 2;
        case 'heading-3':return 3;
        default:return 0;
      }
    };


    const extractTextFromHtml = (html: string): string => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      return tempDiv.textContent || tempDiv.innerText || '';
    };


    const flatOutlineItems: OutlineItem[] = headingBlocks.map((block) => ({
      id: block.id,
      title: extractTextFromHtml(block.content),
      level: getHeadingLevel(block.type),
      children: [],
      collapsed: collapsedState[block.id] || false
    }));


    const allItems = [...outlineWithDocTitle, ...flatOutlineItems];

    if (allItems.length === 0) return [];


    const buildTree = (items: OutlineItem[], level: number = 0): OutlineItem[] => {
      const result: OutlineItem[] = [];
      let i = 0;

      while (i < items.length) {
        const currentItem = items[i];

        if (currentItem.level === level) {
          const newItem = { ...currentItem };
          result.push(newItem);
          i++;


          const childItems: OutlineItem[] = [];
          while (i < items.length && items[i].level > level) {
            childItems.push(items[i]);
            i++;
          }

          if (childItems.length > 0) {
            newItem.children = buildTree(childItems, level + 1);
          }
        } else {
          i++;
        }
      }

      return result;
    };


    return buildTree(allItems, 0);
  }, [collapsedState, docTitle]);


  useEffect(() => {
    if (!observeHeadings) return;


    const debounceVisibleHeading = (headingId: string | null) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }


      if (headingId === lastVisibleHeadingIdRef.current) {
        return;
      }


      debounceTimerRef.current = setTimeout(() => {
        lastVisibleHeadingIdRef.current = headingId;
        setVisibleHeadingId(headingId);
      }, 300);
    };


    if (observerRef.current) {
      observerRef.current.disconnect();
    }


    observerRef.current = new IntersectionObserver(
      (entries) => {

        if (entries.length === 0) return;


        const enteringEntries = entries.filter((entry) => entry.isIntersecting);

        if (enteringEntries.length > 0) {


          const topEntry = enteringEntries.reduce((prev, current) => {
            return prev.boundingClientRect.top < current.boundingClientRect.top ? prev : current;
          });

          const headingId = topEntry.target.getAttribute('data-block-id');
          if (headingId) {
            debounceVisibleHeading(headingId);
          }
        } else if (window.scrollY < 50) {

          debounceVisibleHeading(DOC_TITLE_ID);
        }
      },
      {

        threshold: [0.1],

        rootMargin: '-20px 0px -70% 0px'
      }
    );


    const observeElements = () => {

      const docTitleElement = document.querySelector('.document-title-area');
      if (docTitleElement) {

        docTitleElement.setAttribute('data-block-id', DOC_TITLE_ID);
        observerRef.current?.observe(docTitleElement);
      }


      headingIdsRef.current.forEach((id) => {
        const element = document.querySelector(`[data-block-id="${id}"]`);
        if (element) {
          observerRef.current?.observe(element);
        }
      });
    };


    setTimeout(observeElements, 200);


    let scrollTimer: any = null;
    let isScrolling = false;

    const handleScrollStart = () => {
      isScrolling = true;
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
    };

    const handleScrollEnd = () => {
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }

      scrollTimer = setTimeout(() => {
        isScrolling = false;


        if (window.scrollY < 50) {

          debounceVisibleHeading(DOC_TITLE_ID);
        } else {

          const headings = Array.from(document.querySelectorAll('[data-block-id]')).filter((el) => {
            const rect = el.getBoundingClientRect();

            return rect.top >= 0 && rect.top <= window.innerHeight / 3;
          });

          if (headings.length > 0) {

            headings.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
            const topHeading = headings[0];
            const headingId = topHeading.getAttribute('data-block-id');
            if (headingId) {
              debounceVisibleHeading(headingId);
            }
          }
        }
      }, 150);
    };


    window.addEventListener('scroll', () => {
      handleScrollStart();
      handleScrollEnd();
    }, { passive: true });


    const mutationObserver = new MutationObserver(() => {

      setTimeout(() => {
        if (observerRef.current && !isScrolling) {
          observerRef.current.disconnect();
          setTimeout(observeElements, 300);
        }
      }, 500);
    });


    const editorContent = document.querySelector('.blocks-container');
    if (editorContent) {
      mutationObserver.observe(editorContent, {
        childList: true,
        subtree: false
      });
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
      observerRef.current?.disconnect();
      window.removeEventListener('scroll', handleScrollEnd);
      mutationObserver.disconnect();
    };
  }, [blocks, observeHeadings]);


  const filterOutlineItems = useCallback((items: OutlineItem[], searchText: string): OutlineItem[] => {
    if (!searchText.trim()) return items;

    const filterTree = (items: OutlineItem[]): OutlineItem[] => {
      return items.
      map((item) => {

        const filteredChildren = filterTree(item.children);


        if (
        item.title.toLowerCase().includes(searchText.toLowerCase()) ||
        filteredChildren.length > 0)
        {
          return {
            ...item,
            children: filteredChildren,
            collapsed: false
          };
        }

        return null;
      }).
      filter(Boolean) as OutlineItem[];
    };

    return filterTree(items);
  }, []);


  useEffect(() => {
    const tree = buildOutlineTree(blocks);
    setOutlineItems(tree);


    setFilteredItems(filterOutlineItems(tree, searchText));
  }, [blocks, buildOutlineTree, searchText, filterOutlineItems]);


  const toggleItemCollapse = useCallback((itemId: string) => {
    setCollapsedState((prev) => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  }, []);


  const clearSearch = useCallback(() => {
    setSearchText('');
  }, []);


  const renderOutlineItem = (item: OutlineItem, depth: number = 0) => {

    const isActive = item.id === activeBlockId ||
    !activeBlockId && item.id === visibleHeadingId;
    const isHovered = item.id === hoveredItemId;
    const hasChildren = item.children.length > 0;
    const isCollapsed = collapsedState[item.id];
    const isDocTitle = item.isDocumentTitle;


    const getTitleStyle = () => {
      if (isDocTitle) {
        return isActive ? "text-blue-500" : "text-gray-900 font-medium";
      }

      switch (item.level) {
        case 1:
          return isActive ? "text-blue-500" : "text-gray-900";
        case 2:
          return isActive ? "text-blue-500" : "text-gray-700";
        case 3:
        default:
          return isActive ? "text-blue-500" : "text-gray-500";
      }
    };


    const getFontSize = () => {
      if (isDocTitle) {
        return "0.9375rem";
      }

      switch (item.level) {
        case 1:
          return "0.9375rem";
        case 2:
          return "0.875rem";
        case 3:
        default:
          return "0.8125rem";
      }
    };


    const getIndent = () => {

      if (isDocTitle) {
        return '8px';
      }
      return `${depth * 16 + 8}px`;
    };

    return (
      <div key={item.id} className="Nexus-outline-item">
        <div
          className={`
            Nexus-outline-item-content
            flex items-center justify-between
            transition-colors py-[6px]
            ${isActive ? 'active' : ''}
            ${isDocTitle ? 'document-title-item' : ''}
          `}
          style={{
            paddingLeft: getIndent(),
            fontSize: getFontSize()
          }}
          onClick={() => onItemClick?.(item.id)}
          onMouseEnter={() => setHoveredItemId(item.id)}
          onMouseLeave={() => setHoveredItemId(null)}
          title={item.title}>
          
          {}
          <div className={`flex items-center min-w-0 flex-1 ${isActive ? 'text-blue-500' : isHovered ? 'text-blue-600' : getTitleStyle()}`}>
            {}
            <div className="flex items-center mr-2 w-3 justify-center flex-shrink-0">
              {hasChildren ?
              <button
                className={`
                    w-3 h-3 flex items-center justify-center
                    ${isHovered ? 'opacity-100' : 'opacity-0'}
                    text-gray-400 hover:text-gray-600 transition-opacity duration-150
                  `}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItemCollapse(item.id);
                }}>
                
                  <span
                  className="material-icons"
                  style={{
                    fontSize: '14px',
                    transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                    transition: 'transform 0.15s ease'
                  }}>
                  
                    chevron_right
                  </span>
                </button> :

              <div className="w-3 h-3"></div>
              }
            </div>

            {}
            <span className="truncate leading-tight">
              {item.title || '(无标题)'}
            </span>
          </div>
        </div>

        {}
        {hasChildren &&
        <div
          className="Nexus-outline-children"
          style={{
            maxHeight: isCollapsed ? '0' : '1000px',
            opacity: isCollapsed ? '0' : '1',
            overflow: 'hidden',
            transition: 'max-height 0.25s ease, opacity 0.25s ease'
          }}>
          
            {item.children.map((child) => renderOutlineItem(child, depth + 1))}
          </div>
        }
      </div>);

  };


  return (
    <div className={`Nexus-outline ${className}`}>
      <div className="Nexus-outline-content">
        {filteredItems.length > 0 ?
        <div className="space-y-0 px-0">
            {filteredItems.map((item) => renderOutlineItem(item))}
          </div> :

        <div className="text-gray-400 text-xs p-3 text-center flex flex-col items-center">
            {searchText ?
          <>
                <span className="material-icons mb-1" style={{ fontSize: '20px' }}>search_off</span>
                <span>没有找到匹配的标题</span>
                <button
              onClick={clearSearch}
              className="text-xs mt-1 text-blue-500 hover:text-blue-700">
              
                  清除搜索
                </button>
              </> :

          <>
                <span className="material-icons mb-1" style={{ fontSize: '20px' }}>format_list_numbered</span>
                <span>没有找到标题</span>
              </>
          }
          </div>
        }
      </div>

      <style>
        {`
        .Nexus-outline {
          background-color: transparent;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }

        .Nexus-outline-content::-webkit-scrollbar {
          width: 3px;
        }

        .Nexus-outline-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .Nexus-outline-content::-webkit-scrollbar-thumb {
          background-color: #e5e7eb;
          border-radius: 3px;
        }

        .Nexus-outline-content::-webkit-scrollbar-thumb:hover {
          background-color: #d1d5db;
        }

        .Nexus-outline-item-content {
          cursor: pointer;
          user-select: none;
          line-height: 1.7;
          position: relative;
          padding-right: 8px;
        }

        .Nexus-outline-item-content:hover {
          color: #315efb;
        }

        .Nexus-outline-item-content.active {
          font-weight: 500;
        }

        .document-title-item {
          font-weight: 500;
        }

        .Nexus-outline-item {
          margin-bottom: 0;
        }

        .Nexus-outline-children {
          will-change: max-height, opacity;
        }
        `}
      </style>
    </div>);

}