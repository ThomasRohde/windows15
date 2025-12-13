/**
 * Cross-tab configuration synchronization
 *
 * Uses BroadcastChannel for modern browsers and storage events as fallback
 * to propagate Dexie Cloud configuration changes across tabs.
 */

import { debugSync } from '../debugLogger';

export type ConfigChangeMessage = {
    type: 'config-change';
    databaseUrl: string | null;
    updatedAt: number;
};

const CHANNEL_NAME = 'windows15-config';
const STORAGE_EVENT_KEY = 'windows15.dexieCloud.databaseUrl';

class ConfigSyncManager {
    private channel: BroadcastChannel | null = null;
    private listeners: Set<(message: ConfigChangeMessage) => void> = new Set();

    constructor() {
        this.initializeChannel();
        this.setupStorageListener();
    }

    private initializeChannel() {
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                this.channel = new BroadcastChannel(CHANNEL_NAME);
                debugSync.config('BroadcastChannel initialized');
                this.channel.onmessage = (event) => {
                    if (event.data?.type === 'config-change') {
                        debugSync.config('Received config change via BroadcastChannel', event.data);
                        this.notifyListeners(event.data);
                    }
                };
            } catch (error) {
                debugSync.error('BroadcastChannel not available', error);
            }
        }
    }

    private setupStorageListener() {
        if (typeof window === 'undefined') return;

        debugSync.config('Storage listener initialized');
        window.addEventListener('storage', (event) => {
            if (event.key === STORAGE_EVENT_KEY) {
                // Storage event fires in OTHER tabs when localStorage changes
                debugSync.config('Received config change via storage event', { 
                    newValue: event.newValue 
                });
                this.notifyListeners({
                    type: 'config-change',
                    databaseUrl: event.newValue,
                    updatedAt: Date.now()
                });
            }
        });
    }

    private notifyListeners(message: ConfigChangeMessage) {
        this.listeners.forEach(listener => {
            try {
                listener(message);
            } catch (error) {
                console.error('Error in config sync listener:', error);
            }
        });
    }

    /**
     * Broadcast a configuration change to all other tabs
     */
    broadcast(databaseUrl: string | null) {
        const message: ConfigChangeMessage = {
            type: 'config-change',
            databaseUrl,
            updatedAt: Date.now()
        };

        // Try BroadcastChannel first
        if (this.channel) {
            try {
                this.channel.postMessage(message);
            } catch (error) {
                console.warn('Failed to broadcast via BroadcastChannel:', error);
            }
        }

        // Storage event will fire automatically in other tabs when localStorage is updated
        // (This is handled by the caller updating localStorage)
    }

    /**
     * Subscribe to configuration changes from other tabs
     */
    subscribe(listener: (message: ConfigChangeMessage) => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.channel) {
            this.channel.close();
            this.channel = null;
        }
        this.listeners.clear();
    }
}

// Singleton instance
export const configSync = new ConfigSyncManager();
