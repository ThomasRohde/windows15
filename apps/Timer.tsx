import React, { useState, useEffect, useRef } from 'react';
import { TabSwitcher, Card } from '../components/ui';

type TimerMode = 'stopwatch' | 'countdown';

export const Timer = () => {
    const [mode, setMode] = useState<TimerMode>('stopwatch');
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [laps, setLaps] = useState<number[]>([]);
    const [countdownInput, setCountdownInput] = useState({ hours: 0, minutes: 5, seconds: 0 });
    const intervalIdsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set());
    const runTokenRef = useRef(0);

    useEffect(() => {
        if (!isRunning) return;

        const token = ++runTokenRef.current;
        const intervalId = setInterval(() => {
            if (runTokenRef.current !== token) return;
            setTime(prev => {
                if (mode === 'countdown') {
                    if (prev <= 0) {
                        setIsRunning(false);
                        return 0;
                    }
                    return prev - 10;
                }
                return prev + 10;
            });
        }, 10);

        intervalIdsRef.current.add(intervalId);
        return () => {
            clearInterval(intervalId);
            intervalIdsRef.current.delete(intervalId);
        };
    }, [isRunning, mode]);

    const stopAllIntervals = () => {
        runTokenRef.current++;
        intervalIdsRef.current.forEach(id => clearInterval(id));
        intervalIdsRef.current.clear();
    };

    const formatTime = (ms: number) => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    };

    const handleStart = () => {
        if (mode === 'countdown' && time === 0) {
            const totalMs = (countdownInput.hours * 3600 + countdownInput.minutes * 60 + countdownInput.seconds) * 1000;
            setTime(totalMs);
        }
        setIsRunning(true);
    };

    const handleStop = () => {
        stopAllIntervals();
        setIsRunning(false);
    };

    const handleReset = () => {
        stopAllIntervals();
        setIsRunning(false);
        setTime(0);
        setLaps([]);
    };

    const handleLap = () => {
        if (isRunning && mode === 'stopwatch') {
            setLaps(prev => [...prev, time]);
        }
    };

    const switchMode = (newMode: TimerMode) => {
        handleReset();
        setMode(newMode);
    };

    const Btn = ({
        label,
        onClick,
        variant = 'default',
    }: {
        label: string;
        onClick: () => void;
        variant?: 'default' | 'primary' | 'danger';
    }) => (
        <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onPointerUp={e => {
                e.stopPropagation();
                onClick();
            }}
            onClick={e => {
                e.stopPropagation();
                if (e.detail === 0) onClick();
            }}
            className={`px-6 py-3 rounded-lg text-lg font-medium transition-all active:scale-95
                ${variant === 'primary' ? 'bg-green-500 text-white hover:bg-green-400' : ''}
                ${variant === 'danger' ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : ''}
                ${variant === 'default' ? 'bg-white/10 text-white hover:bg-white/20' : ''}
            `}
        >
            {label}
        </button>
    );

    return (
        <div className="h-full bg-background-dark p-4 flex flex-col gap-4">
            <TabSwitcher
                options={[
                    { value: 'stopwatch', label: 'Stopwatch' },
                    { value: 'countdown', label: 'Countdown' },
                ]}
                value={mode}
                onChange={switchMode}
            />

            <Card className="flex-1 flex flex-col items-center justify-center">
                <span className="text-5xl font-light text-white font-mono">{formatTime(time)}</span>

                {mode === 'countdown' && !isRunning && time === 0 && (
                    <div className="flex gap-2 mt-4 items-center">
                        <input
                            type="number"
                            min="0"
                            max="23"
                            value={countdownInput.hours}
                            onChange={e =>
                                setCountdownInput(prev => ({
                                    ...prev,
                                    hours: Math.max(0, parseInt(e.target.value) || 0),
                                }))
                            }
                            className="w-16 bg-white/10 text-white text-center rounded-lg p-2"
                            placeholder="HH"
                        />
                        <span className="text-white">:</span>
                        <input
                            type="number"
                            min="0"
                            max="59"
                            value={countdownInput.minutes}
                            onChange={e =>
                                setCountdownInput(prev => ({
                                    ...prev,
                                    minutes: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)),
                                }))
                            }
                            className="w-16 bg-white/10 text-white text-center rounded-lg p-2"
                            placeholder="MM"
                        />
                        <span className="text-white">:</span>
                        <input
                            type="number"
                            min="0"
                            max="59"
                            value={countdownInput.seconds}
                            onChange={e =>
                                setCountdownInput(prev => ({
                                    ...prev,
                                    seconds: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)),
                                }))
                            }
                            className="w-16 bg-white/10 text-white text-center rounded-lg p-2"
                            placeholder="SS"
                        />
                    </div>
                )}
            </Card>

            <div className="flex gap-2 justify-center">
                {!isRunning ? (
                    <Btn label="Start" onClick={handleStart} variant="primary" />
                ) : (
                    <Btn label="Stop" onClick={handleStop} variant="danger" />
                )}
                <Btn label="Reset" onClick={handleReset} />
                {mode === 'stopwatch' && <Btn label="Lap" onClick={handleLap} />}
            </div>

            {laps.length > 0 && (
                <Card className="max-h-32 overflow-y-auto">
                    <div className="text-white/60 text-sm mb-2">Laps</div>
                    {laps.map((lap, index) => (
                        <div key={index} className="flex justify-between text-white py-1 border-b border-white/10">
                            <span>Lap {index + 1}</span>
                            <span className="font-mono">{formatTime(lap)}</span>
                        </div>
                    ))}
                </Card>
            )}
        </div>
    );
};
