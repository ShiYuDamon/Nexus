import React from 'react';
import { Link } from 'react-router-dom';
import { useDocumentStore } from '../../stores/documentStore';
import { useAuth } from '../../contexts/AuthContext';
import { WorkspaceRole } from '@nexus-main/common';

interface DocumentItemProps {
  documentId: string;
  workspaceId: string;
  userRole: WorkspaceRole;
  onDelete: (documentId: string) => void;
  onShowMenu: (documentId: string, e: React.MouseEvent) => void;
  isMenuActive: boolean;
  setMenuRef: (id: string, el: HTMLDivElement | null) => void;
  showDeleteConfirm: string | null;
  setShowDeleteConfirm: (id: string | null) => void;
}

export function DocumentItem({
  documentId,
  workspaceId,
  userRole,
  onDelete,
  onShowMenu,
  isMenuActive,
  setMenuRef,
  showDeleteConfirm,
  setShowDeleteConfirm
}: DocumentItemProps) {
  const { user } = useAuth();


  const document = useDocumentStore((state) => state.documents[documentId]);

  if (!document) {
    
    return null;
  }

  const canEditDocuments =
  userRole === WorkspaceRole.OWNER ||
  userRole === WorkspaceRole.ADMIN ||
  userRole === WorkspaceRole.MEMBER;

  return (
    <li key={document.id} className="py-4">
      <div className="flex items-center justify-between">
        <Link
          to={canEditDocuments ?
          `/workspaces/${workspaceId}/documents/${document.id}/edit` :
          `/workspaces/${workspaceId}/documents/${document.id}`}
          className="hover:text-indigo-700 flex-grow">
          
          <div>
            <h3 className="text-sm font-medium text-indigo-600">{document.title}</h3>
            <p className="text-xs text-gray-500">
              最后更新: {new Date(document.updatedAt).toLocaleString()}
            </p>
          </div>
        </Link>
        <div className="flex items-center">
          {canEditDocuments && document.authorId === user?.id &&
          <div className="relative mr-2">
              <button
              onClick={(e) => onShowMenu(document.id, e)}
              className="text-gray-400 hover:text-gray-500 p-1"
              title="文档操作">
              
                ⋮
              </button>

              {isMenuActive &&
            <div
              ref={(el) => setMenuRef(document.id, el)}
              className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
              
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowDeleteConfirm(document.id);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  role="menuitem">
                  
                      删除文档
                    </button>
                  </div>
                </div>
            }
            </div>
          }
        </div>
      </div>
    </li>);

}