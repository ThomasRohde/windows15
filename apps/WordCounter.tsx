import React, { useMemo } from 'react';
import { useTranslation, useAppState, useFilePicker, usePhoneMode } from '../hooks';
import { Button, TextArea, StatCard } from '../components/ui';
import { FilePickerModal } from '../components';
import { formatReadingTime } from '../utils/timeFormatters';

interface WordCounterState {
    text: string;
}

export const WordCounter = () => {
    const { t } = useTranslation('wordCounter');
    const isPhone = usePhoneMode();
    const [state, setState] = useAppState<WordCounterState>('wordCounter', {
        text: '',
    });
    const { text } = state;
    const filePicker = useFilePicker();

    const openFile = async () => {
        const file = await filePicker.open({
            title: 'Open Text File',
            extensions: ['.txt', '.md', '.csv', '.log'],
        });
        if (file?.content) {
            await setState(prev => ({ ...prev, text: file.content ?? '' }));
        }
    };

    const stats = useMemo(() => {
        const characters = text.length;
        const charactersNoSpaces = text.replace(/\s/g, '').length;

        const words = text.trim() ? text.trim().split(/\s+/).length : 0;

        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

        const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0).length;

        const readingTime = formatReadingTime(words, 200);
        const speakingTime = formatReadingTime(words, 150);

        return {
            characters,
            charactersNoSpaces,
            words,
            sentences,
            paragraphs,
            readingTime,
            speakingTime,
        };
    }, [text]);

    return (
        <div className="h-full flex flex-col bg-background-dark text-white">
            <div className="px-4 py-2 bg-black/20 border-b border-white/10 flex gap-2">
                <button
                    onClick={openFile}
                    className={`bg-white/10 hover:bg-white/20 active:bg-white/30 rounded text-sm transition-colors flex items-center gap-1 ${isPhone ? 'min-h-[44px] px-4' : 'px-3 py-1.5'}`}
                    title="Open text file"
                >
                    <span className="material-symbols-outlined text-[16px]">folder_open</span>
                    Open
                </button>
            </div>

            <div
                className={`grid gap-3 p-4 bg-[#2d2d2d] border-b border-white/10 ${isPhone ? 'grid-cols-2' : 'grid-cols-4'}`}
            >
                <StatCard label={t('characters')} value={stats.characters} subtitle={t('charactersNoSpaces')} />
                <StatCard label={t('words')} value={stats.words} />
                <StatCard label={t('sentences')} value={stats.sentences} />
                <StatCard label={t('paragraphs')} value={stats.paragraphs} />
            </div>

            <div
                className={`flex gap-4 px-4 py-3 bg-black/20 border-b border-white/10 ${isPhone ? 'flex-col gap-2' : ''}`}
            >
                <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">📖 {t('readingTime')}:</span>
                    <span className="text-white font-medium">{stats.readingTime}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">🎤 {t('speakingTime')}:</span>
                    <span className="text-white font-medium">{stats.speakingTime}</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 p-4">
                <TextArea
                    className="flex-1 leading-relaxed"
                    value={text}
                    onChange={e => void setState(prev => ({ ...prev, text: e.target.value }))}
                    placeholder={t('inputPlaceholder')}
                    spellCheck={false}
                />
            </div>

            <div className="px-4 py-2 bg-[#2d2d2d] text-xs text-gray-400 flex justify-between">
                <span>{t('inputPlaceholder')}</span>
                <Button onClick={() => void setState({ text: '' })} variant="danger" size="sm">
                    {t('clearText')}
                </Button>
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
        </div>
    );
};
