import React from 'react';

interface User {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  color?: string;
}

interface UserAvatarProps {
  user: User;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTooltip?: boolean;
  onClick?: () => void;
}

export function UserAvatar({
  user,
  size = 'md',
  className = '',
  showTooltip = false,
  onClick
}: UserAvatarProps) {

  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'w-4 h-4 text-xs';
      case 'sm':
        return 'w-6 h-6 text-xs';
      case 'md':
        return 'w-8 h-8 text-sm';
      case 'lg':
        return 'w-10 h-10 text-base';
      case 'xl':
        return 'w-12 h-12 text-lg';
      default:
        return 'w-8 h-8 text-sm';
    }
  };


  const getDisplayName = () => {
    return user.name || user.email || '未知用户';
  };


  const getInitial = () => {
    if (user.name) {
      return user.name.charAt(0).toUpperCase();
    } else if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };


  const getAvatarColor = () => {

    if (user.color) {
      return user.color;
    }


    const seed = user.id || user.name || user.email || 'default';
    const hash = seed.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    const colors = [
    '#EF4444',
    '#F97316',
    '#F59E0B',
    '#EAB308',
    '#84CC16',
    '#22C55E',
    '#10B981',
    '#14B8A6',
    '#06B6D4',
    '#0EA5E9',
    '#3B82F6',
    '#6366F1',
    '#8B5CF6',
    '#A855F7',
    '#D946EF',
    '#EC4899'];


    return colors[Math.abs(hash) % colors.length];
  };


  const renderAvatarContent = () => {
    if (user.avatar) {
      return (
        <img
          src={user.avatar}
          alt={getDisplayName()}
          className={`${getSizeClasses()} rounded-full object-cover`} />);


    }


    return (
      <div
        className={`${getSizeClasses()} rounded-full flex items-center justify-center text-white font-medium`}
        style={{ backgroundColor: getAvatarColor() }}>
        
        {getInitial()}
      </div>);

  };

  const avatarElement =
  <div
    className={`inline-block ${onClick ? 'cursor-pointer' : ''} ${className}`}
    onClick={onClick}
    title={showTooltip ? getDisplayName() : undefined}>
    
      {renderAvatarContent()}
    </div>;



  if (showTooltip && !onClick) {
    return (
      <div className="relative group">
        {avatarElement}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          {getDisplayName()}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>);

  }

  return avatarElement;
}


interface UserAvatarGroupProps {
  users: User[];
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  max?: number;
  className?: string;
  showTooltip?: boolean;
}

export function UserAvatarGroup({
  users,
  size = 'md',
  max = 3,
  className = '',
  showTooltip = true
}: UserAvatarGroupProps) {
  const displayUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'w-4 h-4 text-xs';
      case 'sm':
        return 'w-6 h-6 text-xs';
      case 'md':
        return 'w-8 h-8 text-sm';
      case 'lg':
        return 'w-10 h-10 text-base';
      case 'xl':
        return 'w-12 h-12 text-lg';
      default:
        return 'w-8 h-8 text-sm';
    }
  };

  if (users.length === 0) {
    return null;
  }

  return (
    <div className={`flex -space-x-1 ${className}`}>
      {displayUsers.map((user, index) =>
      <UserAvatar
        key={user.id || index}
        user={user}
        size={size}
        showTooltip={showTooltip}
        className="border-2 border-white" />

      )}

      {remainingCount > 0 &&
      <div
        className={`${getSizeClasses()} rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 font-medium`}
        title={`还有 ${remainingCount} 人`}>
        
          +{remainingCount}
        </div>
      }
    </div>);

}