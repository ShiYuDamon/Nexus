import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  ThumbsUp,
  MoreVertical,
  Eye,
  EyeOff } from
'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserAvatar } from '../ui/UserAvatar';
import apiClient from '../../services/api.service';

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
  isResolved: boolean;
  replies: Comment[];
}

interface GlobalCommentSectionProps {
  documentId: string;
  className?: string;
}

export function GlobalCommentSection({
  documentId,
  className = ''
}: GlobalCommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showResolvedComments, setShowResolvedComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);


  const fetchGlobalComments = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(
        `/api/comments?documentId=${documentId}&includeResolved=${showResolvedComments}`
      );

      const commentsData = response.data;
      if (Array.isArray(commentsData)) {
        setComments(commentsData);
      } else {
        
        setComments([]);
      }
    } catch (error) {
      
      setComments([]);
    } finally {
      setLoading(false);
    }
  };


  const handleAddComment = async () => {
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const response = await apiClient.post('/api/comments', {
        content: newComment,
        documentId

      });


      setComments((prev) => {
        const currentComments = Array.isArray(prev) ? prev : [];
        return [...currentComments, response.data];
      });
      setNewComment('');
    } catch (error) {
      
      alert('添加评论失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };


  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || submitting) return;

    setSubmitting(true);
    try {
      await apiClient.post('/api/comments', {
        content: replyContent,
        documentId,
        parentId
      });

      setReplyContent('');
      setReplyingTo(null);
      fetchGlobalComments();
    } catch (error) {
      
      alert('回复评论失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };


  const handleResolveComment = async (commentId: string) => {
    try {
      await apiClient.put(`/api/comments/${commentId}/toggle-resolution`);
      fetchGlobalComments();
    } catch (error) {
      
      alert('解决评论失败，请重试');
    }
  };


  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString();
  };


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

    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [showMenu]);

  useEffect(() => {
    if (documentId) {
      fetchGlobalComments();
    }
  }, [documentId, showResolvedComments]);


  const filteredComments = Array.isArray(comments) ?
  comments.filter((comment) => showResolvedComments || !comment.isResolved) :
  [];

  return (
    <div className={`bg-white border-t border-gray-200 ${className}`}>
      {}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
              <MessageSquare className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">全文评论</h3>
              <p className="text-sm text-gray-500">对整个文档的讨论和反馈</p>
            </div>
          </div>

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
        </div>
      </div>

      {}
      <div className="px-6 py-4">
        {loading ?
        <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-500">加载评论中...</span>
          </div> :
        filteredComments.length === 0 ?
        <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">
              {!Array.isArray(comments) || comments.length === 0 ?
            '还没有全文评论' :
            '没有符合条件的评论'}
            </p>
            <p className="text-sm text-gray-400">
              {!Array.isArray(comments) || comments.length === 0 ?
            '成为第一个评论者，分享您的想法' :
            '尝试切换显示设置查看更多评论'}
            </p>
          </div> :

        <div className="space-y-4">
            {filteredComments.map((comment) =>
          <div key={comment.id} className="flex space-x-3">
                <UserAvatar user={comment.author} size="sm" />
                <div className="flex-1 min-w-0">
                  <div
                className={`rounded-lg p-3 ${
                comment.isResolved ?
                'bg-green-50 border border-green-200' :
                'bg-gray-50'}`
                }>
                
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm text-gray-900">
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
                  user?.id === comment.author.id &&
                  <button
                    onClick={() => handleResolveComment(comment.id)}
                    className="text-xs text-green-600 hover:text-green-700 transition-colors">
                    
                            标记为已解决
                          </button>
                  }
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>

                  {}
                  <div className="flex items-center space-x-4 mt-2">
                    <button className="flex items-center space-x-1 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                      <ThumbsUp className="w-3 h-3" />
                      <span>赞</span>
                    </button>
                    <button
                  onClick={() => setReplyingTo(comment.id)}
                  className="text-xs text-gray-500 hover:text-blue-600 transition-colors">
                  
                      回复
                    </button>
                  </div>

                  {}
                  {replyingTo === comment.id &&
              <div className="mt-3 ml-4">
                      <div className="flex space-x-2">
                        <UserAvatar user={user} size="xs" />
                        <div className="flex-1">
                          <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="写下你的回复..."
                      className="w-full p-2 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      rows={2} />
                    
                          <div className="flex items-center justify-end space-x-2 mt-2">
                            <button
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent('');
                        }}
                        className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors">
                        
                              取消
                            </button>
                            <button
                        onClick={() => handleReply(comment.id)}
                        disabled={!replyContent.trim() || submitting}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        
                              回复
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
              }

                  {}
                  {comment.replies && comment.replies.length > 0 &&
              <div className="mt-3 ml-4 space-y-3">
                      {comment.replies.map((reply) =>
                <div key={reply.id} className="flex space-x-2">
                          <UserAvatar user={reply.author} size="xs" />
                          <div className="flex-1">
                            <div className="bg-white rounded-lg p-2 border border-gray-200">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-xs text-gray-900">
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
                          </div>
                        </div>
                )}
                    </div>
              }
                </div>
              </div>
          )}
          </div>
        }
      </div>

      {}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
        <div className="flex space-x-3">
          <UserAvatar user={user} size="sm" />
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="添加全文评论..."
              className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3} />
            
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">支持 Markdown 格式</p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setNewComment('')}
                  className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  disabled={submitting}>
                  
                  取消
                </button>
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submitting}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  
                  <Plus className="w-3 h-3" />
                  <span>{submitting ? '发布中...' : '发布评论'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);

}