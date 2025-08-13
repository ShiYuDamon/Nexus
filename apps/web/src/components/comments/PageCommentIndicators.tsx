import React, { useEffect, useState, useCallback } from 'react';

interface CommentIndicatorProps {
  blockId: string;
  commentCount: number;
  onClick: (blockId: string) => void;
}




function CommentIndicator({
  blockId,
  commentCount,
  onClick
}: CommentIndicatorProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick(blockId);
  };

  return (
    <button
      onClick={handleClick}
      className={`
        relative flex items-center justify-center
        min-w-[20px] h-[20px] px-1.5
        bg-gradient-to-br from-yellow-400 to-amber-500
        text-gray-900 text-xs font-bold
        rounded-md shadow-lg border border-yellow-300/50
        hover:from-yellow-500 hover:to-amber-600
        hover:shadow-xl hover:border-yellow-400/70
        transition-all duration-300 ease-out
        transform hover:scale-110 hover:-translate-y-0.5
        backdrop-blur-sm
        z-10
      `}
      title={`${commentCount} 条未解决评论`}>
      
      {}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-white/40 rounded-md pointer-events-none" />
      <span className="relative z-10">
        {commentCount > 99 ? '99+' : commentCount}
      </span>
    </button>);

}

interface PageCommentIndicatorsProps {



  blockComments: Array<{
    blockId: string;
    commentCount: number;
  }>;



  onIndicatorClick: (blockId: string) => void;



  showIndicators?: boolean;
}





export function PageCommentIndicators({
  blockComments,
  onIndicatorClick,
  showIndicators = true
}: PageCommentIndicatorsProps) {
  const [indicatorPositions, setIndicatorPositions] = useState<
    Map<string, {top: number;}>>(
    new Map());


  const updateIndicatorPositions = useCallback(() => {
    if (!showIndicators) {
      setIndicatorPositions(new Map());
      return;
    }

    const newPositions = new Map<string, {top: number;}>();


    const scrollContainer =
    document.querySelector('.flex-1.h-full.overflow-auto') ||
    document.querySelector(
      '[class*="flex-1"][class*="h-full"][class*="overflow-auto"]'
    );

    if (!scrollContainer) {
      
      return;
    }

    const containerRect = scrollContainer.getBoundingClientRect();
    let foundElements = 0;
    let totalElements = 0;

    blockComments.forEach(({ blockId, commentCount }) => {
      totalElements++;
      if (commentCount > 0) {
        const blockElement = document.querySelector(
          `[data-block-id="${blockId}"]`
        );
        if (blockElement) {
          foundElements++;
          const blockRect = blockElement.getBoundingClientRect();


          const scrollOffset = scrollContainer.scrollTop || 0;
          const top =
          blockRect.top -
          containerRect.top +
          scrollOffset +
          blockRect.height / 2 -
          10;

          newPositions.set(blockId, { top });
        } else {
          
        }
      }
    });

    
    setIndicatorPositions(newPositions);
  }, [blockComments, showIndicators]);


  useEffect(() => {
    updateIndicatorPositions();

    const handleResize = () => {
      updateIndicatorPositions();
    };


    let resizeTimer: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize, { passive: true });

    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimer);
    };
  }, [updateIndicatorPositions]);


  useEffect(() => {
    const timer = setTimeout(updateIndicatorPositions, 100);
    return () => clearTimeout(timer);
  }, [blockComments, updateIndicatorPositions]);


  useEffect(() => {
    if (!showIndicators || blockComments.length === 0) return;


    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;

      mutations.forEach((mutation) => {

        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (
              element.querySelector('[data-block-id]') ||
              element.hasAttribute('data-block-id'))
              {
                shouldUpdate = true;
              }
            }
          });
        }
      });

      if (shouldUpdate) {

        setTimeout(updateIndicatorPositions, 50);
      }
    });


    const documentContainer =
    document.querySelector('.blocks-container') ||
    document.querySelector('.Nexus-editor') ||
    document.body;

    if (documentContainer) {
      observer.observe(documentContainer, {
        childList: true,
        subtree: true
      });
    }


    const initialTimer = setTimeout(() => {
      updateIndicatorPositions();
    }, 200);

    return () => {
      observer.disconnect();
      clearTimeout(initialTimer);
    };
  }, [showIndicators, blockComments.length, updateIndicatorPositions]);

  if (!showIndicators) {
    return null;
  }

  return (
    <>
      {blockComments.map(({ blockId, commentCount }) => {
        const position = indicatorPositions.get(blockId);
        if (!position || commentCount === 0) {
          return null;
        }

        return (
          <div
            key={blockId}
            className="absolute right-4 z-10 pointer-events-auto transition-all duration-200"
            style={{
              top: `${position.top}px`
            }}>
            
            <CommentIndicator
              blockId={blockId}
              commentCount={commentCount}
              onClick={onIndicatorClick} />
            
          </div>);

      })}
    </>);

}

export default PageCommentIndicators;