import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DocumentService } from '../services/document.service';
import { ModernSidebarLayout } from '../components/layout/ModernSidebarLayout';
import { useAuth } from '../contexts/AuthContext';

export function CreateDocumentPage() {
  const { workspaceId } = useParams<{workspaceId: string;}>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('请输入文档标题');
      return;
    }

    if (!workspaceId) {
      setError('工作区ID无效');
      return;
    }

    try {
      setLoading(true);
      const document = await DocumentService.create({
        title,
        content: '',
        workspaceId
      });

      navigate(`/workspaces/${workspaceId}/documents/${document.id}/edit`);
    } catch (err) {
      
      setError('创建文档失败，请稍后重试');
      setLoading(false);
    }
  };

  return (
    <ModernSidebarLayout>
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {}
          <div className="mb-6 sm:mb-8">
            <Link
              to={`/workspaces/${workspaceId}`}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200">
              
              <svg
                className="h-4 w-4 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor">
                
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd" />
                
              </svg>
              返回工作区
            </Link>
          </div>

          {}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              创建新文档
            </h1>
            <p className="text-gray-600">为您的项目创建新的协作文档</p>
          </div>

          {}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8">
            {error &&
            <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="flex items-center">
                  <svg
                  className="w-5 h-5 text-red-400 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  
                    <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  
                  </svg>
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              </div>
            }

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-semibold text-gray-700 mb-2">
                  
                  文档标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                  placeholder="输入文档标题"
                  disabled={loading} />
                
                <p className="mt-2 text-sm text-gray-500">
                  为您的文档选择一个清晰的标题
                </p>
              </div>

              {}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  文档类型
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                  {
                    id: 'document',
                    name: '普通文档',
                    icon: '📄',
                    desc: '适合一般文本内容'
                  },
                  {
                    id: 'meeting',
                    name: '会议记录',
                    icon: '📝',
                    desc: '记录会议讨论要点'
                  },
                  {
                    id: 'plan',
                    name: '项目计划',
                    icon: '📋',
                    desc: '制定项目计划和时间表'
                  }].
                  map((type) =>
                  <div
                    key={type.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 cursor-pointer">
                    
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-3">{type.icon}</span>
                        <span className="font-medium text-gray-900">
                          {type.name}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{type.desc}</p>
                    </div>
                  )}
                </div>
              </div>
            </form>

            {}
            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 mt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate(`/workspaces/${workspaceId}`)}
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200">
                
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                onClick={handleSubmit}
                className="w-full sm:w-auto px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105">
                
                {loading ?
                <div className="flex items-center justify-center">
                    <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24">
                    
                      <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4">
                    </circle>
                      <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                    </path>
                    </svg>
                    创建中...
                  </div> :

                <div className="flex items-center justify-center">
                    <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    
                      <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    
                    </svg>
                    创建文档
                  </div>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModernSidebarLayout>);

}