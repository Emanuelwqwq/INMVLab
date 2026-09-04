// Local preview serves only public site assets, never backend files or secrets.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assets = new Set(['index.html', 'styles.css', 'theme.css', 'dashboard.js', 'whatsapp.js', 'manifest.json', 'service-worker.js', 'icon-192.png', 'icon-512.png']);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
http.createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
  if (!assets.has(name) || !fs.existsSync(path.join(__dirname, name))) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': (types[path.extname(name)] || 'text/plain') + '; charset=utf-8', 'Cache-Control': 'no-store' });
  fs.createReadStream(path.join(__dirname, name)).pipe(res);
}).listen(8080, '127.0.0.1', () => console.log('Prévia: http://localhost:8080'));
