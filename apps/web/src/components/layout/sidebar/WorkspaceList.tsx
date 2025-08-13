import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { WorkspaceService } from '../../../services/workspace.service';
import { DocumentService } from '../../../services/document.service';
import { WorkspaceDto } from '@nexus-main/common';
import { useDocumentStore } from '../../../stores/documentStore';




const WorkspaceDocumentsList = React.memo(({ workspaceId }: {workspaceId: string;}) => {

  const store = useDocumentStore();


  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);


  useEffect(() => {
    const ids = store.workspaceDocuments[workspaceId] || [];
    setDocumentIds(ids);

    const docs = ids.map((id) => store.documents[id]).filter(Boolean);
    setDocuments(docs);

    setIsLoading(store.loading[workspaceId] || false);
  }, [workspaceId, store.workspaceDocuments, store.documents, store.loading]);


  const fetchDocs = useCallback(() => {
    store.fetchWorkspaceDocuments(workspaceId);
  }, [workspaceId, store.fetchWorkspaceDocuments]);


  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  if (isLoading) {
    return (
      <div className="pl-8 py-1 text-sm text-gray-500 flex items-center">
        <svg className="animate-spin h-3 w-3 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        加载文档中...
      </div>);

  }

  if (documents.length === 0) {
    return (
      <div className="pl-8 py-1 text-sm text-gray-500">
        暂无文档
      </div>);

  }

  return (
    <ul className="pl-6 space-y-1">
      {documents.map((doc) =>
      <li key={doc.id} className="group">
          <Link
          to={`/workspaces/${workspaceId}/documents/${doc.id}/edit`}
          className="flex items-center py-1.5 text-sm text-gray-700 hover:text-gray-900 rounded-md hover:bg-gray-50/80 px-2 transition-colors duration-150 group">
          
            <div className="w-2 h-2 bg-indigo-300 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            <span className="truncate">{doc.title || '无标题文档'}</span>
          </Link>
        </li>
      )}
    </ul>);

});




export function WorkspaceList() {
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);


  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        setLoading(true);
        const response = await WorkspaceService.getAll(1, 100);
        setWorkspaces(response.items);


        if (response.items.length > 0) {
          setExpandedWorkspaces({ [response.items[0].id]: true });
        }
      } catch (error) {
        
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, []);


  const toggleWorkspace = (workspaceId: string) => {
    setExpandedWorkspaces((prev) => ({
      ...prev,
      [workspaceId]: !prev[workspaceId]
    }));
  };


  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };


  const getWorkspaceColor = (name: string) => {
    const colors = [
    'bg-gradient-to-br from-blue-400 to-blue-500',
    'bg-gradient-to-br from-purple-400 to-purple-500',
    'bg-gradient-to-br from-green-400 to-green-500',
    'bg-gradient-to-br from-yellow-400 to-yellow-500',
    'bg-gradient-to-br from-red-400 to-red-500',
    'bg-gradient-to-br from-indigo-400 to-indigo-500',
    'bg-gradient-to-br from-pink-400 to-pink-500',
    'bg-gradient-to-br from-teal-400 to-teal-500'];


    const hash = name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <div className="px-4 py-3">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">工作区</h3>
          <button
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors duration-150"
            onClick={toggleExpanded}
            aria-label={isExpanded ? '收起' : '展开'}>
            
            <svg className={`w-4 h-4 transform transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(2)].map((_, i) =>
          <div key={i} className="flex items-center">
              <div className="w-6 h-6 bg-gray-200 rounded-md"></div>
              <div className="ml-3 flex-1 h-3 bg-gray-200 rounded"></div>
            </div>
          )}
        </div>
      </div>);

  }

  return (
    <div className="px-4 py-2 mt-1">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          工作区
        </h3>
        <div className="flex items-center space-x-1">
          <Link
            to="/workspaces/new"
            className="text-gray-500 hover:text-indigo-600 transition-colors duration-150 p-1 rounded-md hover:bg-gray-100"
            title="创建工作区">
            
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </Link>
          <button
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors duration-150"
            onClick={toggleExpanded}
            aria-label={isExpanded ? '收起' : '展开'}>
            
            <svg className={`w-4 h-4 transform transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
      workspaces.length > 0 ?
      <ul className="space-y-1.5">
            {workspaces.map((workspace) =>
        <li
          key={workspace.id}
          className="mb-1.5"
          onMouseEnter={() => setActiveWorkspace(workspace.id)}
          onMouseLeave={() => setActiveWorkspace(null)}>
          
                <div
            className={`
                    flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer
                    transition-all duration-200 hover:shadow-sm
                    ${expandedWorkspaces[workspace.id] ?
            'bg-gray-100/80' :
            'hover:bg-gray-50/80'}
                  `}
            onClick={() => toggleWorkspace(workspace.id)}>
            
                  <div className="flex items-center overflow-hidden">
                    <div className={`w-6 h-6 rounded-md ${getWorkspaceColor(workspace.name)} flex items-center justify-center text-white text-xs font-medium mr-2.5`}>
                      {workspace.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate font-medium">{workspace.name}</span>
                  </div>

                  <div className="flex items-center">
                    {}
                    <div
                className={`
                        flex items-center space-x-1 mr-2
                        ${activeWorkspace === workspace.id ? 'opacity-100' : 'opacity-0'}
                        transition-opacity duration-150
                      `}>
                
                      <Link
                  to={`/workspaces/${workspace.id}/documents/new`}
                  className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded transition-colors duration-150"
                  onClick={(e) => e.stopPropagation()}
                  title="新建文档">
                  
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </Link>
                      <Link
                  to={`/workspaces/${workspace.id}`}
                  className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded transition-colors duration-150"
                  onClick={(e) => e.stopPropagation()}
                  title="查看全部">
                  
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                    </div>

                    {}
                    <svg
                className={`w-4 h-4 text-gray-500 transform transition-transform duration-200 ${expandedWorkspaces[workspace.id] ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg">
                
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {}
                {expandedWorkspaces[workspace.id] &&
          <div className="mt-1 space-y-1 transition-all duration-200">
                    <WorkspaceDocumentsList workspaceId={workspace.id} />
                  </div>
          }
              </li>
        )}
          </ul> :

      <div className="text-sm text-gray-500 px-3 py-2 bg-gray-50/50 rounded-lg">
            暂无工作区
            <Link to="/workspaces/new" className="text-indigo-600 hover:text-indigo-800 ml-1 transition-colors duration-150">
              创建一个
            </Link>
          </div>)

      }
    </div>);

}