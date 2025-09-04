// frontend/app/page.tsx
"use client";

import React, { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAgendaStore } from "@/stores/useAgendaStore";
import { loadMeetingTimerSettings } from "@/services/agendaService";
import { initAgendaSockets } from "@/sockets/agenda";
import { initSettingsSockets } from "@/sockets/settings";
import { socket } from "../sockets/socket";
import { MEETING_ID } from "@/config/constants";
import zoomSdk from "@zoom/appssdk";
// import { fetchAgendaItemsOnMount } from "../services/agendaService";
import { fetchAgendaItemsByZoomMeetingId } from "../services/agendaService";


import Agenda from "@/components/Agenda";
import Settings from "@/components/Settings";
import Header from "@/components/Header";
import BtnCancelSave from "@/components/BtnCancelSave";
import NudgeStatsPanel from "@/components/NudgeStatsPanel";

export default function Home() {
  return (
    <Suspense fallback={<div className="p-4">Loading…</div>}>
      <HomeContent />
    </Suspense>
  );
}
// adding a comment for deployment
function HomeContent() {
  const searchParams = useSearchParams();
  const [role, setRole] = React.useState<"host" | "participant">("participant");

  const [mounted, setMounted] = React.useState(false); // 👈 gate hydration
  //
  const { isEditingMode, showSettings, setAgendaItems } = useAgendaStore();
    
  /* Initialize Zoom Apps SDK and log meeting & user IDs when running inside Zoom
  *
  *  meetingCtx?.meetingID = meeting ID
  *  userCtx?.role = role (host/attendee)
  */ 
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Configure SDK with only the capabilities we need
        await zoomSdk.config({
          capabilities: ["getMeetingContext", "getUserContext", "getMeetingUUID"],
        });

        const meetingCtx = await zoomSdk.getMeetingContext();
        const userCtx = await zoomSdk.getUserContext();
        const meetingUUID = await zoomSdk.getMeetingUUID();

        if (!mounted) return;

        // Log to console for now the meeting id
        console.log(
          `[Zoom Apps] meetingID=${meetingCtx?.meetingID} | meetingUUID=${meetingUUID?.meetingUUID} | meetingTopic=${meetingCtx?.meetingTopic}`
        );
        console.log(
          `[Zoom Apps] user screenName=${userCtx?.screenName} | participantUUId=${userCtx?.participantUUID} | role=${userCtx?.role} | status=${userCtx?.status}`
        );
        // Default view: participant unless Zoom says host
        setRole(userCtx?.role === "host" ? "host" : "participant");
        if (meetingCtx?.meetingID) {
          try {
            const items = await fetchAgendaItemsByZoomMeetingId(String(meetingCtx.meetingID));
            // const items = await fetchAgendaItemsOnMount(meetingCtx.meetingID);
            setAgendaItems(items);
          } catch (err) {
            console.error("Error fetching agenda items:", err);
          }
        }

      } catch (e) {
        // Not running inside Zoom or SDK not available; keep silent in production
        console.debug("[Zoom Apps] SDK not available or init failed:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setAgendaItems]);

  // Optional override via URL ?role=host|participant (use verbatim, no inversion)
  useEffect(() => {
    const qp = searchParams.get("role");
    if (qp === "host" || qp === "participant") {
      setRole(qp);
    }
  }, [searchParams]);

  
  // emit initial socket events
  useEffect(() => {
    initAgendaSockets();
    initSettingsSockets();
    socket.emit("joinMeeting", MEETING_ID);
    socket.emit("agenda:get");
    socket.emit("timer:get", MEETING_ID);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadMeetingTimerSettings();
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    // wait until client mounted to render the list
    setMounted(true);
  }, []);

  return (
    <aside className="fixed left-0 top-0 h-[100svh] max-h-[1000px] flex flex-col w-full max-w-[400px]                      bg-[var(--primary)] transition-width duration-100 ease-in-out space-y-2">
      <div id="main" className="flex flex-col flex-grow justify-center space-y-2 min-h-0">
        <div id="header" className="flex-shrink-0 bg-[var(--secondary)] pb-2 rounded-b-xl shadow-md">
          <Header role={role} />
        </div>

        <div className="flex-1 min-h-0 relative overflow-hidden rounded-md">
          <div className="overflow-y-auto h-full rounded-lg px-4">
            {showSettings ? (
              <Settings />
            ) : (
              <div>
                {/* 👇 Only render Agenda after mount to avoid SSR/CSR mismatch */}
                {mounted ? (
                  <Suspense fallback={<div className="py-4">Loading agenda…</div>}>
                    <Agenda role={role} />
                  </Suspense>
                ) : (
                  <div className="py-4">Loading agenda…</div>
                )}
              </div>
            )}
          </div>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8" />
        </div>

        <div className="flex-shrink-0 justify-center border-t border-gray-200">
          {isEditingMode && !showSettings && <BtnCancelSave />}
          <Suspense fallback={<div className="px-4 py-3">Loading requests…</div>}>
            <NudgeStatsPanel />
          </Suspense>
        </div>
      </div>
    </aside>
  );
}
