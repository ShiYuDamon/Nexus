import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { UserAvatar } from '../../ui/UserAvatar';




export function UserProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);


  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };


  const handleLogout = () => {
    logout();
    navigate('/login');
  };


  const handleSettings = () => {
    setMenuOpen(false);
    navigate('/settings');
  };

  return (
    <div className="border-t border-gray-100/30 p-3 relative">
      <div
        className="flex items-center cursor-pointer p-2 rounded-xl hover:bg-gray-50/80 transition-all duration-200"
        onClick={toggleMenu}>
        
        <UserAvatar
          user={user || {}}
          size="lg"
          className="flex-shrink-0 shadow-sm" />
        

        <div className="ml-3 flex-1 overflow-hidden">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user?.name || '未命名用户'}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {user?.email || '无邮箱'}
          </p>
        </div>

        <svg
          className={`w-4 h-4 text-gray-500 transform transition-transform duration-200 ${
          menuOpen ? 'rotate-180' : ''}`
          }
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg">
          
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7" />
          
        </svg>
      </div>

      {}
      {menuOpen &&
      <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-lg border border-gray-100/50 backdrop-blur-lg backdrop-saturate-150 overflow-hidden z-10">
          <div className="py-1">
            <button
            onClick={handleLogout}
            className="flex items-center w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150">
            
              <svg
              className="w-4 h-4 mr-2 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg">
              
                <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              
              </svg>
              登出
            </button>

            <button
            onClick={handleSettings}
            className="flex items-center w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150">
            
              <svg
              className="w-4 h-4 mr-2 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg">
              
                <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              
                <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              
              </svg>
              设置
            </button>
          </div>
        </div>
      }
    </div>);

}