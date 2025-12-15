/**
 * ScreensaverSettings - UI panel for configuring screensaver
 *
 * Features:
 * - Enable/disable screensaver
 * - Adjust idle timeout (1-30 minutes)
 * - Select animation type with live preview
 * - Customize animation speed and intensity
 * - Toggle clock/date overlay
 * - All settings persist to Dexie
 */
import React, { useState, useRef, useEffect } from 'react';
import { useScreensaver } from '../../context/ScreensaverContext';
import { useLocalization } from '../../context/LocalizationContext';
import { Slider } from '../../components/ui';

// Simple preview component that mirrors the main Screensaver logic
const ScreensaverPreview: React.FC<{
    animation: 'starfield' | 'matrix' | 'bouncing-logo' | 'geometric';
    speed: number;
    intensity: number;
    showClock: boolean;
    showDate: boolean;
}> = ({ animation, speed, intensity, showClock, showDate }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { clockFormat, dateFormat } = useLocalization();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        let animationState: any = null;
        let animationFrameId: number | null = null;

        // Initialize animations (simplified versions)
        const initStarfield = () => {
            const stars = Array.from({ length: Math.floor(100 * intensity) }, () => ({
                x: Math.random() * canvas.width - canvas.width / 2,
                y: Math.random() * canvas.height - canvas.height / 2,
                z: Math.random() * canvas.width,
            }));
            return { stars };
        };

        const drawStarfield = (state: any) => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            state.stars.forEach((star: any) => {
                star.z -= 2 * speed;
                if (star.z <= 0) {
                    star.z = canvas.width;
                    star.x = Math.random() * canvas.width - centerX;
                    star.y = Math.random() * canvas.height - centerY;
                }

                const x = (star.x / star.z) * canvas.width + centerX;
                const y = (star.y / star.z) * canvas.height + centerY;
                const size = (1 - star.z / canvas.width) * 2 * intensity;

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            });
        };

        const initMatrix = () => {
            const columns = Math.floor(canvas.width / 15);
            const drops = Array(columns).fill(1);
            return { drops, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()' };
        };

        const drawMatrix = (state: any) => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = `rgba(0, 255, 0, ${intensity})`;
            ctx.font = '12px monospace';

            for (let i = 0; i < state.drops.length; i++) {
                const text = state.chars[Math.floor(Math.random() * state.chars.length)];
                ctx.fillText(text, i * 15, state.drops[i] * 15);

                if (state.drops[i] * 15 > canvas.height && Math.random() > 0.975) {
                    state.drops[i] = 0;
                }
                state.drops[i] += speed;
            }
        };

        const initBouncingLogo = () => {
            const size = 50 * intensity;
            return {
                x: Math.random() * (canvas.width - size),
                y: Math.random() * (canvas.height - size),
                dx: (1 + Math.random()) * speed,
                dy: (1 + Math.random()) * speed,
                size,
                hue: Math.random() * 360,
            };
        };

        const drawBouncingLogo = (state: any) => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            state.x += state.dx;
            state.y += state.dy;

            if (state.x <= 0 || state.x + state.size >= canvas.width) {
                state.dx *= -1;
                state.hue = (state.hue + 30) % 360;
            }
            if (state.y <= 0 || state.y + state.size >= canvas.height) {
                state.dy *= -1;
                state.hue = (state.hue + 30) % 360;
            }

            // Draw logo
            ctx.fillStyle = `hsl(${state.hue}, 70%, 60%)`;
            ctx.fillRect(state.x, state.y, state.size / 2 - 1, state.size / 2 - 1);
            ctx.fillStyle = `hsl(${state.hue + 90}, 70%, 60%)`;
            ctx.fillRect(state.x + state.size / 2 + 1, state.y, state.size / 2 - 1, state.size / 2 - 1);
            ctx.fillStyle = `hsl(${state.hue + 180}, 70%, 60%)`;
            ctx.fillRect(state.x, state.y + state.size / 2 + 1, state.size / 2 - 1, state.size / 2 - 1);
            ctx.fillStyle = `hsl(${state.hue + 270}, 70%, 60%)`;
            ctx.fillRect(
                state.x + state.size / 2 + 1,
                state.y + state.size / 2 + 1,
                state.size / 2 - 1,
                state.size / 2 - 1
            );
        };

        const initGeometric = () => {
            return {
                rotation: 0,
                shapes: Array.from({ length: Math.floor(3 * intensity) }, (_, i) => ({
                    size: 50 + i * 20,
                    speed: (0.003 + i * 0.001) * speed,
                    hue: (i * 60) % 360,
                })),
            };
        };

        const drawGeometric = (state: any) => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            ctx.save();
            ctx.translate(centerX, centerY);

            state.shapes.forEach((shape: any) => {
                ctx.rotate(shape.speed);
                ctx.strokeStyle = `hsla(${shape.hue}, 70%, 60%, ${intensity * 0.6})`;
                ctx.lineWidth = 1;

                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    const x = Math.cos(angle) * shape.size;
                    const y = Math.sin(angle) * shape.size;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();
            });

            ctx.restore();
        };

        // Draw clock/date overlay
        const drawOverlay = () => {
            if (!showClock && !showDate) return;

            const now = new Date();
            const lines: string[] = [];

            if (showClock) {
                const hours = now.getHours();
                const minutes = now.getMinutes();
                const timeStr =
                    clockFormat === '12h'
                        ? `${hours % 12 || 12}:${minutes.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`
                        : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                lines.push(timeStr);
            }

            if (showDate) {
                const month = now.getMonth() + 1;
                const day = now.getDate();
                const year = now.getFullYear();
                const dateStr =
                    dateFormat === 'MM/DD/YYYY'
                        ? `${month}/${day}/${year}`
                        : dateFormat === 'DD/MM/YYYY'
                          ? `${day}/${month}/${year}`
                          : `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                lines.push(dateStr);
            }

            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = showClock ? '24px monospace' : '16px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const lineHeight = showClock ? 30 : 20;
            const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;

            lines.forEach((line, i) => {
                ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
            });

            ctx.restore();
        };

        // Initialize animation
        switch (animation) {
            case 'starfield':
                animationState = initStarfield();
                break;
            case 'matrix':
                animationState = initMatrix();
                break;
            case 'bouncing-logo':
                animationState = initBouncingLogo();
                break;
            case 'geometric':
                animationState = initGeometric();
                break;
        }

        // Animation loop
        const animate = () => {
            switch (animation) {
                case 'starfield':
                    drawStarfield(animationState);
                    break;
                case 'matrix':
                    drawMatrix(animationState);
                    break;
                case 'bouncing-logo':
                    drawBouncingLogo(animationState);
                    break;
                case 'geometric':
                    drawGeometric(animationState);
                    break;
            }

            drawOverlay();
            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [animation, speed, intensity, showClock, showDate, clockFormat, dateFormat]);

    return <canvas ref={canvasRef} className="w-full h-full bg-black rounded-lg" />;
};

export const ScreensaverSettings: React.FC = () => {
    const { settings, updateSettings, activateScreensaver } = useScreensaver();
    const [isSaving, setIsSaving] = useState(false);

    if (!settings) {
        return (
            <div className="max-w-4xl">
                <h1 className="text-3xl font-light mb-3">Screensaver</h1>
                <p className="text-sm text-white/60">Loading screensaver settings...</p>
            </div>
        );
    }

    const handleToggleEnabled = async () => {
        setIsSaving(true);
        await updateSettings({ enabled: !settings.enabled });
        setIsSaving(false);
    };

    const handleTimeoutChange = async (minutes: number) => {
        setIsSaving(true);
        await updateSettings({ timeout: minutes * 60 * 1000 });
        setIsSaving(false);
    };

    const handleAnimationChange = async (animation: 'starfield' | 'matrix' | 'bouncing-logo' | 'geometric') => {
        setIsSaving(true);
        await updateSettings({ animation });
        setIsSaving(false);
    };

    const handleSpeedChange = async (speed: number) => {
        setIsSaving(true);
        await updateSettings({ animationSpeed: speed });
        setIsSaving(false);
    };

    const handleIntensityChange = async (intensity: number) => {
        setIsSaving(true);
        await updateSettings({ animationIntensity: intensity });
        setIsSaving(false);
    };

    const handleClockToggle = async () => {
        setIsSaving(true);
        await updateSettings({ showClock: !settings.showClock });
        setIsSaving(false);
    };

    const handleDateToggle = async () => {
        setIsSaving(true);
        await updateSettings({ showDate: !settings.showDate });
        setIsSaving(false);
    };

    const handlePreview = () => {
        activateScreensaver();
    };

    const timeoutMinutes = Math.round(settings.timeout / 60000);

    return (
        <div className="max-w-4xl">
            <h1 className="text-3xl font-light mb-8">Screensaver</h1>

            {/* Live Preview */}
            <section className="mb-8">
                <h3 className="text-lg font-medium mb-4">Live Preview</h3>
                <div className="aspect-video w-full overflow-hidden rounded-lg ring-1 ring-white/10">
                    <ScreensaverPreview
                        animation={settings.animation}
                        speed={settings.animationSpeed}
                        intensity={settings.animationIntensity}
                        showClock={settings.showClock}
                        showDate={settings.showDate}
                    />
                </div>
            </section>

            {/* Enable/Disable Toggle */}
            <section className="mb-8">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                        <h3 className="text-lg font-medium">Enable Screensaver</h3>
                        <p className="text-sm text-white/60">Automatically activate screensaver after idle timeout</p>
                    </div>
                    <button
                        onClick={handleToggleEnabled}
                        disabled={isSaving}
                        className={`relative w-14 h-8 rounded-full transition-colors ${settings.enabled ? 'bg-primary' : 'bg-white/20'} ${isSaving ? 'opacity-50' : ''}`}
                    >
                        <div
                            className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${settings.enabled ? 'translate-x-6' : ''}`}
                        />
                    </button>
                </div>
            </section>

            {/* Timeout Setting */}
            <section className="mb-8">
                <h3 className="text-lg font-medium mb-4">Idle Timeout</h3>
                <p className="text-sm text-white/60 mb-4">Time of inactivity before screensaver activates</p>
                <Slider
                    value={timeoutMinutes}
                    min={1}
                    max={30}
                    onChange={handleTimeoutChange}
                    formatValue={v => `${v} ${v === 1 ? 'min' : 'mins'}`}
                    disabled={!settings.enabled || isSaving}
                />
            </section>

            {/* Animation Type Selection */}
            <section className="mb-8">
                <h3 className="text-lg font-medium mb-4">Animation Type</h3>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => handleAnimationChange('starfield')}
                        disabled={!settings.enabled || isSaving}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                            settings.animation === 'starfield'
                                ? 'border-primary bg-primary/10'
                                : 'border-white/10 hover:border-white/20'
                        } ${!settings.enabled || isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <span className="material-symbols-outlined text-2xl">star</span>
                            <h4 className="font-medium">Starfield</h4>
                        </div>
                        <p className="text-sm text-white/60">Flying through space</p>
                    </button>

                    <button
                        onClick={() => handleAnimationChange('matrix')}
                        disabled={!settings.enabled || isSaving}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                            settings.animation === 'matrix'
                                ? 'border-primary bg-primary/10'
                                : 'border-white/10 hover:border-white/20'
                        } ${!settings.enabled || isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <span className="material-symbols-outlined text-2xl">code</span>
                            <h4 className="font-medium">Matrix Rain</h4>
                        </div>
                        <p className="text-sm text-white/60">Falling characters</p>
                    </button>

                    <button
                        onClick={() => handleAnimationChange('bouncing-logo')}
                        disabled={!settings.enabled || isSaving}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                            settings.animation === 'bouncing-logo'
                                ? 'border-primary bg-primary/10'
                                : 'border-white/10 hover:border-white/20'
                        } ${!settings.enabled || isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <span className="material-symbols-outlined text-2xl">sports_soccer</span>
                            <h4 className="font-medium">Bouncing Logo</h4>
                        </div>
                        <p className="text-sm text-white/60">Colorful logo</p>
                    </button>

                    <button
                        onClick={() => handleAnimationChange('geometric')}
                        disabled={!settings.enabled || isSaving}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                            settings.animation === 'geometric'
                                ? 'border-primary bg-primary/10'
                                : 'border-white/10 hover:border-white/20'
                        } ${!settings.enabled || isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <span className="material-symbols-outlined text-2xl">shapes</span>
                            <h4 className="font-medium">Geometric</h4>
                        </div>
                        <p className="text-sm text-white/60">Rotating patterns</p>
                    </button>
                </div>
            </section>

            {/* Speed Control */}
            <section className="mb-8">
                <h3 className="text-lg font-medium mb-4">Animation Speed</h3>
                <p className="text-sm text-white/60 mb-4">Control how fast the animation moves</p>
                <Slider
                    value={settings.animationSpeed}
                    min={0.25}
                    max={2}
                    step={0.25}
                    onChange={handleSpeedChange}
                    formatValue={v => `${v}x`}
                    rangeLabels={['Slow', 'Fast']}
                    disabled={!settings.enabled || isSaving}
                />
            </section>

            {/* Intensity Control */}
            <section className="mb-8">
                <h3 className="text-lg font-medium mb-4">Animation Intensity</h3>
                <p className="text-sm text-white/60 mb-4">Control animation density and brightness</p>
                <Slider
                    value={settings.animationIntensity}
                    min={0.25}
                    max={2}
                    step={0.25}
                    onChange={handleIntensityChange}
                    formatValue={v => `${v}x`}
                    rangeLabels={['Subtle', 'Intense']}
                    disabled={!settings.enabled || isSaving}
                />
            </section>

            {/* Overlay Options */}
            <section className="mb-8">
                <h3 className="text-lg font-medium mb-4">Overlay Options</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div>
                            <h4 className="font-medium">Show Clock</h4>
                            <p className="text-sm text-white/60">Display current time on screensaver</p>
                        </div>
                        <button
                            onClick={handleClockToggle}
                            disabled={!settings.enabled || isSaving}
                            className={`relative w-14 h-8 rounded-full transition-colors ${settings.showClock ? 'bg-primary' : 'bg-white/20'} ${!settings.enabled || isSaving ? 'opacity-50' : ''}`}
                        >
                            <div
                                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${settings.showClock ? 'translate-x-6' : ''}`}
                            />
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div>
                            <h4 className="font-medium">Show Date</h4>
                            <p className="text-sm text-white/60">Display current date on screensaver</p>
                        </div>
                        <button
                            onClick={handleDateToggle}
                            disabled={!settings.enabled || isSaving}
                            className={`relative w-14 h-8 rounded-full transition-colors ${settings.showDate ? 'bg-primary' : 'bg-white/20'} ${!settings.enabled || isSaving ? 'opacity-50' : ''}`}
                        >
                            <div
                                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${settings.showDate ? 'translate-x-6' : ''}`}
                            />
                        </button>
                    </div>
                </div>
            </section>

            {/* Preview Button */}
            <section className="mb-8">
                <button
                    onClick={handlePreview}
                    disabled={!settings.enabled || isSaving}
                    className="px-6 py-3 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">fullscreen</span>
                    Full Screen Preview
                </button>
                <p className="text-sm text-white/60 mt-2">Click or press any key to exit the preview</p>
            </section>
        </div>
    );
};
