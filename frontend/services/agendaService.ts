import { AgendaItemType, useAgendaStore, MeetingTimerSettings, Visibility } from "../stores/useAgendaStore";
import { BACKEND_URL, MEETING_ID } from "../config/constants";
import zoomSdk from "@zoom/appssdk";

type AgendaItemResponse = {
  id: string;
  meeting_id: string;
  agenda_item: string;
  duration_seconds?: number;
  status: "pending" | "processed";
};

export interface AgendaItemPayload {
  id: string;
  text: string;
  duration_seconds?: number;
  isProcessed: boolean;
}

// export async function fetchAgendaItemsOnMount(meetingId: string): Promise<AgendaItemType[]> {
//   const res = await fetch(`${BACKEND_URL}/agenda_items?meeting_id=${meetingId}`);
//   if (!res.ok) throw new Error(`Failed to fetch agenda items: ${res.status}`);
//   const body = (await res.json()) as { items: AgendaItemResponse[] };
//   return body.items.map((item) => ({
//     id: item.id,
//     text: item.agenda_item,
//     originalText: item.agenda_item,
//     isNew: false,
//     isEdited: false,
//     isDeleted: false,
//     isProcessed: item.status === "processed",
//     timerValue: item.duration_seconds ?? 0,
//     originalTimerValue: item.duration_seconds ?? 0,
//     isEditedTimer: false,
//   }));
// }

async function getZoomMeetingIdSafe(): Promise<string | null> {
  try {
    await zoomSdk.config({ capabilities: ["getMeetingContext"] });
    const ctx = await zoomSdk.getMeetingContext();
    return ctx?.meetingID ? String(ctx.meetingID) : null;
  } catch {
    return null; // not inside Zoom
  }
}

export async function fetchAgendaItemsByZoomMeetingId(zoomMeetingId: string): Promise<AgendaItemType[]> {
  const res = await fetch(`${BACKEND_URL}/agenda_items?zoom_meeting_id=${encodeURIComponent(zoomMeetingId)}`);
  if (!res.ok) throw new Error(`Failed to fetch agenda items by zoom_meeting_id: ${res.status}`);
  const body = (await res.json()) as { items: AgendaItemResponse[] };
  return body.items.map((item) => ({
    id: item.id,
    text: item.agenda_item,
    originalText: item.agenda_item,
    isNew: false,
    isEdited: false,
    isDeleted: false,
    isProcessed: item.status === "processed",
    timerValue: item.duration_seconds ?? 0,
    originalTimerValue: item.duration_seconds ?? 0,
    isEditedTimer: false,
  }));
}

/**
 * Save local edits via REST, then refresh host state.
 * Server will also broadcast to all participants on save completion.
 */
export async function saveItemsToBackend(
  items: AgendaItemType[],
  saveSuccess: (items: AgendaItemType[]) => void
): Promise<AgendaItemType[]> {
  // mark empty items for delete
  items.forEach((it) => { if ((it.text || "").trim() === "") it.isDeleted = true; });

  const zoomMeetingId = await getZoomMeetingIdSafe();
  const toCreate = items.filter((it) => it.isNew && !it.isDeleted);
  const toUpdate = items.filter((it) => !it.isNew && (it.isEdited || it.isEditedTimer) && !it.isDeleted);
  const toDelete = items.filter((it) => it.isDeleted && it.id != null);

  // CREATE
  await Promise.all(
    toCreate.map((item) =>
      fetch(`${BACKEND_URL}/agenda_items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // meeting_id: MEETING_ID,
          zoom_meeting_id: zoomMeetingId ?? MEETING_ID, // prefer Zoom ID; fallback only for local/dev
          agenda_item: item.text,
          duration_seconds: item.timerValue || 0,
        }),
      }).then(async (res) => {
        if (!res.ok) throw new Error(`POST failed: ${res.status}`);
        const { item: saved } = await res.json();
        item.id = saved.id;
        item.isNew = false;
      })
    )
  );

  // UPDATE
  await Promise.all(
    toUpdate.map(async (item) => {
      const res = await fetch(`${BACKEND_URL}/agenda_items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agenda_item: item.text,
          duration_seconds: item.timerValue || 0,
        }),
      });
      if (res.status === 404) {
        console.warn(`PATCH 404 – item ${item.id} not found (skipping).`);
      } else if (!res.ok) {
        throw new Error(`PATCH failed: ${res.status}`);
      } else {
        item.isEdited = false;
        item.isEditedTimer = false;
      }
    })
  );

  // DELETE
  await Promise.all(
    toDelete.map(async (item) => {
      const res = await fetch(`${BACKEND_URL}/agenda_items/${item.id}`, { method: "DELETE" });
      if (res.status === 404) {
        console.warn(`DELETE 404 – item ${item.id} not found (skipping).`);
      } else if (!res.ok) {
        throw new Error(`DELETE failed: ${res.status}`);
      }
    })
  );

  // Refresh host view (participants already got socket broadcast from server)
  const listRes = await fetch(`${BACKEND_URL}/agenda_items?meeting_id=${MEETING_ID}`);
  if (!listRes.ok) throw new Error(`Failed to fetch updated agenda: ${listRes.status}`);

  const body2 = (await listRes.json()) as { items: AgendaItemResponse[] };

  const freshItems: AgendaItemType[] = body2.items.map((item) => ({
    id: item.id,
    text: item.agenda_item,
    originalText: item.agenda_item,
    isNew: false,
    isEdited: false,
    isDeleted: false,
    isProcessed: item.status === "processed",
    timerValue: item.duration_seconds ?? 0,
    originalTimerValue: item.duration_seconds ?? 0,
    isEditedTimer: false,
  }));

  saveSuccess(freshItems);
  return freshItems;
}

// export async function clearAllAgendaItemsFromDB() {
//   const url = `${BACKEND_URL}/agenda_items?meeting_id=${MEETING_ID}`;
//   const res = await fetch(url, { method: "DELETE" });
//   if (!res.ok) {
//     const body = await res.json().catch(() => ({}));
//     throw new Error(body?.error || `Failed to delete agenda items (HTTP ${res.status}).`);
//   }
// }

export async function clearAllAgendaItemsFromDB(): Promise<void> {
  const zoomMeetingId = await getZoomMeetingIdSafe();
  const url = `${BACKEND_URL}/agenda_items?${
    zoomMeetingId
      ? `zoom_meeting_id=${encodeURIComponent(zoomMeetingId)}`
      : `meeting_id=${encodeURIComponent(MEETING_ID)}`
  }`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete agenda items: ${res.status}`);
}

/* -------- Timer settings (REST) -------- */

async function fetchMeetingTimerSettings(): Promise<MeetingTimerSettings> {
  const res = await fetch(`${BACKEND_URL}/meetings/${MEETING_ID}/timer-settings`);
  if (!res.ok) throw new Error(`Failed to fetch timer settings: ${res.status}`);
  const body = (await res.json()) as { timer_settings: MeetingTimerSettings };
  return body.timer_settings;
}

async function saveMeetingTimerSettings(settings: {
  hasTimers: boolean;
  defaultVisibility: Visibility;
  automation: { autoAdvance: boolean; autoStartNextTimer: boolean };
}): Promise<MeetingTimerSettings> {
  const res = await fetch(`${BACKEND_URL}/meetings/${MEETING_ID}/timer-settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`Failed to save timer settings: ${res.status}`);
  const body = (await res.json()) as { timer_settings: MeetingTimerSettings };
  return body.timer_settings;
}

export async function persistMeetingTimerSettings(
  hasTimers: boolean,
  defaultVisibility: Visibility,
  autoAdvance: boolean,
  autoStartNextTimer: boolean
) {
  const saved = await saveMeetingTimerSettings({
    hasTimers,
    defaultVisibility,
    automation: { autoAdvance, autoStartNextTimer },
  });
  useAgendaStore.getState().applyTimerSettingsFromDb(saved);
  return saved;
}

export async function loadMeetingTimerSettings() {
  const settings = await fetchMeetingTimerSettings();
  useAgendaStore.getState().applyTimerSettingsFromDb(settings);
  return settings;
}
