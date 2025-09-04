const router = require('express').Router();
const { scheduleMeeting } = require('../controllers/meetingController');
const { attachAccessToken } = require('../middleware/tokenDataMiddleware');

// POST /api/meetings/schedule
router.post('/schedule', attachAccessToken, scheduleMeeting);

module.exports = router;