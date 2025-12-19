import React, { useEffect, useRef } from 'react';
import { createUniver, defaultTheme, LocaleType } from '@univerjs/presets';
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

        // Initialize Univer
        const { univerAPI } = createUniver({
            locale: LocaleType.EN_US,
            locales: {
                [LocaleType.EN_US]: UniverPresetSheetsCoreEnUS,
            },
            theme: defaultTheme,
        });

        univerRef.current = { univerAPI } as any;

        // Render the spreadsheet to the container
        univerAPI.createWorkbook({});

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
