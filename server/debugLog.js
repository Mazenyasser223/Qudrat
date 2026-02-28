// Debug session 97296c: append NDJSON to workspace log file (fallback when ingest server not running)
const fs = require('fs');
const path = require('path');
const LOG_PATH = path.join(__dirname, '..', 'debug-97296c.log');
function debugLog(payload) {
  try {
    fs.appendFileSync(LOG_PATH, JSON.stringify(payload) + '\n');
  } catch (_) {}
}
module.exports = { debugLog };
