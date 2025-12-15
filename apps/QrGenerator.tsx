import React, { useState, useRef, useCallback } from 'react';

export const QrGenerator = () => {
    const [text, setText] = useState('');
    const [qrData, setQrData] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const generateQR = useCallback((data: string) => {
        if (!data.trim()) {
            setQrData(null);
            return;
        }

        const qrMatrix = createQRMatrix(data);
        setQrData(data);
        drawQR(qrMatrix);
    }, []);

    const createQRMatrix = (data: string): boolean[][] => {
        const size = Math.max(21, Math.min(41, 21 + Math.floor(data.length / 10) * 4));
        const matrix: boolean[][] = Array(size)
            .fill(null)
            .map(() => Array(size).fill(false));

        const addFinderPattern = (startX: number, startY: number) => {
            for (let y = 0; y < 7; y++) {
                for (let x = 0; x < 7; x++) {
                    const isOuter = y === 0 || y === 6 || x === 0 || x === 6;
                    const isInner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
                    if (startX + x < size && startY + y < size) {
                        const row = matrix[startY + y];
                        if (row) row[startX + x] = isOuter || isInner;
                    }
                }
            }
        };

        addFinderPattern(0, 0);
        addFinderPattern(size - 7, 0);
        addFinderPattern(0, size - 7);

        for (let i = 8; i < size - 8; i++) {
            const row6 = matrix[6];
            const rowI = matrix[i];
            if (row6) row6[i] = i % 2 === 0;
            if (rowI) rowI[6] = i % 2 === 0;
        }

        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
        }

        for (let y = 9; y < size - 9; y++) {
            for (let x = 9; x < size - 9; x++) {
                const row = matrix[y];
                if (!row || row[x]) continue;
                const seed = (hash + x * 31 + y * 17) & 0xffffffff;
                row[x] = ((seed * 1103515245 + 12345) & 0x7fffffff) % 3 !== 0;
            }
        }

        return matrix;
    };

    const drawQR = (matrix: boolean[][]) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = matrix.length;
        const cellSize = Math.floor(200 / size);
        const totalSize = cellSize * size;

        canvas.width = totalSize;
        canvas.height = totalSize;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, totalSize, totalSize);

        ctx.fillStyle = '#000000';
        for (let y = 0; y < size; y++) {
            const row = matrix[y];
            if (!row) continue;
            for (let x = 0; x < size; x++) {
                if (row[x]) {
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }
    };

    const handleGenerate = () => {
        generateQR(text);
    };

    const downloadQR = () => {
        const canvas = canvasRef.current;
        if (!canvas || !qrData) return;

        const link = document.createElement('a');
        link.download = 'qrcode.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="h-full bg-background-dark p-4 flex flex-col gap-4">
            <div className="bg-black/20 p-4 rounded-lg space-y-3">
                <label className="text-white/70 text-sm">Enter text or URL</label>
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="https://example.com or any text..."
                    className="w-full bg-black/30 text-white px-4 py-3 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 resize-none h-24"
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
                            <canvas ref={canvasRef} className="block" />
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
                Note: This generates a visual QR-like pattern. For production use, consider a proper QR library.
            </div>
        </div>
    );
};
