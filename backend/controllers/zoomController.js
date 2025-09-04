// backend/controllers/zoomController.js

//
const { generateZoomAuthUrl } = require("../utils/oauth.js");
const axios = require('axios');
const ZOOM_BASE = 'https://api.zoom.us/v2';
const jwt = require('jsonwebtoken');  // for generating JWT for Meeting SDK


// Append agenda text to the next upcoming Zoom meeting for the user
const appendAgendaToNextMeeting = async (req, res) => {
  try {
    const { items } = req.body; // expect [{ agenda_item, duration_seconds }, ...]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No agenda items provided' });
    }

    // 1) List upcoming meetings
    const listRes = await axios.get(`${ZOOM_BASE}/users/me/meetings`, {
      headers: authHeaders(req.zoomAccessToken),
      params: { type: 'upcoming' },
    });
    const meetings = listRes?.data?.meetings || [];
    if (!meetings.length) {
      return res.status(404).json({ message: 'No upcoming meetings found to append agenda to.' });
    }

    // pick the soonest upcoming meeting
    const sorted = meetings
      .map(m => ({ ...m, _start: new Date(m.start_time || 0).getTime() }))
      .sort((a, b) => a._start - b._start);
    const target = sorted[0];
    if (!target?.id) {
      return res.status(404).json({ message: 'Could not resolve a meeting id.' });
    }

    // 2) Format agenda text
    const agendaText = items
      .map((it, i) => {
        const total = Number(it.duration_seconds) || 0;
        const mm = String(Math.floor(total / 60)).padStart(2, '0');
        const ss = String(total % 60).padStart(2, '0');
        const label = it.agenda_item || it.text || '';
        return `${i + 1} - ${label} - ${mm}:${ss}`;
      })
      .join('\n');

    // 3) PATCH meeting agenda
    await axios.patch(
      `${ZOOM_BASE}/meetings/${target.id}`,
      { agenda: String(agendaText).replace(/\n/g, '\r\n') },
      { headers: authHeaders(req.zoomAccessToken) }
    );

    return res.json({ success: true, meetingId: target.id });
  } catch (err) {
    return res
      .status(err?.response?.status || 500)
      .json(err?.response?.data || { message: 'appendAgendaToNextMeeting failed' });
  }
};


function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

const oauth = (req, res) => {
  const authUrl = generateZoomAuthUrl();
  res.redirect(authUrl);
};

// const redirectToMeeting = (req, res) => {
//   return res.redirect(
//     `${process.env.FRONTEND_REDIRECT_URI}/meeting/${res.locals.zoomUser.id}`
//   );
// };

// redirect after OAuth flow
const redirectToMeeting = (req, res) => {
  // return res.redirect('https://flowminder-app.vercel.app/');
  return res.redirect('https://flowminder-app.vercel.app/meeting/' + res.locals.zoomUser.id);

};

// ---------- Zoom Scheduler controllers ----------
const listSchedules = async (req, res) => {
  try {
    const { from, to, page_size, next_page_token, show_deleted, time_zone } = req.query;
    const { data } = await axios.get(`${ZOOM_BASE}/scheduler/schedules`, {
      headers: authHeaders(req.zoomAccessToken),
      params: { from, to, page_size, next_page_token, show_deleted, time_zone },
    });
    res.json(data);
  } catch (err) {
    res.status(err?.response?.status || 500).json(err?.response?.data || { message: 'zoom listSchedules failed' });
  }
};

const getSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { data } = await axios.get(`${ZOOM_BASE}/scheduler/schedules/${scheduleId}`, {
      headers: authHeaders(req.zoomAccessToken),
    });
    res.json(data);
  } catch (err) {
    res.status(err?.response?.status || 500).json(err?.response?.data || { message: 'zoom getSchedule failed' });
  }
};

const listEvents = async (req, res) => {
  try {
    const { from, to, page_size, next_page_token, show_deleted, time_zone, event_type, search } = req.query;
    const { data } = await axios.get(`${ZOOM_BASE}/scheduler/events`, {
      headers: authHeaders(req.zoomAccessToken),
      params: { from, to, page_size, next_page_token, show_deleted, time_zone, event_type, search },
    });
    res.json(data);
  } catch (err) {
    res.status(err?.response?.status || 500).json(err?.response?.data || { message: 'zoom listEvents failed' });
  }
};

const getEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { data } = await axios.get(`${ZOOM_BASE}/scheduler/events/${eventId}`, {
      headers: authHeaders(req.zoomAccessToken),
    });
    res.json(data);
  } catch (err) {
    res.status(err?.response?.status || 500).json(err?.response?.data || { message: 'zoom getEvent failed' });
  }
};

const createSingleUseLink = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { data } = await axios.post(`${ZOOM_BASE}/scheduler/schedules/single_use_link`,
      { schedule_id: scheduleId },
      { headers: authHeaders(req.zoomAccessToken) }
    );
    res.status(201).json(data);
  } catch (err) {
    res.status(err?.response?.status || 500).json(err?.response?.data || { message: 'zoom singleUseLink failed' });
  }
};

// Create a Scheduler schedule (event type)
const createSchedule = async (req, res) => {
  try {
    const { data } = await axios.post(
      `${ZOOM_BASE}/scheduler/schedules`,
      req.body,
      { headers: authHeaders(req.zoomAccessToken) }
    );
    res.status(201).json(data);
  } catch (err) {
    res
      .status(err?.response?.status || 500)
      .json(err?.response?.data || { message: 'zoom createSchedule failed' });
  }
};

// List upcoming Zoom meetings for the authenticated user (host)
const listUpcomingMeetings = async (req, res) => {
  try {
    const { data } = await axios.get(`${ZOOM_BASE}/users/me/meetings`, {
      headers: authHeaders(req.zoomAccessToken),
      params: { type: 'upcoming', page_size: 30 },
    });

    const meetings = Array.isArray(data?.meetings) ? data.meetings : [];

    // Enrich with details (start_url, join_url, timezone, agenda)
    const detailed = await Promise.all(
      meetings.map(async (m) => {
        try {
          const det = await axios.get(`${ZOOM_BASE}/meetings/${m.id}`, {
            headers: authHeaders(req.zoomAccessToken),
          });
          const d = det.data || {};
          return {
            id: m.id,
            topic: d.topic || m.topic,
            start_time: d.start_time || m.start_time,
            timezone: d.timezone || data?.timezone || undefined,
            start_url: d.start_url,
            join_url: d.join_url,
            agenda: d.agenda || '',
          };
        } catch (_) {
          return {
            id: m.id,
            topic: m.topic,
            start_time: m.start_time,
            timezone: data?.timezone || undefined,
          };
        }
      })
    );

    res.json({ items: detailed });
  } catch (err) {
    res.status(err?.response?.status || 500).json(err?.response?.data || { message: 'listUpcomingMeetings failed' });
  }
};

// Get full details for a specific Zoom meeting id
const getMeetingDetails = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { data } = await axios.get(`${ZOOM_BASE}/meetings/${meetingId}`, {
      headers: authHeaders(req.zoomAccessToken),
    });
    res.json(data);
  } catch (err) {
    res.status(err?.response?.status || 500).json(err?.response?.data || { message: 'getMeetingDetails failed' });
  }
};


// Generate Meeting SDK signature using Client ID/Client Secret
const getMeetingSdkSignature = (req, res) => {
  try {
    const sdkKey = process.env.ZOOM_SDK_KEY;        // your Client ID
    const sdkSecret = process.env.ZOOM_SDK_SECRET; // your Client Secret
    const { meetingNumber, role = 0, expirationSeconds = 3600, videoWebRtcMode = 1 } = req.body || {};

    if (!sdkKey || !sdkSecret) return res.status(500).json({ error: 'Missing Client ID/Secret on server' });
    if (!meetingNumber) return res.status(400).json({ error: 'meetingNumber required' });

    const iat = Math.floor(Date.now() / 1000) - 30; // allow 30s clock skew
    const exp = iat + 60 * 60; // 1h JWT lifetime

    // zoom expects tokenExp for Meeting SDK to be 30m–48h
    const tokenExp = iat + Math.max(1800, Math.min(Number(expirationSeconds), 172800)); // 30m–48h

    const payload = {
      sdkKey,                 // (Client ID)
      mn: String(meetingNumber),
      role: Number(role) === 1 ? 1 : 0, // 1 = host, 0 = attendee
      iat, // issued at
      exp, // expiration time
      appKey: sdkKey, // for Meeting SDK
      tokenExp,  // token expiration time
      // videoWebRtcMode: Number(videoWebRtcMode), // 1 = WebRTC, 2 = Native
    };
    console.log('MeetingSig payload:', payload); // expect { app_key, tpc, role, iat, exp, ... }
    const signature = jwt.sign(payload, sdkSecret, { algorithm: 'HS256' }); // sign with Client Secret
    res.json({ signature });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate signature' });
  }
};

// Generate Video SDK signature using Video SDK Key/Secret
const getVideoSdkSignature = (req, res) => {
  try {
    const appKey = process.env.ZOOM_SDK_KEY;      // Video SDK Key
    const appSecret = process.env.ZOOM_SDK_SECRET; // Video SDK Secret
    const { sessionName, role = 1, expirationSeconds = 3600 } = req.body || {};

    if (!appKey || !appSecret) return res.status(500).json({ error: 'Missing Video SDK Key/Secret on server' });
    if (!sessionName) return res.status(400).json({ error: 'sessionName required' });

    const iat = Math.floor(Date.now() / 1000) - 30;
    const exp = iat + 60 * 60; // 1h JWT lifetime
    const tokenExp = iat + Math.max(1800, Math.min(Number(expirationSeconds), 172800)); // 30m–48h

    const payload = {
      app_key: appKey,
      tpc: String(sessionName),
      role: Number(role), // 0 attendee, 1 host
      iat,
      exp,
      tokenExp,
      version: 1,
    };
    console.log('VideoSig payload:', payload); // expect { app_key, tpc, role, iat, exp, ... }

    const signature = jwt.sign(payload, appSecret, { algorithm: 'HS256' });
    res.json({ signature });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate Video SDK signature' });
  }
};

// Host ZAK via saved OAuth access token
const getZak = async (req, res) => {
  try {
    const { data } = await axios.get(`${ZOOM_BASE}/users/me/zak`, {
      headers: authHeaders(req.zoomAccessToken),
    });
    res.json({ zak: data?.token || data?.zak || data });
  } catch (err) {
    res.status(err?.response?.status || 500).json(err?.response?.data || { message: 'getZak failed' });
  }
};


module.exports = {
  oauth,
  redirectToMeeting,
  listSchedules,
  getSchedule,
  listEvents,
  getEvent,
  createSingleUseLink,
  createSchedule,
  listUpcomingMeetings,
  getMeetingDetails,
  appendAgendaToNextMeeting,
  getMeetingSdkSignature,
  getVideoSdkSignature,
  getZak,
};