import { FileSystemItem } from '../types';

export const WALLPAPERS = [
    { id: 1, url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCY3LHaXcF5SWVVoBI_JMH9H6QYU4lgLNIvZ54dBEgUiWIFMWFPb3Hl__GFWZmYtHKaoC5q7haIs5NXb60Dt78GngCX_4hVZXma0-4PjCTgM2gyJayFkN-Bh1wJXq7d4qCMzF6dxLH_zc9wUglUELjU8WTZJEokR1bOm_kR5NdahTouwN9nVBs2mbd42NgvL4bSKGPfECzN-MwudFWk0zHAsMAyXEiBIGLekMSBMU7Dq8uF8SWr4I4Qg0tGhSQ3FCxcu9w1V0ezwBpP', name: 'Desert Dunes' },
    { id: 2, url: 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&w=2000&q=80', name: 'Dark Mountains' },
    { id: 3, url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=2000&q=80', name: 'Cyberpunk City' },
    { id: 4, url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=80', name: 'Yosemite' },
];

export const DEFAULT_DESKTOP_SHORTCUTS: FileSystemItem[] = [
    { id: 'desktop-thispc', name: 'This PC', type: 'shortcut', icon: 'computer', appId: 'explorer', targetPath: ['root'], colorClass: 'text-blue-300' },
    { id: 'desktop-documents', name: 'Documents', type: 'shortcut', icon: 'folder_open', appId: 'explorer', targetPath: ['root', 'documents'], colorClass: 'text-yellow-300' },
    { id: 'desktop-browser', name: 'Browser', type: 'shortcut', icon: 'public', appId: 'browser', colorClass: 'text-green-300' },
    { id: 'desktop-terminal', name: 'Terminal', type: 'shortcut', icon: 'terminal', appId: 'terminal', colorClass: 'text-green-400' },
    { id: 'desktop-timer', name: 'Timer', type: 'shortcut', icon: 'timer', appId: 'timer', colorClass: 'text-red-300' },
    { id: 'desktop-jsonviewer', name: 'JSON Viewer', type: 'shortcut', icon: 'data_object', appId: 'jsonviewer', colorClass: 'text-amber-300' },
    { id: 'desktop-todolist', name: 'Todo List', type: 'shortcut', icon: 'checklist', appId: 'todolist', colorClass: 'text-lime-300' },
    { id: 'desktop-recyclebin', name: 'Recycle Bin', type: 'shortcut', icon: 'delete', appId: 'recyclebin', colorClass: 'text-gray-300' }
];

export const INITIAL_FILES: FileSystemItem[] = [
    {
        id: 'root',
        name: 'Root',
        type: 'folder',
        children: [
            {
                id: 'desktop',
                name: 'Desktop',
                type: 'folder',
                children: DEFAULT_DESKTOP_SHORTCUTS
            },
            {
                id: 'documents',
                name: 'Documents',
                type: 'folder',
                children: [
                    { id: 'd1', name: 'Resume.docx', type: 'document', size: '15 KB', date: 'Aug 1, 2023' },
                    { id: 'd2', name: 'Budget_2024.xlsx', type: 'document', size: '32 KB', date: 'Nov 10, 2023' },
                    { id: 'f1', name: 'Project_Alpha.pdf', type: 'document', size: '2.4 MB', date: 'Oct 24, 2023' },
                    { 
                        id: 'd3', 
                        name: 'Notes.txt', 
                        type: 'document', 
                        size: '1 KB', 
                        date: 'Today',
                        content: 'Todo list:\n- Fix window dragging\n- Add start menu\n- Buy groceries' 
                    }
                ]
            },
            {
                id: 'pictures',
                name: 'Pictures',
                type: 'folder',
                children: [
                    { id: 'p1', name: 'Sunset.png', type: 'image', size: '1.2 MB', date: 'Jun 15, 2023', src: 'https://images.unsplash.com/photo-1616036740227-3d9d383dce34?auto=format&fit=crop&w=800&q=80' },
                    { id: 'p2', name: 'Mountain.jpg', type: 'image', size: '2.8 MB', date: 'Jul 22, 2023', src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80' },
                    { id: 'f2', name: 'Vacation.jpg', type: 'image', size: '4.1 MB', date: 'Sep 12, 2023', src: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80' }
                ]
            },
            {
                id: 'music',
                name: 'Music',
                type: 'folder',
                children: [
                    { id: 'm1', name: 'Synthwave_Mix.mp3', type: 'audio', size: '12 MB', date: 'Jan 10, 2023' }
                ]
            },
            {
                id: 'recycleBin',
                name: 'Recycle Bin',
                type: 'folder',
                children: []
            }
        ]
    }
];
