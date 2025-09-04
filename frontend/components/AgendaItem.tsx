"use client";
import React, { useRef, useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { AgendaItemType } from '../stores/useAgendaStore';
import Timer from "./Timer";
import scrollIntoView from 'scroll-into-view-if-needed';


const ADD_ITEM_PLACEHOLDER = 'Add an agenda item';
const REMOVE_ITEM_PLACEHOLDER = 'Remove this agenda item';

interface AgendaItemProps {
  item: AgendaItemType;
  onChange: (id: string, newText: string) => void;
  onChangeTimer: (id: string, timerValue: number) => void;
  onRemove: (id: string) => void;
  canEdit?: boolean;
  showTimers?: boolean;
  isCurrentItem?: boolean;
  autoFocus?: boolean;
}

function AgendaItem({
  item,
  onChange,
  onChangeTimer,
  onRemove,
  canEdit = false,
  showTimers = false,
  autoFocus = false,
}: AgendaItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(item.text.trim() === '');
  const [truncated, setTruncated] = useState(true);

  const liRef = useRef<HTMLLIElement | null>(null);
  const divRef = useRef<HTMLDivElement | null>(null);

  // Keep placeholder state in sync
  useEffect(() => {
    if (divRef.current) {
      divRef.current.innerText = item.text;
      setIsEmpty(item.text.trim() === '');
    }
  }, [item.text]);

useEffect(() => {
  if (!autoFocus) return;

  const el = liRef.current;
  if (!el) return;                 // not mounted yet

  const container = el.closest(".overflow-y-auto") as HTMLElement | null;

  requestAnimationFrame(() => {
    if (!el.isConnected) return;

    try {
      scrollIntoView(el, {
        scrollMode: "if-needed",
        block: "center",
        inline: "nearest",
        behavior: "smooth",

        boundary: (parent: Element) => {
          if (container && parent === container) return true;
          if (parent === document.documentElement || parent === document.body) return true;
          return false;
        },
      });
    } catch (e) {
      console.warn("scrollIntoView failed", e);
    }

    if (canEdit && divRef.current) {
      divRef.current.focus();
      setIsEditing(true);
    }
  });
}, [autoFocus, canEdit]);


  const handleClick = () => {
    setTruncated(prev => !prev);
    if (!canEdit) return;
    setIsEditing(true);
    setIsEmpty(false);
    setTimeout(() => {
      divRef.current?.focus();
    }, 0);
  };

  const handleBlur = () => {
    if (!canEdit) return;
    setIsEditing(false);
    setTimeout(() => {
      if (!divRef.current) return;
      const text = divRef.current.innerText.trim();
      if (text === '') {
        divRef.current.innerText = '';
        setIsEmpty(true);
      } else {
        setIsEmpty(false);
        if (text !== item.text) {
          onChange(item.id, text);
        }
      }
    }, 30);
  };

  const handleInput = () => {
    if (divRef.current) {
      const newText = divRef.current.innerText.trim();
      setIsEmpty(newText === '');
    }
  };

  return (
    <li
      ref={liRef}
      className="pt-2 relative border-b border-gray-200 group
      hover:shadow-[0_4px_4px_-2px_rgba(0,0,0,0.04)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`grid items-start gap-x-3 ${showTimers ? 'grid-cols-[1fr_auto_auto]' : 'grid-cols-[1fr_auto]'}`}>
        <div className="relative min-w-0">
          {isEmpty && !isEditing && (
            <span className="absolute left-3 top-2 text-gray-400 italic pointer-events-none select-none">
              {ADD_ITEM_PLACEHOLDER}
            </span>
          )}

          <div
            ref={divRef}
            contentEditable={canEdit}
            suppressContentEditableWarning
            onClick={handleClick}
            onBlurCapture={handleBlur}
            onInput={handleInput}
            title={!canEdit && item.text.length > 80 ? item.text : undefined}
            className={`py-2 pl-1 w-full min-h-[2em] rounded-lg focus:outline-none leading-relaxed
              ${canEdit ? 'focus:ring-2' : 'cursor-default select-none pr-10'}
              ${truncated ? 'truncate' : 'whitespace-normal break-words'}
            `}
            spellCheck={false}
            tabIndex={canEdit ? 0 : -1}
          />
        </div>
        <div className='self-center'>
        {showTimers && (
            <Timer
              canEdit={canEdit}
              timerValue={item.timerValue}
              onChangeTimer={(val) => onChangeTimer(item.id, val)}
            />
        )}
      </div>
      </div>
        {isHovered && canEdit && (
          <button 
              className="absolute w-[1.5rem] right-[-16] top-1/2 -translate-y-3/10 z-10 text-red-600 hover:text-red-800 transition cursor-pointer"
              title={REMOVE_ITEM_PLACEHOLDER}
              aria-label={REMOVE_ITEM_PLACEHOLDER}
              onClick={() => onRemove(item.id)}
            >
              <FaTimes />
            </button>
          )}
    </li>
  );
}

export default AgendaItem;
