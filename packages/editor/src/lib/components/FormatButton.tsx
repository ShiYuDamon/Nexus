import React from 'react';

interface FormatButtonProps {
  icon: string;
  title: string;
  onClick: () => void;
  active?: boolean;
}

export function FormatButton({ icon, title, onClick, active = false }: FormatButtonProps) {
  return (
    <button
      className={`flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 focus:outline-none ${
      active ? 'bg-gray-200 text-blue-600' : 'text-gray-700'}`
      }
      title={title}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      onMouseDown={(e) => e.preventDefault()}>
      
      <i className="material-icons text-lg">{icon}</i>
    </button>);

}