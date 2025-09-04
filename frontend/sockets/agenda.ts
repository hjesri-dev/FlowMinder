import { socket } from "./socket";
import { useAgendaStore, type AgendaItemType } from "../stores/useAgendaStore";
import { MEETING_ID } from "../config/constants";

let wired = false;

// Shapes coming from the server
type itemFromServer = {
  id: string;
  text: string;
  timerValue?: number | null;
  isProcessed?: boolean;
  processedAt?: string | null;
};

type SendSnapshot = { agenda: itemFromServer[] };
type SendUpdate = { agenda?: itemFromServer[] };

// Mapper: itemFromServer -> AgendaItemType
const toStoreItem = (it: itemFromServer): AgendaItemType => {
  const timer = it.timerValue ?? 0;
  return {
    id: it.id,
    text: it.text,
    originalText: it.text,
    isNew: false,
    isEdited: false,
    isDeleted: false,
    isProcessed: !!it.isProcessed,
    timerValue: timer,
    originalTimerValue: timer,
    isEditedTimer: false,
    processedAt: it.processedAt ?? null,
  };
};

export function initAgendaSockets(): void {
  if (wired) return;
  wired = true;

  socket.on("connect", () => {
    socket.emit("joinMeeting", MEETING_ID);
    socket.emit("agenda:get");
  });

  socket.on("agenda:snapshot", (s: SendSnapshot) => {
    useAgendaStore.getState().setAgendaItems(s.agenda.map(toStoreItem));
  });

  socket.on("agenda:update", (patch: SendUpdate) => {
    if (!patch.agenda) return;
    useAgendaStore.getState().setAgendaItems(patch.agenda.map(toStoreItem));
  });
}
