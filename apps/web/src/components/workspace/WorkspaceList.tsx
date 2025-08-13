import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WorkspaceService } from '../../services/workspace.service';
import { WorkspaceDto } from '@nexus-main/common';

export function WorkspaceList() {
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        setLoading(true);
        const response = await WorkspaceService.getAll(page, limit);
        setWorkspaces(response.items);
        setTotalPages(Math.ceil(response.total / limit));
      } catch (err) {
        
        setError('无法加载工作区，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, [page, limit]);

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>);

  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="text-red-700">{error}</div>
      </div>);

  }

  if (workspaces.length === 0) {
    return (
      <div className="bg-gray-50 p-8 rounded-lg text-center">
        <h3 className="text-lg font-medium text-gray-900">还没有工作区</h3>
        <p className="mt-2 text-gray-500">创建一个新的工作区开始协作吧</p>
        <div className="mt-6">
          <Link
            to="/workspaces/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            
            创建工作区
          </Link>
        </div>
      </div>);

  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((workspace) =>
        <Link
          key={workspace.id}
          to={`/workspaces/${workspace.id}`}
          className="block bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow duration-200">
          
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">{workspace.name}</h3>
                {workspace.description &&
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{workspace.description}</p>
              }
                <p className="mt-1 text-xs text-gray-400">
                  创建于 {new Date(workspace.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Link>
        )}
      </div>

      {totalPages > 1 &&
      <div className="flex justify-between items-center mt-6">
          <button
          onClick={handlePrevPage}
          disabled={page === 1}
          className={`px-3 py-1 rounded-md ${
          page === 1 ?
          'bg-gray-100 text-gray-400 cursor-not-allowed' :
          'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
          }>
          
            上一页
          </button>
          <span className="text-sm text-gray-500">
            第 {page} 页，共 {totalPages} 页
          </span>
          <button
          onClick={handleNextPage}
          disabled={page === totalPages}
          className={`px-3 py-1 rounded-md ${
          page === totalPages ?
          'bg-gray-100 text-gray-400 cursor-not-allowed' :
          'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
          }>
          
            下一页
          </button>
        </div>
      }
    </div>);

}