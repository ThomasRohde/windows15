import React from 'react';
import { DesktopIconProps } from '../types';
import { useOS } from '../context/OSContext';

export const DesktopIcon: React.FC<DesktopIconProps> = ({ label, icon, colorClass = "text-blue-300", appId, onClick }) => {
  const { openWindow } = useOS();

  const handleClick = () => {
    if (onClick) onClick();
    if (appId) openWindow(appId);
  };

  return (
    <button 
        onDoubleClick={handleClick}
        className="group flex flex-col items-center gap-2 p-2 rounded hover:bg-white/10 transition-colors w-24 focus:outline-none focus:bg-white/10 cursor-default"
    >
      <div className={`w-12 h-12 bg-opacity-20 rounded-lg flex items-center justify-center ring-1 ring-white/10 group-hover:scale-105 transition-transform duration-300 ${colorClass.replace('text-', 'bg-').replace('300', '500')}/20 ${colorClass}`}>
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>
      <span className="text-xs font-medium text-center text-white/90 drop-shadow-md shadow-black">{label}</span>
    </button>
  );
};