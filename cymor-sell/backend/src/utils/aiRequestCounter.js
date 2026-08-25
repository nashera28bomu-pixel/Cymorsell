// Simple in-process counter for admin stats. For multi-instance production
// deployments, replace with a persisted counter (e.g. a SystemSettings field
// incremented atomically) - kept in-memory here to avoid an extra DB write
// on every single AI call in the MVP.
let count = 0;

function increment() {
  count += 1;
}

function getCount() {
  return count;
}

module.exports = { increment, getCount };
