import React, { useState, useEffect } from 'react';
import { AppContainer, TabSwitcher, Card, Button, SectionLabel, TextInput } from '../components/ui';

type Category = 'length' | 'weight' | 'temperature' | 'data';

interface UnitOption {
    label: string;
    value: string;
    toBase: (val: number) => number;
    fromBase: (val: number) => number;
}

const units: Record<Category, UnitOption[]> = {
    length: [
        { label: 'Meters', value: 'm', toBase: v => v, fromBase: v => v },
        { label: 'Kilometers', value: 'km', toBase: v => v * 1000, fromBase: v => v / 1000 },
        { label: 'Centimeters', value: 'cm', toBase: v => v / 100, fromBase: v => v * 100 },
        { label: 'Millimeters', value: 'mm', toBase: v => v / 1000, fromBase: v => v * 1000 },
        { label: 'Miles', value: 'mi', toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
        { label: 'Feet', value: 'ft', toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
        { label: 'Inches', value: 'in', toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
        { label: 'Yards', value: 'yd', toBase: v => v * 0.9144, fromBase: v => v / 0.9144 },
    ],
    weight: [
        { label: 'Kilograms', value: 'kg', toBase: v => v, fromBase: v => v },
        { label: 'Grams', value: 'g', toBase: v => v / 1000, fromBase: v => v * 1000 },
        { label: 'Milligrams', value: 'mg', toBase: v => v / 1000000, fromBase: v => v * 1000000 },
        { label: 'Pounds', value: 'lb', toBase: v => v * 0.453592, fromBase: v => v / 0.453592 },
        { label: 'Ounces', value: 'oz', toBase: v => v * 0.0283495, fromBase: v => v / 0.0283495 },
        { label: 'Tonnes', value: 't', toBase: v => v * 1000, fromBase: v => v / 1000 },
    ],
    temperature: [
        { label: 'Celsius', value: '°C', toBase: v => v, fromBase: v => v },
        { label: 'Fahrenheit', value: '°F', toBase: v => ((v - 32) * 5) / 9, fromBase: v => (v * 9) / 5 + 32 },
        { label: 'Kelvin', value: 'K', toBase: v => v - 273.15, fromBase: v => v + 273.15 },
    ],
    data: [
        { label: 'Bytes', value: 'B', toBase: v => v, fromBase: v => v },
        { label: 'Kilobytes', value: 'KB', toBase: v => v * 1024, fromBase: v => v / 1024 },
        { label: 'Megabytes', value: 'MB', toBase: v => v * 1048576, fromBase: v => v / 1048576 },
        { label: 'Gigabytes', value: 'GB', toBase: v => v * 1073741824, fromBase: v => v / 1073741824 },
        { label: 'Terabytes', value: 'TB', toBase: v => v * 1099511627776, fromBase: v => v / 1099511627776 },
        { label: 'Bits', value: 'bit', toBase: v => v / 8, fromBase: v => v * 8 },
    ],
};

const categoryLabels: Record<Category, string> = {
    length: 'Length',
    weight: 'Weight',
    temperature: 'Temperature',
    data: 'Data/Storage',
};

export const UnitConverter = () => {
    const [category, setCategory] = useState<Category>('length');
    const [fromUnit, setFromUnit] = useState(0);
    const [toUnit, setToUnit] = useState(1);
    const [inputValue, setInputValue] = useState('1');
    const [result, setResult] = useState('');

    const currentUnits = units[category];

    useEffect(() => {
        setFromUnit(0);
        setToUnit(1);
        setInputValue('1');
    }, [category]);

    useEffect(() => {
        const value = parseFloat(inputValue);
        if (isNaN(value)) {
            setResult('');
            return;
        }

        const fromUnitData = currentUnits[fromUnit];
        const toUnitData = currentUnits[toUnit];

        if (!fromUnitData || !toUnitData) {
            setResult('');
            return;
        }

        const baseValue = fromUnitData.toBase(value);
        const convertedValue = toUnitData.fromBase(baseValue);

        const formatted = Number.isInteger(convertedValue)
            ? convertedValue.toString()
            : convertedValue.toPrecision(10).replace(/\.?0+$/, '');

        setResult(formatted);
    }, [inputValue, fromUnit, toUnit, currentUnits]);

    const swapUnits = () => {
        setFromUnit(toUnit);
        setToUnit(fromUnit);
        setInputValue(result || '1');
    };

    return (
        <AppContainer>
            <TabSwitcher
                options={(Object.keys(units) as Category[]).map(cat => ({
                    value: cat,
                    label: categoryLabels[cat],
                }))}
                value={category}
                onChange={setCategory}
                size="sm"
                wrap
            />

            <Card className="flex-1 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <SectionLabel>From</SectionLabel>
                    <div className="flex gap-2">
                        <TextInput
                            type="number"
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            className="flex-1 text-xl focus:ring-2 focus:ring-orange-500"
                            size="lg"
                            placeholder="Enter value"
                        />
                        <select
                            value={fromUnit}
                            onChange={e => setFromUnit(parseInt(e.target.value))}
                            className="bg-white/10 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                        >
                            {currentUnits.map((unit, index) => (
                                <option key={unit.value} value={index} className="bg-gray-800">
                                    {unit.label} ({unit.value})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex justify-center">
                    <Button onClick={swapUnits} variant="ghost" className="!p-3 !rounded-full" icon="swap_vert" />
                </div>

                <div className="flex flex-col gap-2">
                    <SectionLabel>To</SectionLabel>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-white/5 text-white text-xl p-3 rounded-lg border border-white/10">
                            {result || '—'}
                        </div>
                        <select
                            value={toUnit}
                            onChange={e => setToUnit(parseInt(e.target.value))}
                            className="bg-white/10 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                        >
                            {currentUnits.map((unit, index) => (
                                <option key={unit.value} value={index} className="bg-gray-800">
                                    {unit.label} ({unit.value})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
                    <SectionLabel>Conversion</SectionLabel>
                    <div className="text-white text-lg mt-1">
                        {inputValue && result ? (
                            <>
                                {inputValue} {currentUnits[fromUnit]?.value} = {result} {currentUnits[toUnit]?.value}
                            </>
                        ) : (
                            'Enter a value to convert'
                        )}
                    </div>
                </div>
            </Card>
        </AppContainer>
    );
};
