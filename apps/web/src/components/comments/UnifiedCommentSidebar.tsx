import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo } from
'react';
import {
  MessageCircle,
  X,
  Send,
  MoreHorizontal,
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

interface UnifiedCommentSidebarProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;

  blockPositions: Map<string, number>;

  selectedBlockId?: string | null;

  onHighlightBlock?: (blockId: string | null) => void;

  autoActivateBlockId?: string | null;
}

export const UnifiedCommentSidebar = React.memo(function UnifiedCommentSidebar({
  documentId,
  isOpen,
  onClose,
  className = '',
  blockPositions,
  selectedBlockId,
  onHighlightBlock,
  autoActivateBlockId
}: UnifiedCommentSidebarProps) {
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


  const { error, handleError, clearError } = useCommentErrorHandler();


  const getDocumentContainer = useCallback(() => {
    return document.
    querySelector('.rich-text-block-editor')?.
    closest('[class*="overflow-auto"]') as HTMLElement;
  }, []);


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
  }, [documentId, blockPositions, showResolvedComments]);

  useEffect(() => {
    if (isOpen && documentId) {
      fetchAllBlockComments();
    }
  }, [isOpen, documentId, fetchAllBlockComments]);


  const alignCommentWithBlock = useCallback(
    async (blockId: string) => {
      const documentContainer = getDocumentContainer();
      if (!documentContainer) return;


      const blockElement = document.querySelector(
        `[data-block-id="${blockId}"]`
      );
      if (!blockElement) return;


      const blockOffsetTop = (blockElement as HTMLElement).offsetTop;
      const targetScrollTop = blockOffsetTop - 100;

      documentContainer.scrollTop = Math.max(0, targetScrollTop);
    },
    [getDocumentContainer]
  );


  useEffect(() => {
    if (
    autoActivateBlockId &&
    isOpen &&
    !loading &&
    blockComments.length > 0 &&
    autoActivateBlockId !== lastAutoActivatedBlockId)
    {
      const targetBlock = blockComments.find(
        (block) => block.blockId === autoActivateBlockId
      );
      if (targetBlock) {
        setActiveBlockId(autoActivateBlockId);
        setLastAutoActivatedBlockId(autoActivateBlockId);

        alignCommentWithBlock(autoActivateBlockId);
      }
    }
  }, [
  autoActivateBlockId,
  isOpen,
  loading,
  blockComments,
  lastAutoActivatedBlockId,
  alignCommentWithBlock]
  );


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


      if (!activeBlockId) return;


      if (sidebarRef.current && !sidebarRef.current.contains(target)) {
        if (!newComment.trim()) {
          setActiveBlockId(null);
        }
        return;
      }


      if (sidebarRef.current && sidebarRef.current.contains(target)) {

        const activeCommentContainer = sidebarRef.current.querySelector(
          `[data-block-id="${activeBlockId}"]`
        );


        if (
        activeCommentContainer &&
        !activeCommentContainer.contains(target))
        {

          const clickedAddButton = target.closest('[data-add-comment-block]');
          if (clickedAddButton) {
            const newBlockId = clickedAddButton.getAttribute(
              'data-add-comment-block'
            );
            if (newBlockId && newBlockId !== activeBlockId) {

              if (!newComment.trim()) {
                setActiveBlockId(newBlockId);
                setNewComment('');
                return;
              }
            }
          } else if (!newComment.trim()) {

            setActiveBlockId(null);
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => {
        document.removeEventListener('mousedown', handleClick);
      };
    }
  }, [isOpen, activeBlockId, newComment]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeBlockId) {
        if (!newComment.trim()) {
          setActiveBlockId(null);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, activeBlockId, newComment]);


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
    } catch (err) {
      
      handleError(err instanceof Error ? err : new Error('回复评论失败'));
    }
  };


  const handleResolveComment = async (commentId: string) => {
    try {
      await apiClient.put(`/api/comments/${commentId}/toggle-resolution`);
      fetchAllBlockComments();
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



  const filteredBlockComments = useMemo(() => {

    return blockComments.filter((block) => block.comments.length > 0);
  }, [blockComments]);


  const totalCommentCount = useMemo(() => {
    return filteredBlockComments.reduce(
      (total, block) => total + block.comments.length,
      0
    );
  }, [filteredBlockComments]);


  const containerHeight = useMemo(() => {
    if (blockComments.length === 0) return '100vh';

    const maxPosition = Math.max(
      ...blockComments.map((block) => block.blockPosition)
    );


    return `${Math.max(maxPosition + 500, 1000)}px`;
  }, [blockComments]);

  if (!isOpen) return null;

  return (
    <CommentErrorBoundary>
      <CommentErrorAlert error={error} onClose={clearError} />
      <div
        ref={sidebarRef}
        className={`
        w-80 bg-white border-l border-gray-200 shadow-xl flex flex-col
        ${className}
      `}
        style={{
          minHeight: '100vh'
        }}>
        
        {}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">文档评论</h3>
            <span className="text-sm text-gray-500">({totalCommentCount})</span>
          </div>
          <div className="flex items-center space-x-1">
            {}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                title="更多选项"
                data-menu-button>
                
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>

              {}
              {showMenu &&
              <div
                className="absolute right-0 top-8 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
                data-menu-content>
                
                  <div className="py-1">
                    <button
                    onClick={() => {
                      setShowResolvedComments(!showResolvedComments);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2">
                    
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
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              title="关闭评论面板">
              
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {}
        <div className="flex-1">
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
              data-block-id={blockComment.blockId}
              className="w-full bg-white p-4"
              onMouseEnter={() => onHighlightBlock?.(blockComment.blockId)}
              onMouseLeave={() => onHighlightBlock?.(null)}>
              
                  {}
                  <div className="space-y-3">
                    {blockComment.comments.map((comment) =>
                <div key={comment.id} className="space-y-2">
                        {}
                        <div
                    className={`p-3 rounded-lg cursor-pointer ${
                    comment.isResolved ?
                    'bg-green-50 border border-green-200' :
                    'bg-gray-50'}`
                    }
                    onClick={() =>
                    alignCommentWithBlock(blockComment.blockId)
                    }>
                    
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2 mb-1">
                              <UserAvatar user={comment.author} size="xs" />
                              <span className="text-xs font-medium text-gray-900">
                                {comment.author.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatTime(comment.createdAt)}
                              </span>
                              {comment.isResolved &&
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
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
                          <p className="text-xs text-gray-700 whitespace-pre-wrap mb-2">
                            {comment.content}
                          </p>

                          {}
                          <div className="flex items-center space-x-3">
                            <button
                        onClick={() => setReplyingTo(comment.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 transition-colors">
                        
                              回复
                            </button>
                          </div>
                        </div>

                        {}
                        {replyingTo === comment.id &&
                  <div className="ml-4 p-2 bg-white border border-gray-200 rounded-lg">
                            <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="写下你的回复..."
                      className="w-full p-2 border-0 resize-none focus:ring-0 text-xs"
                      rows={2} />
                    
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
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50">
                        
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
                      className="p-2 bg-white border border-gray-200 rounded-lg">
                      
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
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="添加评论..."
                    className="w-full p-2 border border-gray-200 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50">
                      
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
    </CommentErrorBoundary>);

});