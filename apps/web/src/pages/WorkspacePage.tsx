import { Link } from 'react-router-dom';
import { WorkspaceDetail } from '../components/workspace/WorkspaceDetail';
import { ModernSidebarLayout } from '../components/layout/ModernSidebarLayout';
import { WorkspaceProvider } from '../contexts/WorkspaceContext';

export function WorkspacePage() {
  return (
    <ModernSidebarLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {}
        <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
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
          </div>
        </div>

        {}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <WorkspaceProvider>
              <WorkspaceDetail />
            </WorkspaceProvider>
          </div>
        </div>
      </div>
    </ModernSidebarLayout>);

}