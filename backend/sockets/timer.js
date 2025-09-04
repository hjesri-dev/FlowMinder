// Server-based timer for Socket.IO 
function attachTimer(io) {
  const timers = {}; // meetingId -> { status, endAt, remainingMs? }
  const now = () => Date.now();
  const getState = (meetingId) => timers[meetingId] || { status: 'pending', endAt: 0 };

  const emitStateToAll = (meetingId) => {
    const s = getState(meetingId);
    io.to(meetingId).emit('timer:state', { ...s, serverTime: now() });
  };
  const emitStateToSocket = (socket, meetingId) => {
    const s = getState(meetingId);
    socket.emit('timer:state', { ...s, serverTime: now() });
  };

  io.on('connection', (socket) => {
    socket.on('joinMeeting', (meetingId) => {
      socket.join(meetingId);
      emitStateToSocket(socket, meetingId);
    });

    socket.on('timer:get', (meetingId) => {
      emitStateToSocket(socket, meetingId);
    });

    socket.on('timer:start', ({ meetingId, durationMs }) => {
      const ms = Math.max(0, Number(durationMs || 0));
      if (ms === 0) return;
      const endAt = now() + ms;
      timers[meetingId] = { status: 'running', endAt };
      emitStateToAll(meetingId);
    });

    socket.on('timer:pause', ({ meetingId }) => {
      if (!meetingId) return;
      const prev = getState(meetingId);
      if (prev.status !== 'running') return;
      const remaining = Math.max(0, prev.endAt - now());
      timers[meetingId] = { status: 'paused', endAt: prev.endAt, remainingMs: remaining };
      emitStateToAll(meetingId);
    });

    socket.on('timer:resume', ({ meetingId }) => {
      if (!meetingId) return;
      const prev = getState(meetingId);
      if (prev.status !== 'paused') return;
      const endAt = now() + prev.remainingMs;
      timers[meetingId] = { status: 'running', endAt };
      emitStateToAll(meetingId);
    });

    socket.on('timer:cancel', ({ meetingId }) => {
      if (!meetingId) return;
      timers[meetingId] = { status: 'pending', endAt: 0 };
      emitStateToAll(meetingId);
    });

    socket.on('timer:edit:save', ({ meetingId, proposedEndAt }) => {
      if (!meetingId) return;
      const endAt = Math.max(now(), Math.floor(Number(proposedEndAt) || 0));
      const prev = getState(meetingId);
      const status = prev.status === 'pending' ? 'running' : prev.status;

      if (status === 'paused') {
        const remaining = Math.max(0, endAt - now());
        timers[meetingId] = { status: 'paused', endAt, remainingMs: remaining };
      } else {
        timers[meetingId] = { status, endAt };
      }
      emitStateToAll(meetingId);
    });
  });
}

module.exports = { attachTimer };
