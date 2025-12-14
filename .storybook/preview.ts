import type { Preview } from '@storybook/react-vite';
import '../index.css';

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        backgrounds: {
            default: 'dark',
            values: [
                { name: 'dark', value: '#1a1a2e' },
                { name: 'light', value: '#ffffff' },
            ],
        },
    },
};

export default preview;
