import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  X,
  Clock,
  MessageCircle,
  GitBranch,
  Eye,
  RotateCcw,
  ChevronRight,
  User } from
'lucide-react';
import { UserAvatar } from '../ui/UserAvatar';
import { VersionPreview } from './VersionPreview';
import apiClient from '../../services/api.service';
import './history-panel.css';

interface Version {
  id: string;
  versionNumber: number;
  title: string;
  content: string;
  changeType: 'CREATE' | 'EDIT' | 'TITLE' | 'RESTORE' | 'MERGE';
  changeSummary?: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  commentCount?: number;
}

interface Comment {
  id: string;
  content: string;
  blockId?: string;
  isResolved: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  versionId?: string;
  versionNumber?: number;
}

interface UnifiedHistoryPanelProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  onVersionSelect?: (version: Version) => void;
  onVersionRestore?: (versionId: string) => void;
  className?: string;
}

type TabType = 'versions' | 'comments';

export function UnifiedHistoryPanel({
  documentId,
  isOpen,
  onClose,
  onVersionSelect,
  onVersionRestore,
  className = ''
}: UnifiedHistoryPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('versions');
  const [versions, setVersions] = useState<Version[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  );
  const [previewMode, setPreviewMode] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<Version | null>(null);


  const fetchVersions = useCallback(async () => {
    if (!documentId) return;

    setLoading(true);
    try {
      const response = await apiClient.get(
        `/api/versions/document/${documentId}?page=1&limit=50`
      );
      const versionsData = response.data.versions;


      const versionsWithComments = await Promise.all(
        versionsData.map(async (version: Version) => {
          try {
            const commentsResponse = await apiClient.get(
              `/api/comments/version/${version.id}/count`
            );
            return {
              ...version,
              commentCount: commentsResponse.data.count || 0
            };
          } catch {
            return { ...version, commentCount: 0 };
          }
        })
      );

      setVersions(versionsWithComments);
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  }, [documentId]);


  const fetchComments = useCallback(async () => {
    if (!documentId) return;

    setLoading(true);
    try {
      const response = await apiClient.get(
        `/api/comments/document/${documentId}/history?includeResolved=true`
      );
      setComments(response.data);
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (isOpen && documentId) {
      if (activeTab === 'versions') {
        fetchVersions();
      } else {
        fetchComments();
      }
    }
  }, [isOpen, documentId, activeTab, fetchVersions, fetchComments]);


  const handleVersionSelect = (version: Version) => {
    setSelectedVersionId(version.id);
    setPreviewVersion(version);
    setPreviewMode(true);
    onVersionSelect?.(version);
  };


  const handleVersionRestore = async (versionId: string) => {
    if (window.confirm('确定要恢复到这个版本吗？这将创建一个新的版本。')) {
      try {
        await onVersionRestore?.(versionId);
        fetchVersions();
      } catch (error) {
        
        alert('版本恢复失败，请重试');
      }
    }
  };


  const getChangeTypeStyle = (changeType: string) => {
    const styles = {
      CREATE: 'bg-green-100 text-green-800',
      EDIT: 'bg-blue-100 text-blue-800',
      TITLE: 'bg-yellow-100 text-yellow-800',
      RESTORE: 'bg-purple-100 text-purple-800',
      MERGE: 'bg-orange-100 text-orange-800'
    };
    return (
      styles[changeType as keyof typeof styles] || 'bg-gray-100 text-gray-800');

  };


  const getChangeTypeName = (changeType: string) => {
    const names = {
      CREATE: '创建',
      EDIT: '编辑',
      TITLE: '标题',
      RESTORE: '恢复',
      MERGE: '合并'
    };
    return names[changeType as keyof typeof names] || changeType;
  };

  if (!isOpen) return null;

  return (
    <div
      className={`unified-history-panel fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col ${className}`}>
      
      {}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">历史记录</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="关闭历史面板">
          
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('versions')}
          className={`history-tab flex-1 px-4 py-3 text-sm font-medium transition-colors ${
          activeTab === 'versions' ?
          'active text-blue-600 border-b-2 border-blue-600 bg-blue-50' :
          'text-gray-500 hover:text-gray-700'}`
          }>
          
          <div className="flex items-center justify-center space-x-2">
            <GitBranch className="w-4 h-4" />
            <span>版本历史</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`history-tab flex-1 px-4 py-3 text-sm font-medium transition-colors ${
          activeTab === 'comments' ?
          'active text-blue-600 border-b-2 border-blue-600 bg-blue-50' :
          'text-gray-500 hover:text-gray-700'}`
          }>
          
          <div className="flex items-center justify-center space-x-2">
            <MessageCircle className="w-4 h-4" />
            <span>评论历史</span>
          </div>
        </button>
      </div>

      {}
      <div className="flex-1 overflow-y-auto">
        {loading ?
        <div className="flex items-center justify-center p-8">
            <div className="text-sm text-gray-500">加载中...</div>
          </div> :
        activeTab === 'versions' ?
        <VersionHistoryTab
          versions={versions}
          selectedVersionId={selectedVersionId}
          onVersionSelect={handleVersionSelect}
          onVersionRestore={handleVersionRestore}
          getChangeTypeStyle={getChangeTypeStyle}
          getChangeTypeName={getChangeTypeName} /> :


        <CommentHistoryTab comments={comments} />
        }
      </div>

      {}
      {previewMode && previewVersion &&
      <VersionPreview
        version={previewVersion}
        isOpen={previewMode}
        onClose={() => {
          setPreviewMode(false);
          setPreviewVersion(null);
        }}
        onRestore={async (versionId) => {
          await handleVersionRestore(versionId);
          setPreviewMode(false);
          setPreviewVersion(null);
        }} />

      }
    </div>);

}


function VersionHistoryTab({
  versions,
  selectedVersionId,
  onVersionSelect,
  onVersionRestore,
  getChangeTypeStyle,
  getChangeTypeName







}: {versions: Version[];selectedVersionId: string | null;onVersionSelect: (version: Version) => void;onVersionRestore: (versionId: string) => void;getChangeTypeStyle: (changeType: string) => string;getChangeTypeName: (changeType: string) => string;}) {
  return (
    <div className="p-4 space-y-3">
      {versions.map((version) =>
      <div
        key={version.id}
        className={`version-card p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
        selectedVersionId === version.id ?
        'selected border-blue-300 bg-blue-50' :
        'border-gray-200 hover:border-gray-300'}`
        }
        onClick={() => onVersionSelect(version)}>
        
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">
                版本 {version.versionNumber}
              </span>
              <span
              className={`change-type-badge ${version.changeType.toLowerCase()} px-2 py-1 text-xs rounded-full ${getChangeTypeStyle(
                version.changeType
              )}`}>
              
                {getChangeTypeName(version.changeType)}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>

          <div className="flex items-center space-x-2 mb-2">
            <UserAvatar user={version.createdBy} size="sm" />
            <div className="text-sm">
              <span className="text-gray-900">{version.createdBy.name}</span>
              <span className="text-gray-500 ml-1">
                {formatDistanceToNow(new Date(version.createdAt), {
                addSuffix: true,
                locale: zhCN
              })}
              </span>
            </div>
          </div>

          {version.changeSummary &&
        <div className="text-sm text-gray-600 mb-2">
              {version.changeSummary}
            </div>
        }

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              {version.commentCount !== undefined &&
            <div className="flex items-center space-x-1">
                  <MessageCircle className="w-3 h-3" />
                  <span>{version.commentCount} 条评论</span>
                </div>
            }
            </div>

            <div className="flex items-center space-x-2">
              <button
              onClick={(e) => {
                e.stopPropagation();
                onVersionSelect(version);
              }}
              className="action-button preview flex items-center space-x-1 text-xs text-gray-600 hover:text-gray-800 font-medium">
              
                <Eye className="w-3 h-3" />
                <span>预览</span>
              </button>
              {version.versionNumber > 1 &&
            <button
              onClick={(e) => {
                e.stopPropagation();
                onVersionRestore(version.id);
              }}
              className="action-button restore flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
              
                  <RotateCcw className="w-3 h-3" />
                  <span>恢复</span>
                </button>
            }
            </div>
          </div>
        </div>
      )}
    </div>);

}


function CommentHistoryTab({ comments }: {comments: Comment[];}) {
  return (
    <div className="p-4 space-y-3">
      {comments.map((comment) =>
      <div
        key={comment.id}
        className="comment-card p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
        
          <div className="flex items-start space-x-3">
            <UserAvatar user={comment.author} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium text-gray-900">
                  {comment.author.name}
                </span>
                {comment.versionNumber &&
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    版本 {comment.versionNumber}
                  </span>
              }
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                  locale: zhCN
                })}
                </span>
              </div>
              <div className="text-sm text-gray-700 mb-2">
                {comment.content}
              </div>
              {comment.isResolved &&
            <div className="text-xs text-green-600 font-medium">已解决</div>
            }
            </div>
          </div>
        </div>
      )}
    </div>);

}