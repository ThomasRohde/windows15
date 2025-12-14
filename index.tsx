import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { migrateLegacyLocalStorageToDexieKv } from './utils/storage';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);

const bootstrap = async () => {
    try {
        await migrateLegacyLocalStorageToDexieKv();
    } catch {
        // Best-effort; app still works without legacy migration.
    }

    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
};

bootstrap();
