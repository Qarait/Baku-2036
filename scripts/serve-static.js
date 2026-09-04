const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : 8123);
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.pbf': 'application/x-protobuf',
  '.pmtiles': 'application/octet-stream',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2'
};

function safeFilePath(requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const filePath = path.resolve(root, relative);
  if (filePath !== root && filePath.startsWith(root + path.sep)) {
    try {
      if (fs.statSync(filePath).isDirectory()) return path.join(filePath, 'index.html');
    } catch {}
  }
  return filePath === root || filePath.startsWith(root + path.sep) ? filePath : null;
}

function sendFile(request, response, filePath) {
  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    const total = stats.size;
    const range = request.headers.range;
    const headers = {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
    };
    if (!range) {
      response.writeHead(200, { ...headers, 'Content-Length': total });
      fs.createReadStream(filePath).pipe(response);
      return;
    }
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      response.writeHead(416, { 'Content-Range': `bytes */${total}` });
      response.end();
      return;
    }
    const start = match[1] ? Number(match[1]) : Math.max(0, total - Number(match[2]));
    const end = match[2] ? Number(match[2]) : total - 1;
    if (start > end || start >= total || end >= total) {
      response.writeHead(416, { 'Content-Range': `bytes */${total}` });
      response.end();
      return;
    }
    response.writeHead(206, {
      ...headers,
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${total}`
    });
    fs.createReadStream(filePath, { start, end }).pipe(response);
  });
}

http.createServer((request, response) => {
  let filePath;
  try {
    filePath = safeFilePath(new URL(request.url, 'http://127.0.0.1').pathname || '/');
  } catch {
    response.writeHead(400);
    response.end('Bad request');
    return;
  }
  if (!filePath) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }
  sendFile(request, response, filePath);
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`Baku 2036 test server listening on http://127.0.0.1:${port}\n`);
});
