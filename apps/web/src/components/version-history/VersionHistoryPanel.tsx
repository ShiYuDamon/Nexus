import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { UserAvatar } from '../ui/UserAvatar';
import apiClient from '../../services/api.service';

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

interface VersionHistoryPanelProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  onVersionSelect: (version: Version) => void;
  onVersionRestore: (versionId: string) => void;
}

export function VersionHistoryPanel({
  documentId,
  isOpen,
  onClose,
  onVersionSelect,
  onVersionRestore
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);


  const fetchVersions = async (pageNum = 1, reset = false) => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await apiClient.get(
        `/api/versions/document/${documentId}?page=${pageNum}&limit=20`
      );

      const data = response.data;
      if (reset) {
        setVersions(data.versions);
      } else {
        setVersions((prev) => [...prev, ...data.versions]);
      }
      setHasMore(data.page < data.totalPages);
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && documentId) {
      fetchVersions(1, true);
      setPage(1);
    }
  }, [isOpen, documentId]);


  const loadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchVersions(nextPage);
    }
  };


  const handleRestore = async (versionId: string) => {
    if (window.confirm('确定要恢复到这个版本吗？这将创建一个新的版本。')) {
      try {
        const response = await apiClient.post(
          `/api/versions/${versionId}/restore`
        );
        const newVersion = response.data;


        onVersionRestore(newVersion.id);
        fetchVersions(1, true);
      } catch (error) {
        
        alert('版本恢复失败，请重试');
      }
    }
  };


  const getChangeTypeInfo = (changeType: string) => {
    switch (changeType) {
      case 'CREATE':
        return { text: '创建', color: 'bg-green-100 text-green-800' };
      case 'EDIT':
        return { text: '编辑', color: 'bg-blue-100 text-blue-800' };
      case 'TITLE':
        return { text: '标题', color: 'bg-purple-100 text-purple-800' };
      case 'RESTORE':
        return { text: '恢复', color: 'bg-orange-100 text-orange-800' };
      case 'MERGE':
        return { text: '合并', color: 'bg-yellow-100 text-yellow-800' };
      default:
        return { text: '未知', color: 'bg-gray-100 text-gray-800' };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-white w-96 h-full shadow-xl flex flex-col">
        {}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">版本历史</h2>
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
        <div className="flex-1 overflow-y-auto">
          {versions.length === 0 && !loading ?
          <div className="p-4 text-center text-gray-500">暂无版本历史</div> :

          <div className="p-4 space-y-3">
              {versions.map((version) => {
              const changeTypeInfo = getChangeTypeInfo(version.changeType);
              const isSelected = selectedVersionId === version.id;

              return (
                <div
                  key={version.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected ?
                  'border-blue-500 bg-blue-50' :
                  'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`
                  }
                  onClick={() => {
                    setSelectedVersionId(version.id);
                    onVersionSelect(version);
                  }}>
                  
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <UserAvatar user={version.createdBy} size="md" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            版本 {version.versionNumber}
                          </div>
                          <div className="text-xs text-gray-500">
                            {version.createdBy.name || version.createdBy.email}
                          </div>
                        </div>
                      </div>
                      <span
                      className={`px-2 py-1 text-xs rounded-full ${changeTypeInfo.color}`}>
                      
                        {changeTypeInfo.text}
                      </span>
                    </div>

                    <div className="text-sm text-gray-700 mb-2">
                      {version.changeSummary || '无变更说明'}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(version.createdAt), {
                        addSuffix: true,
                        locale: zhCN
                      })}
                      </div>

                      {version.versionNumber > 1 &&
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(version.id);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                      
                          恢复此版本
                        </button>
                    }
                    </div>
                  </div>);

            })}

              {}
              {hasMore &&
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full p-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50">
              
                  {loading ? '加载中...' : '加载更多'}
                </button>
            }
            </div>
          }
        </div>
      </div>
    </div>);

}