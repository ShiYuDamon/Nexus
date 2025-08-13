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
      title={`${commentCount} 条评论`}>
      
      {}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-white/40 rounded-md pointer-events-none" />
      <span className="relative z-10">
        {commentCount > 99 ? '99+' : commentCount}
      </span>
    </button>);

}

interface InlineCommentIndicatorsProps {



  blockComments: Array<{
    blockId: string;
    commentCount: number;
  }>;



  onIndicatorClick: (blockId: string) => void;



  showIndicators?: boolean;



  blockRefs: React.MutableRefObject<Map<string, HTMLElement>>;
}





export function InlineCommentIndicators({
  blockComments,
  onIndicatorClick,
  showIndicators = true,
  blockRefs
}: InlineCommentIndicatorsProps) {
  const [indicatorPositions, setIndicatorPositions] = useState<
    Map<string, {top: number;right: number;}>>(
    new Map());


  const updateIndicatorPositions = useCallback(() => {
    if (!showIndicators || !blockRefs.current) {
      setIndicatorPositions(new Map());
      return;
    }

    const newPositions = new Map<string, {top: number;right: number;}>();


    const pageContainer =
    document.querySelector('.py-4.w-full') ||
    document.querySelector('[class*="py-4"][class*="w-full"]');
    if (!pageContainer) return;

    const containerRect = pageContainer.getBoundingClientRect();

    blockComments.forEach(({ blockId, commentCount }) => {
      if (commentCount > 0) {
        const blockElement = blockRefs.current.get(blockId);
        if (blockElement) {
          const blockRect = blockElement.getBoundingClientRect();


          const top =
          blockRect.top - containerRect.top + blockRect.height / 2 - 10;
          const right = 12;

          newPositions.set(blockId, { top, right });
        }
      }
    });

    setIndicatorPositions(newPositions);
  }, [blockComments, showIndicators, blockRefs]);


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
            className="absolute pointer-events-auto"
            style={{
              top: `${position.top}px`,
              right: `${position.right}px`
            }}>
            
            <CommentIndicator
              blockId={blockId}
              commentCount={commentCount}
              onClick={onIndicatorClick} />
            
          </div>);

      })}
    </>);

}

export default InlineCommentIndicators;