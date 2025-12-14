import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
    // Ignore patterns
    {
        ignores: [
            'dist/**',
            'dev-dist/**',
            'node_modules/**',
            '*.config.js',
            '*.config.cjs',
            'scripts/**',
            'docs/api/**',
        ],
    },

    // JavaScript recommended rules
    js.configs.recommended,

    // TypeScript and React files
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                fetch: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                HTMLElement: 'readonly',
                HTMLInputElement: 'readonly',
                HTMLTextAreaElement: 'readonly',
                HTMLDivElement: 'readonly',
                HTMLCanvasElement: 'readonly',
                HTMLIFrameElement: 'readonly',
                MouseEvent: 'readonly',
                KeyboardEvent: 'readonly',
                Event: 'readonly',
                FileReader: 'readonly',
                Blob: 'readonly',
                File: 'readonly',
                FormData: 'readonly',
                Response: 'readonly',
                Request: 'readonly',
                Headers: 'readonly',
                AbortController: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                indexedDB: 'readonly',
                crypto: 'readonly',
                btoa: 'readonly',
                atob: 'readonly',
                alert: 'readonly',
                confirm: 'readonly',
                prompt: 'readonly',
                location: 'readonly',
                history: 'readonly',
                performance: 'readonly',
                ResizeObserver: 'readonly',
                IntersectionObserver: 'readonly',
                MutationObserver: 'readonly',
                CustomEvent: 'readonly',
                globalThis: 'readonly',
                queueMicrotask: 'readonly',
                TextEncoder: 'readonly',
                TextDecoder: 'readonly',
                Node: 'readonly',
                process: 'readonly',
                StorageEvent: 'readonly',
                React: 'readonly',
                ServiceWorkerRegistration: 'readonly',
                IDBDatabase: 'readonly',
                IDBOpenDBRequest: 'readonly',
                EventListener: 'readonly',
                BroadcastChannel: 'readonly',
                __dirname: 'readonly',
                // WebGPU globals
                GPUDevice: 'readonly',
                GPUCanvasContext: 'readonly',
                GPURenderPipeline: 'readonly',
                GPUBuffer: 'readonly',
                GPUBindGroup: 'readonly',
                GPUTextureFormat: 'readonly',
                GPUTexture: 'readonly',
                GPUDeviceLostInfo: 'readonly',
                GPUBufferUsage: 'readonly',
                GPUShaderStage: 'readonly',
                // WebGL2 globals
                WebGL2RenderingContext: 'readonly',
                WebGLProgram: 'readonly',
                WebGLVertexArrayObject: 'readonly',
                WebGLUniformLocation: 'readonly',
                WebGLShader: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            react,
            'react-hooks': reactHooks,
        },
        rules: {
            // TypeScript rules
            ...tseslint.configs.recommended.rules,
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-non-null-assertion': 'warn',

            // React rules
            'react/react-in-jsx-scope': 'off', // Not needed with React 17+
            'react/prop-types': 'off', // TypeScript handles this
            'react/jsx-uses-react': 'off',
            'react/jsx-uses-vars': 'error',

            // React Hooks rules
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // General rules
            'no-console': 'off',
            'no-debugger': 'warn',
            'no-unused-vars': 'off', // Using TypeScript version
            'no-empty': ['error', { allowEmptyCatch: true }],
            'prefer-const': 'error',
            eqeqeq: ['error', 'always', { null: 'ignore' }],
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },

    // Prettier - must be last to override other formatting rules
    eslintConfigPrettier,
];
