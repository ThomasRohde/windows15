import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHandoff } from '../../hooks/useHandoff';
import { db } from '../../utils/storage/db';
import { HandoffItem } from '../../types';

describe('useHandoff', () => {
    beforeEach(async () => {
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
        if (db.isOpen()) {
            await db.handoffItems.clear();
            await db.kv.clear();
        }
    });

    it('should generate a device ID and label on first use', async () => {
        const { result } = renderHook(() => useHandoff());

        await waitFor(() => {
            expect(result.current.deviceId).toBeTruthy();
            expect(result.current.deviceLabel).toBe('Browser');
        });

        const idRecord = await db.kv.get('windows15_device_id');

        // Label might not be in DB yet because it's just the default value
        // and we haven't called setDeviceLabel.
        // But deviceId should be there because of the useEffect in useHandoff.
        expect(idRecord).toBeDefined();
        if (idRecord) {
            expect(JSON.parse(idRecord.valueJson)).toBe(result.current.deviceId);
        }
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
});
