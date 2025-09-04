const express = require('express');
const router = express.Router();
const zoomController = require('../controllers/zoomController.js');
const { exchangeCodeForToken, getZoomUserInfo } = require('../middleware/zoomMiddleware.js');
// const { addNewToken, deleteToken } = require('../middleware/tokenDataMiddleware.js');
const { addNewUserInfo } = require('../middleware/userDataMiddleware.js');

// const tokenData = require('../middleware/tokenDataMiddleware');     // loads user token/tenant
// const zoomMiddleware = require('../middleware/zoomMiddleware');     // attaches req.zoomAccessToken
const { addNewToken, deleteToken, attachAccessToken } = require('../middleware/tokenDataMiddleware.js');

/**
 * Organizes all the routes associated with Zoom
 */

//get authorization code route
router.get('/oauth', zoomController.oauth);

//get authentication token route, save token, save user info, redirect to meeting page
router.get('/oauth/callback',
  exchangeCodeForToken,
  getZoomUserInfo,
  deleteToken,
  addNewToken,
  addNewUserInfo,
  zoomController.redirectToMeeting
);

// READ — schedules
router.get('/schedules', attachAccessToken, zoomController.listSchedules);
router.get('/schedules/:scheduleId', attachAccessToken, zoomController.getSchedule);

// READ — events
router.get('/events', attachAccessToken, zoomController.listEvents);
router.get('/events/:eventId', attachAccessToken, zoomController.getEvent);

// READ — meetings (Zoom Meetings API)
router.get('/meetings/upcoming', attachAccessToken, zoomController.listUpcomingMeetings);
router.get('/meetings/:meetingId', attachAccessToken, zoomController.getMeetingDetails);


// WRITE — create a single‑use scheduling link for a schedule
router.post('/schedules/:scheduleId/single-use-link', attachAccessToken, zoomController.createSingleUseLink);
// WRITE — append agenda items (from our app) to the next upcoming Zoom meeting
router.post('/meetings/append-agenda', attachAccessToken, zoomController.appendAgendaToNextMeeting);
// WRITE — create a schedule (event type) using Zoom Scheduler API
router.post('/schedules', attachAccessToken, zoomController.createSchedule);

// AUTH — Meeting SDK signature + ZAK
router.post('/sdk-signature', zoomController.getMeetingSdkSignature);
router.post('/video-signature', zoomController.getVideoSdkSignature);
router.get('/zak', attachAccessToken, zoomController.getZak);

module.exports = router;