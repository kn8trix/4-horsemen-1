const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const sqlite3 = require('sqlite3').verbose();

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const LAUNCHER_DIR = __dirname;
const DB_DIR = path.join(ROOT_DIR, 'data');
const DB_PATH = path.join(DB_DIR, 'games.db');

fs.mkdirSync(DB_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to open SQLite database:', err.message);
    process.exit(1);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS team_games (
      teamId TEXT PRIMARY KEY,
      solved INTEGER NOT NULL DEFAULT 0,
      solvedBy TEXT,
      completedAt TEXT,
      score INTEGER NOT NULL DEFAULT 0
    )
  `, (tableError) => {
    if (tableError) {
      console.error('Failed to create team_games table:', tableError.message);
      process.exit(1);
    }
    console.log(`SQLite ready at ${DB_PATH}`);
  });
});

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';

    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

function ensureValidTeamId(teamId) {
  return typeof teamId === 'string' && teamId.trim().length > 0;
}

function validateSolvePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, message: 'Solve payload must be an object.' };
  }

  const { teamId, playerSlot, score, completedAt } = payload;

  if (!ensureValidTeamId(teamId)) {
    return { valid: false, message: 'Missing or invalid teamId.' };
  }

  if (typeof playerSlot !== 'string' || playerSlot.trim().length === 0) {
    return { valid: false, message: 'Missing or invalid playerSlot.' };
  }

  if (!Number.isFinite(Number(score)) || Number(score) < 0) {
    return { valid: false, message: 'Score must be a non-negative number.' };
  }

  const completedDate = new Date(completedAt);
  if (!completedAt || Number.isNaN(completedDate.getTime())) {
    return { valid: false, message: 'completedAt must be a valid ISO timestamp.' };
  }

  return {
    valid: true,
    teamId: teamId.trim(),
    playerSlot: playerSlot.trim(),
    score: Number(score),
    completedAt: completedDate.toISOString()
  };
}

function serveStaticFile(res, filePath) {
  const safePath = path.normalize(filePath);
  const extension = path.extname(safePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8'
  };

  fs.readFile(safePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        sendJson(res, 404, { error: 'File not found' });
        return;
      }

      sendJson(res, 500, { error: 'Failed to read file' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': mimeTypes[extension] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
}

function resolveStaticPath(requestPath) {
  if (requestPath === '/' || requestPath === '') {
    return path.join(LAUNCHER_DIR, 'index.html');
  }

  const normalized = requestPath.replace(/^\/+|\/+$/g, '');
  if (!normalized) {
    return path.join(LAUNCHER_DIR, 'index.html');
  }

  const candidate = path.join(ROOT_DIR, normalized);

  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    return path.join(candidate, 'index.html');
  }

  return candidate;
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;

  if (pathname === '/api/games/solve' && req.method === 'POST') {
    try {
      const payload = await readRequestBody(req);
      const validation = validateSolvePayload(payload);

      if (!validation.valid) {
        sendJson(res, 400, { error: validation.message });
        return;
      }

      const { teamId, playerSlot, score, completedAt } = validation;

      if (playerSlot !== 'game1') {
        sendJson(res, 400, { error: 'Invalid playerSlot; expected game1.' });
        return;
      }

      db.get('SELECT teamId, solved, solvedBy, completedAt, score FROM team_games WHERE teamId = ?', [teamId], (selectErr, existingRow) => {
        if (selectErr) {
          sendJson(res, 500, { error: 'Database lookup failed.' });
          return;
        }

        if (existingRow && Number(existingRow.solved) === 1) {
          sendJson(res, 200, {
            ok: true,
            status: 'already-solved',
            solvedBy: existingRow.solvedBy,
            teamId,
            playerSlot
          });
          return;
        }

        db.run(
          `
            INSERT INTO team_games (teamId, solved, solvedBy, completedAt, score)
            VALUES (?, 1, ?, ?, ?)
            ON CONFLICT(teamId)
            DO UPDATE SET solved = 1, solvedBy = excluded.solvedBy, completedAt = excluded.completedAt, score = excluded.score
          `,
          [teamId, playerSlot, completedAt, score],
          (runErr) => {
            if (runErr) {
              sendJson(res, 500, { error: 'Failed to save solve result.' });
              return;
            }

            sendJson(res, 200, {
              ok: true,
              status: 'solved',
              solvedBy: playerSlot,
              teamId,
              score
            });
          }
        );
      });

      return;
    } catch (error) {
      sendJson(res, 400, { error: error.message || 'Bad request.' });
      return;
    }
  }

  if (pathname === '/api/games/status' && req.method === 'GET') {
    const teamId = requestUrl.searchParams.get('teamId');

    if (!ensureValidTeamId(teamId)) {
      sendJson(res, 400, { error: 'Missing teamId query parameter.' });
      return;
    }

    db.get('SELECT solved, solvedBy FROM team_games WHERE teamId = ?', [teamId.trim()], (err, row) => {
      if (err) {
        sendJson(res, 500, { error: 'Status lookup failed.' });
        return;
      }

      if (!row) {
        sendJson(res, 200, { isSolved: false, solvedBy: null });
        return;
      }

      const isSolved = Number(row.solved) === 1;
      sendJson(res, 200, {
        isSolved,
        solvedBy: isSolved ? row.solvedBy : null
      });
    });

    return;
  }

  const filePath = resolveStaticPath(pathname);
  serveStaticFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`Game server running at http://localhost:${PORT}`);
});
