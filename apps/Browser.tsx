import React, { useState } from 'react';

export const Browser = () => {
    const [url, setUrl] = useState('https://www.google.com/webhp?igu=1');
    const [inputUrl, setInputUrl] = useState('google.com');
    const [history, setHistory] = useState<string[]>(['https://www.google.com/webhp?igu=1']);
    const [historyIndex, setHistoryIndex] = useState(0);

    const navigate = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        let target = inputUrl;
        if (!target.startsWith('http')) {
            target = 'https://' + target;
        }
        // Basic check to see if we can embed (most sites block iframe, so we use a mock for demo)
        if (!target.includes('google.com') && !target.includes('bing.com') && !target.includes('wikipedia')) {
            // Allow it but it might fail X-Frame-Options
        }
        setUrl(target);
        setHistory([...history.slice(0, historyIndex + 1), target]);
        setHistoryIndex(prev => prev + 1);
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Browser Toolbar */}
            <div className="h-12 bg-gray-100 border-b border-gray-200 flex items-center px-2 gap-2">
                <div className="flex gap-1">
                    <button disabled={historyIndex === 0} onClick={() => { setHistoryIndex(i => i - 1); setUrl(history[historyIndex - 1]); setInputUrl(history[historyIndex - 1]) }} className="p-1.5 rounded-full hover:bg-gray-200 disabled:opacity-30 text-gray-700">
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                    </button>
                    <button disabled={historyIndex === history.length - 1} onClick={() => { setHistoryIndex(i => i + 1); setUrl(history[historyIndex + 1]); setInputUrl(history[historyIndex + 1]) }} className="p-1.5 rounded-full hover:bg-gray-200 disabled:opacity-30 text-gray-700">
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                    <button onClick={() => navigate()} className="p-1.5 rounded-full hover:bg-gray-200 text-gray-700">
                        <span className="material-symbols-outlined text-lg">refresh</span>
                    </button>
                </div>
                <form onSubmit={navigate} className="flex-1">
                    <input 
                        className="w-full h-8 bg-white border border-gray-300 rounded-full px-4 text-sm text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        placeholder="Search or type URL"
                    />
                </form>
            </div>
            {/* Browser Content */}
            <div className="flex-1 relative bg-white">
                <iframe 
                    src={url} 
                    className="w-full h-full border-none" 
                    title="Browser"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
            </div>
        </div>
    );
};