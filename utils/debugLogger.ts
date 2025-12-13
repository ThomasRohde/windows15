/**
 * Debug logging utility for sync diagnostics
 * 
 * Enable debug logging by running:
 * localStorage.setItem('windows15.debugSync', '1')
 * 
 * Disable by running:
 * localStorage.removeItem('windows15.debugSync')
 */

const isDebugEnabled = (): boolean => {
    try {
        return localStorage.getItem('windows15.debugSync') === '1';
    } catch {
        return false;
    }
};

const formatTimestamp = (): string => {
    const now = new Date();
    return now.toISOString().split('T')[1].substring(0, 12);
};

export const debugSync = {
    config: (message: string, data?: any) => {
        if (!isDebugEnabled()) return;
        console.log(`[${formatTimestamp()}] [CONFIG]`, message, data ?? '');
    },

    db: (message: string, data?: any) => {
        if (!isDebugEnabled()) return;
        console.log(`[${formatTimestamp()}] [DB]`, message, data ?? '');
    },

    sync: (message: string, data?: any) => {
        if (!isDebugEnabled()) return;
        // Sanitize data - remove sensitive info
        const sanitized = data ? sanitizeLogData(data) : '';
        console.log(`[${formatTimestamp()}] [SYNC]`, message, sanitized);
    },

    error: (message: string, error?: any) => {
        if (!isDebugEnabled()) return;
        const sanitized = error ? sanitizeLogData(error) : '';
        console.error(`[${formatTimestamp()}] [ERROR]`, message, sanitized);
    }
};

/**
 * Sanitize log data to remove sensitive information
 */
const sanitizeLogData = (data: any): any => {
    if (!data) return data;

    // If it's a string, check for sensitive patterns
    if (typeof data === 'string') {
        // Redact tokens and keys
        return data
            .replace(/token[s]?[=:]\s*[\w-]+/gi, 'token=***')
            .replace(/key[s]?[=:]\s*[\w-]+/gi, 'key=***')
            .replace(/password[s]?[=:]\s*[\w-]+/gi, 'password=***');
    }

    // If it's an object, create a sanitized copy
    if (typeof data === 'object') {
        if (Array.isArray(data)) {
            return data.map(sanitizeLogData);
        }

        const sanitized: any = {};
        for (const key in data) {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('token') || lowerKey.includes('password') || lowerKey.includes('secret')) {
                sanitized[key] = '***';
            } else {
                sanitized[key] = sanitizeLogData(data[key]);
            }
        }
        return sanitized;
    }

    return data;
};
