import { Link } from 'react-router-dom';
import { CreateWorkspace } from '../components/workspace/CreateWorkspace';
import { ModernSidebarLayout } from '../components/layout/ModernSidebarLayout';

export function CreateWorkspacePage() {
  return (
    <ModernSidebarLayout>
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {}
          <div className="mb-8">
            <Link
              to="/dashboard"
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
              返回仪表盘
            </Link>
          </div>

          {}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              创建新工作区
            </h1>
            <p className="text-gray-600">设置您的工作区信息，开始团队协作</p>
          </div>

          <CreateWorkspace />
        </div>
      </div>
    </ModernSidebarLayout>);

}