import React, { useState, useRef } from 'react';
import { AppContainer, TabSwitcher, Card, Button, SectionLabel, TextInput } from '../components/ui';
import { useInterval, useSound } from '../hooks';
import { formatDuration } from '../utils/timeFormatters';

type TimerMode = 'stopwatch' | 'countdown';

export const Timer = () => {
    const [mode, setMode] = useState<TimerMode>('stopwatch');
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [laps, setLaps] = useState<number[]>([]);
    const [countdownInput, setCountdownInput] = useState({ hours: 0, minutes: 5, seconds: 0 });
    const { playSound } = useSound();
    const hasPlayedCompleteSound = useRef(false);

    // Use useInterval hook with 10ms precision for smooth display
    useInterval(
        () => {
            setTime(prev => {
                if (mode === 'countdown') {
                    if (prev <= 0) {
                        setIsRunning(false);
                        // Play completion sound when countdown reaches 0
                        if (!hasPlayedCompleteSound.current) {
                            playSound('complete');
                            hasPlayedCompleteSound.current = true;
                        }
                        return 0;
                    }
                    return prev - 10;
                }
                return prev + 10;
            });
        },
        isRunning ? 10 : null // Pass null when paused
    );

    const formatTime = (ms: number) => formatDuration(ms, { showCentiseconds: true });

    const handleStart = () => {
        if (mode === 'countdown' && time === 0) {
            const totalMs = (countdownInput.hours * 3600 + countdownInput.minutes * 60 + countdownInput.seconds) * 1000;
            setTime(totalMs);
            hasPlayedCompleteSound.current = false; // Reset sound flag for new countdown
        }
        setIsRunning(true);
    };

    const handleStop = () => {
        setIsRunning(false);
    };

    const handleReset = () => {
        setIsRunning(false);
        setTime(0);
        setLaps([]);
        hasPlayedCompleteSound.current = false; // Reset sound flag on reset
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

    return (
        <AppContainer>
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
                        <TextInput
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
                            className="w-16 bg-white/10 text-center"
                            placeholder="HH"
                        />
                        <span className="text-white">:</span>
                        <TextInput
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
                            className="w-16 bg-white/10 text-center"
                            placeholder="MM"
                        />
                        <span className="text-white">:</span>
                        <TextInput
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
                            className="w-16 bg-white/10 text-center"
                            placeholder="SS"
                        />
                    </div>
                )}
            </Card>

            <div className="flex gap-2 justify-center">
                {!isRunning ? (
                    <Button label="Start" onClick={handleStart} variant="primary" size="lg" />
                ) : (
                    <Button label="Stop" onClick={handleStop} variant="danger" size="lg" />
                )}
                <Button label="Reset" onClick={handleReset} size="lg" />
                {mode === 'stopwatch' && <Button label="Lap" onClick={handleLap} size="lg" />}
            </div>

            {laps.length > 0 && (
                <Card className="max-h-32 overflow-y-auto">
                    <SectionLabel>Laps</SectionLabel>
                    {laps.map((lap, index) => (
                        <div key={index} className="flex justify-between text-white py-1 border-b border-white/10">
                            <span>Lap {index + 1}</span>
                            <span className="font-mono">{formatTime(lap)}</span>
                        </div>
                    ))}
                </Card>
            )}
        </AppContainer>
    );
};
