import React, { useEffect, useMemo, useRef, useState } from 'react';
import { STORAGE_KEYS } from '../utils/storage';
import { SkeletonCalendar } from '../components/LoadingSkeleton';
import { useLocalization } from '../context';
import { generateUuid } from '../utils/uuid';
import { TextArea, EmptyState, FormField } from '../components/ui';
import { FilePickerModal } from '../components';
import { Checkbox } from '../components/ui';
import { useConfirmDialog, ConfirmDialog } from '../components/ui/ConfirmDialog';
import { required, validateValue, validateDateRange } from '../utils/validation';
import { useSeededCollection, useFilePicker, useNotification, usePhoneMode } from '../hooks';
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
    const { confirm, dialogProps } = useConfirmDialog();
    const isPhone = usePhoneMode();
    const {
        items: events,
        setItems: setEvents,
        isLoading: isLoadingEvents,
    } = useSeededCollection(STORAGE_KEYS.calendarEvents, seedEvents);
    const filePicker = useFilePicker();
    const { info } = useNotification();

    // Track which events we've already notified about (to avoid spam)
    const notifiedEventsRef = useRef<Set<string>>(new Set());

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

    // Check for upcoming events every minute and notify 5 minutes before
    useEffect(() => {
        const checkUpcomingEvents = () => {
            const now = Date.now();
            const fiveMinutesMs = 5 * 60 * 1000;
            const notifiedSet = notifiedEventsRef.current;

            for (const event of events) {
                // Skip all-day events
                if (event.allDay) continue;
                // Skip already notified
                if (notifiedSet.has(event.id)) continue;

                const eventStart = eventStartDate(event);
                const timeUntilEvent = eventStart.getTime() - now;

                // Notify if event is within 5 minutes and hasn't started yet
                if (timeUntilEvent > 0 && timeUntilEvent <= fiveMinutesMs) {
                    notifiedSet.add(event.id);
                    const timeLabel = formatTimeShortFromHm(event.startTime);
                    info(`${event.title} at ${timeLabel}${event.location ? ` - ${event.location}` : ''}`);
                }
            }
        };

        // Check immediately and then every minute
        checkUpcomingEvents();
        const interval = setInterval(checkUpcomingEvents, 60000);
        return () => clearInterval(interval);
    }, [events, formatTimeShortFromHm, info]);

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

    const exportToICS = async () => {
        if (events.length === 0) return;

        // Generate ICS content
        const icsLines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Windows15//Calendar//EN', 'CALSCALE:GREGORIAN'];

        for (const event of events) {
            const dtstart = event.allDay
                ? event.date.replace(/-/g, '')
                : `${event.date.replace(/-/g, '')}T${event.startTime.replace(':', '')}00`;
            const dtend = event.allDay
                ? event.date.replace(/-/g, '')
                : `${event.date.replace(/-/g, '')}T${event.endTime.replace(':', '')}00`;

            icsLines.push(
                'BEGIN:VEVENT',
                `UID:${event.id}`,
                `DTSTART:${dtstart}`,
                `DTEND:${dtend}`,
                `SUMMARY:${event.title}`,
                event.location ? `LOCATION:${event.location}` : '',
                event.notes ? `DESCRIPTION:${event.notes.replace(/\n/g, '\\n')}` : '',
                'END:VEVENT'
            );
        }

        icsLines.push('END:VCALENDAR');
        const icsContent = icsLines.filter(Boolean).join('\r\n');

        await filePicker.save({
            title: 'Export Calendar',
            content: icsContent,
            defaultFileName: 'calendar.ics',
            defaultExtension: '.ics',
        });
    };

    const importFromICS = async () => {
        const file = await filePicker.open({
            title: 'Import Calendar',
            extensions: ['.ics'],
        });
        if (!file?.content) return;

        try {
            const lines = file.content.split(/\r?\n/);
            const importedEvents: CalendarEvent[] = [];
            let currentEvent: Partial<CalendarEvent> | null = null;

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed === 'BEGIN:VEVENT') {
                    currentEvent = { id: generateUuid(), allDay: false, location: '', notes: '' };
                } else if (trimmed === 'END:VEVENT' && currentEvent) {
                    if (currentEvent.title && currentEvent.date && currentEvent.startTime && currentEvent.endTime) {
                        importedEvents.push(currentEvent as CalendarEvent);
                    }
                    currentEvent = null;
                } else if (currentEvent && trimmed.includes(':')) {
                    const [key, ...valueParts] = trimmed.split(':');
                    const value = valueParts.join(':');
                    if (key === 'SUMMARY') {
                        currentEvent.title = value;
                    } else if (key === 'DTSTART') {
                        const dateStr = value.substring(0, 8);
                        currentEvent.date = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
                        if (value.length > 8 && value.includes('T')) {
                            const timeStr = value.substring(9, 13);
                            currentEvent.startTime = `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
                            currentEvent.allDay = false;
                        } else {
                            currentEvent.allDay = true;
                            currentEvent.startTime = '00:00';
                        }
                    } else if (key === 'DTEND') {
                        if (value.length > 8 && value.includes('T')) {
                            const timeStr = value.substring(9, 13);
                            currentEvent.endTime = `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
                        } else {
                            currentEvent.endTime = '23:59';
                        }
                    } else if (key === 'LOCATION') {
                        currentEvent.location = value;
                    } else if (key === 'DESCRIPTION') {
                        currentEvent.notes = value.replace(/\\n/g, '\n');
                    }
                }
            }

            if (importedEvents.length > 0) {
                setEvents([...events, ...importedEvents]);
            }
        } catch (error) {
            console.error('Failed to import ICS:', error);
        }
    };

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
        const event = events.find(e => e.id === id);
        if (!event) return;

        const confirmed = await confirm({
            title: 'Delete Event',
            message: `Are you sure you want to delete "${event.title}"? This action cannot be undone.`,
            variant: 'danger',
            confirmLabel: 'Delete',
        });
        if (!confirmed) return;

        // Update using setEvents from useSeededCollection
        const updatedEvents = events.filter(event => event.id !== id);
        setEvents(updatedEvents);
        closeDraft();
    };

    // F239: Pre-compute agenda data for phone layout (hooks must be at top level)
    const upcomingEvents = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return events
            .filter(e => fromYmd(e.date) >= todayStart)
            .sort((a, b) => {
                const dateCmp = a.date.localeCompare(b.date);
                if (dateCmp !== 0) return dateCmp;
                return compareTime(a, b);
            })
            .slice(0, 20); // Limit to 20 upcoming events
    }, [events]);

    // Group events by date for agenda view
    const groupedEvents = useMemo(() => {
        const groups: { date: string; label: string; events: CalendarEvent[] }[] = [];
        let currentDate = '';
        for (const event of upcomingEvents) {
            if (event.date !== currentDate) {
                currentDate = event.date;
                const dateObj = fromYmd(event.date);
                const isToday = event.date === todayYmd;
                const isTomorrow = (() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return event.date === toYmd(tomorrow);
                })();
                groups.push({
                    date: event.date,
                    label: isToday
                        ? 'Today'
                        : isTomorrow
                          ? 'Tomorrow'
                          : dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
                    events: [],
                });
            }
            groups[groups.length - 1]?.events.push(event);
        }
        return groups;
    }, [upcomingEvents, todayYmd]);

    // F239: Phone-optimized agenda-first layout
    if (isPhone) {
        return (
            <div className="h-full w-full bg-background-dark text-white flex flex-col">
                {/* Compact header */}
                <div className="h-12 shrink-0 border-b border-white/5 bg-black/20 flex items-center justify-between px-3">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setMonthCursor(addMonths(monthCursor, -1))}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:bg-white/20"
                        >
                            <span className="material-symbols-outlined text-xl">chevron_left</span>
                        </button>
                        <button
                            onClick={() => {
                                const today = new Date();
                                setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1));
                                setSelectedDate(toYmd(today));
                            }}
                            className="px-3 h-10 text-sm font-medium text-white/90"
                        >
                            {monthLabel}
                        </button>
                        <button
                            onClick={() => setMonthCursor(addMonths(monthCursor, 1))}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:bg-white/20"
                        >
                            <span className="material-symbols-outlined text-xl">chevron_right</span>
                        </button>
                    </div>
                    <button
                        onClick={() => openNewEvent()}
                        className="w-10 h-10 rounded-full bg-primary flex items-center justify-center active:scale-95"
                    >
                        <span className="material-symbols-outlined text-xl">add</span>
                    </button>
                </div>

                {/* Month calendar grid */}
                <div className="shrink-0 border-b border-white/5 px-2 py-2">
                    {/* Day of week headers */}
                    <div className="grid grid-cols-7 gap-1">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                            <div key={i} className="text-center text-[10px] text-white/40 py-1">
                                {day}
                            </div>
                        ))}
                    </div>
                    {/* Calendar days grid */}
                    <div className="grid grid-cols-7 gap-1 mt-1">
                        {monthGrid.map(cell => {
                            const isToday = cell.ymd === todayYmd;
                            const isSelected = cell.ymd === selectedDate;
                            const hasEvents = (eventsByDate[cell.ymd]?.length ?? 0) > 0;
                            return (
                                <button
                                    key={cell.ymd}
                                    onClick={() => setSelectedDate(cell.ymd)}
                                    className={`aspect-square rounded-full flex flex-col items-center justify-center min-h-[36px] ${
                                        !cell.inMonth
                                            ? 'text-white/20'
                                            : isSelected
                                              ? 'bg-primary text-white'
                                              : isToday
                                                ? 'bg-primary/20 text-primary'
                                                : 'text-white/70 active:bg-white/10'
                                    }`}
                                >
                                    <span className="text-xs font-medium">{cell.date.getDate()}</span>
                                    {hasEvents && !isSelected && cell.inMonth && (
                                        <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Agenda list */}
                <div className="flex-1 overflow-y-auto">
                    {isLoadingEvents && events.length === 0 ? (
                        <SkeletonCalendar />
                    ) : groupedEvents.length === 0 ? (
                        <div className="p-6">
                            <EmptyState
                                icon="calendar_month"
                                title="No upcoming events"
                                description="Tap + to create an event"
                                variant="minimal"
                            />
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {groupedEvents.map(group => (
                                <div key={group.date}>
                                    <div className="px-4 py-2 text-xs font-medium text-white/50 bg-black/20 sticky top-0">
                                        {group.label}
                                    </div>
                                    {group.events.map(event => (
                                        <button
                                            key={event.id}
                                            onClick={() => openEditEvent(event)}
                                            className="w-full text-left px-4 py-3 min-h-[56px] flex items-center gap-3 active:bg-white/10"
                                        >
                                            <div className="w-12 shrink-0 text-center">
                                                <div className="text-xs text-primary font-medium">
                                                    {event.allDay ? 'All' : formatTimeShortFromHm(event.startTime)}
                                                </div>
                                                {!event.allDay && (
                                                    <div className="text-[10px] text-white/40">
                                                        {formatTimeShortFromHm(event.endTime)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-white/90 truncate">
                                                    {event.title}
                                                </div>
                                                {event.location && (
                                                    <div className="text-[11px] text-white/50 truncate flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[12px]">
                                                            location_on
                                                        </span>
                                                        {event.location}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="material-symbols-outlined text-white/30 text-lg">
                                                chevron_right
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Event modal - full screen on phone */}
                {draft && (
                    <div className="absolute inset-0 z-50 bg-background-dark flex flex-col">
                        <div className="h-12 shrink-0 border-b border-white/5 bg-black/20 flex items-center justify-between px-3">
                            <button
                                onClick={closeDraft}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10"
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                            <span className="text-sm font-medium">{draft.id ? 'Edit Event' : 'New Event'}</span>
                            <button
                                onClick={() => void saveEvent()}
                                className="px-4 h-10 rounded-full bg-primary text-sm font-medium"
                            >
                                Save
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {draftError && (
                                <div className="px-3 py-2 text-xs bg-red-500/15 text-red-100 rounded-lg">
                                    {draftError}
                                </div>
                            )}
                            <FormField label="Title">
                                <input
                                    value={draft.title}
                                    onChange={e => setDraft(d => d && { ...d, title: e.target.value })}
                                    className="w-full h-11 px-3 rounded-lg bg-black/30 border border-white/10 text-sm focus:outline-none focus:border-primary"
                                    placeholder="Event title"
                                />
                            </FormField>
                            <FormField label="Date">
                                <input
                                    type="date"
                                    value={draft.date}
                                    onChange={e => setDraft(d => d && { ...d, date: e.target.value })}
                                    className="w-full h-11 px-3 rounded-lg bg-black/30 border border-white/10 text-sm focus:outline-none focus:border-primary"
                                />
                            </FormField>
                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="allDay"
                                    checked={draft.allDay}
                                    onChange={e => setDraft(d => d && { ...d, allDay: e.target.checked })}
                                />
                                <label htmlFor="allDay" className="text-sm text-white/80">
                                    All day
                                </label>
                            </div>
                            {!draft.allDay && (
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="Start">
                                        <input
                                            type="time"
                                            value={draft.startTime}
                                            onChange={e => setDraft(d => d && { ...d, startTime: e.target.value })}
                                            className="w-full h-11 px-3 rounded-lg bg-black/30 border border-white/10 text-sm focus:outline-none focus:border-primary"
                                        />
                                    </FormField>
                                    <FormField label="End">
                                        <input
                                            type="time"
                                            value={draft.endTime}
                                            onChange={e => setDraft(d => d && { ...d, endTime: e.target.value })}
                                            className="w-full h-11 px-3 rounded-lg bg-black/30 border border-white/10 text-sm focus:outline-none focus:border-primary"
                                        />
                                    </FormField>
                                </div>
                            )}
                            <FormField label="Location">
                                <input
                                    value={draft.location}
                                    onChange={e => setDraft(d => d && { ...d, location: e.target.value })}
                                    className="w-full h-11 px-3 rounded-lg bg-black/30 border border-white/10 text-sm focus:outline-none focus:border-primary"
                                    placeholder="Add location"
                                />
                            </FormField>
                            <FormField label="Notes">
                                <TextArea
                                    value={draft.notes}
                                    onChange={e => setDraft(d => d && { ...d, notes: e.target.value })}
                                    className="min-h-[100px] bg-black/30"
                                    placeholder="Add notes"
                                />
                            </FormField>
                            {draft.id && (
                                <button
                                    onClick={() => void deleteEvent(draft.id!)}
                                    className="w-full h-11 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium"
                                >
                                    Delete Event
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <ConfirmDialog {...dialogProps} />
                {filePicker.state.isOpen && (
                    <FilePickerModal
                        state={filePicker.state}
                        onNavigateTo={filePicker.navigateTo}
                        onSelectFile={filePicker.selectFile}
                        onSetFileName={filePicker.setFileName}
                        onConfirm={filePicker.confirm}
                        onCancel={filePicker.cancel}
                    />
                )}
            </div>
        );
    }

    // Desktop layout
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

                <div className="flex items-center gap-2">
                    <button
                        onClick={importFromICS}
                        className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm text-white/90 flex items-center gap-1"
                        title="Import calendar"
                    >
                        <span className="material-symbols-outlined text-[16px]">folder_open</span>
                        Import
                    </button>
                    {events.length > 0 && (
                        <button
                            onClick={exportToICS}
                            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm text-white/90 flex items-center gap-1"
                            title="Export calendar"
                        >
                            <span className="material-symbols-outlined text-[16px]">save</span>
                            Export
                        </button>
                    )}
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
                            <FormField label="Title" required>
                                <input
                                    value={draft.title}
                                    onChange={e => setDraft(prev => (prev ? { ...prev, title: e.target.value } : prev))}
                                    className="h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                                    placeholder="Event title"
                                />
                            </FormField>

                            <div className="grid grid-cols-2 gap-3">
                                <FormField label="Date" required>
                                    <input
                                        type="date"
                                        value={draft.date}
                                        onChange={e =>
                                            setDraft(prev => (prev ? { ...prev, date: e.target.value } : prev))
                                        }
                                        className="h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                                    />
                                </FormField>

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
                                    <FormField label="Start">
                                        <input
                                            type="time"
                                            value={draft.startTime}
                                            onChange={e =>
                                                setDraft(prev => (prev ? { ...prev, startTime: e.target.value } : prev))
                                            }
                                            className="h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                                        />
                                    </FormField>
                                    <FormField label="End">
                                        <input
                                            type="time"
                                            value={draft.endTime}
                                            onChange={e =>
                                                setDraft(prev => (prev ? { ...prev, endTime: e.target.value } : prev))
                                            }
                                            className="h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                                        />
                                    </FormField>
                                </div>
                            )}

                            <FormField label="Location">
                                <input
                                    value={draft.location}
                                    onChange={e =>
                                        setDraft(prev => (prev ? { ...prev, location: e.target.value } : prev))
                                    }
                                    className="h-9 px-3 rounded-lg bg-black/30 border border-white/10 text-sm text-white/80 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                                    placeholder="Where?"
                                />
                            </FormField>

                            <FormField label="Notes">
                                <TextArea
                                    value={draft.notes}
                                    onChange={e => setDraft(prev => (prev ? { ...prev, notes: e.target.value } : prev))}
                                    className="h-28 bg-black/30 focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                                    placeholder="Add details…"
                                />
                            </FormField>
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

            {/* Confirm Dialog */}
            <ConfirmDialog {...dialogProps} />

            {/* File Picker Modal */}
            {filePicker.state.isOpen && (
                <FilePickerModal
                    state={filePicker.state}
                    onNavigateTo={filePicker.navigateTo}
                    onSelectFile={filePicker.selectFile}
                    onSetFileName={filePicker.setFileName}
                    onConfirm={filePicker.confirm}
                    onCancel={filePicker.cancel}
                />
            )}
        </div>
    );
};
