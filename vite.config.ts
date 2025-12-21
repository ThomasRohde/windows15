/// <reference types="vitest" />
import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

const normalizeBasePath = (raw?: string) => {
    if (!raw) return '/';
    let basePath = raw.trim();
    if (!basePath) return '/';
    if (!basePath.startsWith('/')) basePath = `/${basePath}`;
    if (!basePath.endsWith('/')) basePath = `${basePath}/`;
    return basePath;
};

const basePath = normalizeBasePath(process.env.BASE_PATH);

export default defineConfig({
    base: basePath,
    server: {
        port: 5000,
        host: '0.0.0.0',
        allowedHosts: true,
        // Fix HMR for mobile device testing - use the server's IP instead of localhost
        hmr: {
            host: '192.168.1.31',
        },
    },
    plugins: [
        react(),
        VitePWA({
            registerType: 'prompt',
            includeAssets: [
                'favicon.ico',
                'robots.txt',
                'icons/*.png',
                // Built-in wallpaper packs (F101)
                'wallpapers/**/*.json',
                'wallpapers/**/*.wgsl',
                'wallpapers/**/*.glsl',
                'wallpapers/**/*.png',
                // Demo carts for Arcade (F101)
                'demo-carts/**/*.json',
                'demo-carts/**/*.wasm',
            ],
            // Disable service worker in dev mode to avoid caching issues on iOS
            devOptions: {
                enabled: false,
            },
            manifest: {
                name: 'Windows 15 Desktop Concept',
                short_name: 'Windows 15',
                description: 'A modern Windows desktop experience in the browser',
                theme_color: '#137fec',
                background_color: '#101922',
                display: 'fullscreen',
                orientation: 'any',
                start_url: basePath,
                scope: basePath,
                icons: [
                    {
                        src: 'icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: 'icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: 'icon-maskable-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                    {
                        src: 'icon-maskable-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
                // Web Share Target API - allows receiving shared content (F232)
                share_target: {
                    action: '/?share=true',
                    method: 'GET',
                    enctype: 'application/x-www-form-urlencoded',
                    params: {
                        title: 'title',
                        text: 'text',
                        url: 'url',
                    },
                },
            },
            workbox: {
                // Allow large chunks (Spreadsheet with Univer is ~10MB)
                maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15 MiB
                globPatterns: [
                    '**/*.{js,css,html,ico,png,svg,woff2}',
                    // Include wallpaper shader files (F101)
                    'wallpapers/**/*.{json,wgsl,glsl,png}',
                    // Include demo carts (F101)
                    'demo-carts/**/*.{json,wasm}',
                ],
                runtimeCaching: [
                    // Cache wallpaper assets for offline use (F101)
                    {
                        urlPattern: /\/wallpapers\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'wallpaper-packs-cache',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    // Cache demo carts for offline use (F101)
                    {
                        urlPattern: /\/demo-carts\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'demo-carts-cache',
                            expiration: {
                                maxEntries: 20,
                                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'tailwind-cdn-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                ],
            },
        }),
        // Bundle analysis - generates stats.html when ANALYZE=true
        process.env.ANALYZE === 'true' &&
            visualizer({
                filename: 'stats.html',
                open: true,
                gzipSize: true,
                brotliSize: true,
            }),
    ].filter(Boolean),
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        exclude: ['node_modules', 'dist', 'dev-dist', 'e2e'],
        silent: process.env.CI === 'true',
        hideSkippedTests: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                'dev-dist/',
                'tests/',
                'e2e/',
                '**/*.d.ts',
                '**/*.config.*',
                '**/index.ts',
            ],
        },
    },
});
