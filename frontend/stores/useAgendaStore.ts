import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import { socket } from '../sockets/socket';


export type MeetingTimerSettings = {
    hasTimers: boolean;
    defaultVisibility: Visibility;
    automation: { autoAdvance: boolean; autoStartNextTimer: boolean };
    updatedAt?: string | null;
};

const normalizeTimerSettings = (
    serverSettings?: Partial<MeetingTimerSettings> | null
): MeetingTimerSettings => ({
    hasTimers: typeof serverSettings?.hasTimers === 'boolean' ? serverSettings.hasTimers : false,
    defaultVisibility: serverSettings?.defaultVisibility === 'everyone' ? 'everyone' : 'me',
    automation: {
        autoAdvance: !!serverSettings?.automation?.autoAdvance,
        autoStartNextTimer: !!serverSettings?.automation?.autoStartNextTimer,
    },
    updatedAt: typeof serverSettings?.updatedAt === 'string' ? serverSettings.updatedAt : null,
});

export type Visibility = 'me' | 'everyone';

export interface AgendaItemType {
    id: string;
    text: string;
    originalText: string;
    isNew: boolean;
    isEdited: boolean;
    isDeleted: boolean;
    isProcessed: boolean;
    timerValue: number;
    originalTimerValue: number;
    isEditedTimer: boolean;
    processedAt?: string | null;
}

type AgendaStore = {

    /*timer*/
    areTimersAdded: boolean; // frontend, used for adding timers, before pushing to server
    hasTimers: boolean; // general value persisted in the database 
    autoAdvance: boolean;
    autoStartNextTimer: boolean;
    setAutoAdvance: (v: boolean) => void;
    setAutoStartNextTimer: (v: boolean) => void;
    setAreTimersAdded: (v: boolean) => void;
    // toggleAddTimersBtn: () => void;
    setHasTimers: (v: boolean) => void;

    /* settings */
    isEditingMode: boolean;
    showSettings: boolean;
    visibility: Visibility;
    setVisibility: (v: Visibility) => void;
    setEditingMode: (flag: boolean) => void;
    hasUnsavedChanges: () => boolean;
    toggleSettings: () => void;
    toggleEditingMode: () => void;
    applyTimerSettingsFromDb: (incoming: Partial<MeetingTimerSettings> | null | undefined) => void;
    refreshToken: number; // used to force refresh agenda once settings changed
    bumpRefresh: () => void;

    /* agenda */
    items: AgendaItemType[];
    currentItemIndex: number;
    lastAddedItemId: string | null;
    loadItems: (items: { id: string; text: string; duration_seconds?: number; timerValue?: number; isProcessed?: boolean; }[]) => void;
    addItem: () => void;
    changeItem: (id: string, text: string) => void;
    changeItemTimer: (id: string, timerValue: number) => void;
    removeItem: (id: string) => void;
    resetItems: () => void;
    saveSuccess: (savedItems: AgendaItemType[]) => void;
    getCurrentItem: () => AgendaItemType | null;
    getVisibleItems: () => AgendaItemType[];
    setAgendaItems: (items: AgendaItemType[]) => void;
    clearAgendaItems: () => void;

    /*header*/
    nextItem: () => void;
    previousItem: () => void;
    processCurrentItem: () => void;
};

export const useAgendaStore = create<AgendaStore>((set, get) => ({
    items: [],
    currentItemIndex: 0,
    areTimersAdded: false,
    isEditingMode: false,
    hasTimers: false,
    showSettings: false,
    lastAddedItemId: null,
    visibility: 'me',
    autoAdvance: false,
    autoStartNextTimer: false,
    addTimersBtn: false,
    refreshToken: 0,
    bumpRefresh: () => set(s => ({ refreshToken: s.refreshToken + 1 })),

    /* setters */
    setVisibility: (visibility) => set({ visibility }),
    setAutoAdvance: (autoAdvance) => set({ autoAdvance }),
    setAutoStartNextTimer: (autoStartNextTimer) => set({ autoStartNextTimer }),
    setEditingMode: (isEditingMode) => set({ isEditingMode }),
    setAreTimersAdded: (value: boolean) => set({ areTimersAdded: value }),
    setHasTimers: (hasTimers) => set({ hasTimers }),
    setAgendaItems: (items: AgendaItemType[]): void => {
        set({ items: items });
    },

    /* toggle buttons */
    toggleEditingMode: () => set((state) => ({ isEditingMode: !state.isEditingMode })),
    toggleSettings: () => set((state) => ({ showSettings: !state.showSettings })),
    // toggleAddTimersBtn: () => set((state) => ({ areTimersAdded: !state.areTimersAdded })),


    /*getters */
    getCurrentItem: () => {
        const { items } = get();
        const visibleItems = items.filter((it) => !it.isDeleted && !it.isProcessed);
        return visibleItems.length > 0 ? visibleItems[0] : null;
    },

    getVisibleItems: () => {
        const { items, isEditingMode } = get();
        const visibleItems = items.filter((it) => !it.isDeleted && !it.isProcessed);

        if (isEditingMode) {
            return visibleItems;
        }
        return visibleItems.slice(1).filter((it) => it.text.trim() !== '');
    },


    loadItems: (items) => {
        set(() => ({
            items: items.map((it) => ({
                ...it,
                originalText: it.text,
                isNew: false,
                isEdited: false,
                isDeleted: false,
                isProcessed: it.isProcessed ?? false,
                timerValue: it.duration_seconds ?? it.timerValue ?? 300,
                originalTimerValue: it.duration_seconds ?? it.timerValue ?? 300,
                isEditedTimer: false,
            })),
            currentItemIndex: 0,
        }));
    },

    addItem: () => {
        const newItemId = uuid();
        set((state) => ({
            items: [
                ...state.items,
                {
                    id: newItemId,
                    text: '',
                    originalText: '',
                    isNew: true,
                    isEdited: false,
                    isDeleted: false,
                    isProcessed: false,
                    timerValue: 300,
                    originalTimerValue: 300,
                    isEditedTimer: false,
                },
            ],
            lastAddedItemId: newItemId,
        }));
        setTimeout(() => {
            set({ lastAddedItemId: newItemId });
        }, 0);
    },

    changeItem: (id, text) =>
        set((state) => ({
            items: state.items.map((it) =>
                it.id === id
                    ? { ...it, text, isEdited: text.trim() !== it.originalText.trim() }
                    : it
            ),
        })),

    changeItemTimer: (id, timerValue) =>
        set((state) => ({
            items: state.items.map((it) =>
                it.id === id
                    ? {
                        ...it,
                        timerValue: timerValue,
                        isEditedTimer: timerValue !== it.originalTimerValue
                    }
                    : it
            ),
        })),

    removeItem: (id) =>
        set((state) => ({
            items: state.items.map((it) =>
                it.id === id ? { ...it, isDeleted: true, isProcessed: true } : it
            ),
        })),

    resetItems: () =>
        set((state) => ({
            items: state.items
                .filter((it) => !it.isNew)
                .map((it) => ({
                    ...it,
                    text: it.originalText,
                    timerValue: it.originalTimerValue,
                    isEdited: false,
                    isDeleted: false,
                    isEditedTimer: false,
                })),
        })),

    saveSuccess: (savedItems) =>
        set(() => ({
            items: savedItems.map((it) => ({
                ...it,
                originalText: it.text,
                originalTimerValue: it.timerValue,
                timerValue: it.timerValue,
                isNew: false,
                isEdited: false,
                isDeleted: false,
                isProcessed: it.isProcessed,
                isEditedTimer: false,
            })),
        })),

    nextItem: () => { socket.emit('agenda:next'); },
    previousItem: () => { socket.emit('agenda:prev'); },
    processCurrentItem: () => { get().nextItem(); },

    hasUnsavedChanges: () => {
        const { items } = get();
        return items.some((it) => (it.isEdited || it.isEditedTimer || it.isDeleted) && !(it.isDeleted && it.isNew));
    },

    applyTimerSettingsFromDb: (incoming) => {
        const shaped = normalizeTimerSettings(incoming);
        set({
            hasTimers: shaped.hasTimers,
            visibility: shaped.defaultVisibility,
            autoAdvance: shaped.automation.autoAdvance,
            autoStartNextTimer: shaped.automation.autoStartNextTimer,
        });
    },

    clearAgendaItems: (): void => {
        set({ items: [] });
    },
}));
