import React from 'react';
import { useTranslation, useAppState, useFilePicker } from '../hooks';
import { AppContainer, SectionLabel, TextArea } from '../components/ui';
import { FilePickerModal } from '../components';
import { QRCodeCanvas } from 'qrcode.react';
import { saveFileToFolder } from '../utils/fileSystem';

interface QrGeneratorState {
    text: string;
    qrData: string | null;
    history: { text: string; timestamp: number }[];
}

export const QrGenerator = () => {
    const { t } = useTranslation('qrGenerator');
    const [state, setState] = useAppState<QrGeneratorState>('qrGenerator', {
        text: '',
        qrData: null,
        history: [],
    });
    const { text, qrData, history } = state;
    const filePicker = useFilePicker();

    const generateQR = (data: string) => {
        if (!data.trim()) {
            void setState(prev => ({ ...prev, qrData: null }));
            return;
        }

        // Add to history, limit to last 20 items
        const newHistory = [{ text: data, timestamp: Date.now() }, ...history]
            .filter((item, index, self) => self.findIndex(i => i.text === item.text) === index)
            .slice(0, 20);

        void setState(prev => ({ ...prev, qrData: data, history: newHistory }));
    };

    const handleGenerate = () => {
        generateQR(text);
    };

    const saveQRToFile = async () => {
        if (!qrData) return;
        const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement | null;
        if (!canvas) return;

        const dataURL = canvas.toDataURL('image/png');
        const file = await filePicker.save({
            title: 'Save QR Code',
            content: dataURL,
            defaultFileName: 'qrcode.png',
            defaultExtension: '.png',
            initialPath: ['root', 'pictures'],
        });
        if (file) {
            await saveFileToFolder(file.path, { name: file.name, type: 'file', content: file.content ?? '' });
        }
    };

    return (
        <AppContainer>
            <div className="bg-black/20 p-4 rounded-lg space-y-3">
                <SectionLabel>{t('inputText')}</SectionLabel>
                <TextArea
                    value={text}
                    onChange={e => void setState(prev => ({ ...prev, text: e.target.value }))}
                    placeholder={t('inputPlaceholder')}
                    className="bg-black/30"
                    rows={3}
                />
                <button
                    onClick={handleGenerate}
                    disabled={!text.trim()}
                    className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-400 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {t('title')}
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
                                onClick={saveQRToFile}
                                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-400 transition-colors text-sm flex items-center gap-1 mx-auto"
                            >
                                <span className="material-symbols-outlined text-[16px]">save</span>
                                Save to Pictures
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center text-white/40">
                        <div className="w-32 h-32 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center mb-4">
                            <span className="text-4xl">📱</span>
                        </div>
                        <p>{t('inputText')}</p>
                        <p className="text-sm mt-1">{t('title')}</p>
                    </div>
                )}
            </div>

            <div className="text-white/40 text-xs text-center">
                Note: This generates a QR code using `qrcode.react` (library handles standards and error-correction).
            </div>

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
