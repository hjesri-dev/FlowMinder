// Single-meeting agenda over Socket.IO
const { MEETING_ID } = require('../config/constants');
//
let state = null; // { version, agenda, currentIndex }

function toClientItem(row) {
  return {
    id: row.id,
    text: row.agenda_item,
    timerValue: Number(row.duration_seconds || 0),
    isProcessed: row.status === 'processed',
    processedAt: row.processed_at ? new Date(row.processed_at).toISOString() : null,
  };
}

async function loadFromDB(pool) {
  const { rows } = await pool.query(
    `SELECT id, agenda_item, duration_seconds, status, processed_at
     FROM agenda_items
     WHERE meeting_id = $1
     ORDER BY
       order_index ASC NULLS LAST,
       created_at ASC NULLS LAST,
       id ASC`,
    [MEETING_ID]
  );

  const agenda = rows.map(toClientItem);
  const firstPending = agenda.findIndex((it) => !it.isProcessed);
  return {
    version: (state?.version || 0) + 1,
    agenda,
    currentIndex: firstPending === -1 ? agenda.length : Math.max(0, firstPending),
  };
}

async function ensureState(pool) {
  if (!state) state = await loadFromDB(pool);
  return state;
}

function emitSnapshot(socket) {
  if (!state) return;
  socket.emit('agenda:snapshot', state);
}

function broadcastPatch(io, patch) {
  if (!state) return;
  io.to(MEETING_ID).emit('agenda:update', { ...patch, version: state.version });
}

async function persistProcessed(pool, idsToProcessed) {
  if (!idsToProcessed.length) return;
  const now = new Date().toISOString();

  const statusCase = [];
  const processedAtCase = [];
  const values = [MEETING_ID];
  const processedAtValues = [];

  idsToProcessed.forEach(({ id, isProcessed }, idx) => {
    const idPos = idx + 2;
    const processedAtPos = idPos + idsToProcessed.length;

    statusCase.push(`WHEN id = $${idPos} THEN '${isProcessed ? 'processed' : 'pending'}'`);
    processedAtCase.push(`WHEN id = $${idPos} THEN $${processedAtPos}::timestamptz`);

    values.push(id);
    processedAtValues.push(isProcessed ? now : null);
  });

  values.push(...processedAtValues);
  const idPlaceholders = values
    .slice(1, idsToProcessed.length + 1)
    .map((_, i) => `$${i + 2}`)
    .join(', ');

  const query = `
    UPDATE agenda_items
    SET
      status = CASE ${statusCase.join(' ')} END,
      processed_at = CASE ${processedAtCase.join(' ')} END
    WHERE meeting_id = $1
      AND id IN (${idPlaceholders})
  `;
  await pool.query(query, values);
}

/** Public: force-refresh from DB and broadcast (used by REST "Save") */
async function agendaBroadcastFromDb(io, pool) {
  state = await loadFromDB(pool);
  io.to(MEETING_ID).emit('agenda:update', {
    agenda: state.agenda,
    currentIndex: state.currentIndex,
    version: state.version,
  });
}

function attachAgenda(io, pool) {
  io.on('connection', (socket) => {
    socket.on('joinMeeting', async () => {
      socket.join(MEETING_ID);
      await ensureState(pool);
      emitSnapshot(socket);
    });

    socket.on('agenda:get', async () => {
      await ensureState(pool);
      emitSnapshot(socket);
    });

    socket.on('agenda:next', async (_, ack) => {
      try {
        const s = await ensureState(pool);
        const idx = s.agenda.findIndex((it) => !it.isProcessed);
        if (idx === -1) return ack?.({ ok: true, noop: true, version: s.version });

        const item = s.agenda[idx];
        item.isProcessed = true;
        item.processedAt = new Date().toISOString();

        s.currentIndex = Math.min(idx + 1, s.agenda.length);
        s.version++;

        await persistProcessed(pool, [{ id: item.id, isProcessed: true }]);
        broadcastPatch(io, { agenda: s.agenda, currentIndex: s.currentIndex });
        ack?.({ ok: true, version: s.version });
      } catch (e) {
        console.error('[agenda:next]', e);
        ack?.({ ok: false, error: 'server error' });
      }
    });

    socket.on('agenda:prev', async (_, ack) => {
      try {
        const s = await ensureState(pool);

        const lastProcessedIdx =
          s.agenda.findLastIndex?.((it) => it.isProcessed) ??
          (() => { for (let i = s.agenda.length - 1; i >= 0; i--) if (s.agenda[i].isProcessed) return i; return -1; })();

        if (lastProcessedIdx === -1) return ack?.({ ok: true, noop: true, version: s.version });

        const item = s.agenda[lastProcessedIdx];
        item.isProcessed = false;
        item.processedAt = null;

        const firstPending = s.agenda.findIndex((it) => !it.isProcessed);
        s.currentIndex = firstPending === -1 ? s.agenda.length : firstPending;
        s.version++;

        await persistProcessed(pool, [{ id: item.id, isProcessed: false }]);
        broadcastPatch(io, { agenda: s.agenda, currentIndex: s.currentIndex });
        ack?.({ ok: true, version: s.version });
      } catch (e) {
        console.error('[agenda:prev]', e);
        ack?.({ ok: false, error: 'server error' });
      }
    });
  });
}

module.exports = { attachAgenda, agendaBroadcastFromDb };
