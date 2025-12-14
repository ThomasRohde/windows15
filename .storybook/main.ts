import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
    stories: [
        '../stories/**/*.mdx',
        '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
        '../components/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    ],
    addons: [
        '@chromatic-com/storybook',
        '@storybook/addon-vitest',
        '@storybook/addon-a11y',
        '@storybook/addon-docs',
        '@storybook/addon-onboarding',
    ],
    framework: '@storybook/react-vite',
    viteFinal: async config => {
        // Remove PWA plugin from Storybook builds to avoid conflicts
        config.plugins = config.plugins?.filter(plugin => {
            if (Array.isArray(plugin)) {
                return !plugin.some(
                    p =>
                        p &&
                        typeof p === 'object' &&
                        'name' in p &&
                        (p.name === 'vite-plugin-pwa' ||
                            p.name === 'vite-plugin-pwa:build' ||
                            p.name === 'vite-plugin-pwa:dev-sw')
                );
            }
            return !(
                plugin &&
                typeof plugin === 'object' &&
                'name' in plugin &&
                (plugin.name === 'vite-plugin-pwa' ||
                    plugin.name === 'vite-plugin-pwa:build' ||
                    plugin.name === 'vite-plugin-pwa:dev-sw')
            );
        });
        return config;
    },
};
export default config;
