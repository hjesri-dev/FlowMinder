"use client";
// BtnCancelSave.tsx
import React from 'react';
import { useAgendaStore } from '../stores/useAgendaStore';
import {
  saveItemsToBackend,
  persistMeetingTimerSettings,
  loadMeetingTimerSettings,
} from '../services/agendaService';
import { useServerTimer } from '../hooks/useServerTimer';
import { zoomConfirm, zoomNotifyError, initZoomOnce } from '../hooks/useZoomPopup';

export default function BtnCancelSave() {
  // Make sure SDK is configured when this component mounts in Zoom
  React.useEffect(() => {
    initZoomOnce();
  }, []);

  const { update, endAt } = useServerTimer();
  const {
    items,
    setHasTimers,
    hasTimers,
    getCurrentItem,
    hasUnsavedChanges,
    resetItems,
    toggleEditingMode,
    saveSuccess,
    setAreTimersAdded,
    areTimersAdded,
    autoAdvance,
    autoStartNextTimer,
    visibility,
  } = useAgendaStore();

  const handleCancel = async () => {
    // Revert UI/DB edits only. Do NOT touch the running timer.
    if (hasUnsavedChanges()) {
      const confirmed = await zoomConfirm(
        'You have unsaved changes. Are you sure you want to cancel?',
        'Discard changes?'
      );
      if (!confirmed) return;
    }

    if (areTimersAdded) setAreTimersAdded(false); // reset temp UI state
    resetItems(); // discard local item edits

    try {
      await loadMeetingTimerSettings(); // reload settings from backend
    } catch (e) {
      console.error(e);
      await zoomNotifyError('Failed to reload meeting timer settings.');
    }

    toggleEditingMode();
    useAgendaStore.getState().bumpRefresh();
  };

  const handleSave = async () => {
    const currentItem = getCurrentItem();

    try {
      if (currentItem?.isEditedTimer) {
        const diff = (currentItem.timerValue - currentItem.originalTimerValue) * 1000;
        const newEnd = endAt + diff;
        update(newEnd);
      }

      const timersEnabled = hasTimers || areTimersAdded;

      await persistMeetingTimerSettings(
        timersEnabled,
        visibility,
        autoAdvance,
        autoStartNextTimer
      );

      await saveItemsToBackend(items, saveSuccess);

      useAgendaStore.getState().bumpRefresh();
      toggleEditingMode();

      if (areTimersAdded) {
        setHasTimers(true);
        setAreTimersAdded(false);
      }
    } catch (e) {
      console.error(e);
      await zoomNotifyError('Failed to save timer settings.');
    }
  };

  return (
    <div className="flex gap-2 pt-2 px-2 mx-2">
      <button
        onClick={handleCancel}
        className="flex-1 rounded-full border border-black/10 hover:bg-stone-100/30 h-10 sm:h-12"
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        className="flex-1 rounded-full bg-red-800/85 text-white hover:bg-red-900/90 h-10 sm:h-12"
      >
        Save
      </button>
    </div>
  );
}
