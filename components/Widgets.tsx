import React, { useState, useEffect } from 'react';

export const Widgets: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const daysInPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
  const today = currentDate.getDate();
  
  const calendarDays = [];
  // Previous month padding
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(<span key={`prev-${i}`} className="text-white/20">{daysInPrevMonth - firstDayOfMonth + i + 1}</span>);
  }
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    const isToday = i === today;
    calendarDays.push(
        <span 
            key={`day-${i}`} 
            className={`${isToday ? 'bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto shadow-lg shadow-primary/50' : 'hover:text-white cursor-pointer'}`}
        >
            {i}
        </span>
    );
  }

  return (
    <div className="hidden lg:flex absolute right-6 top-6 bottom-24 w-80 flex-col gap-4 pointer-events-none z-0">
      {/* Weather Widget */}
      <div className="p-5 glass-panel rounded-xl pointer-events-auto hover:bg-white/5 transition-colors cursor-default">
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-col">
            <span className="text-3xl font-light text-white">72°</span>
            <span className="text-sm text-white/60">Mostly Sunny</span>
          </div>
          <span className="material-symbols-outlined text-yellow-300 text-4xl">sunny</span>
        </div>
        <div className="flex justify-between items-center mt-4 text-xs text-white/50 border-t border-white/10 pt-3">
          <span data-location="San Francisco">San Francisco</span>
          <span>H:75° L:62°</span>
        </div>
      </div>

      {/* Calendar Widget */}
      <div className="p-5 glass-panel rounded-xl pointer-events-auto hover:bg-white/5 transition-colors cursor-default flex-1 max-h-80 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <span className="font-medium text-white">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
          <span className="material-symbols-outlined text-white/50 text-sm cursor-pointer hover:text-white">chevron_right</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-white/60 mb-2">
          <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-white/90">
            {calendarDays}
        </div>
        <div className="mt-auto pt-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full bg-purple-500"></div>
            <div className="flex flex-col">
              <span className="text-xs text-white/90 font-medium">Design Review</span>
              <span className="text-[10px] text-white/50">10:00 AM - 11:30 AM</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Stats */}
      <div className="p-4 glass-panel rounded-xl pointer-events-auto hover:bg-white/5 transition-colors cursor-default">
        <div className="flex items-center gap-3 mb-3">
          <span className="material-symbols-outlined text-green-400">memory</span>
          <span className="text-sm font-medium text-white/90">System Status</span>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-white/60">
              <span>CPU</span>
              <span>32%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[32%] rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-white/60">
              <span>Memory</span>
              <span>64%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 w-[64%] rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
