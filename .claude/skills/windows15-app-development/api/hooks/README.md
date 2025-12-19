# Hooks API Reference

This directory contains detailed documentation for all custom React hooks provided by Windows 15.

## Core Hooks

### State Management

- **[useAppState](./useAppState.md)** - Persistent state with IndexedDB and cloud sync
- **[useAppStateValue](./useAppState.md#useappstatevalue)** - Read-only persistent state access

### Localization

- **[useTranslation](./useTranslation.md)** - Access localized strings with namespaces

### Window Management

- **[useWindowInstance](./useWindow.md)** - Control window title, icon, badge (requires windowId prop)

### File System

- **[useFilePicker](./useFilePicker.md)** - File open/save dialogs

### UI/UX

- **[useSound](./useSound.md)** - Play system sound effects
- **[useNotification](./useNotification.md)** - Show toast notifications

## Utility Hooks

### Form & Input

- **useAsyncAction** - Handle async operations with loading/error states
- **useConfirmDialog** - Show confirmation dialogs
- **useCopyToClipboard** - Copy text to clipboard with feedback
- **useDebounce** - Debounce values
- **useThrottle** - Throttle function calls

### Keyboard & Events

- **useHotkeys** - Register keyboard shortcuts
- **useStandardHotkeys** - Standard app shortcuts (Ctrl+S, Ctrl+C, etc.)
- **useEventBus** - Publish/subscribe to app-wide events
- **useAppEmit** - Emit events
- **useAppEvent** - Listen to events

### Data & Collections

- **useSeededCollection** - Manage seeded data with defaults
- **useDexieLiveQuery** - Reactive Dexie queries
- **usePersistedState** - Dexie/IndexedDB-backed state (preferred)
- **useLocalStorage** - Direct localStorage access (legacy)

### Timers & Intervals

- **useInterval** - Declarative intervals
- **useControllableInterval** - Controllable interval with pause/resume

## Context Hooks

These hooks provide access to React contexts:

- **useDb** - Access Dexie database instance
- **useOS** - Access OS-level state and methods
- **useWindowManager** - Access window management
- **useWallpaper** - Access wallpaper settings
- **useScreensaver** - Access screensaver settings

## Hook Patterns

### Async Operations

```typescript
const { execute, loading, error } = useAsyncAction();

await execute(async () => {
    await someAsyncTask();
});
```

### Persistent State

```typescript
// Syncs across devices
const [state, setState] = useAppState('myApp', { ... });

// Local only
const [value, setValue] = usePersistedState('myKey', 'default');
```

### Keyboard Shortcuts

```typescript
useHotkeys({
    'ctrl+s': handleSave,
    'ctrl+o': handleOpen,
    escape: handleClose,
});
```

### Event Bus

```typescript
// Emit
const emit = useAppEmit('my-event');
emit({ data: 'value' });

// Listen
useAppEvent('my-event', payload => {
    console.log(payload);
});
```

## Best Practices

1. **Use the right hook for the job**:
    - Small UI state → `useState`
    - Small persistent state → `useAppState`
    - Large datasets → `useSeededCollection`
    - Temporary cache → `usePersistedState`

2. **Handle loading and error states**:

    ```typescript
    const { execute, loading, error } = useAsyncAction();
    if (loading) return <Spinner />;
    if (error) return <Error message={error} />;
    ```

3. **Cleanup effects properly**:

    ```typescript
    useAppListen('event', handler); // Auto-cleaned up
    useInterval(callback, 1000); // Auto-cleared
    useHotkeys({ ... }); // Auto-unregistered
    ```

4. **Type your state**:
    ```typescript
    interface MyState { ... }
    const [state, setState] = useAppState<MyState>('app', { ... });
    ```

## See Also

- [Context API](../contexts/README.md) - Context providers
- [Components](../components/README.md) - UI components
- [Utilities](../utils/README.md) - Utility functions
