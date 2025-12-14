import React, { useState, useMemo } from 'react';

export const WordCounter = () => {
    const [text, setText] = useState('');

    const stats = useMemo(() => {
        const characters = text.length;
        const charactersNoSpaces = text.replace(/\s/g, '').length;

        const words = text.trim() ? text.trim().split(/\s+/).length : 0;

        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

        const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0).length;

        const avgReadingSpeed = 200;
        const readingTimeMinutes = words / avgReadingSpeed;
        const readingTime =
            readingTimeMinutes < 1
                ? `${Math.ceil(readingTimeMinutes * 60)} sec`
                : `${Math.ceil(readingTimeMinutes)} min`;

        const avgSpeakingSpeed = 150;
        const speakingTimeMinutes = words / avgSpeakingSpeed;
        const speakingTime =
            speakingTimeMinutes < 1
                ? `${Math.ceil(speakingTimeMinutes * 60)} sec`
                : `${Math.ceil(speakingTimeMinutes)} min`;

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

    const StatCard = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
        <div className="bg-black/20 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-white mb-1">{value}</div>
            <div className="text-sm text-gray-400">{label}</div>
            {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-white">
            <div className="grid grid-cols-4 gap-3 p-4 bg-[#2d2d2d] border-b border-white/10">
                <StatCard
                    label="Characters"
                    value={stats.characters}
                    sub={`${stats.charactersNoSpaces} without spaces`}
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
                <textarea
                    className="flex-1 bg-black/20 rounded-lg resize-none border border-white/10 p-4 focus:outline-none focus:border-blue-500/50 font-sans text-sm text-white/90 leading-relaxed"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Start typing or paste your text here..."
                    spellCheck={false}
                />
            </div>

            <div className="px-4 py-2 bg-[#2d2d2d] text-xs text-gray-400 flex justify-between">
                <span>Tip: Paste or type your text above to see real-time statistics</span>
                <button onClick={() => setText('')} className="text-red-400 hover:text-red-300 transition-colors">
                    Clear
                </button>
            </div>
        </div>
    );
};
