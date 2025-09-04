const { getVoterToTargetCooldownWindow } = require("./nudgeCooldown.js");

const room = (id) => `meeting:${id}`;

function initNudgeSockets(io, pool) {
    io.on("connection", (socket) => {
        socket.on("joinMeeting", async (meetingId) => {
            try {
                socket.join(room(meetingId));
                const snapshot = await buildSnapshot(meetingId, pool);
                socket.emit("nudge:snapshot", snapshot);
            } catch (e) {
                console.error("joinMeeting error", e);
            }
        });

        // { meetingId, voterId, targetId, kind: "more"|"less" }
        socket.on("nudge:cast", async ({ meetingId, voterId, targetId, kind }) => {
            try {
                if (!meetingId || !voterId || !targetId || !["more", "less"].includes(kind)) {
                    console.warn("nudge:rejected invalid", { meetingId, voterId, targetId, kind });
                    return socket.emit("nudge:rejected", { reason: "invalid" });
                }

                const { ok, remainingMs } = getVoterToTargetCooldownWindow({ meetingId, voterId, targetId });
                if (!ok) {
                    console.warn("nudge:rejected cooldown", { meetingId, voterId, targetId, remainingMs });
                    return socket.emit("nudge:rejected", { reason: "cooldown", remainingMs });
                }

                const updated = await applyNudge({ meetingId, targetId, kind }, pool);

                io.to(`meeting:${meetingId}`).emit("nudge:update", {
                    targetId: updated.user_id,
                    more: updated.more,
                    less: updated.less,
                });
            } catch (e) {
                if (e && e.code === "TARGET_NOT_IN_MEETING") {
                    console.warn("nudge:rejected target_not_in_meeting", { meetingId, targetId });
                    return socket.emit("nudge:rejected", { reason: "target_not_in_meeting" });
                }
                console.error("nudge:rejected server_error", e);
                socket.emit("nudge:rejected", { reason: "server_error", error: e.message });
            }
        });

        socket.on("nudge:reset", async ({ meetingId }) => {
            try {
                await pool.query(
                    `UPDATE nudges
             SET speak_more_count = 0,
                 speak_less_count = 0,
                 updated_at = now()
           WHERE meeting_id = $1`,
                    [meetingId]
                );
                io.to(room(meetingId)).emit("nudge:snapshot", await buildSnapshot(meetingId, pool));
            } catch (e) {
                console.error("nudge:reset error", e);
            }
        });
    });
}

// Call these from your Zoom webhook handlers (server = source of truth)
async function markParticipantJoined(io, pool, { meetingId, userId }) {
    await pool.query(
        `INSERT INTO nudges (meeting_id, user_id, in_meeting)
     VALUES ($1, $2, true)
     ON CONFLICT (meeting_id, user_id)
     DO UPDATE SET in_meeting = true, updated_at = now()`,
        [meetingId, userId]
    );
    const p = await fetchParticipantRow(pool, meetingId, userId);
    io.to(room(meetingId)).emit("nudge:participant:update", p);
}

async function markParticipantLeft(io, pool, { meetingId, userId }) {
    await pool.query(
        `UPDATE nudges
        SET in_meeting = false, updated_at = now()
      WHERE meeting_id = $1 AND user_id = $2`,
        [meetingId, userId]
    );
    const p = await fetchParticipantRow(pool, meetingId, userId);
    io.to(room(meetingId)).emit("nudge:participant:update", p);
}

// ---------- helpers ----------

async function buildSnapshot(meetingId, pool) {
    const { rows } = await pool.query(
        `SELECT n.user_id,
            COALESCE(z.display_name, n.user_id) AS name,
            n.speak_more_count AS more,
            n.speak_less_count AS less,
            n.in_meeting
       FROM nudges n
  LEFT JOIN zoom_users z ON z.user_id = n.user_id
      WHERE n.meeting_id = $1
      ORDER BY name ASC`,
        [meetingId]
    );
    return { participants: rows };
}

async function fetchParticipantRow(pool, meetingId, userId) {
    const { rows } = await pool.query(
        `SELECT n.user_id,
            COALESCE(z.display_name, n.user_id) AS name,
            n.speak_more_count AS more,
            n.speak_less_count AS less,
            n.in_meeting
       FROM nudges n
  LEFT JOIN zoom_users z ON z.user_id = n.user_id
      WHERE n.meeting_id = $1 AND n.user_id = $2`,
        [meetingId, userId]
    );
    return rows[0];
}

async function applyNudge({ meetingId, targetId, kind }, pool) {
    const { rowCount, rows } = await pool.query(
        `
    UPDATE nudges
       SET speak_more_count = speak_more_count + CASE WHEN $3 = 'more' THEN 1 ELSE 0 END,
           speak_less_count = speak_less_count + CASE WHEN $3 = 'less' THEN 1 ELSE 0 END,
           updated_at       = now()
     WHERE meeting_id = $1
       AND user_id    = $2
       AND in_meeting = true
     RETURNING user_id, speak_more_count AS more, speak_less_count AS less
    `,
        [meetingId, targetId, kind]
    );

    if (rowCount !== 1) {
        const err = new Error("TARGET_NOT_IN_MEETING");
        err.code = "TARGET_NOT_IN_MEETING";
        throw err;
    }
    return rows[0];
}

module.exports = {
    initNudgeSockets,
    markParticipantJoined,
    markParticipantLeft,
    buildSnapshot,
};
