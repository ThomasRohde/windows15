# useWindowInstance

**Category:** Window Management Hook
**Since:** v0.1.0
**Related:** [WindowContext](../contexts/WindowContext.md), [Window Component](../components/Window.md)

## Overview

The `useWindowInstance` hook provides control over the current window's properties. It allows apps to dynamically update window titles, icons, and badges. Apps must receive a `windowId` prop from the Window component to use this hook.

## API

```typescript
interface UseWindowInstanceResult {
    setTitle: (title: string | null) => void;
    setIcon: (icon: string | null) => void;
    setBadge: (count: number | null) => void;
    window: {
        id: string;
        title: string;
        icon: string;
        badge: number | null;
        isMinimized: boolean;
        isMaximized: boolean;
    } | null;
}

function useWindowInstance(windowId: string): UseWindowInstanceResult;
```

### Parameters

- `windowId`: The window instance ID (passed as a prop to app components)

### Returns

- `setTitle(title)`: Update window title bar text (pass `null` to revert to default)
- `setIcon(icon)`: Update window title bar icon (Material Symbols name, pass `null` to revert)
- `setBadge(count)`: Set notification badge count (pass `null` or `0` to hide)
- `window`: Current window state object, or `null` if window not found

## Usage Examples

### Dynamic Window Title

```typescript
import { useWindowInstance } from '../hooks';

interface NotepadProps {
    windowId: string;
}

export const Notepad: React.FC<NotepadProps> = ({ windowId }) => {
    const { setTitle } = useWindowInstance(windowId);
    const [fileName, setFileName] = useState('Untitled');
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setTitle(isDirty ? `*${fileName}` : fileName);
    }, [fileName, isDirty, setTitle]);

    return <textarea onChange={() => setIsDirty(true)} />;
};
```

### Notification Badges

```typescript
export const Mail: React.FC<{ windowId: string }> = ({ windowId }) => {
    const { setBadge } = useWindowInstance(windowId);
    const unreadCount = useUnreadMailCount();

    useEffect(() => {
        setBadge(unreadCount > 0 ? unreadCount : null);
    }, [unreadCount, setBadge]);

    return <MailList />;
};
```

### Dynamic Icons

```typescript
export const Terminal: React.FC<{ windowId: string }> = ({ windowId }) => {
    const { setIcon } = useWindowInstance(windowId);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        setIcon(isRunning ? 'terminal' : 'stop');
    }, [isRunning, setIcon]);

    return <TerminalUI />;
};
```

### Accessing Window State

```typescript
export const MyApp: React.FC<{ windowId: string }> = ({ windowId }) => {
    const { window } = useWindowInstance(windowId);

    if (!window) return null;

    return (
        <div>
            <p>Window ID: {window.id}</p>
            <p>Title: {window.title}</p>
            <p>Minimized: {window.isMinimized ? 'Yes' : 'No'}</p>
            <p>Maximized: {window.isMaximized ? 'Yes' : 'No'}</p>
        </div>
    );
};
```

## Window Management Operations

To perform window lifecycle operations (close, minimize, maximize, focus), use `useWindowManager()` from the WindowContext:

```typescript
import { useWindowManager } from '../context/WindowContext';

export const MyApp: React.FC<{ windowId: string }> = ({ windowId }) => {
    const { closeWindow, minimizeWindow, toggleMaximizeWindow } = useWindowManager();

    const handleClose = () => closeWindow(windowId);
    const handleMinimize = () => minimizeWindow(windowId);
    const handleToggleMaximize = () => toggleMaximizeWindow(windowId);

    return (
        <div>
            <button onClick={handleMinimize}>Minimize</button>
            <button onClick={handleToggleMaximize}>Maximize</button>
            <button onClick={handleClose}>Close</button>
        </div>
    );
};
```

## Best Practices

1. **Update title when state changes**:

    ```typescript
    useEffect(() => {
        setTitle(fileName ? `${fileName}` : 'Untitled');
    }, [fileName, setTitle]);
    ```

2. **Clear badges when not needed**:

    ```typescript
    useEffect(() => {
        setBadge(count > 0 ? count : null);
    }, [count, setBadge]);
    ```

3. **Use semantic icons** - Match icons to app purpose:
    - `edit_note` for text editors
    - `mail` for email clients
    - `terminal` for terminals
    - `calculate` for calculators

4. **Always accept windowId as a prop** - The Window component passes this to your app:

    ```typescript
    export const MyApp: React.FC<{ windowId: string }> = ({ windowId }) => {
        const { setTitle, setBadge } = useWindowInstance(windowId);
        // ...
    };
    ```

## Edge Cases

- **Window not found**: `window` property returns `null` if the window ID is invalid
- **Setting values to null**: Reverts to default title/icon from app registry
- **Badge of 0 or null**: Hides the badge

## See Also

- [WindowContext](../contexts/WindowContext.md) - Window state management
- [Window Component](../components/Window.md) - Window UI implementation
- [App Registry](./AppRegistry.md) - Registering apps with default window settings
