import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { WorkspaceRole, WorkspaceMemberDto } from '@nexus-main/common';
import { useAuth } from '../../contexts/AuthContext';
import { WorkspaceService } from '../../services/workspace.service';
import { useDocumentStore } from '../../stores/documentStore';
import { DocumentItem } from './DocumentItem';
import { DocumentService } from '../../services/document.service';

interface DocumentListProps {
  workspaceId: string;
}

export function DocumentList({ workspaceId }: DocumentListProps) {
  const { user } = useAuth();


  const {
    fetchWorkspaceDocuments,
    getWorkspaceDocuments
  } = useDocumentStore();


  const documentIds = useDocumentStore((state) =>
  state.workspaceDocuments[workspaceId] || []);


  const isLoading = useDocumentStore((state) => state.loading[workspaceId] || false);
  const error = useDocumentStore((state) => state.errors[workspaceId]);

  const [activeDocumentMenu, setActiveDocumentMenu] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});


  const [userRole, setUserRole] = useState<WorkspaceRole>(WorkspaceRole.GUEST);


  const canEditDocuments =
  userRole === WorkspaceRole.OWNER ||
  userRole === WorkspaceRole.ADMIN ||
  userRole === WorkspaceRole.MEMBER;


  useEffect(() => {
    const fetchWorkspaceInfo = async () => {
      try {

        const workspace = await WorkspaceService.getById(workspaceId);


        if (user?.id) {
          const member = workspace.members.find(
            (m: WorkspaceMemberDto) => m.userId === user.id
          );
          if (member) {
            setUserRole(member.role as WorkspaceRole);
          }
        }
      } catch (err) {
        
      }
    };

    fetchWorkspaceInfo();
  }, [workspaceId, user?.id]);


  useEffect(() => {
    
    fetchWorkspaceDocuments(workspaceId);
  }, [workspaceId, fetchWorkspaceDocuments]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDocumentMenu) {
        const activeMenuRef = menuRefs.current[activeDocumentMenu];
        if (activeMenuRef && !activeMenuRef.contains(event.target as Node)) {
          setActiveDocumentMenu(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDocumentMenu]);


  const setMenuRef = (id: string, el: HTMLDivElement | null) => {
    menuRefs.current[id] = el;
  };

  const toggleDocumentMenu = (documentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveDocumentMenu(activeDocumentMenu === documentId ? null : documentId);
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      setDeleteLoading(true);
      await DocumentService.delete(documentId);


      fetchWorkspaceDocuments(workspaceId);
      setShowDeleteConfirm(null);
      setActiveDocumentMenu(null);
    } catch (err) {
      
    } finally {
      setDeleteLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">加载中...</p>
      </div>);

  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-700">{error}</p>
        <p className="text-sm text-gray-500 mt-2">请确保后端服务器已启动并且已经实现了文档API</p>
        {canEditDocuments &&
        <Link
          to={`/workspaces/${workspaceId}/documents/new`}
          className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          
            创建文档
          </Link>
        }
      </div>);

  }

  if (documentIds.length === 0) {
    return (
      <div className="bg-gray-50 p-4 rounded-md text-center">
        <p className="text-gray-500">暂无文档</p>
        {canEditDocuments &&
        <Link
          to={`/workspaces/${workspaceId}/documents/new`}
          className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          
            创建文档
          </Link>
        }
      </div>);

  }

  

  return (
    <div>
      <ul className="divide-y divide-gray-200">
        {documentIds.map((docId) =>
        <DocumentItem
          key={docId}
          documentId={docId}
          workspaceId={workspaceId}
          userRole={userRole}
          onDelete={handleDeleteDocument}
          onShowMenu={toggleDocumentMenu}
          isMenuActive={activeDocumentMenu === docId}
          setMenuRef={setMenuRef}
          showDeleteConfirm={showDeleteConfirm}
          setShowDeleteConfirm={setShowDeleteConfirm} />

        )}
      </ul>

      {}
      {showDeleteConfirm &&
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">确认删除</h3>
            <p className="text-gray-500 mb-5">您确定要删除此文档吗？此操作无法撤销。</p>
            <div className="flex justify-end space-x-3">
              <button
              onClick={() => setShowDeleteConfirm(null)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
              
                取消
              </button>
              <button
              onClick={() => handleDeleteDocument(showDeleteConfirm)}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
              disabled={deleteLoading}>
              
                {deleteLoading ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      }
    </div>);

}