import React, { useState } from 'react';
import { AppContainer, SectionLabel, TextArea } from '../components/ui';
import { QRCodeCanvas } from 'qrcode.react';

export const QrGenerator = () => {
    const [text, setText] = useState('');
    const [qrData, setQrData] = useState<string | null>(null);

    const generateQR = (data: string) => {
        if (!data.trim()) {
            setQrData(null);
            return;
        }

        setQrData(data);
    };

    const handleGenerate = () => {
        generateQR(text);
    };

    const downloadQR = () => {
        if (!qrData) return;
        const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement | null;
        if (!canvas) return;

        const link = document.createElement('a');
        link.download = 'qrcode.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    return (
        <AppContainer>
            <div className="bg-black/20 p-4 rounded-lg space-y-3">
                <SectionLabel>Enter text or URL</SectionLabel>
                <TextArea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="https://example.com or any text..."
                    className="bg-black/30"
                    rows={3}
                />
                <button
                    onClick={handleGenerate}
                    disabled={!text.trim()}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-400 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Generate QR Code
                </button>
            </div>

            <div className="flex-1 bg-black/20 rounded-lg flex flex-col items-center justify-center p-4">
                {qrData ? (
                    <>
                        <div className="bg-white p-4 rounded-lg shadow-lg">
                            <QRCodeCanvas
                                id="qr-canvas"
                                value={qrData}
                                size={256}
                                bgColor="#FFFFFF"
                                fgColor="#000000"
                                includeMargin={true}
                                className="block"
                            />
                        </div>
                        <div className="mt-4 text-center">
                            <p className="text-white/50 text-sm mb-3 max-w-[200px] truncate">{qrData}</p>
                            <button
                                onClick={downloadQR}
                                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-400 transition-colors text-sm"
                            >
                                Download PNG
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center text-white/40">
                        <div className="w-32 h-32 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center mb-4">
                            <span className="text-4xl">📱</span>
                        </div>
                        <p>Enter text and click Generate</p>
                        <p className="text-sm mt-1">to create a QR code</p>
                    </div>
                )}
            </div>

            <div className="text-white/40 text-xs text-center">
                Note: This generates a QR code using `qrcode.react` (library handles standards and error-correction).
            </div>
        </AppContainer>
    );
};
