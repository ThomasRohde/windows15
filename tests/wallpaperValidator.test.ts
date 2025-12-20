/**
 * Tests for Wallpaper Manifest Validator (F105)
 */
import { describe, it, expect } from 'vitest';
import {
    validateWallpaperManifest,
    assertValidManifest,
    isValidAssetSize,
    MAX_ASSET_SIZE_BYTES,
} from '../utils/wallpaperValidator';

describe('validateWallpaperManifest', () => {
    it('should validate a complete valid manifest', () => {
        const manifest = {
            id: 'test-wallpaper',
            name: 'Test Wallpaper',
            type: 'image',
            preview: 'https://example.com/preview.jpg',
            tags: ['abstract', 'colorful'],
        };

        const result = validateWallpaperManifest(manifest);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should validate a shader type manifest with entry', () => {
        const manifest = {
            id: 'plasma-shader',
            name: 'Plasma Shader',
            type: 'shader',
            entry: 'shaders/plasma.wgsl',
            preview: 'preview.png',
            fallback: 'shaders/plasma.glsl',
        };

        const result = validateWallpaperManifest(manifest);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should reject null or non-object manifests', () => {
        expect(validateWallpaperManifest(null).valid).toBe(false);
        expect(validateWallpaperManifest(undefined).valid).toBe(false);
        expect(validateWallpaperManifest('string').valid).toBe(false);
        expect(validateWallpaperManifest(123).valid).toBe(false);
    });

    it('should require id field', () => {
        const manifest = { name: 'Test', type: 'image' };
        const result = validateWallpaperManifest(manifest);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('id'))).toBe(true);
    });

    it('should require name field', () => {
        const manifest = { id: 'test', type: 'image' };
        const result = validateWallpaperManifest(manifest);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });

    it('should require type field', () => {
        const manifest = { id: 'test', name: 'Test' };
        const result = validateWallpaperManifest(manifest);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('type'))).toBe(true);
    });

    it('should reject invalid type values', () => {
        const manifest = { id: 'test', name: 'Test', type: 'invalid' };
        const result = validateWallpaperManifest(manifest);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Invalid type'))).toBe(true);
    });

    it('should require entry for shader type', () => {
        const manifest = { id: 'test', name: 'Test', type: 'shader' };
        const result = validateWallpaperManifest(manifest);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('entry'))).toBe(true);
    });

    it('should require entry for scene type', () => {
        const manifest = { id: 'test', name: 'Test', type: 'scene' };
        const result = validateWallpaperManifest(manifest);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('entry'))).toBe(true);
    });

    it('should not require entry for image type', () => {
        const manifest = { id: 'test', name: 'Test', type: 'image', preview: 'test.jpg' };
        const result = validateWallpaperManifest(manifest);
        expect(result.valid).toBe(true);
    });

    it('should reject path traversal in entry', () => {
        const manifest = { id: 'test', name: 'Test', type: 'shader', entry: '../../../etc/passwd' };
        const result = validateWallpaperManifest(manifest);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('path traversal'))).toBe(true);
    });

    it('should reject encoded path traversal in entry', () => {
        const manifest = {
            id: 'test',
            name: 'Test',
            type: 'shader',
            entry: 'shaders/%2e%2e/%2e%2e/secret.wgsl',
        };
        const result = validateWallpaperManifest(manifest);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('entry'))).toBe(true);
    });

    it('should reject absolute paths in entry', () => {
        const manifest = { id: 'test', name: 'Test', type: 'shader', entry: '/etc/passwd' };
        const result = validateWallpaperManifest(manifest);
        expect(result.valid).toBe(false);
    });

    it('should reject URL entries for shader type', () => {
        const manifest = {
            id: 'test',
            name: 'Test',
            type: 'shader',
            entry: 'https://example.com/shader.wgsl',
        };
        const result = validateWallpaperManifest(manifest);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('entry'))).toBe(true);
    });

    it('should validate id format (lowercase, hyphens, numbers)', () => {
        const validId = { id: 'my-wallpaper-123', name: 'Test', type: 'image', preview: 'preview.jpg' };
        expect(validateWallpaperManifest(validId).valid).toBe(true);

        const invalidId = { id: 'My_Wallpaper!', name: 'Test', type: 'image', preview: 'preview.jpg' };
        const result = validateWallpaperManifest(invalidId);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('lowercase'))).toBe(true);
    });

    it('should require preview field', () => {
        const manifest = { id: 'test', name: 'Test', type: 'image' };
        const result = validateWallpaperManifest(manifest);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('preview'))).toBe(true);
    });

    it('should validate tags as array of strings', () => {
        const validTags = { id: 'test', name: 'Test', type: 'image', preview: 'preview.jpg', tags: ['one', 'two'] };
        expect(validateWallpaperManifest(validTags).valid).toBe(true);

        const invalidTags = {
            id: 'test',
            name: 'Test',
            type: 'image',
            preview: 'preview.jpg',
            tags: 'not-an-array',
        };
        expect(validateWallpaperManifest(invalidTags).valid).toBe(false);
    });

    it('should validate defaultSettings fields', () => {
        const validSettings = {
            id: 'test',
            name: 'Test',
            type: 'image',
            preview: 'preview.jpg',
            defaultSettings: { intensity: 0.5, fpsCap: 30, quality: 'high', audioReactive: true, micSensitivity: 0.7 },
        };
        expect(validateWallpaperManifest(validSettings).valid).toBe(true);

        const invalidIntensity = {
            id: 'test',
            name: 'Test',
            type: 'image',
            preview: 'preview.jpg',
            defaultSettings: { intensity: 2.0 },
        };
        expect(validateWallpaperManifest(invalidIntensity).valid).toBe(false);

        const invalidFps = {
            id: 'test',
            name: 'Test',
            type: 'image',
            preview: 'preview.jpg',
            defaultSettings: { fpsCap: 120 },
        };
        expect(validateWallpaperManifest(invalidFps).valid).toBe(false);

        const invalidAudioReactive = {
            id: 'test',
            name: 'Test',
            type: 'image',
            preview: 'preview.jpg',
            defaultSettings: { audioReactive: 'yes' },
        };
        expect(validateWallpaperManifest(invalidAudioReactive).valid).toBe(false);

        const invalidMicSensitivity = {
            id: 'test',
            name: 'Test',
            type: 'image',
            preview: 'preview.jpg',
            defaultSettings: { micSensitivity: 2 },
        };
        expect(validateWallpaperManifest(invalidMicSensitivity).valid).toBe(false);
    });

    it('should reject non-object defaultSettings', () => {
        const invalidDefaultSettings = {
            id: 'test',
            name: 'Test',
            type: 'image',
            preview: 'preview.jpg',
            defaultSettings: ['not', 'an', 'object'],
        };
        expect(validateWallpaperManifest(invalidDefaultSettings).valid).toBe(false);
    });

    it('should reject non-finite numeric defaultSettings values', () => {
        const invalidIntensity = {
            id: 'test',
            name: 'Test',
            type: 'image',
            preview: 'preview.jpg',
            defaultSettings: { intensity: Number.NaN },
        };
        expect(validateWallpaperManifest(invalidIntensity).valid).toBe(false);

        const invalidMicSensitivity = {
            id: 'test',
            name: 'Test',
            type: 'image',
            preview: 'preview.jpg',
            defaultSettings: { micSensitivity: Number.POSITIVE_INFINITY },
        };
        expect(validateWallpaperManifest(invalidMicSensitivity).valid).toBe(false);
    });
});

describe('assertValidManifest', () => {
    it('should not throw for valid manifest', () => {
        const manifest = { id: 'test', name: 'Test', type: 'image', preview: 'preview.jpg' };
        expect(() => assertValidManifest(manifest)).not.toThrow();
    });

    it('should throw for invalid manifest', () => {
        const manifest = { name: 'Test' };
        expect(() => assertValidManifest(manifest)).toThrow('Invalid wallpaper manifest');
    });
});

describe('isValidAssetSize', () => {
    it('should accept sizes under the limit', () => {
        expect(isValidAssetSize(1024)).toBe(true);
        expect(isValidAssetSize(MAX_ASSET_SIZE_BYTES)).toBe(true);
    });

    it('should reject sizes over the limit', () => {
        expect(isValidAssetSize(MAX_ASSET_SIZE_BYTES + 1)).toBe(false);
    });

    it('should reject zero or negative sizes', () => {
        expect(isValidAssetSize(0)).toBe(false);
        expect(isValidAssetSize(-1)).toBe(false);
    });
});
