import React, { useEffect, useRef } from 'react';
import { createUniver, defaultTheme, LocaleType } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import '@univerjs/presets/lib/styles/preset-sheets-core.css';
import ExcelJS from 'exceljs';
import { AppContainer } from '../components/ui';
import { useTranslation } from '../hooks/useTranslation';
import { useWindowInstance } from '../hooks';
import { getFileExtension } from './registry';

interface SpreadsheetProps {
    /** Initial CSV content to load */
    initialContent?: string;
    /** Initial filename for window title */
    initialFileName?: string;
    /** Window ID for dynamic title updates */
    windowId?: string;
}

/**
 * Parse CSV content into a 2D array of cell values
 */
function parseCSV(csvContent: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < csvContent.length; i++) {
        const char = csvContent[i];
        const nextChar = csvContent[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                // Escaped quote
                currentCell += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote mode
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            currentRow.push(currentCell);
            currentCell = '';
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
            currentRow.push(currentCell);
            rows.push(currentRow);
            currentRow = [];
            currentCell = '';
            if (char === '\r') i++; // Skip \n in \r\n
        } else if (char === '\r' && !insideQuotes) {
            // Handle standalone \r as line break
            currentRow.push(currentCell);
            rows.push(currentRow);
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }

    // Add last cell and row if there's content
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }

    return rows;
}

/**
 * Convert parsed CSV data to Univer workbook data format
 * Accepts array of arrays with mixed types (strings, numbers, etc.)
 */
function csvToWorkbookData(csvData: (string | number | boolean | null | undefined)[][], sheetName: string = 'Sheet1') {
    const cellData: Record<number, Record<number, { v: string | number; t?: number }>> = {};

    for (let rowIdx = 0; rowIdx < csvData.length; rowIdx++) {
        const row = csvData[rowIdx];
        if (!row) continue;

        cellData[rowIdx] = {};
        for (let colIdx = 0; colIdx < row.length; colIdx++) {
            const cellValue = row[colIdx];
            const rowData = cellData[rowIdx];
            if (!rowData) continue;

            // Handle different cell value types
            if (cellValue === null || cellValue === undefined) {
                rowData[colIdx] = { v: '' };
            } else if (typeof cellValue === 'number') {
                rowData[colIdx] = { v: cellValue, t: 2 }; // t=2 for number
            } else if (typeof cellValue === 'boolean') {
                rowData[colIdx] = { v: cellValue ? 'TRUE' : 'FALSE' };
            } else {
                // String value - try to parse as number
                const strValue = String(cellValue);
                const numValue = parseFloat(strValue);
                if (!isNaN(numValue) && strValue.trim() !== '') {
                    rowData[colIdx] = { v: numValue, t: 2 };
                } else {
                    rowData[colIdx] = { v: strValue };
                }
            }
        }
    }

    const rowCount = Math.max(1000, csvData.length + 100);
    const columnCount = Math.max(26, Math.max(...csvData.map(r => r?.length ?? 0)) + 10);

    return {
        id: `workbook-${Date.now()}`,
        name: sheetName,
        sheetOrder: ['sheet-01'],
        sheets: {
            'sheet-01': {
                id: 'sheet-01',
                name: sheetName,
                cellData,
                rowCount,
                columnCount,
                defaultColumnWidth: 88,
                defaultRowHeight: 24,
            },
        },
    };
}

export const Spreadsheet: React.FC<SpreadsheetProps> = ({ initialContent, initialFileName, windowId }) => {
    const { t: _t } = useTranslation('spreadsheet');
    const { setTitle } = useWindowInstance(windowId ?? '');
    const containerRef = useRef<HTMLDivElement>(null);
    const univerRef = useRef<ReturnType<typeof createUniver> | null>(null);

    // Update window title with filename
    useEffect(() => {
        if (windowId && initialFileName) {
            setTitle(`Spreadsheet - ${initialFileName}`);
        }
    }, [windowId, initialFileName, setTitle]);

    // Initialize Univer
    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize Univer with sheets preset
        const { univerAPI } = createUniver({
            locale: LocaleType.EN_US,
            locales: {
                [LocaleType.EN_US]: UniverPresetSheetsCoreEnUS,
            },
            theme: defaultTheme,
            darkMode: true,
            presets: [
                UniverSheetsCorePreset({
                    container: containerRef.current,
                }),
            ],
        });

        univerRef.current = { univerAPI };

        // Check if we have initial content to load
        if (initialContent && initialFileName) {
            const ext = getFileExtension(initialFileName).toLowerCase();

            if (ext === '.csv') {
                // Parse CSV and create workbook with data
                const csvData = parseCSV(initialContent);
                const sheetName = initialFileName.replace(/\.[^/.]+$/, ''); // Remove extension
                const workbookData = csvToWorkbookData(csvData, sheetName);
                univerAPI.createUniverSheet(workbookData);
            } else if (['.xlsx', '.xls', '.xlsm', '.xlsb', '.ods'].includes(ext)) {
                // Parse Excel files using ExcelJS
                (async () => {
                    try {
                        const workbook = new ExcelJS.Workbook();

                        // Convert content to ArrayBuffer
                        let arrayBuffer: ArrayBuffer;
                        if (initialContent.startsWith('data:')) {
                            // Extract base64 data from data URL
                            const base64Data = initialContent.split(',')[1];
                            if (base64Data) {
                                const binaryString = atob(base64Data);
                                const bytes = new Uint8Array(binaryString.length);
                                for (let i = 0; i < binaryString.length; i++) {
                                    bytes[i] = binaryString.charCodeAt(i);
                                }
                                arrayBuffer = bytes.buffer;
                            } else {
                                throw new Error('Invalid data URL format');
                            }
                        } else {
                            // Assume it's raw base64
                            const binaryString = atob(initialContent);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            arrayBuffer = bytes.buffer;
                        }

                        await workbook.xlsx.load(arrayBuffer);

                        // Get the first worksheet
                        const worksheet = workbook.worksheets[0];
                        if (worksheet) {
                            // Convert to array of arrays
                            const jsonData: (string | number | boolean | null)[][] = [];
                            worksheet.eachRow((row, rowNumber) => {
                                const rowData: (string | number | boolean | null)[] = [];
                                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                                    // Pad with nulls if needed
                                    while (rowData.length < colNumber - 1) {
                                        rowData.push(null);
                                    }
                                    // Get cell value
                                    const value = cell.value;
                                    if (value === null || value === undefined) {
                                        rowData.push(null);
                                    } else if (typeof value === 'object') {
                                        // Handle rich text, formulas, etc.
                                        if ('result' in value) {
                                            rowData.push(value.result as string | number | boolean | null);
                                        } else if ('richText' in value) {
                                            rowData.push(
                                                (value.richText as Array<{ text: string }>).map(rt => rt.text).join('')
                                            );
                                        } else {
                                            rowData.push(String(value));
                                        }
                                    } else {
                                        rowData.push(value as string | number | boolean);
                                    }
                                });
                                // Pad jsonData array if rows are skipped
                                while (jsonData.length < rowNumber - 1) {
                                    jsonData.push([]);
                                }
                                jsonData.push(rowData);
                            });

                            const sheetName = initialFileName.replace(/\.[^/.]+$/, '');
                            const workbookData = csvToWorkbookData(jsonData, sheetName);
                            univerAPI.createUniverSheet(workbookData);
                        } else {
                            univerAPI.createUniverSheet({});
                        }
                    } catch (error) {
                        console.error('Failed to parse Excel file:', error);
                        univerAPI.createUniverSheet({});
                    }
                })();
            } else {
                // For other formats, create empty sheet
                univerAPI.createUniverSheet({});
            }
        } else {
            // Create a default empty workbook
            univerAPI.createUniverSheet({});
        }

        // Cleanup on unmount
        return () => {
            univerAPI?.dispose();
            univerRef.current = null;
        };
    }, [initialContent, initialFileName]);

    return (
        <AppContainer>
            <div ref={containerRef} className="w-full h-full" style={{ minHeight: '500px' }} />
        </AppContainer>
    );
};
