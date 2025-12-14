import React, { useState } from 'react';
import { useDb, useDexieLiveQuery } from '../utils/storage';
import { generateUuid } from '../utils/uuid';

type Filter = 'all' | 'active' | 'completed';

export const TodoList = () => {
    const db = useDb();
    const { value: todosRaw, isLoading: loading } = useDexieLiveQuery(
        () => db.todos.orderBy('createdAt').toArray(),
        [db]
    );
    const todos = Array.isArray(todosRaw) ? todosRaw : [];

    const [input, setInput] = useState('');
    const [filter, setFilter] = useState<Filter>('all');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [showConfirmation, setShowConfirmation] = useState<'clear' | 'deleteAll' | null>(null);

    const addTodo = async () => {
        const trimmedInput = input.trim();

        // Validation
        if (!trimmedInput) {
            setError('Task cannot be empty');
            return;
        }

        if (trimmedInput.length > 500) {
            setError('Task is too long (max 500 characters)');
            return;
        }

        // Prevent duplicate submissions
        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const now = Date.now();
            await db.todos.add({
                id: `tds${generateUuid()}`,
                text: trimmedInput,
                completed: false,
                createdAt: now,
                updatedAt: now,
            });
            setInput('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add task');
            console.error('Error adding todo:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleTodo = async (id: string) => {
        try {
            const todo = todos.find(t => t.id === id);
            if (!todo) {
                setError('Task not found');
                return;
            }

            await db.todos.update(id, {
                completed: !todo.completed,
                updatedAt: Date.now(),
            });
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update task');
            console.error('Error toggling todo:', err);
        }
    };

    const deleteTodo = async (id: string) => {
        try {
            await db.todos.delete(id);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete task');
            console.error('Error deleting todo:', err);
        }
    };

    const startEdit = (id: string, currentText: string) => {
        setEditingId(id);
        setEditText(currentText);
        setError(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditText('');
    };

    const saveEdit = async (id: string) => {
        const trimmedText = editText.trim();

        if (!trimmedText) {
            setError('Task cannot be empty');
            return;
        }

        if (trimmedText.length > 500) {
            setError('Task is too long (max 500 characters)');
            return;
        }

        try {
            await db.todos.update(id, {
                text: trimmedText,
                updatedAt: Date.now(),
            });
            setEditingId(null);
            setEditText('');
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update task');
            console.error('Error updating todo:', err);
        }
    };

    const completeAll = async () => {
        try {
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
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to complete all tasks');
            console.error('Error completing all todos:', err);
        }
    };

    const clearCompleted = async () => {
        try {
            const completedIds = todos.filter(t => t.completed).map(t => t.id);
            await db.todos.bulkDelete(completedIds);
            setError(null);
            setShowConfirmation(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to clear completed tasks');
            console.error('Error clearing completed todos:', err);
        }
    };

    const deleteAll = async () => {
        try {
            await db.todos.clear();
            setError(null);
            setShowConfirmation(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete all tasks');
            console.error('Error deleting all todos:', err);
        }
    };

    const filteredTodos = todos.filter(todo => {
        if (filter === 'active') return !todo.completed;
        if (filter === 'completed') return todo.completed;
        return true;
    });

    const activeCount = todos.filter(t => !t.completed).length;
    const completedCount = todos.length - activeCount;

    return (
        <div className="h-full bg-[#1e1e1e] p-4 flex flex-col gap-4">
            {showConfirmation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[#2d2d2d] border border-white/20 rounded-lg p-6 max-w-md mx-4">
                        <h3 className="text-white text-lg font-semibold mb-2">
                            {showConfirmation === 'clear' ? 'Clear Completed Tasks?' : 'Delete All Tasks?'}
                        </h3>
                        <p className="text-white/70 mb-4">
                            {showConfirmation === 'clear'
                                ? `This will permanently delete ${completedCount} completed task${completedCount !== 1 ? 's' : ''}. This action cannot be undone.`
                                : `This will permanently delete all ${todos.length} task${todos.length !== 1 ? 's' : ''}. This action cannot be undone.`}
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setShowConfirmation(null)}
                                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={showConfirmation === 'clear' ? clearCompleted : deleteAll}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-400 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg flex items-center justify-between">
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-300 hover:text-red-100 ml-2"
                        aria-label="Dismiss error"
                    >
                        ✕
                    </button>
                </div>
            )}

            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !isSubmitting && addTodo()}
                    placeholder="Add a new task..."
                    disabled={isSubmitting}
                    maxLength={500}
                    className="flex-1 bg-black/30 text-white px-4 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                    onClick={addTodo}
                    disabled={isSubmitting}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
                >
                    {isSubmitting ? 'Adding...' : 'Add'}
                </button>
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
                ) : filteredTodos.length === 0 ? (
                    <div className="text-white/40 text-center py-8">
                        {filter === 'all' ? 'No tasks yet' : `No ${filter} tasks`}
                    </div>
                ) : (
                    filteredTodos.map(todo => (
                        <div key={todo.id} className="flex items-center gap-3 bg-black/20 p-3 rounded-lg group">
                            <input
                                type="checkbox"
                                checked={todo.completed}
                                onChange={() => toggleTodo(todo.id)}
                                disabled={editingId === todo.id}
                                className="w-5 h-5 rounded accent-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            />

                            {editingId === todo.id ? (
                                <div className="flex-1 flex gap-2 items-center bg-blue-500/10 border border-blue-500/30 rounded px-2 py-1">
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
                                        className="flex-1 bg-transparent text-white outline-none"
                                    />
                                    <button
                                        onClick={() => saveEdit(todo.id)}
                                        className="text-green-400 hover:text-green-300 px-1"
                                        title="Save (Enter)"
                                    >
                                        ✓
                                    </button>
                                    <button
                                        onClick={cancelEdit}
                                        className="text-red-400 hover:text-red-300 px-1"
                                        title="Cancel (Esc)"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <span
                                        onDoubleClick={() => !todo.completed && startEdit(todo.id, todo.text)}
                                        className={`flex-1 text-white ${todo.completed ? 'line-through text-white/40' : 'cursor-text'}`}
                                        title={!todo.completed ? 'Double-click to edit' : ''}
                                    >
                                        {todo.text}
                                    </span>
                                    <button
                                        onClick={() => deleteTodo(todo.id)}
                                        className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-300 transition-opacity px-2"
                                    >
                                        ✕
                                    </button>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className="text-white/50 text-sm">
                {activeCount} task{activeCount !== 1 ? 's' : ''} remaining
            </div>
        </div>
    );
};
