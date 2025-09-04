// backend/sockets/nudgeCooldown.js
const COOLDOWN_MS = Number(process.env.COOLDOWN_MS || 5 * 60 * 1000);
const cooldowns = new Map(); // key -> expiresAt (ms)
const key = ({ meetingId, voterId, targetId }) => `${meetingId}:${voterId}:${targetId}`;

function getVoterToTargetCooldownRemainingMs(params) {
  const until = cooldowns.get(key(params)) || 0;
  const rem = until - Date.now();
  return rem > 0 ? rem : 0;
}

function getVoterToTargetCooldownWindow(params) {
  const remainingMs = getVoterToTargetCooldownRemainingMs(params);
  if (remainingMs > 0) return { ok: false, remainingMs };
  const expiresAt = Date.now() + COOLDOWN_MS;
  cooldowns.set(key(params), expiresAt);
  setTimeout(() => {
    if (cooldowns.get(key(params)) === expiresAt) cooldowns.delete(key(params));
  }, COOLDOWN_MS + 500);
  return { ok: true, remainingMs: 0 };
}

module.exports = {
  getVoterToTargetCooldownWindow,
  getVoterToTargetCooldownRemainingMs,
};
