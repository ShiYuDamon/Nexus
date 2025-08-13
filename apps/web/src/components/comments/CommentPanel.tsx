import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { UserAvatar } from '../ui/UserAvatar';
import apiClient from '../../services/api.service';

interface Comment {
  id: string;
  content: string;
  blockId?: string;
  textPosition?: number;
  textLength?: number;
  selectedText?: string;
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

interface CommentPanelProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  selectedBlockId?: string;
}

export function CommentPanel({
  documentId,
  isOpen,
  onClose,
  selectedBlockId
}: CommentPanelProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showResolved, setShowResolved] = useState(false);


  const fetchComments = async () => {
    setLoading(true);
    try {
      const url = selectedBlockId ?
      `/api/comments/document/${documentId}/block/${selectedBlockId}` :
      `/api/comments/document/${documentId}?includeResolved=${showResolved}`;

      const response = await apiClient.get(url);

      const commentsWithReplies = (response.data || []).map(
        (comment: Comment) => ({
          ...comment,
          replies: comment.replies || []
        })
      );
      setComments(commentsWithReplies);
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && documentId) {
      fetchComments();
    }
  }, [isOpen, documentId, selectedBlockId, showResolved]);


  const handleCreateComment = async () => {
    if (!newComment.trim()) return;

    try {
      await apiClient.post('/api/comments', {
        content: newComment,
        documentId,
        blockId: selectedBlockId
      });

      setNewComment('');
      fetchComments();
    } catch (error) {
      
    }
  };


  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return;

    try {
      await apiClient.post('/api/comments', {
        content: replyContent,
        documentId,
        parentId
      });

      setReplyContent('');
      setReplyingTo(null);
      fetchComments();
    } catch (error) {
      
    }
  };


  const toggleResolution = async (commentId: string) => {
    try {
      await apiClient.put(`/api/comments/${commentId}/toggle-resolution`);
      fetchComments();
    } catch (error) {
      
    }
  };


  const renderComment = (comment: Comment, isReply = false) =>
  <div key={comment.id} className={`${isReply ? 'ml-10 mt-3' : 'mb-4'}`}>
      <div
      className={`p-3 rounded-lg ${
      comment.isResolved ?
      'bg-gray-50 opacity-75' :
      'bg-white border border-gray-200'}`
      }>
      
        <div className="flex items-start space-x-3">
          <UserAvatar user={comment.author} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">
                  {comment.author.name || comment.author.email}
                </span>
                {comment.isResolved &&
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    已解决
                  </span>
              }
              </div>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
                locale: zhCN
              })}
              </span>
            </div>

            {comment.selectedText &&
          <div className="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-400 text-sm text-gray-700">
                "{comment.selectedText}"
              </div>
          }

            <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
              {comment.content}
            </div>

            <div className="mt-3 flex items-center space-x-4">
              {!isReply &&
            <button
              onClick={() => setReplyingTo(comment.id)}
              className="text-xs text-blue-600 hover:text-blue-800">
              
                  回复
                </button>
            }

              {!isReply &&
            <button
              onClick={() => toggleResolution(comment.id)}
              className="text-xs text-gray-600 hover:text-gray-800">
              
                  {comment.isResolved ? '重新打开' : '标记为已解决'}
                </button>
            }
            </div>

            {}
            {replyingTo === comment.id &&
          <div className="mt-3 space-y-2">
                <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="输入回复..."
              className="w-full p-2 text-sm border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3} />
            
                <div className="flex space-x-2">
                  <button
                onClick={() => handleReply(comment.id)}
                disabled={!replyContent.trim()}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                
                    回复
                  </button>
                  <button
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent('');
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800">
                
                    取消
                  </button>
                </div>
              </div>
          }
          </div>
        </div>
      </div>

      {}
      {comment.replies &&
    Array.isArray(comment.replies) &&
    comment.replies.map((reply) => renderComment(reply, true))}
    </div>;


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-white w-96 h-full shadow-xl flex flex-col">
        {}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">评论</h2>
            {selectedBlockId &&
            <p className="text-sm text-gray-600">块级评论</p>
            }
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12" />
              
            </svg>
          </button>
        </div>

        {}
        <div className="p-4 border-b">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            
            <span className="ml-2 text-sm text-gray-700">显示已解决的评论</span>
          </label>
        </div>

        {}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ?
          <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div> :
          comments.length === 0 ?
          <div className="text-center text-gray-500 py-8">暂无评论</div> :

          <div className="space-y-4">
              {comments.map((comment) => renderComment(comment))}
            </div>
          }
        </div>

        {}
        <div className="p-4 border-t bg-gray-50">
          <div className="space-y-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="添加评论..."
              className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3} />
            
            <button
              onClick={handleCreateComment}
              disabled={!newComment.trim()}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              
              发表评论
            </button>
          </div>
        </div>
      </div>
    </div>);

}