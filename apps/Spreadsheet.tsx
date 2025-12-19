import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createUniver, defaultTheme, LocaleType } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import '@univerjs/presets/lib/styles/preset-sheets-core.css';
import ExcelJS from 'exceljs';
import { AppContainer } from '../components/ui';
import { useTranslation } from '../hooks/useTranslation';
import { useWindowInstance, useStandardHotkeys } from '../hooks';
import { getFileExtension } from './registry';
import { getFiles, saveFileToFolder } from '../utils/fileSystem';
import { FileSystemItem } from '../types';
import { useConfirmDialog, ConfirmDialog } from '../components/ui/ConfirmDialog';

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
 * Convert worksheet data to cell data format for Univer
 */
function worksheetToCellData(worksheetData: (string | number | boolean | null | undefined)[][]) {
    const cellData: Record<number, Record<number, { v: string | number; t?: number }>> = {};

    for (let rowIdx = 0; rowIdx < worksheetData.length; rowIdx++) {
        const row = worksheetData[rowIdx];
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

    return cellData;
}

/**
 * Convert parsed CSV data to Univer workbook data format
 * Accepts array of arrays with mixed types (strings, numbers, etc.)
 */
function csvToWorkbookData(csvData: (string | number | boolean | null | undefined)[][], sheetName: string = 'Sheet1') {
    const cellData = worksheetToCellData(csvData);

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

/**
 * Convert ExcelJS workbook to Univer workbook data format with multiple sheets
 */
function excelWorkbookToUniverData(workbook: ExcelJS.Workbook) {
    const sheets: Record<string, any> = {};
    const sheetOrder: string[] = [];

    workbook.worksheets.forEach((worksheet, index) => {
        const sheetId = `sheet-${String(index + 1).padStart(2, '0')}`;
        sheetOrder.push(sheetId);

        // Convert worksheet to array of arrays
        const jsonData: (string | number | boolean | null)[][] = [];
        worksheet.eachRow((row, _rowNumber) => {
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
                        rowData.push((value.richText as Array<{ text: string }>).map(rt => rt.text).join(''));
                    } else {
                        rowData.push(String(value));
                    }
                } else {
                    rowData.push(value as string | number | boolean);
                }
            });
            jsonData.push(rowData);
        });

        const cellData = worksheetToCellData(jsonData);
        const rowCount = Math.max(1000, jsonData.length + 100);
        const columnCount = Math.max(26, Math.max(...jsonData.map(r => r?.length ?? 0)) + 10);

        sheets[sheetId] = {
            id: sheetId,
            name: worksheet.name || `Sheet${index + 1}`,
            cellData,
            rowCount,
            columnCount,
            defaultColumnWidth: 88,
            defaultRowHeight: 24,
        };
    });

    return {
        id: `workbook-${Date.now()}`,
        name: 'Workbook',
        sheetOrder,
        sheets,
    };
}

export const Spreadsheet: React.FC<SpreadsheetProps> = ({ initialContent, initialFileName, windowId }) => {
    const { t: _t } = useTranslation('spreadsheet');
    const { setTitle } = useWindowInstance(windowId ?? '');
    const containerRef = useRef<HTMLDivElement>(null);
    const univerRef = useRef<ReturnType<typeof createUniver> | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Menu and file state
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [currentFileId, setCurrentFileId] = useState<string | null>(null);
    const [currentFileName, setCurrentFileName] = useState<string>(initialFileName || 'Untitled');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showOpenDialog, setShowOpenDialog] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [saveFileName, setSaveFileName] = useState('');
    const [files, setFiles] = useState<FileSystemItem[]>([]);

    const { confirm, dialogProps } = useConfirmDialog();

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update window title with filename and unsaved indicator
    useEffect(() => {
        if (windowId) {
            const title = hasUnsavedChanges ? `Spreadsheet - ${currentFileName}*` : `Spreadsheet - ${currentFileName}`;
            setTitle(title);
        }
    }, [windowId, currentFileName, hasUnsavedChanges, setTitle]);

    const loadFiles = useCallback(async () => {
        const allFiles = await getFiles();
        // Filter for spreadsheet files (stored as documents with spreadsheet extensions)
        const spreadsheetFiles = allFiles.filter(
            item => item.type === 'document' && /\.(xlsx|xls|csv|xlsm|xlsb|ods)$/i.test(item.name)
        );
        setFiles(spreadsheetFiles);
    }, []);

    const handleNew = async () => {
        if (hasUnsavedChanges) {
            const confirmed = await confirm({
                title: 'Unsaved Changes',
                message: 'You have unsaved changes. Create a new spreadsheet anyway?',
                variant: 'warning',
                confirmLabel: 'Continue',
                cancelLabel: 'Cancel',
            });
            if (!confirmed) return;
        }

        // Create new empty workbook
        if (univerRef.current?.univerAPI) {
            const { univerAPI } = univerRef.current;
            univerAPI.createUniverSheet({});
        }

        setCurrentFileId(null);
        setCurrentFileName('Untitled');
        setHasUnsavedChanges(false);
        setActiveMenu(null);
    };

    const handleOpen = async () => {
        await loadFiles();
        setShowOpenDialog(true);
        setActiveMenu(null);
    };

    const handleOpenFile = async (file: FileSystemItem) => {
        if (hasUnsavedChanges) {
            const confirmed = await confirm({
                title: 'Unsaved Changes',
                message: 'You have unsaved changes. Open a different file anyway?',
                variant: 'warning',
                confirmLabel: 'Continue',
                cancelLabel: 'Cancel',
            });
            if (!confirmed) return;
        }

        // Load file content and recreate workbook
        const content = file.content || '';
        const ext = getFileExtension(file.name).toLowerCase();

        if (univerRef.current?.univerAPI) {
            const { univerAPI } = univerRef.current;

            if (ext === '.csv') {
                const csvData = parseCSV(content);
                const sheetName = file.name.replace(/\.[^/.]+$/, '');
                const workbookData = csvToWorkbookData(csvData, sheetName);
                univerAPI.createUniverSheet(workbookData);
            } else if (['.xlsx', '.xls', '.xlsm', '.xlsb', '.ods'].includes(ext)) {
                // Handle Excel files
                (async () => {
                    try {
                        const workbook = new ExcelJS.Workbook();
                        let arrayBuffer: ArrayBuffer;

                        if (content.startsWith('data:')) {
                            const base64Data = content.split(',')[1];
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
                            const binaryString = atob(content);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            arrayBuffer = bytes.buffer;
                        }

                        await workbook.xlsx.load(arrayBuffer);

                        if (workbook.worksheets.length > 0) {
                            // Import all worksheets
                            const workbookData = excelWorkbookToUniverData(workbook);
                            univerAPI.createUniverSheet(workbookData);
                        } else {
                            univerAPI.createUniverSheet({});
                        }
                    } catch (error) {
                        console.error('Failed to parse Excel file:', error);
                        univerAPI.createUniverSheet({});
                    }
                })();
            }
        }

        setCurrentFileId(file.id);
        setCurrentFileName(file.name);
        setHasUnsavedChanges(false);
        setShowOpenDialog(false);
    };

    const handleSave = async () => {
        if (currentFileId) {
            // Save to existing file
            await saveCurrentWorkbook();
        } else {
            // Trigger Save As
            handleSaveAs();
        }
        setActiveMenu(null);
    };

    const handleSaveAs = () => {
        setSaveFileName(currentFileName === 'Untitled' ? '' : currentFileName.replace(/\.(xlsx|xls|csv)$/i, ''));
        setShowSaveDialog(true);
        setActiveMenu(null);
    };

    const saveCurrentWorkbook = async (fileName?: string, fileId?: string) => {
        if (!univerRef.current?.univerAPI) return;

        const { univerAPI } = univerRef.current;
        const targetFileName = fileName || currentFileName;
        const targetFileId = fileId || currentFileId || `spreadsheet-${Date.now()}`;

        try {
            // Export workbook as XLSX
            const workbook = univerAPI.getActiveWorkbook();
            if (!workbook) {
                console.error('No active workbook found');
                return;
            }

            // Get snapshot for serialization
            const snapshot = workbook.getSnapshot();
            const snapshotJson = JSON.stringify(snapshot);

            // For CSV, convert first sheet only
            let content = snapshotJson;
            if (targetFileName.endsWith('.csv')) {
                // Convert to CSV format
                const firstSheet = Object.values(snapshot.sheets || {})[0];
                if (firstSheet?.cellData) {
                    const csvRows: string[] = [];
                    const cellData = firstSheet.cellData;
                    const maxRow = Math.max(...Object.keys(cellData).map(Number));

                    for (let r = 0; r <= maxRow; r++) {
                        const row = cellData[r];
                        if (!row) {
                            csvRows.push('');
                            continue;
                        }
                        const maxCol = Math.max(...Object.keys(row).map(Number));
                        const cells: string[] = [];

                        for (let c = 0; c <= maxCol; c++) {
                            const cell = row[c];
                            const value = cell?.v?.toString() || '';
                            // Escape CSV values
                            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                                cells.push(`"${value.replace(/"/g, '""')}"`);
                            } else {
                                cells.push(value);
                            }
                        }
                        csvRows.push(cells.join(','));
                    }
                    content = csvRows.join('\n');
                }
            }

            const file: FileSystemItem = {
                id: targetFileId,
                name: targetFileName,
                type: 'document',
                content: content,
                date: new Date().toISOString().split('T')[0],
            };

            await saveFileToFolder(file, 'documents');
            setCurrentFileId(targetFileId);
            setCurrentFileName(targetFileName);
            setHasUnsavedChanges(false);
        } catch (error) {
            console.error('Failed to save workbook:', error);
        }
    };

    const handleSaveAsConfirm = async () => {
        if (!saveFileName.trim()) return;

        // Default to .xlsx extension
        const fileName = saveFileName.match(/\.(xlsx|xls|csv)$/i) ? saveFileName : `${saveFileName}.xlsx`;
        const fileId = `spreadsheet-${Date.now()}`;

        await saveCurrentWorkbook(fileName, fileId);
        setShowSaveDialog(false);
        setSaveFileName('');
    };

    // Keyboard shortcuts
    useStandardHotkeys({
        onSave: () => void handleSave(),
        onSaveAs: () => void handleSaveAs(),
        onNew: () => void handleNew(),
        onOpen: () => void handleOpen(),
    });

    const menuItems = {
        File: [
            { label: 'New', shortcut: 'Ctrl+N', action: handleNew },
            { label: 'Open...', shortcut: 'Ctrl+O', action: handleOpen },
            { label: 'Save', shortcut: 'Ctrl+S', action: handleSave },
            { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: handleSaveAs },
        ],
    };

    // Initialize Univer
    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize Univer with sheets preset
        const univerInstance = createUniver({
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

        univerRef.current = univerInstance;
        const { univerAPI } = univerInstance;

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

                        if (workbook.worksheets.length > 0) {
                            // Import all worksheets
                            const workbookData = excelWorkbookToUniverData(workbook);
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
            {/* Menu Bar */}
            <div ref={menuRef} className="flex text-xs px-2 py-1 bg-[#2d2d2d] gap-4 select-none relative">
                {Object.keys(menuItems).map(menu => (
                    <div key={menu} className="relative">
                        <span
                            className={`hover:text-white cursor-pointer px-2 py-0.5 rounded ${activeMenu === menu ? 'bg-[#3d3d3d] text-white' : ''}`}
                            onClick={() => setActiveMenu(activeMenu === menu ? null : menu)}
                        >
                            {menu}
                        </span>
                        {activeMenu === menu && menuItems[menu as keyof typeof menuItems] && (
                            <div className="absolute top-full left-0 mt-1 bg-[#2d2d2d] border border-[#3d3d3d] rounded shadow-lg min-w-[200px] z-50">
                                {menuItems[menu as keyof typeof menuItems].map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="px-4 py-2 flex justify-between items-center hover:bg-[#3d3d3d] cursor-pointer"
                                        onClick={item.action}
                                    >
                                        <span>{item.label}</span>
                                        <span className="text-[#888] text-[10px]">{item.shortcut}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Spreadsheet Container */}
            <div ref={containerRef} className="w-full flex-1" style={{ minHeight: '500px' }} />

            {/* Open File Dialog */}
            {showOpenDialog && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[#2d2d2d] rounded-lg p-4 w-[400px] max-h-[400px] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-medium">Open Spreadsheet</h3>
                            <button onClick={() => setShowOpenDialog(false)} className="text-white/60 hover:text-white">
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto">
                            {files.length === 0 ? (
                                <p className="text-white/60 text-sm">No spreadsheet files found</p>
                            ) : (
                                files.map(file => (
                                    <div
                                        key={file.id}
                                        className="px-3 py-2 hover:bg-[#3d3d3d] cursor-pointer rounded flex items-center gap-2"
                                        onClick={() => handleOpenFile(file)}
                                    >
                                        <span className="material-symbols-outlined text-sm text-green-400">
                                            table_chart
                                        </span>
                                        <span className="text-white text-sm">{file.name}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Save As Dialog */}
            {showSaveDialog && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[#2d2d2d] rounded-lg p-4 w-[350px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-medium">Save As</h3>
                            <button onClick={() => setShowSaveDialog(false)} className="text-white/60 hover:text-white">
                                ✕
                            </button>
                        </div>
                        <input
                            type="text"
                            value={saveFileName}
                            onChange={e => setSaveFileName(e.target.value)}
                            placeholder="Enter file name (e.g., budget.xlsx)"
                            className="w-full bg-[#1e1e1e] border border-[#3d3d3d] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 mb-4"
                            autoFocus
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveAsConfirm();
                            }}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowSaveDialog(false)}
                                className="px-4 py-1.5 text-sm text-white/80 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAsConfirm}
                                className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog {...dialogProps} />
        </AppContainer>
    );
};
