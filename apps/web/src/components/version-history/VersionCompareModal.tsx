import React, { useState, useEffect } from 'react';

interface VersionDiff {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
}

interface Version {
  id: string;
  versionNumber: number;
  title: string;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  };
}

interface VersionCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromVersion: Version;
  toVersion: Version;
}

export function VersionCompareModal({
  isOpen,
  onClose,
  fromVersion,
  toVersion
}: VersionCompareModalProps) {
  const [diffs, setDiffs] = useState<VersionDiff[]>([]);
  const [loading, setLoading] = useState(false);


  const fetchComparison = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/versions/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          fromVersionId: fromVersion.id,
          toVersionId: toVersion.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        setDiffs(data);
      }
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && fromVersion && toVersion) {
      fetchComparison();
    }
  }, [isOpen, fromVersion, toVersion]);


  const renderDiff = (diff: VersionDiff, index: number) => {
    const baseClasses = 'inline';
    let classes = baseClasses;

    switch (diff.type) {
      case 'added':
        classes += ' bg-green-100 text-green-800';
        break;
      case 'removed':
        classes += ' bg-red-100 text-red-800 line-through';
        break;
      case 'unchanged':
        classes += ' text-gray-700';
        break;
    }

    return (
      <span key={index} className={classes}>
        {diff.content}
      </span>);

  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">版本对比</h2>
            <p className="text-sm text-gray-600 mt-1">
              版本 {fromVersion.versionNumber} → 版本 {toVersion.versionNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            
            <svg
              className="w-6 h-6"
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
        <div className="grid grid-cols-2 gap-4 p-6 border-b bg-gray-50">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">
              版本 {fromVersion.versionNumber}
            </h3>
            <p className="text-sm text-gray-600">
              {fromVersion.createdBy.name || fromVersion.createdBy.email}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(fromVersion.createdAt).toLocaleString('zh-CN')}
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">
              版本 {toVersion.versionNumber}
            </h3>
            <p className="text-sm text-gray-600">
              {toVersion.createdBy.name || toVersion.createdBy.email}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(toVersion.createdAt).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>

        {}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ?
          <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">正在对比版本...</span>
            </div> :
          diffs.length === 0 ?
          <div className="text-center text-gray-500 py-8">
              两个版本内容相同，无差异
            </div> :

          <div className="space-y-4">
              {}
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <span className="w-4 h-4 bg-green-100 border border-green-200 rounded mr-2"></span>
                  <span className="text-green-800">新增内容</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 bg-red-100 border border-red-200 rounded mr-2"></span>
                  <span className="text-red-800">删除内容</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 bg-gray-100 border border-gray-200 rounded mr-2"></span>
                  <span className="text-gray-700">未变更内容</span>
                </div>
              </div>

              {}
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {diffs.map((diff, index) => renderDiff(diff, index))}
                </div>
              </div>
            </div>
          }
        </div>

        {}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            
            关闭
          </button>
        </div>
      </div>
    </div>);

}