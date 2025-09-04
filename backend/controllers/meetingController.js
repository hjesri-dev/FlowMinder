// backend/controllers/meetingController.js
const axios = require('axios');
const supabase = require('../utils/supabaseClient');
const { pool } = require('../db/pool');

exports.scheduleMeeting = async (req, res) => {
  try {
    const { userId, topic, startTime, agendaItems, items, timeZone } = req.body;

    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    if (!req.zoomAccessToken) return res.status(401).json({ error: 'Missing Zoom access token' });
    if (!startTime) return res.status(400).json({ error: 'Missing startTime' });

    // Accept either `items` (array) or `agendaItems` (array or JSON string)
    let parsed = [];
    if (Array.isArray(items)) {
      parsed = items;
    } else if (Array.isArray(agendaItems)) {
      parsed = agendaItems;
    } else if (typeof agendaItems === 'string') {
      try { parsed = JSON.parse(agendaItems); } catch (_) { /* ignore parse errors */ }
    }

    const agendaText = (parsed || [])
      .map((it, i) => {
        const label = it.agenda_item || it.text || '';
        const mins = it.duration_seconds ? Math.round(it.duration_seconds / 60) : 0;
        return `${i + 1}. ${label}${mins ? ` — ${mins} min` : ''}`;
      })
      .join('\n');

    const payload = {
      topic: (topic || '').trim() || 'FlowMinder Meeting',
      type: 2, // scheduled
      start_time: new Date(startTime).toISOString(), // Zoom expects ISO UTC
      timezone: timeZone || undefined,
      agenda: agendaText || undefined,
      settings: {
        join_before_host: true,
        approval_type: 2,
        waiting_room: true,
        mute_upon_entry: true,
      },
    };

    const zoomRes = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      payload,
      {
        headers: {
          Authorization: `Bearer ${req.zoomAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Ensure agenda text is present on the Zoom meeting by PATCHing it (some accounts ignore agenda on create)
    try {
      if (agendaText) {
        const crlfAgenda = String(agendaText).replace(/\n/g, '\r\n');
        await axios.patch(
          `https://api.zoom.us/v2/meetings/${zoomRes.data.id}`,
          { agenda: crlfAgenda },
          {
            headers: {
              Authorization: `Bearer ${req.zoomAccessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    } catch (patchErr) {
      console.warn('Zoom agenda PATCH failed:', patchErr?.response?.data || patchErr.message);
    }

    // --- Persist meeting + agenda items to our DB ---
    // Resolve host email from Supabase zoom_users table
    let hostEmail = null;
    try {
      const { data: userRow } = await supabase
        .from('zoom_users')
        .select('email')
        .eq('user_id', userId)
        .maybeSingle();
      hostEmail = userRow?.email || null;
    } catch (_) {
      // non-fatal; proceed without email
    }

    const client = await pool.connect();
    let meetingUuid = null;
    try {
      await client.query('BEGIN');

      // Insert into meetings table (with host_id)
      const meetInsert = await client.query(
        `INSERT INTO meetings (host_id, host_email, meeting_title, scheduled_start, meeting_status, zoom_meeting_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          String(userId),
          hostEmail || 'unknown@zoom',
          payload.topic,
          zoomRes.data.start_time, // Zoom returns ISO in UTC
          'scheduled',
          String(zoomRes.data.id),
        ]
      );
      meetingUuid = meetInsert.rows[0].id;

      // Insert agenda items tied to meeting id
      if (Array.isArray(parsed) && parsed.length) {
        for (let i = 0; i < parsed.length; i++) {
          const it = parsed[i];
          const label = it.agenda_item || it.text || '';
          const duration = Number(it.duration_seconds) || 0;
          await client.query(
            `INSERT INTO agenda_items (meeting_id, agenda_item, duration_seconds, order_index)
             VALUES ($1, $2, $3, $4)`,
            [meetingUuid, label, duration, i + 1]
          );
        }
      }

      await client.query('COMMIT');
    } catch (dbErr) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      console.error('DB persist failed:', dbErr);
      // We still return Zoom success so the user flow isn’t blocked
    } finally {
      client.release();
    }

    return res.json({
      success: true,
      meetingId: zoomRes.data.id,
      start_url: zoomRes.data.start_url,
      join_url: zoomRes.data.join_url,
      meeting_uuid: meetingUuid,
      host_id: userId,
    });
  } catch (err) {
    return res
      .status(err?.response?.status || 500)
      .json(err?.response?.data || { error: 'Failed to create meeting' });
  }
};