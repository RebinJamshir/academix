const http = require('http');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Load local .env if present (ignored by git for secret protection)
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  try {
    const envLines = fs.readFileSync(envFile, 'utf8').split('\n');
    envLines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim();
        if (!process.env[k]) process.env[k] = v;
      }
    });
  } catch (e) {}
}

// Ensure IPv4 first on Windows to avoid IPv6 timeouts
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

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

  // 4a. POST /api/execution/proposals - Generate recovery proposals for backlog
  if (pathname === '/api/execution/proposals' && req.method === 'POST') {
    try {
      const Engine = require('./js/services/index');
      if (!fs.existsSync(DB_FILE)) {
        sendJSON(res, 400, { error: 'Database not initialized' });
        return;
      }
      const state = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      const plan = Engine.RecoveryPlannerService.generateProposals(state);
      sendJSON(res, 200, { success: true, plan });
    } catch (e) {
      console.error('[API proposals error]', e);
      sendJSON(res, 500, { error: e.message });
    }
    return;
  }

  // 4b. POST /api/execution/approve-proposal - Atomically apply approved recovery proposal
  if (pathname === '/api/execution/approve-proposal' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { proposal } = JSON.parse(body || '{}');
        if (!proposal || !proposal.taskId) {
          sendJSON(res, 400, { error: 'Invalid proposal payload' });
          return;
        }
        const Engine = require('./js/services/index');
        const state = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        const applyRes = Engine.RecoveryPlannerService.applyApprovedProposal(proposal, state);

        if (applyRes.success) {
          if (fs.existsSync(DB_FILE)) {
            try { fs.copyFileSync(DB_FILE, BACKUP_FILE); } catch (bErr) {}
          }
          const tmpFile = DB_FILE + '.tmp';
          fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf8');
          fs.renameSync(tmpFile, DB_FILE);
          sendJSON(res, 200, { success: true, message: 'Recovery proposal approved and scheduled', result: applyRes });
        } else {
          sendJSON(res, 400, { success: false, error: applyRes.error });
        }
      } catch (e) {
        console.error('[API approve proposal error]', e);
        sendJSON(res, 500, { error: e.message });
      }
    });
    return;
  }

  // 5. POST /api/ai/generate - Server-side Gemini API proxy (robust, fast, avoids CORS/IPv6 issues)
  if (pathname === '/api/ai/generate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) req.destroy();
    });
    req.on('end', async () => {
      try {
        const { prompt, systemInstruction, apiKey, model } = JSON.parse(body || '{}');
        const key = apiKey || process.env.GEMINI_API_KEY || '';
        const targetModel = model || 'gemini-3.5-flash';

        const payload = {
          contents: [{ parts: [{ text: prompt || 'Hello' }] }]
        };
        if (systemInstruction) {
          payload.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`;
        const aiRes = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await aiRes.json();
        if (aiRes.ok && data.candidates && data.candidates[0] && data.candidates[0].content) {
          const text = data.candidates[0].content.parts[0].text;
          sendJSON(res, 200, { success: true, text, model: targetModel });
        } else {
          console.warn('[AI Proxy Warning]', data);
          sendJSON(res, 400, {
            success: false,
            error: (data.error && data.error.message) || 'Gemini API Error',
            details: data
          });
        }
      } catch (err) {
        console.error('[AI Proxy Exception]', err);
        sendJSON(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // ==========================================
  // Static File Serving
  // ==========================================
  if (pathname === '/favicon.ico' || pathname === '/favicon.svg') {
    const logoSvg = path.join(PUBLIC_DIR, 'logo.svg');
    if (fs.existsSync(logoSvg)) {
      res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      fs.createReadStream(logoSvg).pipe(res);
      return;
    }
  }

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
      const ext = path.extname(safePath).toLowerCase();
      // If it's an asset or data file, return true 404 so browsers don't try to parse HTML as images/CSS
      if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.css', '.js', '.json', '.woff', '.woff2'].includes(ext)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }

      // Fallback to index.html for SPA page routes
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
