const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'academix_db.json');
const BACKUP_FILE = path.join(DATA_DIR, 'academix_db.backup.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize db file from clean data.js if not yet present
function getCleanInitialState() {
  try {
    global.window = {};
    delete require.cache[require.resolve('./js/data.js')];
    require('./js/data.js');
    return window.KTU_DATA || null;
  } catch (err) {
    console.error('Error loading default dataset for DB seed:', err);
    return null;
  }
}

if (!fs.existsSync(DB_FILE)) {
  const cleanData = getCleanInitialState();
  if (cleanData) {
    fs.writeFileSync(DB_FILE, JSON.stringify(cleanData, null, 2), 'utf8');
    console.log('[Database] Seeded clean state into data/academix_db.json');
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  // Global CORS options preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // ==========================================
  // REST API Backend Endpoints
  // ==========================================

  // 1. Health check
  if (pathname === '/api/health') {
    sendJSON(res, 200, {
      status: 'ok',
      uptime: process.uptime(),
      dbConnected: fs.existsSync(DB_FILE),
      timestamp: new Date().toISOString()
    });
    return;
  }

  // 2. GET /api/state - Fetch persisted academic state
  if (pathname === '/api/state' && req.method === 'GET') {
    if (!fs.existsSync(DB_FILE)) {
      sendJSON(res, 200, { empty: true, message: 'Database not initialized' });
      return;
    }

    fs.readFile(DB_FILE, 'utf8', (err, raw) => {
      if (err) {
        console.error('Error reading db file:', err);
        sendJSON(res, 500, { error: 'Failed to read database' });
        return;
      }
      try {
        const state = JSON.parse(raw);
        sendJSON(res, 200, { success: true, data: state, updatedAt: fs.statSync(DB_FILE).mtime });
      } catch (parseErr) {
        console.error('Error parsing db file JSON:', parseErr);
        sendJSON(res, 500, { error: 'Database JSON corrupted' });
      }
    });
    return;
  }

  // 3. POST /api/state - Persist academic state
  if (pathname === '/api/state' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Cap at 20MB
      if (body.length > 20 * 1024 * 1024) {
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const stateData = payload.data || payload;

        // Create rotating backup if current db exists
        if (fs.existsSync(DB_FILE)) {
          try {
            fs.copyFileSync(DB_FILE, BACKUP_FILE);
          } catch (bErr) {
            console.warn('Could not write backup file:', bErr);
          }
        }

        // Write atomically
        const tmpFile = DB_FILE + '.tmp';
        fs.writeFileSync(tmpFile, JSON.stringify(stateData, null, 2), 'utf8');
        fs.renameSync(tmpFile, DB_FILE);

        sendJSON(res, 200, {
          success: true,
          message: 'State successfully synced and persisted to disk',
          savedAt: new Date().toISOString(),
          bytes: Buffer.byteLength(body)
        });
      } catch (err) {
        console.error('Failed to parse or write state:', err);
        sendJSON(res, 400, { error: 'Invalid JSON payload' });
      }
    });
    return;
  }

  // 4. POST /api/reset - Reset state back to KTU clean initial data
  if (pathname === '/api/reset' && req.method === 'POST') {
    const cleanData = getCleanInitialState();
    if (!cleanData) {
      sendJSON(res, 500, { error: 'Could not regenerate clean dataset' });
      return;
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(cleanData, null, 2), 'utf8');
    sendJSON(res, 200, {
      success: true,
      message: 'Database reset to clean slate (0% progress, all markers preserved)',
      data: cleanData
    });
    return;
  }

  // ==========================================
  // Static File Serving
  // ==========================================
  let reqPath = decodeURI(pathname);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  // Safe file path resolution
  const safePath = path.normalize(path.join(PUBLIC_DIR, reqPath));
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routes
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexPath, (indexErr, indexData) => {
        if (indexErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(indexData);
        }
      });
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const cacheControl = (ext === '.html' || ext === '.json' || ext === '.js') ? 'no-cache' : 'public, max-age=3600';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': cacheControl
    });

    const readStream = fs.createReadStream(safePath);
    readStream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` Academix Academic Planner Fullstack Live Server`);
  console.log(` Local App:   http://localhost:${PORT}/`);
  console.log(` REST API:    http://localhost:${PORT}/api/state`);
  console.log(` Database:    data/academix_db.json`);
  console.log(`====================================================`);
});
