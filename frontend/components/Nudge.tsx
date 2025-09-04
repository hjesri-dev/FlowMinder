"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { socket } from "@/sockets/socket";
import { MEETING_ID, CURRENT_USER_ID } from "@/config/constants";
import { useNudgeStore } from "@/stores/useNudgeStore";

type UiKind = "move_along" | "invite_speak";

export default function Nudge() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<UiKind | null>(null);
  const [q, setQ] = useState("");
  const uiRef = useRef<HTMLDivElement | null>(null);

  // roster from store (server = source of truth)
  const byId = useNudgeStore((s) => s.byId);
  const order = useNudgeStore((s) => s.order);

  // participants currently in the meeting (excluding self) + search filter
  const targets = useMemo(() => {
    const list = order.map((id) => byId[id]).filter(Boolean);
    const filtered = list
      .filter((p) => p.in_meeting && p.user_id !== CURRENT_USER_ID)
      .filter((p) => {
        if (!q.trim()) return true;
        const needle = q.toLowerCase();
        return (p.name || p.user_id).toLowerCase().includes(needle);
      });
    return filtered;
  }, [byId, order, q]);

  // click outside to close
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (uiRef.current && !uiRef.current.contains(e.target as Node)) {
        setOpen(false);
        setMode(null);
        setQ("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // send via socket (maps UI to backend kinds)
  function send(targetId: string, uiKind: UiKind) {
    const kind = uiKind === "invite_speak" ? "more" : "less";
    socket.emit("nudge:cast", {
      meetingId: MEETING_ID,
      voterId: CURRENT_USER_ID,
      targetId,
      kind, // "more" | "less"
    });
  }

  function openPanel(kind: UiKind) {
    setMode(kind);
    setOpen(true);
  }

  function handleSelect(targetId: string) {
    if (!mode) return;
    send(targetId, mode);
    // close & reset after sending
    setOpen(false);
    setMode(null);
    setQ("");
  }

  const panelTitle =
    mode === "invite_speak" ? "Invite to speak" : "Nudge to move along";

  return (
    // fixed so buttons are always visible; panel is anchored to them
    <div className="flex z-50" ref={uiRef}>
      {/* Two white buttons, always visible */}
      <div className="flex gap-2">
        <button
          onClick={() => openPanel("move_along")}
          className="px-4 py-2 cursor-pointer rounded-full bg-white text-sky-950 hover:bg-sky-50 font-semibold border border-gray-200 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
          title="Anonymously send a nudge to someone to move the conversation along."
        >
          Move along
        </button>
        <button
          onClick={() => openPanel("invite_speak")}
          className="px-4 py-2 cursor-pointer rounded-full bg-white text-sky-950 hover:bg-sky-50 font-semibold border border-gray-200 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
          title="Anonymously send a nudge to someone to speak up."
        >
          Speak up
        </button>
      </div>

      {/* Participant chooser */}
      {open && mode && (
        <div
          className="absolute top-full right-0 z-300 w-fit-content max-w-[40vw] bg-white shadow-lg rounded-2xl p-3 border border-gray-100"
          role="dialog"
          aria-label="Choose a participant to nudge"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-sky-950 font-semibold">{panelTitle}</div>
            <button
              onClick={() => {
                setOpen(false);
                setMode(null);
                setQ("");
              }}
              className="text-gray-500 hover:text-gray-700 rounded-full px-2 py-1"
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>

          <div className="max-h-64 overflow-auto">
            {targets.length === 0 && (
              <div className="text-sm text-gray-500 px-2 py-3">
                No matching participants
              </div>
            )}

            {targets.map((p) => (
              <button
                key={p.user_id}
                onClick={() => handleSelect(p.user_id)}
                className="w-full text-left flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-gray-50 focus:outline-none"
                title={`Send ${panelTitle.toLowerCase()} to ${p.name || p.user_id}`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-800 text-sm font-semibold">
                    {initials(p.name || p.user_id)}
                  </span>
                  <span className="min-w-0">
                    <span className="truncate block font-medium text-gray-900">
                      {p.name || p.user_id}
                    </span>
                    <span className="text-xs text-gray-500">
                      ↑ {p.more} · ↓ {p.less}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
