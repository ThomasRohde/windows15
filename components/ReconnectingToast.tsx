import React, { useEffect, useState } from 'react';
import { useDbContext } from '../context/DbContext';

export const ReconnectingToast = () => {
    const { isReconnecting } = useDbContext();
    const [showTimeout, setShowTimeout] = useState(false);

    useEffect(() => {
        if (!isReconnecting) {
            setShowTimeout(false);
            return;
        }

        // Show timeout message if reconnecting takes more than 5 seconds
        const timeout = setTimeout(() => {
            setShowTimeout(true);
        }, 5000);

        return () => clearTimeout(timeout);
    }, [isReconnecting]);

    if (!isReconnecting) return null;

    return (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] animate-fade-in-up">
            <div className="glass-panel rounded-2xl shadow-2xl ring-1 ring-white/10 p-4 max-w-md">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                        <span className="material-symbols-outlined text-blue-400 text-2xl animate-spin">sync</span>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-semibold text-sm mb-1">Reconnecting to Cloud</h3>
                        <p className="text-white/70 text-xs">
                            {showTimeout
                                ? 'This is taking longer than expected. Please wait...'
                                : 'Applying new database configuration...'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
