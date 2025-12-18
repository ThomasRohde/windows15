# Building an OS-Integrated App

This guide walks you through creating a fully-integrated Windows 15 app from scratch.

## Prerequisites

- Familiarity with React and TypeScript
- Understanding of React hooks
- Basic knowledge of IndexedDB (optional)

## Step 1: Create App Component

Create your app component in `apps/MyApp.tsx`:

```typescript
import React from 'react';
import { useTranslation, useWindow, useSound, useAppState } from '../hooks';

interface MyAppState {
  count: number;
}

export const MyApp = () => {
  const { t } = useTranslation('myApp');
  const { setTitle, setBadge } = useWindow();
  const { play } = useSound();
  const [state, setState] = useAppState<MyAppState>('myApp', { count: 0 });

  const increment = () => {
    const newCount = state.count + 1;
    void setState({ count: newCount });
    setBadge(newCount);
    play('click');
  };

  return (
    <div className="h-full bg-background-dark text-white p-4">
      <h1>{t('title')}</h1>
      <p>{t('count')}: {state.count}</p>
      <button onClick={increment}>{t('increment')}</button>
    </div>
  );
};
```

## Step 2: Register App

Add your app to the registry in `apps/registry.ts`:

```typescript
import { MyApp } from './MyApp';

export const appRegistry: AppRegistry = {
    // ... existing apps
    myApp: {
        id: 'myApp',
        name: 'My App',
        icon: 'star',
        component: MyApp,
        defaultSize: { width: 400, height: 300 },
        category: 'utilities',
    },
};
```

### Registry Fields

- **id**: Unique identifier (kebab-case)
- **name**: Display name
- **icon**: Material Symbols icon name
- **component**: React component
- **defaultSize**: Initial window dimensions
- **category**: Group in start menu (`'productivity'` | `'utilities'` | `'media'` | `'tools'`)

## Step 3: Add Localization

Create translation file in `locales/en.json`:

```json
{
    "myApp": {
        "title": "My App",
        "count": "Count",
        "increment": "Increment"
    }
}
```

## Step 4: Export Component

Add to `apps/index.ts`:

```typescript
export { MyApp } from './MyApp';
```

## Step 5: Test Your App

1. Run dev server: `npm run dev`
2. Open Start Menu
3. Find your app under the assigned category
4. Click to open

## OS Integration Features

### Window Management

Control your window dynamically:

```typescript
const { setTitle, setIcon, setBadge, close } = useWindow();

// Update title based on state
useEffect(() => {
    setTitle(fileName || 'Untitled');
}, [fileName, setTitle]);

// Show notification badge
setBadge(unreadCount);

// Custom close handler
const handleClose = () => {
    if (isDirty) {
        // Use useConfirmDialog for better UX
        if (confirm('Unsaved changes. Close anyway?')) {
            close();
        }
    } else {
        close();
    }
};
```

### State Persistence

Use `useAppState` for small persistent state:

```typescript
interface EditorState {
    fontSize: number;
    theme: 'light' | 'dark';
    recentFiles: string[];
}

const [state, setState] = useAppState<EditorState>('editor', {
    fontSize: 14,
    theme: 'dark',
    recentFiles: [],
});

// State persists across sessions and syncs across devices
```

### Sound Effects

Add audio feedback:

```typescript
const { play } = useSound();

const handleSave = async () => {
    try {
        await saveFile();
        play('success');
    } catch (err) {
        play('error');
    }
};
```

### Keyboard Shortcuts

Register global hotkeys:

```typescript
import { useHotkeys, useStandardHotkeys } from '../hooks';

// Standard shortcuts (Ctrl+S, Ctrl+O, etc.)
useStandardHotkeys({
    onSave: handleSave,
    onOpen: handleOpen,
    onClose: handleClose,
});

// Custom shortcuts
useHotkeys({
    'ctrl+k': handleCommand,
    'alt+n': handleNew,
    f11: handleFullscreen,
});
```

### Notifications

Show toast notifications:

```typescript
import { useNotification } from '../hooks';

const notify = useNotification();

notify.success('File saved successfully');
notify.error('Failed to load data');
notify.info('Processing...');
notify.warning('Low disk space');
```

## Advanced: File Associations

Register file types your app can open:

```typescript
export const appRegistry: AppRegistry = {
    myApp: {
        // ... basic config
        fileAssociations: [
            { extension: '.myfile', description: 'My File Format' },
            { extension: '.dat', description: 'Data File' },
        ],
    },
};
```

When user opens a `.myfile`, your app launches with the file:

```typescript
export const MyApp = ({ initialFile }: { initialFile?: string }) => {
    useEffect(() => {
        if (initialFile) {
            loadFile(initialFile);
        }
    }, [initialFile]);

    // ...
};
```

## Database Integration

For larger datasets, use Dexie directly:

```typescript
import { useDb } from '../context/DbContext';
import { useDexieLiveQuery } from '../utils/storage/react';

export const TodoList = () => {
  const db = useDb();

  // Reactive query - auto-updates on changes
  const { value: todos } = useDexieLiveQuery(
    () => db.todos.where({ completed: false }).toArray(),
    [db]
  );

  const addTodo = async (text: string) => {
    await db.todos.add({
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: Date.now(),
    });
  };

  return (
    <div>
      {todos?.map(todo => <TodoItem key={todo.id} todo={todo} />)}
    </div>
  );
};
```

## Best Practices

1. **Use TypeScript** - Catch errors at compile time
2. **Type your state** - Use interfaces for `useAppState`
3. **Namespace translations** - Always provide namespace to `useTranslation`
4. **Handle errors** - Show user-friendly messages
5. **Test across sessions** - Verify state persists correctly
6. **Respect user settings** - Check sound enabled, reduced motion, etc.
7. **Clean up effects** - All hooks auto-cleanup, but double-check custom effects

## Troubleshooting

### App doesn't appear in Start Menu

- Check `apps/registry.ts` - ensure app is registered
- Verify `apps/index.ts` - component must be exported
- Check for TypeScript errors - `npm run build`

### State doesn't persist

- Ensure `useAppState` not `useState`
- Check browser IndexedDB in DevTools
- Verify `appId` is unique and consistent

### Translations not working

- Check `locales/en.json` - namespace must match
- Verify translation keys exist
- Check browser console for warnings

### Sounds don't play

- Check Settings > Sound - user may have disabled
- Verify sound name is valid `SystemSound` type
- Check browser console for load errors

## Next Steps

- [Localization Guide](./localization.md) - Add more languages
- [DbContext Migration](./db-migration.md) - Move from localStorage
- [File System Integration](./file-system.md) - Add open/save functionality
- [App Registry Reference](../reference/app-registry.md) - Full registry options

## Examples

See these apps for reference:

- **Simple:** `Calculator.tsx`, `Clock.tsx`
- **State:** `Notepad.tsx`, `TodoList.tsx`
- **Database:** `Mail.tsx`, `Calendar.tsx`
- **Advanced:** `Terminal.tsx`, `FileExplorer.tsx`
