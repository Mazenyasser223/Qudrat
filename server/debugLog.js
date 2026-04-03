// Debug session 97296c: append NDJSON to workspace log file (fallback when ingest server not running)
const fs = require('fs');
const http = require('http');
const path = require('path');
const LOG_PATH = path.join(__dirname, '..', 'debug-97296c.log');
function debugLog(payload) {
  try {
    fs.appendFileSync(LOG_PATH, JSON.stringify(payload) + '\n');
  } catch (_) {}
}

/** Best-effort POST to local Cursor ingest; must never throw or crash the process when port 7914 is closed. */
function emitAgentIngest(payload) {
  try {
    debugLog(payload);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 7914,
        path: '/ingest/5963aa55-001a-43d9-a9b3-abb9b2119b35',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '97296c',
        },
      },
      (res) => {
        res.resume();
      }
    );
    req.on('error', () => {});
    req.end(JSON.stringify(payload));
  } catch (_) {}
}

module.exports = { debugLog, emitAgentIngest };
