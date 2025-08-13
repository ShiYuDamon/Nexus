import React from 'react';

interface User {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  color?: string;
}

interface RemoteCursorWithAvatarProps {
  user: User;
  position: {
    left: number;
    top: number;
  };
  className?: string;
}

export function RemoteCursorWithAvatar({
  user,
  position,
  className = ''
}: RemoteCursorWithAvatarProps) {

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

  const cursorColor = user.color || getAvatarColor();

  return (
    <div
      className={`absolute pointer-events-none z-50 ${className}`}
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        transform: 'translateX(-1px)'
      }}>
      
      {}
      <div
        className="w-0.5 h-5 animate-pulse"
        style={{
          backgroundColor: cursorColor,
          boxShadow: `0 0 2px ${cursorColor}`
        }} />
      

      {}
      <div
        className="absolute top-0 left-1 transform -translate-y-full flex items-center space-x-1 px-2 py-1 rounded-md text-xs text-white whitespace-nowrap shadow-lg"
        style={{
          backgroundColor: cursorColor,
          maxWidth: '100px',
          minWidth: '70px'
        }}>
        
        {}
        <div className="flex-shrink-0">
          {user.avatar ?
          <img
            src={user.avatar}
            alt={getDisplayName()}
            className="w-4 h-4 rounded-full object-cover border border-white/30" /> :


          <div
            className="w-4 h-4 rounded-full flex items-center justify-center text-white font-medium border border-white/30"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              fontSize: '8px'
            }}>
            
              {getInitial()}
            </div>
          }
        </div>

        {}
        <span className="font-medium truncate">{getDisplayName()}</span>
      </div>

      {}
      <div
        className="absolute top-0 left-1 transform -translate-y-full translate-x-full"
        style={{
          width: 0,
          height: 0,
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: `4px solid ${cursorColor}`,
          marginTop: '1px'
        }} />
      
    </div>);

}


export type { User, RemoteCursorWithAvatarProps };