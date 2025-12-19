# useSound

**Category:** UI/UX Hook  
**Since:** v0.1.0  
**Related:** [SoundService](../utils/SoundService.md), [Settings](../../apps/Settings.md)

## Overview

The `useSound` hook provides access to system sound effects. It integrates with user sound settings and offers a type-safe API for playing OS sounds.

## API

```typescript
type SystemSound = 'startup' | 'shutdown' | 'notification' | 'success' | 'error' | 'click' | 'open' | 'close';

interface UseSoundReturn {
    play: (sound: SystemSound) => void;
    enabled: boolean;
    volume: number;
}

function useSound(): UseSoundReturn;
```

### Returns

- `play(sound)`: Plays the specified system sound
- `enabled`: Whether sounds are enabled in settings
- `volume`: Current volume level (0.0 - 1.0)

## Usage Examples

### Basic Sound Playback

```typescript
import { useSound } from '../hooks';

export const MyButton = () => {
  const { play } = useSound();

  const handleClick = () => {
    play('click');
    // Handle button action
  };

  return <button onClick={handleClick}>Click Me</button>;
};
```

### Conditional Sound Playback

```typescript
export const DeleteButton = () => {
  const { play, enabled } = useSound();

  const handleDelete = async () => {
    try {
      await deleteItem();
      if (enabled) {
        play('success');
      }
    } catch (err) {
      if (enabled) {
        play('error');
      }
    }
  };

  return <button onClick={handleDelete}>Delete</button>;
};
```

### Volume-Aware Playback

```typescript
export const RecycleBin = () => {
    const { play, volume } = useSound();

    const handleDelete = (item: FileSystemItem) => {
        // Play softer sound for bulk operations
        if (volume > 0.5) {
            play('success');
        }
        moveToRecycleBin(item);
    };

    // ...
};
```

## Available System Sounds

| Sound          | Use Case            | Audio            |
| -------------- | ------------------- | ---------------- |
| `startup`      | OS boot             | Ascending chime  |
| `shutdown`     | OS shutdown         | Descending chime |
| `notification` | Toast notifications | Gentle ping      |
| `success`      | Success actions     | Positive ding    |
| `error`        | Error states        | Alert beep       |
| `click`        | Button clicks       | Subtle click     |
| `open`         | Opening items       | Soft whoosh      |
| `close`        | Closing items       | Soft thud        |

## Sound Settings

Users can control sounds via Settings app:

- **Enable/Disable**: Toggle all sounds on/off
- **Volume**: Adjust volume (0-100%)
- **Per-Sound Control**: Future feature

## Best Practices

1. **Use sounds sparingly** - Don't play sounds for every interaction

2. **Choose appropriate sounds**:
    - Use `success` for confirmed actions (save, delete)
    - Use `error` for failures or warnings
    - Use `click` for quick UI interactions
    - Use `notification` for background events

3. **Respect user settings** - Always check `enabled` before critical sounds:

    ```typescript
    if (enabled && isImportantAction) {
        play('notification');
    }
    ```

4. **Avoid sound spam** - Debounce rapid interactions:
    ```typescript
    const debouncedPlay = debounce(() => play('click'), 100);
    ```

## Edge Cases

- **Sounds disabled**: `play()` is a no-op, no error thrown
- **Volume at 0**: Sound plays at 0% volume (silent)
- **Missing sound file**: Fails silently, logs warning to console
- **Browser autoplay policy**: Sounds may not play until user interacts with page

## Integration with Components

Many built-in components automatically integrate sound:

```typescript
// RecycleBin plays 'success' on delete
<RecycleBin onDelete={handleDelete} />

// Calculator plays 'click' on button press
<Calculator />

// NotificationToast plays 'notification' automatically
```

## See Also

- [SoundService](../utils/SoundService.md) - Underlying sound system
- [Settings > Sound](../../apps/Settings.md#sound) - User configuration
- [useNotification](./useNotification.md) - Notification hook (auto-plays sounds)
