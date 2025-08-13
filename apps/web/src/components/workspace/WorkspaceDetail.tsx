import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { WorkspaceService } from '../../services/workspace.service';
import {
  WorkspaceDetailDto,
  WorkspaceRole,
  UpdateWorkspaceMemberDto } from
'@nexus-main/common';
import { useAuth } from '../../contexts/AuthContext';
import { DocumentList } from '../document/DocumentList';

export function WorkspaceDetail() {
  const { id } = useParams<{id: string;}>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [workspace, setWorkspace] = useState<WorkspaceDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeMemberMenu, setActiveMemberMenu] = useState<string | null>(null);
  const [updateMemberLoading, setUpdateMemberLoading] = useState(false);

  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const fetchWorkspace = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const data = await WorkspaceService.getById(id);
        setWorkspace(data);
      } catch (err) {
        
        setError('无法加载工作区信息，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspace();
  }, [id]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMemberMenu) {
        const activeMenuRef = menuRefs.current[activeMemberMenu];
        if (activeMenuRef && !activeMenuRef.contains(event.target as Node)) {
          setActiveMemberMenu(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMemberMenu]);


  const setMenuRef = (id: string, el: HTMLDivElement | null) => {
    menuRefs.current[id] = el;
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      setLoading(true);
      await WorkspaceService.delete(id);
      navigate('/dashboard');
    } catch (err) {
      
      setError('删除工作区失败，请稍后重试');
      setLoading(false);
    }
  };

  const handleUpdateMemberRole = async (
  memberId: string,
  role: WorkspaceRole) =>
  {
    if (!id) return;

    try {
      setUpdateMemberLoading(true);
      const updateData: UpdateWorkspaceMemberDto = { role };
      await WorkspaceService.updateMember(id, memberId, updateData);


      if (workspace) {
        setWorkspace({
          ...workspace,
          members: workspace.members.map((member) =>
          member.id === memberId ? { ...member, role } : member
          )
        });
      }

      setActiveMemberMenu(null);
    } catch (err) {
      
      setError('更新成员角色失败，请稍后重试');
    } finally {
      setUpdateMemberLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!id) return;

    try {
      setUpdateMemberLoading(true);
      await WorkspaceService.removeMember(id, memberId);


      if (workspace) {
        setWorkspace({
          ...workspace,
          members: workspace.members.filter((member) => member.id !== memberId)
        });
      }

      setActiveMemberMenu(null);
    } catch (err) {
      
      setError('移除成员失败，请稍后重试');
    } finally {
      setUpdateMemberLoading(false);
    }
  };

  const toggleMemberMenu = (memberId: string) => {
    setActiveMemberMenu(activeMemberMenu === memberId ? null : memberId);
  };

  const isOwner = workspace?.ownerId === user?.id;
  const isAdmin = workspace?.members.some(
    (member) =>
    member.userId === user?.id && member.role === WorkspaceRole.ADMIN
  );
  const canManage = isOwner || isAdmin;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>);

  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <div className="text-red-700">{error}</div>
      </div>);

  }

  if (!workspace) {
    return (
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <div className="text-yellow-700">工作区不存在或您没有访问权限</div>
      </div>);

  }

  return (
    <div>
      {}
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white text-2xl font-semibold">
              {workspace.name.charAt(0).toUpperCase()}
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {workspace.name}
              </h1>
              {workspace.description &&
              <p className="mt-1 text-sm text-gray-500">
                  {workspace.description}
                </p>
              }
            </div>
          </div>

          {canManage &&
          <div className="flex space-x-3">
              <Link
              to={`/workspaces/${workspace.id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200">
              
                编辑
              </Link>
              {isOwner &&
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200">
              
                  删除
                </button>
            }
            </div>
          }
        </div>
      </div>

      {}
      <div className="px-6 py-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">成员</h2>
            <ul className="divide-y divide-gray-200">
              {workspace.members.map((member) =>
              <li
                key={member.id}
                className="py-4 flex items-center justify-between">
                
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      {member.user.avatar ?
                    <img
                      src={member.user.avatar}
                      alt={member.user.name}
                      className="h-8 w-8 rounded-full" /> :


                    <span className="text-xs font-medium text-gray-500">
                          {member.user.name.charAt(0).toUpperCase()}
                        </span>
                    }
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {member.user.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span
                    className={`px-2 py-1 text-xs rounded-full ${
                    member.role === WorkspaceRole.OWNER ?
                    'bg-purple-100 text-purple-800' :
                    member.role === WorkspaceRole.ADMIN ?
                    'bg-red-100 text-red-800' :
                    member.role === WorkspaceRole.MEMBER ?
                    'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'}`
                    }>
                    
                      {member.role}
                    </span>
                    {canManage &&
                  member.userId !== workspace.ownerId &&
                  member.userId !== user?.id &&
                  <div className="relative ml-2">
                          <button
                      className="text-gray-400 hover:text-gray-500 cursor-pointer"
                      title="管理成员"
                      onClick={() => toggleMemberMenu(member.id)}
                      disabled={updateMemberLoading}>
                      
                            ⋮
                          </button>

                          {activeMemberMenu === member.id &&
                    <div
                      ref={(el) => setMenuRef(member.id, el)}
                      className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                      
                              <div
                        className="py-1"
                        role="menu"
                        aria-orientation="vertical">
                        
                                {member.role !== WorkspaceRole.ADMIN &&
                        <button
                          onClick={() =>
                          handleUpdateMemberRole(
                            member.id,
                            WorkspaceRole.ADMIN
                          )
                          }
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                          disabled={updateMemberLoading}>
                          
                                    设为管理员
                                  </button>
                        }
                                {member.role !== WorkspaceRole.MEMBER &&
                        <button
                          onClick={() =>
                          handleUpdateMemberRole(
                            member.id,
                            WorkspaceRole.MEMBER
                          )
                          }
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                          disabled={updateMemberLoading}>
                          
                                    设为普通成员
                                  </button>
                        }
                                {member.role !== WorkspaceRole.GUEST &&
                        <button
                          onClick={() =>
                          handleUpdateMemberRole(
                            member.id,
                            WorkspaceRole.GUEST
                          )
                          }
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                          disabled={updateMemberLoading}>
                          
                                    设为访客
                                  </button>
                        }
                                <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                          role="menuitem"
                          disabled={updateMemberLoading}>
                          
                                  移除成员
                                </button>
                              </div>
                            </div>
                    }
                        </div>
                  }
                  </div>
                </li>
              )}
            </ul>
            {canManage &&
            <div className="mt-4">
                <Link
                to={`/workspaces/${workspace.id}/members/invite`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200">
                
                  邀请成员
                </Link>
              </div>
            }
          </div>

          {}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">文档</h2>
            </div>
            <DocumentList workspaceId={workspace.id} />
          </div>
        </div>
      </div>

      {}
      {showDeleteConfirm &&
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-auto shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              确认删除
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              您确定要删除工作区 "{workspace.name}"
              吗？此操作无法撤销，所有相关文档将被永久删除。
            </p>
            <div className="flex justify-end space-x-3">
              <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200">
              
                取消
              </button>
              <button
              onClick={handleDelete}
              className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200">
              
                删除
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}