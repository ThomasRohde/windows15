import React, { useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../utils/storage';
import { SkeletonCalendar } from '../components/LoadingSkeleton';
import { useLocalization } from '../context';
import { generateUuid } from '../utils/uuid';
import { TextArea, EmptyState } from '../components/ui';
import { Checkbox } from '../components/ui';
import { required, validateValue, validateDateRange } from '../utils/validation';
import { useSeededCollection } from '../hooks';
import { toYmd, fromYmd, pad2, addMonths, buildMonthGrid } from '../utils/dateUtils';

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
            id: generateUuid(),
            title: 'Design Review',
            date: toYmd(inTwoDays),
            allDay: false,
            startTime: '10:00',
            endTime: '11:30',
            location: 'Conference Room A',
            notes: 'Review the updated desktop widgets and mail/calendar layouts.',
        },
        {
            id: generateUuid(),
            title: 'Sprint Planning',
            date: toYmd(nextWeek),
            allDay: false,
            startTime: '09:00',
            endTime: '10:00',
            location: 'Teams',
            notes: '',
        },
        {
            id: generateUuid(),
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

const normalizeInitialDate = (value?: string) => {
    if (!value) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const normalized = toYmd(fromYmd(value));
    return normalized === value ? value : null;
};

export const Calendar = ({ initialDate }: { initialDate?: string }) => {
    const { formatTimeShortFromHm } = useLocalization();
    const {
        items: events,
        setItems: setEvents,
        isLoading: isLoadingEvents,
    } = useSeededCollection(STORAGE_KEYS.calendarEvents, seedEvents);

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
            const dayEvents = map[event.date] ?? (map[event.date] = []);
            dayEvents.push(event);
        }
        for (const key of Object.keys(map)) {
            const dayEvents = map[key];
            if (dayEvents) dayEvents.sort(compareTime);
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

        // Validation
        const titleError = validateValue(title, required('Title is required'));
        if (titleError) {
            setDraftError(titleError);
            return;
        }

        const start = draft.allDay ? '00:00' : draft.startTime;
        const end = draft.allDay ? '23:59' : draft.endTime;

        // Validate time range for non-all-day events
        if (!draft.allDay) {
            const dateRangeError = validateDateRange(
                `${draft.date}T${start}`,
                `${draft.date}T${end}`,
                'End time must be after start time'
            );
            if (dateRangeError) {
                setDraftError(dateRangeError);
                return;
            }
        }

        const normalized: CalendarEvent = {
            id: draft.id ?? generateUuid(),
            title,
            date: draft.date,
            allDay: draft.allDay,
            startTime: start,
            endTime: end,
            location: draft.location.trim(),
            notes: draft.notes,
        };

        // Update using setEvents from useSeededCollection
        const idx = events.findIndex(event => event.id === normalized.id);
        const updatedEvents =
            idx === -1
                ? [...events, normalized].sort((a, b) => eventStartDate(a).getTime() - eventStartDate(b).getTime())
                : events.map(event => (event.id === normalized.id ? normalized : event));

        setEvents(updatedEvents);
        setSelectedDate(normalized.date);
        closeDraft();
    };

    const deleteEvent = async (id: string) => {
        // Update using setEvents from useSeededCollection
        const updatedEvents = events.filter(event => event.id !== id);
        setEvents(updatedEvents);
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
                    {isLoadingEvents && events.length === 0 ? (
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
                                                            {event.allDay
                                                                ? 'All day'
                                                                : formatTimeShortFromHm(event.startTime)}{' '}
                                                            · {event.title}
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
                    {events.length > 0 && (
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
                    )}

                    <div className="flex-1 overflow-y-auto p-4">
                        {events.length === 0 ? (
                            <EmptyState
                                icon="calendar_month"
                                title="No events yet"
                                description="Your calendar is empty. Create an event to get started."
                                variant="minimal"
                            />
                        ) : selectedEvents.length === 0 ? (
                            <EmptyState icon="event" title="No events for this day" variant="minimal" />
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
                                                    {event.allDay
                                                        ? 'All day'
                                                        : `${formatTimeShortFromHm(event.startTime)} – ${formatTimeShortFromHm(event.endTime)}`}
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

                                <div className="mt-6">
                                    <Checkbox
                                        checked={draft.allDay}
                                        onChange={checked =>
                                            setDraft(prev => (prev ? { ...prev, allDay: checked } : prev))
                                        }
                                        label="All day"
                                        labelClassName="text-sm text-white/80"
                                        size="sm"
                                    />
                                </div>
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
                                <TextArea
                                    value={draft.notes}
                                    onChange={e => setDraft(prev => (prev ? { ...prev, notes: e.target.value } : prev))}
                                    className="h-28 bg-black/30 focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                                    placeholder="Add details…"
                                />
                            </label>
                        </div>

                        <div className="px-4 py-3 flex items-center justify-between border-t border-white/10 bg-black/20">
                            {draft.id ? (
                                <button
                                    onClick={() => {
                                        if (!draft.id) return;
                                        void deleteEvent(draft.id);
                                    }}
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
