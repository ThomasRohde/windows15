# useFilePicker

**Category:** File System Hook  
**Since:** v0.1.0  
**Related:** [FilePickerModal](../components/FilePickerModal.md), [FileExplorer](../apps/FileExplorer.md)

## Overview

The `useFilePicker` hook provides file open and save dialog functionality. It manages the state for modal file picker UI and returns selected files or save locations.

## API

```typescript
interface FilePickerFile {
    id: string;
    name: string;
    content?: string;
    path: string[];
}

interface FilePickerOpenOptions {
    extensions?: string[]; // e.g., ['.txt', '.md']
    title?: string;
    initialPath?: string[];
}

interface FilePickerSaveOptions {
    defaultFileName?: string;
    content: string;
    title?: string;
    initialPath?: string[];
    defaultExtension?: string;
}

interface UseFilePickerReturn {
    state: FilePickerState;
    open: (options?: FilePickerOpenOptions) => Promise<FilePickerFile | null>;
    save: (options: FilePickerSaveOptions) => Promise<FilePickerFile | null>;
    navigateTo: (path: string[]) => void;
    selectFile: (file: FilePickerFile) => void;
    setFileName: (name: string) => void;
    confirm: () => void;
    cancel: () => void;
}

function useFilePicker(): UseFilePickerReturn;
```

## Usage Examples

### Open File Dialog

```typescript
import { useFilePicker } from '../hooks';
import { FilePickerModal } from '../components';

export const Notepad = () => {
  const { open, state } = useFilePicker();
  const [content, setContent] = useState('');

  const handleOpen = async () => {
    const file = await open({
      extensions: ['.txt', '.md'],
      title: 'Open Text File',
    });

    if (file) {
      setContent(file.content ?? '');
      console.log('Opened:', file.name);
    }
  };

  return (
    <div>
      <button onClick={handleOpen}>Open</button>
      <textarea value={content} onChange={e => setContent(e.target.value)} />
      {state.isOpen && <FilePickerModal {...state} />}
    </div>
  );
};
```

### Save File Dialog

```typescript
export const TextEditor = () => {
  const { save, state } = useFilePicker();
  const [content, setContent] = useState('');

  const handleSave = async () => {
    const result = await save({
      content,
      defaultFileName: 'document.txt',
      defaultExtension: '.txt',
      title: 'Save As',
    });

    if (result) {
      console.log('Saved to:', result.path.join('/'));
    }
  };

  return (
    <div>
      <textarea value={content} onChange={e => setContent(e.target.value)} />
      <button onClick={handleSave}>Save</button>
      {state.isOpen && <FilePickerModal {...state} />}
    </div>
  );
};
```

### Filter by Multiple Extensions

```typescript
const handleOpenImage = async () => {
    const file = await open({
        extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
        title: 'Open Image',
    });

    if (file) {
        // Handle image file
    }
};
```

### Initial Path

```typescript
const handleSaveToPictures = async () => {
    const result = await save({
        content: imageData,
        defaultFileName: 'photo.png',
        initialPath: ['root', 'Pictures'], // Start in Pictures folder
    });
};
```

## File Picker Modal

The `useFilePicker` hook manages state, but you must render the modal UI:

```typescript
import { FilePickerModal } from '../components';

export const MyApp = () => {
  const filePicker = useFilePicker();

  return (
    <div>
      <button onClick={() => filePicker.open()}>Open</button>
      {filePicker.state.isOpen && (
        <FilePickerModal
          state={filePicker.state}
          onNavigate={filePicker.navigateTo}
          onSelect={filePicker.selectFile}
          onFileNameChange={filePicker.setFileName}
          onConfirm={filePicker.confirm}
          onCancel={filePicker.cancel}
        />
      )}
    </div>
  );
};
```

## Promise-Based API

Both `open()` and `save()` return Promises that resolve when the user confirms or cancels:

```typescript
// Resolves to FilePickerFile on confirm
const file = await open();

// Resolves to null on cancel
const file = await open();
if (!file) {
    console.log('User cancelled');
}
```

## File Paths

Files have a `path` array representing their location:

```typescript
{
  id: 'file-123',
  name: 'document.txt',
  path: ['root', 'Documents', 'Work']
}
// Full path: /root/Documents/Work/document.txt
```

## Best Practices

1. **Always render FilePickerModal** when `state.isOpen` is true:

    ```typescript
    {state.isOpen && <FilePickerModal {...state} />}
    ```

2. **Handle null returns** (user cancellation):

    ```typescript
    const file = await open();
    if (!file) {
        return; // User cancelled
    }
    ```

3. **Filter by relevant extensions**:

    ```typescript
    // Text files
    extensions: ['.txt', '.md', '.markdown'];

    // Images
    extensions: ['.jpg', '.jpeg', '.png', '.gif'];

    // JSON
    extensions: ['.json'];
    ```

4. **Provide descriptive titles**:

    ```typescript
    open({ title: 'Import Calendar Events' });
    save({ title: 'Export Contacts as CSV' });
    ```

5. **Use appropriate default filenames**:
    ```typescript
    defaultFileName: `export-${Date.now()}.json`;
    defaultFileName: 'untitled.txt';
    ```

## Edge Cases

- **User cancels**: Both `open()` and `save()` resolve to `null`
- **Empty file content**: `file.content` may be empty string or undefined
- **Invalid path**: Modal navigates to 'root' if path doesn't exist
- **No extensions specified**: All files shown in open dialog
- **Missing defaultFileName**: Defaults to 'untitled.txt' in save dialog

## Integration Example

Complete example with open, save, and state management:

```typescript
export const JsonEditor = () => {
  const { open, save, state } = useFilePicker();
  const [json, setJson] = useState('{}');
  const [fileName, setFileName] = useState('untitled.json');

  const handleOpen = async () => {
    const file = await open({
      extensions: ['.json'],
      title: 'Open JSON File',
    });

    if (file) {
      setJson(file.content ?? '{}');
      setFileName(file.name);
    }
  };

  const handleSave = async () => {
    const result = await save({
      content: json,
      defaultFileName: fileName,
      defaultExtension: '.json',
      title: 'Save JSON File',
    });

    if (result) {
      setFileName(result.name);
    }
  };

  return (
    <div>
      <button onClick={handleOpen}>Open</button>
      <button onClick={handleSave}>Save</button>
      <textarea value={json} onChange={e => setJson(e.target.value)} />
      {state.isOpen && <FilePickerModal {...state} />}
    </div>
  );
};
```

## See Also

- [FilePickerModal](../components/FilePickerModal.md) - Modal UI component
- [FileExplorer](../apps/FileExplorer.md) - Full-featured file manager
- [File System API](../core/file-system.md) - File system implementation
