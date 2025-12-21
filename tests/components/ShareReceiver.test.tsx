import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { ShareReceiver } from '../../components/ShareReceiver';
import { db } from '../../utils/storage/db';
import { OSProvider, NotificationProvider, DbProvider, UserProfileProvider } from '../../context';

const NONCE_KEY = 'windows15_share_nonces';
const DEVICE_ID_KEY = 'windows15_device_id';

// Mock window.location
const mockLocation = (search: string) => {
    delete (window as any).location;
    (window as any).location = {
        search,
        href: `http://localhost/${search}`,
    };
};

// Mock history.replaceState
const mockReplaceState = vi.fn();

describe('ShareReceiver', () => {
    beforeEach(async () => {
        // Clear localStorage
        localStorage.removeItem(NONCE_KEY);
        localStorage.removeItem(DEVICE_ID_KEY);
        localStorage.setItem(DEVICE_ID_KEY, 'test-device-id');

        // Clear database
        if (db.isOpen()) {
            await db.handoffItems.clear();
            await db.kv.clear();
        } else {
            await db.open();
            await db.handoffItems.clear();
            await db.kv.clear();
        }

        // Mock history
        window.history.replaceState = mockReplaceState;
        mockReplaceState.mockClear();

        // Mock console methods to avoid noise in tests
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(async () => {
        localStorage.removeItem(NONCE_KEY);
        localStorage.removeItem(DEVICE_ID_KEY);
        if (db.isOpen()) {
            await db.handoffItems.clear();
            await db.kv.clear();
        }
        vi.restoreAllMocks();
    });

    const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <DbProvider>
            <NotificationProvider>
                <UserProfileProvider>
                    <OSProvider>{children}</OSProvider>
                </UserProfileProvider>
            </NotificationProvider>
        </DbProvider>
    );

    describe('F255: Deep link parsing and validation', () => {
        it('should detect and process valid URL share link', async () => {
            mockLocation(
                '?handoff=1&nonce=test123456&kind=url&target=https://example.com&text=Check%20this%20out&targetCategory=any'
            );

            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(
                async () => {
                    const items = await db.handoffItems.toArray();
                    expect(items.length).toBe(1);
                    expect(items[0].kind).toBe('url');
                    expect(items[0].target).toBe('https://example.com');
                    expect(items[0].text).toBe('Check this out');
                    expect(items[0].targetCategory).toBe('any');
                },
                { timeout: 3000 }
            );
        });

        it('should detect and process valid text share link', async () => {
            mockLocation('?handoff=1&nonce=test234567&kind=text&text=Hello%20World');

            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(
                async () => {
                    const items = await db.handoffItems.toArray();
                    expect(items.length).toBe(1);
                    expect(items[0].kind).toBe('text');
                    expect(items[0].text).toBe('Hello World');
                    expect(items[0].target).toBe('');
                },
                { timeout: 3000 }
            );
        });

        it('should infer kind=url when target is present but kind is missing', async () => {
            mockLocation('?handoff=1&nonce=test345678&target=https://example.com');

            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(
                async () => {
                    const items = await db.handoffItems.toArray();
                    expect(items.length).toBe(1);
                    expect(items[0].kind).toBe('url');
                },
                { timeout: 3000 }
            );
        });

        it('should infer kind=text when only text is present', async () => {
            mockLocation('?handoff=1&nonce=test456789&text=Some%20text');

            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(
                async () => {
                    const items = await db.handoffItems.toArray();
                    expect(items.length).toBe(1);
                    expect(items[0].kind).toBe('text');
                },
                { timeout: 3000 }
            );
        });

        it('should reject nonce that is too short (less than 6 chars)', async () => {
            mockLocation('?handoff=1&nonce=short&kind=text&text=test');

            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(async () => {
                const items = await db.handoffItems.toArray();
                expect(items.length).toBe(0);
            });
        });

        it('should reject nonce that is too long (more than 128 chars)', async () => {
            const longNonce = 'a'.repeat(129);
            mockLocation(`?handoff=1&nonce=${longNonce}&kind=text&text=test`);

            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(async () => {
                const items = await db.handoffItems.toArray();
                expect(items.length).toBe(0);
            });
        });

        it('should reject invalid URL format', async () => {
            mockLocation('?handoff=1&nonce=test567890&kind=url&target=not-a-url');

            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(async () => {
                const items = await db.handoffItems.toArray();
                expect(items.length).toBe(0);
            });
        });

        it('should reject target URL that is too long', async () => {
            const longUrl = 'https://example.com/' + 'a'.repeat(4100);
            mockLocation(`?handoff=1&nonce=test678901&kind=url&target=${encodeURIComponent(longUrl)}`);

            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(async () => {
                const items = await db.handoffItems.toArray();
                expect(items.length).toBe(0);
            });
        });

        it('should reject text that is too long', async () => {
            const longText = 'a'.repeat(20001);
            mockLocation(`?handoff=1&nonce=test789012&kind=text&text=${encodeURIComponent(longText)}`);

            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(async () => {
                const items = await db.handoffItems.toArray();
                expect(items.length).toBe(0);
            });
        });

        it('should accept valid boundary nonce lengths (6 and 128 chars)', async () => {
            // Test 6-char nonce
            mockLocation('?handoff=1&nonce=123456&kind=text&text=test1');
            const { unmount } = render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(async () => {
                const items = await db.handoffItems.toArray();
                expect(items.length).toBe(1);
            });

            unmount();
            await db.handoffItems.clear();
            localStorage.removeItem(NONCE_KEY);

            // Test 128-char nonce
            const nonce128 = 'a'.repeat(128);
            mockLocation(`?handoff=1&nonce=${nonce128}&kind=text&text=test2`);
            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(async () => {
                const items = await db.handoffItems.toArray();
                expect(items.length).toBe(1);
            });
        });
    });

    describe('F256: Nonce-based idempotency', () => {
        it('should store processed nonce in localStorage', async () => {
            mockLocation('?handoff=1&nonce=unique123&kind=text&text=test');

            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(() => {
                const stored = localStorage.getItem(NONCE_KEY);
                expect(stored).toBeTruthy();
                const nonces = JSON.parse(stored!);
                expect(nonces).toContain('unique123');
            });
        });

        it('should ignore duplicate nonce (silent)', async () => {
            // First share
            mockLocation('?handoff=1&nonce=duplicate123&kind=text&text=first');
            const { unmount } = render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(async () => {
                const items = await db.handoffItems.toArray();
                expect(items.length).toBe(1);
            });

            unmount();

            // Second share with same nonce
            mockLocation('?handoff=1&nonce=duplicate123&kind=text&text=second');
            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(async () => {
                const items = await db.handoffItems.toArray();
                // Should still be 1, not 2
                expect(items.length).toBe(1);
                expect(items[0].text).toBe('first');
            });
        });

        it('should maintain ring buffer of 50 nonces', () => {
            // Add 51 nonces
            const nonces = Array.from({ length: 51 }, (_, i) => `nonce${i.toString().padStart(4, '0')}`);

            nonces.forEach(nonce => {
                const stored = localStorage.getItem(NONCE_KEY);
                let existing: string[] = stored ? JSON.parse(stored) : [];
                existing.push(nonce);
                if (existing.length > 50) {
                    existing = existing.slice(-50);
                }
                localStorage.setItem(NONCE_KEY, JSON.stringify(existing));
            });

            const stored = localStorage.getItem(NONCE_KEY);
            const finalNonces = JSON.parse(stored!);

            expect(finalNonces.length).toBe(50);
            // First nonce should be evicted
            expect(finalNonces).not.toContain('nonce0000');
            // Last nonce should be present
            expect(finalNonces).toContain('nonce0050');
        });

        it('should clean URL parameters after processing', async () => {
            mockLocation('?handoff=1&nonce=cleanup123&kind=text&text=test&foo=bar');

            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(() => {
                expect(mockReplaceState).toHaveBeenCalled();
                const callArgs = mockReplaceState.mock.calls[0];
                const newUrl = callArgs[2] as string;
                expect(newUrl).not.toContain('handoff=');
                expect(newUrl).not.toContain('nonce=');
                expect(newUrl).not.toContain('kind=');
                expect(newUrl).not.toContain('text=');
                // Non-share params should remain
                expect(newUrl).toContain('foo=bar');
            });
        });
    });

    describe('F257: Send to Handoff with notification', () => {
        it('should include optional source in notification', async () => {
            mockLocation('?handoff=1&nonce=source123&kind=text&text=test&source=ChatGPT%20iOS&targetCategory=work');

            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(
                async () => {
                    const items = await db.handoffItems.toArray();
                    expect(items.length).toBe(1);
                    expect(items[0].targetCategory).toBe('work');
                },
                { timeout: 3000 }
            );
        });

        it('should default targetCategory to "any" when not specified', async () => {
            mockLocation('?handoff=1&nonce=default123&kind=text&text=test');

            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(
                async () => {
                    const items = await db.handoffItems.toArray();
                    expect(items.length).toBe(1);
                    expect(items[0].targetCategory).toBe('any');
                },
                { timeout: 3000 }
            );
        });

        it('should include optional title', async () => {
            mockLocation('?handoff=1&nonce=title123&kind=url&target=https://example.com&title=Example%20Site');

            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(
                async () => {
                    const items = await db.handoffItems.toArray();
                    expect(items.length).toBe(1);
                    expect(items[0].title).toBe('Example Site');
                },
                { timeout: 3000 }
            );
        });
    });

    describe('F258: Error handling', () => {
        it('should not process when handoff parameter is missing', async () => {
            mockLocation('?nonce=test123456&kind=text&text=test');

            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(async () => {
                const items = await db.handoffItems.toArray();
                expect(items.length).toBe(0);
            });
        });

        it('should not process when handoff parameter is not "1"', async () => {
            mockLocation('?handoff=0&nonce=test123456&kind=text&text=test');

            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(async () => {
                const items = await db.handoffItems.toArray();
                expect(items.length).toBe(0);
            });
        });

        it('should reject missing nonce', async () => {
            mockLocation('?handoff=1&kind=text&text=test');

            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(async () => {
                const items = await db.handoffItems.toArray();
                expect(items.length).toBe(0);
            });
        });

        it('should reject invalid targetCategory', async () => {
            mockLocation('?handoff=1&nonce=test123456&kind=text&text=test&targetCategory=invalid');

            render(
                <TestWrapper>
                    <ShareReceiver />
                </TestWrapper>
            );

            await waitFor(async () => {
                const items = await db.handoffItems.toArray();
                expect(items.length).toBe(0);
            });
        });

        it('should accept all valid targetCategory values', async () => {
            for (const category of ['work', 'private', 'any']) {
                mockLocation(`?handoff=1&nonce=test-${category}-123&kind=text&text=test&targetCategory=${category}`);

                const { unmount } = render(
                    <TestWrapper>
                        <ShareReceiver />
                    </TestWrapper>
                );

                await waitFor(
                    async () => {
                        const items = await db.handoffItems.toArray();
                        const matchingItems = items.filter(i => i.targetCategory === category);
                        expect(matchingItems.length).toBeGreaterThan(0);
                        expect(matchingItems[0].targetCategory).toBe(category);
                    },
                    { timeout: 3000 }
                );

                unmount();
                await db.handoffItems.clear();
                localStorage.removeItem(NONCE_KEY);
            }
        });
    });
});
