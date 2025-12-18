export interface TerminalTheme {
    name: string;
    displayName: string;
    backgroundColor: string;
    textColor: string;
    commandColor: string;
    errorColor: string;
    promptColor: string;
}

export interface TerminalPreferences {
    theme: string; // Theme name
    fontSize: number; // Font size in pixels (10-18)
    fontFamily: string; // Font family
}

export const TERMINAL_THEMES: Record<string, TerminalTheme> = {
    classic: {
        name: 'classic',
        displayName: 'Classic (Green on Black)',
        backgroundColor: '#000000',
        textColor: '#00ff00',
        commandColor: '#00ffff',
        errorColor: '#ff6b6b',
        promptColor: '#00ffff',
    },
    powershell: {
        name: 'powershell',
        displayName: 'PowerShell (Blue on Black)',
        backgroundColor: '#012456',
        textColor: '#f0f0f0',
        commandColor: '#00ffff',
        errorColor: '#ff6b6b',
        promptColor: '#00ffff',
    },
    amber: {
        name: 'amber',
        displayName: 'Amber (Amber on Black)',
        backgroundColor: '#000000',
        textColor: '#ffb000',
        commandColor: '#ffd700',
        errorColor: '#ff6b6b',
        promptColor: '#ffd700',
    },
    light: {
        name: 'light',
        displayName: 'Light (Black on White)',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        commandColor: '#0066cc',
        errorColor: '#cc0000',
        promptColor: '#0066cc',
    },
};

export const TERMINAL_FONTS = ['Consolas', 'Courier New', 'Monaco', 'Menlo', 'Ubuntu Mono', 'monospace'];

export const DEFAULT_TERMINAL_PREFERENCES: TerminalPreferences = {
    theme: 'classic',
    fontSize: 14,
    fontFamily: 'Consolas',
};
