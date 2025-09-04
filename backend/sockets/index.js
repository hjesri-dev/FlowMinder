const { attachAgenda } = require('./agenda');
const { attachTimer } = require('./timer');
const { initNudgeSockets } = require('./nudge.js');

function attachAllSockets(io, pool) {
  attachAgenda(io, pool);
  attachTimer(io);
  initNudgeSockets(io, pool);
}

module.exports = { attachAllSockets };
