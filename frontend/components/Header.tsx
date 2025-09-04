"use client";

// Header.tsx
import { useAgendaStore } from '../stores/useAgendaStore';
import React, { useState } from 'react';
import Timer from './Timer';
import Nudge from './Nudge';
import { CornerUpLeft, CornerDownRight } from 'lucide-react';
import { useServerTimer } from '../hooks/useServerTimer';

type HeaderProps = {
  role?: 'host' | 'participant';
};

export default function Header({ role = 'participant' }: HeaderProps) {
  const placeholder = `No items to display.`;
  const {
    getCurrentItem,
    previousItem,
    getVisibleItems,
    nextItem,
    hasTimers,
    isEditingMode,
  } = useAgendaStore();

  const currentItem = getCurrentItem();
  const visibleItems = getVisibleItems();

  const [truncated, setTruncated] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Server-synced timer state & controls
  const { status, remaining, start, pause, resume, cancel } = useServerTimer();

  const dbTimerSeconds = currentItem?.timerValue ?? 0;
  const displaySeconds = status === 'pending' ? dbTimerSeconds : remaining;

  const handleClick = () => setTruncated((prev) => !prev);

  const handleStart = () => {
    // Start fresh from the item's DB time
    if (dbTimerSeconds > 0) start(dbTimerSeconds);
  };

  const handleResume = () => {
    // Resume from frozen remainingMs
    resume();
  };

  const handlePause = () => {
    pause();
  };

  const handleCancel = () => {
    if (status !== 'pending') cancel();
  };

  const handleNext = () => {
    handleCancel();
    nextItem();
  };

  const handlePrev = () => {
    handleCancel();
    previousItem();
  };

  const canStart = role === 'host' && status === 'pending' && (dbTimerSeconds ?? 0) > 0;
  const canResume = role === 'host' && status === 'paused';
  const canPause = role === 'host' && status === 'running';

  return (
    <div
      className="relative flex flex-col rounded-lg text-center px-10 pb-4 pt-8 break-words"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col text-white">
        {currentItem ? (
          !isEditingMode && (
            <>
              {/* Title */}
              <h1
                onClick={handleClick}
                className={`text-lg text-amber-400 font-semibold ${
                  truncated ? 'line-clamp-3 lg:line-clamp-4' : ''
                }`}
              >
                {currentItem.text}
              </h1>

              {hasTimers && (
                <div className="flex items-center justify-center pt-4">
                  {/* Centered timer + hover controls */}
                  <div className="relative flex items-center justify-center">
                    <Timer
                      canEdit={false}
                      timerValue={displaySeconds}
                      onChangeTimer={() => {}}
                      className="text-xl py-4 text-sky-200 border rounded-lg px-4"
                      showIcon={false}
                    />

                    {role === 'host' && isHovered && (
                      <div
                        className="
                          absolute left-full ml-1
                          flex items-center gap-1
                          translate-x-2
                          transition
                        "
                      >
                        {canStart && (
                          <button
                            onClick={handleStart}
                            className="pointer-events-auto cursor-pointer px-2 py-1 text-xs bg-gray-200/60 text-white rounded hover:bg-green-600"
                            title="Start timer"
                          >
                            ▶
                          </button>
                        )}

                        {canResume && (
                          <button
                            onClick={handleResume}
                            className="pointer-events-auto cursor-pointer px-2 py-1 text-xs bg-gray-200/60 text-white rounded hover:bg-green-600"
                            title="Resume timer"
                          >
                            ▶
                          </button>
                        )}

                        {canPause && (
                          <button
                            onClick={handlePause}
                            className="pointer-events-auto cursor-pointer px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
                            title="Pause timer"
                          >
                            ⏸
                          </button>
                        )}

                        {(status === 'running' || status === 'paused') && (
                          <button
                            onClick={handleCancel}
                            className="pointer-events-auto cursor-pointer px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                            title="Cancel timer"
                          >
                            ↺
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )
        ) : (
          <h1 className="text-lg font-semibold">{placeholder}</h1>
        )}

        {/* Navigation (host only, still using component-level hover) */}
        {visibleItems.length > 0 && role === 'host' && isHovered && (
          <div className="flex flex-col">
            <button
              onClick={handlePrev}
              className="group absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 cursor-pointer text-white hover:text-amber-400"
              aria-label="Previous Item"
            >
              <CornerUpLeft size={24} />
              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs text-white bg-red-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Previous
              </span>
            </button>
            <button
              onClick={handleNext}
              className="group absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 cursor-pointer text-white hover:text-amber-400"
              aria-label="Next Item"
            >
              <CornerDownRight size={24} />
              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs text-white bg-red-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Next
              </span>
            </button>
          </div>
        )}

        {/* Nudge */}
        <div className="mx-auto pt-[1.5em]">
          <Nudge />
        </div>
      </div>
    </div>
  );
}
