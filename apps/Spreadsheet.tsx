import React, { useEffect, useRef } from 'react';
import { createUniver, defaultTheme, LocaleType } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import '@univerjs/presets/lib/styles/preset-sheets-core.css';
import { AppContainer } from '../components/ui';
import { useTranslation } from '../hooks/useTranslation';

export const Spreadsheet: React.FC = () => {
    const { t } = useTranslation('spreadsheet');
    const containerRef = useRef<HTMLDivElement>(null);
    const univerRef = useRef<ReturnType<typeof createUniver> | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize Univer with sheets preset
        const { univerAPI } = createUniver({
            locale: LocaleType.EN_US,
            locales: {
                [LocaleType.EN_US]: UniverPresetSheetsCoreEnUS,
            },
            theme: defaultTheme,
            presets: [
                UniverSheetsCorePreset({
                    container: containerRef.current,
                }),
            ],
        });

        univerRef.current = { univerAPI } as any;

        // Create a default workbook
        univerAPI.createUniverSheet({});

        // Cleanup on unmount
        return () => {
            univerAPI?.dispose();
            univerRef.current = null;
        };
    }, []);

    return (
        <AppContainer title={t('title')}>
            <div ref={containerRef} className="w-full h-full" style={{ minHeight: '500px' }} />
        </AppContainer>
    );
};
