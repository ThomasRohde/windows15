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
                id: generateUuid(),
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

    const filteredTodos = todos.filter(todo => {
        if (filter === 'active') return !todo.completed;
        if (filter === 'completed') return todo.completed;
        return true;
    });

    const activeCount = todos.filter(t => !t.completed).length;

    return (
        <div className="h-full bg-[#1e1e1e] p-4 flex flex-col gap-4">
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
                                className="w-5 h-5 rounded accent-blue-500 cursor-pointer"
                            />
                            <span className={`flex-1 text-white ${todo.completed ? 'line-through text-white/40' : ''}`}>
                                {todo.text}
                            </span>
                            <button
                                onClick={() => deleteTodo(todo.id)}
                                className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-300 transition-opacity px-2"
                            >
                                ✕
                            </button>
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
