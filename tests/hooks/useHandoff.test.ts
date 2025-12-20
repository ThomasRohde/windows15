import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHandoff } from '../../hooks/useHandoff';
import { db } from '../../utils/storage/db';
import { HandoffItem } from '../../types';

const DEVICE_ID_KEY = 'windows15_device_id';

describe('useHandoff', () => {
    beforeEach(async () => {
        // Clear localStorage for device ID
        localStorage.removeItem(DEVICE_ID_KEY);

        if (db.isOpen()) {
            await db.handoffItems.clear();
            await db.kv.clear();
        } else {
            await db.open();
            await db.handoffItems.clear();
            await db.kv.clear();
        }
    });

    afterEach(async () => {
        localStorage.removeItem(DEVICE_ID_KEY);

        if (db.isOpen()) {
            await db.handoffItems.clear();
            await db.kv.clear();
        }
    });

    it('should generate a device ID in localStorage (not Dexie) and have a label', async () => {
        const { result } = renderHook(() => useHandoff());

        await waitFor(() => {
            expect(result.current.deviceId).toBeTruthy();
            expect(result.current.deviceLabel).toBe('Browser');
        });

        // Device ID should be stored in localStorage (local-only, not synced)
        // This is critical - if stored in Dexie's kv table, it would sync across devices
        // and break cross-device handoff filtering
        const localStorageId = localStorage.getItem(DEVICE_ID_KEY);
        expect(localStorageId).toBeDefined();
        expect(localStorageId).toBe(result.current.deviceId);

        // Verify it's NOT in Dexie's kv table (would cause cross-device sync issues)
        const dexieRecord = await db.kv.get(DEVICE_ID_KEY);
        expect(dexieRecord).toBeUndefined();
    });

    it('should send a handoff item', async () => {
        const { result } = renderHook(() => useHandoff());

        await waitFor(() => {
            expect(result.current.deviceId).toBeTruthy();
            expect(result.current.deviceId.length).toBeGreaterThan(10);
        });

        let id: string | undefined;
        await act(async () => {
            id = await result.current.send({
                target: 'https://google.com',
                kind: 'url',
                text: 'Google',
                title: 'Search',
            });
        });

        expect(id).toBeDefined();
        if (id) {
            const item = await db.handoffItems.get(id);
            expect(item).toBeDefined();
            expect(item?.target).toBe('https://google.com');
            expect(item?.status).toBe('new');
            expect(item?.createdByDeviceId).toBe(result.current.deviceId);
        }
    });

    it('should mark an item as opened', async () => {
        const { result } = renderHook(() => useHandoff());

        const id = await db.handoffItems.add({
            target: 'test',
            kind: 'text',
            text: 'test',
            status: 'new',
            createdAt: Date.now(),
            createdByDeviceId: 'other',
            createdByLabel: 'Other',
        } as HandoffItem);

        await act(async () => {
            await result.current.markOpened(id);
        });

        const item = await db.handoffItems.get(id);
        expect(item?.status).toBe('opened');
        expect(item?.openedAt).toBeDefined();
    });

    it('should mark an item as done', async () => {
        const { result } = renderHook(() => useHandoff());

        const id = await db.handoffItems.add({
            target: 'test',
            kind: 'text',
            text: 'test',
            status: 'new',
            createdAt: Date.now(),
            createdByDeviceId: 'other',
            createdByLabel: 'Other',
        } as HandoffItem);

        await act(async () => {
            await result.current.markDone(id);
        });

        const item = await db.handoffItems.get(id);
        expect(item?.status).toBe('done');
        expect(item?.doneAt).toBeDefined();
    });

    it('should archive expired items', async () => {
        const { result } = renderHook(() => useHandoff());

        await waitFor(() => {
            expect(result.current.deviceId).toBeTruthy();
        });

        // Set retention to 1 day
        await act(async () => {
            result.current.setRetentionDays(1);
        });

        // Add an old item (2 days old)
        const oldId = await db.handoffItems.add({
            target: 'old',
            kind: 'text',
            text: 'old',
            status: 'new',
            createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
            createdByDeviceId: 'other',
            createdByLabel: 'Other',
        } as HandoffItem);

        // Add a recent item (1 hour old)
        const recentId = await db.handoffItems.add({
            target: 'recent',
            kind: 'text',
            text: 'recent',
            status: 'new',
            createdAt: Date.now() - 1 * 60 * 60 * 1000,
            createdByDeviceId: 'other',
            createdByLabel: 'Other',
        } as HandoffItem);

        await act(async () => {
            await result.current.cleanup();
        });

        const oldItem = await db.handoffItems.get(oldId);
        const recentItem = await db.handoffItems.get(recentId);

        expect(oldItem?.status).toBe('archived');
        expect(recentItem?.status).toBe('new');
    });

    it('should clear archived items', async () => {
        const { result } = renderHook(() => useHandoff());

        await db.handoffItems.add({
            target: 'archived',
            kind: 'text',
            text: 'archived',
            status: 'archived',
            createdAt: Date.now(),
            createdByDeviceId: 'other',
            createdByLabel: 'Other',
        } as HandoffItem);

        await act(async () => {
            await result.current.clearArchived();
        });

        const archivedItems = await db.handoffItems.where('status').equals('archived').toArray();
        expect(archivedItems.length).toBe(0);
    });
});
