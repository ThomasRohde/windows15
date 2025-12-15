import React, { useState, useCallback } from 'react';
import { useCopyToClipboard, usePersistedState } from '../hooks';
import { AppContainer, Slider } from '../components/ui';

interface SavedColor {
    hex: string;
    id: number;
}

export const ColorPicker = () => {
    const [hue, setHue] = useState(200);
    const [saturation, setSaturation] = useState(70);
    const [lightness, setLightness] = useState(50);
    const { value: savedColors, setValue: setSavedColors } = usePersistedState<SavedColor[]>('colorpicker.saved', []);
    const { copy, isCopied } = useCopyToClipboard(1500);

    const hslToRgb = useCallback((h: number, s: number, l: number) => {
        s /= 100;
        l /= 100;
        const a = s * Math.min(l, 1 - l);
        const f = (n: number) => {
            const k = (n + h / 30) % 12;
            return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        };
        return {
            r: Math.round(f(0) * 255),
            g: Math.round(f(8) * 255),
            b: Math.round(f(4) * 255),
        };
    }, []);

    const rgbToHex = useCallback((r: number, g: number, b: number) => {
        return (
            '#' +
            [r, g, b]
                .map(x => x.toString(16).padStart(2, '0'))
                .join('')
                .toUpperCase()
        );
    }, []);

    const rgb = hslToRgb(hue, saturation, lightness);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    const hslString = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    const rgbString = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

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

        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        let h = 0,
            s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            const rNorm = r / 255,
                gNorm = g / 255,
                bNorm = b / 255;
            if (max === rNorm) h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) * 60;
            else if (max === gNorm) h = ((bNorm - rNorm) / d + 2) * 60;
            else h = ((rNorm - gNorm) / d + 4) * 60;
        }

        setHue(Math.round(h));
        setSaturation(Math.round(s * 100));
        setLightness(Math.round(l * 100));
    };

    const ColorValue = ({ label, value, format }: { label: string; value: string; format: string }) => (
        <div className="flex items-center justify-between bg-black/30 p-3 rounded-lg">
            <div>
                <div className="text-white/50 text-xs">{label}</div>
                <div className="text-white font-mono">{value}</div>
            </div>
            <button
                onClick={() => copy(value, format)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                    isCopied(format) ? 'bg-green-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
            >
                {isCopied(format) ? 'Copied!' : 'Copy'}
            </button>
        </div>
    );

    return (
        <AppContainer scrollable>
            <div
                className="h-32 rounded-xl shadow-inner flex items-center justify-center"
                style={{ backgroundColor: hex }}
            >
                <button
                    onClick={saveColor}
                    className="bg-black/30 backdrop-blur px-4 py-2 rounded-lg text-white hover:bg-black/40 transition-colors"
                >
                    Save Color
                </button>
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
                    <div className="text-white/70 text-sm mb-2">Saved Colors</div>
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
