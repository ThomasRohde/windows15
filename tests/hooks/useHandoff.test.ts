import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHandoff } from '../../hooks/useHandoff';
import { db } from '../../utils/storage/db';

describe('useHandoff', () => {
    beforeEach(async () => {
        localStorage.clear();
        if (db.isOpen()) {
            await db.handoffItems.clear();
        } else {
            await db.open();
            await db.handoffItems.clear();
        }
    });

    afterEach(async () => {
        if (db.isOpen()) {
            await db.handoffItems.clear();
        }
    });

    it('should generate a device ID and label on first use', () => {
        const { result } = renderHook(() => useHandoff());

        expect(result.current.deviceId).toBeDefined();
        expect(result.current.deviceLabel).toBe('Browser');
        expect(localStorage.getItem('windows15_device_id')).toBe(result.current.deviceId);
        expect(localStorage.getItem('windows15_device_label')).toBe('Browser');
    });

    it('should send a handoff item', async () => {
        const { result } = renderHook(() => useHandoff());

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
        const item = await db.handoffItems.get(id!);
        expect(item).toBeDefined();
        expect(item?.target).toBe('https://google.com');
        expect(item?.status).toBe('new');
        expect(item?.createdByDeviceId).toBe(result.current.deviceId);
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
        } as any);

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
        } as any);

        await act(async () => {
            await result.current.markDone(id);
        });

        const item = await db.handoffItems.get(id);
        expect(item?.status).toBe('done');
        expect(item?.doneAt).toBeDefined();
    });
});
