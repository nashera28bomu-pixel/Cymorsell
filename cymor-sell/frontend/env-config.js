// Runtime environment config for the static frontend (no build step).
// Vercel: override these via a small script injected at deploy time, or just
// edit this file directly before deploying — see README "Frontend deployment".
window.CYMOR_ENV = {
  API_URL: 'http://localhost:5000',
};
