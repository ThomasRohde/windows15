/**
 * Arcade App (F096, F097, F098, F099, F100, F104)
 *
 * Fantasy console game library with WASM-4 runtime.
 *
 * Features:
 * - Game library view with installed cartridges
 * - WASM-4 runtime for running .wasm games
 * - Import custom cartridges
 * - Save/load game state with multiple slots (F098)
 * - Keyboard and gamepad support
 * - Fullscreen mode with integer scaling
 * - Panic button for hung games
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDb } from '../../context/DbContext';
import type { ArcadeGameRecord, ArcadeSaveRecord } from '../../utils/storage/db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    Wasm4Runtime,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    BUTTON_1,
    BUTTON_2,
    BUTTON_UP,
    BUTTON_DOWN,
    BUTTON_LEFT,
    BUTTON_RIGHT,
} from './Wasm4Runtime';
import type { Wasm4State } from './Wasm4Runtime';

/**
 * View modes for the arcade app
 */
type ViewMode = 'library' | 'player';

/**
 * Demo cart data (built-in demo for testing)
 */
const DEMO_CART_ID = '__demo_cart__';

/**
 * Number of save slots per game
 */
const SAVE_SLOT_COUNT = 3;

/**
 * Save slot info for UI display
 */
interface SaveSlotInfo {
    slot: number;
    timestamp: number | null;
    isEmpty: boolean;
}

/**
 * Arcade App Component
 */
export const Arcade: React.FC = () => {
    const db = useDb();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const runtimeRef = useRef<Wasm4Runtime | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [viewMode, setViewMode] = useState<ViewMode>('library');
    const [selectedGame, setSelectedGame] = useState<ArcadeGameRecord | null>(null);
    const [runtimeState, setRuntimeState] = useState<Wasm4State | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [scale, setScale] = useState(3);
    const [isImporting, setIsImporting] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveSlots, setSaveSlots] = useState<SaveSlotInfo[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Load games from database
    const games = useLiveQuery(async () => {
        if (!db) return [];
        return db.$arcadeGames.orderBy('lastPlayedAt').reverse().toArray();
    }, [db]);

    // Load save slots for current game
    const loadSaveSlots = useCallback(async () => {
        if (!db || !selectedGame) return;

        try {
            const saves = await db.$arcadeSaves.where('gameId').equals(selectedGame.id).toArray();

            const slots: SaveSlotInfo[] = [];
            for (let i = 1; i <= SAVE_SLOT_COUNT; i++) {
                const save = saves.find(s => s.slot === i);
                slots.push({
                    slot: i,
                    timestamp: save?.updatedAt ?? null,
                    isEmpty: !save,
                });
            }
            setSaveSlots(slots);
        } catch (error) {
            console.error('[Arcade] Failed to load save slots:', error);
        }
    }, [db, selectedGame]);

    // Load save slots when game changes
    useEffect(() => {
        if (selectedGame) {
            void loadSaveSlots();
        }
    }, [selectedGame, loadSaveSlots]);

    // Initialize runtime when entering player mode
    useEffect(() => {
        if (viewMode === 'player' && canvasRef.current && !runtimeRef.current) {
            const runtime = new Wasm4Runtime();
            runtime.init(canvasRef.current, {
                onStateChange: setRuntimeState,
                onError: error => {
                    console.error('[Arcade] Runtime error:', error);
                },
            });
            runtimeRef.current = runtime;
        }

        return () => {
            if (runtimeRef.current) {
                runtimeRef.current.dispose();
                runtimeRef.current = null;
            }
        };
    }, [viewMode]);

    // Handle fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement !== null);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Calculate integer scale for fullscreen
    useEffect(() => {
        if (isFullscreen && containerRef.current) {
            const containerWidth = window.innerWidth;
            const containerHeight = window.innerHeight;
            const scaleX = Math.floor(containerWidth / SCREEN_WIDTH);
            const scaleY = Math.floor(containerHeight / SCREEN_HEIGHT);
            setScale(Math.min(scaleX, scaleY, 8));
        } else {
            setScale(3);
        }
    }, [isFullscreen]);

    /**
     * Start playing a game
     */
    const playGame = useCallback(
        async (game: ArcadeGameRecord) => {
            setSelectedGame(game);
            setViewMode('player');

            // Update last played timestamp
            if (db && game.id !== DEMO_CART_ID) {
                try {
                    await db.$arcadeGames.update(game.id, {
                        lastPlayedAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                } catch {
                    // Ignore update errors
                }
            }

            // Load cartridge after canvas is ready
            setTimeout(async () => {
                if (runtimeRef.current && game.cartridgeBlob) {
                    try {
                        const arrayBuffer = await game.cartridgeBlob.arrayBuffer();
                        await runtimeRef.current.loadCartridge(arrayBuffer);
                    } catch (error) {
                        console.error('[Arcade] Failed to load cartridge:', error);
                    }
                }
            }, 100);
        },
        [db]
    );

    /**
     * Stop the current game and return to library
     */
    const stopGame = useCallback(() => {
        if (runtimeRef.current) {
            runtimeRef.current.stop();
        }
        setViewMode('library');
        setSelectedGame(null);
        setRuntimeState(null);
    }, []);

    /**
     * Pause/resume the game
     */
    const togglePause = useCallback(() => {
        if (!runtimeRef.current || !runtimeState) return;

        if (runtimeState.isPaused) {
            runtimeRef.current.resume();
        } else {
            runtimeRef.current.pause();
        }
    }, [runtimeState]);

    /**
     * Reset the game
     */
    const resetGame = useCallback(async () => {
        if (!runtimeRef.current || !selectedGame) return;

        try {
            const arrayBuffer = await selectedGame.cartridgeBlob.arrayBuffer();
            await runtimeRef.current.reset(arrayBuffer);
        } catch (error) {
            console.error('[Arcade] Failed to reset game:', error);
        }
    }, [selectedGame]);

    /**
     * Toggle fullscreen mode (F100)
     */
    const toggleFullscreen = useCallback(async () => {
        if (!containerRef.current) return;

        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await containerRef.current.requestFullscreen();
            }
        } catch (error) {
            console.error('[Arcade] Fullscreen error:', error);
        }
    }, []);

    /**
     * Panic button - force stop (F104)
     */
    const panicStop = useCallback(() => {
        console.warn('[Arcade] Panic stop triggered');
        if (runtimeRef.current) {
            runtimeRef.current.dispose();
            runtimeRef.current = null;
        }
        setViewMode('library');
        setSelectedGame(null);
        setRuntimeState(null);
    }, []);

    /**
     * Save game state to a slot (F098)
     */
    const saveGame = useCallback(
        async (slot: number) => {
            if (!db || !selectedGame || !runtimeRef.current) return;

            setIsSaving(true);
            try {
                const stateBlob = runtimeRef.current.exportState();
                if (!stateBlob) {
                    throw new Error('Failed to export game state');
                }

                const now = Date.now();
                const meta = JSON.stringify({
                    savedAt: now,
                    frameCount: runtimeState?.frameCount ?? 0,
                });

                // Check if save exists
                const existing = await db.$arcadeSaves
                    .where(['gameId', 'slot'])
                    .equals([selectedGame.id, slot])
                    .first();

                if (existing && existing.id !== undefined) {
                    // Update existing save
                    await db.$arcadeSaves.update(existing.id, {
                        dataBlob: stateBlob,
                        meta,
                        updatedAt: now,
                    });
                } else {
                    // Create new save
                    const saveRecord: ArcadeSaveRecord = {
                        gameId: selectedGame.id,
                        slot,
                        dataBlob: stateBlob,
                        meta,
                        createdAt: now,
                        updatedAt: now,
                    };
                    await db.$arcadeSaves.add(saveRecord);
                }

                // Reload save slots
                await loadSaveSlots();
                console.log(`[Arcade] Saved to slot ${slot}`);
            } catch (error) {
                console.error('[Arcade] Save failed:', error);
                alert(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
                setIsSaving(false);
                setShowSaveModal(false);
            }
        },
        [db, selectedGame, runtimeState, loadSaveSlots]
    );

    /**
     * Load game state from a slot (F098)
     */
    const loadGame = useCallback(
        async (slot: number) => {
            if (!db || !selectedGame || !runtimeRef.current) return;

            try {
                const save = await db.$arcadeSaves.where(['gameId', 'slot']).equals([selectedGame.id, slot]).first();

                if (!save) {
                    alert('No save in this slot');
                    return;
                }

                const success = await runtimeRef.current.importState(save.dataBlob);
                if (!success) {
                    throw new Error('Failed to restore game state');
                }

                console.log(`[Arcade] Loaded from slot ${slot}`);
                setShowSaveModal(false);
            } catch (error) {
                console.error('[Arcade] Load failed:', error);
                alert(`Load failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        },
        [db, selectedGame]
    );

    /**
     * Import a cartridge file (F097)
     */
    const importCartridge = useCallback(async () => {
        if (!db) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.wasm';

        input.onchange = async e => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            setIsImporting(true);
            try {
                // Validate WASM magic bytes
                const buffer = await file.arrayBuffer();
                const magic = new Uint8Array(buffer.slice(0, 4));
                if (magic[0] !== 0x00 || magic[1] !== 0x61 || magic[2] !== 0x73 || magic[3] !== 0x6d) {
                    throw new Error('Invalid WASM file');
                }

                // Create game record
                const id = `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                const title = file.name.replace(/\.wasm$/i, '');
                const now = Date.now();

                const gameRecord: ArcadeGameRecord = {
                    id,
                    title,
                    type: 'wasm4',
                    cartridgeBlob: new Blob([buffer], { type: 'application/wasm' }),
                    tags: ['imported'],
                    createdAt: now,
                    updatedAt: now,
                };

                await db.$arcadeGames.add(gameRecord);
                console.log('[Arcade] Imported cartridge:', title);
            } catch (error) {
                console.error('[Arcade] Import failed:', error);
                alert(`Failed to import cartridge: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
                setIsImporting(false);
            }
        };

        input.click();
    }, [db]);

    /**
     * Delete a game from the library
     */
    const deleteGame = useCallback(
        async (gameId: string) => {
            if (!db || gameId === DEMO_CART_ID) return;

            if (confirm('Delete this game from your library?')) {
                try {
                    await db.$arcadeGames.delete(gameId);
                } catch (error) {
                    console.error('[Arcade] Delete failed:', error);
                }
            }
        },
        [db]
    );

    /**
     * Render virtual gamepad button
     */
    const VirtualButton: React.FC<{
        button: number;
        label: string;
        className?: string;
    }> = ({ button, label, className = '' }) => (
        <button
            className={`w-12 h-12 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-lg flex items-center justify-center text-white font-bold select-none ${className}`}
            onPointerDown={() => runtimeRef.current?.setGamepadButton(0, button, true)}
            onPointerUp={() => runtimeRef.current?.setGamepadButton(0, button, false)}
            onPointerLeave={() => runtimeRef.current?.setGamepadButton(0, button, false)}
        >
            {label}
        </button>
    );

    // Library View
    if (viewMode === 'library') {
        return (
            <div className="h-full bg-gray-900 text-white flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <span className="material-icons text-purple-400">sports_esports</span>
                        <h1 className="text-xl font-bold">Arcade</h1>
                    </div>
                    <button
                        onClick={importCartridge}
                        disabled={isImporting}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg disabled:opacity-50"
                    >
                        <span className="material-icons text-sm">add</span>
                        {isImporting ? 'Importing...' : 'Import Game'}
                    </button>
                </div>

                {/* Game Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {!games || games.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <span className="material-icons text-6xl mb-4">videogame_asset_off</span>
                            <p className="text-lg mb-2">No games installed</p>
                            <p className="text-sm">Import a WASM-4 cartridge (.wasm) to get started</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {games.map(game => (
                                <div
                                    key={game.id}
                                    className="group relative bg-gray-800 rounded-lg overflow-hidden hover:ring-2 ring-purple-500 cursor-pointer transition-all"
                                    onClick={() => playGame(game)}
                                >
                                    {/* Game Icon/Preview */}
                                    <div className="aspect-square bg-gray-700 flex items-center justify-center">
                                        <span className="material-icons text-4xl text-gray-500">sports_esports</span>
                                    </div>

                                    {/* Game Info */}
                                    <div className="p-2">
                                        <p className="font-medium truncate text-sm">{game.title}</p>
                                        {game.lastPlayedAt && (
                                            <p className="text-xs text-gray-400">
                                                Last played: {new Date(game.lastPlayedAt).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>

                                    {/* Delete Button */}
                                    {game.id !== DEMO_CART_ID && (
                                        <button
                                            onClick={e => {
                                                e.stopPropagation();
                                                deleteGame(game.id);
                                            }}
                                            className="absolute top-2 right-2 p-1 bg-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <span className="material-icons text-sm">delete</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Help Footer */}
                <div className="p-4 border-t border-gray-700 text-sm text-gray-400">
                    <p>
                        WASM-4 is a fantasy console. Get games at{' '}
                        <a
                            href="https://wasm4.org/play"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:underline"
                        >
                            wasm4.org/play
                        </a>
                    </p>
                </div>
            </div>
        );
    }

    // Player View
    return (
        <div
            ref={containerRef}
            className={`h-full bg-black flex flex-col items-center justify-center ${isFullscreen ? 'p-0' : 'p-4'}`}
        >
            {/* Controls Bar */}
            {!isFullscreen && (
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={stopGame}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
                    >
                        <span className="material-icons text-sm">arrow_back</span>
                        Library
                    </button>

                    <span className="text-white font-medium">{selectedGame?.title}</span>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={togglePause}
                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                            title={runtimeState?.isPaused ? 'Resume' : 'Pause'}
                        >
                            <span className="material-icons text-sm">
                                {runtimeState?.isPaused ? 'play_arrow' : 'pause'}
                            </span>
                        </button>

                        <button
                            onClick={resetGame}
                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                            title="Reset"
                        >
                            <span className="material-icons text-sm">refresh</span>
                        </button>

                        <button
                            onClick={toggleFullscreen}
                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                            title="Fullscreen"
                        >
                            <span className="material-icons text-sm">fullscreen</span>
                        </button>

                        <button
                            onClick={panicStop}
                            className="p-2 bg-red-700 hover:bg-red-600 rounded text-white"
                            title="Panic Stop (Escape hung game)"
                        >
                            <span className="material-icons text-sm">emergency</span>
                        </button>

                        {/* Save/Load (F098) */}
                        <div className="h-6 border-l border-gray-600 mx-1" />
                        <button
                            onClick={() => setShowSaveModal(true)}
                            className="p-2 bg-blue-700 hover:bg-blue-600 rounded text-white"
                            title="Save/Load"
                            disabled={isSaving}
                        >
                            <span className="material-icons text-sm">save</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Save/Load Modal (F098) */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">Save / Load</h2>
                            <button onClick={() => setShowSaveModal(false)} className="p-1 hover:bg-gray-700 rounded">
                                <span className="material-icons text-gray-400">close</span>
                            </button>
                        </div>

                        <div className="space-y-3">
                            {Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => i + 1).map(slot => {
                                const slotInfo = saveSlots.find(s => s.slot === slot);
                                return (
                                    <div
                                        key={slot}
                                        className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                                    >
                                        <div className="flex-1">
                                            <p className="text-white font-medium">Slot {slot}</p>
                                            {slotInfo && slotInfo.timestamp ? (
                                                <p className="text-gray-400 text-sm">
                                                    {new Date(slotInfo.timestamp).toLocaleString()}
                                                </p>
                                            ) : (
                                                <p className="text-gray-500 text-sm italic">Empty</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => saveGame(slot)}
                                                disabled={isSaving}
                                                className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-white text-sm disabled:opacity-50"
                                            >
                                                {isSaving ? '...' : 'Save'}
                                            </button>
                                            <button
                                                onClick={() => loadGame(slot)}
                                                disabled={!slotInfo}
                                                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm disabled:opacity-50"
                                            >
                                                Load
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <p className="mt-4 text-gray-400 text-sm text-center">
                            Save states are stored locally per game
                        </p>
                    </div>
                </div>
            )}

            {/* Game Canvas */}
            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={SCREEN_WIDTH}
                    height={SCREEN_HEIGHT}
                    style={{
                        width: SCREEN_WIDTH * scale,
                        height: SCREEN_HEIGHT * scale,
                        imageRendering: 'pixelated',
                    }}
                    className="border-2 border-gray-700"
                />

                {/* Paused Overlay */}
                {runtimeState?.isPaused && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">PAUSED</span>
                    </div>
                )}

                {/* Error Overlay */}
                {runtimeState?.lastError && (
                    <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center p-4">
                        <span className="material-icons text-4xl text-white mb-2">error</span>
                        <span className="text-white text-center">{runtimeState.lastError}</span>
                    </div>
                )}
            </div>

            {/* Virtual Gamepad (Touch Controls) */}
            {!isFullscreen && (
                <div className="mt-4 flex items-center gap-8">
                    {/* D-Pad */}
                    <div className="grid grid-cols-3 gap-1">
                        <div />
                        <VirtualButton button={BUTTON_UP} label="▲" />
                        <div />
                        <VirtualButton button={BUTTON_LEFT} label="◀" />
                        <div className="w-12 h-12" />
                        <VirtualButton button={BUTTON_RIGHT} label="▶" />
                        <div />
                        <VirtualButton button={BUTTON_DOWN} label="▼" />
                        <div />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <VirtualButton button={BUTTON_2} label="Z" className="bg-blue-700 hover:bg-blue-600" />
                        <VirtualButton button={BUTTON_1} label="X" className="bg-red-700 hover:bg-red-600" />
                    </div>
                </div>
            )}

            {/* FPS Counter */}
            <div className="absolute bottom-2 right-2 text-gray-500 text-xs">{runtimeState?.fps ?? 0} FPS</div>

            {/* Fullscreen Exit Hint */}
            {isFullscreen && (
                <div className="absolute top-2 right-2 text-gray-500 text-xs opacity-50 hover:opacity-100">
                    Press ESC or click{' '}
                    <button onClick={toggleFullscreen} className="underline">
                        here
                    </button>{' '}
                    to exit fullscreen
                </div>
            )}

            {/* Controls Help */}
            {!isFullscreen && (
                <div className="mt-4 text-gray-500 text-xs text-center">
                    <p>Keyboard: Arrow keys / WASD to move, X/Space = Button 1, Z/C = Button 2</p>
                </div>
            )}
        </div>
    );
};

export default Arcade;
