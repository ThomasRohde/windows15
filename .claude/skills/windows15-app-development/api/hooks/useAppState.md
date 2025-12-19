# useAppState

**Category:** Data Persistence Hook  
**Since:** v0.1.0  
**Related:** [DbContext](../contexts/DbContext.md), [useState](https://react.dev/reference/react/useState)

## Overview

The `useAppState` hook provides persistent state management for apps. It works like React's `useState` but automatically persists to IndexedDB and syncs across devices via Dexie Cloud.

## API

```typescript
function useAppState<T>(appId: string, defaultState: T): [T, (newState: T | ((prev: T) => T)) => Promise<void>];

function useAppStateValue<T>(appId: string, defaultState: T): T;
```

### Parameters

- `appId`: Unique identifier for the app (e.g., 'calculator', 'notepad')
- `defaultState`: Initial state value when no persisted state exists

### Returns

**useAppState:**

- `[state, setState]`: Tuple similar to `useState`
    - `state`: Current state value
    - `setState`: Async function to update state

**useAppStateValue:**

- `state`: Read-only state value (no setter)

## Usage Examples

### Basic State Persistence

```typescript
import { useAppState } from '../hooks';

interface CalculatorState {
  mode: 'basic' | 'scientific';
  history: string[];
}

export const Calculator = () => {
  const [state, setState] = useAppState<CalculatorState>('calculator', {
    mode: 'basic',
    history: [],
  });

  const { mode, history } = state;

  const switchMode = (newMode: 'basic' | 'scientific') => {
    void setState(prev => ({ ...prev, mode: newMode }));
  };

  return (
    <div>
      <select value={mode} onChange={e => switchMode(e.target.value as any)}>
        <option value="basic">Basic</option>
        <option value="scientific">Scientific</option>
      </select>
    </div>
  );
};
```

### Form State Persistence

```typescript
interface SettingsState {
  theme: 'light' | 'dark';
  notifications: boolean;
  soundEnabled: boolean;
}

export const Settings = () => {
  const [settings, setSettings] = useAppState<SettingsState>('settings', {
    theme: 'dark',
    notifications: true,
    soundEnabled: true,
  });

  const updateTheme = (theme: 'light' | 'dark') => {
    void setSettings(prev => ({ ...prev, theme }));
  };

  return (
    <form>
      <select value={settings.theme} onChange={e => updateTheme(e.target.value as any)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      <label>
        <input
          type="checkbox"
          checked={settings.notifications}
          onChange={e => void setSettings(prev => ({ ...prev, notifications: e.target.checked }))}
        />
        Enable Notifications
      </label>
    </form>
  );
};
```

### Read-Only State Access

```typescript
export const StatusBar = () => {
  const settings = useAppStateValue<SettingsState>('settings', {
    theme: 'dark',
    notifications: true,
    soundEnabled: true,
  });

  return (
    <div>
      Theme: {settings.theme}
    </div>
  );
};
```

### Limiting History Size

```typescript
interface Base64ToolState {
    input: string;
    output: string;
    history: { input: string; output: string }[];
}

export const Base64Tool = () => {
    const [state, setState] = useAppState<Base64ToolState>('base64Tool', {
        input: '',
        output: '',
        history: [],
    });

    const saveToHistory = (input: string, output: string) => {
        void setState(prev => ({
            ...prev,
            history: [{ input, output }, ...prev.history].slice(0, 20), // Keep last 20
        }));
    };

    // ...
};
```

## State Updates

### Functional Updates

Like `useState`, `setState` supports functional updates:

```typescript
// Direct update
await setState({ count: 5 });

// Functional update (recommended for derived values)
await setState(prev => ({ ...prev, count: prev.count + 1 }));
```

### Async Behavior

Unlike `useState`, `setState` is **async** and returns a Promise:

```typescript
// Await if you need to ensure persistence
await setState({ saved: true });
console.log('State persisted to IndexedDB');

// Or ignore for fire-and-forget
void setState({ clicked: true });
```

## Data Storage

State is stored in the `db.appState` table:

```typescript
{
  appId: 'calculator',
  state: '{"mode":"basic","history":[]}', // JSON string
  updatedAt: 1234567890
}
```

## Best Practices

1. **Use TypeScript interfaces** for type safety:

    ```typescript
    interface MyAppState {
      field1: string;
      field2: number;
    }
    const [state, setState] = useAppState<MyAppState>('myApp', {...});
    ```

2. **Keep state small** - Don't store large data:

    ```typescript
    // ❌ Bad: Large arrays, complex objects
    const [state, setState] = useAppState('app', {
      allUsers: [...] // 10,000 users
    });

    // ✅ Good: UI state only
    const [state, setState] = useAppState('app', {
      selectedUserId: 123,
      viewMode: 'grid'
    });
    ```

3. **Limit history/arrays** to prevent unbounded growth:

    ```typescript
    history: [...newItems, ...prev.history].slice(0, 20);
    ```

4. **Use descriptive appIds**:

    ```typescript
    useAppState('calculator', ...);      // ✅ Clear
    useAppState('calc', ...);            // ⚠️ Abbreviated
    useAppState('app1', ...);            // ❌ Vague
    ```

5. **Don't store sensitive data** - state syncs via Dexie Cloud:

    ```typescript
    // ❌ Bad: Passwords, tokens
    const [state, setState] = useAppState('app', {
        password: 'secret123',
    });

    // ✅ Good: Non-sensitive UI state
    const [state, setState] = useAppState('app', {
        isLoggedIn: true,
        username: 'john',
    });
    ```

## Edge Cases

- **First render**: Returns `defaultState` until persisted value loads from IndexedDB
- **Concurrent updates**: Last write wins (no merge strategy)
- **JSON serialization**: Non-serializable values (functions, symbols) are dropped
- **Large state**: Performance degrades if state > 1MB - use dedicated tables instead
- **Multiple windows**: State syncs automatically across tabs via Dexie Cloud

## Comparison with Other Hooks

| Feature              | useState       | useAppState     | useSeededCollection |
| -------------------- | -------------- | --------------- | ------------------- |
| Persists             | ❌             | ✅              | ✅                  |
| Syncs across devices | ❌             | ✅              | ✅                  |
| Suitable for         | Local UI state | Small app state | Large datasets      |
| Max size             | Unlimited      | ~1MB            | Unlimited           |
| Returns Promise      | ❌             | ✅              | N/A                 |

## See Also

- [DbContext](../contexts/DbContext.md) - Database access
- [useSeededCollection](./useSeededCollection.md) - For large datasets
- [Dexie Cloud Sync](../../guides/dexie-cloud.md) - How sync works
