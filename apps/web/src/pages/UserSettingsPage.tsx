import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AvatarUpload } from '../components/user/AvatarUpload';
import { UserService } from '../services/user.service';
import { ModernSidebarLayout } from '../components/layout/ModernSidebarLayout';

export function UserSettingsPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const updatedUser = await UserService.updateProfile({
        name: formData.name
      });

      await updateUser(updatedUser);
      setMessage({ type: 'success', text: '个人信息已更新' });
    } catch (error) {
      
      setMessage({ type: 'error', text: '更新失败，请重试' });
    } finally {
      setSaving(false);
    }
  };


  const handleAvatarUpdate = (avatarUrl: string) => {
    setMessage({ type: 'success', text: '头像已更新' });
  };

  return (
    <ModernSidebarLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {}
        <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7" />
                    
                  </svg>
                </button>
                <h1 className="text-2xl font-bold text-gray-900">个人设置</h1>
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="p-6 sm:p-8">
              {}
              {message &&
              <div
                className={`mb-6 p-4 rounded-lg ${
                message.type === 'success' ?
                'bg-green-50 border border-green-200 text-green-800' :
                'bg-red-50 border border-red-200 text-red-800'}`
                }>
                
                  {message.text}
                </div>
              }

              <div className="space-y-8">
                {}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    头像设置
                  </h2>
                  <div className="flex items-start space-x-6">
                    <AvatarUpload
                      size="lg"
                      onAvatarUpdate={handleAvatarUpdate} />
                    
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-2">
                        上传您的头像图片，将在协同编辑和评论中显示。
                      </p>
                      <p className="text-xs text-gray-500">
                        支持 JPEG、PNG、GIF、WebP 格式，文件大小不超过 5MB。
                      </p>
                    </div>
                  </div>
                </div>

                {}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    基本信息
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-semibold text-gray-700 mb-2">
                        
                        姓名
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value
                        }))
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-gray-900 placeholder-gray-400"
                        placeholder="请输入您的姓名" />
                      
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-semibold text-gray-700 mb-2">
                        
                        邮箱地址
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        disabled
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
                      
                      <p className="text-xs text-gray-500 mt-1">
                        邮箱地址不可修改
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105">
                        
                        {saving ? '保存中...' : '保存更改'}
                      </button>
                    </div>
                  </form>
                </div>

                {}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    账户信息
                  </h2>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">用户ID:</span>
                      <span className="text-sm font-mono text-gray-900">
                        {user?.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">注册时间:</span>
                      <span className="text-sm text-gray-900">
                        {user?.createdAt ?
                        new Date(user.createdAt).toLocaleDateString('zh-CN') :
                        '未知'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">最后登录:</span>
                      <span className="text-sm text-gray-900">
                        {user?.lastLoginAt ?
                        new Date(user.lastLoginAt).toLocaleString('zh-CN') :
                        '未知'}
                      </span>
                    </div>
                  </div>
                </div>

                {}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    协同编辑设置
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          显示远程光标
                        </h3>
                        <p className="text-sm text-gray-500">
                          在协同编辑时显示其他用户的光标位置
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="sr-only peer" />
                        
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          实时通知
                        </h3>
                        <p className="text-sm text-gray-500">
                          接收文档评论和@提及的实时通知
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="sr-only peer" />
                        
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          自动保存
                        </h3>
                        <p className="text-sm text-gray-500">
                          编辑时自动保存文档版本
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="sr-only peer" />
                        
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModernSidebarLayout>);

}