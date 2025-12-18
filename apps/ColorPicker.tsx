import React, { useState } from 'react';
import { usePersistedState, useStandardHotkeys, useCopyToClipboard, useFilePicker } from '../hooks';
import { AppContainer, Slider, Button, SectionLabel, CopyButton } from '../components/ui';
import { FilePickerModal } from '../components';
import { hslToRgb, rgbToHex, rgbToHsl } from '../utils/color';
import { useTranslation } from '../hooks/useTranslation';
import { saveFileToFolder } from '../utils/fileSystem';

interface SavedColor {
    hex: string;
    id: number;
}

export const ColorPicker = () => {
    const { t } = useTranslation('colorPicker');
    const [hue, setHue] = useState(200);
    const [saturation, setSaturation] = useState(70);
    const [lightness, setLightness] = useState(50);
    const { value: savedColors, setValue: setSavedColors } = usePersistedState<SavedColor[]>('colorpicker.saved', []);
    const filePicker = useFilePicker();

    const rgb = hslToRgb(hue, saturation, lightness);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    const hslString = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    const rgbString = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    const { copy } = useCopyToClipboard();

    // Keyboard shortcuts (F140)
    useStandardHotkeys({
        onCopy: () => void copy(hex),
    });

    const saveColor = () => {
        if (!savedColors.find(c => c.hex === hex)) {
            setSavedColors([...savedColors, { hex, id: Date.now() }]);
        }
    };

    const removeColor = (id: number) => {
        setSavedColors(savedColors.filter(c => c.id !== id));
    };

    const loadColor = (savedHex: string) => {
        const r = parseInt(savedHex.slice(1, 3), 16);
        const g = parseInt(savedHex.slice(3, 5), 16);
        const b = parseInt(savedHex.slice(5, 7), 16);

        const hsl = rgbToHsl(r, g, b);
        setHue(hsl.h);
        setSaturation(hsl.s);
        setLightness(hsl.l);
    };

    const exportPalette = async () => {
        if (savedColors.length === 0) return;
        const file = await filePicker.save({
            title: 'Export Color Palette',
            content: JSON.stringify(savedColors, null, 2),
            defaultFileName: 'palette.json',
            defaultExtension: '.json',
        });
        if (file) {
            await saveFileToFolder(file.path, { name: file.name, type: 'file', content: file.content ?? '' });
        }
    };

    const importPalette = async () => {
        const file = await filePicker.open({
            title: 'Import Color Palette',
            extensions: ['.json'],
        });
        if (file?.content) {
            try {
                const imported = JSON.parse(file.content) as SavedColor[];
                if (Array.isArray(imported)) {
                    setSavedColors(imported);
                }
            } catch (error) {
                console.error('Failed to import palette:', error);
            }
        }
    };

    const ColorValue = ({ label, value, format }: { label: string; value: string; format: string }) => (
        <div className="flex items-center justify-between bg-black/30 p-3 rounded-lg">
            <div>
                <div className="text-white/50 text-xs">{label}</div>
                <div className="text-white font-mono">{value}</div>
            </div>
            <CopyButton value={value} label={format} size="sm" className="!text-xs !px-2 !py-1" />
        </div>
    );

    return (
        <AppContainer scrollable>
            <div
                className="h-32 rounded-xl shadow-inner flex items-center justify-center"
                style={{ backgroundColor: hex }}
            >
                <Button onClick={saveColor} variant="ghost" className="bg-black/30 backdrop-blur hover:bg-black/40">
                    {t('common:actions.save')}
                </Button>
            </div>

            <div className="bg-black/20 p-4 rounded-lg space-y-4">
                <Slider
                    label={t('hue')}
                    value={hue}
                    min={0}
                    max={360}
                    onChange={setHue}
                    gradient="linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"
                />
                <Slider
                    label={t('saturation')}
                    value={saturation}
                    min={0}
                    max={100}
                    onChange={setSaturation}
                    gradient={`linear-gradient(to right, hsl(${hue}, 0%, ${lightness}%), hsl(${hue}, 100%, ${lightness}%))`}
                />
                <Slider
                    label={t('lightness')}
                    value={lightness}
                    min={0}
                    max={100}
                    onChange={setLightness}
                    gradient={`linear-gradient(to right, hsl(${hue}, ${saturation}%, 0%), hsl(${hue}, ${saturation}%, 50%), hsl(${hue}, ${saturation}%, 100%))`}
                />
            </div>

            <div className="space-y-2">
                <ColorValue label="HEX" value={hex} format="hex" />
                <ColorValue label="RGB" value={rgbString} format="rgb" />
                <ColorValue label="HSL" value={hslString} format="hsl" />
            </div>

            {savedColors.length > 0 && (
                <div className="bg-black/20 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                        <SectionLabel className="mb-0">{t('recentColors')}</SectionLabel>
                        <div className="flex gap-2">
                            <button
                                onClick={importPalette}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors flex items-center gap-1"
                                title="Import palette"
                            >
                                <span className="material-symbols-outlined text-[14px]">folder_open</span>
                                Import
                            </button>
                            <button
                                onClick={exportPalette}
                                className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors flex items-center gap-1"
                                title="Export palette"
                            >
                                <span className="material-symbols-outlined text-[14px]">save</span>
                                Export
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {savedColors.map(color => (
                            <div
                                key={color.id}
                                className="w-10 h-10 rounded-lg cursor-pointer relative group shadow-md"
                                style={{ backgroundColor: color.hex }}
                                onClick={() => loadColor(color.hex)}
                            >
                                <button
                                    onClick={e => {
                                        e.stopPropagation();
                                        removeColor(color.id);
                                    }}
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {savedColors.length === 0 && (
                <div className="bg-black/20 p-4 rounded-lg text-center">
                    <p className="text-white/50 text-sm mb-2">No saved colors</p>
                    <button
                        onClick={importPalette}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors flex items-center gap-1 mx-auto"
                        title="Import palette"
                    >
                        <span className="material-symbols-outlined text-[16px]">folder_open</span>
                        Import Palette
                    </button>
                </div>
            )}

            {filePicker.state.isOpen && (
                <FilePickerModal
                    state={filePicker.state}
                    onNavigateTo={filePicker.navigateTo}
                    onSelectFile={filePicker.selectFile}
                    onSetFileName={filePicker.setFileName}
                    onConfirm={filePicker.confirm}
                    onCancel={filePicker.cancel}
                />
            )}
        </AppContainer>
    );
};
