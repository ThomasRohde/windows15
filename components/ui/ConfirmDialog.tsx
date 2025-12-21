/**
 * ConfirmDialog component for confirmation modals
 * @module components/ui/ConfirmDialog
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button, type ButtonVariant } from './Button';

export interface ConfirmDialogProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Dialog title */
    title: string;
    /** Dialog message/description */
    message: string;
    /** Label for the confirm button */
    confirmLabel?: string;
    /** Label for the cancel button */
    cancelLabel?: string;
    /** Visual variant for the confirm button */
    variant?: 'danger' | 'warning' | 'info';
    /** Icon to show in the dialog */
    icon?: string;
    /** Whether the confirm action is loading */
    loading?: boolean;
    /** Called when the user confirms */
    onConfirm: () => void;
    /** Called when the user cancels */
    onCancel: () => void;
}

const variantConfig: Record<
    'danger' | 'warning' | 'info',
    { buttonVariant: ButtonVariant; iconColor: string; defaultIcon: string }
> = {
    danger: {
        buttonVariant: 'danger',
        iconColor: 'text-red-400',
        defaultIcon: 'warning',
    },
    warning: {
        buttonVariant: 'secondary',
        iconColor: 'text-yellow-400',
        defaultIcon: 'warning',
    },
    info: {
        buttonVariant: 'primary',
        iconColor: 'text-blue-400',
        defaultIcon: 'info',
    },
};

/**
 * A modal confirmation dialog for destructive or important actions.
 * Provides consistent UX for confirmations across all applications.
 *
 * @example
 * ```tsx
 * const [showConfirm, setShowConfirm] = useState(false);
 *
 * <ConfirmDialog
 *   open={showConfirm}
 *   title="Delete Item"
 *   message="Are you sure you want to delete this item? This action cannot be undone."
 *   variant="danger"
 *   confirmLabel="Delete"
 *   onConfirm={() => {
 *     deleteItem();
 *     setShowConfirm(false);
 *   }}
 *   onCancel={() => setShowConfirm(false)}
 * />
 * ```
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'info',
    icon,
    loading = false,
    onConfirm,
    onCancel,
}) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const config = variantConfig[variant];

    // Focus trap and keyboard handling
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!open) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            }
        },
        [open, onCancel]
    );

    useEffect(() => {
        if (open) {
            document.addEventListener('keydown', handleKeyDown);
            // Focus the dialog when it opens for accessibility
            dialogRef.current?.focus();
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, handleKeyDown]);

    // Handle backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onCancel();
        }
    };

    if (!open) {
        return null;
    }

    const dialog = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
        >
            <div
                ref={dialogRef}
                className="bg-gray-800 border border-white/10 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="p-6 flex items-start gap-4">
                    {/* Icon */}
                    <div
                        className={`w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 ${config.iconColor}`}
                    >
                        <span className="material-symbols-outlined text-2xl">{icon || config.defaultIcon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-white mb-2">
                            {title}
                        </h2>
                        <p id="confirm-dialog-message" className="text-white/70 text-sm">
                            {message}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-black/20 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onCancel} disabled={loading}>
                        {cancelLabel}
                    </Button>
                    <Button variant={config.buttonVariant} onClick={onConfirm} loading={loading}>
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') {
        return dialog;
    }

    return createPortal(dialog, document.body);
};

/**
 * Hook for managing confirm dialog state.
 *
 * @example
 * ```tsx
 * const { confirm, dialogProps } = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: 'Delete Item',
 *     message: 'Are you sure?',
 *     variant: 'danger',
 *   });
 *   if (confirmed) {
 *     await deleteItem();
 *   }
 * };
 *
 * return (
 *   <>
 *     <Button onClick={handleDelete}>Delete</Button>
 *     <ConfirmDialog {...dialogProps} />
 *   </>
 * );
 * ```
 */
export function useConfirmDialog() {
    const [state, setState] = React.useState<{
        open: boolean;
        title: string;
        message: string;
        variant: 'danger' | 'warning' | 'info';
        confirmLabel?: string;
        cancelLabel?: string;
        icon?: string;
        resolve?: (value: boolean) => void;
    }>({
        open: false,
        title: '',
        message: '',
        variant: 'info',
    });

    const confirm = useCallback(
        (options: {
            title: string;
            message: string;
            variant?: 'danger' | 'warning' | 'info';
            confirmLabel?: string;
            cancelLabel?: string;
            icon?: string;
        }): Promise<boolean> => {
            return new Promise(resolve => {
                setState({
                    open: true,
                    title: options.title,
                    message: options.message,
                    variant: options.variant || 'info',
                    confirmLabel: options.confirmLabel,
                    cancelLabel: options.cancelLabel,
                    icon: options.icon,
                    resolve,
                });
            });
        },
        []
    );

    const handleConfirm = useCallback(() => {
        state.resolve?.(true);
        setState(prev => ({ ...prev, open: false }));
    }, [state]);

    const handleCancel = useCallback(() => {
        state.resolve?.(false);
        setState(prev => ({ ...prev, open: false }));
    }, [state]);

    const dialogProps: ConfirmDialogProps = {
        open: state.open,
        title: state.title,
        message: state.message,
        variant: state.variant,
        confirmLabel: state.confirmLabel,
        cancelLabel: state.cancelLabel,
        icon: state.icon,
        onConfirm: handleConfirm,
        onCancel: handleCancel,
    };

    return { confirm, dialogProps };
}
