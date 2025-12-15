/**
 * AppSidebar component for app navigation
 * @module components/ui/AppSidebar
 */

import React from 'react';

export interface SidebarItem<T extends string> {
    id: T;
    label: string;
    icon: string;
    badge?: number;
}

export interface AppSidebarProps<T extends string> {
    items: SidebarItem<T>[];
    active: T;
    onChange: (id: T) => void;
    title?: string;
    /** Width class (default: w-60) */
    width?: string;
    /** Additional className for the container */
    className?: string;
}

/**
 * A vertical sidebar navigation component for apps with multiple sections.
 * Used in Settings, Mail, and other multi-section apps.
 *
 * @example
 * ```tsx
 * const [section, setSection] = useState<'inbox' | 'sent' | 'drafts'>('inbox');
 *
 * <AppSidebar
 *   title="Mail"
 *   items={[
 *     { id: 'inbox', label: 'Inbox', icon: 'inbox', badge: 3 },
 *     { id: 'sent', label: 'Sent', icon: 'send' },
 *     { id: 'drafts', label: 'Drafts', icon: 'draft' },
 *   ]}
 *   active={section}
 *   onChange={setSection}
 * />
 * ```
 */
export function AppSidebar<T extends string>({
    items,
    active,
    onChange,
    title,
    width = 'w-60',
    className = '',
}: AppSidebarProps<T>) {
    return (
        <div className={`${width} bg-black/20 p-4 border-r border-white/5 flex flex-col ${className}`}>
            {title && <h2 className="text-xl font-semibold mb-6 px-2">{title}</h2>}
            <div className="flex flex-col gap-1">
                {items.map(item => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onChange(item.id)}
                        className={`p-2 rounded flex items-center gap-3 text-left ${
                            active === item.id ? 'bg-white/10' : 'hover:bg-white/5 text-white/70'
                        }`}
                    >
                        <span className={`material-symbols-outlined ${active === item.id ? 'text-primary' : ''}`}>
                            {item.icon}
                        </span>
                        <span className="text-sm font-medium flex-1">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                            <span className="bg-primary text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                {item.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
