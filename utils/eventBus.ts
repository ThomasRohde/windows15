/**
 * EventBus - Centralized event bus for cross-component communication
 *
 * Provides a type-safe pub/sub pattern for components that need to communicate
 * without prop drilling. Use sparingly - prefer React state/context for most cases.
 *
 * @module utils/eventBus
 *
 * @example
 * ```tsx
 * // Define your events
 * type AppEvents = {
 *   'window:opened': { windowId: string; appId: string };
 *   'theme:changed': { theme: 'light' | 'dark' };
 *   'notification': { message: string; type: 'info' | 'error' };
 * };
 *
 * // Create typed event bus
 * const eventBus = createEventBus<AppEvents>();
 *
 * // Subscribe
 * eventBus.on('window:opened', (data) => console.log(data.windowId));
 *
 * // Emit
 * eventBus.emit('window:opened', { windowId: '123', appId: 'notepad' });
 *
 * // Unsubscribe
 * const unsubscribe = eventBus.on('theme:changed', handler);
 * unsubscribe();
 * ```
 */

/**
 * Event handler callback type
 */
type EventHandler<T> = (payload: T) => void;

/**
 * Event bus interface with type-safe methods
 */
export interface EventBus<Events extends Record<string, unknown>> {
    /**
     * Subscribe to an event
     * @param event - Event name
     * @param handler - Callback function
     * @returns Unsubscribe function
     */
    on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): () => void;

    /**
     * Unsubscribe from an event
     * @param event - Event name
     * @param handler - The handler to remove
     */
    off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void;

    /**
     * Emit an event to all subscribers
     * @param event - Event name
     * @param payload - Event data
     */
    emit<K extends keyof Events>(event: K, payload: Events[K]): void;

    /**
     * Subscribe to an event for one-time execution
     * @param event - Event name
     * @param handler - Callback function (called once then auto-unsubscribed)
     * @returns Unsubscribe function
     */
    once<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): () => void;

    /**
     * Remove all handlers for an event or all events
     * @param event - Optional event name. If omitted, clears all events.
     */
    clear<K extends keyof Events>(event?: K): void;
}

/**
 * Create a new type-safe event bus instance
 *
 * @returns EventBus instance
 *
 * @example
 * ```tsx
 * type MyEvents = {
 *   'user:login': { userId: string };
 *   'user:logout': void;
 * };
 *
 * const bus = createEventBus<MyEvents>();
 * bus.on('user:login', ({ userId }) => console.log('User logged in:', userId));
 * bus.emit('user:login', { userId: '123' });
 * ```
 */
export function createEventBus<Events extends Record<string, unknown>>(): EventBus<Events> {
    const handlers = new Map<keyof Events, Set<EventHandler<unknown>>>();

    const on = <K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): (() => void) => {
        let eventHandlers = handlers.get(event);
        if (!eventHandlers) {
            eventHandlers = new Set();
            handlers.set(event, eventHandlers);
        }
        eventHandlers.add(handler as EventHandler<unknown>);

        // Return unsubscribe function
        return () => off(event, handler);
    };

    const off = <K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void => {
        const eventHandlers = handlers.get(event);
        if (eventHandlers) {
            eventHandlers.delete(handler as EventHandler<unknown>);
            if (eventHandlers.size === 0) {
                handlers.delete(event);
            }
        }
    };

    const emit = <K extends keyof Events>(event: K, payload: Events[K]): void => {
        const eventHandlers = handlers.get(event);
        if (eventHandlers) {
            // Create a copy to avoid issues if handlers modify the set
            Array.from(eventHandlers).forEach(handler => {
                try {
                    handler(payload);
                } catch (error) {
                    console.error(`Error in event handler for "${String(event)}":`, error);
                }
            });
        }
    };

    const once = <K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): (() => void) => {
        const onceHandler: EventHandler<Events[K]> = payload => {
            off(event, onceHandler);
            handler(payload);
        };
        return on(event, onceHandler);
    };

    const clear = <K extends keyof Events>(event?: K): void => {
        if (event !== undefined) {
            handlers.delete(event);
        } else {
            handlers.clear();
        }
    };

    return { on, off, emit, once, clear };
}

// ============================================================================
// Application Events
// ============================================================================

/**
 * Application-wide events for cross-component communication
 */
export interface AppEvents {
    /** Emitted when a window is opened */
    'window:opened': { windowId: string; appId: string };
    /** Emitted when a window is closed */
    'window:closed': { windowId: string; appId: string };
    /** Emitted when a window gains focus */
    'window:focused': { windowId: string };
    /** Emitted when theme changes */
    'theme:changed': { theme: 'light' | 'dark' | 'system' };
    /** Emitted when wallpaper changes */
    'wallpaper:changed': { wallpaper: string };
    /** Emitted to show a toast notification */
    'notification:show': { message: string; type: 'info' | 'success' | 'warning' | 'error'; duration?: number };
    /** Emitted when cloud sync status changes */
    'sync:status': { status: 'syncing' | 'synced' | 'offline' | 'error' };
    /** Emitted to request file open in an app */
    'file:open': { appId: string; fileId: string; fileName?: string; content?: string };
    /** Index signature for constraint compatibility */
    [key: string]: unknown;
}

/**
 * Global application event bus instance
 *
 * @example
 * ```tsx
 * import { appEventBus } from '@/utils/eventBus';
 *
 * // Emit a notification
 * appEventBus.emit('notification:show', {
 *   message: 'File saved successfully',
 *   type: 'success',
 * });
 *
 * // Listen for window events
 * const unsub = appEventBus.on('window:opened', ({ windowId, appId }) => {
 *   console.log(`Window ${windowId} opened for ${appId}`);
 * });
 * ```
 */
export const appEventBus = createEventBus<AppEvents>();
