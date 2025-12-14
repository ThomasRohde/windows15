import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const PWAUpdatePrompt = () => {
    const [showPrompt, setShowPrompt] = useState(false);

    const {
        offlineReady: [_offlineReady, _setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('[PWA] Service worker registered:', r);
        },
        onRegisterError(error) {
            console.error('[PWA] Service worker registration error:', error);
        },
    });

    useEffect(() => {
        if (needRefresh) {
            setShowPrompt(true);
        }
    }, [needRefresh]);

    const handleUpdate = async () => {
        setShowPrompt(false);
        await updateServiceWorker(true);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        setNeedRefresh(false);
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[60] animate-fade-in-up">
            <div className="glass-panel rounded-2xl shadow-2xl ring-1 ring-white/10 p-4 max-w-md">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-blue-400 text-2xl">update</span>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-semibold text-base mb-1">Update Available</h3>
                        <p className="text-white/70 text-sm mb-3">
                            A new version of Windows 15 is available. Update now to get the latest features and
                            improvements.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleUpdate}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors text-sm font-medium"
                            >
                                Update Now
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition-colors text-sm"
                            >
                                Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
