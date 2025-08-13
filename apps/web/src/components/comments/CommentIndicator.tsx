import React from 'react';

interface CommentIndicatorProps {



  blockId: string;



  commentCount: number;



  onClick: (blockId: string) => void;



  isVisible?: boolean;



  className?: string;
}





export function CommentIndicator({
  blockId,
  commentCount,
  onClick,
  isVisible = true,
  className = ''
}: CommentIndicatorProps) {
  if (commentCount === 0 || !isVisible) {
    return null;
  }

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
        ${className}
      `}
      title={`${commentCount} 条评论`}>
      
      {}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-white/40 rounded-md pointer-events-none" />
      <span className="relative z-10">
        {commentCount > 99 ? '99+' : commentCount}
      </span>
    </button>);

}





interface CommentIndicatorContainerProps {



  documentId: string;



  blockComments: Array<{
    blockId: string;
    commentCount: number;
  }>;



  onIndicatorClick: (blockId: string) => void;



  showIndicators?: boolean;
}

export function CommentIndicatorContainer({
  documentId,
  blockComments,
  onIndicatorClick,
  showIndicators = true
}: CommentIndicatorContainerProps) {
  const [indicatorPositions, setIndicatorPositions] = React.useState<
    Map<string, {top: number;visible: boolean;}>>(
    new Map());


  const updateIndicatorPositions = React.useCallback(() => {
    if (!showIndicators) {
      setIndicatorPositions(new Map());
      return;
    }

    const newPositions = new Map<string, {top: number;visible: boolean;}>();

    blockComments.forEach(({ blockId, commentCount }) => {
      if (commentCount > 0) {
        const blockElement = document.querySelector(
          `[data-block-id="${blockId}"]`
        );
        if (blockElement) {
          const rect = blockElement.getBoundingClientRect();
          const scrollTop =
          window.pageYOffset || document.documentElement.scrollTop;


          const top = rect.top + scrollTop + rect.height / 2 - 10;


          const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;

          newPositions.set(blockId, { top, visible: isVisible });
        }
      }
    });

    setIndicatorPositions(newPositions);
  }, [blockComments, showIndicators]);


  React.useEffect(() => {
    updateIndicatorPositions();

    const handleScroll = () => {
      updateIndicatorPositions();
    };

    const handleResize = () => {
      updateIndicatorPositions();
    };


    let scrollTimer: NodeJS.Timeout;
    const debouncedScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(handleScroll, 16);
    };

    let resizeTimer: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 100);
    };

    window.addEventListener('scroll', debouncedScroll, { passive: true });
    window.addEventListener('resize', debouncedResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', debouncedScroll);
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(scrollTimer);
      clearTimeout(resizeTimer);
    };
  }, [updateIndicatorPositions]);


  React.useEffect(() => {
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
            className="fixed right-3 z-10 pointer-events-auto transition-all duration-200"
            style={{
              top: `${position.top}px`
            }}>
            
            <CommentIndicator
              blockId={blockId}
              commentCount={commentCount}
              onClick={onIndicatorClick}
              isVisible={position.visible} />
            
          </div>);

      })}
    </>);

}

export default CommentIndicator;