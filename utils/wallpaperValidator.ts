/**
 * Wallpaper Manifest Validator (F105)
 *
 * Validates wallpaper.json manifests to prevent invalid or malicious packs.
 * Checks:
 * - Required fields: id, name, type, preview
 * - Valid type values
 * - Entry point for shader/scene types
 * - URL/path format validation
 * - Asset size limits
 */
import { WallpaperManifest } from '../types/wallpaper';

/**
 * Validation result
 */
export interface ValidationResult {
    /** Whether the manifest is valid */
    valid: boolean;
    /** List of validation errors */
    errors: string[];
    /** List of warnings (non-fatal issues) */
    warnings: string[];
}

/**
 * Maximum file size for wallpaper assets (5MB)
 */
export const MAX_ASSET_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Maximum length for string fields
 */
const MAX_STRING_LENGTH = 256;

/**
 * Valid wallpaper types
 */
const VALID_TYPES = ['shader', 'scene', 'image'] as const;

/**
 * Allowed file extensions for different asset types
 */
const ALLOWED_EXTENSIONS = {
    shader: ['.wgsl', '.glsl', '.frag', '.vert'],
    scene: ['.json', '.gltf', '.glb'],
    image: ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
    preview: ['.png', '.jpg', '.jpeg', '.webp'],
};

/**
 * Validate a wallpaper manifest
 *
 * @param manifest - The manifest to validate
 * @returns Validation result with errors and warnings
 */
export function validateWallpaperManifest(manifest: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if manifest is an object
    if (!manifest || typeof manifest !== 'object') {
        return {
            valid: false,
            errors: ['Manifest must be a valid JSON object'],
            warnings: [],
        };
    }

    const m = manifest as Record<string, unknown>;

    // Required field: id
    if (!m.id || typeof m.id !== 'string') {
        errors.push('Missing or invalid required field: id (must be a string)');
    } else if (m.id.length > MAX_STRING_LENGTH) {
        errors.push(`Field "id" exceeds maximum length of ${MAX_STRING_LENGTH} characters`);
    } else if (!/^[a-z0-9-]+$/.test(m.id)) {
        errors.push('Field "id" must only contain lowercase letters, numbers, and hyphens');
    }

    // Required field: name
    if (!m.name || typeof m.name !== 'string') {
        errors.push('Missing or invalid required field: name (must be a string)');
    } else if (m.name.length > MAX_STRING_LENGTH) {
        errors.push(`Field "name" exceeds maximum length of ${MAX_STRING_LENGTH} characters`);
    }

    // Required field: type
    if (!m.type || typeof m.type !== 'string') {
        errors.push('Missing or invalid required field: type (must be one of: shader, scene, image)');
    } else if (!VALID_TYPES.includes(m.type as (typeof VALID_TYPES)[number])) {
        errors.push(`Invalid type "${m.type}". Must be one of: ${VALID_TYPES.join(', ')}`);
    }

    const wallpaperType = m.type as string;

    // Entry field - required for shader and scene types
    if (wallpaperType === 'shader' || wallpaperType === 'scene') {
        if (!m.entry || typeof m.entry !== 'string') {
            errors.push(`Missing required field: entry (required for type "${wallpaperType}")`);
        } else if (!isValidPath(m.entry)) {
            errors.push('Field "entry" contains invalid characters or path traversal');
        } else {
            const allowedExt = ALLOWED_EXTENSIONS[wallpaperType as keyof typeof ALLOWED_EXTENSIONS] || [];
            if (!hasAllowedExtension(m.entry, allowedExt)) {
                warnings.push(`Field "entry" has unexpected extension. Expected: ${allowedExt.join(', ')}`);
            }
        }
    }

    // Preview field - required
    if (typeof m.preview !== 'string' || m.preview.length === 0) {
        errors.push('Missing or invalid required field: preview (must be a string URL or path)');
    } else {
        const previewIsUrl = isValidUrl(m.preview);
        const previewIsPath = isValidPath(m.preview);

        if (!previewIsUrl && !previewIsPath) {
            errors.push('Field "preview" must be a valid URL or relative path');
        } else if (previewIsPath) {
            if (!hasAllowedExtension(m.preview, ALLOWED_EXTENSIONS.preview)) {
                warnings.push(
                    `Field "preview" has unexpected extension. Expected: ${ALLOWED_EXTENSIONS.preview.join(', ')}`
                );
            }
        } else {
            const previewPath = getUrlPathname(m.preview);
            if (previewPath && !hasAllowedExtension(previewPath, ALLOWED_EXTENSIONS.preview)) {
                warnings.push(
                    `Field "preview" has unexpected extension. Expected: ${ALLOWED_EXTENSIONS.preview.join(', ')}`
                );
            }
        }
    }

    // Fallback field - optional, for shader types
    if (m.fallback !== undefined) {
        if (typeof m.fallback !== 'string') {
            errors.push('Field "fallback" must be a string');
        } else if (!isValidPath(m.fallback)) {
            errors.push('Field "fallback" contains invalid characters or path traversal');
        } else if (!hasAllowedExtension(m.fallback, ALLOWED_EXTENSIONS.shader)) {
            warnings.push(
                `Field "fallback" has unexpected extension. Expected: ${ALLOWED_EXTENSIONS.shader.join(', ')}`
            );
        }
    }

    // Tags field - optional
    if (m.tags !== undefined) {
        if (!Array.isArray(m.tags)) {
            errors.push('Field "tags" must be an array of strings');
        } else {
            const invalidTags = m.tags.filter(t => typeof t !== 'string' || t.length > 50);
            if (invalidTags.length > 0) {
                errors.push('Field "tags" contains invalid entries (must be strings, max 50 chars each)');
            }
            if (m.tags.length > 20) {
                warnings.push('Field "tags" has more than 20 entries, consider reducing');
            }
        }
    }

    // Default settings field - optional
    if (m.defaultSettings !== undefined) {
        if (typeof m.defaultSettings !== 'object' || m.defaultSettings === null || Array.isArray(m.defaultSettings)) {
            errors.push('Field "defaultSettings" must be an object');
        } else {
            const settings = m.defaultSettings as Record<string, unknown>;

            // Validate intensity
            if (settings.intensity !== undefined) {
                if (
                    typeof settings.intensity !== 'number' ||
                    !Number.isFinite(settings.intensity) ||
                    settings.intensity < 0 ||
                    settings.intensity > 1
                ) {
                    errors.push('defaultSettings.intensity must be a number between 0 and 1');
                }
            }

            // Validate fpsCap
            if (settings.fpsCap !== undefined) {
                if (settings.fpsCap !== 15 && settings.fpsCap !== 30 && settings.fpsCap !== 60) {
                    errors.push('defaultSettings.fpsCap must be 15, 30, or 60');
                }
            }

            // Validate quality
            if (settings.quality !== undefined) {
                if (!['low', 'med', 'high'].includes(settings.quality as string)) {
                    errors.push('defaultSettings.quality must be "low", "med", or "high"');
                }
            }

            // Validate audioReactive
            if (settings.audioReactive !== undefined) {
                if (typeof settings.audioReactive !== 'boolean') {
                    errors.push('defaultSettings.audioReactive must be a boolean');
                }
            }

            // Validate micSensitivity
            if (settings.micSensitivity !== undefined) {
                if (
                    typeof settings.micSensitivity !== 'number' ||
                    !Number.isFinite(settings.micSensitivity) ||
                    settings.micSensitivity < 0 ||
                    settings.micSensitivity > 1
                ) {
                    errors.push('defaultSettings.micSensitivity must be a number between 0 and 1');
                }
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Check if a path is valid (no path traversal, no absolute paths)
 */
function isValidPath(path: string): boolean {
    // Reject empty paths
    if (!path || path.length === 0) return false;

    let decoded: string;
    try {
        decoded = decodeURIComponent(path);
    } catch {
        return false;
    }

    const normalized = decoded.replace(/\\/g, '/');

    // Reject absolute paths
    if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
        return false;
    }

    // Reject path traversal
    if (normalized.includes('..') || normalized.includes('~')) {
        return false;
    }

    // Reject dangerous characters
    // eslint-disable-next-line no-control-regex
    if (/[<>:"|?*\x00-\x1f]/.test(normalized)) {
        return false;
    }

    return true;
}

/**
 * Check if a string is a valid URL
 */
function isValidUrl(str: string): boolean {
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Check if a path has one of the allowed extensions
 */
function hasAllowedExtension(path: string, extensions: string[]): boolean {
    const lower = path.toLowerCase();
    return extensions.some(ext => lower.endsWith(ext));
}

/**
 * Extract the pathname from a URL string, returning undefined on failure
 */
function getUrlPathname(urlString: string): string | undefined {
    try {
        return new URL(urlString).pathname;
    } catch {
        return undefined;
    }
}

/**
 * Validate a manifest and throw if invalid
 *
 * @param manifest - The manifest to validate
 * @throws Error if manifest is invalid
 */
export function assertValidManifest(manifest: unknown): asserts manifest is WallpaperManifest {
    const result = validateWallpaperManifest(manifest);
    if (!result.valid) {
        throw new Error(`Invalid wallpaper manifest:\n${result.errors.join('\n')}`);
    }
    if (result.warnings.length > 0) {
        console.warn('[WallpaperValidator] Warnings:', result.warnings);
    }
}

/**
 * Validate asset file size
 *
 * @param sizeBytes - Size of the asset in bytes
 * @returns Whether the size is within limits
 */
export function isValidAssetSize(sizeBytes: number): boolean {
    return sizeBytes > 0 && sizeBytes <= MAX_ASSET_SIZE_BYTES;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default validateWallpaperManifest;
