import React from 'react';
import { Icon } from '../components/ui';

export const SystemInfo = () => {
    const systemSpecs = [
        { label: 'Device name', value: 'DESKTOP-WIN15' },
        { label: 'Processor', value: 'Intel(R) Core(TM) i9-14900K @ 6.0GHz' },
        { label: 'Installed RAM', value: '64.0 GB (63.8 GB usable)' },
        { label: 'Device ID', value: 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890' },
        { label: 'Product ID', value: '00330-80000-00000-AA123' },
        { label: 'System type', value: '64-bit operating system, x64-based processor' },
        { label: 'Pen and touch', value: 'No pen or touch input is available' },
    ];

    const windowsSpecs = [
        { label: 'Edition', value: 'Windows 15 Pro' },
        { label: 'Version', value: '24H2' },
        { label: 'Installed on', value: 'December 13, 2024' },
        { label: 'OS build', value: '28500.1000' },
        { label: 'Experience', value: 'Windows Feature Experience Pack 1000.28500.1000.0' },
    ];

    return (
        <div className="h-full bg-background-dark text-white overflow-y-auto">
            <div className="p-6 max-w-3xl mx-auto">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg">
                        <Icon name="window" size="xl" className="text-5xl text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-light">Windows 15</h1>
                        <p className="text-white/60 text-sm mt-1">The future of computing</p>
                    </div>
                </div>

                <section className="mb-8">
                    <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <Icon name="info" className="text-blue-400" />
                        Windows specifications
                    </h2>
                    <div className="bg-black/20 rounded-xl p-4 space-y-3">
                        {windowsSpecs.map((spec, i) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1">
                                <span className="text-white/60 text-sm sm:w-40">{spec.label}</span>
                                <span className="text-sm">{spec.value}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-8">
                    <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <Icon name="computer" className="text-green-400" />
                        Device specifications
                    </h2>
                    <div className="bg-black/20 rounded-xl p-4 space-y-3">
                        {systemSpecs.map((spec, i) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1">
                                <span className="text-white/60 text-sm sm:w-40">{spec.label}</span>
                                <span className="text-sm">{spec.value}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-8">
                    <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <Icon name="verified" className="text-purple-400" />
                        About
                    </h2>
                    <div className="bg-black/20 rounded-xl p-4">
                        <p className="text-sm text-white/80 leading-relaxed">
                            Windows 15 is a simulated operating system built with React and Tailwind CSS. This project
                            demonstrates modern web technologies creating a desktop-like experience in the browser.
                        </p>
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <p className="text-xs text-white/40">
                                © 2024 Windows15 Simulation. This is a demo project and is not affiliated with Microsoft
                                Corporation.
                            </p>
                        </div>
                    </div>
                </section>

                <div className="flex gap-3 flex-wrap">
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors">
                        Windows Update
                    </button>
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
                        Change product key
                    </button>
                </div>
            </div>
        </div>
    );
};
