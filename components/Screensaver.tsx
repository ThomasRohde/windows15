/**
 * Screensaver - Full-screen canvas animations
 *
 * Displays smooth 60fps animations using requestAnimationFrame.
 * Supports multiple animation types: starfield, matrix rain, bouncing logo, geometric patterns.
 * Features: configurable speed/intensity, clock/date overlay.
 */
import React, { useEffect, useRef } from 'react';
import { useScreensaver } from '../context/ScreensaverContext';
import { useLocalization } from '../context/LocalizationContext';
import { getViewportSize } from '../utils';

type Star = { x: number; y: number; z: number };
type StarfieldState = { kind: 'starfield'; stars: Star[] };
type MatrixState = { kind: 'matrix'; drops: number[]; chars: string; columns: number };
type BouncingLogoState = {
    kind: 'bouncing-logo';
    x: number;
    y: number;
    dx: number;
    dy: number;
    size: number;
    hue: number;
};
type GeometricShape = { size: number; speed: number; hue: number };
type GeometricState = { kind: 'geometric'; rotation: number; shapes: GeometricShape[] };
type AnimationState = StarfieldState | MatrixState | BouncingLogoState | GeometricState;

export const Screensaver: React.FC = () => {
    const { isScreensaverActive, settings } = useScreensaver();
    const { clockFormat } = useLocalization();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isScreensaverActive || !canvasRef.current || !settings) {
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas to full screen
        const resizeCanvas = () => {
            const { width, height } = getViewportSize();
            canvas.width = width;
            canvas.height = height;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        window.visualViewport?.addEventListener('resize', resizeCanvas);
        window.visualViewport?.addEventListener('scroll', resizeCanvas);

        // Initialize animation
        const initAnimation = (): AnimationState => {
            switch (settings.animation) {
                case 'starfield':
                    return initStarfield();
                case 'matrix':
                    return initMatrix();
                case 'bouncing-logo':
                    return initBouncingLogo();
                case 'geometric':
                    return initGeometric();
                default:
                    return initStarfield();
            }
        };

        // Starfield animation
        const initStarfield = (): StarfieldState => {
            const stars: Star[] = Array.from({ length: Math.floor(200 * settings.animationIntensity) }, () => ({
                x: Math.random() * canvas.width - canvas.width / 2,
                y: Math.random() * canvas.height - canvas.height / 2,
                z: Math.random() * canvas.width,
            }));
            return { kind: 'starfield', stars };
        };

        const drawStarfield = (state: StarfieldState) => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            state.stars.forEach(star => {
                star.z -= 2 * settings.animationSpeed;
                if (star.z <= 0) {
                    star.z = canvas.width;
                    star.x = Math.random() * canvas.width - centerX;
                    star.y = Math.random() * canvas.height - centerY;
                }

                const x = (star.x / star.z) * canvas.width + centerX;
                const y = (star.y / star.z) * canvas.height + centerY;
                const size = (1 - star.z / canvas.width) * 2 * settings.animationIntensity;

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            });
        };

        // Matrix rain animation
        const initMatrix = (): MatrixState => {
            const columns = Math.floor(canvas.width / 20);
            const drops = Array(columns).fill(1) as number[];
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
            return { kind: 'matrix', drops, chars, columns };
        };

        const drawMatrix = (state: MatrixState) => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = `rgba(0, 255, 0, ${settings.animationIntensity})`;
            ctx.font = '15px monospace';

            for (let i = 0; i < state.drops.length; i++) {
                const text = state.chars[Math.floor(Math.random() * state.chars.length)];
                const dropValue = state.drops[i] ?? 0;
                if (text) ctx.fillText(text, i * 20, dropValue * 20);

                if (dropValue * 20 > canvas.height && Math.random() > 0.975) {
                    state.drops[i] = 0;
                }
                state.drops[i] = dropValue + settings.animationSpeed;
            }
        };

        // Bouncing logo animation
        const initBouncingLogo = (): BouncingLogoState => {
            const size = 100 * settings.animationIntensity;
            return {
                kind: 'bouncing-logo',
                x: Math.random() * (canvas.width - size),
                y: Math.random() * (canvas.height - size),
                dx: (2 + Math.random() * 2) * settings.animationSpeed,
                dy: (2 + Math.random() * 2) * settings.animationSpeed,
                size,
                hue: Math.random() * 360,
            };
        };

        const drawBouncingLogo = (state: BouncingLogoState) => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Update position
            state.x += state.dx;
            state.y += state.dy;

            // Bounce off edges and change color
            if (state.x <= 0 || state.x + state.size >= canvas.width) {
                state.dx *= -1;
                state.hue = (state.hue + 30) % 360;
            }
            if (state.y <= 0 || state.y + state.size >= canvas.height) {
                state.dy *= -1;
                state.hue = (state.hue + 30) % 360;
            }

            // Draw logo (Windows-style square)
            ctx.fillStyle = `hsl(${state.hue}, 70%, 60%)`;
            ctx.fillRect(state.x, state.y, state.size / 2 - 2, state.size / 2 - 2);
            ctx.fillStyle = `hsl(${state.hue + 90}, 70%, 60%)`;
            ctx.fillRect(state.x + state.size / 2 + 2, state.y, state.size / 2 - 2, state.size / 2 - 2);
            ctx.fillStyle = `hsl(${state.hue + 180}, 70%, 60%)`;
            ctx.fillRect(state.x, state.y + state.size / 2 + 2, state.size / 2 - 2, state.size / 2 - 2);
            ctx.fillStyle = `hsl(${state.hue + 270}, 70%, 60%)`;
            ctx.fillRect(
                state.x + state.size / 2 + 2,
                state.y + state.size / 2 + 2,
                state.size / 2 - 2,
                state.size / 2 - 2
            );
        };

        // Geometric patterns animation
        const initGeometric = (): GeometricState => {
            return {
                kind: 'geometric',
                rotation: 0,
                shapes: Array.from({ length: Math.floor(5 * settings.animationIntensity) }, (_, i) => ({
                    size: 100 + i * 40,
                    speed: (0.005 + i * 0.002) * settings.animationSpeed,
                    hue: (i * 60) % 360,
                })),
            };
        };

        const drawGeometric = (state: GeometricState) => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            ctx.save();
            ctx.translate(centerX, centerY);

            state.shapes.forEach(shape => {
                ctx.rotate(shape.speed);
                ctx.strokeStyle = `hsla(${shape.hue}, 70%, 60%, ${settings.animationIntensity * 0.6})`;
                ctx.lineWidth = 2;

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
            state.rotation += 0.01 * settings.animationSpeed;
        };

        // Draw clock/date overlay
        const drawOverlay = () => {
            if (!settings.showClock && !settings.showDate) return;

            const now = new Date();
            const lines: string[] = [];

            if (settings.showClock) {
                const hours = now.getHours();
                const minutes = now.getMinutes();
                const timeStr =
                    clockFormat === '12h'
                        ? `${hours % 12 || 12}:${minutes.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`
                        : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                lines.push(timeStr);
            }

            if (settings.showDate) {
                const month = now.getMonth() + 1;
                const day = now.getDate();
                const year = now.getFullYear();
                // Use YYYY-MM-DD format for consistency in screensaver
                const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                lines.push(dateStr);
            }

            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = settings.showClock ? '48px monospace' : '32px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const lineHeight = settings.showClock ? 60 : 40;
            const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;

            lines.forEach((line, i) => {
                if (!ctx) return;
                // Draw text shadow for better visibility
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillText(line, canvas.width / 2 + 2, startY + i * lineHeight + 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
            });

            ctx.restore();
        };

        // Initialize the animation state
        const animationState = initAnimation();

        // Animation loop
        const animate = () => {
            switch (animationState.kind) {
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
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.visualViewport?.removeEventListener('resize', resizeCanvas);
            window.visualViewport?.removeEventListener('scroll', resizeCanvas);
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isScreensaverActive, settings, clockFormat]);

    if (!isScreensaverActive) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-black">
            <canvas ref={canvasRef} className="w-full h-full" />
        </div>
    );
};
