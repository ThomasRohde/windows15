import React, { useEffect, useMemo, useState } from 'react';
import { useOS } from '../context/OSContext';
import { STORAGE_KEYS, storageService, useDexieLiveQuery } from '../utils/storage';

type CalendarEvent = {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD
    allDay: boolean;
    startTime: string; // HH:MM
    endTime: string; // HH:MM
};

interface WidgetWeather {
    temp: number;
    high: number;
    low: number;
    condition: string;
    icon: string;
    location: string;
}

const weatherCodeToInfo: Record<number, { icon: string; condition: string }> = {
    0: { icon: 'sunny', condition: 'Clear' },
    1: { icon: 'sunny', condition: 'Mostly Clear' },
    2: { icon: 'partly_cloudy_day', condition: 'Partly Cloudy' },
    3: { icon: 'cloud', condition: 'Overcast' },
    45: { icon: 'foggy', condition: 'Foggy' },
    48: { icon: 'foggy', condition: 'Foggy' },
    51: { icon: 'grain', condition: 'Drizzle' },
    53: { icon: 'grain', condition: 'Drizzle' },
    55: { icon: 'grain', condition: 'Drizzle' },
    61: { icon: 'rainy', condition: 'Rainy' },
    63: { icon: 'rainy', condition: 'Rainy' },
    65: { icon: 'rainy', condition: 'Heavy Rain' },
    71: { icon: 'ac_unit', condition: 'Snowy' },
    73: { icon: 'ac_unit', condition: 'Snowy' },
    75: { icon: 'ac_unit', condition: 'Snowy' },
    80: { icon: 'rainy', condition: 'Showers' },
    81: { icon: 'rainy', condition: 'Showers' },
    82: { icon: 'thunderstorm', condition: 'Storms' },
    95: { icon: 'thunderstorm', condition: 'Thunderstorm' },
    96: { icon: 'thunderstorm', condition: 'Thunderstorm' },
    99: { icon: 'thunderstorm', condition: 'Thunderstorm' },
};

export const Widgets: React.FC = () => {
    const { openWindow } = useOS();
    const [currentDate, setCurrentDate] = useState(new Date());
    const { value: calendarEventsRaw } = useDexieLiveQuery(
        () => storageService.get<CalendarEvent[]>(STORAGE_KEYS.calendarEvents),
        [STORAGE_KEYS.calendarEvents]
    );
    const calendarEvents = Array.isArray(calendarEventsRaw) ? calendarEventsRaw : [];
    const [weather, setWeather] = useState<WidgetWeather>({
        temp: 72,
        high: 75,
        low: 62,
        condition: 'Mostly Sunny',
        icon: 'sunny',
        location: 'Loading...',
    });

    useEffect(() => {
        const timer = setInterval(() => setCurrentDate(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchWeather = async (lat: number, lon: number, location: string) => {
            try {
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&temperature_unit=fahrenheit`
                );
                const data = await response.json();
                const code = data.current.weather_code;
                const info = weatherCodeToInfo[code] || { icon: 'sunny', condition: 'Clear' };
                setWeather({
                    temp: Math.round(data.current.temperature_2m),
                    high: Math.round(data.daily.temperature_2m_max[0]),
                    low: Math.round(data.daily.temperature_2m_min[0]),
                    condition: info.condition,
                    icon: info.icon,
                    location,
                });
            } catch {
                setWeather(prev => ({ ...prev, location: 'San Francisco' }));
            }
        };

        const getLocation = async (lat: number, lon: number) => {
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
                );
                const data = await response.json();
                return data.address?.city || data.address?.town || data.address?.village || 'Your Location';
            } catch {
                return 'Your Location';
            }
        };

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                async pos => {
                    const loc = await getLocation(pos.coords.latitude, pos.coords.longitude);
                    fetchWeather(pos.coords.latitude, pos.coords.longitude, loc);
                },
                () => fetchWeather(37.7749, -122.4194, 'San Francisco')
            );
        } else {
            fetchWeather(37.7749, -122.4194, 'San Francisco');
        }
    }, []);

    const pad2 = (value: number) => value.toString().padStart(2, '0');
    const toYmd = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    const toHm = (date: Date) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
    const fromYmd = (ymd: string) => {
        const [y, m, d] = ymd.split('-').map(Number);
        if (!y || !m || !d) return new Date();
        return new Date(y, m - 1, d);
    };

    const formatTime = (hm: string) => {
        const [h, m] = hm.split(':').map(Number);
        const date = new Date();
        date.setHours(h || 0, m || 0, 0, 0);
        return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    };

    const nextEvent = useMemo(() => {
        const todayKey = toYmd(currentDate);
        const nowTimeKey = toHm(currentDate);

        const upcoming = calendarEvents
            .filter(event => {
                if (event.date > todayKey) return true;
                if (event.date < todayKey) return false;
                if (event.allDay) return true;
                return event.startTime >= nowTimeKey;
            })
            .slice()
            .sort((a, b) => {
                const dateSort = a.date.localeCompare(b.date);
                if (dateSort !== 0) return dateSort;
                const aTime = a.allDay ? '00:00' : a.startTime;
                const bTime = b.allDay ? '00:00' : b.startTime;
                return aTime.localeCompare(bTime);
            });

        return upcoming[0] ?? null;
    }, [calendarEvents, currentDate]);

    const openCalendar = (ymd?: string) => {
        if (ymd) {
            openWindow('calendar', { initialDate: ymd });
            return;
        }
        openWindow('calendar');
    };

    const year = currentDate.getFullYear();
    const monthIndex = currentDate.getMonth();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const daysInPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
    const today = currentDate.getDate();

    const calendarDays = [];
    // Previous month padding
    for (let i = 0; i < firstDayOfMonth; i++) {
        const dayNumber = daysInPrevMonth - firstDayOfMonth + i + 1;
        const cellDate = new Date(year, monthIndex - 1, dayNumber);
        calendarDays.push(
            <button
                key={`prev-${i}`}
                type="button"
                onClick={() => openCalendar(toYmd(cellDate))}
                className="text-white/20 hover:text-white/60"
            >
                {dayNumber}
            </button>
        );
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
        const isToday = i === today;
        const cellDate = new Date(year, monthIndex, i);
        calendarDays.push(
            <button
                key={`day-${i}`}
                type="button"
                onClick={() => openCalendar(toYmd(cellDate))}
                className={`${isToday ? 'bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto shadow-lg shadow-primary/50' : 'hover:text-white cursor-pointer'}`}
            >
                {i}
            </button>
        );
    }

    return (
        <div className="hidden lg:flex absolute right-6 top-6 bottom-24 w-80 flex-col gap-4 pointer-events-none z-0">
            {/* Weather Widget */}
            <div className="p-5 glass-panel rounded-xl pointer-events-auto hover:bg-white/5 transition-colors cursor-default">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                        <span className="text-3xl font-light text-white">{weather.temp}°</span>
                        <span className="text-sm text-white/60">{weather.condition}</span>
                    </div>
                    <span className="material-symbols-outlined text-yellow-300 text-4xl">{weather.icon}</span>
                </div>
                <div className="flex justify-between items-center mt-4 text-xs text-white/50 border-t border-white/10 pt-3">
                    <span>{weather.location}</span>
                    <span>
                        H:{weather.high}° L:{weather.low}°
                    </span>
                </div>
            </div>

            {/* Calendar Widget */}
            <div className="p-5 glass-panel rounded-xl pointer-events-auto hover:bg-white/5 transition-colors cursor-default flex-1 max-h-80 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <span className="font-medium text-white">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                        type="button"
                        onClick={() => openCalendar(toYmd(currentDate))}
                        className="material-symbols-outlined text-white/50 text-sm cursor-pointer hover:text-white"
                        title="Open Calendar"
                    >
                        chevron_right
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-white/60 mb-2">
                    <span>S</span>
                    <span>M</span>
                    <span>T</span>
                    <span>W</span>
                    <span>T</span>
                    <span>F</span>
                    <span>S</span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-white/90">
                    {calendarDays}
                </div>
                <div className="mt-auto pt-4 border-t border-white/10">
                    {nextEvent ? (
                        <button
                            type="button"
                            onClick={() => openCalendar(nextEvent.date)}
                            className="w-full flex items-center gap-3 text-left hover:bg-white/5 rounded-lg p-2 -m-2 transition-colors"
                        >
                            <div className="w-1 h-8 rounded-full bg-purple-500"></div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs text-white/90 font-medium truncate">{nextEvent.title}</span>
                                <span className="text-[10px] text-white/50 truncate">
                                    {nextEvent.date === toYmd(currentDate)
                                        ? ''
                                        : `${fromYmd(nextEvent.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · `}
                                    {nextEvent.allDay
                                        ? 'All day'
                                        : `${formatTime(nextEvent.startTime)} - ${formatTime(nextEvent.endTime)}`}
                                </span>
                            </div>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => openCalendar(toYmd(currentDate))}
                            className="w-full flex items-center gap-3 text-left hover:bg-white/5 rounded-lg p-2 -m-2 transition-colors"
                        >
                            <div className="w-1 h-8 rounded-full bg-white/20"></div>
                            <div className="flex flex-col">
                                <span className="text-xs text-white/80 font-medium">No upcoming events</span>
                                <span className="text-[10px] text-white/50">Add one in Calendar</span>
                            </div>
                        </button>
                    )}
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
