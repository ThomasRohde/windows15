import React, { useEffect, useMemo, useState } from 'react';

export const Notepad = ({ initialContent = '' }: { initialContent?: string }) => {
    const [content, setContent] = useState(initialContent);
    const [cursorIndex, setCursorIndex] = useState(0);

    useEffect(() => {
        setContent(initialContent);
        setCursorIndex(0);
    }, [initialContent]);

    const cursorInfo = useMemo(() => {
        const safeCursorIndex = Math.max(0, Math.min(cursorIndex, content.length));
        const textBeforeCursor = content.slice(0, safeCursorIndex);
        const line = textBeforeCursor.split('\n').length;
        const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
        const column = safeCursorIndex - lastNewlineIndex;

        return { line, column };
    }, [content, cursorIndex]);

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-[#d4d4d4]">
            <div className="flex text-xs px-2 py-1 bg-[#2d2d2d] gap-4 select-none">
                <span className="hover:text-white cursor-pointer">File</span>
                <span className="hover:text-white cursor-pointer">Edit</span>
                <span className="hover:text-white cursor-pointer">View</span>
                <span className="hover:text-white cursor-pointer">Help</span>
            </div>
            <textarea 
                className="flex-1 bg-transparent resize-none border-none p-4 focus:outline-none font-mono text-sm leading-relaxed text-white/90 selection:bg-blue-500/40"
                value={content}
                onChange={(e) => {
                    setContent(e.target.value);
                    setCursorIndex(e.target.selectionStart ?? 0);
                }}
                onSelect={(e) => setCursorIndex(e.currentTarget.selectionStart ?? 0)}
                onKeyUp={(e) => setCursorIndex(e.currentTarget.selectionStart ?? 0)}
                onClick={(e) => setCursorIndex(e.currentTarget.selectionStart ?? 0)}
                spellCheck={false}
                placeholder="Start typing..."
            />
            <div className="bg-primary px-3 py-1 text-xs text-white flex justify-end gap-4">
                <span>Ln {cursorInfo.line}, Col {cursorInfo.column}</span>
                <span>UTF-8</span>
                <span>Windows (CRLF)</span>
            </div>
        </div>
    );
};
