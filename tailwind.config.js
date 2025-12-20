/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './index.html',
        './*.{ts,tsx}',
        './apps/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './context/**/*.{ts,tsx}',
        './utils/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: '#137fec',
                'background-light': '#f6f7f8',
                'background-dark': '#101922',
            },
            fontFamily: {
                display: ['Inter', 'sans-serif'],
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.5s ease-out',
                'pop-in': 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                'slide-in-left': 'slideInLeft 0.3s ease-out',
            },
            keyframes: {
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateX(-50%) translateY(24px) scale(0.98)' },
                    '100%': { opacity: '1', transform: 'translateX(-50%) translateY(0px) scale(1)' },
                },
                popIn: {
                    '0%': { opacity: '0', transform: 'scale(0.9)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                slideInLeft: {
                    '0%': { opacity: '0', transform: 'translateX(-100%)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms')({
            strategy: 'class',
        }),
        require('@tailwindcss/container-queries'),
        require('@tailwindcss/typography'),
    ],
};
