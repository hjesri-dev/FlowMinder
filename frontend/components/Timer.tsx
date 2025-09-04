"use client";
import React, { useState, useEffect } from 'react';
import { Timer as TimerIcon, ChevronUp, ChevronDown } from 'lucide-react';

interface TimerProps {
  canEdit: boolean;
  timerValue: number;
  onChangeTimer: (newValue: number) => void;
  className?: string;
  showIcon?: boolean;
}

function formatTimer(seconds: number) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.abs(seconds % 60); // guard against negatives
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseTimerInput(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;

  // plain integer -> seconds
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);

  // mm:ss
  const timeMatch = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (timeMatch) {
    const minutes = parseInt(timeMatch[1], 10);
    const seconds = parseInt(timeMatch[2], 10);
    return minutes * 60 + seconds;
  }

  // 2h / 5m / 30s
  const naturalMatch = trimmed.match(/^(\d+)([mhs])$/i);
  if (naturalMatch) {
    const value = parseInt(naturalMatch[1], 10);
    const unit = naturalMatch[2].toLowerCase();
    switch (unit) {
      case 'h': return value * 3600;
      case 'm': return value * 60;
      case 's': return value;
    }
  }

  // 2m30s
  const combinedMatch = trimmed.match(/^(\d+)m(\d+)s$/i);
  if (combinedMatch) {
    const minutes = parseInt(combinedMatch[1], 10);
    const seconds = parseInt(combinedMatch[2], 10);
    return minutes * 60 + seconds;
  }

  const numValue = parseInt(trimmed, 10);
  return isNaN(numValue) ? 0 : numValue;
}

const AgendaTimer: React.FC<TimerProps> = ({
  canEdit,
  timerValue,
  onChangeTimer,
  className = '',
  showIcon = true,
}) => {
  const [timerInputValue, setTimerInputValue] = useState('');

  // Keep input in sync with external timerValue
  useEffect(() => {
    setTimerInputValue(timerValue ? formatTimer(timerValue) : '');
  }, [timerValue]);

  const commitInput = () => {
    const parsedValue = Math.max(0, parseTimerInput(timerInputValue));
    onChangeTimer(parsedValue);
    setTimerInputValue(parsedValue ? formatTimer(parsedValue) : '');
  };

  const handleTimerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimerInputValue(e.target.value);
  };

  const handleTimerBlur = () => {
    commitInput();
  };

  const handleTimerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitInput();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      // revert to external value
      setTimerInputValue(timerValue ? formatTimer(timerValue) : '');
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleTimerIncrement = (incrementMinutes: number) => {
    const newValue = Math.max(0, timerValue + incrementMinutes * 60);
    onChangeTimer(newValue);
    setTimerInputValue(newValue ? formatTimer(newValue) : '');
  };

  if (canEdit) {
    return (
      <div className={`flex justify-end flex-none w-auto ${className}`}>
        <input
          type="text"
          inputMode="text"
          pattern="^(\d+|\d+:\d{1,2}|\d+[mhsMHS]|\d+m\d+s)$"
          className="w-[7ch] px-1.5 py-1 h-8 border border-gray-300 rounded-l text-xs text-right leading-none
                     focus:outline-none focus:ring-2 focus:ring-amber-400"
          value={timerInputValue}
          onChange={handleTimerChange}
          onBlur={handleTimerBlur}
          onKeyDown={handleTimerKeyDown}
          placeholder="0:00"
          aria-label="Timer value"
          title="Enter time as: 5m, 2:30, 1h, or 90s"
        />
        <div className="flex flex-col border border-gray-300 border-l-0 rounded-r overflow-hidden">
          <button
            type="button"
            onClick={() => handleTimerIncrement(1)}
            className="px-1 text-xs leading-none hover:bg-gray-100"
            title="Add 1 minute"
            aria-label="Add one minute"
          >
            <ChevronUp className="w-3.5 h-full" />
          </button>
          <button
            type="button"
            onClick={() => handleTimerIncrement(-1)}
            className="px-1 text-xs leading-none border-t border-gray-300 hover:bg-gray-100 disabled:opacity-50"
            title="Subtract 1 minute"
            aria-label="Subtract one minute"
            disabled={timerValue <= 0}
          >
            <ChevronDown className="w-3.5 h-full" />
          </button>
        </div>
      </div>
    );
  }

  // View mode
  return (
    <div className={`flex items-center gap-1 flex-none w-auto px-1.5 py-0.5 text-sm text-gray-600 rounded whitespace-nowrap leading-none h-6 ${className}`}>
      {showIcon && <TimerIcon />}
      {formatTimer(timerValue)}
    </div>
  );
};

export default AgendaTimer;
