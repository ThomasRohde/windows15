# State Persistence Patterns

This document describes the standardized approaches for persisting state in Windows15 apps.

## Overview

Windows15 uses three primary approaches for state persistence:

1. **`usePersistedState`** - For reactive local preferences (recommended for most cases)
2. **Dexie Tables** - For structured data requiring complex queries
3. **`useLocalStorage`** - For simple key-value pairs (legacy, avoid in new code)

## When to Use Each Pattern

### usePersistedState (Recommended)

**Use for:**

- User preferences (theme, settings, saved items)
- App state that should persist across sessions
- Data that needs to sync across tabs
- Simple data structures that don't need querying

**Example:**

```tsx
import { usePersistedState } from '../hooks';

const MyApp = () => {
    const { value: colors, setValue: setColors } = usePersistedState<Color[]>('myapp.colors', []);
    const { value: settings, setValue: setSettings } = usePersistedState('myapp.settings', defaultSettings);

    // Use like regular state
    setColors([...colors, newColor]);
    setSettings({ ...settings, theme: 'dark' });
};
```

**Benefits:**

- Backed by IndexedDB (better than localStorage)
- Automatic cloud sync support
- Reactive updates across tabs
- Type-safe with TypeScript
- No manual serialization needed

**Key Naming Convention:**
Use dot notation: `appname.feature` (e.g., `colorpicker.saved`, `browser.state`, `passwordgen.settings`)

### Dexie Tables

**Use for:**

- Structured data requiring queries (filtering, sorting, indexing)
- Collections with relationships
- Data exceeding 1MB
- When you need transactions

**Example:**

```tsx
import { useDb, useDexieLiveQuery } from '../utils/storage';

const TodoApp = () => {
    const db = useDb();

    // Query with reactivity
    const todos = useDexieLiveQuery(() => db.todos.orderBy('createdAt').toArray(), [db]);

    // Add with await
    const addTodo = async (text: string) => {
        await db.todos.add({
            id: generateUuid(),
            text,
            completed: false,
            createdAt: Date.now(),
        });
    };
};
```

**Current Tables:**

- `todos` - TodoList app items
- `$terminalSessions`, `$terminalHistory`, `$terminalAliases` - Terminal data
- `events` - Calendar events
- `bookmarks` - Browser bookmarks
- `kv` - Key-value store (backing for `usePersistedState`)

### useLocalStorage (Legacy)

**Avoid in new code.** Use `usePersistedState` instead for:

- Better performance (IndexedDB vs localStorage)
- Cloud sync support
- Cross-tab reactivity
- No 5MB quota limitation

**Only use for:**

- Backward compatibility with existing localStorage keys
- Very simple, non-synced preferences

## Migration Guide

### From useState to usePersistedState

**Before:**

```tsx
const [savedColors, setSavedColors] = useState<Color[]>([]);
```

**After:**

```tsx
const { value: savedColors, setValue: setSavedColors } = usePersistedState<Color[]>('colorpicker.saved', []);
```

### From useLocalStorage to usePersistedState

**Before:**

```tsx
const [settings, setSettings] = useLocalStorage('settings', defaultSettings);
```

**After:**

```tsx
const { value: settings, setValue: setSettings } = usePersistedState('myapp.settings', defaultSettings);
```

**Note:** Users will need to reconfigure their settings after migration, or you can implement a one-time migration:

```tsx
useEffect(() => {
    const legacy = localStorage.getItem('settings');
    if (legacy && settings === defaultSettings) {
        setSettings(JSON.parse(legacy));
        localStorage.removeItem('settings');
    }
}, []);
```

## Examples from the Codebase

### ColorPicker - Persisted Saved Colors

```tsx
const { value: savedColors, setValue: setSavedColors } = usePersistedState<SavedColor[]>('colorpicker.saved', []);
```

### PasswordGenerator - Persisted Settings

```tsx
const { value: settings, setValue: setSettings } = usePersistedState<PasswordSettings>('passwordgen.settings', {
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
});
```

### Browser - Persisted Navigation State

```tsx
const { value: state, setValue: setState } = usePersistedState<BrowserState>('browser.state', {
    input: 'thomasrohde.github.io',
    history: [initialEntry],
    historyIndex: 0,
    reloadNonce: 0,
    error: null,
});
```

## Best Practices

1. **Use descriptive keys**: `appname.feature` format
2. **Provide sensible defaults**: Always specify a default value
3. **Keep data small**: < 100KB per key for best performance
4. **Type your data**: Use TypeScript interfaces for type safety
5. **Handle loading states**: Check `isLoading` if needed
6. **Avoid frequent updates**: Debounce if updating rapidly

## Troubleshooting

**Data not persisting:**

- Check browser console for storage errors
- Ensure key is unique
- Check IndexedDB quota (rare)

**Data not syncing across tabs:**

- `usePersistedState` handles this automatically
- `useState` does not sync (by design)

**Performance issues:**

- Move to Dexie table if querying frequently
- Reduce update frequency (debounce)
- Break large objects into smaller keys
