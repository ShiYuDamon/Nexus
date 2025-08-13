import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo } from
'react';
import { createPortal } from 'react-dom';
import {
  MessageCircle,
  X,
  Send,
  Check,
  MoreVertical,
  Eye,
  EyeOff } from
'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { UserAvatar } from '../ui/UserAvatar';
import apiClient from '../../services/api.service';
import {
  CommentErrorBoundary,
  useCommentErrorHandler,
  CommentErrorAlert } from
'./CommentErrorBoundary';

interface Comment {
  id: string;
  content: string;
  blockId: string;
  isResolved: boolean;
  author: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  replies: Comment[];
  createdAt: string;
  updatedAt: string;
}

interface BlockComment {
  blockId: string;
  blockPosition: number;
  comments: Comment[];
}

interface FixedCommentSidebarProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  blockPositions: Map<string, number>;
  selectedBlockId?: string | null;
  onHighlightBlock?: (blockId: string | null) => void;
  autoActivateBlockId?: string | null;



  sidebarWidth?: number;



  isSmallScreen?: boolean;



  onCommentChange?: () => void;
}





export const FixedCommentSidebar = React.memo(function FixedCommentSidebar({
  documentId,
  isOpen,
  onClose,
  className = '',
  blockPositions,
  selectedBlockId,
  onHighlightBlock,
  autoActivateBlockId,
  sidebarWidth,
  isSmallScreen = false,
  onCommentChange
}: FixedCommentSidebarProps) {
  const { user } = useAuth();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [blockComments, setBlockComments] = useState<BlockComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [lastAutoActivatedBlockId, setLastAutoActivatedBlockId] = useState<
    string | null>(
    null);
  const [showResolvedComments, setShowResolvedComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null
  );


  const { error, handleError, clearError } = useCommentErrorHandler();


  useEffect(() => {
    if (!isOpen) {
      setPortalContainer(null);
      return;
    }


    let container = document.getElementById('fixed-comment-sidebar-portal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'fixed-comment-sidebar-portal';
      container.style.position = 'fixed';
      container.style.top = '2.9rem';
      container.style.right = '0.75rem';
      container.style.bottom = '0';
      container.style.zIndex = '10';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);
    }

    setPortalContainer(container);

    return () => {

      const existingContainer = document.getElementById(
        'fixed-comment-sidebar-portal'
      );
      if (existingContainer && existingContainer.children.length === 0) {
        document.body.removeChild(existingContainer);
      }
    };
  }, [isOpen]);


  const fetchAllBlockComments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(
        `/api/comments/document/${documentId}/blocks?includeResolved=${showResolvedComments}`
      );

      const commentsData = response.data || [];
      const blockCommentsMap = new Map<string, Comment[]>();

      commentsData.forEach((comment: Comment) => {
        if (comment.blockId) {
          if (!blockCommentsMap.has(comment.blockId)) {
            blockCommentsMap.set(comment.blockId, []);
          }
          blockCommentsMap.get(comment.blockId)!.push({
            ...comment,
            replies: comment.replies || []
          });
        }
      });

      const blockCommentsArray: BlockComment[] = [];
      blockPositions.forEach((position, blockId) => {
        const comments = blockCommentsMap.get(blockId) || [];
        blockCommentsArray.push({
          blockId,
          blockPosition: position,
          comments: comments.sort(
            (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
        });
      });

      blockCommentsArray.sort((a, b) => a.blockPosition - b.blockPosition);
      setBlockComments(blockCommentsArray);
    } catch (err) {
      
      handleError(err instanceof Error ? err : new Error('获取评论失败'));
    } finally {
      setLoading(false);
    }
  }, [documentId, blockPositions, showResolvedComments, handleError]);

  useEffect(() => {
    if (isOpen && documentId) {
      fetchAllBlockComments();
    }
  }, [isOpen, documentId, fetchAllBlockComments]);


  useEffect(() => {
    if (
    autoActivateBlockId &&
    isOpen &&
    !loading &&
    autoActivateBlockId !== lastAutoActivatedBlockId)
    {

      let targetBlock = blockComments.find(
        (block) => block.blockId === autoActivateBlockId
      );


      if (!targetBlock) {

        const blockPosition = blockPositions.get(autoActivateBlockId) || 0;
        const newBlockComment: BlockComment = {
          blockId: autoActivateBlockId,
          blockPosition: blockPosition,
          comments: []
        };
        setBlockComments((prev) => [...prev, newBlockComment]);
        targetBlock = newBlockComment;
      }


      setActiveBlockId(autoActivateBlockId);
      setLastAutoActivatedBlockId(autoActivateBlockId);


      setTimeout(() => {
        const commentBlockElement = sidebarRef.current?.querySelector(
          `[data-comment-block-id="${autoActivateBlockId}"]`
        );

        if (commentBlockElement && sidebarRef.current) {
          const scrollContainer =
          sidebarRef.current.querySelector('.overflow-y-auto');

          if (scrollContainer) {

            const inputElement = commentBlockElement.querySelector('textarea');
            const targetElement = inputElement || commentBlockElement;


            const containerRect = scrollContainer.getBoundingClientRect();
            const elementRect = targetElement.getBoundingClientRect();
            const scrollTop = scrollContainer.scrollTop;


            const targetScrollTop =
            scrollTop +
            elementRect.top -
            containerRect.top -
            containerRect.height / 2 +
            elementRect.height / 2;


            scrollContainer.scrollTop = Math.max(0, targetScrollTop);
          }
        }
      }, 400);
    }
  }, [
  autoActivateBlockId,
  isOpen,
  loading,
  blockComments,
  lastAutoActivatedBlockId]
  );


  useEffect(() => {
    if (selectedBlockId && isOpen && !loading && !autoActivateBlockId) {

      const timer = setTimeout(() => {

        const commentBlockElement = sidebarRef.current?.querySelector(
          `[data-comment-block-id="${selectedBlockId}"]`
        );

        if (commentBlockElement && sidebarRef.current) {

          const scrollContainer =
          sidebarRef.current.querySelector('.overflow-y-auto');

          if (scrollContainer) {

            const firstCommentElement =
            commentBlockElement.querySelector('.comment-item');
            const targetElement = firstCommentElement || commentBlockElement;


            if (firstCommentElement) {
              firstCommentElement.classList.add('comment-highlight');

              setTimeout(() => {
                firstCommentElement.classList.remove('comment-highlight');
              }, 3000);
            }


            const containerRect = scrollContainer.getBoundingClientRect();
            const elementRect = targetElement.getBoundingClientRect();
            const scrollTop = scrollContainer.scrollTop;


            const targetScrollTop =
            scrollTop +
            elementRect.top -
            containerRect.top -
            containerRect.height / 2 +
            elementRect.height / 2;


            scrollContainer.scrollTop = Math.max(0, targetScrollTop);
          }
        }


        if (onHighlightBlock) {
          onHighlightBlock(selectedBlockId);

          setTimeout(() => {
            onHighlightBlock(null);
          }, 3000);
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [selectedBlockId, isOpen, loading, autoActivateBlockId, onHighlightBlock]);


  useEffect(() => {
    if (!isOpen) {
      setLastAutoActivatedBlockId(null);
      setActiveBlockId(null);
      setNewComment('');
      setReplyingTo(null);
      setReplyContent('');
    }
  }, [isOpen]);


  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (showMenu) {
        const isMenuButton = target.closest('[data-menu-button]');
        const isMenuContent = target.closest('[data-menu-content]');
        if (!isMenuButton && !isMenuContent) {
          setShowMenu(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => {
        document.removeEventListener('mousedown', handleClick);
      };
    }
  }, [isOpen, showMenu]);


  const handleScrollToBlock = useCallback(
    (blockId: string) => {
      try {

        const blockElement = document.querySelector(
          `[data-block-id="${blockId}"]`
        );
        if (blockElement) {
          


          blockElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });


          if (onHighlightBlock) {
            onHighlightBlock(blockId);

            setTimeout(() => {
              onHighlightBlock(null);
            }, 3000);
          }
        } else {

          const allBlocks = document.querySelectorAll('[data-block-id]');
          
        }
      } catch (error) {
        
      }
    },
    [onHighlightBlock]
  );


  useEffect(() => {
    const handleResize = () => {

    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);


  const filteredBlockComments = useMemo(() => {
    return blockComments.filter(
      (block) => block.comments.length > 0 || block.blockId === activeBlockId
    );
  }, [blockComments, activeBlockId]);


  const totalCommentCount = useMemo(() => {
    return filteredBlockComments.reduce(
      (total, block) => total + block.comments.length,
      0
    );
  }, [filteredBlockComments]);


  const handleCreateComment = async (blockId: string) => {
    if (!newComment.trim()) return;

    try {
      await apiClient.post('/api/comments', {
        content: newComment,
        documentId,
        blockId
      });

      setNewComment('');
      setActiveBlockId(null);
      fetchAllBlockComments();


      onCommentChange?.();
    } catch (err) {
      
      handleError(err instanceof Error ? err : new Error('创建评论失败'));
    }
  };


  const handleReply = async (parentId: string, blockId: string) => {
    if (!replyContent.trim()) return;

    try {
      await apiClient.post('/api/comments', {
        content: replyContent,
        documentId,
        parentId,
        blockId
      });

      setReplyContent('');
      setReplyingTo(null);
      fetchAllBlockComments();


      onCommentChange?.();
    } catch (err) {
      
      handleError(err instanceof Error ? err : new Error('回复评论失败'));
    }
  };


  const handleResolveComment = async (commentId: string) => {
    try {
      await apiClient.put(`/api/comments/${commentId}/toggle-resolution`);
      fetchAllBlockComments();


      onCommentChange?.();
    } catch (err) {
      
      handleError(err instanceof Error ? err : new Error('解决评论失败'));
    }
  };


  const formatTime = useCallback((dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: zhCN
      });
    } catch {
      return '刚刚';
    }
  }, []);


  if (!isOpen || !portalContainer) return null;

  const sidebarContent =
  <CommentErrorBoundary>
      <CommentErrorAlert error={error} onClose={clearError} />
      <div
      ref={sidebarRef}
      className={`
          h-full bg-white border-l border-gray-100 flex flex-col
          transform transition-all duration-300 ease-in-out
          ${className}
        `}
      style={{
        pointerEvents: 'auto',

        width:
        sidebarWidth || (
        window.innerWidth < 768 ?
        '280px' :
        window.innerWidth < 1024 ?
        '300px' :
        '320px'),
        maxWidth: isSmallScreen ? '85vw' : '90vw',

        right: 0,
        zIndex: 1000
      }}>
      
        {}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold text-gray-800">
              评论 ({totalCommentCount})
            </h3>
          </div>
          <div className="flex items-center space-x-1">
            {}
            <div className="relative">
              <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="更多选项"
              data-menu-button>
              
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </button>

              {showMenu &&
            <div
              className="absolute right-0 top-8 w-48 bg-white border border-gray-200 rounded shadow-sm z-20"
              data-menu-content>
              
                  <div className="py-1">
                    <button
                  onClick={() => {
                    setShowResolvedComments(!showResolvedComments);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center space-x-2">
                  
                      {showResolvedComments ?
                  <EyeOff className="w-4 h-4" /> :

                  <Eye className="w-4 h-4" />
                  }
                      <span>
                        {showResolvedComments ?
                    '隐藏已解决评论' :
                    '显示已解决评论'}
                      </span>
                    </button>
                  </div>
                </div>
            }
            </div>

            <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="关闭评论面板">
            
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {}
        <div className="flex-1 overflow-y-auto scrollbar-none">
          {loading ?
        <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-500">加载评论中...</span>
            </div> :
        filteredBlockComments.length === 0 ?
        <div className="text-center py-8 px-4">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">还没有段落评论</p>
              <p className="text-sm text-gray-400">
                点击文档中任意段落旁的评论按钮开始评论
              </p>
            </div> :

        <div className="w-full">
              {filteredBlockComments.map((blockComment) =>
          <div
            key={blockComment.blockId}
            data-comment-block-id={blockComment.blockId}
            className="w-full p-5"
            onMouseEnter={() => onHighlightBlock?.(blockComment.blockId)}
            onMouseLeave={() => onHighlightBlock?.(null)}>
            
                  {}
                  {blockComment.comments.length === 0 &&
            activeBlockId === blockComment.blockId &&
            <div className="mb-3 pb-2 border-b border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700">
                          为此段落添加评论
                        </h4>
                      </div>
            }

                  {}
                  <div className="space-y-3">
                    {blockComment.comments.map((comment) =>
              <div key={comment.id} className="space-y-2">
                        {}
                        <div
                  className={`comment-item p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                  comment.isResolved ?
                  'bg-gray-50/30 border-gray-300 shadow-sm' :
                  'bg-white border-gray-300 hover:border-gray-400 hover:shadow-md active:border-blue-400 active:shadow-lg'}`
                  }
                  onClick={() =>
                  handleScrollToBlock(blockComment.blockId)
                  }>
                  
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2 mb-2">
                              <UserAvatar user={comment.author} size="xs" />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">
                                  {comment.author.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatTime(comment.createdAt)}
                                </span>
                              </div>
                              {comment.isResolved &&
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                  已解决
                                </span>
                      }
                            </div>
                            {!comment.isResolved &&
                    <button
                      onClick={() => handleResolveComment(comment.id)}
                      className="text-xs text-green-600 hover:text-green-700 transition-colors"
                      title="标记为已解决">
                      
                                <Check className="w-3 h-3" />
                              </button>
                    }
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2 leading-relaxed">
                            {comment.content}
                          </p>

                          {}
                          <div className="flex items-center space-x-3">
                            <button
                      onClick={() => setReplyingTo(comment.id)}
                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors font-medium">
                      
                              回复
                            </button>
                          </div>
                        </div>

                        {}
                        {replyingTo === comment.id &&
                <div className="ml-4 p-3 bg-gray-50/30 border border-gray-300 rounded-lg hover:border-gray-400 focus-within:border-blue-400 focus-within:shadow-md transition-all">
                            <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="写下你的回复..."
                    className="w-full p-2 border border-sky-200 rounded-md resize-none focus:ring-1 focus:ring-sky-300 focus:border-sky-300 focus:outline-none text-sm bg-white placeholder-gray-400 transition-all"
                    rows={2}
                    autoFocus />
                  
                            <div className="flex items-center justify-end space-x-2 mt-2">
                              <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent('');
                      }}
                      className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700">
                      
                                取消
                              </button>
                              <button
                      onClick={() =>
                      handleReply(comment.id, blockComment.blockId)
                      }
                      disabled={!replyContent.trim()}
                      className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                      
                                回复
                              </button>
                            </div>
                          </div>
                }

                        {}
                        {comment.replies && comment.replies.length > 0 &&
                <div className="ml-4 space-y-2">
                            {comment.replies.map((reply) =>
                  <div
                    key={reply.id}
                    className="p-2 bg-gray-50/30 border border-gray-200 rounded-md hover:border-gray-300 transition-all">
                    
                                <div className="flex items-center space-x-2 mb-1">
                                  <UserAvatar user={reply.author} size="xs" />
                                  <span className="text-xs font-medium text-gray-900">
                                    {reply.author.name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatTime(reply.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-700 whitespace-pre-wrap">
                                  {reply.content}
                                </p>
                              </div>
                  )}
                          </div>
                }
                      </div>
              )}

                    {}
                    {activeBlockId === blockComment.blockId &&
              <div className="p-3 bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus-within:border-blue-400 focus-within:shadow-md transition-all">
                        <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="添加评论..."
                  className="w-full p-2 border border-sky-200 rounded-md resize-none focus:ring-1 focus:ring-sky-300 focus:border-sky-300 focus:outline-none text-sm placeholder-gray-400 bg-white transition-all"
                  rows={2}
                  autoFocus />
                
                        <div className="flex items-center justify-end space-x-2 mt-2">
                          <button
                    onClick={() => {
                      setActiveBlockId(null);
                      setNewComment('');
                    }}
                    className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700">
                    
                            取消
                          </button>
                          <button
                    onClick={() =>
                    handleCreateComment(blockComment.blockId)
                    }
                    disabled={!newComment.trim()}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-1">
                    
                            <Send className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
              }
                  </div>
                </div>
          )}
            </div>
        }
        </div>
      </div>
    </CommentErrorBoundary>;



  return (
    <>
      <style>{`
        .comment-highlight {
          background-color: rgba(59, 130, 246, 0.1) !important;
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
          transform: scale(1.02);
        }
      `}</style>
      {createPortal(sidebarContent, portalContainer)}
    </>);

});