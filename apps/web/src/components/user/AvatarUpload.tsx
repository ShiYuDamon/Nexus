import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserService } from '../../services/user.service';

interface AvatarUploadProps {
  onAvatarUpdate?: (avatarUrl: string) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AvatarUpload({
  onAvatarUpdate,
  size = 'md',
  className = ''
}: AvatarUploadProps) {
  const { user, updateUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-16 h-16';
      case 'lg':
        return 'w-32 h-32';
      default:
        return 'w-24 h-24';
    }
  };


  const getUserAvatar = () => {
    if (user?.avatar) {
      return (
        <img
          src={user.avatar}
          alt={user.name || user.email}
          className={`${getSizeClasses()} rounded-full object-cover`} />);


    }


    const initial =
    user?.name?.charAt(0).toUpperCase() ||
    user?.email?.charAt(0).toUpperCase() ||
    'U';
    const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500'];

    const colorIndex = (user?.id?.charCodeAt(0) || 0) % colors.length;

    return (
      <div
        className={`${getSizeClasses()} rounded-full flex items-center justify-center text-white font-bold ${
        colors[colorIndex]}`
        }>
        
        <span
          className={
          size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-4xl' : 'text-2xl'
          }>
          
          {initial}
        </span>
      </div>);

  };


  const handleFileUpload = async (file: File) => {
    if (!file) return;


    if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
      alert('只支持图片文件 (JPEG, PNG, GIF, WebP)');
      return;
    }


    if (file.size > 5 * 1024 * 1024) {
      alert('文件大小不能超过 5MB');
      return;
    }

    setUploading(true);
    try {
      const updatedUser = await UserService.uploadAvatar(file);
      updateUser(updatedUser);
      onAvatarUpdate?.(updatedUser.avatar);
    } catch (error: any) {
      
      alert(error.response?.data?.message || '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };


  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };


  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };


  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`relative cursor-pointer group ${
        dragOver ? 'ring-4 ring-blue-500 ring-opacity-50' : ''}`
        }
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}>
        
        {getUserAvatar()}

        {}
        <div
          className={`absolute inset-0 ${getSizeClasses()} rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
          
          {uploading ?
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div> :

          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            
              <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            
              <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            
            </svg>
          }
        </div>

        {}
        {uploading &&
        <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white rounded-full p-1">
            <svg
            className="w-4 h-4 animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            
              <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            
            </svg>
          </div>
        }
      </div>

      {}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden" />
      

      {}
      {size !== 'sm' &&
      <p className="text-xs text-gray-500 mt-2 text-center">
          点击或拖拽图片上传头像
          <br />
          支持 JPEG、PNG、GIF、WebP 格式，最大 5MB
        </p>
      }
    </div>);

}