/**
 * useEventBus - React hook for event bus subscriptions
 *
 * Automatically handles subscription cleanup on unmount to prevent memory leaks.
 *
 * @module hooks/useEventBus
 */
import { useEffect, useCallback, useRef } from 'react';
import { AppEvents, appEventBus, EventBus } from '../utils/eventBus';

/**
 * Subscribe to an application event with automatic cleanup
 *
 * @param event - Event name to subscribe to
 * @param handler - Callback function when event fires
 *
 * @example
 * ```tsx
 * function NotificationToast() {
 *   const [notification, setNotification] = useState<string | null>(null);
 *
 *   useAppEvent('notification:show', ({ message }) => {
 *     setNotification(message);
 *     setTimeout(() => setNotification(null), 3000);
 *   });
 *
 *   return notification ? <div className="toast">{notification}</div> : null;
 * }
 * ```
 */
export function useAppEvent<K extends keyof AppEvents>(event: K, handler: (payload: AppEvents[K]) => void): void {
    // Store handler in ref to avoid re-subscribing when handler changes
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        const stableHandler = (payload: AppEvents[K]) => {
            handlerRef.current(payload);
        };

        const unsubscribe = appEventBus.on(event, stableHandler);
        return unsubscribe;
    }, [event]);
}

/**
 * Get a stable emit function for an event
 *
 * @param event - Event name to emit
 * @returns Memoized emit function
 *
 * @example
 * ```tsx
 * function SaveButton() {
 *   const showNotification = useAppEmit('notification:show');
 *
 *   const handleSave = async () => {
 *     await saveData();
 *     showNotification({ message: 'Saved!', type: 'success' });
 *   };
 *
 *   return <button onClick={handleSave}>Save</button>;
 * }
 * ```
 */
export function useAppEmit<K extends keyof AppEvents>(event: K): (payload: AppEvents[K]) => void {
    return useCallback(
        (payload: AppEvents[K]) => {
            appEventBus.emit(event, payload);
        },
        [event]
    );
}

/**
 * Generic hook for custom event buses
 *
 * @param bus - Event bus instance
 * @param event - Event name
 * @param handler - Event handler
 *
 * @example
 * ```tsx
 * const customBus = createEventBus<{ 'custom:event': { data: string } }>();
 *
 * function MyComponent() {
 *   useEventBus(customBus, 'custom:event', ({ data }) => {
 *     console.log('Received:', data);
 *   });
 * }
 * ```
 */
export function useEventBus<Events extends Record<string, unknown>, K extends keyof Events>(
    bus: EventBus<Events>,
    event: K,
    handler: (payload: Events[K]) => void
): void {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        const stableHandler = (payload: Events[K]) => {
            handlerRef.current(payload);
        };

        const unsubscribe = bus.on(event, stableHandler);
        return unsubscribe;
    }, [bus, event]);
}
