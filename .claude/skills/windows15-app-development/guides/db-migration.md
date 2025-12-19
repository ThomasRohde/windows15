# Migrating from localStorage to DbContext

This guide helps you migrate existing apps from localStorage to Dexie Cloud-backed DbContext for better persistence and synchronization.

## Why Migrate?

| Feature             | localStorage | DbContext (Dexie) |
| ------------------- | ------------ | ----------------- |
| Storage Limit       | ~5MB         | ~1GB+             |
| Sync Across Devices | ❌           | ✅                |
| Reactive Updates    | ❌           | ✅                |
| Multi-Tab Sync      | ❌           | ✅                |
| Structured Queries  | ❌           | ✅                |
| Type Safety         | ⚠️ Manual    | ✅ Built-in       |

## Migration Strategies

### Strategy 1: useAppState (For Simple State)

**Before:** localStorage

```typescript
const [settings, setSettings] = useState(() => {
    const stored = localStorage.getItem('settings');
    return stored ? JSON.parse(stored) : { theme: 'dark' };
});

useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
}, [settings]);
```

**After:** useAppState

```typescript
interface Settings {
    theme: 'light' | 'dark';
}

const [settings, setSettings] = useAppState<Settings>('settings', {
    theme: 'dark',
});

// That's it! Auto-persists and syncs
```

### Strategy 2: Dexie Table (For Collections)

**Before:** localStorage array

```typescript
const [todos, setTodos] = useState<Todo[]>(() => {
    const stored = localStorage.getItem('todos');
    return stored ? JSON.parse(stored) : [];
});

useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
}, [todos]);

const addTodo = (text: string) => {
    setTodos(prev => [...prev, { id: Date.now(), text, done: false }]);
};
```

**After:** Dexie + useLiveQuery

```typescript
import { useDb } from '../context/DbContext';
import { useDexieLiveQuery } from '../utils/storage/react';

const db = useDb();

// Reactive query - auto-updates
const { value: todos } = useDexieLiveQuery(() => db.todos.toArray(), [db]);

const addTodo = async (text: string) => {
    await db.todos.add({
        id: crypto.randomUUID(),
        text,
        done: false,
        createdAt: Date.now(),
    });
};
```

### Strategy 3: Migration Helper

For apps with existing localStorage data, write a one-time migration:

```typescript
import { useEffect, useState } from 'react';
import { useDb } from '../context/DbContext';

function useMigrateFromLocalStorage() {
  const db = useDb();
  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    const migrate = async () => {
      const existing = localStorage.getItem('todos');
      if (!existing) {
        setMigrated(true);
        return;
      }

      try {
        const todos = JSON.parse(existing);

        // Check if already migrated
        const count = await db.todos.count();
        if (count > 0) {
          setMigrated(true);
          return;
        }

        // Migrate data
        await db.todos.bulkAdd(todos);

        // Remove old data
        localStorage.removeItem('todos');
        setMigrated(true);

        console.log('Migration complete');
      } catch (err) {
        console.error('Migration failed:', err);
      }
    };

    void migrate();
  }, [db]);

  return migrated;
}

export const TodoList = () => {
  const migrated = useMigrateFromLocalStorage();

  if (!migrated) {
    return <div>Migrating data...</div>;
  }

  // Normal app logic
};
```

## Step-by-Step Migration

### 1. Identify Data Structure

**Simple state** (settings, preferences):

- Use `useAppState`
- Single object
- < 1MB size

**Collections** (todos, notes, emails):

- Use Dexie table
- Arrays of items
- Needs queries/filters

### 2. Define Schema (if using Dexie tables)

Add to `types.ts`:

```typescript
export interface Todo {
    id: string;
    text: string;
    done: boolean;
    createdAt: number;
}
```

Add to database schema (if not already present):

```typescript
// In your Dexie db definition
todos: '++id, done, createdAt';
```

### 3. Replace localStorage Calls

Find and replace:

```typescript
// OLD
localStorage.getItem('key');
localStorage.setItem('key', JSON.stringify(value));
localStorage.removeItem('key');

// NEW (useAppState)
const [value, setValue] = useAppState('key', defaultValue);

// NEW (Dexie)
await db.table.get(key);
await db.table.put(value);
await db.table.delete(key);
```

### 4. Update State Management

**Before:**

```typescript
const [data, setData] = useState(initialValue);
```

**After (useAppState):**

```typescript
const [data, setData] = useAppState('appId', initialValue);
```

**After (Dexie):**

```typescript
const { value: data } = useDexieLiveQuery(() => db.table.toArray(), [db]);
```

### 5. Test Migration

1. Clear localStorage and IndexedDB
2. Open app - should show default state
3. Add data - should persist
4. Reload page - data should load
5. Open in another tab - should sync
6. Check IndexedDB in DevTools

## Common Patterns

### Pattern: Form State

```typescript
// Before
const [form, setForm] = useState(() => {
    const saved = localStorage.getItem('form');
    return saved ? JSON.parse(saved) : {};
});

// After
const [form, setForm] = useAppState('form', {});
```

### Pattern: Recent Items

```typescript
// Before
const [recent, setRecent] = useState<string[]>(() => {
    const saved = localStorage.getItem('recent');
    return saved ? JSON.parse(saved) : [];
});

const addRecent = (item: string) => {
    const updated = [item, ...recent.filter(i => i !== item)].slice(0, 10);
    setRecent(updated);
    localStorage.setItem('recent', JSON.stringify(updated));
};

// After
const [recent, setRecent] = useAppState<string[]>('recent', []);

const addRecent = (item: string) => {
    void setRecent(prev => [item, ...prev.filter(i => i !== item)].slice(0, 10));
};
```

### Pattern: Collection with CRUD

```typescript
// After: Dexie
const db = useDb();
const { value: items } = useDexieLiveQuery(() => db.items.toArray(), [db]);

// Create
await db.items.add({ id: crypto.randomUUID(), name: 'Item' });

// Read (via useLiveQuery above)

// Update
await db.items.update(id, { name: 'Updated' });

// Delete
await db.items.delete(id);
```

## Migration Checklist

- [ ] Identify all localStorage usage
- [ ] Decide: useAppState or Dexie table
- [ ] Define TypeScript interfaces
- [ ] Write migration helper (if needed)
- [ ] Replace localStorage calls
- [ ] Update state management
- [ ] Test in clean browser
- [ ] Test multi-tab sync
- [ ] Verify IndexedDB in DevTools
- [ ] Remove old localStorage code

## Gotchas

### async/await Required

Dexie operations are async:

```typescript
// ❌ Won't work
const data = db.table.get(id);

// ✅ Correct
const data = await db.table.get(id);
```

### setState is Async

`useAppState` returns async setter:

```typescript
// ❌ Won't work immediately
setState({ value: 1 });
console.log(state.value); // Still old value

// ✅ Await if needed
await setState({ value: 1 });
console.log(state.value); // New value
```

### Don't Store Large Data in useAppState

```typescript
// ❌ Bad: Large arrays
const [users, setUsers] = useAppState('users', [1000 users]);

// ✅ Good: Use Dexie table
await db.users.bulkAdd([...1000 users]);
```

## Performance Tips

1. **Batch writes:**

    ```typescript
    await db.todos.bulkAdd([todo1, todo2, todo3]);
    ```

2. **Index frequently queried fields:**

    ```typescript
    // In schema
    todos: '++id, done, *tags, createdAt';
    ```

3. **Limit query results:**

    ```typescript
    const { value } = useDexieLiveQuery(() => db.todos.limit(100).toArray(), [db]);
    ```

4. **Use pagination for large lists:**

    ```typescript
    const [page, setPage] = useState(0);
    const pageSize = 20;

    const { value } = useDexieLiveQuery(
        () =>
            db.items
                .offset(page * pageSize)
                .limit(pageSize)
                .toArray(),
        [db, page]
    );
    ```

## Examples

### Complete Migration: TodoList

**Before (localStorage):**

```typescript
export const TodoList = () => {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const stored = localStorage.getItem('todos');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = (text: string) => {
    setTodos([...todos, { id: Date.now(), text, done: false }]);
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  return <>...</>;
};
```

**After (Dexie):**

```typescript
export const TodoList = () => {
  const db = useDb();
  const { value: todos } = useDexieLiveQuery(() => db.todos.toArray(), [db]);

  const addTodo = async (text: string) => {
    await db.todos.add({
      id: crypto.randomUUID(),
      text,
      done: false,
      createdAt: Date.now(),
    });
  };

  const toggleTodo = async (id: string) => {
    const todo = await db.todos.get(id);
    if (todo) {
      await db.todos.update(id, { done: !todo.done });
    }
  };

  const deleteTodo = async (id: string) => {
    await db.todos.delete(id);
  };

  return <>...</>;
};
```

## See Also

- [useAppState Documentation](../api/hooks/useAppState.md)
- [DbContext Reference](../api/contexts/DbContext.md)
- [Dexie Cloud Guide](./dexie-cloud.md)
- [Database Schema](../reference/database-schema.md)
