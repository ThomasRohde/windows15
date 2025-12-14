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

export const Screensaver: React.FC = () => {
    const { isScreensaverActive, settings } = useScreensaver();
    const { clockFormat, dateFormat } = useLocalization();
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
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Animation state based on selected animation type
        let animationState: any = null;

        // Initialize animation
        const initAnimation = () => {
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
        const initStarfield = () => {
            const stars = Array.from({ length: Math.floor(200 * settings.animationIntensity) }, () => ({
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
        const initMatrix = () => {
            const columns = Math.floor(canvas.width / 20);
            const drops = Array(columns).fill(1);
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
            return { drops, chars, columns };
        };

        const drawMatrix = (state: any) => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = `rgba(0, 255, 0, ${settings.animationIntensity})`;
            ctx.font = '15px monospace';

            for (let i = 0; i < state.drops.length; i++) {
                const text = state.chars[Math.floor(Math.random() * state.chars.length)];
                ctx.fillText(text, i * 20, state.drops[i] * 20);

                if (state.drops[i] * 20 > canvas.height && Math.random() > 0.975) {
                    state.drops[i] = 0;
                }
                state.drops[i] += settings.animationSpeed;
            }
        };

        // Bouncing logo animation
        const initBouncingLogo = () => {
            const size = 100 * settings.animationIntensity;
            return {
                x: Math.random() * (canvas.width - size),
                y: Math.random() * (canvas.height - size),
                dx: (2 + Math.random() * 2) * settings.animationSpeed,
                dy: (2 + Math.random() * 2) * settings.animationSpeed,
                size,
                hue: Math.random() * 360,
            };
        };

        const drawBouncingLogo = (state: any) => {
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
        const initGeometric = () => {
            return {
                rotation: 0,
                shapes: Array.from({ length: Math.floor(5 * settings.animationIntensity) }, (_, i) => ({
                    size: 100 + i * 40,
                    speed: (0.005 + i * 0.002) * settings.animationSpeed,
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
            ctx.font = settings.showClock ? '48px monospace' : '32px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const lineHeight = settings.showClock ? 60 : 40;
            const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;

            lines.forEach((line, i) => {
                // Draw text shadow for better visibility
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillText(line, canvas.width / 2 + 2, startY + i * lineHeight + 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
            });

            ctx.restore();
        };

        // Initialize the animation state
        animationState = initAnimation();

        // Animation loop
        const animate = () => {
            switch (settings.animation) {
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
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isScreensaverActive, settings, clockFormat, dateFormat]);

    if (!isScreensaverActive) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-black">
            <canvas ref={canvasRef} className="w-full h-full" />
        </div>
    );
};
