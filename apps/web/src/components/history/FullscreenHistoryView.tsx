import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  formatDistanceToNow,
  format,
  isToday,
  isYesterday,
  startOfDay } from
'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Clock,
  User,
  ChevronRight,
  MoreHorizontal,
  HelpCircle,
  X } from
'lucide-react';
import { UserAvatar } from '../ui/UserAvatar';
import { DocumentContentViewer } from './DocumentContentViewer';
import { VersionDiffViewer } from './VersionDiffViewer';
import apiClient from '../../services/api.service';
import './fullscreen-history.css';

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
    color?: string;
  };
  commentCount?: number;
}

interface VersionGroup {
  date: string;
  label: string;
  versions: Version[];
}

interface FullscreenHistoryViewProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  onVersionRestore?: (versionId: string) => void;
  currentVersion?: Version;
  className?: string;
}

export function FullscreenHistoryView({
  documentId,
  isOpen,
  onClose,
  onVersionRestore,
  currentVersion,
  className = ''
}: FullscreenHistoryViewProps) {

  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [loading, setLoading] = useState(false);
  const [showChanges, setShowChanges] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['today'])
  );
  const [showDetailedVersions, setShowDetailedVersions] = useState(false);
  const [detailedGroups, setDetailedGroups] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);


  const fetchVersions = useCallback(
    async (pageNum = 1, reset = false) => {
      if (loading || loadingMore) return;

      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await apiClient.get(
          `/api/versions/document/${documentId}?page=${pageNum}&limit=20`
        );

        const data = response.data;
        const newVersions = data.versions;

        if (reset) {
          setVersions(newVersions);

          if (isInitialLoad && newVersions.length > 0) {
            
            setSelectedVersion(newVersions[0]);
            setIsInitialLoad(false);
          }
        } else {
          setVersions((prev) => [...prev, ...newVersions]);
        }

        setHasMore(data.page < data.totalPages);
        setPage(pageNum);
      } catch (error) {
        
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [documentId]
  );


  const navigateVersion = useCallback(
    (direction: 'prev' | 'next') => {
      if (!selectedVersion) return;

      const currentIndex = versions.findIndex(
        (v) => v.id === selectedVersion.id
      );
      if (currentIndex === -1) return;

      let newIndex;
      if (direction === 'prev') {
        newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
      } else {
        newIndex =
        currentIndex < versions.length - 1 ? currentIndex + 1 : currentIndex;
      }

      if (newIndex !== currentIndex) {
        setSelectedVersion(versions[newIndex]);
      }
    },
    [selectedVersion, versions]
  );


  const handleVersionRestore = useCallback(
    async (version: Version) => {
      if (
      window.confirm(
        `确定要还原到版本 ${version.versionNumber} 吗？这将创建一个新的版本。`
      ))
      {
        try {
          await onVersionRestore?.(version.id);
          onClose();
        } catch (error) {
          
          alert('版本恢复失败，请重试');
        }
      }
    },
    [onVersionRestore, onClose]
  );


  useEffect(() => {
    if (isOpen && documentId) {

      setSelectedVersion(null);
      setIsInitialLoad(true);
      fetchVersions(1, true);
    }
  }, [isOpen, documentId]);


  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {

      if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement)
      {
        return;
      }

      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowUp':
          event.preventDefault();
          navigateVersion('prev');
          break;
        case 'ArrowDown':
          event.preventDefault();
          navigateVersion('next');
          break;
        case 'Enter':
          if (selectedVersion && selectedVersion.versionNumber > 1) {
            event.preventDefault();
            handleVersionRestore(selectedVersion);
          }
          break;
        case 'd':
        case 'D':
          event.preventDefault();
          setShowChanges(!showChanges);
          break;
        case 'r':
        case 'R':
          if (selectedVersion && selectedVersion.versionNumber > 1) {
            event.preventDefault();
            handleVersionRestore(selectedVersion);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
  isOpen,
  onClose,
  selectedVersion,
  showChanges,
  navigateVersion,
  handleVersionRestore]
  );


  const versionGroups = useMemo(() => {
    const groups: VersionGroup[] = [];
    const groupMap = new Map<string, Version[]>();

    versions.forEach((version) => {
      const date = new Date(version.createdAt);
      const dateKey = format(date, 'yyyy-MM-dd');

      if (!groupMap.has(dateKey)) {
        groupMap.set(dateKey, []);
      }
      groupMap.get(dateKey)!.push(version);
    });


    Array.from(groupMap.entries()).
    sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime()).
    forEach(([dateKey, versions]) => {
      const date = new Date(dateKey);
      let label = '';

      if (isToday(date)) {
        label = '今天';
      } else if (isYesterday(date)) {
        label = '昨天';
      } else {
        label = format(date, 'M月d日', { locale: zhCN });
      }

      groups.push({
        date: dateKey,
        label,
        versions: versions.sort(
          (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      });
    });

    return groups;
  }, [versions]);


  const handleVersionSelect = useCallback((version: Version) => {
    setSelectedVersion((prevSelected) => {

      if (prevSelected?.id === version.id) return prevSelected;
      return version;
    });
  }, []);


  const toggleGroupExpanded = useCallback((groupDate: string) => {
    setExpandedGroups((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(groupDate)) {
        newExpanded.delete(groupDate);
      } else {
        newExpanded.add(groupDate);
      }
      return newExpanded;
    });
  }, []);


  const loadMoreVersions = useCallback(() => {
    if (hasMore && !loading && !loadingMore) {
      fetchVersions(page + 1, false);
    }
  }, [hasMore, loading, loadingMore, page, fetchVersions]);


  const toggleDetailedVersions = useCallback((groupDate: string) => {
    setDetailedGroups((prev) => {
      const newDetailedGroups = new Set(prev);
      if (newDetailedGroups.has(groupDate)) {
        newDetailedGroups.delete(groupDate);
      } else {
        newDetailedGroups.add(groupDate);
      }
      return newDetailedGroups;
    });
  }, []);


  const getChangeTypeStyle = useCallback((changeType: string) => {
    const styles = {
      CREATE: 'bg-green-100 text-green-800 border-green-200',
      EDIT: 'bg-blue-100 text-blue-800 border-blue-200',
      TITLE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      RESTORE: 'bg-purple-100 text-purple-800 border-purple-200',
      MERGE: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return (
      styles[changeType as keyof typeof styles] ||
      'bg-gray-100 text-gray-800 border-gray-200');

  }, []);


  const getChangeTypeName = useCallback((changeType: string) => {
    const names = {
      CREATE: '创建',
      EDIT: '编辑',
      TITLE: '标题',
      RESTORE: '恢复',
      MERGE: '合并'
    };
    return names[changeType as keyof typeof names] || changeType;
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className={`fullscreen-history-view fixed inset-0 bg-white z-[1003] flex flex-col ${className}`}>
      
      {}
      <div className="history-toolbar flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            title="返回文档 (Esc)">
            
            <ArrowLeft className="w-4 h-4" />
            <span>返回文档</span>
          </button>

          <div className="h-6 w-px bg-gray-300" />

          <button
            onClick={() => setShowChanges(!showChanges)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
            showChanges ?
            'bg-blue-100 text-blue-700 hover:bg-blue-200' :
            'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`
            }
            title="显示更改 (D)">
            
            {showChanges ?
            <Eye className="w-4 h-4" /> :

            <EyeOff className="w-4 h-4" />
            }
            <span>显示更改</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateVersion('prev')}
            disabled={
            !selectedVersion ||
            versions.findIndex((v) => v.id === selectedVersion.id) === 0
            }
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="上一项 (↑)">
            
            <ChevronUp className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigateVersion('next')}
            disabled={
            !selectedVersion ||
            versions.findIndex((v) => v.id === selectedVersion.id) ===
            versions.length - 1
            }
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="下一项 (↓)">
            
            <ChevronDown className="w-4 h-4" />
          </button>

          {selectedVersion && selectedVersion.versionNumber > 1 &&
          <>
              <div className="h-6 w-px bg-gray-300" />
              <button
              onClick={() => handleVersionRestore(selectedVersion)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
              title="还原此历史记录 (R 或 Enter)">
              
                <RotateCcw className="w-4 h-4" />
                <span>还原此历史记录</span>
              </button>
            </>
          }

          <div className="h-6 w-px bg-gray-300" />

          <button
            onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            title="键盘快捷键">
            
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {}
      <div className="flex-1 flex overflow-hidden">
        {}
        <div className="flex-1 overflow-auto bg-gray-50">
          {selectedVersion ?
          showChanges ?
          <VersionDiffViewer
            key={`diff-${selectedVersion.id}`}
            version={selectedVersion}
            previousVersion={
            versions[
            versions.findIndex((v) => v.id === selectedVersion.id) + 1]

            }
            className="h-full" /> :


          <DocumentContentViewer
            key={selectedVersion.id}
            version={selectedVersion}
            className="h-full" /> :



          <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>选择一个版本查看内容</p>
              </div>
            </div>
          }
        </div>

        {}
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">版本历史</h3>
            <p className="text-sm text-gray-500 mt-1">
              共 {versions.length} 个版本
            </p>
          </div>

          <div className="flex-1 overflow-auto">
            {versionGroups.map((group) =>
            <VersionGroupComponent
              key={group.date}
              group={group}
              selectedVersion={selectedVersion}
              expandedGroups={expandedGroups}
              detailedGroups={detailedGroups}
              onVersionSelect={handleVersionSelect}
              onToggleExpanded={toggleGroupExpanded}
              onToggleDetailed={toggleDetailedVersions}
              getChangeTypeStyle={getChangeTypeStyle}
              getChangeTypeName={getChangeTypeName} />

            )}

            {}
            {hasMore &&
            <div className="p-4">
                <button
                onClick={loadMoreVersions}
                disabled={loading || loadingMore}
                className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 flex items-center justify-center space-x-2">
                
                  {loadingMore &&
                <div className="loading-spinner w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                }
                  <span>{loadingMore ? '加载中...' : '展开更多历史记录'}</span>
                </button>
              </div>
            }
          </div>
        </div>
      </div>

      {}
      {showKeyboardHelp &&
      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                键盘快捷键
              </h3>
              <button
              onClick={() => setShowKeyboardHelp(false)}
              className="text-gray-400 hover:text-gray-600">
              
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">返回文档</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                  Esc
                </kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">上一个版本</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                  ↑
                </kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">下一个版本</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                  ↓
                </kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">切换显示更改</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                  D
                </kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">还原版本</span>
                <div className="flex space-x-1">
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                    R
                  </kbd>
                  <span className="text-gray-400">或</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                    Enter
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>);

}


interface VersionGroupComponentProps {
  group: VersionGroup;
  selectedVersion: Version | null;
  expandedGroups: Set<string>;
  detailedGroups: Set<string>;
  onVersionSelect: (version: Version) => void;
  onToggleExpanded: (groupDate: string) => void;
  onToggleDetailed: (groupDate: string) => void;
  getChangeTypeStyle: (changeType: string) => string;
  getChangeTypeName: (changeType: string) => string;
}

function VersionGroupComponent({
  group,
  selectedVersion,
  expandedGroups,
  detailedGroups,
  onVersionSelect,
  onToggleExpanded,
  onToggleDetailed,
  getChangeTypeStyle,
  getChangeTypeName
}: VersionGroupComponentProps) {
  const isExpanded = expandedGroups.has(group.date);
  const isDetailed = detailedGroups.has(group.date);
  const displayVersions = isDetailed ?
  group.versions :
  group.versions.slice(0, 3);

  return (
    <div className="border-b border-gray-100">
      <button
        onClick={() => onToggleExpanded(group.date)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
        
        <span className="font-medium text-gray-900">{group.label}</span>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {group.versions.length} 个版本
          </span>
          <ChevronRight
            className={`w-4 h-4 text-gray-400 transition-transform ${
            isExpanded ? 'rotate-90' : ''}`
            } />
          
        </div>
      </button>

      {isExpanded &&
      <div className="pb-2">
          {displayVersions.map((version) =>
        <div
          key={version.id}
          onClick={() => onVersionSelect(version)}
          className={`mx-4 mb-2 p-3 rounded-lg cursor-pointer transition-all ${
          selectedVersion?.id === version.id ?
          'bg-blue-50 border border-blue-200' :
          'hover:bg-gray-50 border border-transparent'}`
          }>
          
              <div className="flex items-start space-x-3">
                <UserAvatar user={version.createdBy} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      版本 {version.versionNumber}
                    </span>
                    <span
                  className={`px-2 py-1 text-xs rounded border ${getChangeTypeStyle(
                    version.changeType
                  )}`}>
                  
                      {getChangeTypeName(version.changeType)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 mb-1">
                    {version.createdBy.name}
                  </div>

                  <div className="text-xs text-gray-500">
                    {format(new Date(version.createdAt), 'HH:mm')}
                  </div>

                  {version.changeSummary &&
              <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {version.changeSummary}
                    </div>
              }
                </div>
              </div>
            </div>
        )}

          {!isDetailed && group.versions.length > 3 &&
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleDetailed(group.date);
          }}
          className="mx-4 mb-2 w-full py-2 text-sm text-blue-600 hover:text-blue-800 text-left flex items-center space-x-1">
          
              <MoreHorizontal className="w-4 h-4" />
              <span>展开详细版本 ({group.versions.length - 3} 个更多版本)</span>
            </button>
        }

          {isDetailed && group.versions.length > 3 &&
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleDetailed(group.date);
          }}
          className="mx-4 mb-2 w-full py-2 text-sm text-gray-600 hover:text-gray-800 text-left flex items-center space-x-1">
          
              <ChevronUp className="w-4 h-4" />
              <span>收起详细版本</span>
            </button>
        }
        </div>
      }
    </div>);

}