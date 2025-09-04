import { useAgendaStore } from '../useAgendaStore';
import '@testing-library/jest-dom';

// Helper to reset store state between tests
const resetStore = () => {
    useAgendaStore.setState({
        items: [],
        currentItemIndex: 0,
        showAllTimers: false,
        isEditingMode: false
    });
};

describe('Agenda Store Actions', () => {

    afterEach(() => {
        resetStore();
    });

    test('loadItems should initialize the store with given items', () => {
        useAgendaStore.getState().loadItems([
            { id: '1', text: 'First item', duration_seconds: 60 },
            { id: '2', text: 'Second item', timerValue: 120 }
        ]);

        const items = useAgendaStore.getState().items;
        expect(items).toHaveLength(2);
        expect(items[0].text).toBe('First item');
        expect(items[0].timerValue).toBe(60);
        expect(items[1].timerValue).toBe(120);
        expect(items[0].isNew).toBe(false);
    });

    test('addItem should add a new blank item to the list', () => {
        useAgendaStore.getState().addItem();

        const items = useAgendaStore.getState().items;
        expect(items).toHaveLength(1);
        expect(items[0].isNew).toBe(true);
        expect(items[0].text).toBe('');
    });

    test('changeItem should update the text of a specific item and mark it as edited', () => {
        const { loadItems, changeItem } = useAgendaStore.getState();

        loadItems([{ id: '1', text: 'Original', timerValue: 0 }]);
        changeItem('1', 'Updated Text');

        const item = useAgendaStore.getState().items[0];
        expect(item.text).toBe('Updated Text');
        expect(item.isEdited).toBe(true);
        expect(item.timerValue).toBe(0);
    });

    test('changeItem should update the text to empty', () => {
        const { loadItems, changeItem } = useAgendaStore.getState();

        loadItems([{ id: '1', text: 'Original', timerValue: 0 }]);
        changeItem('1', '');

        const item = useAgendaStore.getState().items[0];
        expect(item.text).toBe('');
        expect(item.isEdited).toBe(true);
        expect(item.timerValue).toBe(0);
    });

    test('changeItemTimer should update the timer of a specific item and mark it as editedTimer', () => {
        const { loadItems, changeItemTimer } = useAgendaStore.getState();

        loadItems([{ id: '1', text: 'Item', timerValue: 30 }]);
        changeItemTimer('1', 45);

        const item = useAgendaStore.getState().items[0];
        expect(item.timerValue).toBe(45);
        expect(item.isEditedTimer).toBe(true);
    });

    test('removeItem should mark item as deleted and processed', () => {
        const { loadItems, removeItem } = useAgendaStore.getState();

        loadItems([{ id: '1', text: 'To be removed', timerValue: 0 }]);
        removeItem('1');

        const item = useAgendaStore.getState().items[0];
        expect(item.isDeleted).toBe(true);
        expect(item.isProcessed).toBe(true);
    });

    test('resetItems should revert items to their original state and remove new items', () => {
        const { loadItems, addItem, changeItem, resetItems } = useAgendaStore.getState();

        loadItems([{ id: '1', text: 'Original', timerValue: 10 }]);
        addItem(); // Add new item
        changeItem('1', 'Modified');

        resetItems();

        const items = useAgendaStore.getState().items;
        expect(items).toHaveLength(1);
        expect(items[0].text).toBe('Original');
        expect(items[0].isEdited).toBe(false);
    });

    test('adding new item and modify it should set isNew true and isEdited true', () => {
        const { addItem, changeItem, resetItems } = useAgendaStore.getState();

        // Add a new item
        addItem();

        // Get the newly added item ID
        const itemsBeforeChange = useAgendaStore.getState().items;
        expect(itemsBeforeChange).toHaveLength(1);

        const newItem = itemsBeforeChange[0];
        expect(newItem.isNew).toBe(true);
        expect(newItem.isEdited).toBe(false);
        expect(newItem.text).toBe('');

        // Modify the newly added item
        changeItem(newItem.id, 'Updated Text');

        // Check after modification
        const itemsAfterChange = useAgendaStore.getState().items;
        const updatedItem = itemsAfterChange.find(item => item.id === newItem.id);

        expect(updatedItem).toBeDefined();
        expect(updatedItem!.text).toBe('Updated Text');
        expect(updatedItem!.isNew).toBe(true);    // Still new
        expect(updatedItem!.isEdited).toBe(true); // Now edited

        // Reset and ensure new item is removed
        resetItems();
        const itemsAfterReset = useAgendaStore.getState().items;
        expect(itemsAfterReset).toHaveLength(0);
    });


    test('saveSuccess should update items with server data and clear all change flags', () => {
        const { loadItems, changeItem, saveSuccess } = useAgendaStore.getState();

        loadItems([{ id: '1', text: 'Original', timerValue: 10 }]);
        changeItem('1', 'Changed');

        saveSuccess([{
            ...useAgendaStore.getState().items[0],
            id: '1',
            text: 'Saved',
            timerValue: 15
        }]);
        const item = useAgendaStore.getState().items[0];
        expect(item.text).toBe('Saved');
        expect(item.isEdited).toBe(false);
        expect(item.isNew).toBe(false);
    });

    test('nextItem should mark the current visible item as processed', () => {
        const { loadItems, nextItem } = useAgendaStore.getState();

        loadItems([
            { id: '1', text: 'First', timerValue: 10 },
            { id: '2', text: 'Second', timerValue: 15 },
            { id: '3', text: 'Third', timerValue: 20 }

        ]);

        // after loading all items should not be markerd as processed
        const itemsBefore = useAgendaStore.getState().items;
        expect(itemsBefore[0].isProcessed).toBe(false);
        expect(itemsBefore[1].isProcessed).toBe(false);
        expect(itemsBefore[2].isProcessed).toBe(false);

        nextItem(); // process first item

        const items = useAgendaStore.getState().items;
        expect(items[0].isProcessed).toBe(true);
        expect(items[1].isProcessed).toBe(false);
        expect(items[2].isProcessed).toBe(false);


        nextItem(); // process second item

        const itemsAfter = useAgendaStore.getState().items;
        expect(itemsAfter[0].isProcessed).toBe(true);
        expect(itemsAfter[1].isProcessed).toBe(true);
        expect(itemsAfter[2].isProcessed).toBe(false);


    });

    test('getVisibleItems should return items not deleted or processed, respecting editing mode', () => {
        const { loadItems, toggleEditingMode, getVisibleItems } = useAgendaStore.getState();

        loadItems([
            { id: '1', text: 'First', timerValue: 10 },
            { id: '2', text: 'Second', timerValue: 10 },
            { id: '3', text: 'Third', timerValue: 10 }
        ]);

        let visibleItems = getVisibleItems();
        expect(visibleItems).toHaveLength(2);
        expect(visibleItems[0].id).toBe('2');

        toggleEditingMode(); // In editing mode, list should have the length of 3

        visibleItems = getVisibleItems();
        expect(visibleItems).toHaveLength(3);
        expect(visibleItems[0].id).toBe('1');
    });

    test('getVisibleItems should not display an empty item in non-editing mode', () => {
        const { loadItems, toggleEditingMode, getVisibleItems, changeItem } = useAgendaStore.getState();

        loadItems([
            { id: '1', text: 'First', timerValue: 10 },
            { id: '2', text: 'Second', timerValue: 10 },
            { id: '3', text: 'Third', timerValue: 10 }
        ]);

        // EDITING MODE
        toggleEditingMode();
        let visibleItems = getVisibleItems();
        expect(visibleItems.length).toBe(3);
        changeItem('2', '  '); // Change second item to empty text
        visibleItems = getVisibleItems();
        expect(visibleItems.length).toBe(3); // all three items should still be visible

        // NON-EDITING MODE
        toggleEditingMode(); // Switch to non-editing mode
        visibleItems = getVisibleItems();
        // Expect one item. One item gets popped off (goes to header), 
        // one is empty and should be filtered out
        expect(visibleItems.length).toBe(1); 
    });

    test('hasUnsavedChanges ignores new items that are deleted', () => {
        const { addItem, changeItem, removeItem, hasUnsavedChanges } = useAgendaStore.getState();

        addItem();
        const items = useAgendaStore.getState().items;
        const newItem = items[0];
        changeItem(newItem.id, "Modified");
        removeItem(newItem.id);

        // Should return FALSE because it’s new and deleted.
        expect(hasUnsavedChanges()).toBe(false);
    });

    test('hasUnsavedChanges returns false for new items that are not deleted', () => {
        const { addItem, hasUnsavedChanges } = useAgendaStore.getState();

        addItem();
        expect(hasUnsavedChanges()).toBe(false);
    });

    test('hasUnsavedChanges returns true for edited items', () => {
        const { loadItems, addItem, changeItem, changeItemTimer, hasUnsavedChanges } = useAgendaStore.getState();

        // editing existing items 
        loadItems([{ id: '1', text: 'Item', timerValue: 10 }]);
        changeItem('1', 'Modified');
        expect(hasUnsavedChanges()).toBe(true);

        // editing timer of an exisiting item
        resetStore();
        loadItems([{ id: '1', text: 'Item', timerValue: 10 }]);
        changeItemTimer('1', 20);
        expect(hasUnsavedChanges()).toBe(true);

        // editing new item 
        resetStore();
        addItem();
        const itemsBeforeChange = useAgendaStore.getState().items;
        const newItem = itemsBeforeChange[0];
        changeItem(newItem.id, "edited");
        expect(hasUnsavedChanges()).toBe(true);

        // editing timer of a new item
        resetStore();
        addItem();
        const items = useAgendaStore.getState().items;
        const item = items[0];
        changeItemTimer(item.id, 20);
        expect(hasUnsavedChanges()).toBe(true);
    });


    test('hasUnsavedChanges should return false for edits with just leading, trailing whitespace', () => {
        const { loadItems, changeItem, addItem, hasUnsavedChanges } = useAgendaStore.getState();

        loadItems([{ id: '1', text: 'Item', timerValue: 10 }]);
        changeItem('1', 'Item         ');
        expect(hasUnsavedChanges()).toBe(false);
        changeItem('1', '      Item         ');
        expect(hasUnsavedChanges()).toBe(false);

        resetStore();
        addItem();
        const itemsBeforeChange = useAgendaStore.getState().items;
        const newItem = itemsBeforeChange[0];
        changeItem(newItem.id, "  ");
        expect(hasUnsavedChanges()).toBe(false);
    });
});
