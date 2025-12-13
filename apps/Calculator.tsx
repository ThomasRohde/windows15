import React, { useState } from 'react';

type Operator = '+' | '-' | '*' | '/' | null;

export const Calculator = () => {
    const [display, setDisplay] = useState('0');
    const [accumulator, setAccumulator] = useState<number | null>(null);
    const [operator, setOperator] = useState<Operator>(null);
    const [awaitingNext, setAwaitingNext] = useState(true);

    const clear = () => {
        setDisplay('0');
        setAccumulator(null);
        setOperator(null);
        setAwaitingNext(true);
    };

    const formatNumber = (value: number) => {
        if (!Number.isFinite(value)) return 'Error';
        return Number(value.toPrecision(12)).toString();
    };

    const compute = (left: number, right: number, op: Exclude<Operator, null>) => {
        switch (op) {
            case '+': return left + right;
            case '-': return left - right;
            case '*': return left * right;
            case '/': return right === 0 ? NaN : left / right;
        }
    };

    const inputDigit = (digit: string) => {
        if (display === 'Error') {
            setDisplay(digit);
            setAwaitingNext(false);
            return;
        }
        if (awaitingNext) {
            setDisplay(digit);
            setAwaitingNext(false);
            return;
        }
        setDisplay(prev => (prev === '0' ? digit : prev + digit));
    };

    const inputDecimal = () => {
        if (display === 'Error') {
            setDisplay('0.');
            setAwaitingNext(false);
            return;
        }
        if (awaitingNext) {
            setDisplay('0.');
            setAwaitingNext(false);
            return;
        }
        if (!display.includes('.')) setDisplay(prev => prev + '.');
    };

    const toggleSign = () => {
        if (display === 'Error') return;
        if (display === '0') return;
        setDisplay(prev => (prev.startsWith('-') ? prev.slice(1) : `-${prev}`));
    };

    const percent = () => {
        if (display === 'Error') return;
        const current = Number(display);
        if (!Number.isFinite(current)) return;
        setDisplay(formatNumber(current / 100));
        setAwaitingNext(false);
    };

    const handleOperator = (nextOp: Exclude<Operator, null>) => {
        if (display === 'Error') return;

        if (operator && awaitingNext) {
            setOperator(nextOp);
            return;
        }

        const current = Number(display);
        if (!Number.isFinite(current)) return;

        if (accumulator === null) {
            setAccumulator(current);
        } else if (operator) {
            const result = compute(accumulator, current, operator);
            if (!Number.isFinite(result)) {
                setDisplay('Error');
                setAccumulator(null);
                setOperator(null);
                setAwaitingNext(true);
                return;
            }
            setAccumulator(result);
            setDisplay(formatNumber(result));
        }

        setOperator(nextOp);
        setAwaitingNext(true);
    };

    const equals = () => {
        if (display === 'Error') return;
        if (accumulator === null || !operator) return;

        const current = Number(display);
        if (!Number.isFinite(current)) return;

        const result = compute(accumulator, current, operator);
        if (!Number.isFinite(result)) {
            setDisplay('Error');
            setAccumulator(null);
            setOperator(null);
            setAwaitingNext(true);
            return;
        }

        setDisplay(formatNumber(result));
        setAccumulator(null);
        setOperator(null);
        setAwaitingNext(true);
    };

    const Btn = ({ v, op, wide }: { v: string; op?: boolean; wide?: boolean }) => (
        <button
            onClick={() => {
                if (v === 'C') clear();
                else if (v === '=') equals();
                else if (v === '.') inputDecimal();
                else if (v === '+/-') toggleSign();
                else if (v === '%') percent();
                else if (op) {
                    const mapped: Exclude<Operator, null> =
                        v === '×' ? '*' :
                        v === '÷' ? '/' :
                        (v as Exclude<Operator, null>);
                    handleOperator(mapped);
                }
                else inputDigit(v);
            }}
            className={`${wide ? 'col-span-2' : ''} h-14 rounded-lg text-xl font-medium transition-all active:scale-95 flex items-center justify-center
                ${op ? 'bg-orange-500 text-white hover:bg-orange-400' : 'bg-white/10 text-white hover:bg-white/20'}
                ${v === 'C' ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : ''}
            `}
        >
            {v}
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
                <Btn v="÷" op />
                <Btn v="7" />
                <Btn v="8" />
                <Btn v="9" />
                <Btn v="×" op />
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
