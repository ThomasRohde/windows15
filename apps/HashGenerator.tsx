import React, { useState } from 'react';
import { useCopyToClipboard, useAsyncAction } from '../hooks';

const md5 = (str: string): string => {
    const rotateLeft = (x: number, n: number) => (x << n) | (x >>> (32 - n));

    const addUnsigned = (x: number, y: number) => {
        const x8 = x & 0x80000000;
        const y8 = y & 0x80000000;
        const x4 = x & 0x40000000;
        const y4 = y & 0x40000000;
        const result = (x & 0x3fffffff) + (y & 0x3fffffff);
        if (x4 & y4) return result ^ 0x80000000 ^ x8 ^ y8;
        if (x4 | y4) {
            if (result & 0x40000000) return result ^ 0xc0000000 ^ x8 ^ y8;
            return result ^ 0x40000000 ^ x8 ^ y8;
        }
        return result ^ x8 ^ y8;
    };

    const F = (x: number, y: number, z: number) => (x & y) | (~x & z);
    const G = (x: number, y: number, z: number) => (x & z) | (y & ~z);
    const H = (x: number, y: number, z: number) => x ^ y ^ z;
    const I = (x: number, y: number, z: number) => y ^ (x | ~z);

    const FF = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
        addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, F(b, c, d)), addUnsigned(x, ac)), s), b);
    const GG = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
        addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, G(b, c, d)), addUnsigned(x, ac)), s), b);
    const HH = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
        addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, H(b, c, d)), addUnsigned(x, ac)), s), b);
    const II = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
        addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, I(b, c, d)), addUnsigned(x, ac)), s), b);

    const convertToWordArray = (str: string) => {
        let lWordCount;
        const lMessageLength = str.length;
        const lNumberOfWordsTemp1 = lMessageLength + 8;
        const lNumberOfWordsTemp2 = (lNumberOfWordsTemp1 - (lNumberOfWordsTemp1 % 64)) / 64;
        const lNumberOfWords = (lNumberOfWordsTemp2 + 1) * 16;
        const lWordArray = new Array(lNumberOfWords - 1);
        let lBytePosition = 0;
        let lByteCount = 0;
        while (lByteCount < lMessageLength) {
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition);
            lByteCount++;
        }
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
        lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
        lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
        return lWordArray;
    };

    const wordToHex = (lValue: number) => {
        let result = '';
        for (let lCount = 0; lCount <= 3; lCount++) {
            const lByte = (lValue >>> (lCount * 8)) & 255;
            result += ('0' + lByte.toString(16)).slice(-2);
        }
        return result;
    };

    const x = convertToWordArray(str);
    let a = 0x67452301,
        b = 0xefcdab89,
        c = 0x98badcfe,
        d = 0x10325476;

    for (let k = 0; k < x.length; k += 16) {
        const AA = a,
            BB = b,
            CC = c,
            DD = d;
        a = FF(a, b, c, d, x[k], 7, 0xd76aa478);
        d = FF(d, a, b, c, x[k + 1], 12, 0xe8c7b756);
        c = FF(c, d, a, b, x[k + 2], 17, 0x242070db);
        b = FF(b, c, d, a, x[k + 3], 22, 0xc1bdceee);
        a = FF(a, b, c, d, x[k + 4], 7, 0xf57c0faf);
        d = FF(d, a, b, c, x[k + 5], 12, 0x4787c62a);
        c = FF(c, d, a, b, x[k + 6], 17, 0xa8304613);
        b = FF(b, c, d, a, x[k + 7], 22, 0xfd469501);
        a = FF(a, b, c, d, x[k + 8], 7, 0x698098d8);
        d = FF(d, a, b, c, x[k + 9], 12, 0x8b44f7af);
        c = FF(c, d, a, b, x[k + 10], 17, 0xffff5bb1);
        b = FF(b, c, d, a, x[k + 11], 22, 0x895cd7be);
        a = FF(a, b, c, d, x[k + 12], 7, 0x6b901122);
        d = FF(d, a, b, c, x[k + 13], 12, 0xfd987193);
        c = FF(c, d, a, b, x[k + 14], 17, 0xa679438e);
        b = FF(b, c, d, a, x[k + 15], 22, 0x49b40821);
        a = GG(a, b, c, d, x[k + 1], 5, 0xf61e2562);
        d = GG(d, a, b, c, x[k + 6], 9, 0xc040b340);
        c = GG(c, d, a, b, x[k + 11], 14, 0x265e5a51);
        b = GG(b, c, d, a, x[k], 20, 0xe9b6c7aa);
        a = GG(a, b, c, d, x[k + 5], 5, 0xd62f105d);
        d = GG(d, a, b, c, x[k + 10], 9, 0x02441453);
        c = GG(c, d, a, b, x[k + 15], 14, 0xd8a1e681);
        b = GG(b, c, d, a, x[k + 4], 20, 0xe7d3fbc8);
        a = GG(a, b, c, d, x[k + 9], 5, 0x21e1cde6);
        d = GG(d, a, b, c, x[k + 14], 9, 0xc33707d6);
        c = GG(c, d, a, b, x[k + 3], 14, 0xf4d50d87);
        b = GG(b, c, d, a, x[k + 8], 20, 0x455a14ed);
        a = GG(a, b, c, d, x[k + 13], 5, 0xa9e3e905);
        d = GG(d, a, b, c, x[k + 2], 9, 0xfcefa3f8);
        c = GG(c, d, a, b, x[k + 7], 14, 0x676f02d9);
        b = GG(b, c, d, a, x[k + 12], 20, 0x8d2a4c8a);
        a = HH(a, b, c, d, x[k + 5], 4, 0xfffa3942);
        d = HH(d, a, b, c, x[k + 8], 11, 0x8771f681);
        c = HH(c, d, a, b, x[k + 11], 16, 0x6d9d6122);
        b = HH(b, c, d, a, x[k + 14], 23, 0xfde5380c);
        a = HH(a, b, c, d, x[k + 1], 4, 0xa4beea44);
        d = HH(d, a, b, c, x[k + 4], 11, 0x4bdecfa9);
        c = HH(c, d, a, b, x[k + 7], 16, 0xf6bb4b60);
        b = HH(b, c, d, a, x[k + 10], 23, 0xbebfbc70);
        a = HH(a, b, c, d, x[k + 13], 4, 0x289b7ec6);
        d = HH(d, a, b, c, x[k], 11, 0xeaa127fa);
        c = HH(c, d, a, b, x[k + 3], 16, 0xd4ef3085);
        b = HH(b, c, d, a, x[k + 6], 23, 0x04881d05);
        a = HH(a, b, c, d, x[k + 9], 4, 0xd9d4d039);
        d = HH(d, a, b, c, x[k + 12], 11, 0xe6db99e5);
        c = HH(c, d, a, b, x[k + 15], 16, 0x1fa27cf8);
        b = HH(b, c, d, a, x[k + 2], 23, 0xc4ac5665);
        a = II(a, b, c, d, x[k], 6, 0xf4292244);
        d = II(d, a, b, c, x[k + 7], 10, 0x432aff97);
        c = II(c, d, a, b, x[k + 14], 15, 0xab9423a7);
        b = II(b, c, d, a, x[k + 5], 21, 0xfc93a039);
        a = II(a, b, c, d, x[k + 12], 6, 0x655b59c3);
        d = II(d, a, b, c, x[k + 3], 10, 0x8f0ccc92);
        c = II(c, d, a, b, x[k + 10], 15, 0xffeff47d);
        b = II(b, c, d, a, x[k + 1], 21, 0x85845dd1);
        a = II(a, b, c, d, x[k + 8], 6, 0x6fa87e4f);
        d = II(d, a, b, c, x[k + 15], 10, 0xfe2ce6e0);
        c = II(c, d, a, b, x[k + 6], 15, 0xa3014314);
        b = II(b, c, d, a, x[k + 13], 21, 0x4e0811a1);
        a = II(a, b, c, d, x[k + 4], 6, 0xf7537e82);
        d = II(d, a, b, c, x[k + 11], 10, 0xbd3af235);
        c = II(c, d, a, b, x[k + 2], 15, 0x2ad7d2bb);
        b = II(b, c, d, a, x[k + 9], 21, 0xeb86d391);
        a = addUnsigned(a, AA);
        b = addUnsigned(b, BB);
        c = addUnsigned(c, CC);
        d = addUnsigned(d, DD);
    }
    return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
};

const sha1 = async (str: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const sha256 = async (str: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

interface HashResult {
    name: string;
    value: string;
    length: number;
}

export const HashGenerator = () => {
    const [input, setInput] = useState('');
    const [hashes, setHashes] = useState<HashResult[]>([]);
    const { copy, isCopied } = useCopyToClipboard();
    const { execute, loading } = useAsyncAction();

    const generateHashes = async () => {
        if (!input) {
            setHashes([]);
            return;
        }

        await execute(async () => {
            const [sha1Hash, sha256Hash] = await Promise.all([sha1(input), sha256(input)]);

            setHashes([
                { name: 'MD5', value: md5(input), length: 32 },
                { name: 'SHA-1', value: sha1Hash, length: 40 },
                { name: 'SHA-256', value: sha256Hash, length: 64 },
            ]);
        });
    };

    const handleCopy = (hash: HashResult) => {
        copy(hash.value, hash.name);
    };

    const clear = () => {
        setInput('');
        setHashes([]);
    };

    return (
        <div className="h-full flex flex-col bg-background-dark text-white">
            <div className="flex items-center gap-3 p-3 bg-[#2d2d2d] border-b border-white/10">
                <span className="text-sm text-gray-400">Hash Generator</span>
                <div className="flex-1" />
                <button
                    onClick={clear}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
                >
                    Clear
                </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0 p-4 gap-4">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Input Text</span>
                        <span className="text-xs text-gray-500">{input.length} characters</span>
                    </div>
                    <textarea
                        className="h-32 bg-black/20 rounded-lg resize-none border border-white/10 p-3 focus:outline-none focus:border-blue-500/50 font-mono text-sm text-white/90"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Enter text to generate hashes..."
                        spellCheck={false}
                    />
                    <button
                        onClick={generateHashes}
                        disabled={loading || !input}
                        className="self-start px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                    >
                        {loading ? 'Generating...' : 'Generate Hashes'}
                    </button>
                </div>

                {hashes.length > 0 && (
                    <div className="flex-1 flex flex-col gap-3 overflow-auto">
                        <span className="text-sm text-gray-400">Generated Hashes</span>
                        {hashes.map(hash => (
                            <div key={hash.name} className="bg-black/20 rounded-lg p-4 border border-white/10">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-white">{hash.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">{hash.length} chars</span>
                                        <button
                                            onClick={() => handleCopy(hash)}
                                            className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
                                        >
                                            {isCopied(hash.name) ? '✓ Copied!' : '📋 Copy'}
                                        </button>
                                    </div>
                                </div>
                                <div className="font-mono text-sm text-green-400 break-all bg-black/30 rounded p-2">
                                    {hash.value}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {hashes.length === 0 && input && (
                    <div className="text-center text-gray-500 py-8">Click "Generate Hashes" to create hash values</div>
                )}

                {!input && (
                    <div className="text-center text-gray-500 py-8">
                        Enter some text above to generate MD5, SHA-1, and SHA-256 hashes
                    </div>
                )}
            </div>
        </div>
    );
};
