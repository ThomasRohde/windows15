import React, { useState } from 'react';

export const Calculator = () => {
    const [display, setDisplay] = useState('0');
    const [prevValue, setPrevValue] = useState<string | null>(null);
    const [operation, setOperation] = useState<string | null>(null);
    const [newNumber, setNewNumber] = useState(true);

    const handleNum = (num: string) => {
        if (newNumber) {
            setDisplay(num);
            setNewNumber(false);
        } else {
            setDisplay(display === '0' ? num : display + num);
        }
    };

    const handleOp = (op: string) => {
        setOperation(op);
        setPrevValue(display);
        setNewNumber(true);
    };

    const calculate = () => {
        if (!prevValue || !operation) return;
        const current = parseFloat(display);
        const prev = parseFloat(prevValue);
        let result = 0;

        switch (operation) {
            case '+': result = prev + current; break;
            case '-': result = prev - current; break;
            case '*': result = prev * current; break;
            case '/': result = prev / current; break;
        }

        setDisplay(result.toString());
        setPrevValue(null);
        setOperation(null);
        setNewNumber(true);
    };

    const clear = () => {
        setDisplay('0');
        setPrevValue(null);
        setOperation(null);
        setNewNumber(true);
    };

    const Btn = ({ v, op, wide }: { v: string, op?: boolean, wide?: boolean }) => (
        <button 
            onClick={() => {
                if (v === 'C') clear();
                else if (v === '=') calculate();
                else if (op) handleOp(v);
                else handleNum(v);
            }}
            className={`${wide ? 'col-span-2' : ''} h-14 rounded-lg text-xl font-medium transition-all active:scale-95 flex items-center justify-center
                ${op ? 'bg-orange-500 text-white hover:bg-orange-400' : 'bg-white/10 text-white hover:bg-white/20'}
                ${v === 'C' ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : ''}
            `}
        >
            {v === '*' ? '×' : v === '/' ? '÷' : v}
        </button>
    );

    return (
        <div className="h-full bg-background-dark p-4 flex flex-col gap-4">
            <div className="flex-1 bg-black/20 rounded-xl p-4 flex items-end justify-end">
                <span className="text-5xl font-light text-white truncate">{display}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
                <Btn v="C" />
                <Btn v="+/-" />
                <Btn v="%" />
                <Btn v="/" op />
                <Btn v="7" />
                <Btn v="8" />
                <Btn v="9" />
                <Btn v="*" op />
                <Btn v="4" />
                <Btn v="5" />
                <Btn v="6" />
                <Btn v="-" op />
                <Btn v="1" />
                <Btn v="2" />
                <Btn v="3" />
                <Btn v="+" op />
                <Btn v="0" wide />
                <Btn v="." />
                <Btn v="=" op />
            </div>
        </div>
    );
};