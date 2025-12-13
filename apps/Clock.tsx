import React, { useState, useEffect } from 'react';

interface TimeZone {
    name: string;
    timezone: string;
    offset: string;
}

const timeZones: TimeZone[] = [
    { name: 'Local', timezone: 'local', offset: '' },
    { name: 'New York', timezone: 'America/New_York', offset: 'EST/EDT' },
    { name: 'London', timezone: 'Europe/London', offset: 'GMT/BST' },
    { name: 'Tokyo', timezone: 'Asia/Tokyo', offset: 'JST' },
    { name: 'Sydney', timezone: 'Australia/Sydney', offset: 'AEST/AEDT' },
];

export const Clock = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [viewMode, setViewMode] = useState<'digital' | 'analog'>('digital');
    const [selectedZone, setSelectedZone] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const getTimeForZone = (tz: TimeZone) => {
        if (tz.timezone === 'local') {
            return currentTime;
        }
        return new Date(currentTime.toLocaleString('en-US', { timeZone: tz.timezone }));
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: true 
        });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const AnalogClock = ({ date }: { date: Date }) => {
        const seconds = date.getSeconds();
        const minutes = date.getMinutes();
        const hours = date.getHours() % 12;

        const secondDeg = (seconds / 60) * 360;
        const minuteDeg = ((minutes + seconds / 60) / 60) * 360;
        const hourDeg = ((hours + minutes / 60) / 12) * 360;

        return (
            <div className="relative w-48 h-48 rounded-full bg-black/30 border-4 border-white/20">
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-3 bg-white/60 rounded"
                        style={{
                            left: '50%',
                            top: '8px',
                            transformOrigin: '50% 88px',
                            transform: `translateX(-50%) rotate(${i * 30}deg)`,
                        }}
                    />
                ))}
                <div
                    className="absolute w-1.5 h-14 bg-white rounded-full"
                    style={{
                        left: '50%',
                        bottom: '50%',
                        transformOrigin: '50% 100%',
                        transform: `translateX(-50%) rotate(${hourDeg}deg)`,
                    }}
                />
                <div
                    className="absolute w-1 h-20 bg-white/80 rounded-full"
                    style={{
                        left: '50%',
                        bottom: '50%',
                        transformOrigin: '50% 100%',
                        transform: `translateX(-50%) rotate(${minuteDeg}deg)`,
                    }}
                />
                <div
                    className="absolute w-0.5 h-20 bg-orange-500 rounded-full"
                    style={{
                        left: '50%',
                        bottom: '50%',
                        transformOrigin: '50% 100%',
                        transform: `translateX(-50%) rotate(${secondDeg}deg)`,
                    }}
                />
                <div className="absolute w-3 h-3 bg-orange-500 rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
        );
    };

    const selectedTime = getTimeForZone(timeZones[selectedZone]);

    return (
        <div className="h-full bg-background-dark p-4 flex flex-col gap-4">
            <div className="flex gap-2 justify-center">
                <button
                    onClick={() => setViewMode('digital')}
                    className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'digital' ? 'bg-orange-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                    Digital
                </button>
                <button
                    onClick={() => setViewMode('analog')}
                    className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'analog' ? 'bg-orange-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                    Analog
                </button>
            </div>

            <div className="flex-1 bg-black/20 rounded-xl p-4 flex flex-col items-center justify-center">
                <div className="text-white/60 text-lg mb-2">
                    {timeZones[selectedZone].name} {timeZones[selectedZone].offset && `(${timeZones[selectedZone].offset})`}
                </div>
                
                {viewMode === 'digital' ? (
                    <>
                        <span className="text-5xl font-light text-white font-mono">{formatTime(selectedTime)}</span>
                        <span className="text-white/60 mt-2">{formatDate(selectedTime)}</span>
                    </>
                ) : (
                    <>
                        <AnalogClock date={selectedTime} />
                        <span className="text-white/60 mt-4">{formatDate(selectedTime)}</span>
                    </>
                )}
            </div>

            <div className="bg-black/20 rounded-xl p-3">
                <div className="text-white/60 text-sm mb-2">World Clocks</div>
                <div className="grid gap-2">
                    {timeZones.map((tz, index) => {
                        const tzTime = getTimeForZone(tz);
                        return (
                            <button
                                key={tz.name}
                                onClick={() => setSelectedZone(index)}
                                className={`flex justify-between items-center p-2 rounded-lg transition-all ${selectedZone === index ? 'bg-orange-500/30' : 'hover:bg-white/10'}`}
                            >
                                <span className="text-white">{tz.name}</span>
                                <span className="text-white/80 font-mono text-sm">{formatTime(tzTime)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
