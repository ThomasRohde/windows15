import React, { useEffect, useMemo, useRef, useState } from 'react';
import { STORAGE_KEYS, storageService, useDexieLiveQuery } from '../utils/storage';
import { SkeletonCalendar } from '../components/LoadingSkeleton';

type CalendarEvent = {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD
    allDay: boolean;
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    location: string;
    notes: string;
};

type EventDraft = Omit<CalendarEvent, 'id'> & { id?: string };

const createId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 11);

const pad2 = (value: number) => value.toString().padStart(2, '0');

const toYmd = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const fromYmd = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
};

const addMonths = (date: Date, delta: number) => new Date(date.getFullYear(), date.getMonth() + delta, 1);

const compareTime = (a: CalendarEvent, b: CalendarEvent) => {
    const aKey = a.allDay ? '00:00' : a.startTime;
    const bKey = b.allDay ? '00:00' : b.startTime;
    return aKey.localeCompare(bKey);
};

const eventStartDate = (event: CalendarEvent) => {
    const date = fromYmd(event.date);
    const time = event.allDay ? '00:00' : event.startTime;
    const [h, m] = time.split(':').map(Number);
    date.setHours(h || 0, m || 0, 0, 0);
    return date;
};

const seedEvents = (): CalendarEvent[] => {
    const today = new Date();
    const inTwoDays = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
    const nextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);

    return [
        {
            id: createId(),
            title: 'Design Review',
            date: toYmd(inTwoDays),
            allDay: false,
            startTime: '10:00',
            endTime: '11:30',
            location: 'Conference Room A',
            notes: 'Review the updated desktop widgets and mail/calendar layouts.',
        },
        {
            id: createId(),
            title: 'Sprint Planning',
            date: toYmd(nextWeek),
            allDay: false,
            startTime: '09:00',
            endTime: '10:00',
            location: 'Teams',
            notes: '',
        },
        {
            id: createId(),
            title: 'Pay rent',
            date: `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-01`,
            allDay: true,
            startTime: '00:00',
            endTime: '23:59',
            location: '',
            notes: '',
        },
    ];
};

const buildMonthGrid = (month: Date) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const first = new Date(year, monthIndex, 1);
    const firstWeekday = first.getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

    const cells: { date: Date; inMonth: boolean; ymd: string }[] = [];

    for (let i = 0; i < 42; i++) {
        const dayOffset = i - firstWeekday;
        const inMonth = dayOffset >= 0 && dayOffset < daysInMonth;
        const dayNumber = inMonth
            ? dayOffset + 1
            : dayOffset < 0
              ? daysInPrevMonth + dayOffset + 1
              : dayOffset - daysInMonth + 1;
        const cellDate = new Date(year, monthIndex, dayNumber);
        cells.push({ date: cellDate, inMonth, ymd: toYmd(cellDate) });
    }

    return cells;
};

const normalizeInitialDate = (value?: string) => {
    if (!value) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const normalized = toYmd(fromYmd(value));
    return normalized === value ? value : null;
};

export const Calendar = ({ initialDate }: { initialDate?: string }) => {
    const { value: persistedEvents, isLoading: isLoadingEvents } = useDexieLiveQuery(
        () => storageService.get<CalendarEvent[]>(STORAGE_KEYS.calendarEvents),
        [STORAGE_KEYS.calendarEvents]
    );
    const hasInitializedRef = useRef(false);

    // Initialize events on first load only, then stay reactive to persistedEvents
    const events = useMemo(() => {
        if (isLoadingEvents) {
            // During loading, return empty array or previously loaded events
            return hasInitializedRef.current && Array.isArray(persistedEvents) ? persistedEvents : [];
        }

        if (!hasInitializedRef.current) {
            hasInitializedRef.current = true;

            // Initialize with seed data if no persisted events
            if (!Array.isArray(persistedEvents)) {
                const seeded = seedEvents();
                storageService.set(STORAGE_KEYS.calendarEvents, seeded).catch(() => undefined);
                return seeded;
            }
        }

        // Return persisted events (reactive to changes)
        return Array.isArray(persistedEvents) ? persistedEvents : [];
    }, [isLoadingEvents, persistedEvents]);

    const [monthCursor, setMonthCursor] = useState(() => {
        const start = normalizeInitialDate(initialDate) ?? toYmd(new Date());
        const date = fromYmd(start);
        return new Date(date.getFullYear(), date.getMonth(), 1);
    });
    const [selectedDate, setSelectedDate] = useState(() => normalizeInitialDate(initialDate) ?? toYmd(new Date()));
    const [draft, setDraft] = useState<EventDraft | null>(null);
    const [draftError, setDraftError] = useState<string | null>(null);

    useEffect(() => {
        const start = normalizeInitialDate(initialDate);
        if (!start) return;
        setSelectedDate(start);
        const date = fromYmd(start);
        setMonthCursor(new Date(date.getFullYear(), date.getMonth(), 1));
    }, [initialDate]);

    const eventsByDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};
        for (const event of events) {
            map[event.date] ||= [];
            map[event.date]!.push(event);
        }
        for (const key of Object.keys(map)) {
            map[key]!.sort(compareTime);
        }
        return map;
    }, [events]);

    const monthGrid = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);

    const selectedEvents = useMemo(() => {
        return (eventsByDate[selectedDate] ?? []).slice().sort(compareTime);
    }, [eventsByDate, selectedDate]);

    const todayYmd = useMemo(() => toYmd(new Date()), []);

    const monthLabel = useMemo(() => {
        return monthCursor.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    }, [monthCursor]);

    const selectedLabel = useMemo(() => {
        return fromYmd(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    }, [selectedDate]);

    const openNewEvent = (prefillDate?: string) => {
        setDraftError(null);
        const date = prefillDate ?? selectedDate;
        setDraft({
            date,
            title: '',
            allDay: false,
            startTime: '09:00',
            endTime: '10:00',
            location: '',
            notes: '',
        });
    };

    const openEditEvent = (event: CalendarEvent) => {
        setDraftError(null);
        setDraft({ ...event });
    };

    const closeDraft = () => {
        setDraft(null);
        setDraftError(null);
    };

    const saveEvent = async () => {
        if (!draft) return;
        const title = draft.title.trim();
        if (!title) {
            setDraftError('Title is required.');
            return;
        }

        const start = draft.allDay ? '00:00' : draft.startTime;
        const end = draft.allDay ? '23:59' : draft.endTime;

        if (!draft.allDay && start >= end) {
            setDraftError('End time must be after start time.');
            return;
        }

        const normalized: CalendarEvent = {
            id: draft.id ?? createId(),
            title,
            date: draft.date,
            allDay: draft.allDay,
            startTime: start,
            endTime: end,
            location: draft.location.trim(),
            notes: draft.notes,
        };

        // Update storage directly - useDexieLiveQuery will trigger UI update
        const idx = events.findIndex(event => event.id === normalized.id);
        const updatedEvents =
            idx === -1
                ? [...events, normalized].sort((a, b) => eventStartDate(a).getTime() - eventStartDate(b).getTime())
                : events.map(event => (event.id === normalized.id ? normalized : event));

        await storageService.set(STORAGE_KEYS.calendarEvents, updatedEvents);
        setSelectedDate(normalized.date);
        closeDraft();
    };

    const deleteEvent = async (id: string) => {
        // Update storage directly - useDexieLiveQuery will trigger UI update
        const updatedEvents = events.filter(event => event.id !== id);
        await storageService.set(STORAGE_KEYS.calendarEvents, updatedEvents);
        closeDraft();
    };

    return (
        <div className="h-full w-full bg-background-dark text-white flex flex-col">
            {/* Header */}
            <div className="h-14 shrink-0 border-b border-white/5 bg-black/20 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setMonthCursor(addMonths(monthCursor, -1))}
                        className="w-9 h-9 rounded-lg hover:bg-white/10 text-white/70 flex items-center justify-center"
                        title="Previous month"
                    >
                        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                    </button>
                    <button
                        onClick={() => setMonthCursor(addMonths(monthCursor, 1))}
                        className="w-9 h-9 rounded-lg hover:bg-white/10 text-white/70 flex items-center justify-center"
                        title="Next month"
                    >
                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </button>
                    <button
                        onClick={() => {
                            const today = new Date();
                            setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1));
                            setSelectedDate(toYmd(today));
                        }}
                        className="px-3 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white/90"
                    >
                        Today
                    </button>
                    <div className="ml-2 text-lg font-medium text-white/90">{monthLabel}</div>
                </div>

                <button
                    onClick={() => openNewEvent()}
                    className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center gap-2"
                >
                    <span
                        className="material-symbols-outlined text-[18px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                        add
                    </span>
                    New event
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 flex">
                {/* Month Grid */}
                <div className="flex-1 min-w-0 p-4">
                    {isLoadingEvents ? (
                        <SkeletonCalendar />
                    ) : (
                        <>
                            <div className="grid grid-cols-7 gap-2 text-xs text-white/50 px-1">
                                <span className="text-center">Sun</span>
                                <span className="text-center">Mon</span>
                                <span className="text-center">Tue</span>
                                <span className="text-center">Wed</span>
                                <span className="text-center">Thu</span>
                                <span className="text-center">Fri</span>
                                <span className="text-center">Sat</span>
                            </div>

                            <div className="mt-2 grid grid-cols-7 gap-2 auto-rows-fr h-[calc(100%-26px)]">
                                {monthGrid.map(cell => {
                                    const isToday = cell.ymd === todayYmd;
                                    const isSelected = cell.ymd === selectedDate;
                                    const dayEvents = eventsByDate[cell.ymd] ?? [];

                                    return (
                                        <button
                                            key={cell.ymd}
                                            onClick={() => setSelectedDate(cell.ymd)}
                                            className={`rounded-xl border transition-colors text-left p-2 min-h-[84px] flex flex-col gap-1
                                        ${cell.inMonth ? 'bg-black/10 border-white/10 hover:bg-white/5' : 'bg-black/5 border-white/5 text-white/30 hover:bg-white/5'}
                                        ${isSelected ? 'ring-2 ring-primary/60 border-primary/30' : ''}
                                    `}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span
                                                    className={`text-xs font-semibold ${isToday ? 'text-primary' : cell.inMonth ? 'text-white/80' : 'text-white/30'}`}
                                                >
                                                    {cell.date.getDate()}
                                                </span>
                                                {isToday && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                                                        Today
                                                    </span>
                                                )}
                                            </div>

                                            {dayEvents.length > 0 && (
                                                <div className="mt-auto flex flex-col gap-1">
                                                    {dayEvents.slice(0, 2).map(event => (
                                                        <div
                                                            key={event.id}
                                                            className="text-[10px] px-2 py-1 rounded bg-white/10 text-white/80 truncate"
                                                            title={event.title}
                                                        >
                                                            {event.allDay ? 'All day' : event.startTime} · {event.title}
                                                        </div>
                                                    ))}
                                                    {dayEvents.length > 2 && (
                                                        <div className="text-[10px] text-white/40 px-1">
                                                            +{dayEvents.length - 2} more
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Agenda */}
                <div className="w-80 shrink-0 border-l border-white/5 bg-black/10 flex flex-col">
                    <div className="p-4 border-b border-white/5 bg-black/20">
                        <div className="text-sm font-medium text-white/90">{selectedLabel}</div>
                        <button
                            onClick={() => openNewEvent(selectedDate)}
                            className="mt-3 w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white/90 flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            Add event
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {selectedEvents.length === 0 ? (
                            <div className="text-sm text-white/50 mt-6 text-center">No events for this day.</div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {selectedEvents.map(event => (
                                    <button
                                        key={event.id}
                                        onClick={() => openEditEvent(event)}
                                        className="text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-white/90 truncate">
                                                    {event.title}
                                                </div>
                                                <div className="mt-0.5 text-[11px] text-white/50">
                                                    {event.allDay ? 'All day' : `${event.startTime} – ${event.endTime}`}
                                                    {event.location ? ` · ${event.location}` : ''}
                                                </div>
                                            </div>
                                            <span className="material-symbols-outlined text-white/40 text-[18px]">
                                                chevron_right
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Event modal */}
            {draft && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/60">
                    <div className="w-full max-w-xl glass-panel rounded-xl overflow-hidden shadow-2xl">
                        <div className="h-12 px-4 flex items-center justify-between border-b border-white/10 bg-black/20">
                            <div className="text-sm font-medium text-white/90">
                                {draft.id ? 'Edit event' : 'New event'}
                            </div>
                            <button
                                onClick={closeDraft}
                                className="w-8 h-8 rounded-lg hover:bg-white/10 text-white/70 flex items-center justify-center"
                                title="Close"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>

                        {draftError && (
                            <div className="px-4 py-2 text-xs bg-red-500/15 text-red-100 border-b border-red-500/20">
                                {draftError}
                            </div>
                        )}

                        <div className="p-4 grid grid-cols-1 gap-3">
                            <label className="flex flex-col gap-1">
                                <span className="text-xs text-white/60">Title</span>
                                <input
                                    value={draft.title}
                                    onChange={e => setDraft(prev => (prev ? { ...prev, title: e.target.value } : prev))}
                                    className="h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                                    placeholder="Event title"
                                />
                            </label>

                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs text-white/60">Date</span>
                                    <input
                                        type="date"
                                        value={draft.date}
                                        onChange={e =>
                                            setDraft(prev => (prev ? { ...prev, date: e.target.value } : prev))
                                        }
                                        className="h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                                    />
                                </label>

                                <label className="flex items-center gap-2 mt-6">
                                    <input
                                        type="checkbox"
                                        checked={draft.allDay}
                                        onChange={e =>
                                            setDraft(prev => (prev ? { ...prev, allDay: e.target.checked } : prev))
                                        }
                                        className="rounded border-white/20 bg-black/30"
                                    />
                                    <span className="text-sm text-white/80">All day</span>
                                </label>
                            </div>

                            {!draft.allDay && (
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="flex flex-col gap-1">
                                        <span className="text-xs text-white/60">Start</span>
                                        <input
                                            type="time"
                                            value={draft.startTime}
                                            onChange={e =>
                                                setDraft(prev => (prev ? { ...prev, startTime: e.target.value } : prev))
                                            }
                                            className="h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                                        />
                                    </label>
                                    <label className="flex flex-col gap-1">
                                        <span className="text-xs text-white/60">End</span>
                                        <input
                                            type="time"
                                            value={draft.endTime}
                                            onChange={e =>
                                                setDraft(prev => (prev ? { ...prev, endTime: e.target.value } : prev))
                                            }
                                            className="h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                                        />
                                    </label>
                                </div>
                            )}

                            <label className="flex flex-col gap-1">
                                <span className="text-xs text-white/60">Location</span>
                                <input
                                    value={draft.location}
                                    onChange={e =>
                                        setDraft(prev => (prev ? { ...prev, location: e.target.value } : prev))
                                    }
                                    className="h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                                    placeholder="Where?"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs text-white/60">Notes</span>
                                <textarea
                                    value={draft.notes}
                                    onChange={e => setDraft(prev => (prev ? { ...prev, notes: e.target.value } : prev))}
                                    className="h-28 resize-none px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                                    placeholder="Add details…"
                                />
                            </label>
                        </div>

                        <div className="px-4 py-3 flex items-center justify-between border-t border-white/10 bg-black/20">
                            {draft.id ? (
                                <button
                                    onClick={() => deleteEvent(draft.id!)}
                                    className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs text-red-100"
                                >
                                    Delete
                                </button>
                            ) : (
                                <div />
                            )}

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={closeDraft}
                                    className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white/90"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveEvent}
                                    className="px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-xs text-white font-medium"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
