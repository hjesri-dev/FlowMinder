"use client";
import React from 'react';
import { useAgendaStore } from '../stores/useAgendaStore';

interface BtnAddTimerForCurrentItemProps {
    className?: string;
}

export default function BtnAddTimerForCurrentItem({ className = '' }: BtnAddTimerForCurrentItemProps) {
    const { toggleEditingMode, isEditingMode } = useAgendaStore();

    const handleClick = () => {
        // Toggle editing mode for current item only
        toggleEditingMode();
    };

    return (
        <button
            onClick={handleClick}
            className={`w-6 h-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors duration-200 text-sm ${className}`}
            title={isEditingMode ? "Cancel timer editing" : "Add timer for current item"}
        >
            {isEditingMode ? (
                <span className="text-xs">×</span>
            ) : (
                <span className="text-xs">+</span>
            )}
        </button>
    );
} 