import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';

interface BlockCommentButtonProps {
  blockId: string;
  onCommentClick: (blockId: string) => void;
  commentCount?: number;
  className?: string;
}

export function BlockCommentButton({
  blockId,
  onCommentClick,
  commentCount = 0,
  className = ''
}: BlockCommentButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);


  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCommentClick(blockId);
  };


  const handleMouseEnter = () => {
    setIsHovered(true);
    setIsVisible(true);
  };


  const handleMouseLeave = () => {
    setIsHovered(false);

    setTimeout(() => {
      if (!isHovered) {
        setIsVisible(false);
      }
    }, 200);
  };

  return (
    <div
      className={`absolute right-0 top-0 h-full flex items-center ${className}`}
      style={{
        transform: 'translateX(100%)',
        paddingLeft: '8px'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      
      <button
        ref={buttonRef}
        onClick={handleClick}
        className={`
          flex items-center justify-center w-6 h-6
          transition-all duration-200 ease-in-out
          text-gray-400 hover:text-gray-600
          ${
        isVisible || commentCount > 0 ?
        'opacity-100 scale-100' :
        'opacity-0 scale-75 pointer-events-none'}
        `
        }
        title={commentCount > 0 ? `${commentCount} 条评论` : '添加评论'}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}>
        
        {}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round">
          
          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    </div>);

}


interface BlockCommentContainerProps {
  blockId: string;
  children: React.ReactNode;
  onCommentClick: (blockId: string) => void;
  commentCount?: number;
  className?: string;
}

export function BlockCommentContainer({
  blockId,
  children,
  onCommentClick,
  commentCount = 0,
  className = ''
}: BlockCommentContainerProps) {
  const [showButton, setShowButton] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);


  const handleMouseEnter = () => {
    setShowButton(true);
  };


  const handleMouseLeave = () => {
    setShowButton(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative group ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      
      {children}

      {}
      <BlockCommentButton
        blockId={blockId}
        onCommentClick={onCommentClick}
        commentCount={commentCount}
        className={`
          transition-opacity duration-200
          ${showButton || commentCount > 0 ? 'opacity-100' : 'opacity-0'}
        `} />
      
    </div>);

}

export default BlockCommentButton;