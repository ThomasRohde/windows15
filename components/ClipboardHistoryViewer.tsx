/**
 * ClipboardHistoryViewer - Modal for viewing and pasting clipboard history (F164)
 *
 * Opened via Ctrl+Shift+V keyboard shortcut.
 * Displays up to 25 recent clipboard items.
 * Click an item to paste it to the clipboard.
 */
import React, { useEffect, useCallback, useRef } from 'react';
import { useClipboard } from '../context/ClipboardContext';
import { Icon, Button } from './ui';
import { ClipboardHistoryRecord } from '../utils/storage/db';

export const ClipboardHistoryViewer: React.FC = () => {
    const { history, isHistoryOpen, closeHistory, pasteFromHistory, clearHistory, removeFromHistory } = useClipboard();
    const modalRef = useRef<HTMLDivElement>(null);

    // Close on Escape key
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeHistory();
            }
        },
        [closeHistory]
    );

    // Focus trap and keyboard handler
    useEffect(() => {
        if (isHistoryOpen) {
            document.addEventListener('keydown', handleKeyDown);
            modalRef.current?.focus();
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isHistoryOpen, handleKeyDown]);

    const handleItemClick = async (item: ClipboardHistoryRecord) => {
        await pasteFromHistory(item);
    };

    const handleRemove = async (e: React.MouseEvent, id: number | undefined) => {
        e.stopPropagation();
        if (id !== undefined) {
            await removeFromHistory(id);
        }
    };

    const handleClearAll = async () => {
        await clearHistory();
    };

    const formatTime = (timestamp: number): string => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    if (!isHistoryOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeHistory} />

            {/* Modal */}
            <div
                ref={modalRef}
                className="relative bg-background-dark/95 rounded-xl shadow-2xl border border-white/10 w-full max-w-md max-h-[70vh] flex flex-col"
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label="Clipboard History"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <Icon name="content_paste" className="text-primary" />
                        <h2 className="text-lg font-medium text-white">Clipboard History</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {history.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={handleClearAll} title="Clear all">
                                <Icon name="delete_sweep" size="sm" />
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={closeHistory} title="Close">
                            <Icon name="close" size="sm" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2">
                    {history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-white/40">
                            <Icon name="content_paste_off" size="xl" className="mb-3 opacity-50" />
                            <p className="text-sm">No clipboard history</p>
                            <p className="text-xs mt-1">Copy something to see it here</p>
                        </div>
                    ) : (
                        <ul className="space-y-1">
                            {history.map(item => (
                                <li key={item.id}>
                                    <button
                                        onClick={() => handleItemClick(item)}
                                        className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left group"
                                    >
                                        {/* Type icon */}
                                        <div className="flex-shrink-0 mt-0.5">
                                            <Icon
                                                name={item.contentType === 'image' ? 'image' : 'text_snippet'}
                                                size="sm"
                                                className="text-white/40"
                                            />
                                        </div>

                                        {/* Content preview */}
                                        <div className="flex-1 min-w-0">
                                            {item.contentType === 'image' ? (
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src={item.content}
                                                        alt="Clipboard image"
                                                        className="h-12 max-w-full rounded border border-white/10 object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-sm text-white/80 truncate font-mono">
                                                    {item.preview}
                                                </p>
                                            )}
                                            <p className="text-xs text-white/40 mt-1">{formatTime(item.copiedAt)}</p>
                                        </div>

                                        {/* Remove button */}
                                        <button
                                            onClick={e => handleRemove(e, item.id)}
                                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
                                            title="Remove"
                                        >
                                            <Icon name="close" size="sm" className="text-white/40" />
                                        </button>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-white/10 text-center">
                    <p className="text-xs text-white/40">
                        Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60">Ctrl+Shift+V</kbd> to
                        toggle
                    </p>
                </div>
            </div>
        </div>
    );
};
