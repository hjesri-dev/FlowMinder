"use client";
import React from "react";
import { useEffect } from "react";
import { useAgendaStore } from "../stores/useAgendaStore";
import { loadMeetingTimerSettings, persistMeetingTimerSettings } from "../services/agendaService";
import { Trash2 } from "lucide-react";
import "../app/globals.css";

import { initZoomOnce, zoomConfirm, zoomNotifyError } from "../hooks/useZoomPopup";

export default function Settings() {
  const {
    toggleSettings,
    setEditingMode,
    setHasTimers,
    hasTimers,
    setAreTimersAdded,
    visibility,
    autoAdvance,
    autoStartNextTimer,
    setVisibility,
    setAutoAdvance,
    setAutoStartNextTimer,
  } = useAgendaStore();

  const onToggleAutoAdvance = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const checked = e.target.checked;
    setAutoAdvance(checked);
    if (!checked && autoStartNextTimer) {
      // enforce dependency: turning parent off also turns child off
      setAutoStartNextTimer(false);
    }
  };

  const onToggleAutoStart = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const checked = e.target.checked;
    // If user enables the child first, auto-enable the parent
    if (checked && !autoAdvance) setAutoAdvance(true);
    setAutoStartNextTimer(checked);
  };

  const onChangeVisibility = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value as "me" | "everyone";
    setVisibility(val);
  };

  async function handleDeleteAllTimers() {
    const ok = await zoomConfirm(
      "Are you sure you want to remove all timers?",
      "Remove all timers?"
    );
    if (!ok) return;

    try {
      await persistMeetingTimerSettings(false, visibility, autoAdvance, autoStartNextTimer);
      useAgendaStore.getState().bumpRefresh();
      setHasTimers(false);
      setAreTimersAdded(false);
      toggleSettings();
    } catch (e) {
      console.error(e);
      await zoomNotifyError("Failed to delete timers. Please try again.", "Delete failed");
    }
  }

  async function handleCancel() {
    toggleSettings();
    setAreTimersAdded(false);
    try {
      await loadMeetingTimerSettings();
      useAgendaStore.getState().bumpRefresh();
    } catch (e) {
      console.error(e);
    }
  }

  function handleNext() {
    toggleSettings();
    setEditingMode(true);
  }

  useEffect(() => {
    initZoomOnce();
    (async () => {
      try {
        await loadMeetingTimerSettings();
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="ml-2 mr-4 pb-2 bg-[var(--primary)] flex justify-between items-center rounded-b-xl shadow-sm">
        <h2 className="pl-4 font-semibold text-sky-950 text-lg">Timer Settings</h2>
        <button
          onClick={toggleSettings}
          className="px-3 py-1.5 text-sm rounded-xl bg-white/15 hover:bg-white/25 text-white"
        >
          Close
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-6">
        {/* Visibility */}
        <fieldset className="rounded-2xl border border-gray-200 px-4 py-2">
          <legend className="px-2 text-sm font-medium text-gray-500">Visibility</legend>
          <div className="my-2 grid grid-cols-2 gap-3 sm:max-w-md">
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 ${
                visibility === "me"
                  ? "border-sky-900 ring-2 ring-sky-400/50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="visibility"
                value="me"
                checked={visibility === "me"}
                onChange={onChangeVisibility}
                className="mt-1 h-3.5 w-3.5 accent-sky-600"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">Only me</span>
                <span className="block text-xs text-gray-500 pt-1">Timer is visible only to you</span>
              </span>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 ${
                visibility === "everyone"
                  ? "border-sky-900 ring-2 ring-sky-400/50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="visibility"
                value="everyone"
                checked={visibility === "everyone"}
                onChange={onChangeVisibility}
                className="mt-1 h-3.5 w-3.5 accent-sky-600"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">Everyone</span>
                <span className="block text-xs text-gray-500 pt-1">All participants can see the timers</span>
              </span>
            </label>
          </div>
        </fieldset>

        {/* Automation */}
        <fieldset className="rounded-2xl border border-gray-200 p-4">
          <legend className="px-2 text-sm font-medium text-gray-500">Automation</legend>
          <div className="space-y-2 sm:max-w-2xl">
            <label htmlFor="auto-advance" className="flex items-start gap-3">
              <input
                id="auto-advance"
                type="checkbox"
                checked={autoAdvance}
                onChange={onToggleAutoAdvance}
                className="mt-1 h-5 w-5 accent-sky-600"
              />
              <span className="select-none text-sm text-gray-900">Auto-advance to next item when timer ends</span>
            </label>

            <label htmlFor="auto-start-next" className="flex items-start justify-center gap-3">
              <input
                id="auto-start-next"
                type="checkbox"
                checked={autoStartNextTimer}
                onChange={onToggleAutoStart}
                aria-describedby={!autoAdvance ? "auto-start-next-hint" : undefined}
                className="mt-1 h-5 w-5 accent-sky-900"
              />
              <span className="my-auto select-none text-sm text-gray-900">…and auto-start the next item’s timer</span>
            </label>

            {!autoAdvance && (
              <p id="auto-start-next-hint" className="ml-9 text-sm text-gray-500">
                If you enable Auto-start, Auto-advance will be turned on automatically.
              </p>
            )}
          </div>
        </fieldset>
      </div>

      <div className={`px-4 pb-4 flex items-center ${hasTimers ? "justify-between" : "justify-end"}`}>
        {hasTimers && (
          <button
            onClick={handleDeleteAllTimers}
            className="flex gap-1 items-center justify-center text-sm text-red-600 hover:underline"
          >
            <Trash2 className="w-4 h-4" />
            Remove all timers
          </button>
        )}

        {/* on cancel it should reset the state of settings back to those from server*/}
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleNext}
            className="px-4 py-2 rounded-2xl bg-sky-600 text-white hover:opacity-90 shadow-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
