import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  X,
  RotateCcw,
  MessageCircle,
  User,
  Clock,
  FileText } from
'lucide-react';
import { UserAvatar } from '../ui/UserAvatar';
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
}

interface VersionPreviewProps {
  version: Version;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (versionId: string) => void;
  className?: string;
}

export function VersionPreview({
  version,
  isOpen,
  onClose,
  onRestore,
  className = ''
}: VersionPreviewProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'comments'>('content');


  const fetchVersionComments = async () => {
    if (!version.id) return;

    setLoading(true);
    try {
      const response = await apiClient.get(
        `/api/comments/version/${version.id}?includeResolved=true`
      );
      setComments(response.data);
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && version.id) {
      fetchVersionComments();
    }
  }, [isOpen, version.id]);


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


  const renderContentPreview = () => {
    try {
      const blocks = JSON.parse(version.content);
      return (
        <div className="prose prose-sm max-w-none">
          {blocks.slice(0, 10).map((block: any, index: number) =>
          <div key={index} className="mb-2 p-2 border-l-2 border-gray-200">
              {block.type === 'heading' &&
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {block.content || '无标题'}
                </h3>
            }
              {block.type === 'paragraph' &&
            <p className="text-gray-700 text-sm leading-relaxed">
                  {block.content || '空段落'}
                </p>
            }
              {block.type === 'list' &&
            <ul className="list-disc list-inside text-sm text-gray-700">
                  {block.items?.map((item: string, itemIndex: number) =>
              <li key={itemIndex}>{item}</li>
              )}
                </ul>
            }
              {block.type === 'bulleted-list' &&
            <div className="flex items-start text-sm">
                  <div className="px-1 text-gray-500 select-none">•</div>
                  <div
                className="flex-1 text-gray-700"
                dangerouslySetInnerHTML={{ __html: block.content || '' }} />
              
                </div>
            }
              {block.type === 'numbered-list' &&
            <div className="flex items-start text-sm">
                  <div className="px-1 text-gray-500 min-w-[1.25rem] pt-0.5 select-none">
                    #.
                  </div>
                  <div
                className="flex-1 text-gray-700"
                dangerouslySetInnerHTML={{ __html: block.content || '' }} />
              
                </div>
            }
              {block.type === 'to-do' &&
            <div className="flex items-start text-sm">
                  <input
                type="checkbox"
                checked={!!block.checked}
                readOnly
                className="mt-1 w-3.5 h-3.5 text-blue-600 rounded border-gray-300" />
              
                  <div
                className={`ml-2 ${
                block.checked ?
                'line-through text-gray-500' :
                'text-gray-700'}`
                }
                dangerouslySetInnerHTML={{ __html: block.content || '' }} />
              
                </div>
            }
              {block.type === 'image' && (
            block.content && /<img\b/i.test(block.content) ?
            <div
              className="rounded shadow-sm"
              dangerouslySetInnerHTML={{ __html: block.content }} /> :


            <img
              src={block.url}
              alt={block.alt || '图片'}
              className="max-w-full h-auto rounded shadow-sm" />)

            }
              {block.type === 'video' &&
            <div
              className="rounded overflow-hidden shadow-sm [&_video]:max-w-full [&_video]:h-auto"
              dangerouslySetInnerHTML={{ __html: block.content || '' }} />

            }
              {block.type === 'embed' &&
            <div
              className="rounded overflow-hidden shadow-sm [&_iframe]:w-full [&_iframe]:min-h-[140px]"
              dangerouslySetInnerHTML={{ __html: block.content || '' }} />

            }
            </div>
          )}
          {blocks.length > 10 &&
          <div className="text-sm text-gray-500 italic">
              ... 还有 {blocks.length - 10} 个块
            </div>
          }
        </div>);

    } catch (error) {
      return <div className="text-sm text-red-600">内容格式错误，无法预览</div>;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`version-preview-modal fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 ${className}`}>
      
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                版本 {version.versionNumber} 预览
              </h2>
              <span
                className={`px-2 py-1 text-xs rounded-full ${getChangeTypeStyle(
                  version.changeType
                )}`}>
                
                {getChangeTypeName(version.changeType)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="关闭预览">
            
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <UserAvatar user={version.createdBy} size="md" />
              <div>
                <div className="font-medium text-gray-900">
                  {version.createdBy.name}
                </div>
                <div className="text-sm text-gray-500 flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    {formatDistanceToNow(new Date(version.createdAt), {
                      addSuffix: true,
                      locale: zhCN
                    })}
                  </span>
                </div>
              </div>
            </div>
            {version.versionNumber > 1 &&
            <button
              onClick={() => onRestore(version.id)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              
                <RotateCcw className="w-4 h-4" />
                <span>恢复此版本</span>
              </button>
            }
          </div>
          {version.changeSummary &&
          <div className="mt-3 text-sm text-gray-700 bg-white p-3 rounded border">
              <strong>变更说明：</strong> {version.changeSummary}
            </div>
          }
        </div>

        {}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'content' ?
            'text-blue-600 border-b-2 border-blue-600 bg-blue-50' :
            'text-gray-500 hover:text-gray-700'}`
            }>
            
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>内容预览</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'comments' ?
            'text-blue-600 border-b-2 border-blue-600 bg-blue-50' :
            'text-gray-500 hover:text-gray-700'}`
            }>
            
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4" />
              <span>评论 ({comments.length})</span>
            </div>
          </button>
        </div>

        {}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'content' ?
          <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {version.title}
              </h3>
              {renderContentPreview()}
            </div> :

          <div className="space-y-4">
              {loading ?
            <div className="text-center py-8">
                  <div className="text-sm text-gray-500">加载评论中...</div>
                </div> :
            comments.length > 0 ?
            comments.map((comment) =>
            <div
              key={comment.id}
              className="p-4 border border-gray-200 rounded-lg">
              
                    <div className="flex items-start space-x-3">
                      <UserAvatar user={comment.author} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {comment.author.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                        locale: zhCN
                      })}
                          </span>
                          {comment.isResolved &&
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                              已解决
                            </span>
                    }
                        </div>
                        <div className="text-sm text-gray-700">
                          {comment.content}
                        </div>
                      </div>
                    </div>
                  </div>
            ) :

            <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <div className="text-sm text-gray-500">此版本暂无评论</div>
                </div>
            }
            </div>
          }
        </div>
      </div>
    </div>);

}