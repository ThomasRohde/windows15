import React, { useState } from 'react';
import { usePersistedState, useStandardHotkeys, useCopyToClipboard } from '../hooks';
import { AppContainer, Slider, Button, SectionLabel, CopyButton } from '../components/ui';
import { hslToRgb, rgbToHex, rgbToHsl } from '../utils/color';

interface SavedColor {
    hex: string;
    id: number;
}

export const ColorPicker = () => {
    const [hue, setHue] = useState(200);
    const [saturation, setSaturation] = useState(70);
    const [lightness, setLightness] = useState(50);
    const { value: savedColors, setValue: setSavedColors } = usePersistedState<SavedColor[]>('colorpicker.saved', []);

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
                    Save Color
                </Button>
            </div>

            <div className="bg-black/20 p-4 rounded-lg space-y-4">
                <Slider
                    label="Hue"
                    value={hue}
                    min={0}
                    max={360}
                    onChange={setHue}
                    gradient="linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"
                />
                <Slider
                    label="Saturation"
                    value={saturation}
                    min={0}
                    max={100}
                    onChange={setSaturation}
                    gradient={`linear-gradient(to right, hsl(${hue}, 0%, ${lightness}%), hsl(${hue}, 100%, ${lightness}%))`}
                />
                <Slider
                    label="Lightness"
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
                    <SectionLabel>Saved Colors</SectionLabel>
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
        </AppContainer>
    );
};
