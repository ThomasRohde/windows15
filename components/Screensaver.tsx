/**
 * Screensaver - Full-screen canvas animations
 *
 * Displays smooth 60fps animations using requestAnimationFrame.
 * Supports multiple animation types: starfield, matrix rain, bouncing logo, geometric patterns.
 */
import React, { useEffect, useRef } from 'react';
import { useScreensaver } from '../context/ScreensaverContext';

export const Screensaver: React.FC = () => {
    const { isScreensaverActive, settings } = useScreensaver();
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
            const stars = Array.from({ length: 200 }, () => ({
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
                star.z -= 2;
                if (star.z <= 0) {
                    star.z = canvas.width;
                    star.x = Math.random() * canvas.width - centerX;
                    star.y = Math.random() * canvas.height - centerY;
                }

                const x = (star.x / star.z) * canvas.width + centerX;
                const y = (star.y / star.z) * canvas.height + centerY;
                const size = (1 - star.z / canvas.width) * 2;

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

            ctx.fillStyle = '#0F0';
            ctx.font = '15px monospace';

            for (let i = 0; i < state.drops.length; i++) {
                const text = state.chars[Math.floor(Math.random() * state.chars.length)];
                ctx.fillText(text, i * 20, state.drops[i] * 20);

                if (state.drops[i] * 20 > canvas.height && Math.random() > 0.975) {
                    state.drops[i] = 0;
                }
                state.drops[i]++;
            }
        };

        // Bouncing logo animation
        const initBouncingLogo = () => {
            return {
                x: Math.random() * (canvas.width - 100),
                y: Math.random() * (canvas.height - 100),
                dx: 2 + Math.random() * 2,
                dy: 2 + Math.random() * 2,
                size: 100,
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
                shapes: Array.from({ length: 5 }, (_, i) => ({
                    size: 100 + i * 40,
                    speed: 0.005 + i * 0.002,
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
                ctx.strokeStyle = `hsla(${shape.hue}, 70%, 60%, 0.6)`;
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
            state.rotation += 0.01;
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

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isScreensaverActive, settings]);

    if (!isScreensaverActive) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-black">
            <canvas ref={canvasRef} className="w-full h-full" />
        </div>
    );
};
