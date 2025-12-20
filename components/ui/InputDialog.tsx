import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { TextInput } from './TextInput';
import { TextArea } from './TextArea';

interface InputDialogProps {
    isOpen: boolean;
    title: string;
    description?: string;
    label?: string;
    defaultValue?: string;
    placeholder?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isTextArea?: boolean;
    onConfirm: (value: string) => void;
    onCancel: () => void;
}

export const InputDialog = ({
    isOpen,
    title,
    description,
    label,
    defaultValue = '',
    placeholder,
    confirmLabel = 'OK',
    cancelLabel = 'Cancel',
    isTextArea = false,
    onConfirm,
    onCancel,
}: InputDialogProps) => {
    const [value, setValue] = useState(defaultValue);
    const inputRef = useRef<HTMLInputElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
            // Focus after render
            setTimeout(() => {
                if (isTextArea) {
                    textAreaRef.current?.focus();
                } else {
                    inputRef.current?.focus();
                }
            }, 50);
        }
    }, [isOpen, defaultValue, isTextArea]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
            <div className="w-full max-w-[400px] max-h-[calc(var(--app-vh)-var(--safe-area-inset-top)-var(--safe-area-inset-bottom)-2rem)] overflow-y-auto bg-[#202020] border border-white/10 rounded-lg shadow-2xl p-6 flex flex-col gap-4 animate-scale-in">
                <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
                    {description && <p className="text-sm text-white/60">{description}</p>}
                </div>

                <div className="flex flex-col gap-2">
                    {label && <label className="text-sm text-white/80">{label}</label>}
                    {isTextArea ? (
                        <TextArea
                            ref={textAreaRef}
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            placeholder={placeholder}
                            className="min-h-[100px]"
                        />
                    ) : (
                        <TextInput
                            ref={inputRef}
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            placeholder={placeholder}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    onConfirm(value);
                                }
                            }}
                        />
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-2">
                    <Button variant="ghost" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button variant="primary" onClick={() => onConfirm(value)}>
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};
