"use client";
// import React, { useEffect } from "react";
import AgendaItem from "./AgendaItem";
import BtnAddAgendaItem from "./BtnAddAgendaItem";
import { useAgendaStore } from '../stores/useAgendaStore';
// Agenda data is loaded by the parent (page.tsx) and pushed into the store.
import DropdownMenu from "./DropdownMenu";
import '../app/globals.css';

export default function Agenda({ role = "participant" }: { role?: "host" | "participant" }) {
  const {
    addItem,
    changeItem,
    removeItem,
    changeItemTimer,
    areTimersAdded,
    hasTimers,
    isEditingMode,
    getCurrentItem,
    getVisibleItems,
    lastAddedItemId,
  } = useAgendaStore();

  const setEditingMode = useAgendaStore((state) => state.setEditingMode);
  const currentItem = getCurrentItem();
  const visibleItems = getVisibleItems();

  // Agenda data is loaded by the parent (page.tsx) and pushed into the store.

  return (
    <>
      {/* Header with dropdown menu for hosts */}
      <div className={`sticky top-0 z-30 bg-[var(--primary)]`}>
        <div className={`pt-2 ml-2 mr-4 pb-1 bg-[var(--primary)] flex justify-between items-center`}>
          <h2 className="font-semibold text-lg truncate">next on the agenda…</h2>
          {role === 'host' && (
            <DropdownMenu />
          )}
        </div>
      </div>
      <ul className="list-none mb-2">
        {visibleItems.map((item) => (
          <AgendaItem
            key={item.id}
            item={item}
            onChange={changeItem}
            onChangeTimer={changeItemTimer}
            onRemove={removeItem}
            canEdit={isEditingMode || currentItem?.id === item.id}
            showTimers={areTimersAdded || hasTimers}
            isCurrentItem={currentItem?.id === item.id}
            autoFocus={item.id === lastAddedItemId}
          />
        ))}
      </ul>

      {/* Add Agenda Item Button */}
      {role === 'host' && (
        <BtnAddAgendaItem
          onAdd={addItem}
          setEditingMode={() => setEditingMode(true)}
        />
      )}
    </>
  );
}
