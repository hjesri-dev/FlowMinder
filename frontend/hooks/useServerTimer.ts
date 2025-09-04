import { useEffect, useRef, useState } from "react";
import { socket } from "../sockets/socket";
import { MEETING_ID } from "../config/constants";

export type Status = "pending" | "running" | "paused";
export interface TimerStateMsg {
  status: Status;
  endAt: number;
  serverTime: number;
  remainingMs?: number;
}

function isTimerStateMsg(p: unknown): p is TimerStateMsg {
  if (typeof p !== "object" || p === null) return false;
  const o = p as Record<string, unknown>;
  const ok = o.status === "pending" || o.status === "running" || o.status === "paused";
  return ok && typeof o.endAt === "number" && typeof o.serverTime === "number";
}

export function useServerTimer() {
  const [status, setStatus] = useState<Status>("pending");
  const [endAt, setEndAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const skewRef = useRef(0);

  // Setup once
  useEffect(() => {
    // join the room and request state
    socket.emit("joinMeeting", MEETING_ID);
    socket.emit("timer:get", MEETING_ID);

    const onState = (payload: unknown) => {
      if (!isTimerStateMsg(payload)) return;

      skewRef.current = payload.serverTime - Date.now();
      setStatus(payload.status);
      setEndAt(payload.endAt);

      let remMs = 0;
      if (payload.status === "paused" && typeof payload.remainingMs === "number") {
        remMs = Math.max(0, payload.remainingMs);
      } else if (payload.status === "running") {
        const nowSkewed = Date.now() + skewRef.current;
        remMs = Math.max(0, payload.endAt - nowSkewed);
      }
      setRemaining(Math.ceil(remMs / 1000));
    };

    // ✅ Attach listener
    socket.on("timer:state", onState);

    // ✅ Return proper cleanup that removes the listener (returns void)
    return () => {
      socket.off("timer:state", onState);
      // (Do not return socket or any value here)
    };
  }, []);

  // Tick only when running
  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => {
      const nowSkewed = Date.now() + skewRef.current;
      const remMs = Math.max(0, endAt - nowSkewed);
      setRemaining(Math.ceil(remMs / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [status, endAt]);

  // Periodic resync while running
  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => {
      socket.emit("timer:get", MEETING_ID);
    }, 10_000);
    return () => clearInterval(id);
  }, [status]);

  // Commands (server expects { meetingId })
  const start  = (seconds: number) =>
    socket.emit("timer:start",  { meetingId: MEETING_ID, durationMs: Math.max(0, seconds) * 1000 });
  const pause  = () =>
    socket.emit("timer:pause",  { meetingId: MEETING_ID });
  const resume = () =>
    socket.emit("timer:resume", { meetingId: MEETING_ID });
  const cancel = () =>
    socket.emit("timer:cancel", { meetingId: MEETING_ID });
  const update = (proposedEndAt: number) =>
    socket.emit("timer:edit:save", { meetingId: MEETING_ID, proposedEndAt: Math.floor(proposedEndAt) });

  return { status, remaining, endAt, start, pause, resume, cancel, update };
}
