// src/sockets/nudge.ts
import { socket } from "./socket";
import { MEETING_ID, CURRENT_USER_ID } from "@/config/constants";
import { useNudgeStore } from "../stores/useNudgeStore";

let wired = false;

type ParticipantRow = {
  user_id: string;
  name: string;
  more: number;
  less: number;
  in_meeting: boolean;
};

type SnapshotPayload = { participants: ParticipantRow[] };
type UpdateCounts = { targetId: string; more: number; less: number };
type Rejected = { reason: "cooldown" | "invalid" | "server_error"; remainingMs?: number };

export function initNudgeSockets() {
  if (wired) return; wired = true;

  socket.emit("joinMeeting", MEETING_ID);

  socket.on("nudge:snapshot", ({ participants }: SnapshotPayload) => {
    useNudgeStore.getState().replaceAll(participants);
  });

  socket.on("nudge:participant:update", (p: ParticipantRow) => {
    useNudgeStore.getState().upsert(p);
  });

  socket.on("nudge:update", ({ targetId, more, less }: UpdateCounts) => {
    useNudgeStore.getState().mergeCounts(targetId, { more, less });
  });

  socket.on("nudge:rejected", ({ reason, remainingMs }: Rejected) => {
    if (reason === "cooldown") {
      const secs = Math.ceil((remainingMs || 0) / 1000);
      useNudgeStore.getState().showToast?.(`You can nudge them again in ~${secs}s`);
    } else {
      useNudgeStore.getState().showToast?.("Could not send nudge.");
    }
  });
}

export function sendNudge(targetId: string, kind: "more" | "less") {
  socket.emit("nudge:cast", { meetingId: MEETING_ID, voterId: CURRENT_USER_ID, targetId, kind });
}
