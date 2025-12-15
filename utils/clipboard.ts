export const copyTextToClipboard = async (value: string): Promise<boolean> => {
    const text = value ?? '';
    if (!text) return false;

    try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // Fall through to legacy fallback.
    }

    try {
        if (typeof document === 'undefined') return false;
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        textarea.remove();
        return ok;
    } catch {
        return false;
    }
};

export const readTextFromClipboard = async (): Promise<string | null> => {
    try {
        if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return null;
        return await navigator.clipboard.readText();
    } catch {
        return null;
    }
};
