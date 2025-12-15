import React, { useState, useMemo } from 'react';
import { Button, TextArea, StatCard } from '../components/ui';
import { formatReadingTime } from '../utils/timeFormatters';

export const WordCounter = () => {
    const [text, setText] = useState('');

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
            <div className="grid grid-cols-4 gap-3 p-4 bg-[#2d2d2d] border-b border-white/10">
                <StatCard
                    label="Characters"
                    value={stats.characters}
                    subtitle={`${stats.charactersNoSpaces} without spaces`}
                />
                <StatCard label="Words" value={stats.words} />
                <StatCard label="Sentences" value={stats.sentences} />
                <StatCard label="Paragraphs" value={stats.paragraphs} />
            </div>

            <div className="flex gap-4 px-4 py-3 bg-black/20 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">📖 Reading time:</span>
                    <span className="text-white font-medium">{stats.readingTime}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">🎤 Speaking time:</span>
                    <span className="text-white font-medium">{stats.speakingTime}</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 p-4">
                <TextArea
                    className="flex-1 leading-relaxed"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Start typing or paste your text here..."
                    spellCheck={false}
                />
            </div>

            <div className="px-4 py-2 bg-[#2d2d2d] text-xs text-gray-400 flex justify-between">
                <span>Tip: Paste or type your text above to see real-time statistics</span>
                <Button onClick={() => setText('')} variant="danger" size="sm">
                    Clear
                </Button>
            </div>
        </div>
    );
};
