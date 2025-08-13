import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserAvatar } from '../ui/UserAvatar';

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const isInWorkspace =
  location.pathname.includes('/workspaces/') &&
  location.pathname !== '/workspaces/new';

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-indigo-600">
                Nexus
              </Link>
            </div>
            {isAuthenticated &&
            <div className="ml-6 flex space-x-4 items-center">
                <Link
                to="/dashboard"
                className="text-gray-600 hover:text-gray-900">
                
                  工作区
                </Link>
              </div>
            }
          </div>
          <div className="flex items-center">
            {isAuthenticated ?
            <div className="flex items-center space-x-4">
                <UserAvatar user={user || {}} size="sm" showTooltip={true} />
                <span className="text-gray-700">
                  欢迎, {user?.name || user?.email}
                </span>
                <div className="relative">
                  <button
                  onClick={toggleDropdown}
                  className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 focus:outline-none">
                  
                    <span>账户</span>
                    <svg
                    className={`h-4 w-4 transition-transform ${
                    dropdownOpen ? 'rotate-180' : ''}`
                    }
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor">
                    
                      <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd" />
                    
                    </svg>
                  </button>

                  {dropdownOpen &&
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                      <div
                    className="py-1"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="options-menu">
                    
                        <Link
                      to="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem">
                      
                          我的工作区
                        </Link>
                        <button
                      onClick={() => logout()}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem">
                      
                          登出
                        </button>
                      </div>
                    </div>
                }
                </div>
              </div> :

            <div className="space-x-4">
                <Link
                to="/login"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                
                  登录
                </Link>
                <Link
                to="/register"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                
                  注册
                </Link>
              </div>
            }
          </div>
        </div>
      </div>
    </nav>);

}