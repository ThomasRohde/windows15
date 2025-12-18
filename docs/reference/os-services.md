# OS Services Reference

Quick reference for all OS-level services and contexts available in Windows 15.

## Core Contexts

| Service                 | Hook                 | Purpose                                 |
| ----------------------- | -------------------- | --------------------------------------- |
| **DbContext**           | `useDb()`            | Access Dexie database instance          |
| **OSContext**           | `useOS()`            | OS-level state and configuration        |
| **WindowContext**       | `useWindowContext()` | Window management (open/close/focus)    |
| **LocalizationContext** | `useTranslation()`   | Localization and translations           |
| **WallpaperContext**    | `useWallpaper()`     | Wallpaper settings and management       |
| **ScreensaverContext**  | `useScreensaver()`   | Screensaver configuration               |
| **AppRegistryContext**  | `useAppRegistry()`   | Access app registry                     |
| **WindowSpaceContext**  | `useWindowSpace()`   | Window space/virtual desktop management |
| **StartMenuContext**    | `useStartMenu()`     | Start menu state control                |
| **UserProfileContext**  | `useUserProfile()`   | User profile and authentication         |

## Hook Reference

### useDb()

Access database for CRUD operations.

```typescript
const db = useDb();
await db.todos.add({...});
const todos = await db.todos.toArray();
```

See: [DbContext Guide](../guides/db-migration.md)

### useOS()

Access OS-level state.

```typescript
const { config, updateConfig, restartOS } = useOS();
const theme = config.theme;
```

### useWindowContext()

Manage windows programmatically.

```typescript
const { openWindow, closeWindow, focusWindow, windows } = useWindowContext();

openWindow({
    appId: 'notepad',
    title: 'Untitled',
    width: 800,
    height: 600,
});
```

### useWindow()

Control current window (use within app components).

```typescript
const { setTitle, setIcon, setBadge, close } = useWindow();

setTitle('My Document.txt');
setBadge(5);
```

See: [useWindow API](../api/hooks/useWindow.md)

### useTranslation()

Access translations.

```typescript
const { t, language, setLanguage } = useTranslation('myApp');

<h1>{t('title')}</h1>
```

See: [useTranslation API](../api/hooks/useTranslation.md), [Localization Guide](../guides/localization.md)

### useSound()

Play system sounds.

```typescript
const { play, enabled, volume } = useSound();

play('success');
play('error');
```

See: [useSound API](../api/hooks/useSound.md), [System Sounds](./system-sounds.md)

### useAppState()

Persistent app state with cloud sync.

```typescript
const [state, setState] = useAppState<MyState>('appId', defaultState);
```

See: [useAppState API](../api/hooks/useAppState.md)

### useFilePicker()

File open/save dialogs.

```typescript
const { open, save } = useFilePicker();

const file = await open({ extensions: ['.txt'] });
await save({ content: 'data', defaultFileName: 'file.txt' });
```

See: [useFilePicker API](../api/hooks/useFilePicker.md)

### useNotification()

Show toast notifications.

```typescript
const notify = useNotification();

notify.success('Saved!');
notify.error('Failed');
notify.info('Processing...');
notify.warning('Low space');
```

### useWallpaper()

Access wallpaper settings.

```typescript
const { currentWallpaper, setWallpaper, wallpapers } = useWallpaper();
```

### useScreensaver()

Configure screensaver.

```typescript
const { enabled, timeout, activate } = useScreensaver();
```

## Event Bus

Cross-component communication without prop drilling.

```typescript
// Emit
const emit = useAppEmit('my-event');
emit({ data: 'value' });

// Listen
useAppListen('my-event', payload => {
    console.log(payload);
});
```

## Standard Events

| Event               | Payload                       | Purpose       |
| ------------------- | ----------------------------- | ------------- |
| `notification:show` | `{ message, type, duration }` | Show toast    |
| `window:open`       | `WindowConfig`                | Open window   |
| `window:close`      | `{ windowId }`                | Close window  |
| `theme:change`      | `{ theme }`                   | Theme changed |
| `sound:play`        | `{ sound }`                   | Play sound    |

## Utility Hooks

| Hook                  | Purpose                           |
| --------------------- | --------------------------------- |
| `useAsyncAction`      | Handle async with loading/error   |
| `useConfirmDialog`    | Show confirmation dialogs         |
| `useCopyToClipboard`  | Copy with feedback                |
| `useDebounce`         | Debounce values                   |
| `useThrottle`         | Throttle functions                |
| `useHotkeys`          | Keyboard shortcuts                |
| `useStandardHotkeys`  | Standard shortcuts (Ctrl+S, etc.) |
| `useInterval`         | Declarative intervals             |
| `useTimeout`          | Declarative timeouts              |
| `useOnMount`          | Run on mount only                 |
| `useOnUnmount`        | Run on unmount only               |
| `usePersistedState`   | localStorage-backed state         |
| `useLocalStorage`     | Direct localStorage               |
| `useSeededCollection` | Managed seed data                 |

## See Also

- [Hooks API Reference](../api/hooks/README.md) - Detailed hook documentation
- [Building Apps Guide](../guides/building-apps.md) - How to use services
- [System Sounds Reference](./system-sounds.md) - Available sound effects
