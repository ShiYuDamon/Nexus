import React, { useState, useEffect } from 'react';
import { UserAvatar, UserAvatarGroup } from '../ui/UserAvatar';

interface WorkspaceMember {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user: {
    id: string;
    name?: string;
    email: string;
    avatar?: string;
    isActive: boolean;
    lastLoginAt?: string;
  };
  joinedAt: string;
}

interface WorkspaceMemberListProps {
  workspaceId: string;
  className?: string;
  showInviteButton?: boolean;
  compact?: boolean;
}

export function WorkspaceMemberList({
  workspaceId,
  className = '',
  showInviteButton = true,
  compact = false
}: WorkspaceMemberListProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);


  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchMembers();
    }
  }, [workspaceId]);


  const getRoleText = (role: string) => {
    switch (role) {
      case 'OWNER':
        return '所有者';
      case 'ADMIN':
        return '管理员';
      case 'MEMBER':
        return '成员';
      default:
        return '未知';
    }
  };


  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800';
      case 'MEMBER':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };


  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <UserAvatarGroup
          users={members.map((member) => member.user)}
          size="sm"
          max={5}
          showTooltip={true} />
        
        {members.length > 0 &&
        <span className="text-sm text-gray-500">
            {members.length} 名成员
          </span>
        }
      </div>);

  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) =>
          <div key={i} className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          )}
        </div>
      </div>);

  }

  return (
    <div className={className}>
      {}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          工作区成员 ({members.length})
        </h3>
        {showInviteButton &&
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          
            邀请成员
          </button>
        }
      </div>

      {}
      <div className="space-y-3">
        {members.map((member) =>
        <div
          key={member.id}
          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          
            <div className="flex items-center space-x-3">
              <UserAvatar
              user={member.user}
              size="lg"
              showTooltip={false} />
            
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">
                    {member.user.name || member.user.email}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(member.role)}`}>
                    {getRoleText(member.role)}
                  </span>
                  {!member.user.isActive &&
                <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                      未激活
                    </span>
                }
                </div>
                <div className="text-sm text-gray-500">
                  {member.user.email}
                </div>
                <div className="text-xs text-gray-400">
                  加入时间: {new Date(member.joinedAt).toLocaleDateString('zh-CN')}
                  {member.user.lastLoginAt &&
                <span className="ml-2">
                      最后登录: {new Date(member.user.lastLoginAt).toLocaleDateString('zh-CN')}
                    </span>
                }
                </div>
              </div>
            </div>

            {}
            <div className="flex items-center space-x-2">
              {member.role !== 'OWNER' &&
            <button className="text-sm text-gray-600 hover:text-gray-800">
                  管理
                </button>
            }
            </div>
          </div>
        )}
      </div>

      {}
      {members.length === 0 &&
      <div className="text-center py-8">
          <div className="text-gray-500 mb-2">暂无成员</div>
          {showInviteButton &&
        <button
          onClick={() => setShowInviteModal(true)}
          className="text-blue-600 hover:text-blue-800 text-sm">
          
              邀请第一个成员
            </button>
        }
        </div>
      }

      {}
      {showInviteModal &&
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">邀请成员</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  邮箱地址
                </label>
                <input
                type="email"
                placeholder="输入要邀请的用户邮箱"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  角色
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="MEMBER">成员</option>
                  <option value="ADMIN">管理员</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
              onClick={() => setShowInviteModal(false)}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
              
                取消
              </button>
              <button
              onClick={() => {

                setShowInviteModal(false);
              }}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
              
                发送邀请
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}