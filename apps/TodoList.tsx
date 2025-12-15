import React, { useMemo, useState } from 'react';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDb, useDexieLiveQuery } from '../utils/storage';
import { generateUuid } from '../utils/uuid';
import { ErrorBanner, ConfirmDialog, Button } from '../components/ui';
import { useAsyncAction } from '../hooks';

type Filter = 'all' | 'active' | 'completed';
type Priority = 'low' | 'medium' | 'high';
type SortMode = 'smart' | 'manual';

type SortableItemRenderProps = {
    setNodeRef: (node: HTMLElement | null) => void;
    style: React.CSSProperties;
    attributes: Record<string, unknown>;
    listeners: Record<string, unknown> | undefined;
    isDragging: boolean;
};

const SortableItem = ({
    id,
    disabled,
    children,
}: {
    id: string;
    disabled: boolean;
    children: (props: SortableItemRenderProps) => React.ReactNode;
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id,
        disabled,
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return children({
        setNodeRef,
        style,
        attributes,
        listeners,
        isDragging,
    });
};

export const TodoList = () => {
    const db = useDb();
    const { value: todosRaw, isLoading: loading } = useDexieLiveQuery(
        () => db.todos.orderBy('createdAt').toArray(),
        [db]
    );
    const todos = Array.isArray(todosRaw) ? todosRaw : [];

    const [input, setInput] = useState('');
    const [filter, setFilter] = useState<Filter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortMode, setSortMode] = useState<SortMode>('smart');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [editPriority, setEditPriority] = useState<Priority | undefined>(undefined);
    const [editDueDate, setEditDueDate] = useState<string>('');
    const [showConfirmation, setShowConfirmation] = useState<'clear' | 'deleteAll' | null>(null);
    const [newTodoPriority, setNewTodoPriority] = useState<Priority | undefined>(undefined);
    const [newTodoDueDate, setNewTodoDueDate] = useState<string>('');

    // Async action hooks for different operations
    const addAction = useAsyncAction({ errorPrefix: 'Failed to add task' });
    const updateAction = useAsyncAction({ errorPrefix: 'Failed to update task' });
    const deleteAction = useAsyncAction({ errorPrefix: 'Failed to delete task' });
    const bulkAction = useAsyncAction();

    // Combine errors from all async actions
    const error = addAction.error || updateAction.error || deleteAction.error || bulkAction.error;
    const clearError = () => {
        addAction.clearError();
        updateAction.clearError();
        deleteAction.clearError();
        bulkAction.clearError();
    };

    const addTodo = async () => {
        const trimmedInput = input.trim();

        // Validation
        if (!trimmedInput) {
            throw new Error('Task cannot be empty');
        }

        if (trimmedInput.length > 500) {
            throw new Error('Task is too long (max 500 characters)');
        }

        await addAction.execute(async () => {
            const now = Date.now();
            const minSortOrder = todos.reduce((min, todo) => {
                const order = typeof todo.sortOrder === 'number' ? todo.sortOrder : todo.createdAt;
                return Math.min(min, order);
            }, Number.POSITIVE_INFINITY);
            const nextSortOrder = Number.isFinite(minSortOrder) ? minSortOrder - 1 : 0;
            await db.todos.add({
                id: `tds${generateUuid()}`,
                text: trimmedInput,
                completed: false,
                priority: newTodoPriority,
                dueDate: newTodoDueDate ? new Date(newTodoDueDate).getTime() : undefined,
                sortOrder: nextSortOrder,
                createdAt: now,
                updatedAt: now,
            });
            setInput('');
            setNewTodoPriority(undefined);
            setNewTodoDueDate('');
        });
    };

    const toggleTodo = async (id: string) => {
        await updateAction.execute(async () => {
            const todo = todos.find(t => t.id === id);
            if (!todo) {
                throw new Error('Task not found');
            }

            await db.todos.update(id, {
                completed: !todo.completed,
                updatedAt: Date.now(),
            });
        });
    };

    const deleteTodo = async (id: string) => {
        await deleteAction.execute(async () => {
            await db.todos.delete(id);
        });
    };

    const startEdit = (id: string, currentText: string, currentPriority?: Priority, currentDueDate?: number) => {
        setEditingId(id);
        setEditText(currentText);
        setEditPriority(currentPriority);
        setEditDueDate(currentDueDate ? new Date(currentDueDate).toISOString().split('T')[0] : '');
        clearError();
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditText('');
        setEditPriority(undefined);
        setEditDueDate('');
    };

    const saveEdit = async (id: string) => {
        const trimmedText = editText.trim();

        if (!trimmedText) {
            throw new Error('Task cannot be empty');
        }

        if (trimmedText.length > 500) {
            throw new Error('Task is too long (max 500 characters)');
        }

        await updateAction.execute(async () => {
            await db.todos.update(id, {
                text: trimmedText,
                priority: editPriority,
                dueDate: editDueDate ? new Date(editDueDate).getTime() : undefined,
                updatedAt: Date.now(),
            });
            setEditingId(null);
            setEditText('');
            setEditPriority(undefined);
            setEditDueDate('');
        });
    };

    const completeAll = async () => {
        await bulkAction.execute(async () => {
            const activeTodos = todos.filter(t => !t.completed);
            const now = Date.now();

            await Promise.all(
                activeTodos.map(todo =>
                    db.todos.update(todo.id, {
                        completed: true,
                        updatedAt: now,
                    })
                )
            );
        });
    };

    const clearCompleted = async () => {
        await bulkAction.execute(async () => {
            const completedIds = todos.filter(t => t.completed).map(t => t.id);
            await db.todos.bulkDelete(completedIds);
            setShowConfirmation(null);
        });
    };

    const deleteAll = async () => {
        await bulkAction.execute(async () => {
            await db.todos.clear();
            setShowConfirmation(null);
        });
    };

    const filteredAndSortedTodos = useMemo(() => {
        const filtered = todos.filter(todo => {
            // Apply status filter
            if (filter === 'active' && todo.completed) return false;
            if (filter === 'completed' && !todo.completed) return false;

            // Apply search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                return todo.text.toLowerCase().includes(query);
            }

            return true;
        });

        if (sortMode === 'manual') {
            return filtered.sort((a, b) => {
                const aOrder = typeof a.sortOrder === 'number' ? a.sortOrder : a.createdAt;
                const bOrder = typeof b.sortOrder === 'number' ? b.sortOrder : b.createdAt;
                return aOrder - bOrder;
            });
        }

        // Sort by: 1) completed status, 2) priority, 3) due date, 4) created date
        return filtered.sort((a, b) => {
            // Completed items go last
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }

            // Priority order: high > medium > low > none
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const aPriority = a.priority ? priorityOrder[a.priority] : 0;
            const bPriority = b.priority ? priorityOrder[b.priority] : 0;
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }

            // Due date: earlier dates first
            if (a.dueDate !== b.dueDate) {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return a.dueDate - b.dueDate;
            }

            // Created date: newer first
            return b.createdAt - a.createdAt;
        });
    }, [todos, filter, searchQuery, sortMode]);

    const activeCount = todos.filter(t => !t.completed).length;
    const completedCount = todos.length - activeCount;

    const reorderEnabled = sortMode === 'manual' && filter === 'all' && !searchQuery.trim() && editingId === null;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const onDragEnd = async ({ active, over }: DragEndEvent) => {
        if (!reorderEnabled) return;
        if (!over) return;

        const activeId = String(active.id);
        const overId = String(over.id);
        if (activeId === overId) return;

        const oldIndex = filteredAndSortedTodos.findIndex(todo => todo.id === activeId);
        const newIndex = filteredAndSortedTodos.findIndex(todo => todo.id === overId);
        if (oldIndex === -1 || newIndex === -1) return;

        const newOrder = arrayMove(filteredAndSortedTodos, oldIndex, newIndex);
        const now = Date.now();

        await bulkAction.execute(async () => {
            await db.transaction('rw', db.todos, async () => {
                for (let i = 0; i < newOrder.length; i++) {
                    await db.todos.update(newOrder[i].id, { sortOrder: i, updatedAt: now });
                }
            });
        });
    };

    const getPriorityColor = (priority?: Priority) => {
        if (!priority) return 'bg-white/10 text-white/40';
        switch (priority) {
            case 'high':
                return 'bg-red-500/20 text-red-300 border-red-500/30';
            case 'medium':
                return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
            case 'low':
                return 'bg-green-500/20 text-green-300 border-green-500/30';
        }
    };

    const getPriorityBorder = (priority?: Priority) => {
        if (!priority) return '';
        switch (priority) {
            case 'high':
                return 'border-l-4 border-l-red-500';
            case 'medium':
                return 'border-l-4 border-l-yellow-500';
            case 'low':
                return 'border-l-4 border-l-green-500';
        }
    };

    const isOverdue = (dueDate?: number) => {
        if (!dueDate) return false;
        return dueDate < Date.now();
    };

    const formatDueDate = (dueDate?: number) => {
        if (!dueDate) return null;
        const date = new Date(dueDate);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        today.setHours(0, 0, 0, 0);
        tomorrow.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);

        if (date.getTime() === today.getTime()) return 'Today';
        if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
        if (date < today) return `Overdue (${date.toLocaleDateString()})`;
        return date.toLocaleDateString();
    };

    return (
        <div className="h-full bg-background-dark p-4 flex flex-col gap-4">
            <ConfirmDialog
                open={showConfirmation !== null}
                title={showConfirmation === 'clear' ? 'Clear Completed Tasks?' : 'Delete All Tasks?'}
                message={
                    showConfirmation === 'clear'
                        ? `This will permanently delete ${completedCount} completed task${completedCount !== 1 ? 's' : ''}. This action cannot be undone.`
                        : `This will permanently delete all ${todos.length} task${todos.length !== 1 ? 's' : ''}. This action cannot be undone.`
                }
                variant="danger"
                confirmLabel="Delete"
                onConfirm={() => {
                    if (showConfirmation === 'clear') {
                        clearCompleted();
                    } else {
                        deleteAll();
                    }
                    setShowConfirmation(null);
                }}
                onCancel={() => setShowConfirmation(null)}
            />

            {error && <ErrorBanner message={error} onDismiss={clearError} />}

            <div className="space-y-2">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !addAction.loading && addTodo()}
                        placeholder="Add a new task..."
                        disabled={addAction.loading}
                        maxLength={500}
                        className="flex-1 bg-black/30 text-white px-4 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <Button
                        onClick={addTodo}
                        disabled={addAction.disabled}
                        loading={addAction.loading}
                        variant="secondary"
                    >
                        Add
                    </Button>
                </div>

                <div className="flex gap-2 flex-wrap items-center">
                    <select
                        value={newTodoPriority || ''}
                        onChange={e => setNewTodoPriority((e.target.value as Priority) || undefined)}
                        className="bg-black/30 text-white px-3 py-1 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 text-sm"
                    >
                        <option value="">No priority</option>
                        <option value="low">Low priority</option>
                        <option value="medium">Medium priority</option>
                        <option value="high">High priority</option>
                    </select>

                    <input
                        type="date"
                        value={newTodoDueDate}
                        onChange={e => setNewTodoDueDate(e.target.value)}
                        className="bg-black/30 text-white px-3 py-1 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 text-sm"
                    />

                    {(newTodoPriority || newTodoDueDate) && (
                        <button
                            onClick={() => {
                                setNewTodoPriority(undefined);
                                setNewTodoDueDate('');
                            }}
                            className="text-white/50 hover:text-white text-xs"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            <div className="flex gap-2 items-center">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search tasks..."
                    className="flex-1 bg-black/30 text-white px-3 py-1 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 text-sm min-w-0"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="text-white/50 hover:text-white text-xs"
                        title="Clear search"
                    >
                        ✕
                    </button>
                )}
            </div>

            <div className="flex gap-2 flex-wrap">
                <div className="flex gap-2">
                    {(['all', 'active', 'completed'] as Filter[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1 rounded-lg text-sm transition-colors capitalize ${
                                filter === f ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                    <button
                        onClick={() => setSortMode(sortMode === 'smart' ? 'manual' : 'smart')}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                            sortMode === 'manual'
                                ? 'bg-purple-500/20 text-purple-200 hover:bg-purple-500/30'
                                : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                        title={
                            sortMode === 'manual'
                                ? 'Manual ordering enabled'
                                : 'Enable manual ordering (drag-to-reorder in All view)'
                        }
                    >
                        {sortMode === 'manual' ? 'Manual Order' : 'Smart Sort'}
                    </button>
                </div>

                {todos.length > 0 && (
                    <div className="flex gap-2 ml-auto">
                        {activeCount > 0 && (
                            <button
                                onClick={completeAll}
                                className="px-3 py-1 rounded-lg text-sm bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors"
                                title="Mark all tasks as completed"
                            >
                                Complete All
                            </button>
                        )}
                        {completedCount > 0 && (
                            <button
                                onClick={() => setShowConfirmation('clear')}
                                className="px-3 py-1 rounded-lg text-sm bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 transition-colors"
                                title="Delete all completed tasks"
                            >
                                Clear Completed
                            </button>
                        )}
                        <button
                            onClick={() => setShowConfirmation('deleteAll')}
                            className="px-3 py-1 rounded-lg text-sm bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
                            title="Delete all tasks"
                        >
                            Delete All
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
                {loading ? (
                    <div className="text-white/40 text-center py-8">Loading tasks...</div>
                ) : filteredAndSortedTodos.length === 0 ? (
                    <div className="text-white/40 text-center py-8">
                        {searchQuery
                            ? `No tasks matching "${searchQuery}"`
                            : filter === 'all'
                              ? 'No tasks yet'
                              : `No ${filter} tasks`}
                    </div>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                        <SortableContext
                            items={filteredAndSortedTodos.map(todo => todo.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {filteredAndSortedTodos.map(todo => (
                                <SortableItem key={todo.id} id={todo.id} disabled={!reorderEnabled}>
                                    {({ setNodeRef, style, attributes, listeners, isDragging }) => (
                                        <div
                                            ref={setNodeRef}
                                            style={style}
                                            className={`flex items-start gap-3 bg-black/20 p-3 rounded-lg group ${getPriorityBorder(todo.priority)} ${
                                                isOverdue(todo.dueDate) && !todo.completed ? 'bg-red-500/10' : ''
                                            } ${isDragging ? 'opacity-80' : ''}`}
                                        >
                                            {sortMode === 'manual' && (
                                                <button
                                                    type="button"
                                                    {...attributes}
                                                    {...(reorderEnabled ? (listeners ?? {}) : {})}
                                                    disabled={!reorderEnabled}
                                                    className={`mt-0.5 px-1 text-white/40 select-none ${
                                                        reorderEnabled
                                                            ? 'cursor-grab active:cursor-grabbing hover:text-white/70'
                                                            : 'cursor-not-allowed opacity-40'
                                                    }`}
                                                    title={
                                                        reorderEnabled
                                                            ? 'Drag to reorder'
                                                            : 'Reorder is available in All view with empty search'
                                                    }
                                                    aria-label="Reorder task"
                                                >
                                                    ⋮⋮
                                                </button>
                                            )}

                                            <input
                                                type="checkbox"
                                                checked={todo.completed}
                                                onChange={() => toggleTodo(todo.id)}
                                                disabled={editingId === todo.id}
                                                className="w-5 h-5 mt-0.5 rounded accent-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            />

                                            {editingId === todo.id ? (
                                                <div className="flex-1 space-y-2 bg-blue-500/10 border border-blue-500/30 rounded px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={editText}
                                                        onChange={e => setEditText(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') saveEdit(todo.id);
                                                            if (e.key === 'Escape') cancelEdit();
                                                        }}
                                                        maxLength={500}
                                                        autoFocus
                                                        className="w-full bg-transparent text-white outline-none"
                                                    />
                                                    <div className="flex gap-2 flex-wrap items-center">
                                                        <select
                                                            value={editPriority || ''}
                                                            onChange={e =>
                                                                setEditPriority(
                                                                    (e.target.value as Priority) || undefined
                                                                )
                                                            }
                                                            className="bg-black/30 text-white px-2 py-1 rounded text-xs border border-white/10"
                                                        >
                                                            <option value="">No priority</option>
                                                            <option value="low">Low</option>
                                                            <option value="medium">Medium</option>
                                                            <option value="high">High</option>
                                                        </select>
                                                        <input
                                                            type="date"
                                                            value={editDueDate}
                                                            onChange={e => setEditDueDate(e.target.value)}
                                                            className="bg-black/30 text-white px-2 py-1 rounded text-xs border border-white/10"
                                                        />
                                                        <div className="flex gap-1 ml-auto">
                                                            <button
                                                                onClick={() => saveEdit(todo.id)}
                                                                className="text-green-400 hover:text-green-300 px-2 py-1"
                                                                title="Save (Enter)"
                                                            >
                                                                ✓
                                                            </button>
                                                            <button
                                                                onClick={cancelEdit}
                                                                className="text-red-400 hover:text-red-300 px-2 py-1"
                                                                title="Cancel (Esc)"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex-1 min-w-0">
                                                        <div
                                                            onDoubleClick={() =>
                                                                !todo.completed &&
                                                                startEdit(
                                                                    todo.id,
                                                                    todo.text,
                                                                    todo.priority,
                                                                    todo.dueDate
                                                                )
                                                            }
                                                            className={`text-white ${todo.completed ? 'line-through text-white/40' : 'cursor-text'}`}
                                                            title={!todo.completed ? 'Double-click to edit' : ''}
                                                        >
                                                            {todo.text}
                                                        </div>
                                                        <div className="flex gap-2 mt-1 flex-wrap">
                                                            {todo.priority && (
                                                                <span
                                                                    className={`text-xs px-2 py-0.5 rounded border ${getPriorityColor(todo.priority)}`}
                                                                >
                                                                    {todo.priority}
                                                                </span>
                                                            )}
                                                            {todo.dueDate && (
                                                                <span
                                                                    className={`text-xs px-2 py-0.5 rounded ${
                                                                        isOverdue(todo.dueDate) && !todo.completed
                                                                            ? 'bg-red-500/30 text-red-200'
                                                                            : 'bg-white/10 text-white/60'
                                                                    }`}
                                                                >
                                                                    {formatDueDate(todo.dueDate)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => deleteTodo(todo.id)}
                                                        className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-300 transition-opacity px-2"
                                                    >
                                                        ✕
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </SortableItem>
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            <div className="text-white/50 text-sm">
                {activeCount} task{activeCount !== 1 ? 's' : ''} remaining
            </div>
        </div>
    );
};
