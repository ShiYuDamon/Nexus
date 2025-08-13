import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, Edit3, Save } from 'lucide-react';
import { VersioningStatus } from '../../hooks/useIntelligentVersioning';

interface VersionStatusIndicatorProps {
  status: VersioningStatus;
  isCreatingVersion: boolean;
  onManualSave?: () => void;
  canCreateVersion: boolean;
  className?: string;
  showDetails?: boolean;
}

export function VersionStatusIndicator({
  status,
  isCreatingVersion,
  onManualSave,
  canCreateVersion,
  className = '',
  showDetails = false
}: VersionStatusIndicatorProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());


  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);


  const getStatusInfo = () => {
    if (isCreatingVersion) {
      return {
        icon: <Save className="w-4 h-4 animate-spin" />,
        text: '保存中...',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    }

    if (status.currentSession) {
      const sessionDuration = Math.floor((currentTime - status.currentSession.startTime) / 1000);
      const hasSignificantChanges = status.sessionInfo?.hasSignificantChanges || false;

      if (hasSignificantChanges) {
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          text: `编辑中 ${sessionDuration}s`,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          detail: '有重要变更'
        };
      } else {
        return {
          icon: <Edit3 className="w-4 h-4" />,
          text: `编辑中 ${sessionDuration}s`,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          detail: '变更较小'
        };
      }
    }


    const timeSinceLastVersion = Math.floor((currentTime - status.lastVersionTime) / 1000 / 60);
    return {
      icon: <Clock className="w-4 h-4" />,
      text: `${timeSinceLastVersion}分钟前`,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      detail: '无活动编辑'
    };
  };

  const statusInfo = getStatusInfo();

  if (!showDetails) {

    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${statusInfo.color} ${statusInfo.bgColor} border ${statusInfo.borderColor}`}>
          {statusInfo.icon}
          <span>{statusInfo.text}</span>
        </div>
        
        {onManualSave &&
        <button
          onClick={onManualSave}
          disabled={isCreatingVersion || !canCreateVersion}
          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          title={canCreateVersion ? "手动保存版本" : "当前没有足够的变更"}>
          
            <Save className="w-4 h-4" />
          </button>
        }
      </div>);

  }


  return (
    <div className={`version-status-indicator ${className}`}>
      <div className={`p-3 rounded-lg border ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
        {}
        <div className="flex items-center justify-between mb-2">
          <div className={`flex items-center space-x-2 ${statusInfo.color}`}>
            {statusInfo.icon}
            <span className="font-medium">{statusInfo.text}</span>
          </div>
          
          {onManualSave &&
          <button
            onClick={onManualSave}
            disabled={isCreatingVersion || !canCreateVersion}
            className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
            
              {isCreatingVersion ? '保存中...' : '保存版本'}
            </button>
          }
        </div>

        {}
        {status.currentSession &&
        <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>编辑次数:</span>
              <span>{status.sessionInfo?.editCount || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>会话时长:</span>
              <span>{Math.floor((currentTime - status.currentSession.startTime) / 1000)}秒</span>
            </div>
            <div className="flex justify-between">
              <span>重要变更:</span>
              <span>{status.sessionInfo?.hasSignificantChanges ? '是' : '否'}</span>
            </div>
            {statusInfo.detail &&
          <div className="mt-2 pt-2 border-t border-gray-200">
                <span className="text-gray-500">{statusInfo.detail}</span>
              </div>
          }
          </div>
        }

        {}
        {!status.currentSession &&
        <div className="text-xs text-gray-500">
            上次版本创建于 {Math.floor((currentTime - status.lastVersionTime) / 1000 / 60)} 分钟前
          </div>
        }
      </div>
    </div>);

}


export function SimpleVersionStatus({
  status,
  isCreatingVersion,
  className = ''




}: {status: VersioningStatus;isCreatingVersion: boolean;className?: string;}) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (isCreatingVersion) {
    return (
      <div className={`flex items-center space-x-1 text-blue-600 ${className}`}>
        <Save className="w-3 h-3 animate-spin" />
        <span className="text-xs">保存中</span>
      </div>);

  }

  if (status.currentSession) {
    const sessionDuration = Math.floor((currentTime - status.currentSession.startTime) / 1000);
    const hasSignificantChanges = status.sessionInfo?.hasSignificantChanges || false;

    return (
      <div className={`flex items-center space-x-1 ${hasSignificantChanges ? 'text-green-600' : 'text-yellow-600'} ${className}`}>
        {hasSignificantChanges ?
        <CheckCircle className="w-3 h-3" /> :

        <Edit3 className="w-3 h-3" />
        }
        <span className="text-xs">{sessionDuration}s</span>
      </div>);

  }

  return (
    <div className={`flex items-center space-x-1 text-gray-500 ${className}`}>
      <Clock className="w-3 h-3" />
      <span className="text-xs">已保存</span>
    </div>);

}

export default VersionStatusIndicator;